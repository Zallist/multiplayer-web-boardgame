declare var Vue: any;
declare var _: any;
declare var chance: any;
declare var axios: any;
declare var signalR: any;
declare var randomColor: any;

var app = app || {};

app.main = (function () {
    let viewModel;

    const page: any = {
        helpers: {
            getUrlParameter: function (key, useHash) {
                let urlParams = new URLSearchParams(useHash ? window.location.hash : window.location.search);
                return urlParams.has(key) ? urlParams.get(key) : null;
            },
            getCurrentUrlWithArguments: (args) => {
                let url, queryString;

                url = window.location.origin + window.location.pathname;
                queryString = new URLSearchParams(window.location.search);

                _.forEach(args, (value, key) => {
                    queryString.set(key, value);
                });

                url += '?' + queryString.toString();

                return url;
            }
        }
    };

    const connection = {
        // Populated by /scripts/server.url.js
        // Can also be populated by ?serverUrl and &serverType
        serverUrl: app.serverUrl || page.helpers.getUrlParameter('serverUrl') || 'http://localhost:5000/',
        serverType: app.serverType || page.helpers.getUrlParameter('serverType') || 'server-dotnet',

        hub: null,
        userId: null,

        setUserId: function (userId) {
            connection.userId = userId;

            viewModel.player.id = userId;
            viewModel.player.isHost = viewModel.isHost;

            viewModel.players[userId] = viewModel.player;
        },

        getUserId: function () {
            if (!connection.userId) {
                connection.setUserId(chance.guid());
            }

            return connection.userId;
        },

        getApiConfig: function () {
            return {
                headers: {
                    'x-ms-signalr-userid': connection.getUserId(),
                    'x-userid': connection.getUserId(),
                    'x-roomId': viewModel.roomId
                }
            };
        },

        connectUsingApi: function (onConnected) {
            function throwError(error) {
                let parsed;

                parsed = {};
                _.merge(parsed, error);
                parsed.message = error.toString();
                viewModel.connectionStatus = JSON.stringify(parsed, null, 4);
                viewModel.helpers.addMessage(null, "Network error: " + viewModel.connectionStatus, 'red');
                alert('Network error: ' + viewModel.connectionStatus);
            }

            function connected() {
                // Tell everyone we joined

                viewModel.isConnected = true;
                viewModel.isConnecting = false;
                viewModel.connectionStatus = '';

                if (viewModel.isHost) {
                    viewModel.helpers.addMessage(null, 'Game created');
                }
                else {
                    viewModel.helpers.addMessage(null, 'Game joined');
                }

                connection.send({
                    type: 'player-joined',
                    player: viewModel.player
                }, false);

                if (_.isFunction(onConnected)) {
                    onConnected();
                }
            }

            function joinRoom() {
                viewModel.connectionStatus = 'Joining Room...';

                axios.post(connection.serverUrl + '/api/addToRoom', {
                    from: connection.getUserId(),
                    roomId: viewModel.roomId
                }, connection.getApiConfig())
                    .then(function (resp) {
                        connected();
                    })
                    .catch(throwError);
            }

            function startHub(info) {
                viewModel.connectionStatus = 'Connecting...';

                info.accessToken = info.accessToken || info.accessKey;
                info.url = info.url || info.endpoint;

                connection.hub = new signalR.HubConnectionBuilder()
                    .withUrl(info.url, {
                        accessTokenFactory: function () {
                            return info.accessToken;
                        }
                    })
                    .configureLogging(signalR.LogLevel.Information)
                    .build();

                connection.hub.on('newMessage', connection.events.dataReceived);
                connection.hub.onclose(function () {
                    viewModel.connectionStatus = 'Disconnected'
                    viewModel.helpers.addMessage(null, "Game disconnected.", 'red');
                });

                connection.hub.start()
                    .then(joinRoom)
                    .catch(throwError);
            }

            function negotiate() {
                viewModel.connectionStatus = 'Negotiating...';

                axios.post(connection.serverUrl + '/api/negotiate?userid=' + encodeURIComponent(connection.getUserId()) + '&hubname=game', null, connection.getApiConfig())
                    .then(function (resp) { startHub(resp.data); })
                    .catch(throwError);
            }

            viewModel.isConnected = false;
            viewModel.isConnecting = true;

            negotiate();
        },
        connectUsingSignalR: function (onConnected) {
            function throwError(error) {
                let parsed;

                parsed = {};
                _.merge(parsed, error);
                parsed.message = error.toString();
                viewModel.connectionStatus = JSON.stringify(parsed, null, 4);
                viewModel.helpers.addMessage(null, "Network error: " + viewModel.connectionStatus, 'red');
                alert('Network error: ' + viewModel.connectionStatus);
            }

            function connected() {
                // Tell everyone we joined

                viewModel.isConnected = true;
                viewModel.isConnecting = false;
                viewModel.connectionStatus = '';

                if (viewModel.isHost) {
                    viewModel.helpers.addMessage(null, 'Game created');
                    viewModel.gameState.ready = true;
                }
                else {
                    viewModel.helpers.addMessage(null, 'Game joined');
                }

                connection.send({
                    type: 'player-joined',
                    player: viewModel.player
                }, false);

                if (_.isFunction(onConnected)) {
                    onConnected();
                }
            }

            function joinRoom() {
                viewModel.connectionStatus = 'Joining Room...';

                connection.hub.invoke('AddToRoom', viewModel.roomId)
                    .then(function (resp) {
                        connected();
                    })
                    .catch(throwError);
            }

            function startHub() {
                viewModel.connectionStatus = 'Connecting...';

                connection.hub = new signalR.HubConnectionBuilder()
                    .withUrl(connection.serverUrl, {

                    })
                    .configureLogging(signalR.LogLevel.Information)
                    .build();

                connection.hub.on('getConnectionId', function (connectionId) {
                    connection.hub.off('getConnectionId');
                    connection.setUserId(connectionId);
                    joinRoom();
                });
                connection.hub.on('newMessage', connection.events.dataReceived);

                connection.hub.onclose(function () {
                    viewModel.connectionStatus = 'Disconnected'
                    viewModel.helpers.addMessage(null, "Game disconnected.", 'red');
                });

                connection.hub.start()
                    .then(function () {
                        viewModel.connectionStatus = 'Waiting for id...'
                    })
                    .catch(throwError);
            }

            viewModel.isConnected = false;
            viewModel.isConnecting = true;

            startHub();
        },
        connect: function () {
            function onConnected() {
                setInterval(function () {
                    let hostPlayer, currentPlayer;

                    if (viewModel.gameState.started) {
                        if (viewModel.isHost) {
                            currentPlayer = viewModel.helpers.getPlayer(viewModel.gameState.currentTurn);

                            // Check if the current turn is owned by someone not in the turnOrder, if so pick a random player
                            if (currentPlayer.isDisconnected || _.indexOf(viewModel.gameState.turnOrder, viewModel.gameState.currentTurn) < 0) {
                                connection.send({
                                    type: 'reset-turn-to-player',
                                    skipPlayerId: viewModel.gameState.currentTurn,
                                    playerId: _.sample(_.reject(viewModel.gameState.turnOrder, viewModel.gameState.currentTurn))
                                }, true);
                            }
                        }
                    }

                    // If host is connected and I'm the first in the list of hosts, I become host
                    // This should be the LAST check since host stuff happens above, and we need people to know we're host before we pretend to be host
                    hostPlayer = _.find(viewModel.players, { isHost: true, isDisconnected: false });
                    if (!hostPlayer) {
                        hostPlayer = _.find(viewModel.players, { isDisconnected: false });
                        if (hostPlayer.id === viewModel.player.id) {
                            viewModel.isHost = true;
                            hostPlayer.isHost = true;

                            // Tell everyone we're the host now
                            connection.send({
                                type: 'player-promote-to-host',
                                playerId: hostPlayer.id
                            }, true);
                        }
                    }
                }, 5000);

                setTimeout(viewModel.helpers.calculateSizes, 0);
            }

            if (page.serverType === 'server-azure') {
                connection.connectUsingApi(onConnected);
            }
            else {
                connection.connectUsingSignalR(onConnected);
            }
        },

        sendUsingApi: function (data) {
            return axios.post(connection.serverUrl + '/api/messages', {
                from: connection.getUserId(),
                roomId: viewModel.roomId,
                data: data
            }, connection.getApiConfig())
                .then((resp) => { })
                .catch((error) => console.error('An error occurred in network request'));
        },
        sendUsingSignalR: function (data) {
            return connection.hub.invoke('SendMessage', viewModel.roomId, {
                from: connection.getUserId(),
                data: data
            })
                .then((resp) => { })
                .catch((error) => console.error('An error occurred in network request'));
        },
        send: function (data, toSelf) {
            if (toSelf) {
                connection.handleData(viewModel.player.id, data);
            }

            if (page.serverType === 'server-azure') {
                return connection.sendUsingApi(data);
            }
            else {
                return connection.sendUsingSignalR(data);
            }
        },

        events: {
            dataReceived: function (dataWrap) {
                if (dataWrap.from !== connection.getUserId()) {
                    // Don't need to handle our own calls since we do that magically
                    connection.handleData(dataWrap.from, dataWrap.data);
                }
            },
        },

        handleData: function (fromPlayerId, data) {
            let fromPlayer, playerIndex;

            fromPlayer = viewModel.helpers.getPlayer(fromPlayerId);

            app.game.hooks.handleData(fromPlayerId, data, fromPlayer);

            switch (_.trim(data.type).toLowerCase()) {
                case 'message':
                    viewModel.helpers.addMessage(fromPlayerId, data.message);
                    break;
                case 'player-joined':
                    viewModel.players[fromPlayerId] = viewModel.makers.makePlayer(data.player);
                    fromPlayer = viewModel.helpers.getPlayer(fromPlayerId);

                    fromPlayer.metadata.gameStats.wins = 0;
                    fromPlayer.metadata.gameStats.losses = 0;

                    viewModel.helpers.addMessage(null, fromPlayer.name + ' joined', fromPlayer.metadata.color);

                    // Let's distribute the game state to this person too
                    if (viewModel.isHost) {
                        // Send players first just in case gameState is massive, so the person knows the room exists & state is likely being sent
                        connection.send({
                            type: 'players',
                            players: viewModel.players
                        }, false);
                        connection.send({
                            type: 'game-state',
                            players: viewModel.players,
                            gameState: viewModel.gameState
                        }, false);
                    }
                    break;
                case 'player-disconnected':
                    fromPlayer = viewModel.helpers.getPlayer(data.playerId, true);

                    if (fromPlayer && !fromPlayer.isDisconnected) {
                        viewModel.helpers.addMessage(null, fromPlayer.name + ' disconnected', fromPlayer.metadata.color);
                        fromPlayer.isDisconnected = true;
                        fromPlayer.isPlaying = false;

                        app.helpers.removeFromArray(viewModel.gameState.turnOrder, data.playerId);
                    }
                    break;
                case 'player-promote-to-host':
                    fromPlayer = viewModel.helpers.getPlayer(data.playerId);
                    fromPlayer.isHost = true;
                    viewModel.helpers.addMessage(null, fromPlayer.name + ' was promoted to host due to disconnection', fromPlayer.metadata.color);
                    break;
                case 'reset-turn-to-player':
                    if (fromPlayer.isHost) {
                        viewModel.helpers.addMessage(null, 'Turn skipped because of disconnection', 'red');
                        viewModel.gameState.currentTurn = data.playerId;
                        viewModel.helpers.doStartTurn();
                    }
                    else {
                        viewModel.helpers.addMessage(null, fromPlayer.name + " tried to skip a turn but wasn't host", 'red');
                        fromPlayer.metadata.totalStats.timesHacked += 1;
                    }
                    break;
                case 'forfeit':
                    if (fromPlayer) {
                        fromPlayer.isPlaying = false;
                        playerIndex = viewModel.gameState.turnOrder.indexOf(fromPlayerId);

                        if (playerIndex > -1) {
                            viewModel.gameState.turnOrder.splice(playerIndex, 1);

                            if (viewModel.gameState.currentTurn === fromPlayerId) {
                                if (playerIndex >= viewModel.gameState.turnOrder.length) {
                                    playerIndex = 0;
                                }

                                viewModel.gameState.currentTurn = viewModel.gameState.turnOrder[playerIndex];
                            }

                            viewModel.helpers.doStartTurn();
                            viewModel.helpers.addMessage(null, fromPlayer.name + ' has forfeited the game!', 'red');
                        }
                    }
                    break;
                case 'players':
                    if (viewModel.isHost) break;
                    viewModel.players = _.mapValues(data.players, viewModel.makers.makePlayer);
                    viewModel.player = viewModel.players[viewModel.player.id];
                    break;
                case 'game-state':
                    if (viewModel.isHost) break;

                    if (data.gameState.gameName !== app.gameName) {
                        alert('Incorrect game, redirecting to ' + data.gameState.gameName);
                        window.location.replace(page.helpers.getCurrentUrlWithArguments({ game: data.gameState.gameName }));
                        return;
                    }

                    viewModel.players = _.mapValues(data.players, viewModel.makers.makePlayer);
                    viewModel.player = viewModel.players[viewModel.player.id];

                    viewModel.gameState = data.gameState;

                    if (viewModel.gameState.currentTurn && viewModel.gameState.turnTimeRemaining) {
                        viewModel.helpers.trackTurnTime(true);
                    }
                    break;
                case 'ready-changed':
                    fromPlayer.isReady = data.isReady;
                    viewModel.helpers.addMessage(null, fromPlayer.name + ' is' + (data.isReady ? '' : ' not') + ' ready', fromPlayer.metadata.color);
                    break;
                case 'game-started':
                    _.each(data.playerIds, function (id) {
                        let player = viewModel.players[id];

                        if (player) {
                            player.isPlaying = true;
                        }
                    });

                    viewModel.gameStarted = Date.now();
                    viewModel.gameState = data.gameState;

                    viewModel.helpers.doStartTurn();

                    if (document.getElementById('app-content')) {
                        document.getElementById('app-content').scrollTop = 0;
                    }
                    break;
                case 'end-turn':
                    if (viewModel.gameState.currentTurn !== fromPlayer.id) {
                        viewModel.helpers.addMessage(null, fromPlayer.name + " made a move when it wasn't their turn somehow", 'red');
                        fromPlayer.metadata.totalStats.timesHacked += 1;
                        return;
                    }

                    if (data.skipped) {
                        viewModel.helpers.addMessage(null, fromPlayer.name + ' had their turn skipped', 'red');
                    }
                    else {
                        fromPlayer.metadata.totalStats.piecesPlaced += 1;
                    }

                    fromPlayer.metadata.totalStats.timeMyTurn += viewModel.helpers.timeOnCurrentTurn();

                    if (data.isWin) {
                        _.forEach(viewModel.players, function (player) {
                            if (player.id === fromPlayerId) {
                                player.metadata.gameStats.wins += 1;
                                player.metadata.totalStats.wins += 1;
                            }
                            else {
                                player.metadata.gameStats.losses += 1;
                                player.metadata.totalStats.losses += 1;
                            }
                        });

                        viewModel.helpers.addMessage(null, fromPlayer.name + ' won', fromPlayer.metadata.color);
                        viewModel.helpers.endGame({
                            reason: fromPlayer.id === viewModel.player.id ? 'my-win' : 'my-loss'
                        });
                    }
                    else {
                        viewModel.gameState.currentTurn = data.nextPlayerId;
                        viewModel.helpers.doStartTurn();
                    }
                    break;
                case 'game-tie':
                    // Anyone can tie, but if not isAutomatic we probably need some confirmation
                    if (data.isAutomatic) {
                        viewModel.helpers.addMessage(null, fromPlayer.name + ' triggered a tie', fromPlayer.metadata.color);
                    }
                    else {
                        viewModel.helpers.addMessage(null, fromPlayer.name + ' called a tie', 'red');
                    }

                    viewModel.helpers.endGame({
                        reason: 'tie'
                    });
                    break;
            }
        }
    };

    const viewModelFunctions = {
        getHelpers: function (viewModel) {
            const helpers: any = {};

            helpers.addMessage = function (playerId, message, color) {
                let doScroll = false,
                    chatbox = document.getElementById('chat-messages');

                if (chatbox) {
                    doScroll = chatbox.scrollHeight - 10 < chatbox.clientHeight + chatbox.scrollTop;
                }

                viewModel.messages.push({
                    created: new Date(),
                    playerId: playerId,
                    message: message,
                    color: color
                });

                if (doScroll) {
                    Vue.nextTick(function () {
                        chatbox.scrollTop = chatbox.scrollHeight;
                    });
                }
            };

            helpers.submitMyMessage = function () {
                let message = _.trim(viewModel.myMessage);

                viewModel.myMessage = '';

                if (message.length > 0) {
                    connection.send({
                        type: 'message',
                        message: message
                    }, true);
                }
            };

            helpers.recordPlayer = function () {
                localStorage.setItem(app.gameName + '-player-config', JSON.stringify(viewModel.player));
            };

            helpers.getGameLink = () => page.helpers.getCurrentUrlWithArguments({ roomId: viewModel.roomId });

            helpers.copyGameLink = function () {
                app.helpers.copyTextToClipboard(helpers.getGameLink());
                viewModel.copyGameLinkText = 'Copied!';

                setTimeout(function () {
                    viewModel.copyGameLinkText = 'Copy Link';
                }, 2000);
            };

            helpers.createGame = function () {
                viewModel.isHost = true;
                viewModel.roomId = chance.word({ length: 6 }).toLowerCase();

                helpers.connect();
            };
            helpers.joinGame = function () {
                viewModel.isHost = false;

                if (!_.trim(viewModel.roomId).length) {
                    alert('A game ID must be entered');
                }
                else {
                    helpers.connect();
                }
            };
            helpers.connect = function () {
                if (!viewModel.player.name) {
                    (<HTMLFormElement>document.getElementById('name-form')).reportValidity();
                }
                else if (app.game.hooks.setup()) {
                    viewModel.helpers.recordPlayer();

                    viewModel.viewGameConfig = false;
                    viewModel.isConnecting = true;
                    viewModel.isConnected = false;

                    connection.connect();
                }
            };

            let unknownPlayer = null,
                systemPlayer = null;

            helpers.getPlayer = function (playerId, returnNullIfNotFound) {
                let player = null;

                if (!playerId) {
                    if (!systemPlayer) {
                        systemPlayer = viewModel.makers.makePlayer({
                            id: null,
                            name: '[System]',
                            metadata: {
                                color: '#f1c40f'
                            }
                        });
                    }

                    player = systemPlayer;
                }

                if (!player) {
                    player = viewModel.players[playerId];
                }

                if (!player) {
                    if (returnNullIfNotFound) {
                        return null;
                    }

                    if (!unknownPlayer) {
                        unknownPlayer = viewModel.makers.makePlayer({
                            id: '0',
                            name: 'Unknown',
                            metadata: {}
                        });
                    }

                    player = unknownPlayer;
                }

                return player;
            };

            helpers.getNextPlayer = function () {
                let playerIndex;

                playerIndex = _.indexOf(viewModel.gameState.turnOrder, viewModel.gameState.currentTurn);
                playerIndex += 1;

                if (playerIndex >= _.size(viewModel.gameState.turnOrder)) {
                    playerIndex = 0;
                }

                return viewModel.gameState.turnOrder[playerIndex];
            };

            let currentTurnStarted = null,
                currentTurnTracker = null;

            helpers.timeOnCurrentTurn = function () {
                // Returns in milliseconds

                if (!currentTurnStarted) {
                    return 0;
                }

                return Date.now() - currentTurnStarted;
            };

            helpers.stopTrackingTurnTime = function () {
                if (currentTurnTracker !== null)
                    clearInterval(currentTurnTracker);

                currentTurnTracker = null;
                currentTurnStarted = null;
            };

            helpers.trackTurnTime = function (implyFromGameState) {
                helpers.stopTrackingTurnTime();

                if (implyFromGameState) {
                    currentTurnStarted = Date.now() - ((viewModel.gameState.turnTime - viewModel.gameState.turnTimeRemaining) * 1000);
                }
                else {
                    currentTurnStarted = Date.now();
                }

                currentTurnTracker = setInterval(function () {
                    let timeSpent = (Date.now() - currentTurnStarted) / 1000.0,
                        timeRemaining = viewModel.gameState.turnTime - timeSpent;

                    if (timeRemaining < 0) {
                        if (viewModel.gameState.currentTurn === viewModel.player.id) {
                            // End my turn since I took too long
                            helpers.stopTrackingTurnTime();

                            // If all goes to plan, let's say we own it
                            connection.send({
                                type: 'end-turn',
                                isWin: false,
                                skipped: true,
                                nextPlayerId: viewModel.helpers.getNextPlayer()
                            }, true);
                        }
                    }

                    viewModel.gameState.turnTimeRemaining = Math.round(timeRemaining);
                }, 50);
            };

            helpers.doStartTurn = function () {
                let currentPlayer = helpers.getPlayer(viewModel.gameState.currentTurn);

                if (currentPlayer.id) {
                    helpers.addMessage(null, "It's " + currentPlayer.name + "'" + (_.endsWith(currentPlayer.name, 's') ? "" : "s") + " turn", currentPlayer.metadata.color);
                }

                helpers.trackTurnTime();
            };

            helpers.endGame = function (options) {
                if (viewModel.gameStarted) {
                    viewModel.player.metadata.totalStats.timeInGame += Date.now() - viewModel.gameStarted;
                }

                viewModel.helpers.recordPlayer();

                viewModel.gameState.currentTurn = null;
                viewModel.gameState.started = false;
                viewModel.gameStarted = null;

                _.forEach(viewModel.players, function (player) {
                    player.isReady = false;
                    player.isPlaying = false;
                });

                viewModel.player.isReady = false;
                viewModel.player.isPlaying = false;

                viewModel.helpers.stopTrackingTurnTime();

                // And now a splash screen
                switch (_.trim(options.reason).toLowerCase()) {
                    case 'my-win':
                    case 'my-loss':
                    case 'tie':
                        viewModel.gameOverReason = _.trim(options.reason).toLowerCase();
                        break;
                }
            };

            helpers.calculateSizes = function () {
                let gamePanel;

                gamePanel = document.getElementById('game-panel');

                if (gamePanel) {
                    viewModel.gamePanelHeight = gamePanel.offsetHeight;
                    viewModel.gamePanelWidth = gamePanel.offsetWidth;
                }

                if (!viewModel.gamePanelHeight) {
                    viewModel.gamePanelHeight = window.innerHeight;
                }

                if (!viewModel.gamePanelWidth) {
                    viewModel.gamePanelWidth = window.innerWidth;
                }
            };

            return helpers;
        },

        getMakers: function (viewModel) {
            const makers: any = {};

            makers.makePlayer = function (player) {
                player = _.merge({
                    id: null,
                    name: null,
                    isHost: false,
                    isDisconnected: false,
                    isReady: false,
                    isPlaying: false,
                    metadata: {
                        color: app.helpers.generateColor(),
                        avatar: {
                            type: 'css-class',
                            value: null
                        },
                        gameStats: {
                            wins: 0,
                            losses: 0
                        },
                        totalStats: {
                            wins: 0,
                            losses: 0,
                            timeInGame: 0,
                            timeMyTurn: 0,
                            piecesPlaced: 0,
                            timesHacked: 0
                        }
                    }
                }, player);

                if (viewModel.player && player.id === viewModel.player.id) {
                    // Make sure we don't screw with stats if we're talking about the current player
                    _.merge(player.metadata, viewModel.player.metadata);
                }

                return player;
            };

            return makers;
        },

        getEvents: function (viewModel) {
            const events: any = {};

            events.toggleReady = function () {
                viewModel.player.isReady = !viewModel.player.isReady;
                connection.send({
                    type: 'ready-changed',
                    isReady: viewModel.player.isReady
                }, true);
            };

            events.startGame = function () {
                let playersPlaying, playingIds;

                viewModel.player.isReady = true;

                playersPlaying = _.filter(viewModel.players, { isReady: true, isDisconnected: false });
                playingIds = _.map(playersPlaying, 'id');

                viewModel.gameState.turnOrder = _.shuffle(playingIds);
                viewModel.gameState.currentTurn = viewModel.gameState.turnOrder[0];

                if (!app.game.hooks.setup()) {
                    // Something wrong
                    return false;
                }

                viewModel.gameState.started = true;

                connection.send({
                    type: 'game-started',
                    playerIds: playingIds,
                    gameState: viewModel.gameState
                }, true);
            };

            events.startForfeit = function () {
                app.helpers.makeDialog({
                    title: 'Forfeit?',
                    content: 'Are you sure you want to forfeit the game?',
                    buttons: [
                        {
                            text: 'Yes, forfeit the game',
                            action: function () {
                                if (viewModel.gameState.turnOrder.length > 1) {
                                    connection.send({
                                        type: 'forfeit'
                                    }, true);
                                }
                            }
                        },
                        {
                            text: 'No, keep playing'
                        }
                    ]
                });
            };

            return events;
        },

        getComputed: function (viewModel) {
            const computed: any = {};

            computed.anyReady = Vue.computed(function () {
                let players;

                players = _.reject(viewModel.players, { id: viewModel.player.id });
                players = _.reject(players, 'isDisconnected');
                players = _.filter(players, 'isReady');

                return _.size(players) > 0;
            });

            computed.playersSortedByImportance = Vue.computed(function () {
                let players;

                players = _.reject(viewModel.players, 'isDisconnected');
                players = _.sortBy(players, [
                    function (player) {
                        let index;

                        index = viewModel.gameState.turnOrder.indexOf(player.id);

                        if (index >= 0) {
                            index = index - viewModel.gameState.turnOrder.indexOf(viewModel.gameState.currentTurn);

                            if (index < 0) {
                                index += _.size(viewModel.gameState.turnOrder);
                            }

                            return index;
                        }
                        else {
                            return Infinity;
                        }
                    },
                    function (player) { return player.isReady ? 0 : 1; }
                ]);

                return players;
            });

            computed.currentTurnPlayer = Vue.computed(function () {
                return viewModel.gameState.currentTurn ? _.find(viewModel.players, { id: viewModel.gameState.currentTurn }) : null;
            });

            return computed;
        }
    };

    function makeVM() {
        const viewModel = Vue.reactive({
            computed: {},
            events: {},
            helpers: {},
            makers: {}
        });

        _.merge(viewModel.events, viewModelFunctions.getEvents(viewModel));
        _.merge(viewModel.helpers, viewModelFunctions.getHelpers(viewModel));
        _.merge(viewModel.makers, viewModelFunctions.getMakers(viewModel));

        viewModel.roomId = page.helpers.getUrlParameter('roomId');

        viewModel.isHost = false;
        viewModel.isConnecting = false;
        viewModel.isConnected = false;
        viewModel.connectionStatus = '';

        viewModel.player = viewModel.makers.makePlayer({
            id: null,
            name: null
        });

        viewModel.messages = [];

        viewModel.myMessage = '';
        viewModel.copyGameLinkText = 'Copy Link';
        viewModel.players = {};

        // == game state ==
        viewModel.gameState = {
            gameName: app.gameName,
            started: false,
            turnOrder: [],
            currentTurn: null,
            turnTime: 30,
            turnTimeRemaining: null,

            game: null
        };
        // == /game state

        viewModel.gameStarted = null;
        viewModel.viewGameConfig = false;
        viewModel.gameOverReason = null;

        // Window state stuff
        viewModel.gamePanelHeight = window.innerHeight;
        viewModel.gamePanelWidth = window.innerWidth;

        // Config stuff
        viewModel.availableColors = randomColor({ luminosity: 'bright', count: 12 });
        viewModel.availableAvatarCssClasses = [
            { cssClass: 'fas fa-apple-alt', id: 'apple-alt' },
            { cssClass: 'fas fa-bread-slice', id: 'bread-slice' },
            { cssClass: 'fas fa-candy-cane', id: 'candy-cane' },
            { cssClass: 'fas fa-cat', id: 'cat' },
            { cssClass: 'fas fa-cheese', id: 'cheese' },
            { cssClass: 'fas fa-cookie', id: 'cookie' },
            { cssClass: 'fas fa-crow', id: 'crow' },
            { cssClass: 'fas fa-dog', id: 'dog' },
            { cssClass: 'fas fa-dove', id: 'dove' },
            { cssClass: 'fas fa-dragon', id: 'dragon' },
            { cssClass: 'fas fa-egg', id: 'egg' },
            { cssClass: 'fas fa-fish', id: 'fish' },
            { cssClass: 'fas fa-frog', id: 'frog' },
            { cssClass: 'fas fa-hamburger', id: 'hamburger' },
            { cssClass: 'fas fa-hat-wizard', id: 'hat-wizard' },
            { cssClass: 'fas fa-hippo', id: 'hippo' },
            { cssClass: 'fas fa-horse', id: 'horse' },
            { cssClass: 'fas fa-kiwi-bird', id: 'kiwi-bird' },
            { cssClass: 'fas fa-lemon', id: 'lemon' },
            { cssClass: 'fas fa-otter', id: 'otter' },
            { cssClass: 'fas fa-pizza-slice', id: 'pizza-slice' },
            { cssClass: 'fas fa-robot', id: 'robot' },
            { cssClass: 'fas fa-space-shuttle', id: 'space-shuttle' },
            { cssClass: 'fas fa-spider', id: 'spider' }
        ];

        if (viewModel.player.name === null) {
            viewModel.player.name = chance.prefix({}).replace(/\W+/g, '') + ' ' + chance.animal({}).replace(/[^\w\']+/g, ' ');
        }

        if (viewModel.player.metadata.avatar.value === null) {
            viewModel.player.metadata.avatar.type = 'css-class';
            viewModel.player.metadata.avatar.value = _.sample(viewModel.availableAvatarCssClasses).cssClass;
        }

        _.merge(viewModel.computed, viewModelFunctions.getComputed(viewModel));

        return viewModel;
    }

    viewModel = makeVM();
    page.viewModel = viewModel;

    page.initialise = function () {
        app.game = app.makeGameObject(connection, app, page.viewModel);
        page.viewModel.gameState.game = app.game.hooks.makeGame();

        if (localStorage.getItem(app.gameName + '-player-config')) {
            try {
                let playerConfig = JSON.parse(localStorage.getItem(app.gameName + '-player-config'));

                viewModel.player.name = playerConfig.name;

                _.mergeWith(viewModel.player.metadata, playerConfig.metadata, (objValue, srcValue, key) => {
                    if (objValue === viewModel.player.metadata.gameStats && key === 'gameStats' ||
                        objValue === viewModel.player.metadata.color && key === 'color') {
                        return objValue;
                    }
                });
            }
            catch (ex) { }
        }

        page.pageVue = Vue.createApp({
            data: () => page.viewModel,
            directives: {
                focus: {
                    mounted: (el) => el.focus()
                }
            }
        });

        page.pageVue.component('player-avatar', {
            props: ['player'],
            template: `
<i v-if="player.metadata.avatar.type=='css-class'"
    :class="player.metadata.avatar.value"
    :style="{ 'color': player.metadata.color }"></i>

<i v-else class="fas fa-question"
    :style="{ 'color': player.metadata.color }"></i>`
        });

        // Borrowed from https://codepen.io/square0225/pen/QdvLQg
        page.pageVue.component('fill-circle', {
            props: ['percent', 'color'],
            template: `
<svg viewBox="0 0 100 100" height="1em" style="height: 100%; transform: rotate(-90deg); border-radius: 50%; fill: none; stroke-width: 100%;"
     :style="{ 'stroke': color || '#7f8c8d', 'stroke-dasharray': ((Math.min(Math.max(percent,0),100) || 0) * Math.PI) + ', 999' }">
    <circle cx="50" cy="50" r="50"></circle>  
</svg>`
        });

        _.forEach(app.game.vueComponents, function (component, key) {
            page.pageVue.component(key, component);
        });

        page.pageVue.mount('#app');

        viewModel.helpers.calculateSizes();
        window.addEventListener("resize", viewModel.helpers.calculateSizes);
    };

    return page;
})();

app.helpers.pageReady(app.main.initialise);
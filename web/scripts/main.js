var app = app || {};

app.main = (function () {
    var page = {},
        viewModel,
        connection,
        viewModelFunctions;

    connection = {
        apiUrl: 'https://omok-server-zallist.azurewebsites.net',

        hub: null,
        userId: null,

        getUserId: function () {
            if (!connection.userId) {
                connection.userId = app.helpers.shortenUUID(chance.guid());
                viewModel.player = viewModel.makers.makePlayer({
                    id: connection.userId,
                    name: viewModel.player.name,
                    metadata: viewModel.player.metadata
                });
                viewModel.players[viewModel.player.id] = viewModel.player;
                window.location.hash = 'userId=' + connection.userId;
            }

            return connection.userId;
        },

        getConfig: function () {
            return {
                headers: {
                    'x-ms-signalr-userid': connection.getUserId(),
                    'x-userid': connection.getUserId(),
                    'x-roomId': viewModel.roomId
                }
            };
        },

        throwError: function (error) {
            var parsed = {};
            _.extend(parsed, error);
            parsed.message = error.toString();
            viewModel.connectionStatus = JSON.stringify(parsed, true, 4);
            viewModel.helpers.addMessage(null, "Network error: " + viewModel.connectionStatus, 'red');
            alert('Network error: ' + viewModel.connectionStatus);
        },

        connect: function () {
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
                });
            }

            function joinRoom() {
                viewModel.connectionStatus = 'Joining Room...';

                axios.post(connection.apiUrl + '/api/addToRoom', {
                    from: connection.getUserId(),
                    roomId: viewModel.gameId
                }, connection.getConfig())
                    .then(function (resp) {
                        connected();
                    })
                    .catch(connection.throwError);
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
                    .catch(connection.throwError);
            }

            function negotiate() {
                viewModel.connectionStatus = 'Negotiating...';

                axios.post(connection.apiUrl + '/api/negotiate?userid=' + encodeURIComponent(connection.getUserId()) + '&hubname=game', null, connection.getConfig())
                    .then(function (resp) { startHub(resp.data); })
                    .catch(connection.throwError);
            }

            viewModel.isConnected = false;
            viewModel.isConnecting = true;

            negotiate();
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
            var fromPlayer;

            fromPlayer = viewModel.helpers.getPlayer(fromPlayerId);

            switch (_.trim(data.type).toLowerCase()) {
                case 'message':
                    viewModel.helpers.addMessage(fromPlayerId, data.message);
                    break;
                case 'player-joined':
                    viewModel.players[fromPlayerId] = viewModel.makers.makePlayer(data.player);
                    fromPlayer = viewModel.helpers.getPlayer(fromPlayerId);
                    viewModel.helpers.addMessage(null, fromPlayer.name + ' joined', fromPlayer.color);

                    // Let's distribute the game state to this person too
                    if (viewModel.isHost) {
                        connection.send({
                            type: 'game-state',
                            players: viewModel.players,
                            gameState: viewModel.gameState
                        });
                    }
                    break;
                case 'ping':
                    fromPlayer.lastPing = Date.now();
                    break;
                case 'player-disconnected':
                    fromPlayer = viewModel.helpers.getPlayer(data.playerId);

                    if (fromPlayer.id && !fromPlayer.isDisconnected) {
                        viewModel.helpers.addMessage(null, fromPlayer.name + ' disconnected', fromPlayer.color);
                        fromPlayer.isDisconnected = true;
                        fromPlayer.isPlaying = false;

                        if (_.some(viewModel.gameState.turnOrder, data.playerId)) {
                            viewModel.gameState.turnOrder = _.reject(viewModel.gameState.turnOrder, data.playerId);
                        }
                    }
                    break;
                case 'game-state':
                    if (viewModel.isHost) break;
                    viewModel.players = _.mapValues(data.players, viewModel.makers.makePlayer);

                    viewModel.gameState = data.gameState;
                    viewModel.gameState.received = true;
                    break;
                case 'ready-changed':
                    fromPlayer.isReady = data.isReady;
                    viewModel.helpers.addMessage(null, fromPlayer.name + ' is' + (data.isReady ? '' : ' not') + ' ready', fromPlayer.color);
                    break;
                case 'game-started':
                    _.each(data.playerIds, function (id) {
                        var player = viewModel.players[id];

                        if (player) {
                            player.isPlaying = true;
                        }
                    });

                    viewModel.gameState = data.gameState;

                    viewModel.helpers.doStartTurn();
                    break;
                case 'end-turn':
                    if (viewModel.gameState.currentTurn !== fromPlayer.id) {
                        viewModel.helpers.addMessage(null, fromPlayer.name + " made a move when it wasn't their turn somehow", 'red');
                        return;
                    }

                    if (data.skipped) {
                        viewModel.helpers.addMessage(null, fromPlayer.name + ' had their turn skipped', 'red');
                    }

                    if (data.isWin) {
                        // You won
                        viewModel.helpers.addMessage(null, fromPlayer.name + ' won', fromPlayer.color);

                        viewModel.gameState.currentTurn = null;
                        viewModel.gameState.started = false;

                        _.forEach(viewModel.players, function (player) {
                            player.isReady = false;
                            player.isPlaying = false;
                        });

                        viewModel.player.isReady = false;
                        viewModel.player.isPlaying = false;

                        viewModel.helpers.stopTrackingTurnTime();
                    }
                    else {
                        viewModel.gameState.currentTurn = data.nextPlayerId;
                        viewModel.helpers.doStartTurn();
                    }
                    break;
            }

            app.game.hooks.handleData(fromPlayerId, data, fromPlayer);
        },

        send: function (data, toSelf) {
            if (toSelf) {
                connection.handleData(viewModel.player.id, data);
            }

            return axios.post(connection.apiUrl + '/api/messages', {
                from: connection.getUserId(),
                roomId: viewModel.gameId,
                data: data
            }, connection.getConfig())
                .then(function (resp) {

                })
                .catch(function (error) {
                    console.error('An error occurred in network request');
                });
        }
    };

    viewModelFunctions = {
        getHelpers: function (viewModel) {
            var helpers = {};

            helpers.addMessage = function (playerId, message, color) {
                var doScroll = false,
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
                    page.pageVue.$nextTick(function () {
                        chatbox.scrollTop = chatbox.scrollHeight;
                    });
                }
            };

            helpers.submitMyMessage = function () {
                var message = _.trim(viewModel.myMessage);

                viewModel.myMessage = '';

                if (message.length > 0) {
                    helpers.addMessage(viewModel.player.id, message);
                    connection.send({
                        type: 'message',
                        message: message
                    });
                }
            };
            helpers.getGameLink = function () {
                return window.location.origin + window.location.pathname + '?gameId=' + viewModel.gameId;
            };
            helpers.copyGameLink = function () {
                app.helpers.copyTextToClipboard(helpers.getGameLink());
                viewModel.copyGameLinkText = 'Copied!';

                setTimeout(function () {
                    viewModel.copyGameLinkText = 'Copy Link';
                }, 2000);
            };

            helpers.createGame = function () {
                viewModel.isHost = true;
                viewModel.gameId = chance.word({ length: 6 }).toLowerCase();

                app.game.hooks.setup();

                helpers.connect();
            };
            helpers.joinGame = function () {
                viewModel.isHost = false;

                if (!viewModel.gameId) {
                    alert('A game ID must be entered');
                }
                else {
                    helpers.connect();
                }
            };
            helpers.connect = function () {
                if (!viewModel.player.name) {
                    document.getElementById('name-form').reportValidity();
                }
                else {
                    viewModel.isConnecting = true;
                    viewModel.isConnected = false;

                    connection.connect();
                }
            };

            var unknownPlayer = null,
                systemPlayer = null;

            helpers.getPlayer = function (playerId) {
                var player = null;

                if (!playerId) {
                    if (!systemPlayer) {
                        systemPlayer = viewModel.makers.makePlayer({
                            id: null,
                            name: '[System]',
                            color: '#f1c40f',
                            metadata: {}
                        });
                    }

                    player = systemPlayer;
                }

                if (!player) {
                    player = viewModel.players[playerId];
                }

                if (!player) {
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
                var playerIndex;

                playerIndex = _.indexOf(viewModel.gameState.turnOrder, viewModel.gameState.currentTurn);
                playerIndex = (playerIndex + 1) % _.size(viewModel.gameState.turnOrder);

                return viewModel.gameState.turnOrder[playerIndex];
            };

            var currentTurnStarted = null,
                currentTurnTracker = null;

            helpers.stopTrackingTurnTime = function () {
                if (currentTurnTracker !== null)
                    clearInterval(currentTurnTracker);

                currentTurnTracker = null;
                currentTurnStarted = null;
            };

            helpers.trackTurnTime = function () {
                helpers.stopTrackingTurnTime();

                currentTurnStarted = Date.now();
                currentTurnTracker = setInterval(function () {
                    var timeSpent = (Date.now() - currentTurnStarted) / 1000.0,
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

                    viewModel.gameState.turnTimeRemaining = timeRemaining;
                }, 50);
            };

            helpers.doStartTurn = function () {
                var currentPlayer = helpers.getPlayer(viewModel.gameState.currentTurn);

                if (currentPlayer.id) {
                    helpers.addMessage(null, "It's " + currentPlayer.name + "'" + (_.endsWith(currentPlayer.name, 's') ? "" : "s") + " turn", currentPlayer.color);
                }

                helpers.trackTurnTime();
            };

            return helpers;
        },

        getMakers: function (viewModel) {
            var makers = {};

            makers.makePlayer = function (player) {
                player = _.extend({
                    id: null,
                    name: null,
                    lastPing: Date.now(),
                    isDisconnected: false,
                    isReady: false,
                    isPlaying: false,
                    metadata: {
                        avatar: {
                            type: 'css-class',
                            value: null
                        }
                    }
                }, player);

                player.color = player.color || app.helpers.generateColor(player.id);

                return player;
            };

            return makers;
        },

        getEvents: function (viewModel) {
            var events = {};

            return events;
        }
    };

    function makeVM() {
        var viewModel = Vue.reactive({});

        viewModel.events = {};
        _.extend(viewModel.events, viewModelFunctions.getEvents(viewModel));

        viewModel.helpers = {};
        _.extend(viewModel.helpers, viewModelFunctions.getHelpers(viewModel));

        viewModel.makers = {};
        _.extend(viewModel.makers, viewModelFunctions.getMakers(viewModel));

        viewModel.gameId = page.helpers.getUrlParameter('gameId');

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
            ready: false,
            started: false,
            turnOrder: [],
            currentTurn: null,
            turnTime: 30,
            turnTimeRemaining: null,

            game: null
        };
        // == /game state

        viewModel.events.toggleReady = function () {
            viewModel.player.isReady = !viewModel.player.isReady;
            connection.send({
                type: 'ready-changed',
                isReady: viewModel.player.isReady
            });
        };

        viewModel.events.startGame = function () {
            var playersPlaying, playingIds;

            if (!app.game.hooks.setup()) {
                // Something wrong
                return false;
            }

            viewModel.player.isReady = true;

            playersPlaying = _.filter(viewModel.players, { isReady: true, isDisconnected: false });
            playingIds = _.map(playersPlaying, 'id');

            viewModel.gameState.turnOrder = _.shuffle(playingIds);
            viewModel.gameState.currentTurn = viewModel.gameState.turnOrder[0];

            viewModel.gameState.started = true;

            connection.send({
                type: 'game-started',
                playerIds: playingIds,
                gameState: viewModel.gameState
            }, true);
        };

        viewModel.computed = viewModel.computed || {};
        viewModel.computed.anyReady = Vue.computed(function () {
            var players;

            players = _.reject(viewModel.players, { id: viewModel.player.id });
            players = _.reject(players, 'isDisconnected');
            players = _.filter(players, 'isReady');

            return _.size(players) > 0;
        });
        viewModel.computed.playersSortedByImportance = Vue.computed(function () {
            var players;

            players = _.reject(viewModel.players, 'isDisconnected');
            players = _.sortBy(players, [
                function (player) {
                    var index;

                    index = _.indexOf(viewModel.gameState.turnOrder, player.id);

                    if (index >= 0) {
                        index = _.indexOf(viewModel.gameState.turnOrder, viewModel.gameState.currentTurn) - index;

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

        // Config stuff
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

        // Remember settings
        function recordPlayerConfig() {
            localStorage.setItem('saved-player-config', JSON.stringify(viewModel.player));
        }

        if (localStorage.getItem('saved-player-config')) {
            try {
                _.extend(viewModel.player, JSON.parse(localStorage.getItem('saved-player-config')));
            }
            catch (ex) {}
        }

        if (viewModel.player.name === null) {
            viewModel.player.name = chance.prefix({}).replace(/\W+/g, '') + ' ' + chance.animal({}).replace(/[^\w\']+/g, ' ');
        }

        if (viewModel.player.metadata.avatar.value === null) {
            viewModel.player.metadata.avatar.type = 'css-class';
            viewModel.player.metadata.avatar.value = _.sample(viewModel.availableAvatarCssClasses).cssClass;
        }

        // Setup watchers for default states
        Vue.watch(viewModel.player, recordPlayerConfig);
        
        return viewModel;
    }

    page.computed = {

    };

    page.events = {
        
    };

    page.helpers = {
        getUrlParameter: function (key, useHash) {
            var urlParams = new URLSearchParams(useHash ? window.location.hash : window.location.search);
            return urlParams.has(key) ? urlParams.get(key) : null;
        }
    };

    viewModel = new makeVM();
    page.viewModel = viewModel;

    page.replaceHtmlElements = function () {
        // Replaces html elements so we can lazy load in game components
        // Could be done with vue components but would require more effort
        var elementsToReplace = document.getElementsByClassName('replace_with_html');

        _.each(elementsToReplace, function (element) {
            var replaceWithText, replaceWithNode, i;

            replaceWithText = _.get(window, element.getAttribute('data-replace-with'));
            replaceWithNode = document.createElement('div');
            replaceWithNode.innerHTML = replaceWithText;

            for (i = replaceWithNode.childNodes.length - 1; i >= 0; i--) {
                element.parentNode.insertBefore(replaceWithNode.childNodes[i], element.nextSibling);
            }
            element.parentNode.removeChild(element);
        });
    };

    page.initialise = function () {
        app.game = makeGameObject(connection, app, page.viewModel);
        page.viewModel.gameState.game = app.game.hooks.makeGame();
        page.viewModel.game = app.game;

        page.replaceHtmlElements();

        page.pageVue = Vue.createApp({
            data: function () { return page.viewModel; },
            directives: customVueDirectives
        }).mount('#app');
    };

    return page;
})();

app.helpers.pageReady(app.main.initialise);
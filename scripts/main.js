/// <reference path="libs/lodash.js" />
/// <reference path="libs/peerjs.js" />
/// <reference path="libs/vue.global.js" />

/// <reference path="helpers.js" />
/// <reference path="vue.directives.js" />

var app = app || {};

app.main = (function () {
    var page = {},
        viewModel,
        connection,
        viewModelFunctions;

    connection = {
        peer: null,
        connections: [],

        events: {
            dataReceived: function (dataWrap) {
                var conn = this, i,
                    data, from;

                from = dataWrap.from;
                data = dataWrap.data;

                if (viewModel.isHost) {
                    // Send to all other connections
                    for (i = 0; i < connection.connections.length; i++) {
                        if (connection.connections[i] !== conn) {
                            connection.sendToSpecificConnection(connection.connections[i], data, from);
                        }
                    }
                }

                connection.handleData(from, data);
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
                    viewModel.players[data.playerId] = viewModel.makers.makePlayer(data.player);
                    fromPlayer = viewModel.helpers.getPlayer(data.playerId);
                    viewModel.helpers.addMessage(null, fromPlayer.name + ' joined', fromPlayer.color);
                    break;
                case 'player-disconnected':
                    fromPlayer = viewModel.helpers.getPlayer(data.playerId);
                    if (!fromPlayer.isDisconnected) {
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
                case 'ping':
                    fromPlayer.lastPing = Date.now();
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

            // UNIQUE TO GAME
            switch (_.trim(data.type).toLowerCase()) {
                case 'end-turn':
                    if (_.isNumber(data.cellX) && _.isNumber(data.cellY)) {
                        viewModel.gameState.game.boardCells[data.cellY][data.cellX].ownedBy = fromPlayer.id;
                        viewModel.gameState.game.lastPlacedCell = viewModel.gameState.game.boardCells[data.cellY][data.cellX];
                    }
                    break;
            }
            // END OF UNIQUE TO GAME
        },

        sendToSpecificConnection: function (toConnection, data, fromPlayerId) {
            if (toConnection.open) {
                toConnection.send({
                    from: fromPlayerId || viewModel.player.id,
                    data: data
                });
            }
        },

        send: function (data, toSelf) {
            var i;

            if (toSelf) {
                connection.handleData(viewModel.player.id, data);
            }

            for (i = 0; i < connection.connections.length; i++) {
                connection.sendToSpecificConnection(connection.connections[i], data);
            }
        },

        addConnection: function (conn) {
            conn.on('open', function () {
                viewModel.connectionStatus = '';
                viewModel.isConnected = true;
                viewModel.isConnecting = false;

                if (viewModel.isHost) {
                    // Send game state
                    connection.sendToSpecificConnection(conn, {
                        type: 'game-state',
                        players: viewModel.players,
                        gameState: viewModel.gameState
                    });
                }
                else {
                    viewModel.helpers.addMessage(null, 'Joined game');
                }
            });

            conn.on('data', _.bind(connection.events.dataReceived, conn));

            conn.on('close', function () {
                if (viewModel.isHost) {
                    connection.send({
                        type: 'player-disconnected',
                        playerId: conn.peer
                    }, true);
                }
                else {
                    alert('Connection lost. Sorry.');
                }
            });

            conn.on('error', function (error) {
                var parsed = {};
                _.extend(parsed, error);
                parsed.message = error.toString();
                viewModel.connectionStatus = JSON.stringify(parsed, true, 4);
                viewModel.helpers.addMessage(null, "Network error: " + viewModel.connectionStatus, 'red');
            });

            if (viewModel.isHost) {
                // Tell all connected about the new connection
                connection.send({
                    type: 'player-joined',
                    playerId: conn.peer,
                    player: viewModel.makers.makePlayer({
                        id: conn.peer,
                        name: conn.metadata.playerName,
                        metadata: conn.metadata
                    })
                }, true);
            }
            else {
                setInterval(function () {
                    connection.send({
                        type: 'ping'
                    });
                }, 5000);
            }

            connection.connections.push(conn);
        },

        makePeer: function () {
            var peer = new Peer({
                host: 'peerjs-server-zallist.herokuapp.com',
                secure: true,
                port: 443,
                debug: 3
            });

            connection.peer = peer;

            viewModel.connectionStatus = 'Connecting...';

            peer.on('open', function (playerId) {
                var conn;

                viewModel.player = viewModel.makers.makePlayer({
                    id: playerId,
                    name: viewModel.player.name,
                    metadata: viewModel.player.metadata
                });
                viewModel.players[playerId] = viewModel.player;

                window.location.hash = 'playerId=' + app.helpers.shortenUUID(playerId);

                if (!viewModel.gameId) {
                    viewModel.gameId = app.helpers.shortenUUID(viewModel.player.id);

                    viewModel.isHost = true;
                    viewModel.isConnected = true;
                    viewModel.isConnecting = false;
                    viewModel.connectionStatus = 'Waiting for players';
                    viewModel.helpers.addMessage(null, 'Game created');

                    peer.on('connection', connection.addConnection);

                    viewModel.gameState.ready = true;

                    setInterval(function () {
                        var connected;

                        connected = _.reject(viewModel.players, { id: viewModel.player.id });
                        connected = _.reject(connected, 'rejected');

                        _.every(connected, function (player) {
                            if (Date.now() - player.lastPing > 15000) {
                                // Player disconnected
                                connection.send({
                                    type: 'player-disconnected',
                                    playerId: player.id
                                }, true);
                            }
                        });
                    }, 5000);
                }
                else {
                    // connect to open game
                    viewModel.connectionStatus = 'Connecting to game...';
                    conn = peer.connect(app.helpers.enlargeUUID(viewModel.gameId), {
                        metadata: _.extend({}, viewModel.player.metadata, { playerName: viewModel.player.name }),
                        reliable: true
                    });
                    connection.addConnection(conn);
                }
            });

            peer.on('disconnected', function () {
                viewModel.helpers.addMessage(null, "Unexpected disconnection - New connections will fail until you refresh.", 'red');
            });

            peer.on('error', function (error) {
                var parsed = {};
                _.extend(parsed, error);
                parsed.message = error.toString();
                viewModel.connectionStatus = JSON.stringify(parsed, true, 4);
                viewModel.helpers.addMessage(null, "Network error: " + viewModel.connectionStatus, 'red');
            });
        }
    };

    viewModelFunctions = {
        getHelpers: function (viewModel) {
            var helpers = {};

            helpers.addMessage = function (playerId, message, color) {
                var doScroll = false,
                    chatbox = document.getElementById('chat-box');

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
                viewModel.gameId = null;
                viewModel.events.gameEvents.setup();
                helpers.connect();
            };
            helpers.joinGame = function () {
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
                    connection.makePeer();
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

            // UNIQUE TO GAME
            helpers.gameHelpers = {
                isEasyWin: function (cell, playerId) {
                    var gameState = viewModel.gameState,
                        game = gameState.game,
                        config = game.configurationAtStart,
                        easyWinCount = 0;

                    cell.ownedBy = playerId;

                    function checkDir(xDir, yDir) {
                        var count;

                        count = viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x, cell.y, xDir, yDir);

                        if (!count.isBlocked && count.count === config.numberInARowRequired - 2) {
                            return true;
                        }

                        return false;
                    }
                    function checkSkipDir(xDir, yDir) {
                        var count;

                        count = viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x, cell.y, xDir, yDir);

                        if (!count.isBlocked && count.count === config.numberInARowRequired - 3) {
                            count = viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x + (xDir * -2), cell.y + (yDir * -2), xDir, yDir, playerId);
                            if (!count.isBlocked && count.count === config.numberInARowRequired - 4) {
                                return true;
                            }
                            count = viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x + (xDir * 2), cell.y + (yDir * 2), xDir, yDir, playerId);
                            if (!count.isBlocked && count.count === config.numberInARowRequired - 4) {
                                return true;
                            }
                        }

                        return false;
                    }

                    if (checkDir(-1, -1) || checkSkipDir(-1, -1) || checkSkipDir(1, 1)) {
                        easyWinCount += 1;
                    }
                    if (checkDir(0, -1) || checkSkipDir(0, -1) || checkSkipDir(0, 1)) {
                        easyWinCount += 1;
                    }
                    if (checkDir(1, -1) || checkSkipDir(1, -1) || checkSkipDir(-1, 1)) {
                        easyWinCount += 1;
                    }
                    if (checkDir(-1, 0) || checkSkipDir(-1, 0) || checkSkipDir(1, 0)) {
                        easyWinCount += 1;
                    }

                    cell.ownedBy = null;

                    if (easyWinCount > 1) {
                        return true;
                    }

                    return false;
                },

                getCellsOwnedInARow: function (xStart, yStart, xDelta, yDelta, playerId) {
                    // xyDelta = which direction to go to find start

                    var gameState = viewModel.gameState,
                        game = gameState.game,
                        config = game.configurationAtStart,
                        cell = null, firstOwnedCell = null,
                        ret;

                    ret = {
                        count: 0,
                        isBlocked: false
                    };

                    if (xDelta === 0 && yDelta === 0) return ret;

                    function travel(x, y, xDelta, yDelta) {
                        var cell = null;

                        x += xDelta;
                        y += yDelta;

                        if (x >= 0 && x < config.gridWidth &&
                            y >= 0 && y < config.gridHeight) {

                            cell = game.boardCells[y][x];
                        }

                        return cell;
                    }

                    cell = game.boardCells[yStart][xStart];

                    if (!playerId) {
                        playerId = cell.ownedBy;
                    }

                    firstOwnedCell = cell;

                    while (cell && cell.ownedBy === playerId) {
                        ret.count = 1;

                        cell = travel(cell.x, cell.y, xDelta, yDelta);

                        if (cell && cell.ownedBy === playerId) {
                            firstOwnedCell = cell;
                        }
                        else if (!cell || cell.ownedBy) {
                            ret.isBlocked = true;
                        }
                    }

                    cell = firstOwnedCell;

                    while (cell && cell.ownedBy === playerId) {
                        cell = travel(cell.x, cell.y, xDelta * -1, yDelta * -1);

                        if (cell && cell.ownedBy === playerId) {
                            ret.count += 1;
                        }
                        else if (!cell || cell.ownedBy) {
                            ret.isBlocked = true;
                        }
                    }

                    return ret;
                }
            };
            // END OF UNIQUE TO GAME

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

            makers.makeGame = function (game) {
                // UNIQUE TO GAME
                game = _.extend({
                    configuration: {
                        gridWidth: 19,
                        gridHeight: 19,
                        // In case you want to get more in a row
                        numberInARowRequired: 5,
                        // Double-threes
                        allowEasyWins: false,
                        // More than numberInARowRequired wins
                        allowOverWins: false,
                        // In seconds
                        turnTime: 30,
                        // true = do, false = dont, null = do if 4 or more players
                        placeRandomStarts: null
                    },
                    // Array of rows, which is an array of cells
                    boardCells: [],
                    // So we know what we last placed
                    lastPlacedCell: null
                }, game);

                // END OF UNIQUE TO GAME

                return game;
            };

            return makers;
        },

        getEvents: function (viewModel) {
            var events = {};

            // UNIQUE TO GAME
            events.gameEvents = {
                setup: function () {
                    var gameState = viewModel.gameState,
                        game = gameState.game,
                        config = game.configuration,
                        x, y,
                        row, cell;

                    // Setup game

                    // Store config just because
                    game.configurationAtStart = config;
                    game.boardCells = [];

                    for (y = 0; y < config.gridHeight; y++) {
                        row = [];
                        game.boardCells.push(row);

                        for (x = 0; x < config.gridWidth; x++) {
                            cell = {
                                x: x,
                                y: y,
                                ownedBy: null
                            };

                            row.push(cell);
                        }
                    }

                    if (config.placeRandomStarts) {

                    }

                    gameState.turnTime = config.turnTime;

                    return true;
                },
                cellClicked: function (cell) {
                    var gameState = viewModel.gameState,
                        game = gameState.game,
                        config = game.configurationAtStart,
                        countInDirection = [],
                        isWin = false;

                    // If the game's started
                    if (!gameState.started) {
                        return;
                    }

                    // If it's my turn
                    if (gameState.currentTurn !== viewModel.player.id) {
                        viewModel.helpers.addMessage(null, 'Not your turn');
                        return;
                    }

                    // If it's already clicked
                    if (cell.ownedBy) {
                        viewModel.helpers.addMessage(null, 'Pick an empty space');
                        return;
                    }

                    // Check if we fail validation
                    if (!config.allowEasyWins) {
                        if (viewModel.helpers.gameHelpers.isEasyWin(cell, viewModel.player.id)) {
                            viewModel.helpers.addMessage(null, 'No easy wins allowed (double ' + (game.configurationAtStart.numberInARowRequired - 2) + 's)');
                            return;
                        }
                    }

                    // Temporarily own it for calculations
                    cell.ownedBy = viewModel.player.id;

                    // Count how many we have in each direction if this is placed
                    // up left
                    countInDirection.push(viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x, cell.y, -1, -1));
                    // up
                    countInDirection.push(viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x, cell.y, 0, -1));
                    // up right
                    countInDirection.push(viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x, cell.y, 1, -1));
                    // left
                    countInDirection.push(viewModel.helpers.gameHelpers.getCellsOwnedInARow(cell.x, cell.y, -1, 0));

                    // Clear owner just in case validation fails
                    cell.ownedBy = null;

                    // Check if we won
                    // TODO : Potentially need to discount blocked if we're implementing certain Renju rule sets
                    if (config.allowOverWins) {
                        isWin = _.some(countInDirection, function (count) {
                            return count.count >= config.numberInARowRequired;
                        });
                    }
                    else {
                        isWin = _.some(countInDirection, function (count) {
                            return count.count === config.numberInARowRequired;
                        });
                    }

                    // If all goes to plan, let's say we own it
                    connection.send({
                        type: 'end-turn',
                        cellX: cell.x,
                        cellY: cell.y,
                        isWin: isWin,
                        nextPlayerId: viewModel.helpers.getNextPlayer()
                    }, true);

                }
            };
            // END OF UNIQUE TO GAME

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

            game: viewModel.makers.makeGame()
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

            if (!viewModel.events.gameEvents.setup()) {
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

    page.initialise = function () {
        page.pageVue = Vue.createApp({
            data: function () { return page.viewModel; },
            directives: customVueDirectives
        }).mount('#app');

        window.addEventListener('beforeunload', function (e) {
            if (connection.peer) {
                connection.peer.destroy();
                connection.peer = null;
            }
        });
    };

    return page;
})();

app.helpers.pageReady(app.main.initialise);
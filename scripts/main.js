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
                var conn = this,
                    i,
                    data, from;

                from = dataWrap.from;
                data = dataWrap.data;

                // do something with data
                console.log('Received data', dataWrap);

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
                    viewModel.helpers.addMessage(null, fromPlayer.name + ' disconnected', fromPlayer.color);
                    fromPlayer.isDisconnected = true;
                    break;
                case 'game-state':
                    if (viewModel.isHost) break;
                    viewModel.players = _.mapValues(data.players, viewModel.makers.makePlayer);

                    // TODO : map game state
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
                    break;
            }

            // TODO : Handle custom events
        },

        sendToSpecificConnection: function (toConnection, data, fromPlayerId) {
            toConnection.send({
                from: fromPlayerId || viewModel.player.id,
                data: data
            });
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

                conn.on('data', _.bind(connection.events.dataReceived, conn));

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

            if (viewModel.isHost) {
                // Tell all connected about the new connection
                connection.send({
                    type: 'player-joined',
                    playerId: conn.peer,
                    player: viewModel.makers.makePlayer({
                        id: conn.peer,
                        name: conn.label,
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
                port: 443
            });

            connection.peer = peer;

            viewModel.connectionStatus = 'Connecting...';

            peer.on('open', function (playerId) {
                var conn;

                viewModel.player = viewModel.makers.makePlayer({
                    id: playerId,
                    name: viewModel.player.name,
                    metadata: {}
                });
                viewModel.players[playerId] = viewModel.player;

                window.location.hash = 'playerId=' + playerId;

                if (!viewModel.gameId) {
                    viewModel.gameId = viewModel.player.id;

                    viewModel.isHost = true;
                    viewModel.isConnected = true;
                    viewModel.isConnecting = false;
                    viewModel.connectionStatus = 'Waiting for players';
                    viewModel.helpers.addMessage(null, 'Game created');

                    peer.on('connection', connection.addConnection);

                    viewModel.gameState.ready = true;

                    setInteval(function () {
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
                    conn = peer.connect(viewModel.gameId, {
                        label: viewModel.player.name,
                        metadata: {

                        }
                    });
                    connection.addConnection(conn);
                }
            });

            peer.on('error', function (error) {
                var parsed = {};
                _.extend(parsed, error);
                parsed.message = error.toString();
                viewModel.connectionStatus = JSON.stringify(parsed, true, 4);
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
                    isPlaying: false
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
            name: chance.prefix({}).replace(/\W+/g, '') + ' ' + chance.animal({}).replace(/[^\w\']+/g, ' ')
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
            currentTurn: null
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

            viewModel.player.isReady = true;

            playersPlaying = _.filter(viewModel.players, { isReady: true, isDisconnected: false });
            playingIds = _.map(playersPlaying, 'id');

            viewModel.gameState.turnOrder = _.shuffle(playingIds);
            viewModel.gameState.currentTurn = _.sample(playingIds);

            viewModel.gameState.started = true;

            connection.send({
                type: 'game-started',
                playerIds: playingIds,
                gameState: viewModel.gameState
            }, true);
        };

        viewModel.computed = viewModel.computed || {};
        viewModel.computed.allReady = function () {
            var players;

            players = _.reject(viewModel.players, { id: viewModel.player.id });

            return _.size(players) > 0 && _.every(players, { isReady: true });
        };

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
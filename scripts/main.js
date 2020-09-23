/// <reference path="libs/lodash.js" />
/// <reference path="libs/peerjs.js" />
/// <reference path="libs/vue.global.js" />

var app = app || {};

app.main = (function () {
    var page = {},
        viewModel,
        connection;

    connection = {
        peer: null,
        connections: [],

        events: {
            dataReceived: function (dataWrap) {
                var conn = this,
                    i,
                    data, from,
                    fromConnection;

                from = dataWrap.from;
                data = dataWrap.data;

                // do something with data
                console.log('Received data: %s', dataWrap);

                if (viewModel.isHost) {
                    // Send to all other connections
                    for (i = 0; i < connection.connections.length; i++) {
                        if (connection.connections[i] !== conn) {
                            connection.sendData(connection.connections[i], data, from);
                        }
                    }
                }

                connection.handleData(fromConnection, data);
            },
        },

        handleData: function (fromPeerId, data) {
            var fromPlayer;

            // TODO : Parse player
            fromPlayer = { name: viewModel.playerName };

            switch (_.trim(data.type).toLowerCase()) {
                case 'message':
                    viewModel.helpers.addMessage(fromPeerId, fromPlayer.name, data.message);
                    break;
            }
        },

        sendData: function (toConnection, data, fromPeerId) {
            toConnection.send({
                from: fromPeerId || viewModel.peerId,
                data: data
            });
        },

        sendToAllConnected: function (data) {
            var i;

            for (i = 0; i < connection.connections.length; i++) {
                connection.sendData(connection.connections[i], data);
            }
        },

        addConnection: function (conn) {
            conn.on('open', function () {
                viewModel.connectionStatus = '';
                viewModel.isConnected = true;
                viewModel.isConnecting = false;
                conn.on('data', _.bind(connection.events.dataReceived, conn));
            });

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

            peer.on('open', function (id) {
                var conn;

                viewModel.peerId = id;
                window.location.hash = 'peerId=' + id;

                if (!viewModel.gameId) {
                    viewModel.gameId = viewModel.peerId;

                    viewModel.isHost = true;
                    viewModel.isConnected = true;
                    viewModel.isConnecting = false;
                    viewModel.connectionStatus = 'Waiting for players';
                    viewModel.helpers.addMessage(null, null, 'Game created');

                    peer.on('connection', connection.addConnection);
                }
                else {
                    // connect to open game
                    viewModel.connectionStatus = 'Connecting to game...';
                    conn = peer.connect(viewModel.gameId, {
                        label: viewModel.playerName,
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

    function makeVM() {
        var viewModel = Vue.reactive({});

        viewModel.helpers = {};

        viewModel.gameId = page.helpers.getUrlParameter('gameId');
        viewModel.gameStarted = false;
        viewModel.isReady = false;

        viewModel.helpers.startGame = function () {
            // TODO : check if ready
            viewModel.gameStarted = true;
        };

        viewModel.isHost = false;
        viewModel.isConnecting = false;
        viewModel.isConnected = false;
        viewModel.connectionStatus = '';

        viewModel.peerId = null;
        viewModel.playerName = '';

        viewModel.messages = [];
        viewModel.helpers.addMessage = function (peerId, name, message) {
            var color = app.helpers.generateColor(peerId),
                doScroll = false,
                chatbox = document.getElementById('chat-box');

            if (chatbox) {
                doScroll = chatbox.scrollHeight - 10 < chatbox.clientHeight + chatbox.scrollTop;
            }

            viewModel.messages.push({
                created: new Date(),
                peerId: peerId,
                name: name,
                message: message,
                color: color
            });

            if (doScroll) {
                page.pageVue.$nextTick(function () {
                    chatbox.scrollTop = chatbox.scrollHeight;
                });
            }
        };

        viewModel.myMessage = '';
        viewModel.helpers.submitMyMessage = function () {
            var message = _.trim(viewModel.myMessage);

            viewModel.myMessage = '';

            if (message.length > 0) {
                viewModel.helpers.addMessage(viewModel.peerId, viewModel.playerName, message);
                connection.sendToAllConnected({
                    type: 'message',
                    message: message
                });
            }
        };

        viewModel.helpers.getGameLink = function () {
            return window.location.origin + window.location.pathname + '?gameId=' + viewModel.gameId;
        };
        viewModel.copyGameLinkText = 'Copy Link';
        viewModel.helpers.copyGameLink = function () {
            app.helpers.copyTextToClipboard(viewModel.helpers.getGameLink());
            viewModel.copyGameLinkText = 'Copied!';

            setTimeout(function () {
                viewModel.copyGameLinkText = 'Copy Link';
            }, 2000);
        };

        viewModel.helpers.createGame = function () {
            viewModel.gameId = null;
            viewModel.helpers.connect();
        };
        viewModel.helpers.joinGame = function () {
            if (!viewModel.gameId) {
                alert('A game ID must be entered');
            }
            else {
                viewModel.helpers.connect();
            }
        };
        viewModel.helpers.connect = function () {
            if (!viewModel.playerName) {
                document.getElementById('name-form').reportValidity();
            }
            else {
                viewModel.isConnecting = true;
                viewModel.isConnected = false;
                connection.makePeer();
            }
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
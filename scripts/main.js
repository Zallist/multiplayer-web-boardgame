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
            dataReceived: function (data) {
                var conn = this;

                // do something with data
                console.log('Received data: %s', data);
            },

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
            var peer = new Peer({});

            connection.peer = peer;

            viewModel.connectionStatus = 'Connecting...';

            peer.on('open', function (id) {
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
                    connection.addConnection(peer.connect(viewModel.gameId));
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

                // TODO : Send to all players
            }
        };

        viewModel.helpers.getGameLink = function () {
            return window.location.origin + window.location.pathname + '?gameId=' + viewModel.gameId;
        };
        viewModel.helpers.copyGameLink = function () {
            app.helpers.copyTextToClipboard(viewModel.helpers.getGameLink());
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
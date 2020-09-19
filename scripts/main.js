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
                viewModel.connectionStatus = 'Connected';
                viewModel.isConnected = true;
                viewModel.isConnecting = false;
                conn.on('data', _.bind(connection.events.dataReceived, conn));
            });

            connection.connections.push(conn);
        },

        makePeer: function () {
            var peer = new Peer({});

            connection.peer = peer;

            peer.on('open', function (id) {
                viewModel.peerId = id;
                window.location.hash = 'peerId=' + id;

                if (!viewModel.gameId) {
                    viewModel.gameId = viewModel.peerId;

                    viewModel.isHost = true;
                    viewModel.isConnected = true;
                    viewModel.isConnecting = false;
                    viewModel.connectionStatus = 'Waiting for players';

                    peer.on('connection', connection.addConnection);
                }
                else {
                    // connect to open game
                    viewModel.connectionStatus = 'Connecting to game...';
                    connection.addConnection(peer.connect(viewModel.gameId));
                }
            });
        }
    };

    function makeVM() {
        var viewModel = {};

        viewModel.peerId = null;
        viewModel.gameId = page.helpers.getUrlParameter('gameId');

        viewModel.isHost = !!viewModel.gameId;
        viewModel.isConnecting = false;
        viewModel.isConnected = false;

        viewModel.connectionStatus = 'Connecting...';
        viewModel.playerName = '';

        viewModel.helpers = {};
        viewModel.helpers.connect = function () {
            viewModel.isConnecting = true;
            viewModel.isConnected = false;
            connection.makePeer();
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

    page.initialise = function () {

    };

    viewModel = new makeVM();
    page.viewModel = viewModel;

    return page;
})();

app.main.initialise();
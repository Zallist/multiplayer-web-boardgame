// == Rename file to server.url.js to configure

var app = app || {};

var host = window.location.origin.replace(/\/$/, '') + '/';
app.serverUrl = host + 'hub';
app.serverType = 'signalr';

# multiplayer-web-boardgame
Simple web framework using Vue and SignalR to build multiplayer turn-based board games.

# WIP 

# Configuration
Configuration of server URL is held at /web/server.url.template.js. Make this into a /web/server.url.js that contains your server-side URL.
This will cause a 404 if not configured, and is done this way to *attempt* to simplify deployment and remove the need for any server-side code for the actual distribution of files.

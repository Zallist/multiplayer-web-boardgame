# multiplayer-web-boardgame
Simple web framework using Vue and SignalR to build multiplayer turn-based board games.

# WIP 

# Configuration
Configuration of server URL is held at /web/server.url.template.js. Make this into a /web/server.url.js that contains your server-side URL.
This will cause a 404 if not configured, and is done this way to *attempt* to simplify deployment and remove the need for any server-side code for the actual distribution of files.

# My Deployment setup
I'm deploying *server-dotnet* to an Azure App Service using Visual Studio publish.
I also have a private mirror of this repository which has an additional commit with a /web/server.url.js that contains the URL from the publish above. The mirror complexity can be easily removed if there's a way to compile-on-demand the URL you want. Or provide it from the server side.
The /web/ directory then gets deployed to an Azure Static Web App and is *just* static files.

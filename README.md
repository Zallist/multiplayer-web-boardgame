# multiplayer-web-boardgame
Simple web framework using Vue and SignalR to build multiplayer turn-based board games.

# Implemented Games
Multiple games are implementable. The raw "rules" for each are contained in /web/scripts/game/\*.js
Currently implemented:
* Omok
* Chess

# TODO
* Custom & randomised avatars
* Implement new game modes
  * ~~Omok~~
    * Additional assets as they become available
  * ~~Chess~~
    * Chess config (allow rooking, allow pawn promotion, place random)
    * Accessible by putting *?game=chess* on the URL
* Implement game mode selector

# Configuration
## Server URL Configuration
Configuration of server URL is held at /web/server.url.template.js. Make this into a /web/server.url.js that contains your server-side URL.
This will cause a 404 if not configured, and is done this way to *attempt* to simplify deployment and remove the need for any server-side code for the actual distribution of files.
## Theme Configuration
*standard-themes.scss* can be swapped out or removed entirely to change theming. The base game system should work without any theme whatsoever.

# My Deployment setup
I'm deploying *server-dotnet* to an Azure App Service using Visual Studio publish.
I also have a private mirror of this repository which has an additional commit with a /web/server.url.js that contains the URL from the publish above. The mirror complexity can be easily removed if there's a way to compile-on-demand the URL you want. Or provide it from the server side.
The /web/ directory gets deployed to an Azure Static Web App and is *just* static files.

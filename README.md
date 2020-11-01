# multiplayer-web-boardgame
Simple web framework using Vue and SignalR to build multiplayer turn-based board games. 

## What it does
* Network interactions (simple signalr implementation to send all packets) & serialisation
* Game synchronization (the HOST player has the final say-so, and all game code is implemented client side)
* Avatar selection & configuration
* Chatting
* Stat tracking (in localStorage)
* Basic game logic states (extras can be triggered by individual games):
 * Game start
 * End turn (logic from game)
 * Game win/loss/tie/forfeit (logic from game)
* Resetting turns if players disconnect
* Synchronizing game state on load

## What it does not do:
* Implement individual game logic (relegated to js & css files for each game mode)
* Implement anti-hacking logic (can be done per-game by verifying against the host, but as there's no persistent server, there's no guaranteed anti-hack mechanism)
* Implement any persistence at a server level (all stats are stored in local storage and sent on loading)

# Implemented Games
Multiple games are implementable. The raw "rules" for each are contained in /web/scripts/game/\*.js
Currently implemented:
* Omok
 * Default, but explicit is *?game=omok* on the url
* Chess
 * Use *?game=chess* on the URL to access it
 * Currently missing various configuration options, rooking, promotions, randomisation

# TODO
* More avatar/piece selection
 * Generating svg with colours on demand
* Chess config (allow rooking, allow pawn promotion, place random)
* New games
* Game mode selector

# Configuration
## Server URL Configuration
Configuration of server URL is held at /web/server.url.template.js. Make this into a /web/server.url.js that contains your server-side URL.
This will cause a 404 if not configured, and is done this way to *attempt* to simplify deployment and remove the need for any server-side code for the actual distribution of files.
## Theme Configuration
*theme-standard.scss* can be swapped out or removed entirely to change theming. 
The base game system should work without any theme whatsoever.
You can also just use *?theme=none* on the URL to disable it. 
The name here changes the theme we load in, so *?theme=amazing* would load theme-amazing.scss.

# My Deployment setup
I'm deploying *server-dotnet* to an Azure App Service using Visual Studio publish.
I also have a private mirror of this repository which has an additional commit with a /web/server.url.js that contains the URL from the publish above. The mirror complexity can be easily removed if there's a way to compile-on-demand the URL you want. Or provide it from the server side.
The /web/ directory gets deployed to an Azure Static Web App and is *just* static files.

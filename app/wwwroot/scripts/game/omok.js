var app = app || {};
app.makeGameObject = function (connection, app, viewModel) {
    var gameObject = {}, gameViewModel = Vue.reactive({});
    gameObject.viewModel = gameViewModel;
    // Components get injected into the right place, so this is where we write custom HTML
    gameObject.vueComponents = {
        'game-panel': {
            data: function () {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: "\n<div class=\"game__board\" \n     v-touch-highlight>\n    <div class=\"game__row\" v-for=\"(row, rowIndex) in $data.$vm.gameState.game.boardCells\" :key=\"rowIndex\">\n        <div v-for=\"(cell, cellIndex) in row\" :key=\"cellIndex\"\n             @click.prevent=\"$data.$game.events.cellClicked(cell)\"\n             :class=\"{ 'game__cell': true, 'game__cell--owned': cell.ownedBy }\">\n\n            <div v-if=\"cell.ownedBy\"\n                 v-for=\"player in [$data.$vm.helpers.getPlayer(cell.ownedBy)]\"\n                 :class=\"{ 'omok__piece': true, 'omok__piece--last-placed': cell === $data.$vm.gameState.game.lastPlacedCell }\"\n                 :style=\"{ 'font-size': (Math.min($data.$vm.gamePanelHeight / $data.$vm.gameState.game.configurationAtStart.gridSize,$data.$vm.gamePanelWidth / $data.$vm.gameState.game.configurationAtStart.gridSize) * 0.75) + 'px' }\"\n                 :title=\"'Owned by ' + player.name\">\n\n                <player-avatar :player=\"player\"></player-avatar>\n            </div>\n        </div>\n    </div>\n</div>\n"
        },
        'config-panel': {
            data: function () {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: "\n<fieldset :disabled=\"$data.$vm.isConnecting || ($data.$vm.isConnected && !$data.$vm.isHost) || ($data.$vm.isConnected && $data.$vm.isHost && $data.$vm.gameState.started)\">\n    <div class=\"mb-3\">\n        <label>Use a preset</label>\n        <div>\n            <button type=\"button\" class=\"btn btn-primary mr-1\" @click=\"$data.$game.events.setPreset('omok')\">Omok</button>\n            <button type=\"button\" class=\"btn btn-primary mr-1\" @click=\"$data.$game.events.setPreset('gomoku')\">Gomoku</button>\n            <button type=\"button\" class=\"btn btn-primary\" @click=\"$data.$game.events.setPreset('tic-tac-toe')\">Tic-Tac-Toe</button>\n        </div>\n    </div>\n    <div>\n        <label>Turn Time (seconds)</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" :min=\"$data.$vm.gameState.game.configuration.turnTime > 10 ? 1 : 0.25\" max=\"180\" :step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"0.25\" max=\"180\" :step=\"0.25\" v-model.number=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n        </div>\n\n        <small class=\"form-text text-danger\" v-show=\"$data.$vm.gameState.game.configuration.turnTime < 3\">\n            Turns this short may get affected by latency and people may miss their turns without realising\n        </small>\n    </div>\n    <div class=\"mt-3\">\n        <label>Grid Size</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"1\" max=\"100\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.gridSize\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"1\" max=\"100\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.gridSize\" />\n            </div>\n        </div>\n\n        <small class=\"form-text text-danger\" v-show=\"$data.$vm.gameState.game.configuration.gridSize > 40\">\n            Playing with a grid this size is likely to make it laggy. Good luck.\n        </small>\n    </div>\n    <div class=\"mt-3\">\n        <label>Number In A Row To Win</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"1\" :max=\"$data.$vm.gameState.game.configuration.gridSize\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.numberInARowRequired\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"1\" :max=\"$data.$vm.gameState.game.configuration.gridSize\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.numberInARowRequired\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <div class=\"form-check\">\n            <label class=\"form-check-label\">\n                <input class=\"form-check-input\" type=\"checkbox\" v-model=\"$data.$vm.gameState.game.configuration.allowOverWins\">\n                Allow Over Wins (overlines)\n            </label>\n        </div>\n\n        <small class=\"form-text text-secondary config__help-text\">\n            Can you win by placing more than the number required in a row?\n        </small>\n    </div>\n    <div class=\"mt-3\">\n        <div class=\"form-check\">\n            <label class=\"form-check-label\">\n                <input class=\"form-check-input\" type=\"checkbox\" v-model=\"$data.$vm.gameState.game.configuration.allowDoubleThrees\">\n                Allow Easy Wins (double 3s)\n            </label>\n        </div>\n\n        <small class=\"form-text text-secondary config__help-text\">\n            Easy Wins are based on the \"double-threes\" rule. You can't place pieces where you would get 2 <strong>unblocked</strong> {{$data.$vm.gameState.game.configuration.numberInARowRequired - 2}}s in a row.\n        </small>\n    </div>\n    <div class=\"mt-3\" v-show=\"!$data.$vm.gameState.game.configuration.allowDoubleThrees\">\n        <div class=\"form-check\">\n            <label class=\"form-check-label\">\n                <input class=\"form-check-input\" type=\"checkbox\" v-model=\"$data.$vm.gameState.game.configuration.allowDoubleFours\">\n                Allow 2x N-1 (double 4s)\n            </label>\n        </div>\n\n        <small class=\"form-text text-secondary config__help-text\">\n            Based on the \"double-fours\" rule. You can't place pieces where you would get 2 {{$data.$vm.gameState.game.configuration.numberInARowRequired - 1}}s in a row.\n        </small>\n    </div>\n</fieldset>\n"
        },
        'help-content': {
            template: "\n<h3>How To Play</h3>\n<div>\n    <ul>\n        <li>Place a number of pieces (default: 5) in a row to win</li>\n        <li>Stop other players from winning to not lose</li>\n        <li>If playing with more than 2 players, be sneaky</li>\n    </ul>\n</div>"
        }
    };
    gameObject.hooks = {
        handleData: function (fromPlayerId, data, fromPlayer) {
            switch (_.trim(data.type).toLowerCase()) {
                case 'end-turn':
                    if (_.isNumber(data.cellX) && _.isNumber(data.cellY)) {
                        viewModel.gameState.game.boardCells[data.cellY][data.cellX].ownedBy = fromPlayerId;
                        viewModel.gameState.game.lastPlacedCell = viewModel.gameState.game.boardCells[data.cellY][data.cellX];
                        if (fromPlayerId === viewModel.player.id) {
                            if (data.isWin) {
                                gameObject.assets.sounds['my_win'].play();
                            }
                            else {
                                gameObject.assets.sounds['my_piece_placed'].play();
                            }
                        }
                        else {
                            if (data.isWin) {
                                gameObject.assets.sounds['other_win'].play();
                            }
                            else {
                                gameObject.assets.sounds['other_piece_placed'].play();
                            }
                        }
                        if (!data.isWin && data.nextPlayerId === viewModel.player.id) {
                            gameObject.assets.sounds['your_turn'].play();
                        }
                    }
                    break;
                case 'player-joined':
                    gameObject.assets.sounds['player_joined'].play();
                    break;
                case 'ready-changed':
                    if (data.isReady) {
                        gameObject.assets.sounds['player_ready'].play();
                    }
                    else {
                        gameObject.assets.sounds['player_unready'].play();
                    }
                    break;
                case 'game-tie':
                    gameObject.assets.sounds['game_tie'].play();
                    break;
                case 'game-started':
                    gameObject.assets.sounds['game_start'].play();
                    break;
            }
        },
        makeGame: function (game) {
            game = _.merge({
                configuration: {
                    gridSize: 19,
                    // In case you want to get more in a row
                    numberInARowRequired: 5,
                    // Double-threes (unblocked)
                    allowDoubleThrees: false,
                    // Double-fours (incl blocked)
                    allowDoubleFours: true,
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
            if (localStorage.getItem(app.gameName + '-game-configuration')) {
                try {
                    _.merge(game.configuration, JSON.parse(localStorage.getItem(app.gameName + '-game-configuration')));
                }
                catch (ex) { }
            }
            return game;
        },
        setup: function () {
            var gameState = viewModel.gameState, game = gameState.game, config = game.configuration, x, y, row, cell;
            // Validation checks
            config.turnTime = Number(config.turnTime);
            config.gridSize = Number(config.gridSize);
            config.numberInARowRequired = Number(config.numberInARowRequired);
            if (!_.isFinite(config.turnTime) || config.turnTime < 0.25) {
                alert('Invalid turn time');
                return false;
            }
            if (!_.isFinite(config.gridSize) || config.gridSize < 1 || config.gridSize > 250) {
                // 250 max because we need SOME max and that's about the limit of where I reckon your browser will crash
                alert('Invalid grid size');
                return false;
            }
            if (!_.isFinite(config.numberInARowRequired) || config.numberInARowRequired < 1 || config.numberInARowRequired > config.gridSize) {
                alert('Invalid number in a row required');
                return false;
            }
            // Store config just because
            game.configurationAtStart = config;
            game.boardCells = [];
            for (y = 0; y < config.gridSize; y++) {
                row = [];
                game.boardCells.push(row);
                for (x = 0; x < config.gridSize; x++) {
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
            // Save configuration for next time
            localStorage.setItem(app.gameName + '-game-configuration', JSON.stringify(config));
            return true;
        }
    };
    gameViewModel.events = {
        cellClicked: function (cell) {
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, countInDirection = [], isWin = false;
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
            if (!config.allowDoubleThrees) {
                if (gameObject.helpers.isEasyWin(cell, viewModel.player.id)) {
                    viewModel.helpers.addMessage(null, 'No easy wins allowed (double ' + (game.configurationAtStart.numberInARowRequired - 2) + 's)');
                    return;
                }
            }
            // Temporarily own it for calculations
            cell.ownedBy = viewModel.player.id;
            // Count how many we have in each direction if this is placed
            // up left
            countInDirection.push(gameObject.helpers.getCellsOwnedInARow(cell.x, cell.y, -1, -1));
            // up
            countInDirection.push(gameObject.helpers.getCellsOwnedInARow(cell.x, cell.y, 0, -1));
            // up right
            countInDirection.push(gameObject.helpers.getCellsOwnedInARow(cell.x, cell.y, 1, -1));
            // left
            countInDirection.push(gameObject.helpers.getCellsOwnedInARow(cell.x, cell.y, -1, 0));
            // Clear owner just in case validation fails
            cell.ownedBy = null;
            // Check if we won
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
            // Let's do a background check for a game tie, since in theory that can be laggy
            setTimeout(gameObject.helpers.checkForTie, 0);
        },
        setPreset: function (presetName) {
            var gameState = viewModel.gameState, game = gameState.game, config = game.configuration;
            config.turnTime = 30;
            config.allowOverWins = false;
            config.allowDoubleThrees = false;
            config.allowDoubleFours = true;
            config.gridSize = 19;
            config.numberInARowRequired = 5;
            switch (_.trim(presetName).toLowerCase()) {
                case 'tic-tac-toe':
                    config.allowDoubleThrees = true;
                    config.gridSize = 3;
                    config.numberInARowRequired = 3;
                    break;
                case 'gomoku':
                    config.allowDoubleThrees = true;
                    config.allowOverWins = true;
                    break;
                case 'omok':
                default:
                    // Standard omok rules, set above
                    break;
            }
        }
    };
    gameObject.helpers = {
        isEasyWin: function (cell, playerId) {
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, easyWinCount = 0;
            cell.ownedBy = playerId;
            function checkDir(xDir, yDir) {
                var count;
                count = gameObject.helpers.getCellsOwnedInARow(cell.x, cell.y, xDir, yDir);
                if (!count.isBlocked && count.count === config.numberInARowRequired - 2) {
                    return true;
                }
                if (!config.allowDoubleFours && count.count === config.numberInARowRequired - 1) {
                    return true;
                }
                return false;
            }
            function checkSkipDir(xDir, yDir) {
                var count;
                count = gameObject.helpers.getCellsOwnedInARow(cell.x, cell.y, xDir, yDir);
                if (!count.isBlocked && count.count === config.numberInARowRequired - 3) {
                    count = gameObject.helpers.getCellsOwnedInARow(cell.x + (xDir * -2), cell.y + (yDir * -2), xDir, yDir, playerId);
                    if (!count.isBlocked && count.count === config.numberInARowRequired - 4) {
                        return true;
                    }
                    count = gameObject.helpers.getCellsOwnedInARow(cell.x + (xDir * 2), cell.y + (yDir * 2), xDir, yDir, playerId);
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, cell = null, firstOwnedCell = null, ret;
            ret = {
                count: 0,
                isBlocked: false
            };
            if ((xDelta === 0 && yDelta === 0) ||
                xStart < 0 || yStart < 0 ||
                xStart >= config.gridSize || yStart >= config.gridSize)
                return ret;
            function travel(x, y, xDelta, yDelta) {
                var cell = null;
                x += xDelta;
                y += yDelta;
                if (x >= 0 && x < config.gridSize &&
                    y >= 0 && y < config.gridSize) {
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
        },
        checkForTie: function () {
            var gameState = viewModel.gameState, game = gameState.game, y, x, row, cell;
            for (y = 0; y < game.boardCells.length; y++) {
                row = game.boardCells[y];
                for (x = 0; x < row.length; x++) {
                    cell = row[x];
                    if (!cell.ownedBy) {
                        return true;
                    }
                }
            }
            connection.send({
                type: 'game-tie',
                isAutomatic: true
            }, true);
            return false;
        }
    };
    // initialise
    gameObject.assets = (function () {
        var assets;
        assets = {};
        assets.sounds = {
            'my_piece_placed': new Howl({
                src: [
                    'assets/game/omok/sounds/242737__supafrycook2__tap.mp3',
                    'assets/game/omok/sounds/242737__supafrycook2__tap.wav'
                ]
            }),
            'other_piece_placed': new Howl({
                src: [
                    'assets/game/omok/sounds/242737__supafrycook2__tap.mp3',
                    'assets/game/omok/sounds/242737__supafrycook2__tap.wav'
                ]
            }),
            'player_joined': new Howl({
                src: [
                    'assets/game/omok/sounds/270304__littlerobotsoundfactory__collect-point-00.mp3',
                    'assets/game/omok/sounds/270304__littlerobotsoundfactory__collect-point-00.wav'
                ]
            }),
            'player_ready': new Howl({
                src: [
                    'assets/game/omok/sounds/270318__littlerobotsoundfactory__jump-02.mp3',
                    'assets/game/omok/sounds/270318__littlerobotsoundfactory__jump-02.wav'
                ]
            }),
            'player_unready': new Howl({
                src: [
                    'assets/game/omok/sounds/270320__littlerobotsoundfactory__jump-00.mp3',
                    'assets/game/omok/sounds/270320__littlerobotsoundfactory__jump-00.wav'
                ]
            }),
            'my_win': new Howl({
                src: [
                    'assets/game/omok/sounds/270333__littlerobotsoundfactory__jingle-win-00.mp3',
                    'assets/game/omok/sounds/270333__littlerobotsoundfactory__jingle-win-00.wav'
                ],
                volume: 0.4
            }),
            'other_win': new Howl({
                src: [
                    'assets/game/omok/sounds/270329__littlerobotsoundfactory__jingle-lose-00.mp3',
                    'assets/game/omok/sounds/270329__littlerobotsoundfactory__jingle-lose-00.wav'
                ],
                volume: 0.4
            }),
            'game_tie': new Howl({
                src: [
                    'assets/game/omok/sounds/181353__unfa__fail-jingle-layer-2.mp3',
                    'assets/game/omok/sounds/181353__unfa__fail-jingle-layer-2.wav'
                ]
            }),
            'game_start': new Howl({
                src: [
                    'assets/game/omok/sounds/107786__leviclaassen__beepbeep.mp3',
                    'assets/game/omok/sounds/107786__leviclaassen__beepbeep.wav'
                ]
            }),
            'your_turn': new Howl({
                src: [
                    'assets/game/omok/sounds/274179__littlerobotsoundfactory__jingle-win-synth-01.mp3',
                    'assets/game/omok/sounds/274179__littlerobotsoundfactory__jingle-win-synth-01.wav'
                ]
            })
        };
        return assets;
    })();
    return gameObject;
};
//# sourceMappingURL=omok.js.map
var makeGameObject = function (connection, app, viewModel) {
    var omokGame = {};

    omokGame.html = {
        gamePanel: `
    <div class="game__board">
        <div class="game__row" v-for="row in $root.gameState.game.boardCells">
            <div v-for="cell in row"
                 @click.prevent="$root.game.events.cellClicked(cell)"
                 :class="{ 'game__cell': true, 'game__cell--owned': cell.ownedBy }">

                <div v-if="cell.ownedBy"
                     v-for="player in [$root.helpers.getPlayer(cell.ownedBy)]"
                     :class="[
                            'omok__piece',
                            { 'omok__piece--last-placed': cell === $root.gameState.game.lastPlacedCell }
                        ]"
                     :style="{ 'font-size': ((100 / $root.gameState.game.configurationAtStart.gridHeight) * 0.75) + 'vh' }"
                     :title="'Owned by ' + player.name">

                    <i v-if="player.metadata.avatar.type=='css-class'"
                       :class="player.metadata.avatar.value"
                       :style="{ 'color': player.color }"></i>

                    <i v-else class="fas fa-question"
                       :style="{ 'color': player.color }"></i>

                </div>
            </div>
        </div>
    </div>
`
    };

    omokGame.hooks = {
        handleData: function (fromPlayerId, data, fromPlayer) {
            switch (_.trim(data.type).toLowerCase()) {
                case 'end-turn':
                    if (_.isNumber(data.cellX) && _.isNumber(data.cellY)) {
                        viewModel.gameState.game.boardCells[data.cellY][data.cellX].ownedBy = fromPlayerId
                        viewModel.gameState.game.lastPlacedCell = viewModel.gameState.game.boardCells[data.cellY][data.cellX];

                        if (fromPlayerId === viewModel.player.id) {
                            if (data.isWin) {
                                omokGame.assets.sounds['my_win'].play();
                            }
                            else {
                                omokGame.assets.sounds['my_piece_placed'].play();
                            }
                        }
                        else {
                            if (data.isWin) {
                                omokGame.assets.sounds['other_win'].play();
                            }
                            else {
                                omokGame.assets.sounds['other_piece_placed'].play();
                            }
                        }
                    }
                    break;
            }
        },

        makeGame: function (game) {
            game = _.extend({
                configuration: {
                    gridWidth: 19,
                    gridHeight: 19,
                    // In case you want to get more in a row
                    numberInARowRequired: 5,
                    // Double-threes
                    allowEasyWins: false,
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

            return game;
        },

        setup: function () {
            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configuration,
                x, y,
                row, cell;

            // Setup game

            // Store config just because
            game.configurationAtStart = config;
            game.boardCells = [];

            for (y = 0; y < config.gridHeight; y++) {
                row = [];
                game.boardCells.push(row);

                for (x = 0; x < config.gridWidth; x++) {
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

            return true;
        }
    };

    omokGame.events = {
        cellClicked: function (cell) {
            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                countInDirection = [],
                isWin = false;

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
            if (!config.allowEasyWins) {
                if (omokGame.helpers.isEasyWin(cell, viewModel.player.id)) {
                    viewModel.helpers.addMessage(null, 'No easy wins allowed (double ' + (game.configurationAtStart.numberInARowRequired - 2) + 's)');
                    return;
                }
            }

            // Temporarily own it for calculations
            cell.ownedBy = viewModel.player.id;

            // Count how many we have in each direction if this is placed
            // up left
            countInDirection.push(omokGame.helpers.getCellsOwnedInARow(cell.x, cell.y, -1, -1));
            // up
            countInDirection.push(omokGame.helpers.getCellsOwnedInARow(cell.x, cell.y, 0, -1));
            // up right
            countInDirection.push(omokGame.helpers.getCellsOwnedInARow(cell.x, cell.y, 1, -1));
            // left
            countInDirection.push(omokGame.helpers.getCellsOwnedInARow(cell.x, cell.y, -1, 0));

            // Clear owner just in case validation fails
            cell.ownedBy = null;

            // Check if we won
            // TODO : Potentially need to discount blocked if we're implementing certain Renju rule sets
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
        }
    };

    omokGame.helpers = {
        isEasyWin: function (cell, playerId) {
            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                easyWinCount = 0;

            cell.ownedBy = playerId;

            function checkDir(xDir, yDir) {
                var count;

                count = omokGame.helpers.getCellsOwnedInARow(cell.x, cell.y, xDir, yDir);

                if (!count.isBlocked && count.count === config.numberInARowRequired - 2) {
                    return true;
                }

                return false;
            }
            function checkSkipDir(xDir, yDir) {
                var count;

                count = omokGame.helpers.getCellsOwnedInARow(cell.x, cell.y, xDir, yDir);

                if (!count.isBlocked && count.count === config.numberInARowRequired - 3) {
                    count = omokGame.helpers.getCellsOwnedInARow(cell.x + (xDir * -2), cell.y + (yDir * -2), xDir, yDir, playerId);
                    if (!count.isBlocked && count.count === config.numberInARowRequired - 4) {
                        return true;
                    }
                    count = omokGame.helpers.getCellsOwnedInARow(cell.x + (xDir * 2), cell.y + (yDir * 2), xDir, yDir, playerId);
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

            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                cell = null, firstOwnedCell = null,
                ret;

            ret = {
                count: 0,
                isBlocked: false
            };

            if (xDelta === 0 && yDelta === 0) return ret;

            function travel(x, y, xDelta, yDelta) {
                var cell = null;

                x += xDelta;
                y += yDelta;

                if (x >= 0 && x < config.gridWidth &&
                    y >= 0 && y < config.gridHeight) {

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
        }
    };

    // initialise
    omokGame.assets = (function () {
        var assets = {};

        assets.sounds = {
            'my_piece_placed': new Howl({
                src: ['assets/game/omok/sounds/222058__waveplay__custom-hat-1.wav']
            }),
            'other_piece_placed': new Howl({
                src: ['assets/game/omok/sounds/222058__waveplay__custom-hat-1.wav']
            }),
            'my_win': new Howl({
                src: ['assets/game/omok/sounds/270333__littlerobotsoundfactory__jingle-win-00.wav']
            }),
            'other_win': new Howl({
                src: ['assets/game/omok/sounds/270329__littlerobotsoundfactory__jingle-lose-00.wav']
            })
        };

        return assets;
    })();

    return omokGame;
};
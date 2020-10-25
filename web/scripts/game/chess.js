
var makeGameObject = function (connection, app, viewModel) {
    var gameObject = {};

    // Components get injected into the right place, so this is where we write custom HTML
    gameObject.vueComponents = {
        'game-panel': {
            data: function () { return viewModel; },
            template: `
<div class="game__board" v-for="availableMoves in [$root.game.helpers.getPossibleMoves($root.selectedCell)]">
    <div class="game__row" v-for="row in $root.gameState.game.boardCells">
        <div v-for="cell in row"
             @click.prevent="$root.game.events.cellClicked(cell)"
             :class="{ 'game__cell': true, 'game__cell--owned': cell.ownedBy, 'game__cell--placable': availableMoves.cells.indexOf(cell) > -1 }">

            <div v-if="cell.ownedBy && cell.piece"
                 v-for="player in [$root.helpers.getPlayer(cell.ownedBy)]"
                 :class="{ 'chess__piece': true, 'chess__piece--last-placed': cell === $root.gameState.game.lastPlacedCell }"
                 :style="{ 'font-size': ((100 / $root.gameState.game.configurationAtStart.gridHeight) * 0.75) + 'vh' }"
                 :title="'Owned by ' + player.name">

                <!-- chess piece -->
                <i :class="['fas', 'fa-chess-' + cell.piece]"
                   :style="{ 'color': player.color }"></i>
            </div>
        </div>
    </div>
</div>
`
        },
        'config-panel': {
            data: function () { return viewModel; },
            template: `
<fieldset :disabled="$root.isConnecting || $root.isConnected">
    <div class="mb-3" v-show="!$root.isConnected">
        <label>Use a preset</label>
        <div>
            <button type="button" class="btn btn-outline-primary mr-1" @click="$root.game.events.setPreset(\'chess\')">Chess</button>
        </div>
    </div>
    <div>
        <label>Turn Time (seconds)</label>

        <div class="form-row">
            <div class="col-8">
                <input type="range" class="form-control form-control-sm form-control-range" :min="$root.gameState.game.configuration.turnTime > 10 ? 1 : 0.25" max="180" :step="1" v-model="$root.gameState.game.configuration.turnTime" />
            </div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="0.25" max="180" :step="0.25" v-model="$root.gameState.game.configuration.turnTime" />
            </div>
        </div>

        <small class="form-text text-danger" v-show="$root.gameState.game.configuration.turnTime < 3">
            Turns this short may get affected by latency and people may miss their turns without realising
        </small>
    </div>
</fieldset>
`
        }
    };

    gameObject.hooks = {
        handleData: function (fromPlayerId, data, fromPlayer) {
            var fromCell, toCell;

            switch (_.trim(data.type).toLowerCase()) {
                case 'end-turn':
                    viewModel.selectedCell = null;

                    if (_.isNumber(data.fromCellX) && _.isNumber(data.fromCellY) &&
                        _.isNumber(data.toCellX) && _.isNumber(data.toCellY)) {

                        fromCell = viewModel.gameState.game.boardCells[data.fromCellY][data.fromCellX];
                        toCell = viewModel.gameState.game.boardCells[data.toCellY][data.toCellX];

                        if (fromCell && toCell) {
                            // The barest of anti-hack checks
                            // We just move from in-memory to in-memory so if you've done something illegal then it's gonna be super obvious
                            // TODO : Probably check if this IS a legal move

                            toCell.ownedBy = fromCell.ownedBy;
                            toCell.piece = fromCell.piece;
                            fromCell.ownedBy = null;
                            fromCell.piece = null;

                            viewModel.gameState.game.lastPlacedCell = toCell;

                        }

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
            game = _.extend({
                configuration: {
                    gridWidth: 8,
                    gridHeight: 8,
                    // In seconds
                    turnTime: 30,
                    // true = do, false = dont
                    placeRandomStarts: null
                },
                // Array of rows, which is an array of cells
                boardCells: [],
                // So we know what we last placed
                lastPlacedCell: null
            }, game);

            if (localStorage.getItem(app.gameName + '-game-configuration')) {
                try {
                    _.extend(game.configuration, JSON.parse(localStorage.getItem(app.gameName + '-game-configuration')));
                }
                catch (ex) { }
            }

            return game;
        },

        setup: function () {
            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configuration,
                x, y,
                row, cell,
                setPieces;

            // Validation checks
            config.turnTime = Number(config.turnTime);

            if (!_.isFinite(config.turnTime) || config.turnTime < 0.25) {
                alert('Invalid turn time');
                return false;
            }

            // Store config just because
            game.configurationAtStart = config;
            game.boardCells = [];

            for (y = 0; y < config.gridWidth; y++) {
                row = [];
                game.boardCells.push(row);

                for (x = 0; x < config.gridHeight; x++) {
                    cell = {
                        x: x,
                        y: y,
                        ownedBy: null,
                        piece: null
                    };

                    row.push(cell);
                }
            }

            if (config.placeRandomStarts) {
                setPieces = function () {

                };
            }
            else {
                setPieces = function () {
                    var i, x,
                        player;

                    for (i = 0; i < Math.min(_.size(gameState.turnOrder),2); i++) {
                        player = gameState.turnOrder[i];
                        row = game.boardCells[i * (_.size(game.boardCells) - 1)]; // first or last row

                        for (x = 0; x < _.size(row); x++) {
                            cell = row[x];
                            cell.ownedBy = player;

                            if (x === 0 || x === _.size(row) - 1) {
                                cell.piece = 'rook';
                            }
                            else if (x === 1 || x === _.size(row) - 2) {
                                cell.piece = 'bishop';
                            }
                            else if (x === 2 || x === _.size(row) - 3) {
                                cell.piece = 'knight';
                            }
                            else if (x === 3) {
                                cell.piece = 'king';
                            }
                            else if (x === _.size(row) - 4) {
                                cell.piece = 'queen';
                            }
                            else {
                                cell.piece = 'pawn';
                            }
                        }

                        row = game.boardCells[(i * (_.size(game.boardCells) - 3)) + 1]; // n+1 or n-1 row

                        for (x = 0; x < _.size(row); x++) {
                            cell = row[x];
                            cell.ownedBy = player;
                            cell.piece = 'pawn';
                        }
                    }
                }
            }

            setPieces();

            gameState.turnTime = config.turnTime;

            // Save configuration for next time
            localStorage.setItem(app.gameName + '-game-configuration', JSON.stringify(config));

            return true;
        }
    };

    gameObject.events = {
        cellClicked: function (cell) {
            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                availableMoves, fromCell,
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

            fromCell = viewModel.selectedCell;

            // If it's already clicked
            if (cell.ownedBy === viewModel.player.id) {
                // select it
                viewModel.selectedCell = cell;
                return;
            }
            else if (viewModel.selectedCell && fromCell.ownedBy === viewModel.player.id) {
                availableMoves = gameObject.helpers.getPossibleMoves(fromCell);

                if (availableMoves.cells.indexOf(cell) === -1) {
                    viewModel.helpers.addMessage(null, 'Invalid move');
                    return;
                }
            }

            if (cell.piece === 'king' && cell.ownedBy !== viewModel.player.id) {
                isWin = true;
            }

            // If all goes to plan, let's say we own it
            connection.send({
                type: 'end-turn',
                fromCellX: fromCell.x,
                fromCellY: fromCell.y,
                toCellX: cell.x,
                toCellY: cell.y,
                isWin: isWin,
                nextPlayerId: viewModel.helpers.getNextPlayer()
            }, true);
        },

        setPreset: function (presetName) {
            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configuration;

            config.turnTime = 30;

            switch (_.trim(presetName).toLowerCase()) {
                case 'chess':
                default:
                    // Standard rules, set above
                    break;
            }
        }
    };

    gameObject.helpers = {
        getPossibleMoves: function (cell, player, piece) {
            var gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                moves, x, y;

            moves = {
                cells: [],
                canPromotePawn: false
            };

            if (cell) {
                if (!piece) {
                    piece = cell.piece;
                }
                if (!player) {
                    player = cell.ownedBy;
                }
            }

            if (!cell || !piece || !player) {
                return moves;
            }

            function isCell(x, y) {
                return x >= 0 && x < config.gridWidth &&
                    y >= 0 && y < config.gridHeight;
            }
            function addCell(x, y) {
                var cell;

                if (isCell(x, y)) {
                    cell = game.boardCells[y][x];

                    if (cell.ownedBy !== viewModel.player.id) {
                        moves.cells.push(cell);
                    }
                }
            }
            function addAllInLine(startX, startY, travelX, travelY) {
                var cell;

                if (travelX === 0 && travelY === 0) {
                    return;
                }

                cell = game.boardCells[startY][startX];

                while (!cell.ownedBy || (cell.x === startX && cell.y === startY)) {
                    if (!isCell(cell.x + travelX, cell.y + travelY)) {
                        break;
                    }

                    cell = game.boardCells[cell.y + travelY][cell.x + travelX];

                    if (cell.ownedBy !== player) {
                        moves.cells.push(cell);
                    }
                }
            }

            switch (piece) {
                case 'pawn':
                    if (gameState.turnOrder.indexOf(player) === 0) {
                        // go down
                        if (isCell(cell.x - 1, cell.y + 1) && game.boardCells[cell.y + 1][cell.x - 1].ownedBy && game.boardCells[cell.y + 1][cell.x - 1].ownedBy !== player) {
                            addCell(cell.x - 1, cell.y + 1);
                        }
                        if (isCell(cell.x + 1, cell.y + 1) && game.boardCells[cell.y + 1][cell.x + 1].ownedBy && game.boardCells[cell.y + 1][cell.x + 1].ownedBy !== player) {
                            addCell(cell.x + 1, cell.y + 1);
                        }
                        if (isCell(cell.x, cell.y + 1) && !game.boardCells[cell.y + 1][cell.x].ownedBy) {
                            addCell(cell.x, cell.y + 1);
                        }
                        if (cell.y === 1 && isCell(cell.x, cell.y + 2) && !game.boardCells[cell.y + 2][cell.x].ownedBy) {
                            addCell(cell.x, cell.y + 2);
                        }
                        if (cell.y === config.gridHeight - 1) {
                            moves.canPromotePawn = true;
                        }
                    }
                    else {
                        // go up
                        if (isCell(cell.x - 1, cell.y - 1) && game.boardCells[cell.y - 1][cell.x - 1].ownedBy && game.boardCells[cell.y - 1][cell.x - 1].ownedBy !== player) {
                            addCell(cell.x - 1, cell.y - 1);
                        }
                        if (isCell(cell.x + 1, cell.y - 1) && game.boardCells[cell.y - 1][cell.x + 1].ownedBy && game.boardCells[cell.y - 1][cell.x + 1].ownedBy !== player) {
                            addCell(cell.x + 1, cell.y - 1);
                        }
                        if (isCell(cell.x, cell.y - 1) && !game.boardCells[cell.y - 1][cell.x].ownedBy) {
                            addCell(cell.x, cell.y - 1);
                        }
                        if (cell.y === config.gridHeight - 2 && isCell(cell.x, cell.y - 2) && !game.boardCells[cell.y - 2][cell.x].ownedBy) {
                            addCell(cell.x, cell.y - 2);
                        }
                        if (cell.y === 0) {
                            moves.canPromotePawn = true;
                        }
                    }
                    break;
                case 'king':
                    for (x = cell.x - 1; x <= cell.x + 1; x++) {
                        for (y = cell.y - 1; y <= cell.y + 1; y++) {
                            if (x !== cell.x || y !== cell.y) {
                                addCell(x, y);
                            }
                        }
                    }
                    break;
                case 'knight':
                    addCell(cell.x - 2, cell.y - 1);
                    addCell(cell.x - 1, cell.y - 2);
                    addCell(cell.x + 2, cell.y - 1);
                    addCell(cell.x + 1, cell.y - 2);
                    addCell(cell.x - 2, cell.y + 1);
                    addCell(cell.x - 1, cell.y + 2);
                    addCell(cell.x + 2, cell.y + 1);
                    addCell(cell.x + 1, cell.y + 2);
                    break;
                case 'rook':
                    addAllInLine(cell.x, cell.y, -1, 0);
                    addAllInLine(cell.x, cell.y, 1, 0);
                    addAllInLine(cell.x, cell.y, 0, -1);
                    addAllInLine(cell.x, cell.y, 0, 1);
                    break;
                case 'bishop':
                    addAllInLine(cell.x, cell.y, -1, -1);
                    addAllInLine(cell.x, cell.y, -1, 1);
                    addAllInLine(cell.x, cell.y, 1, -1);
                    addAllInLine(cell.x, cell.y, 1, 1);
                    break;
                case 'queen':
                    addAllInLine(cell.x, cell.y, -1, 0);
                    addAllInLine(cell.x, cell.y, 1, 0);
                    addAllInLine(cell.x, cell.y, 0, -1);
                    addAllInLine(cell.x, cell.y, 0, 1);
                    addAllInLine(cell.x, cell.y, -1, -1);
                    addAllInLine(cell.x, cell.y, -1, 1);
                    addAllInLine(cell.x, cell.y, 1, -1);
                    addAllInLine(cell.x, cell.y, 1, 1);
                    break;
            }

            return moves;
        }
    };

    // initialise
    gameObject.assets = (function () {
        var assets = {};

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
            })
        };

        return assets;
    })();

    viewModel.selectedCell = null;

    return gameObject;
};
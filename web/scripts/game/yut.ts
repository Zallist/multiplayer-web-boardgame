var app = app || {};

declare var Howl: any;

app.makeGameObject = function (connection, app, viewModel) {
    const gameObject: any = {},
        gameViewModel: any = Vue.reactive({});

    gameObject.viewModel = gameViewModel;

    // Components get injected into the right place, so this is where we write custom HTML
    gameObject.vueComponents = {
        'game-panel': {
            data: () => {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: `
<div class="yut__wrap">
    <div class="game__board">
        <div class="game__row" v-for="row in $data.$vm.gameState.game.boardCells">
            <div v-for="cell in row"
                 @click.prevent="$data.$game.events.cellClicked(cell)"
                 :class="{ 
                    'game__cell': true, 
                    'game__cell--available': cell.next.length > 0,
                    'game__cell--selectable': $data.$game.piecesOnCell(cell.x, cell.y, $data.$vm.player.id).length > 0,
                    'game__cell--selected': $data.$game.selectedCell === cell,
                    'game__cell--placable': $data.$game.canPlaceOnCell(cell.x, cell.y),
                    'game__cell--last-placed': $data.$vm.gameState.game.lastPlacedCell === cell
                 }">

                <div v-for="pieceGroups in [$data.$game.piecesOnCellGrouped(cell.x, cell.y)]"
                     class="game__cell__content">

                    <div class="cell__piece" v-for="pieceGroup in pieceGroups">
                        <player-avatar :player="pieceGroup.player"></player-avatar>
                        <div class="cell__piece-count" v-if="pieceGroup.pieces.length > 1">{{ pieceGroup.pieces.length }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="yut__sidebar">
        <div style="position: absolute; left: 0; right: 0; bottom: 1em;">
            <button type="button" class="btn btn-primary btn-block" style="font-size: 150%;"
                    :disabled="$data.$vm.gameState.currentTurn !== $data.$vm.player.id || !$data.$game.availablePlacements.finish"
                    @click.prevent="$data.$game.events.finishClicked()">
                Finish
            </button>
        </div>
    </div>
    <div class="yut__footer">
        <div class="d-flex flex-row">
            <div class="flex-fill"
                 v-for="group in $data.$game.playerPiecesGrouped">
                <div><label :style="{ color: group.player.metadata.color }">{{ group.player.name }}</label></div>
                <div class="row">
                    <div v-for="piece in group.pieces"
                         class="col">
                        <div class="piece ratio-square"
                             :class="{ 
                                'piece--placable': $data.$vm.gameState.currentTurn === $data.$vm.player.id && $data.$vm.gameState.game.currentRoll !== null && piece.x === null && piece.y === null && !piece.finished && piece.playerId === $data.$vm.player.id,
                                'piece--selected': $data.$game.selectedPiece === piece || ($data.$game.selectedCell !== null && $data.$game.selectedCell.x === piece.x && $data.$game.selectedCell.y === piece.y),
                                'piece--finished': piece.finished
                             }"
                             @click="$data.$game.events.pieceClicked(piece)">
                            <player-avatar :player="group.player"></player-avatar>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="yut__corner">
        <button type="button" class="roll__button btn btn-primary btn-block" style="font-size: 150%;"
                :disabled="$data.$vm.gameState.currentTurn !== $data.$vm.player.id || $data.$vm.gameState.game.currentRoll !== null"
                @click.prevent="$data.$game.events.rollClicked()">
            Roll
        </button>
    </div>
</div>
`
        },
        'config-panel': {
            data: () => {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: `
<fieldset :disabled="$data.$vm.isConnecting || $data.$vm.isConnected">
    <div class="mb-3" v-show="!$data.$vm.isConnected">
        <label>Use a preset</label>
        <div>
            <button type="button" class="btn btn-outline-primary mr-1" @click="$data.$game.events.setPreset(\'yut\')">Yut Nori</button>
        </div>
    </div>
    <div>
        <label>Turn Time (seconds)</label>

        <div class="form-row">
            <div class="col-8">
                <input type="range" class="form-control form-control-sm form-control-range" min="5" max="180" :step="1" v-model="$data.$vm.gameState.game.configuration.turnTime" />
            </div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="5" max="180" :step="5" v-model="$data.$vm.gameState.game.configuration.turnTime" />
            </div>
        </div>
    </div>
    <div class="mt-3">
        <label>Grid Size</label>

        <div class="form-row">
            <div class="col-8">
                <input type="range" class="form-control form-control-sm form-control-range" min="3" max="19" step="2" v-model="$data.$vm.gameState.game.configuration.gridSize" />
            </div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="3" max="19" step="2" v-model="$data.$vm.gameState.game.configuration.gridSize" />
            </div>
        </div>
    </div>
    <div class="mt-3">
        <div class="form-check">
            <label class="form-check-label">
                <input class="form-check-input" type="checkbox" v-model="$data.$vm.gameState.game.configuration.allowMultipleTurns">
                Multiple Turns In A Row
            </label>
        </div>

        <small class="form-text text-secondary config__help-text">
            If you roll the maximum roll, you get a second roll
        </small>
    </div>
    <div class="mt-3">
        <label>Pieces</label>

        <div class="form-row">
            <div class="col-8">
                <input type="range" class="form-control form-control-sm form-control-range" min="1" max="24" step="1" v-model="$data.$vm.gameState.game.configuration.numberOfPieces" />
            </div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="1" max="24" step="1" v-model="$data.$vm.gameState.game.configuration.numberOfPieces" />
            </div>
        </div>
    </div>
    <div class="mt-3">
        <label>Min. Roll</label>

        <div class="form-row">
            <div class="col-8">
                <input type="range" class="form-control form-control-sm form-control-range" min="0" max="19" step="1" v-model="$data.$vm.gameState.game.configuration.minRoll" />
            </div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="0" max="19" step="1" v-model="$data.$vm.gameState.game.configuration.minRoll" />
            </div>
        </div>
    </div>
    <div class="mt-3">
        <label>Max. Roll</label>

        <div class="form-row">
            <div class="col-8">
                <input type="range" class="form-control form-control-sm form-control-range" min="1" max="19" step="1" v-model="$data.$vm.gameState.game.configuration.maxRoll" />
            </div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="1" max="19" step="1" v-model="$data.$vm.gameState.game.configuration.maxRoll" />
            </div>
        </div>
    </div>
</fieldset>
`
        }
    };

    gameObject.hooks = {
        handleData: function (fromPlayerId, data, fromPlayer) {
            let pieces;

            switch (_.trim(data.type).toLowerCase()) {
                case 'roll':
                    viewModel.gameState.game.currentRoll = data.rolled;
                    viewModel.helpers.addMessage(null, fromPlayer.name + ' rolled a ' + viewModel.gameState.game.currentRoll, fromPlayer.metadata.color);
                    break;
                case 'end-turn':
                    gameViewModel.selectedCell = null;
                    gameViewModel.selectedPiece = null;
                    viewModel.gameState.game.currentRoll = null;
                    viewModel.gameState.game.lastPlacedCell = null;

                    pieces = [];

                    if (data.pieceId) {
                        pieces.push.apply(pieces, _.filter(viewModel.gameState.game.playerPieces, { pieceId: data.pieceId, playerId: fromPlayerId }));
                    }
                    else if (_.isNumber(data.cellFromX) && _.isNumber(data.cellFromY)) {
                        pieces.push.apply(pieces, gameViewModel.piecesOnCell(data.cellFromX, data.cellFromY, fromPlayerId));
                    }

                    if (data.finish) {
                        _.forEach(pieces, (piece) => {
                            piece.x = null;
                            piece.y = null;
                            piece.finished = true;
                        });
                    }
                    else if (_.isNumber(data.cellToX) && _.isNumber(data.cellToY)) {
                        _.forEach(pieces, (piece) => {
                            piece.x = data.cellToX;
                            piece.y = data.cellToY;
                        });

                        // And get rid of the ones to get rid of
                        pieces = _.reject(gameViewModel.piecesOnCell(data.cellToX, data.cellToY), { playerId: fromPlayerId });

                        if (data.removeSpecificPlayerId) {
                            pieces = _.filter(pieces, { playerId: data.removeSpecificPlayerId });
                        }

                        _.forEach(pieces, (piece) => {
                            piece.x = null;
                            piece.y = null;
                        });

                        viewModel.gameState.game.lastPlacedCell = viewModel.gameState.game.boardCells[data.cellToY][data.cellToX];
                    }

                    if (!_.some(viewModel.gameState.game.playerPieces, { finished: false, playerId: fromPlayerId })) {
                        // Calculate win after doing stuff
                        // Means that the user isn't telling us they won, but we're finding out they won
                        data.isWin = true;
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
                    // In seconds
                    turnTime: 30,
                    // Grid size
                    gridSize: 5,
                    // Number of pieces
                    numberOfPieces: 4,

                    minRoll: 1,

                    maxRoll: 5,

                    // If you roll a 5, get a second turn
                    allowMultipleTurns: true
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
            let gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configuration,
                x, y, i, j,
                player,
                row, cell;

            // Validation checks
            config.turnTime = Number(config.turnTime);
            config.gridSize = Number(config.gridSize);
            config.numberOfPieces = Number(config.numberOfPieces);
            config.minRoll = Number(config.minRoll);
            config.maxRoll = Number(config.maxRoll);

            if (!_.isFinite(config.turnTime) || config.turnTime < 5) {
                alert('Invalid turn time');
                return false;
            }

            if (!_.isFinite(config.gridSize) || config.gridSize < 3) {
                alert('Invalid grid size');
                return false;
            }
            else if (config.gridSize % 2 === 0) {
                alert('Grid size must be odd');
                return false;
            }

            if (!_.isFinite(config.numberOfPieces) || config.numberOfPieces < 1) {
                alert('Invalid number of pieces');
                return false;
            }

            if (!_.isFinite(config.minRoll) || config.minRoll < 0 || config.minRoll > config.maxRoll) {
                alert('Invalid minimum roll');
                return false;
            }

            if (!_.isFinite(config.maxRoll) || config.maxRoll < 1) {
                alert('Invalid maximum roll');
                return false;
            }


            // Store config just because
            game.configurationAtStart = config;
            game.boardCells = [];
            game.playerPieces = [];
            game.currentRoll = null;

            for (y = 0; y < config.gridSize; y++) {
                row = [];
                game.boardCells.push(row);

                for (x = 0; x < config.gridSize; x++) {
                    cell = {
                        x: x,
                        y: y,
                        next: [],
                        start: false,
                        finish: false
                    };

                    /* Next place logic
                     * y -> n = nowhere, u = up, d = down
                     * x -> n = nowhere, r = right, l = left
                     * .. = multiple
                     * -- = neither
                     * 
                     * ..,nl,nl,nl,..
                     * dn,ul,--,ur,un
                     * dn,--,..,--,un
                     * dn,dl,--,dr,un
                     * nr,nr,nr,nr,un
                     */

                    if (y >= config.gridSize - 1) {
                        // bottom
                        if (x >= config.gridSize - 1) {
                            // bottom right
                            cell.start = true;
                            cell.finish = true;
                            cell.next.push({ x: 0, y: -1 });
                        }
                        else {
                            cell.next.push({ x: 1, y: 0 });
                        }
                    }
                    else if (x === 0) {
                        // left
                        cell.next.push({ x: 0, y: 1 });
                    }
                    else if (y === 0) {
                        // top
                        cell.next.push({ x: -1, y: 0 });
                    }
                    else if (x >= config.gridSize - 1) {
                        // right
                        cell.next.push({ x: 0, y: -1 });
                    }

                    if (y < config.gridSize - 1) {
                        if (x === y) {
                            // diagonal, topleft to bottomright
                            cell.next.push({ x: 1, y: 1 });
                        }
                        if (x === (config.gridSize - 1) - y) {
                            // diagonal, topright to bottomleft
                            cell.next.push({ x: -1, y: 1 });
                        }
                    }

                    row.push(cell);
                }
            }

            for (i = 0; i < config.numberOfPieces; i++) {
                for (j = 0; j < gameState.turnOrder.length; j++) {
                    player = gameState.turnOrder[j];

                    game.playerPieces.push({
                        pieceId: i + '__' + player,
                        playerId: player,
                        x: null,
                        y: null,
                        finished: false
                    });
                }
            }

            gameState.turnTime = config.turnTime;

            // Save configuration for next time
            localStorage.setItem(app.gameName + '-game-configuration', JSON.stringify(config));

            return true;
        }
    };

    gameViewModel.events = {
        finishClicked: function () {
            let gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                nextPlayerId;

            // If the game's started
            if (!gameState.started) {
                return;
            }

            // If it's my turn
            if (gameState.currentTurn !== viewModel.player.id) {
                viewModel.helpers.addMessage(null, 'Not your turn');
                return;
            }

            // If you need to roll first
            if (game.currentRoll === null) {
                viewModel.helpers.addMessage(null, 'Roll first');
                return;
            }

            if (gameViewModel.selectedCell || gameViewModel.selectedPiece) {
                if (gameViewModel.availablePlacements.finish) {
                    connection.send({
                        pieceId: gameViewModel.selectedPiece ? gameViewModel.selectedPiece.pieceId : null,
                        cellFromX: gameViewModel.selectedCell ? gameViewModel.selectedCell.x : null,
                        cellFromY: gameViewModel.selectedCell ? gameViewModel.selectedCell.y : null,
                        finish: true,
                        type: 'end-turn',
                        isWin: false,
                        nextPlayerId: config.allowMultipleTurns && game.currentRoll >= config.maxRoll ? viewModel.player.id : viewModel.helpers.getNextPlayer()
                    }, true);
                }
            }
        },

        cellClicked: function (cell) {
            let gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                nextPlayerId;

            // If the game's started
            if (!gameState.started) {
                return;
            }

            // If it's my turn
            if (gameState.currentTurn !== viewModel.player.id) {
                viewModel.helpers.addMessage(null, 'Not your turn');
                return;
            }

            // If you need to roll first
            if (game.currentRoll === null) {
                viewModel.helpers.addMessage(null, 'Roll first');
                return;
            }

            if (gameViewModel.selectedCell === cell) {
                gameViewModel.selectedCell = null;
            }
            else if (gameViewModel.selectedCell || gameViewModel.selectedPiece) {
                if (gameViewModel.canPlaceOnCell(cell.x, cell.y)) {
                    connection.send({
                        pieceId: gameViewModel.selectedPiece ? gameViewModel.selectedPiece.pieceId : null,
                        cellFromX: gameViewModel.selectedCell ? gameViewModel.selectedCell.x : null,
                        cellFromY: gameViewModel.selectedCell ? gameViewModel.selectedCell.y : null,
                        cellToX: cell.x,
                        cellToY: cell.y,
                        type: 'end-turn',
                        isWin: false,
                        nextPlayerId: config.allowMultipleTurns && game.currentRoll >= config.maxRoll ? viewModel.player.id : viewModel.helpers.getNextPlayer()
                    }, true);
                }
            }
            else if (_.some(gameViewModel.piecesOnCell(cell.x, cell.y, viewModel.player.id))) {
                gameViewModel.selectedCell = cell;
            }
        },

        pieceClicked: function (piece) {
            let gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart;

            // If the game's started
            if (!gameState.started) {
                return;
            }

            if (piece.finished || piece.x !== null || piece.y !== null ||
                piece.playerId !== viewModel.player.id) {
                return;
            }

            // If it's my turn
            if (gameState.currentTurn !== viewModel.player.id) {
                viewModel.helpers.addMessage(null, 'Not your turn');
                return;
            }

            // If you need to roll first
            if (game.currentRoll === null) {
                viewModel.helpers.addMessage(null, 'Roll first');
                return;
            }

            gameViewModel.selectedCell = null;
            gameViewModel.selectedPiece = piece;
        },

        rollClicked: function () {
            let gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configurationAtStart,
                rolled;

            // If the game's started
            if (!gameState.started) {
                return;
            }

            // If it's my turn
            if (gameState.currentTurn !== viewModel.player.id) {
                viewModel.helpers.addMessage(null, 'Not your turn');
                return;
            }

            if (game.currentRoll !== null) {
                viewModel.helpers.addMessage(null, 'Already rolled');
                return;
            }

            rolled = chance.integer({ min: config.minRoll, max: config.maxRoll });

            connection.send({
                type: 'roll',
                rolled: rolled
            }, true);

            if (rolled === 0) {
                connection.send({
                    type: 'end-turn',
                    isWin: false,
                    nextPlayerId: viewModel.helpers.getNextPlayer()
                }, true);
            }
        },

        setPreset: function (presetName) {
            let gameState = viewModel.gameState,
                game = gameState.game,
                config = game.configuration;

            config.turnTime = 30;
            config.gridSize = 5;
            config.numberOfPieces = 4;
            config.minRoll = 1;
            config.maxRoll = 5;
            config.allowMultipleTurns = true;

            switch (_.trim(presetName).toLowerCase()) {
                case 'yut':
                default:
                    // Standard yut rules, set above
                    break;
            }
        }
    };

    // initialise
    gameObject.assets = (function () {
        let assets;

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
            })
        };

        return assets;
    })();

    gameViewModel.selectedCell = null;
    gameViewModel.selectedPiece = null;

    gameViewModel.getCellsAfterTravelling = function (cell, distance, isFirst) {
        let gameState = viewModel.gameState,
            game = gameState.game,
            result,
            travel;

        result = {
            cells: [],
            finish: false
        };

        travel = function (cell, distance) {
            let i, nextCellDelta, nextCell;

            if (distance === 0) {
                result.cells.push(cell);
            }
            else if (!isFirst && cell.finish) {
                result.finish = true;
            }
            else {
                for (i = 0; i < cell.next.length; i++) {
                    nextCellDelta = cell.next[i];
                    nextCell = game.boardCells[cell.y + nextCellDelta.y][cell.x + nextCellDelta.x];
                    travel(nextCell, distance - 1, false);
                }
            }
        };

        travel(cell, distance);

        return result;
    };

    gameViewModel.allCells = Vue.computed(() => _.flatten(viewModel.gameState && viewModel.gameState.game ? viewModel.gameState.game.boardCells : []));

    gameViewModel.availablePlacements = Vue.computed(function () {
        let placements,
            cellStart = null,
            isStart = false,
            travelled;

        placements = {
            cells: [],
            finish: false
        };

        if (viewModel.gameState.currentTurn === viewModel.player.id && viewModel.gameState.game.currentRoll !== null) {
            if (gameViewModel.selectedPiece) {
                cellStart = _.find(gameViewModel.allCells, { start: true });
                isStart = true;
            }
            else {
                cellStart = gameViewModel.selectedCell;
            }

            if (cellStart) {
                travelled = gameViewModel.getCellsAfterTravelling(cellStart, viewModel.gameState.game.currentRoll, isStart);

                placements.cells.push.apply(placements.cells, travelled.cells);
                placements.finish = travelled.finish;
            }
        }

        return placements;
    });
    gameViewModel.piecesByCellMap = Vue.computed(function () {
        let map = {};

        if (viewModel.gameState && viewModel.gameState.game) {
            map = _.groupBy(viewModel.gameState.game.playerPieces, function (piece) {
                return 'x' + piece.x + '~~y' + piece.y;
            });
        }

        return map;
    });
    gameViewModel.playerPiecesGrouped = Vue.computed(function () {
        let piecesGrouped,
            playerId,
            players = [];

        if (viewModel.gameState && viewModel.gameState.game) {
            piecesGrouped = _.groupBy(viewModel.gameState.game.playerPieces, 'playerId');

            for (playerId in piecesGrouped) {
                players.push({
                    playerId: playerId,
                    player: viewModel.players[playerId],
                    pieces: piecesGrouped[playerId]
                });
            }
        }

        return players;
    });

    gameViewModel.canPlaceOnCell = (x, y) => _.some(gameViewModel.availablePlacements.cells, { x: x, y: y });

    gameViewModel.piecesOnCell = function (x, y, playerId) {
        let map = gameViewModel.piecesByCellMap,
            key = 'x' + x + '~~y' + y,
            pieces;

        pieces = map[key] ? map[key] : [];

        if (playerId) {
            pieces = _.filter(pieces, { playerId: playerId });
        }

        return pieces;
    };

    gameViewModel.piecesOnCellGrouped = function (x, y) {
        return _.map(_.groupBy(gameViewModel.piecesOnCell(x, y), 'playerId'), (pieces, playerId) => {
            return {
                playerId: playerId,
                player: viewModel.helpers.getPlayer(playerId),
                pieces: pieces
            };
        });
    };

    return gameObject;
};
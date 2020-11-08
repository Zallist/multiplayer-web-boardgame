var app = app || {};

declare var Howl: any;

app.makeGameObject = function (connection, app, viewModel) {
    const gameObject: any = {};

    // Components get injected into the right place, so this is where we write custom HTML
    gameObject.vueComponents = {
        'game-panel': {
            data: () => viewModel,
            template: `
<div class="yut__wrap">
    <div class="game__board">
        <div class="game__row" v-for="row in $root.gameState.game.boardCells">
            <div v-for="cell in row"
                 @click.prevent="$root.game.events.cellClicked(cell)"
                 :class="{ 'game__cell': true, 'game__cell--available': cell.next.length > 0 }">

            
            </div>
        </div>
    </div>
    <div class="yut__sidebar">
        
    </div>
    <div class="yut__footer">
        <div class="d-flex flex-row">
            <div class="flex-fill"
                 v-for="group in $root.game.playerPiecesGrouped">
                <div><label :style="{ color: group.player.metadata.color }">{{ group.player.name }}</label></div>
                <div class="row">
                    <div v-for="piece in group.pieces"
                         class="col">
                        <div class="piece"
                             :class="{ 
                                'piece--placable': $root.gameState.currentTurn === $root.player.id && $root.gameState.game.currentRoll !== null && piece.x === null && piece.y === null && !piece.finished,
                                'piece--finished': piece.finished
                             }"
                             @click="$root.game.events.pieceClicked(piece)">
                            <player-avatar :player="group.player"></player-avatar>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="yut__corner">
        <button type="button" class="roll__button btn btn-outline-primary btn-block d-none d-lg-block btn-lg"
                :disabled="$root.gameState.currentTurn !== $root.player.id || $root.gameState.game.currentRoll !== null"
                @click.prevent="$root.game.events.rollClicked()">
            Roll
        </button>
        <button type="button" class="roll__button btn btn-outline-primary btn-block d-block d-lg-none"
                :disabled="$root.gameState.currentTurn !== $root.player.id || $root.gameState.game.currentRoll !== null"
                @click.prevent="$root.game.events.rollClicked()">
            Roll
        </button>
    </div>
</div>
`
        },
        'config-panel': {
            data: () => viewModel,
            template: `
<fieldset :disabled="$root.isConnecting || $root.isConnected">
    <div class="mb-3" v-show="!$root.isConnected">
        <label>Use a preset</label>
        <div>
            <button type="button" class="btn btn-outline-primary mr-1" @click="$root.game.events.setPreset(\'yut\')">Yut Nori</button>
        </div>
    </div>
    <div>
        <label>Turn Time (seconds)</label>

        <div class="form-row">
            <div class="col-8">
                <input type="range" class="form-control form-control-sm form-control-range" min="5" max="180" :step="1" v-model="$root.gameState.game.configuration.turnTime" />
            </div>
            <div class="col-4">
                <input type="number" class="form-control form-control-sm" min="5" max="180" :step="5" v-model="$root.gameState.game.configuration.turnTime" />
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
                    gameObject.selectedCell = null;
                    gameObject.selectedPiece = null;
                    viewModel.gameState.game.currentRoll = null;

                    pieces = [];

                    if (data.pieceId) {
                        pieces.push.apply(pieces, _.filter(viewModel.gameState.game.playerPieces, { pieceId: data.pieceId }));
                    }
                    else {

                    }

                    if (_.some(viewModel.gameState.game.playerPieces, { finish: false, playerId: fromPlayerId })) {
                        // Calculate win after doing stuff
                        // Means that the user isn't telling us they won, but we're finding out they won
                        data.isWin = true;
                    }

                    /*
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
                    }
                    */
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

            if (!_.isFinite(config.gridSize) || config.gridSize < 5) {
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

    gameObject.events = {
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

            if (viewModel.selectedCell || viewModel.selectedPiece) {
                if (gameObject.availablePlacements.value.finish) {
                    connection.send({
                        pieceId: viewModel.selectedPiece ? viewModel.selectedPiece.pieceId : null,
                        cellFromX: viewModel.selectedCell ? viewModel.selectedCell.x : null,
                        cellFromY: viewModel.selectedCell ? viewModel.selectedCell.y : null,
                        finish: true,
                        type: 'end-turn',
                        isWin: false,
                        nextPlayerId: config.allowMultipleTurns && game.currentRoll >= config.maxRoll - 1 ? viewModel.player.id : viewModel.helpers.getNextPlayer()
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

            if (viewModel.selectedCell === cell) {
                viewModel.selectedCell = null;
            }
            else if (viewModel.selectedCell || viewModel.selectedPiece) {
                if (gameObject.canPlaceOnCell(cell.x, cell.y)) {
                    connection.send({
                        pieceId: viewModel.selectedPiece ? viewModel.selectedPiece.pieceId : null,
                        cellFromX: viewModel.selectedCell ? viewModel.selectedCell.x : null,
                        cellFromY: viewModel.selectedCell ? viewModel.selectedCell.y : null,
                        cellToX: cell.x,
                        cellToY: cell.y,
                        type: 'end-turn',
                        isWin: false,
                        nextPlayerId: config.allowMultipleTurns && game.currentRoll >= config.maxRoll - 1 ? viewModel.player.id : viewModel.helpers.getNextPlayer()
                    }, true);
                }
            }
            else if (_.some(gameObject.piecesOnCell(cell.x, cell.y), { playerId: viewModel.player.id })) {
                viewModel.selectedCell = cell;
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

            gameObject.selectedCell = null;
            gameObject.selectedPiece = piece;
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

    gameObject.helpers = {

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

    gameObject.selectedCell = null;
    gameObject.selectedPiece = null;

    gameObject.getCellsAfterTravelling = function (cell, distance) {
        let result,
            travel,
            i;

        result = {
            cells: [],
            finish: false
        };

        travel = function (cell, distance, isFirst) {
            let i, nextCell;

            if (distance === 0) {
                result.cells.push(cell);
            }
            else if (!isFirst && cell.finish) {
                result.finish = true;
            }
            else {
                for (i = 0; i < cell.next.length; i++) {
                    nextCell = cell.next[i];
                    travel(nextCell, distance - 1, false);
                }
            }
        };

        travel(cell, distance, true);

        return result;
    };

    gameObject.allCells = Vue.computed(() => _.flatten(viewModel.gameState && viewModel.gameState.game ? viewModel.gameState.game.boardCells : []));

    gameObject.availablePlacements = Vue.computed(function () {
        let placements,
            cellStart,
            travelled;

        placements = {
            cells: [],
            finish: false
        };

        if (viewModel.gameState.currentTurn === viewModel.player.id && gameObject.currentRoll !== null) {
            if (viewModel.selectedPiece) {
                cellStart = _.find(gameObject.allCells.value, { start: true });
            }
            else {
                cellStart = viewModel.selectedCell;
            }

            travelled = gameObject.getCellsAfterTravelling(cellStart, gameObject.currentRoll);

            placements.cells.push.apply(placements.cells, travelled.cells);
            placements.finish = travelled.finish;
        }

        return placements;
    });
    gameObject.piecesByCellMap = Vue.computed(function () {
        let map = {};

        if (viewModel.gameState && viewModel.gameState.game) {
            map = _.groupBy(viewModel.gameState.game.playerPieces, function (piece) {
                return 'x' + piece.x + '~~y' + piece.y;
            });
        }

        return map;
    });
    gameObject.playerPiecesGrouped = Vue.computed(function () {
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

    gameObject.canPlaceOnCell = (x, y) => _.some(gameObject.availablePlacements.value.cells, { x: x, y: y });

    gameObject.piecesOnCell = function (x, y) {
        let map = gameObject.piecesByCellMap.value,
            key = 'x' + x + '~~y' + y;

        if (map[key]) {
            return map[key];
        }
        else {
            return [];
        }
    };

    return gameObject;
};
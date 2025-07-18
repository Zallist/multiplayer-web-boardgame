var app = app || {};
app.makeGameObject = function (connection, app, viewModel) {
    var gameObject = {}, gameViewModel = Vue.reactive({});
    gameObject.viewModel = gameViewModel;
    // Components get injected into the right place, so this is where we write custom HTML
    gameObject.vueComponents = {
        directives: app.vueHelpers.directives.getDefault(),
        'game-panel': {
            data: function () {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: "\n<div class=\"yut__wrap\">\n    <div class=\"game__board\">\n        <div class=\"game__row\" v-for=\"row in $data.$vm.gameState.game.boardCells\">\n            <div v-for=\"cell in row\"\n                 @click.prevent=\"$data.$game.events.cellClicked(cell)\"\n                 :class=\"{ \n                    'game__cell': true, \n                    'game__cell--available': cell.next.length > 0,\n                    'game__cell--selectable': $data.$game.piecesOnCell(cell.x, cell.y, $data.$vm.player.id).length > 0,\n                    'game__cell--selected': $data.$game.selectedCell === cell,\n                    'game__cell--placable': $data.$game.canPlaceOnCell(cell.x, cell.y),\n                    'game__cell--last-placed': $data.$vm.gameState.game.lastPlacedCell === cell\n                 }\">\n\n                <div v-for=\"pieceGroups in [$data.$game.piecesOnCellGrouped(cell.x, cell.y)]\"\n                     class=\"game__cell__content\">\n\n                    <div class=\"cell__piece\" v-for=\"pieceGroup in pieceGroups\"\n                         v-move-when-mounted=\"{ \n                             'key': 's:' + $data.$vm.gameState.started + '~' + pieceGroup.pieces[0].pieceId\n                         }\">\n                        <player-avatar :player=\"pieceGroup.player\"></player-avatar>\n                        <div class=\"cell__piece-count\" v-if=\"pieceGroup.pieces.length > 1\">{{ pieceGroup.pieces.length }}</div>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class=\"yut__sidebar\">\n        <div style=\"position: absolute; left: 0; right: 0; bottom: 1em;\">\n            <button type=\"button\" class=\"btn btn-primary btn-block\" style=\"font-size: 150%;\"\n                    :disabled=\"$data.$vm.gameState.currentTurn !== $data.$vm.player.id || !$data.$game.availablePlacements.finish\"\n                    @click.prevent=\"$data.$game.events.finishClicked()\">\n                Finish\n            </button>\n        </div>\n    </div>\n    <div class=\"yut__footer\">\n        <div class=\"d-flex flex-row\">\n            <div class=\"flex-fill\"\n                 v-for=\"group in $data.$game.playerPiecesGrouped\">\n                <div><label :style=\"{ color: group.player.metadata.color }\">{{ group.player.name }}</label></div>\n                <div class=\"row\">\n                    <div v-for=\"piece in group.pieces\"\n                         class=\"col\">\n                        <div class=\"piece ratio-square\"\n                             :class=\"{ \n                                'piece--placable': $data.$vm.gameState.currentTurn === $data.$vm.player.id && $data.$vm.gameState.game.currentRoll !== null && piece.x === null && piece.y === null && !piece.finished && piece.playerId === $data.$vm.player.id,\n                                'piece--selected': $data.$game.selectedPiece === piece || ($data.$game.selectedCell !== null && $data.$game.selectedCell.x === piece.x && $data.$game.selectedCell.y === piece.y),\n                                'piece--finished': piece.finished\n                             }\"\n                             @click=\"$data.$game.events.pieceClicked(piece)\">\n                            <player-avatar :player=\"group.player\"></player-avatar>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class=\"yut__corner\">\n        <button type=\"button\" class=\"roll__button btn btn-primary btn-block\" style=\"font-size: 150%;\"\n                :disabled=\"$data.$vm.gameState.currentTurn !== $data.$vm.player.id || $data.$vm.gameState.game.currentRoll !== null\"\n                @click.prevent=\"$data.$game.events.rollClicked()\">\n            Roll\n        </button>\n    </div>\n</div>\n"
        },
        'config-panel': {
            data: function () {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: "\n<fieldset :disabled=\"$data.$vm.isConnecting || ($data.$vm.isConnected && !$data.$vm.isHost) || ($data.$vm.isConnected && $data.$vm.isHost && $data.$vm.gameState.started)\">\n    <div class=\"mb-3\">\n        <label>Use a preset</label>\n        <div>\n            <button type=\"button\" class=\"btn btn-outline-primary mr-1\" @click=\"$data.$game.events.setPreset('yut')\">Yut Nori</button>\n        </div>\n    </div>\n    <div>\n        <label>Turn Time (seconds)</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"5\" max=\"180\" :step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"5\" max=\"180\" :step=\"5\" v-model.number=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Grid Size</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"3\" max=\"19\" step=\"2\" v-model=\"$data.$vm.gameState.game.configuration.gridSize\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"3\" max=\"19\" step=\"2\" v-model.number=\"$data.$vm.gameState.game.configuration.gridSize\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <div class=\"form-check\">\n            <label class=\"form-check-label\">\n                <input class=\"form-check-input\" type=\"checkbox\" v-model=\"$data.$vm.gameState.game.configuration.allowMultipleTurns\">\n                Multiple Turns In A Row\n            </label>\n        </div>\n\n        <small class=\"form-text text-secondary config__help-text\">\n            If you roll the maximum roll, you get a second roll\n        </small>\n    </div>\n    <div class=\"mt-3\">\n        <label>Pieces</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"1\" max=\"24\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.numberOfPieces\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"1\" max=\"24\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.numberOfPieces\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Min. Roll</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"0\" max=\"19\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.minRoll\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"0\" max=\"19\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.minRoll\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Max. Roll</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"1\" max=\"19\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.maxRoll\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"1\" max=\"19\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.maxRoll\" />\n            </div>\n        </div>\n    </div>\n</fieldset>\n"
        }
    };
    gameObject.hooks = {
        handleData: function (fromPlayerId, data, fromPlayer) {
            var pieces;
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
                        _.forEach(pieces, function (piece) {
                            piece.x = null;
                            piece.y = null;
                            piece.finished = true;
                        });
                    }
                    else if (_.isNumber(data.cellToX) && _.isNumber(data.cellToY)) {
                        _.forEach(pieces, function (piece) {
                            piece.x = data.cellToX;
                            piece.y = data.cellToY;
                        });
                        // And get rid of the ones to get rid of
                        pieces = _.reject(gameViewModel.piecesOnCell(data.cellToX, data.cellToY), { playerId: fromPlayerId });
                        if (data.removeSpecificPlayerId) {
                            pieces = _.filter(pieces, { playerId: data.removeSpecificPlayerId });
                        }
                        _.forEach(pieces, function (piece) {
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configuration, x, y, i, j, player, row, cell;
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, nextPlayerId;
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, nextPlayerId;
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart;
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, rolled;
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configuration;
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
            })
        };
        return assets;
    })();
    gameViewModel.selectedCell = null;
    gameViewModel.selectedPiece = null;
    gameViewModel.getCellsAfterTravelling = function (cell, distance, isFirst) {
        var gameState = viewModel.gameState, game = gameState.game, result, travel;
        result = {
            cells: [],
            finish: false
        };
        travel = function (cell, distance) {
            var i, nextCellDelta, nextCell;
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
    gameViewModel.allCells = Vue.computed(function () { return _.flatten(viewModel.gameState && viewModel.gameState.game ? viewModel.gameState.game.boardCells : []); });
    gameViewModel.availablePlacements = Vue.computed(function () {
        var placements, cellStart = null, isStart = false, travelled;
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
        var map = {};
        if (viewModel.gameState && viewModel.gameState.game) {
            map = _.groupBy(viewModel.gameState.game.playerPieces, function (piece) {
                return 'x' + piece.x + '~~y' + piece.y;
            });
        }
        return map;
    });
    gameViewModel.playerPiecesGrouped = Vue.computed(function () {
        var piecesGrouped, playerId, players = [];
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
    gameViewModel.canPlaceOnCell = function (x, y) { return _.some(gameViewModel.availablePlacements.cells, { x: x, y: y }); };
    gameViewModel.piecesOnCell = function (x, y, playerId) {
        var map = gameViewModel.piecesByCellMap, key = 'x' + x + '~~y' + y, pieces;
        pieces = map[key] ? map[key] : [];
        if (playerId) {
            pieces = _.filter(pieces, { playerId: playerId });
        }
        return pieces;
    };
    gameViewModel.piecesOnCellGrouped = function (x, y) {
        return _.map(_.groupBy(gameViewModel.piecesOnCell(x, y), 'playerId'), function (pieces, playerId) {
            return {
                playerId: playerId,
                player: viewModel.helpers.getPlayer(playerId),
                pieces: pieces
            };
        });
    };
    return gameObject;
};
//# sourceMappingURL=yut.js.map
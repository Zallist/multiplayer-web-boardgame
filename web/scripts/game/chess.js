var app = app || {};
app.makeGameObject = function (connection, app, viewModel) {
    var gameObject = {}, gameViewModel = Vue.reactive({});
    gameObject.viewModel = gameViewModel;
    // Components get injected into the right place, so this is where we write custom HTML
    gameObject.vueComponents = {
        'game-panel': {
            directives: app.vueHelpers.directives.getDefault(),
            data: function () {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: "\n<div class=\"game__board\" v-for=\"availableMoves in [$data.$game.getPossibleMoves($data.$game.selectedCell)]\"\n     v-touch-highlight>\n    <div class=\"game__row\" v-for=\"row in $data.$vm.gameState.game.boardCells\">\n        <div v-for=\"cell in row\"\n             @click.prevent=\"$data.$game.events.cellClicked(cell)\"\n             :class=\"{ \n                 'game__cell': true, \n                 'game__cell--owned': cell.ownedBy !== null, \n                 'game__cell--placable': availableMoves.cells.indexOf(cell) > -1 ,\n                 'game__cell--can-promote': $data.$game.canPromote(cell)\n             }\">\n\n            <div v-if=\"cell.ownedBy !== null && cell.piece\"\n                 v-for=\"player in [$data.$game.getPlayerFromIndex(cell.ownedBy)]\"\n                 class=\"chess__piece text--border\"\n                 :class=\"{ \n                    'chess__piece--last-placed': cell === $data.$vm.gameState.game.lastPlacedCell,\n                    'light': player && player.metadata && $root.helpers.brightnessByColor(player.metadata.color) >= 200, \n                    'dark': player && player.metadata && $root.helpers.brightnessByColor(player.metadata.color) < 200\n                 }\"\n                 :style=\"{ 'color': player && player.metadata && player.metadata.color, 'font-size': (Math.min($data.$vm.gamePanelHeight / $data.$vm.gameState.game.configurationAtStart.gridHeight,$data.$vm.gamePanelWidth / $data.$vm.gameState.game.configurationAtStart.gridWidth) * 0.75) + 'px' }\"\n                 :title=\"'Owned by ' + (player && player.name)\"\n                 v-move-when-mounted=\"{ \n                     'key': 's:' + $data.$vm.gameState.started + '~' + cell.pieceId\n                 }\">\n\n                <!-- chess piece -->\n                <i class=\"fas\" :class=\"['fa-chess-' + cell.piece]\"></i>\n            </div>\n        </div>\n    </div>\n</div>\n"
        },
        'config-panel': {
            data: function () {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: "\n<fieldset :disabled=\"$data.$vm.isConnecting || ($data.$vm.isConnected && !$data.$vm.isHost) || ($data.$vm.isConnected && $data.$vm.isHost && $data.$vm.gameState.started)\">\n    <div class=\"mb-3\">\n        <label>Use a preset</label>\n        <div>\n            <button type=\"button\" class=\"btn btn-primary mr-1\" @click=\"$data.$game.events.setPreset('simple-chess')\">Simple Chess</button>\n            <button type=\"button\" class=\"btn btn-primary mr-1\" @click=\"$data.$game.events.setPreset('chess')\">Chess</button>\n        </div>\n    </div>\n    <div>\n        <label>Turn Time (seconds)</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"5\" max=\"180\" :step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"5\" max=\"180\" :step=\"5\" v-model.number=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Grid Height</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"4\" max=\"24\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.gridHeight\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"4\" max=\"24\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.gridHeight\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Grid Width</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"8\" max=\"24\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.gridWidth\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"8\" max=\"24\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.gridWidth\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Randomization</label>\n\n        <div class=\"form-row\">\n            <select class=\"form-control form-control-sm\" v-model=\"$data.$vm.gameState.game.configuration.randomLevel\">\n                <optgroup label=\"Mirrored\">\n                    <option value=\"0\">No Randomization</option>\n                    <option value=\"1\">Random starting positions (in the first 2 rows)</option>\n                    <option value=\"2\">Random pieces (in the first 2 rows)</option>\n                    <option value=\"3\">Random pieces (anywhere on board)</option>\n                </optgroup>\n                <optgroup label=\"Not mirrored\">\n                    <option value=\"4\">Random pieces (anywhere on board, but the same pieces between players)</option>\n                    <option value=\"5\">Random pieces (anywhere on board, any pieces)</option>\n                </optgroup>\n            </select>\n        </div>\n    </div>\n    <div class=\"mt-3\" v-if=\"$data.$vm.gameState.game.configuration.randomLevel >= 4\">\n        <label>Number of pieces</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"8\" max=\"50\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.numberOfPieces\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"8\" max=\"50\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.numberOfPieces\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <div class=\"form-check\">\n            <label class=\"form-check-label\">\n                <input class=\"form-check-input\" type=\"checkbox\" v-model=\"$data.$vm.gameState.game.configuration.allowPromotion\">\n                Allow Pawn Promotion\n            </label>\n        </div>\n\n        <small class=\"form-text text-secondary config__help-text\">\n            <a href=\"https://en.wikipedia.org/wiki/Promotion_(chess)\" target=\"_blank\">Wikipedia: Pawn Promotion</a>\n        </small>\n    </div>\n    <h2 class=\"mt-3\">Not Implemented Yet:</h2>\n    <div class=\"mt-3\">\n        <div class=\"form-check\">\n            <label class=\"form-check-label\">\n                <input class=\"form-check-input\" type=\"checkbox\" v-model=\"$data.$vm.gameState.game.configuration.allowCastling\" disabled>\n                Allow Castling\n            </label>\n        </div>\n\n        <small class=\"form-text text-secondary config__help-text\">\n            <a href=\"https://en.wikipedia.org/wiki/Castling\" target=\"_blank\">Wikipedia: Castling</a>\n        </small>\n    </div>\n    <div class=\"mt-3\">\n        <div class=\"form-check\">\n            <label class=\"form-check-label\">\n                <input class=\"form-check-input\" type=\"checkbox\" v-model=\"$data.$vm.gameState.game.configuration.allowEnpasse\" disabled>\n                Allow Enpasse\n            </label>\n        </div>\n\n        <small class=\"form-text text-secondary config__help-text\">\n            <a href=\"https://en.wikipedia.org/wiki/En_passant\" target=\"_blank\">Wikipedia: En passant</a>\n        </small>\n    </div>\n</fieldset>\n"
        }
    };
    gameObject.hooks = {
        handleData: function (fromPlayerId, data, fromPlayer) {
            var fromCell, toCell, gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart;
            switch (_.trim(data.type).toLowerCase()) {
                case 'promote-pawn':
                    fromCell = viewModel.gameState.game.boardCells[data.cellY][data.cellX];
                    if (gameViewModel.canPromote(fromCell)) {
                        fromCell.piece = data.to;
                    }
                    else {
                        viewModel.helpers.addMessage(null, fromPlayer.name + " tried to promote an invalid cell", 'red');
                        fromPlayer.metadata.totalStats.timesHacked += 1;
                    }
                    break;
                case 'end-turn':
                    gameViewModel.selectedCell = null;
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
                            toCell.pieceId = fromCell.pieceId;
                            fromCell.ownedBy = null;
                            fromCell.piece = null;
                            fromCell.pieceId = null;
                            if (config.allowEnpasse) {
                                if (toCell.piece === 'pawn') {
                                    // TODO : Check for en passe
                                }
                            }
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
            game = _.merge({
                configuration: {
                    // In case you want it wider
                    gridWidth: 8,
                    // Or taller
                    gridHeight: 8,
                    // In seconds
                    turnTime: 60,
                    randomLevel: 0,
                    numberOfPieces: 16,
                    // If not enabled we'll change player as we go
                    // Because it's fun that way
                    limitToTwoPlayers: true,
                    // Because pros like castling, but it catches out the noobs
                    allowCastling: false,
                    // Because pros would complain without enpasse to catch the noobs
                    allowEnpasse: false,
                    // Because people confuse chess and checkers, and so guess that promotion exists in their first game
                    allowPromotion: true
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configuration, x, y, row, cell, setPieces;
            // Validation checks
            config.turnTime = Number(config.turnTime);
            config.gridHeight = Number(config.gridHeight);
            config.gridWidth = Number(config.gridWidth);
            if (!_.isFinite(config.turnTime) || config.turnTime < 5) {
                alert('Invalid turn time');
                return false;
            }
            if (!_.isFinite(config.gridHeight) || config.gridHeight < 4 || config.gridHeight > 24) {
                alert('Invalid grid height');
                return false;
            }
            if (!_.isFinite(config.gridHeight) || config.gridWidth < 8 || config.gridWidth > 24) {
                alert('Invalid grid height');
                return false;
            }
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
                        ownedBy: null,
                        piece: null
                    };
                    row.push(cell);
                }
            }
            function fillMirroredPieces(pieces) {
                var i, x, y, row;
                for (i = 0; i < Math.min(_.size(gameState.turnOrder), 2); i++) {
                    for (y = 0; y < Math.min(pieces.length, _.size(game.boardCells)); y++) {
                        row = i === 0 ?
                            game.boardCells[y] :
                            game.boardCells[(_.size(game.boardCells) - 1) - y];
                        for (x = 0; x < Math.min(pieces[y].length, _.size(row)); x++) {
                            cell = row[x];
                            cell.ownedBy = i;
                            cell.piece = pieces[y][x];
                            if (cell.piece) {
                                cell.pieceId = 'p:' + i + '~x:' + x + '~y:' + y;
                            }
                        }
                    }
                }
            }
            /*
                <optgroup label="Mirrored">
                    <option value="0">No Randomization</option>
                    <option value="1">Random starting positions (in the first 2 rows)</option>
                    <option value="2">Random pieces (in the first 2 rows)</option>
                    <option value="3">Random pieces (anywhere on board)</option>
                </optgroup>
                <optgroup label="Not mirrored">
                    <option value="4">Random pieces (anywhere on board, but the same pieces between players)</option>
                    <option value="5">Random pieces (anywhere on board, any pieces)</option>
                </optgroup>
            */
            switch (parseInt(config.randomLevel)) {
                case 1:
                    setPieces = function () {
                        var pieces = [];
                        pieces.push(_.map(_.range(config.gridWidth), function () { return null; }));
                        pieces.push(_.map(_.range(config.gridWidth), function () { return null; }));
                        _.merge(pieces[0], _.concat(['rook', 'bishop', 'knight', 'king'], _.map(_.range(config.gridWidth - 8), function () { return null; }), ['queen', 'knight', 'bishop', 'rook']));
                        pieces[0] = _.shuffle(pieces[0]);
                        _.merge(pieces[1], _.map(_.range(config.gridWidth), function () { return 'pawn'; }));
                        fillMirroredPieces(pieces);
                    };
                    break;
                case 0:
                default:
                    setPieces = function () {
                        var pieces = [];
                        pieces.push(_.map(_.range(config.gridWidth), function () { return null; }));
                        pieces.push(_.map(_.range(config.gridWidth), function () { return null; }));
                        _.merge(pieces[0], _.concat(['rook', 'bishop', 'knight', 'king'], _.map(_.range(config.gridWidth - 8), function () { return null; }), ['queen', 'knight', 'bishop', 'rook']));
                        _.merge(pieces[1], _.map(_.range(config.gridWidth), function () { return 'pawn'; }));
                        fillMirroredPieces(pieces);
                    };
                    break;
            }
            setPieces();
            gameState.turnTime = config.turnTime;
            if (config.limitToTwoPlayers) {
                gameState.turnOrder = _.take(gameState.turnOrder, 2);
            }
            // Save configuration for next time
            localStorage.setItem(app.gameName + '-game-configuration', JSON.stringify(config));
            return true;
        }
    };
    gameViewModel.events = {
        cellClicked: function (cell) {
            var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, availableMoves, fromCell, isWin = false;
            // If the game's started
            if (!gameState.started) {
                return;
            }
            // If it's my turn
            if (gameState.currentTurn !== viewModel.player.id) {
                viewModel.helpers.addMessage(null, 'Not your turn');
                return;
            }
            fromCell = gameViewModel.selectedCell;
            // If it belongs to us
            if (cell.ownedBy === gameViewModel.getPlayerIndexFromId(viewModel.player.id)) {
                if (gameViewModel.canPromote(cell)) {
                    app.helpers.makeDialog({
                        promote: function (to) {
                            connection.send({
                                type: 'promote-pawn',
                                cellX: cell.x,
                                cellY: cell.y,
                                to: to
                            }, true);
                        },
                        title: 'Promote Pawn',
                        contentHtml: "\n<div>\n    <button type=\"button\" \n            class=\"btn btn-block btn-lg btn-primary\"\n            @click=\"$root.close(function () { $root.options.promote('queen'); })\">\n        Queen\n    </button>\n    <button type=\"button\" \n            class=\"btn btn-block btn-lg btn-primary mt-3\"\n            @click=\"$root.close(function () { $root.options.promote('knight'); })\">\n        Knight\n    </button>\n    <button type=\"button\" \n            class=\"btn btn-block btn-lg btn-primary mt-3\"\n            @click=\"$root.close(function () { $root.options.promote('rook'); })\">\n        Rook\n    </button>\n    <button type=\"button\" \n            class=\"btn btn-block btn-lg btn-primary mt-3\"\n            @click=\"$root.close(function () { $root.options.promote('bishop'); })\">\n        Bishop\n    </button>\n</div>\n",
                        buttons: []
                    });
                }
                else {
                    // Select it
                    gameViewModel.selectedCell = cell;
                }
                return;
            }
            else if (fromCell && fromCell.ownedBy === gameViewModel.getPlayerIndexFromId(viewModel.player.id)) {
                availableMoves = gameViewModel.getPossibleMoves(fromCell);
                if (availableMoves.cells.indexOf(cell) === -1) {
                    viewModel.helpers.addMessage(null, 'Invalid move');
                    return;
                }
            }
            else {
                return;
            }
            if (cell.piece === 'king' && cell.ownedBy !== gameViewModel.getPlayerIndexFromId(viewModel.player.id)) {
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
            var gameState = viewModel.gameState, game = gameState.game, config = game.configuration;
            config.turnTime = 60;
            config.gridWidth = 8;
            config.gridHeight = 8;
            config.randomLevel = 0;
            config.limitToTwoPlayers = true;
            config.allowCastling = false;
            config.allowEnpasse = false;
            config.allowPromotion = true;
            switch (_.trim(presetName).toLowerCase()) {
                case 'chess':
                    config.allowCastling = true;
                    //config.allowEnpasse = true;
                    break;
                case 'simple-chess':
                default:
                    // Standard rules, set above
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
    gameViewModel.getPlayerFromIndex = function (playerIndex) {
        var player = viewModel.gameState.turnOrder[playerIndex];
        return player ? viewModel.helpers.getPlayer(player) : null;
    };
    gameViewModel.getPlayerIndexFromId = function (playerId) {
        return viewModel.gameState.turnOrder.indexOf(playerId);
    };
    gameViewModel.getPossibleMoves = function (cell, player, piece) {
        var gameState = viewModel.gameState, game = gameState.game, config = game.configurationAtStart, moves, x, y;
        moves = {
            cells: []
        };
        if (cell) {
            if (!piece) {
                piece = cell.piece;
            }
            if (player === undefined) {
                player = cell.ownedBy;
            }
        }
        if (!cell || !piece || player === null) {
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
                if (cell.ownedBy !== player) {
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
            while (cell.ownedBy === null || (cell.x === startX && cell.y === startY)) {
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
                if (player === 0) {
                    // go down
                    if (isCell(cell.x - 1, cell.y + 1) && game.boardCells[cell.y + 1][cell.x - 1].ownedBy !== null && game.boardCells[cell.y + 1][cell.x - 1].ownedBy !== player) {
                        addCell(cell.x - 1, cell.y + 1);
                    }
                    if (isCell(cell.x + 1, cell.y + 1) && game.boardCells[cell.y + 1][cell.x + 1].ownedBy !== null && game.boardCells[cell.y + 1][cell.x + 1].ownedBy !== player) {
                        addCell(cell.x + 1, cell.y + 1);
                    }
                    if (isCell(cell.x, cell.y + 1) && game.boardCells[cell.y + 1][cell.x].ownedBy === null) {
                        addCell(cell.x, cell.y + 1);
                        if (cell.y === 1 && isCell(cell.x, cell.y + 2) && game.boardCells[cell.y + 2][cell.x].ownedBy === null) {
                            addCell(cell.x, cell.y + 2);
                        }
                    }
                }
                else {
                    // go up
                    if (isCell(cell.x - 1, cell.y - 1) && game.boardCells[cell.y - 1][cell.x - 1].ownedBy !== null && game.boardCells[cell.y - 1][cell.x - 1].ownedBy !== player) {
                        addCell(cell.x - 1, cell.y - 1);
                    }
                    if (isCell(cell.x + 1, cell.y - 1) && game.boardCells[cell.y - 1][cell.x + 1].ownedBy !== null && game.boardCells[cell.y - 1][cell.x + 1].ownedBy !== player) {
                        addCell(cell.x + 1, cell.y - 1);
                    }
                    if (isCell(cell.x, cell.y - 1) && game.boardCells[cell.y - 1][cell.x].ownedBy === null) {
                        addCell(cell.x, cell.y - 1);
                        if (cell.y === config.gridHeight - 2 && isCell(cell.x, cell.y - 2) && game.boardCells[cell.y - 2][cell.x].ownedBy === null) {
                            addCell(cell.x, cell.y - 2);
                        }
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
    };
    gameViewModel.canPromote = function (cell) {
        return viewModel.gameState.game.configurationAtStart.allowPromotion &&
            cell.piece === 'pawn' &&
            ((cell.ownedBy === 1 && cell.y <= 0) ||
                (cell.ownedBy === 0 && cell.y >= viewModel.gameState.game.configurationAtStart.gridHeight - 1));
    };
    return gameObject;
};

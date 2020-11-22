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
            template: "\n<div class=\"game__board\" v-for=\"availableMoves in [$data.$game.getPossibleMoves($data.$game.selectedCell)]\">\n    <div class=\"game__row\" v-for=\"row in $data.$vm.gameState.game.boardCells\">\n        <div v-for=\"cell in row\"\n             @click.prevent=\"$data.$game.events.cellClicked(cell)\"\n             :class=\"{ 'game__cell': true, 'game__cell--owned': cell.ownedBy !== null, 'game__cell--placable': availableMoves.cells.indexOf(cell) > -1 }\">\n\n            <div v-if=\"cell.ownedBy !== null && cell.piece\"\n                 v-for=\"player in [$data.$game.getPlayerFromIndex(cell.ownedBy)]\"\n                 class=\"chess__piece text--border\"\n                 :class=\"{ \n                    'chess__piece--last-placed': cell === $data.$vm.gameState.game.lastPlacedCell,\n                    'light': player && player.metadata && $root.helpers.brightnessByColor(player.metadata.color) >= 127, \n                    'dark': player && player.metadata && $root.helpers.brightnessByColor(player.metadata.color) < 127\n                 }\"\n                 :style=\"{ 'color': player && player.metadata && player.metadata.color, 'font-size': (Math.min($data.$vm.gamePanelHeight / $data.$vm.gameState.game.configurationAtStart.gridHeight,$data.$vm.gamePanelWidth / $data.$vm.gameState.game.configurationAtStart.gridWidth) * 0.75) + 'px' }\"\n                 :title=\"'Owned by ' + (player && player.name)\">\n\n                <!-- chess piece -->\n                <i class=\"fas\" :class=\"['fa-chess-' + cell.piece]\"></i>\n            </div>\n        </div>\n    </div>\n</div>\n"
        },
        'config-panel': {
            data: function () {
                return {
                    $vm: viewModel,
                    $game: gameViewModel
                };
            },
            template: "\n<fieldset :disabled=\"$data.$vm.isConnecting || ($data.$vm.isConnected && !$data.$vm.isHost) || ($data.$vm.isConnected && $data.$vm.isHost && $data.$vm.gameState.started)\">\n    <div class=\"mb-3\">\n        <label>Use a preset</label>\n        <div>\n            <button type=\"button\" class=\"btn btn-primary mr-1\" @click=\"$data.$game.events.setPreset('simple-chess')\">Simple Chess</button>\n            <button type=\"button\" class=\"btn btn-primary mr-1\" @click=\"$data.$game.events.setPreset('chess')\">Chess</button>\n        </div>\n    </div>\n    <div>\n        <label>Turn Time (seconds)</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"5\" max=\"180\" :step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"5\" max=\"180\" :step=\"5\" v-model.number=\"$data.$vm.gameState.game.configuration.turnTime\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Grid Height</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"4\" max=\"24\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.gridHeight\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"4\" max=\"24\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.gridHeight\" />\n            </div>\n        </div>\n    </div>\n    <div class=\"mt-3\">\n        <label>Grid Width</label>\n\n        <div class=\"form-row\">\n            <div class=\"col-8\">\n                <input type=\"range\" class=\"custom-range\" min=\"8\" max=\"24\" step=\"1\" v-model=\"$data.$vm.gameState.game.configuration.gridWidth\" />\n            </div>\n            <div class=\"col-4\">\n                <input type=\"number\" class=\"form-control form-control-sm\" min=\"8\" max=\"24\" step=\"1\" v-model.number=\"$data.$vm.gameState.game.configuration.gridWidth\" />\n            </div>\n        </div>\n    </div>\n</fieldset>\n"
        }
    };
    gameObject.hooks = {
        handleData: function (fromPlayerId, data, fromPlayer) {
            var fromCell, toCell;
            switch (_.trim(data.type).toLowerCase()) {
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
            game = _.merge({
                configuration: {
                    // In case you want it wider
                    gridWidth: 8,
                    // Or taller
                    gridHeight: 8,
                    // In seconds
                    turnTime: 60,
                    // 1 = Normal pieces, randomised starts in the normal area
                    // 2 = Random pieces, in the normal area
                    // 3 = Random pieces, mirrored for sanity
                    // 4 = Random pieces, random placement
                    // 5 = Random pieces, random placement, probably be completely one sided
                    randomLevel: 0,
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
            switch (config.randomLevel) {
                case 0:
                default:
                    setPieces = function () {
                        var i, x;
                        for (i = 0; i < Math.min(_.size(gameState.turnOrder), 2); i++) {
                            row = game.boardCells[i * (_.size(game.boardCells) - 1)]; // first or last row
                            for (x = 0; x < _.size(row); x++) {
                                cell = row[x];
                                cell.ownedBy = i;
                                if (x === 0 || x === _.size(row) - 1) {
                                    cell.piece = 'rook';
                                }
                                if (x === 1 || x === _.size(row) - 2) {
                                    cell.piece = 'bishop';
                                }
                                if (x === 2 || x === _.size(row) - 3) {
                                    cell.piece = 'knight';
                                }
                                if (x === 3) {
                                    cell.piece = 'king';
                                }
                                if (x === _.size(row) - 4) {
                                    cell.piece = 'queen';
                                }
                                if (!cell.piece) {
                                    cell.piece = 'pawn';
                                }
                            }
                            row = game.boardCells[(i * (_.size(game.boardCells) - 3)) + 1]; // n+1 or n-1 row
                            for (x = 0; x < _.size(row); x++) {
                                cell = row[x];
                                cell.ownedBy = i;
                                cell.piece = 'pawn';
                            }
                        }
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
            // If it's already clicked
            if (cell.ownedBy === gameViewModel.getPlayerIndexFromId(viewModel.player.id)) {
                // select it
                gameViewModel.selectedCell = cell;
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
                    config.allowEnpasse = true;
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
            cells: [],
            canPromotePawn: false
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
                    if (cell.y === config.gridHeight - 1) {
                        moves.canPromotePawn = true;
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
    };
    return gameObject;
};

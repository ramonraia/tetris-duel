// A complete, self-contained game.js file for Tetris Duel.
// This script handles all game logic, including the menu, game loop,
// scoring, block movement, line clearing, runner/shot mechanics, and now, on-screen controls.

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Game State and Constants ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const GRID_SIZE = 30; // Size of each cell in pixels
    const COLS = 10;
    const ROWS = 20;

    canvas.width = COLS * GRID_SIZE;
    canvas.height = ROWS * GRID_SIZE;

    // UI elements
    const menuScreen = document.getElementById('menuScreen');
    const mainContainer = document.querySelector('.main-container');
    const pauseScreen = document.getElementById('pauseScreen');
    const gameMessage = document.getElementById('gameMessage');

    const startGameButton = document.getElementById('startGameButton');
    const resumeButton = document.getElementById('resumeButton');
    const backToMenuButton = document.getElementById('backToMenuButton');

    // On-screen control buttons
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    const rotateButton = document.getElementById('rotateButton');
    const downButton = document.getElementById('downButton');
    const pauseButton = document.getElementById('pauseButton');

    // UI options
    const runnerCountSelect = document.getElementById('runnerCountSelect');
    const linesInput = document.getElementById('linesInput');
    const maxShotsInput = document.getElementById('maxShotsInput');
    const rechargeTimeInput = document.getElementById('rechargeTimeInput');
    const speedSelect = document.getElementById('speedSelect');
    const timeInput = document.getElementById('timeInput');

    // Game stats display
    const playerScoreDisplay = document.getElementById('playerScoreDisplay');
    const linesRemainingDisplay = document.getElementById('linesRemainingDisplay');
    const timerDisplay = document.getElementById('timerDisplay');
    const runnerStatusContainer = document.getElementById('runnerStatusContainer');

    // Game variables
    let board = [];
    let currentPiece;
    let nextPiece;
    let gameLoopId;
    let isPaused = false;
    let gameOver = false;
    let score = 0;
    let linesToWin;
    let totalGameTime; // in seconds
    let timeLeft; // in seconds
    let timerInterval;

    // Speeds in milliseconds. These are now much faster.
    const SPEEDS = {
        'slow': 1000,
        'medium': 500,
        'fast': 200,
        'very-fast': 100,
        'insane': 50
    };
    let dropInterval;

    // Runner variables
    let runners = [];
    let maxShots;
    let shotRechargeTime; // in seconds

    // --- Piece Definitions ---
    const PIECES = {
        'I': [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        'J': [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        'L': [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        'O': [
            [1, 1],
            [1, 1]
        ],
        'S': [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        'T': [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        'Z': [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    };
    const COLORS = {
        'I': 'cyan',
        'J': 'blue',
        'L': 'orange',
        'O': 'yellow',
        'S': 'green',
        'T': 'purple',
        'Z': 'red'
// Firebase settings. For compatibility only, not used in this game.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Get DOM elements for the UI
const mainContainer = document.querySelector('.main-container');
const menuScreen = document.getElementById('menuScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameMessageElement = document.getElementById('gameMessage');
const playerScoreDisplay = document.getElementById('playerScoreDisplay');
const linesRemainingDisplay = document.getElementById('linesRemainingDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const runnerStatusContainer = document.getElementById('runnerStatusContainer');
const runnerCountSelect = document.getElementById('runnerCountSelect');
const linesInput = document.getElementById('linesInput');
const maxShotsInput = document.getElementById('maxShotsInput');
const rechargeTimeInput = document.getElementById('rechargeTimeInput');
const speedSelect = document.getElementById('speedSelect');
const timeInput = document.getElementById('timeInput');
const startGameButton = document.getElementById('startGameButton');
const resumeButton = document.getElementById('resumeButton');
const backToMenuButton = document.getElementById('backToMenuButton');

// Game state variables
let gameGrid = createGrid();
let currentBlock;
let characters = [];
let projectiles = [];
let gameOver = true;
let isPaused = false;
let score = 0;
let linesRemaining = 5;
let dropInterval = 500;
let speedIntervalId;
let gameTime = 300;
let countdownIntervalId;
let maxShotsPerRunner = 7;
let shotRechargeTime = 30000;

// State variables for fluid and simultaneous controls
let keysPressed = {};
let moveCounter = 0;
const moveInterval = 50;
let lastRechargeTime = 0;

// State variables for menu navigation
let menuOptions = [];
let focusedMenuElementIndex = 0;
let pauseMenuOptions = [];
let focusedPauseMenuElementIndex = 0;

const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'
];

const shapes = [
    // I
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    // J
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    // L
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    // O
    [[4, 4], [4, 4]],
    // S
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    // T
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    // Z
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

/**
 * Creates the game grid.
 * @returns {Array<Array<number>>} The initialized game grid.
 */
function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/**
 * Creates a new block and sets it as the current block.
 */
function newBlock() {
    const shapeIndex = Math.floor(Math.random() * shapes.length);
    const shape = JSON.parse(JSON.stringify(shapes[shapeIndex]));
    const color = colors[shapeIndex];
    currentBlock = {
        shape: shape,
        color: color,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: -shape.length,
        isFalling: true
};
}

    // --- Game Logic Functions ---

    // Initialize the game board
    function createBoard() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    // Get a random new piece
    function getNewPiece() {
        const keys = Object.keys(PIECES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return {
            shape: PIECES[randomKey],
            color: COLORS[randomKey],
            x: Math.floor(COLS / 2) - Math.floor(PIECES[randomKey][0].length / 2),
            y: 0
        };
    }

    // Check for collisions
    function collide(piece, dx, dy, rotatedShape) {
        const shape = rotatedShape || piece.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newX = piece.x + x + dx;
                    const newY = piece.y + y + dy;
                    if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX])) {
                        return true;
                    }
                }
/**
 * Draws the game state on the canvas.
 */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (gameGrid[r][c] !== 0) {
                ctx.fillStyle = gameGrid[r][c];
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#2d3748';
                ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}
}
        return false;
}

    // Merge the piece onto the board
    function merge(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    board[piece.y + y][piece.x + x] = piece.color;
    if (currentBlock && currentBlock.isFalling) {
        for (let r = 0; r < currentBlock.shape.length; r++) {
            for (let c = 0; c < currentBlock.shape[r].length; c++) {
                if (currentBlock.shape[r][c] !== 0) {
                    ctx.fillStyle = currentBlock.color;
                    ctx.fillRect((currentBlock.x + c) * BLOCK_SIZE, (currentBlock.y + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#2d3748';
                    ctx.strokeRect((currentBlock.x + c) * BLOCK_SIZE, (currentBlock.y + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}
}
}
}

    // Clear completed lines
    function clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++; // Recheck the same line
            }
    characters.forEach(character => {
        if (!character.isEliminated) {
            ctx.fillStyle = character.color;
            ctx.fillRect(character.x, character.y, character.width, character.height);
}
        if (linesCleared > 0) {
            score += linesCleared * 100;
            playerScoreDisplay.textContent = score;
            linesToWin -= linesCleared;
            linesRemainingDisplay.textContent = linesToWin > 0 ? linesToWin : 0;
            checkWinCondition();
    });

    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
}

/**
 * Checks for collision between a block and the game boundaries or other blocks.
 * @param {object} block The block to check.
 * @param {number} offsetX Horizontal offset.
 * @param {number} offsetY Vertical offset.
 * @returns {boolean} True if a collision is detected, otherwise false.
 */
function checkBlockCollision(block, offsetX = 0, offsetY = 0) {
    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const newX = block.x + c + offsetX;
                const newY = block.y + r + offsetY;
                if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && gameGrid[newY][newX] !== 0)) {
                    return true;
                }
            }
}
}
    return false;
}

    // Rotate the current piece
    function rotate(piece) {
        const newShape = piece.shape[0].map((_, colIndex) => piece.shape.map(row => row[colIndex]).reverse());
        if (!collide(piece, 0, 0, newShape)) {
            piece.shape = newShape;
        }
/**
 * Checks for landing collision of a character.
 * @param {object} character The character to check.
 */
function checkLandingCollision(character) {
    if (character.isEliminated) return;

    character.isStanding = false;

    const nextY = character.y + character.velocityY;

    const charBottomRow = Math.floor((nextY + character.height) / BLOCK_SIZE);
    const charCol = character.col;
    if (charBottomRow < ROWS && charCol >= 0 && charCol < COLS && gameGrid[charBottomRow][charCol] !== 0) {
        character.y = charBottomRow * BLOCK_SIZE - character.height;
        character.isStanding = true;
        character.velocityY = 0;
}

    // Drop the piece
    function drop() {
        if (!collide(currentPiece, 0, 1)) {
            currentPiece.y++;
        } else {
            merge(currentPiece);
            clearLines();
            currentPiece = nextPiece;
            nextPiece = getNewPiece();
            if (collide(currentPiece, 0, 0)) {
                endGame();
    if (currentBlock && currentBlock.isFalling) {
        for (let r = 0; r < currentBlock.shape.length; r++) {
            for (let c = 0; c < currentBlock.shape[r].length; c++) {
                if (currentBlock.shape[r][c] !== 0) {
                    const blockTopY = (currentBlock.y + r) * BLOCK_SIZE;
                    const blockLeftX = (currentBlock.x + c) * BLOCK_SIZE;
                    const blockRightX = blockLeftX + BLOCK_SIZE;

                    if (nextY + character.height >= blockTopY && nextY + character.height < blockTopY + character.velocityY + 1) {
                        if (character.x < blockRightX && character.x + character.width > blockLeftX) {
                            character.y = blockTopY - character.height;
                            character.isStanding = true;
                            character.velocityY = 0;
                        }
                    }
                }
}
}
}

    // --- Runner AI and Shot Logic ---
    if (character.y + character.height >= canvas.height) {
        character.y = canvas.height - character.height;
        character.isStanding = true;
        character.velocityY = 0;
    }
}

/**
 * Checks for horizontal collision of the character with the game grid and falling block.
 * @param {object} character The character to check.
 * @param {number} dir Direction of movement (-1 for left, 1 for right).
 * @returns {boolean} True if a collision is detected, otherwise false.
 */
function checkCharacterHorizontalCollision(character, dir) {
    if (character.isEliminated) return true;

    const charTopRow = Math.floor(character.y / BLOCK_SIZE);
    const charBottomRow = Math.floor((character.y + character.height - 1) / BLOCK_SIZE);
    const nextCol = character.col + dir;

    if (nextCol < 0 || nextCol >= COLS) {
        return true;
    }

    let isBlocked = false;

    // Runner class
    class Runner {
        constructor(id, linesNeeded) {
            this.id = id;
            this.linesNeeded = linesNeeded;
            this.shotsRemaining = maxShots;
            this.rechargeTimer = shotRechargeTime;
            this.rechargeInterval = null;
    for (let r = charTopRow; r <= charBottomRow; r++) {
        if (r >= 0 && r < ROWS && gameGrid[r][nextCol] !== 0) {
            isBlocked = true;
            break;
}
    }

        // Simulates a runner's game and checks for a win
        update() {
            if (this.linesNeeded <= 0) {
                return true; // Runner has won
            }
            if (Math.random() < 0.01 && this.shotsRemaining > 0) {
                this.fireShot();
            }
    if (isBlocked) {
        const spaceAboveIsClear = (charTopRow - 1 >= 0 && gameGrid[charTopRow - 1][nextCol] === 0);
        if (spaceAboveIsClear) {
            character.y = (charTopRow - 1) * BLOCK_SIZE;
return false;
}
        return true;
    }

        // Fires a shot, adding a garbage line to the player's board
        fireShot() {
            if (this.shotsRemaining > 0) {
                this.shotsRemaining--;
                const garbageLine = Array(COLS).fill(COLORS['T']).map((color, index) => {
                    return index === Math.floor(Math.random() * COLS) ? 0 : color;
                });
                board.shift();
                board.push(garbageLine);
                // Restart recharge timer
                this.rechargeTimer = shotRechargeTime;
                this.startRecharge();
                updateRunnerStatus();
            }
        }
    if (currentBlock && currentBlock.isFalling) {
        const blockGridX = Math.floor(currentBlock.x);
        const blockGridY = Math.floor(currentBlock.y);

        for (let r = 0; r < currentBlock.shape.length; r++) {
            for (let c = 0; c < currentBlock.shape[r].length; c++) {
                if (currentBlock.shape[r][c] !== 0) {
                    const blockPieceX = blockGridX + c;
                    const blockPieceY = blockGridY + r;

        // Starts the shot recharge timer
        startRecharge() {
            if (this.rechargeInterval) clearInterval(this.rechargeInterval);
            this.rechargeInterval = setInterval(() => {
                if (!isPaused && this.shotsRemaining < maxShots) {
                    this.rechargeTimer--;
                    if (this.rechargeTimer <= 0) {
                        this.shotsRemaining++;
                        this.rechargeTimer = shotRechargeTime;
                    if (nextCol === blockPieceX) {
                        for (let charRow = charTopRow; charRow <= charBottomRow; charRow++) {
                            if (charRow === blockPieceY) {
                                return true;
                            }
                        }
}
                    updateRunnerStatus();
}
            }, 1000);
        }
    }

    // Update the runner status panel
    function updateRunnerStatus() {
        runnerStatusContainer.innerHTML = '';
        runners.forEach(runner => {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'player-status-item';
            statusDiv.innerHTML = `
                <h4 class="text-white">Runner ${runner.id}</h4>
                <p>Lines to Win: ${runner.linesNeeded > 0 ? runner.linesNeeded : 0}</p>
                <p>Shots Remaining: ${runner.shotsRemaining}</p>
                <p>Recharge Time: <span id="rechargeTimer-${runner.id}">${runner.rechargeTimer}</span>s</p>
                <div class="shot-recharge-bar">
                    <div class="shot-recharge-progress" style="width: ${((shotRechargeTime - runner.rechargeTimer) / shotRechargeTime) * 100}%"></div>
                </div>
            `;
            runnerStatusContainer.appendChild(statusDiv);
        });
            }
        }
}

    // --- Drawing Functions ---
    return false;
}

    // Draw a single cell
    function drawCell(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        ctx.strokeStyle = '#2d3748';
        ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    }
/**
 * Checks for a crushing collision between a block and a character.
 * @param {object} block The falling block.
 * @param {number} offsetX Horizontal offset.
 * @param {number} offsetY Vertical offset.
 * @returns {boolean} True if a crush collision is imminent.
 */
function checkCrushCollision(block, offsetX = 0, offsetY = 0) {
    const potentialCrushers = [];
    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const blockCol = block.x + c + offsetX;
                const blockRow = block.y + r + offsetY;

    // Draw the entire board
    function drawBoard() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    drawCell(x, y, board[y][x]);
                } else {
                    ctx.fillStyle = '#2d3748';
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                for (const character of characters) {
                    if (character.isEliminated) continue;

                    const charCol = character.col;
                    const charTopRow = Math.floor(character.y / BLOCK_SIZE);
                    const charBottomRow = Math.floor((character.y + character.height - 1) / BLOCK_SIZE);

                    if (blockCol === charCol && blockRow === charTopRow) {
                        potentialCrushers.push(character);
                    } else if (blockCol === charCol && blockRow > charTopRow && blockRow <= charBottomRow) {
                        eliminateRunner(character);
                        return true;
                    }
}
}
}
}
    for (const character of potentialCrushers) {
        if (character.isStanding) {
            return true;
        }
    }

    return false;
}

/**
 * Pushes runners horizontally when the block moves.
 * @param {object} block The falling block.
 * @param {number} dir Direction of movement (-1 or 1).
 * @returns {boolean} True if the block successfully moved.
 */
function checkAndPushRunners(block, dir) {
    let blockMoved = false;

    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const blockCol = block.x + c;
                const blockRow = block.y + r;

                for (const character of characters) {
                    if (character.isEliminated) continue;

                    const charCol = character.col;
                    const charRow = Math.floor(character.y / BLOCK_SIZE);

                    if (blockCol + dir === charCol && blockRow === charRow) {
                        const nextCharCol = charCol + dir;

                        const isBlockedByWorld = nextCharCol < 0 || nextCharCol >= COLS || (gameGrid[charRow] && gameGrid[charRow][nextCharCol] !== 0);

    // Draw the current falling piece
    function drawPiece(piece) {
        if (!piece) return;
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    drawCell(piece.x + x, piece.y + y, piece.color);
                        if (isBlockedByWorld) {
                            const relativeCol = charCol - block.x;
                            const relativeRow = charRow - block.y;
                            if (relativeRow >= 0 && relativeRow < block.shape.length && relativeCol >= 0 && relativeCol < block.shape[relativeRow].length) {
                                if (block.shape[relativeRow][relativeCol] !== 0) {
                                    eliminateRunner(character);
                                }
                            } else {
                                eliminateRunner(character);
                            }
                        } else {
                            character.col += dir;
                            character.x = character.col * BLOCK_SIZE;
                        }
                    }
}
}
}
}

    // The main drawing function
    function draw() {
        drawBoard();
        drawPiece(currentPiece);
    if (!checkBlockCollision(block, dir, 0)) {
        blockMoved = true;
        block.x += dir;
    }
    return blockMoved;
}

/**
 * Checks and clears full lines from the grid.
 */
function checkLineClears() {
    let clearedCount = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        const isLineFull = gameGrid[r].every(cell => cell !== 0);
        if (isLineFull) {
            gameGrid.splice(r, 1);
            const newRow = Array(COLS).fill(0);
            gameGrid.unshift(newRow);
            clearedCount++;
            r++;
        }
}

    // --- Game Flow Functions ---
    if (clearedCount > 0) {
        linesRemaining -= clearedCount;
        if (linesRemaining < 0) linesRemaining = 0;
        const linesSpan = linesRemainingDisplay.querySelector('span:last-child');
        linesSpan.textContent = linesRemaining;

        if (linesRemaining <= 0) {
            endGame(`O Controlador de Blocos venceu!`);
            return;
        }
    }
}

    // Game Over logic
    function endGame() {
        gameOver = true;
        isPaused = true;
        showGameMessage('Game Over!');
        clearInterval(timerInterval);
        runners.forEach(r => clearInterval(r.rechargeInterval));
/**
 * Locks a block into the grid.
 */
function solidifyBlock() {
    const isBlockEmpty = currentBlock.shape.flat().every(cell => cell === 0);
    if (isBlockEmpty) {
        newBlock();
        return;
}

    // Win condition check
    function checkWinCondition() {
        if (linesToWin <= 0) {
            gameOver = true;
            isPaused = true;
            showGameMessage('You Win!');
            clearInterval(timerInterval);
            runners.forEach(r => clearInterval(r.rechargeInterval));
        } else {
            let runnerWon = runners.some(runner => runner.update());
            if (runnerWon) {
                gameOver = true;
                isPaused = true;
                showGameMessage('A Runner has Won!');
                clearInterval(timerInterval);
                runners.forEach(r => clearInterval(r.rechargeInterval));
    for (let r = 0; r < currentBlock.shape.length; r++) {
        for (let c = 0; c < currentBlock.shape[r].length; c++) {
            if (currentBlock.shape[r][c] !== 0) {
                const newX = currentBlock.x + c;
                const newY = currentBlock.y + r;

                for (const character of characters) {
                    if (character.isEliminated) continue;

                    const charCol = character.col;
                    const charRow = Math.floor(character.y / BLOCK_SIZE);

                    if (newX === charCol && newY === charRow) {
                        eliminateRunner(character);
                    }
                }
}
}
}

    // Show a message on the game screen
    function showGameMessage(message) {
        gameMessage.textContent = message;
        gameMessage.style.display = 'block';
    for (let r = 0; r < currentBlock.shape.length; r++) {
        for (let c = 0; c < currentBlock.shape[r].length; c++) {
            if (currentBlock.shape[r][c] !== 0) {
                const newY = currentBlock.y + r;
                const newX = currentBlock.x + c;
                if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
                    gameGrid[newY][newX] = currentBlock.color;
                } else {
                    endGame("Os Runners venceram! O bloco saiu dos limites.");
                    return;
                }
            }
        }
}
    newBlock();
    checkLineClears();
}

    // Hide the game message
    function hideGameMessage() {
        gameMessage.style.display = 'none';
let lastTime = 0;
let dropCounter = 0;

/**
 * Main game loop.
 * @param {number} time The timestamp from requestAnimationFrame.
 */
function gameLoop(time = 0) {
    if (gameOver || isPaused) {
        // If the game is paused or over, we still need to draw the last frame.
        draw();
        return;
}

    // Pause the game
    function pauseGame() {
        if (!gameOver) {
            isPaused = true;
            pauseScreen.style.display = 'flex';
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        if (!currentBlock || currentBlock.shape.flat().every(cell => cell === 0)) {
            newBlock();
}
    }

    // Resume the game
    function resumeGame() {
        isPaused = false;
        pauseScreen.style.display = 'none';
        if (!gameOver) {
            gameLoopId = requestAnimationFrame(gameLoop);
        if (currentBlock) {
            if (checkCrushCollision(currentBlock, 0, 1)) {
                 let activeRunners = characters.filter(c => !c.isEliminated).length;
                 if (activeRunners === 0) {
                    endGame("O Controlador de Blocos venceu! Todos os runners foram esmagados.");
                    return;
                 }
            }
            if (!checkBlockCollision(currentBlock, 0, 1)) {
                currentBlock.y++;
            } else {
                solidifyBlock();
            }
}
        dropCounter = 0;
}

    // Main game loop
    let lastDropTime = 0;
    function gameLoop(time) {
        if (isPaused) {
            return;
    moveCounter += deltaTime;
    if (moveCounter > moveInterval) {
        if (keysPressed['a'] || keysPressed['A']) { move(currentBlock, -1); }
        if (keysPressed['d'] || keysPressed['D']) { move(currentBlock, 1); }
        if (keysPressed['s'] || keysPressed['S']) { softDrop(); }

        if (characters[0] && !characters[0].isEliminated) {
            if (keysPressed['ArrowLeft']) { moveCharacter(characters[0], -1); }
            if (keysPressed['ArrowRight']) { moveCharacter(characters[0], 1); }
}
        if (time - lastDropTime > dropInterval) {
            drop();
            lastDropTime = time;
        if (characters[1] && !characters[1].isEliminated) {
            if (keysPressed['f'] || keysPressed['F']) { moveCharacter(characters[1], -1); }
            if (keysPressed['h'] || keysPressed['H']) { moveCharacter(characters[1], 1); }
}

        draw();
        checkWinCondition();
        if (!gameOver) {
            gameLoopId = requestAnimationFrame(gameLoop);
        if (characters[2] && !characters[2].isEliminated) {
            if (keysPressed['j'] || keysPressed['J']) { moveCharacter(characters[2], -1); }
            if (keysPressed['l'] || keysPressed['L']) { moveCharacter(characters[2], 1); }
}

        moveCounter = 0;
}

    // --- Event Listeners ---
    characters.forEach(character => {
        if (character.isEliminated) return;

    // Keyboard controls for the player
    document.addEventListener('keydown', e => {
        if (isPaused) {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                resumeGame();
        character.velocityY += character.gravity;
        character.y += character.velocityY;

        if (currentBlock && currentBlock.isFalling && character.velocityY < 0) {
            const blockGridY = Math.floor(currentBlock.y);
            const blockGridX = Math.floor(currentBlock.x);
            const charTopY = character.y;
            const charCol = character.col;
            const charRow = Math.floor(charTopY / BLOCK_SIZE);

            for (let r = 0; r < currentBlock.shape.length; r++) {
                for (let c = 0; c < currentBlock.shape[r].length; c++) {
                    if (currentBlock.shape[r][c] !== 0) {
                        if ((blockGridY + r) === charRow && (blockGridX + c) === charCol) {
                            eliminateRunner(character);
                            return;
                        }
                    }
                }
}
            return;
}
        if (gameOver) return;

        switch (e.key) {
            case 'ArrowLeft':
                if (!collide(currentPiece, -1, 0)) currentPiece.x--;
                break;
            case 'ArrowRight':
                if (!collide(currentPiece, 1, 0)) currentPiece.x++;
                break;
            case 'ArrowDown':
                drop();
                break;
            case 'ArrowUp':
                rotate(currentPiece);
                break;
            case 'p':
            case 'P':
            case 'Escape':
                pauseGame();
                break;

        checkLandingCollision(character);

        if (character.y > canvas.height) {
            eliminateRunner(character);
}
        draw();
});

    // Start a new game
    startGameButton.addEventListener('click', () => {
        // Hide menu, show game
        menuScreen.style.display = 'none';
        mainContainer.style.display = 'flex';

        // Get settings from menu
        const runnerCount = parseInt(runnerCountSelect.value, 10);
        linesToWin = parseInt(linesInput.value, 10);
        maxShots = parseInt(maxShotsInput.value, 10);
        shotRechargeTime = parseInt(rechargeTimeInput.value, 10);
        const speed = speedSelect.value;
        totalGameTime = parseInt(timeInput.value, 10) * 60; // Convert minutes to seconds
        dropInterval = SPEEDS[speed];

        // Reset game state
        createBoard();
        score = 0;
        gameOver = false;
        isPaused = false;
        timeLeft = totalGameTime;
        runners = [];
        for (let i = 1; i <= runnerCount; i++) {
            runners.push(new Runner(i, linesToWin));
        }

        currentPiece = getNewPiece();
        nextPiece = getNewPiece();

        // Update UI
        playerScoreDisplay.textContent = score;
        linesRemainingDisplay.textContent = linesToWin;
        updateRunnerStatus();
        hideGameMessage();

        // Start timer
        timerInterval = setInterval(() => {
            if (!isPaused && timeLeft > 0) {
                timeLeft--;
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                if (timeLeft <= 0) {
                    endGame();
    projectiles.forEach((p, index) => {
        p.y += p.velocityY;

        const pCol = Math.floor((p.x + p.width / 2) / BLOCK_SIZE);
        const pRow = Math.floor(p.y / BLOCK_SIZE);

        if (currentBlock && currentBlock.isFalling) {
            const blockGridX = Math.floor(currentBlock.x);
            const blockGridY = Math.floor(currentBlock.y);
            const relativeCol = pCol - blockGridX;
            const relativeRow = pRow - blockGridY;

            if (relativeCol >= 0 && relativeCol < currentBlock.shape[0].length &&
                relativeRow >= 0 && relativeRow < currentBlock.shape.length &&
                currentBlock.shape[relativeRow][relativeCol] !== 0) {

                currentBlock.shape[relativeRow][relativeCol] = 0;
                score++;
                projectiles.splice(index, 1);

                const isBlockEmpty = currentBlock.shape.flat().every(cell => cell === 0);
                if (isBlockEmpty) {
                    newBlock();
}
                return;
}
        }, 1000);
        }

        // Start game loop
        gameLoopId = requestAnimationFrame(gameLoop);
        if (pRow >= 0 && pRow < ROWS && pCol >= 0 && pCol < COLS && gameGrid[pRow][pCol] !== 0) {
            gameGrid[pRow][pCol] = 0;
            score++;
            projectiles.splice(index, 1);
            checkLineClears();
        } else if (p.y < 0) {
            projectiles.splice(index, 1);
        }
});

    resumeButton.addEventListener('click', resumeGame);
    backToMenuButton.addEventListener('click', () => {
        clearInterval(timerInterval);
        runners.forEach(r => clearInterval(r.rechargeInterval));
        mainContainer.style.display = 'none';
    const now = Date.now();
    if (now - lastRechargeTime > shotRechargeTime) {
        characters.forEach(c => rechargeShots(c));
        lastRechargeTime = now;
    } else {
        const elapsed = now - lastRechargeTime;
        characters.forEach(c => {
            if (!c.isEliminated && c.shotsRemaining < maxShotsPerRunner) {
                const progress = (elapsed / shotRechargeTime) * 100;
                const progressBar = document.getElementById(`recharge-progress-${c.id}`);
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
            }
        });
    }

    playerScoreDisplay.querySelector('span:last-child').textContent = score;

    draw();
    requestAnimationFrame(gameLoop);
}

/**
 * Rotates a matrix 90 degrees clockwise.
 * @param {Array<Array<number>>} matrix The matrix to rotate.
 * @returns {Array<Array<number>>} The rotated matrix.
 */
function rotate(matrix) {
    const N = matrix.length - 1;
    const result = matrix.map((row, i) =>
        row.map((val, j) => matrix[N - j][i])
    );
    return result;
}

/**
 * Moves the falling block horizontally.
 * @param {object} block The falling block.
 * @param {number} dir Direction of movement (-1 or 1).
 */
function move(block, dir) {
    if (!block) return;
    checkAndPushRunners(block, dir);
}

/**
 * Moves a runner horizontally.
 * @param {object} character The runner to move.
 * @param {number} dir Direction of movement (-1 or 1).
 */
function moveCharacter(character, dir) {
    if (character && !character.isEliminated && !checkCharacterHorizontalCollision(character, dir)) {
        character.col += dir;
        character.x = character.col * BLOCK_SIZE;
    }
}

/**
 * Performs a soft drop on the current block.
 */
function softDrop() {
    if (currentBlock) {
        if (checkCrushCollision(currentBlock, 0, 1)) {
            let activeRunners = characters.filter(c => !c.isEliminated).length;
             if (activeRunners === 0) {
                endGame("O Controlador de Blocos venceu! Todos os runners foram esmagados.");
                return;
             }
        }
        if (!checkBlockCollision(currentBlock, 0, 1)) {
            currentBlock.y++;
        } else {
            solidifyBlock();
        }
    }
}

/**
 * Makes a character jump.
 * @param {object} character The character to make jump.
 */
function jump(character) {
    const jumpStrength = 10;
    if (character && !character.isEliminated && character.isStanding) {
        character.velocityY = -jumpStrength;
        character.isStanding = false;
    }
}

/**
 * Makes a character shoot a projectile.
 * @param {object} character The character shooting.
 */
function shoot(character) {
    if (character && !character.isEliminated) {
        const col = character.col;
        const row = Math.floor(character.y / BLOCK_SIZE);

        if (row >= 0 && row + 1 < ROWS && col >= 0 && col < COLS && gameGrid[row + 1][col] !== 0) {
            gameGrid[row + 1][col] = 0;
            score++;
            checkLineClears();
        }
        else if (character.shotsRemaining > 0) {
            character.shotsRemaining--;
            document.getElementById(`shots-remaining-${character.id}`).textContent = character.shotsRemaining;

            const projectile = {
                x: character.x,
                y: character.y - 5,
                width: BLOCK_SIZE,
                height: BLOCK_SIZE,
                color: character.color,
                velocityY: -10
            };
            projectiles.push(projectile);
        }
    }
}

/**
 * Recharges a character's shots.
 * @param {object} character The character to recharge.
 */
function rechargeShots(character) {
    if (!isPaused && !gameOver && !character.isEliminated && character.shotsRemaining < maxShotsPerRunner) {
        character.shotsRemaining++;
        document.getElementById(`shots-remaining-${character.id}`).textContent = character.shotsRemaining;
        const progressBar = document.getElementById(`recharge-progress-${character.id}`);
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }
}

/**
 * Eliminates a runner from the game.
 * @param {object} character The character to eliminate.
 */
function eliminateRunner(character) {
    character.isEliminated = true;
    const statusElement = document.getElementById(`runner-status-${character.id}`);
    if (statusElement) {
        statusElement.classList.add('bg-red-800');
        statusElement.classList.remove('bg-gray-700');
        statusElement.innerHTML = `<h4>Runner ${character.id + 1}</h4><p class="text-red-300">Eliminado!</p>`;
    }

    const activeRunners = characters.filter(c => !c.isEliminated).length;
    if (activeRunners === 0) {
        endGame("O Controlador de Blocos venceu! Todos os runners foram eliminados.");
    }
}

/**
 * Toggles the pause state of the game.
 */
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.style.display = 'flex';
        pauseMenuOptions = document.querySelectorAll('.pause-menu-option');
        focusedPauseMenuElementIndex = 0;
        updatePauseMenuFocus();
        clearInterval(speedIntervalId);
        clearInterval(countdownIntervalId);
    } else {
pauseScreen.style.display = 'none';
        menuScreen.style.display = 'flex';
    });
        gameLoop();
        startProgressiveSpeed();
        startCountdown();
        lastRechargeTime = Date.now();
    }
}

    // On-screen control button event listeners
    leftButton.addEventListener('click', () => {
        if (!isPaused && !gameOver) {
            if (!collide(currentPiece, -1, 0)) currentPiece.x--;
            draw();
/**
 * Ends the game and shows the final message.
 * @param {string} message The message to display.
 */
function endGame(message) {
    gameOver = true;
    gameMessageElement.textContent = message;
    gameMessageElement.style.display = 'flex';
    clearInterval(speedIntervalId);
    clearInterval(countdownIntervalId);
    setTimeout(showMenu, 3000);
}

/**
 * Shows the main menu screen.
 */
function showMenu() {
    mainContainer.style.display = 'none';
    gameMessageElement.style.display = 'none';
    pauseScreen.style.display = 'none';
    menuScreen.style.display = 'flex';
    clearInterval(speedIntervalId);
    clearInterval(countdownIntervalId);

    menuOptions = document.querySelectorAll('.menu-option');
    focusedMenuElementIndex = 0;
    updateMenuFocus();
}

/**
 * Updates the focus of the main menu items.
 */
function updateMenuFocus() {
    menuOptions.forEach((option, index) => {
        if (index === focusedMenuElementIndex) {
            option.classList.add('focused-menu-item');
        } else {
            option.classList.remove('focused-menu-item');
}
});
}

    rightButton.addEventListener('click', () => {
        if (!isPaused && !gameOver) {
            if (!collide(currentPiece, 1, 0)) currentPiece.x++;
            draw();
/**
 * Updates the focus of the pause menu items.
 */
function updatePauseMenuFocus() {
    pauseMenuOptions.forEach((option, index) => {
        if (index === focusedPauseMenuElementIndex) {
            option.classList.add('focused-menu-item');
        } else {
            option.classList.remove('focused-menu-item');
}
});
}

/**
 * Formats seconds into a MM:SS string.
 * @param {number} seconds The number of seconds.
 * @returns {string} The formatted time string.
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

    rotateButton.addEventListener('click', () => {
/**
 * Starts the progressive increase of game speed.
 */
function startProgressiveSpeed() {
    speedIntervalId = setInterval(() => {
if (!isPaused && !gameOver) {
            rotate(currentPiece);
            draw();
            dropInterval = Math.max(100, dropInterval * 0.7);
}
    });
    }, 60000);
}

    downButton.addEventListener('click', () => {
/**
 * Starts the game countdown timer.
 */
function startCountdown() {
    countdownIntervalId = setInterval(() => {
if (!isPaused && !gameOver) {
            drop();
            draw();
            gameTime--;
            const timerSpan = timerDisplay.querySelector('span:last-child');
            timerSpan.textContent = formatTime(gameTime);
            if (gameTime <= 0) {
                endGame("Os Runners venceram! O tempo acabou.");
            }
}
    }, 1000);
}

/**
 * Creates the UI elements for runner status.
 */
function createRunnerStatusUI() {
    runnerStatusContainer.innerHTML = '';
    characters.forEach((character, index) => {
        const statusDiv = document.createElement('div');
        statusDiv.id = `runner-status-${index}`;
        statusDiv.className = 'player-status-item bg-gray-700 rounded-lg p-3 shadow-md';
        statusDiv.innerHTML = `
            <h4 class="font-bold text-lg" style="color:${character.color}">Runner ${index + 1}</h4>
            <p class="text-sm mt-1">Tiros Restantes: <span id="shots-remaining-${index}" class="font-semibold">${character.shotsRemaining}</span></p>
            <div class="shot-recharge-bar mt-2">
                <div id="recharge-progress-${index}" class="shot-recharge-progress" style="width: 0%;"></div>
            </div>
        `;
        runnerStatusContainer.appendChild(statusDiv);
});
    
    // The pause button on the screen now works too
    pauseButton.addEventListener('click', () => {
        pauseGame();
    });
}

    // Initial draw to show the empty board
    draw();
/**
 * Initializes and starts the game.
 */
function startGame() {
    console.log('--- Função startGame() chamada. ---');

    menuScreen.style.display = 'none';
    mainContainer.style.display = 'flex';

    const runnerCount = parseInt(runnerCountSelect.value);
    const speedOptions = { 'slow': 800, 'medium': 500, 'fast': 300, 'very-fast': 150 };

    const parsedLines = parseInt(linesInput.value);
    const parsedMaxShots = parseInt(maxShotsInput.value);
    const parsedRechargeTime = parseInt(rechargeTimeInput.value);
    const selectedSpeed = speedSelect.value;
    const parsedTime = parseInt(timeInput.value);

    linesRemaining = isNaN(parsedLines) || parsedLines <= 0 ? 5 : parsedLines;
    maxShotsPerRunner = isNaN(parsedMaxShots) || parsedMaxShots <= 0 ? 7 : parsedMaxShots;
    shotRechargeTime = isNaN(parsedRechargeTime) || parsedRechargeTime <= 0 ? 30000 : parsedRechargeTime * 1000;
    dropInterval = speedOptions[selectedSpeed] || 500;
    gameTime = isNaN(parsedTime) || parsedTime <= 0 ? 300 : parsedTime * 60;

    gameGrid = createGrid();
    gameOver = false;
    isPaused = false;
    score = 0;
    projectiles = [];
    characters = [];

    const runnerColors = ['#fde047', '#a78bfa', '#4ade80'];
    for (let i = 0; i < runnerCount; i++) {
        characters.push({
            id: i,
            col: Math.floor(COLS / 2) - 2 + i * 2,
            x: (Math.floor(COLS / 2) - 2 + i * 2) * BLOCK_SIZE,
            y: canvas.height - BLOCK_SIZE,
            width: BLOCK_SIZE, height: BLOCK_SIZE,
            color: runnerColors[i],
            isStanding: false, velocityY: 0, gravity: 0.5, jumpStrength: 10,
            shotsRemaining: maxShotsPerRunner,
            isEliminated: false
        });
    }

    playerScoreDisplay.querySelector('span:last-child').textContent = score;
    linesRemainingDisplay.querySelector('span:last-child').textContent = linesRemaining;
    timerDisplay.querySelector('span:last-child').textContent = formatTime(gameTime);

    createRunnerStatusUI();

    newBlock();
    startProgressiveSpeed();
    startCountdown();
    lastRechargeTime = Date.now();

    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
window.addEventListener('keydown', e => {
    if (menuScreen.style.display === 'flex') {
        if (e.key === 'ArrowUp') {
            focusedMenuElementIndex = (focusedMenuElementIndex - 1 + menuOptions.length) % menuOptions.length;
            updateMenuFocus();
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            focusedMenuElementIndex = (focusedMenuElementIndex + 1) % menuOptions.length;
            updateMenuFocus();
            e.preventDefault();
        } else if (e.key === 'Enter') {
            const focusedElement = menuOptions[focusedMenuElementIndex];
            if (focusedElement.tagName === 'BUTTON') {
                focusedElement.click();
            } else if (focusedElement.tagName === 'SELECT') {
                const event = new MouseEvent('mousedown');
                focusedElement.dispatchEvent(event);
            } else if (focusedElement.tagName === 'INPUT') {
                focusedElement.focus();
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const focusedElement = menuOptions[focusedMenuElementIndex];
            if (focusedElement.tagName === 'SELECT') {
                const options = focusedElement.options;
                let selectedIndex = focusedElement.selectedIndex;
                if (e.key === 'ArrowLeft') {
                    selectedIndex = (selectedIndex - 1 + options.length) % options.length;
                } else {
                    selectedIndex = (selectedIndex + 1) % options.length;
                }
                focusedElement.selectedIndex = selectedIndex;
            } else if (focusedElement.tagName === 'INPUT' && focusedElement.type === 'number') {
                let value = parseInt(focusedElement.value);
                const min = parseInt(focusedElement.min);
                const max = parseInt(focusedElement.max) || Infinity;

                if (e.key === 'ArrowLeft') {
                    value = Math.max(min, value - 1);
                } else {
                    value = Math.min(max, value + 1);
                }
                focusedElement.value = value;
            }
            e.preventDefault();
        }
        return;
    }

    if (pauseScreen.style.display === 'flex') {
        if (e.key === 'ArrowUp') {
            focusedPauseMenuElementIndex = (focusedPauseMenuElementIndex - 1 + pauseMenuOptions.length) % pauseMenuOptions.length;
            updatePauseMenuFocus();
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            focusedPauseMenuElementIndex = (focusedPauseMenuElementIndex + 1) % pauseMenuOptions.length;
            updatePauseMenuFocus();
            e.preventDefault();
        } else if (e.key === 'Enter') {
            pauseMenuOptions[focusedPauseMenuElementIndex].click();
            e.preventDefault();
        }
        return;
    }

    if (e.key === 'p' || e.key === 'P') {
        togglePause();
    }
    keysPressed[e.key] = true;

    if (!isPaused && !gameOver) {
        if (e.key === 'w' || e.key === 'W') {
            if (currentBlock) {
                const rotatedBlock = rotate(currentBlock.shape);
                if (!checkBlockCollision({ ...currentBlock, shape: rotatedBlock })) {
                    currentBlock.shape = rotatedBlock;
                }
            }
        }
        if (characters[0] && (e.key === 'ArrowUp')) { jump(characters[0]); }
        if (characters[0] && (e.key === 'ArrowDown')) { shoot(characters[0]); }

        if (characters[1] && (e.key === 't' || e.key === 'T')) { jump(characters[1]); }
        if (characters[1] && (e.key === 'g' || e.key === 'G')) { shoot(characters[1]); }

        if (characters[2] && (e.key === 'i' || e.key === 'I')) { jump(characters[2]); }
        if (characters[2] && (e.key === 'k' || e.key === 'K')) { shoot(characters[2]); }
    }
});

window.addEventListener('keyup', e => {
    keysPressed[e.key] = false;
});

// Listener for the Start Game button
startGameButton.addEventListener('click', () => {
    console.log('Botão de Iniciar Jogo clicado!');
    startGame();
});

// Listeners for the pause menu buttons
resumeButton.addEventListener('click', togglePause);
backToMenuButton.addEventListener('click', () => {
    gameOver = true;
    showMenu();
});

window.onload = function() {
    console.log('--- window.onload() executado. ---');
    showMenu();
}

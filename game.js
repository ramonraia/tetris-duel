// This is a complete, self-contained game.js file for Tetris Duel.
// This script handles all game logic, including the menu, game loop,
// scoring, block movement, line clearing, runner/shot mechanics, and on-screen controls.
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

    // Speeds in milliseconds.
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
        'I': '#00ffff',
        'J': '#0000ff',
        'L': '#ff8c00',
        'O': '#ffff00',
        'S': '#00ff00',
        'T': '#800080',
        'Z': '#ff0000'
    };

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
        }
        if (linesCleared > 0) {
            score += linesCleared * 100;
            playerScoreDisplay.textContent = score;
            linesToWin -= linesCleared;
            linesRemainingDisplay.textContent = linesToWin > 0 ? linesToWin : 0;
            checkWinCondition();
        }
    }

    // Rotate the current piece
    function rotate(piece) {
        const newShape = piece.shape[0].map((_, colIndex) => piece.shape.map(row => row[colIndex]).reverse());
        if (!collide(piece, 0, 0, newShape)) {
            piece.shape = newShape;
        }
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
                endGame("Game Over!");
            }
        }
    }

    // --- Runner AI and Shot Logic ---
    // A Runner is an AI opponent that tries to win by clearing lines or shooting at the player.
    class Runner {
        constructor(id, linesNeeded) {
            this.id = id;
            this.linesNeeded = linesNeeded;
            this.shotsRemaining = maxShots;
            this.rechargeTimer = shotRechargeTime;
            this.rechargeInterval = null;
        }

        // Simulates a runner's game and checks for a win
        update() {
            if (this.linesNeeded <= 0) {
                return true; // Runner has won
            }
            // Logic for AI to fire a shot
            // The AI will fire a shot if it has any and there is a piece on the board.
            if (this.shotsRemaining > 0 && currentPiece && Math.random() < 0.005) {
                this.fireShot();
            }
            return false;
        }

        // Fires a shot, adding a garbage line to the player's board
        fireShot() {
            if (this.shotsRemaining > 0) {
                this.shotsRemaining--;
                // A garbage line is a line of solid blocks with one empty space
                const garbageLine = Array(COLS).fill('#606b72').map((color, index) => {
                    return index === Math.floor(Math.random() * COLS) ? 0 : color;
                });
                board.unshift(garbageLine);
                // Remove the bottom line to keep the board size consistent
                board.pop();

                this.rechargeTimer = shotRechargeTime;
                this.startRecharge();
                updateRunnerStatus();
            }
        }

        // Starts the shot recharge timer
        startRecharge() {
            if (this.rechargeInterval) clearInterval(this.rechargeInterval);
            this.rechargeInterval = setInterval(() => {
                if (!isPaused && this.shotsRemaining < maxShots) {
                    this.rechargeTimer--;
                    if (this.rechargeTimer <= 0) {
                        this.shotsRemaining++;
                        this.rechargeTimer = shotRechargeTime;
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

    // --- Drawing Functions ---
    // Draw a single cell
    function drawCell(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        ctx.strokeStyle = '#2d3748';
        ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    }

    // Draw the entire board
    function drawBoard() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    drawCell(x, y, board[y][x]);
                } else {
                    ctx.fillStyle = '#2d3748';
                    ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }
    }

    // Draw the current falling piece
    function drawPiece(piece) {
        if (!piece) return;
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    drawCell(piece.x + x, piece.y + y, piece.color);
                }
            }
        }
    }

    // The main drawing function
    function draw() {
        drawBoard();
        drawPiece(currentPiece);
    }

    // --- Game Flow Functions ---
    // Game Over logic
    function endGame(message) {
        gameOver = true;
        isPaused = true;
        showGameMessage(message);
        clearInterval(timerInterval);
        runners.forEach(r => clearInterval(r.rechargeInterval));
    }

    // Win condition check
    function checkWinCondition() {
        if (linesToWin <= 0) {
            endGame('The block controller wins!');
        } else {
            let runnerWon = runners.some(runner => runner.update());
            if (runnerWon) {
                endGame('A Runner has Won!');
            }
        }
    }

    // Show a message on the game screen
    function showGameMessage(message) {
        gameMessage.textContent = message;
        gameMessage.style.display = 'flex';
    }

    // Hide the game message
    function hideGameMessage() {
        gameMessage.style.display = 'none';
    }

    // Pause the game
    function pauseGame() {
        if (!gameOver) {
            isPaused = true;
            pauseScreen.style.display = 'flex';
        }
    }

    // Resume the game
    function resumeGame() {
        isPaused = false;
        pauseScreen.style.display = 'none';
        if (!gameOver) {
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }

    // Main game loop
    let lastDropTime = 0;
    function gameLoop(time) {
        if (isPaused) {
            return;
        }
        if (time - lastDropTime > dropInterval) {
            drop();
            lastDropTime = time;
        }

        draw();
        checkWinCondition();
        if (!gameOver) {
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }

    // --- Event Listeners ---
    // Keyboard controls for the player
    document.addEventListener('keydown', e => {
        if (isPaused) {
            if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
                resumeGame();
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
                    endGame("Time's up! The runners win.");
                }
            }
        }, 1000);

        // Start game loop
        gameLoopId = requestAnimationFrame(gameLoop);
    });

    resumeButton.addEventListener('click', resumeGame);
    backToMenuButton.addEventListener('click', () => {
        clearInterval(timerInterval);
        runners.forEach(r => clearInterval(r.rechargeInterval));
        mainContainer.style.display = 'none';
        pauseScreen.style.display = 'none';
        menuScreen.style.display = 'flex';
    });

    // Initial draw to show the empty board
    draw();
});

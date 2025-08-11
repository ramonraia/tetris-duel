// Get all necessary DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
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

// Game constants
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Game state variables
let gameGrid;
let currentBlock;
let characters = [];
let projectiles = [];
let gameOver = true;
let isPaused = false;
let score = 0;
let linesRemaining = 5;
let dropInterval = 500;
let countdownIntervalId;
let gameTime = 300;
let maxShotsPerRunner = 7;
let shotRechargeTime = 30000;

// State variables for fluid and simultaneous controls
let keysPressed = {};
let moveCounter = 0;
const moveInterval = 50;
let lastTime = 0;
let dropCounter = 0;

// State variables for menu navigation
let menuOptions = [];
let focusedMenuElementIndex = 0;
let pauseMenuOptions = [];
let focusedPauseMenuElementIndex = 0;

const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];
const shapes = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]] // Z
];
const runnerColors = ['#f87171', '#fb923c', '#fbbf24'];

function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function newBlock() {
    const shapeIndex = Math.floor(Math.random() * shapes.length);
    const shape = JSON.parse(JSON.stringify(shapes[shapeIndex]));
    currentBlock = {
        shape: shape,
        color: colors[shapeIndex],
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        isFalling: true
    };
    // If the new block immediately collides, the game is over for the Block Controller
    if (checkBlockCollision(currentBlock)) {
        endGame("The runners win! The block controller is blocked.");
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw the static grid
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (gameGrid[r][c] !== 0) {
                ctx.fillStyle = gameGrid[r][c];
                ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#2d3748';
                ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
    // Draw the falling block
    if (currentBlock && currentBlock.isFalling) {
        ctx.fillStyle = currentBlock.color;
        for (let r = 0; r < currentBlock.shape.length; r++) {
            for (let c = 0; c < currentBlock.shape[r].length; c++) {
                if (currentBlock.shape[r][c] !== 0) {
                    ctx.fillRect((currentBlock.x + c) * BLOCK_SIZE, (currentBlock.y + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#2d3748';
                    ctx.strokeRect((currentBlock.x + c) * BLOCK_SIZE, (currentBlock.y + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }
    // Draw characters
    characters.forEach(character => {
        if (!character.isEliminated) {
            ctx.fillStyle = character.color;
            ctx.fillRect(character.x, character.y, character.width, character.height);
        }
    });
    // Draw projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
}

function checkBlockCollision(block, offsetX = 0, offsetY = 0) {
    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const newX = block.x + c + offsetX;
                const newY = block.y + r + offsetY;
                if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && gameGrid[newY] && gameGrid[newY][newX] !== 0)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function checkLandingCollision(character) {
    if (character.isEliminated) return;
    character.isStanding = false;
    const nextY = character.y + character.velocityY;
    const charBottomRow = Math.floor((nextY + character.height) / BLOCK_SIZE);
    const charCol = character.col;

    // Check collision with static grid
    if (charBottomRow < ROWS && charCol >= 0 && charCol < COLS && gameGrid[charBottomRow] && gameGrid[charBottomRow][charCol] !== 0) {
        character.y = charBottomRow * BLOCK_SIZE - character.height;
        character.isStanding = true;
        character.velocityY = 0;
    }

    // Check collision with falling block
    if (currentBlock && currentBlock.isFalling) {
        for (let r = 0; r < currentBlock.shape.length; r++) {
            for (let c = 0; c < currentBlock.shape[r].length; c++) {
                if (currentBlock.shape[r][c] !== 0) {
                    const blockTopY = (currentBlock.y + r) * BLOCK_SIZE;
                    const blockLeftX = (currentBlock.x + c) * BLOCK_SIZE;
                    const blockRightX = blockLeftX + BLOCK_SIZE;

                    if (nextY + character.height >= blockTopY && character.y + character.height <= blockTopY) {
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
    // Check collision with canvas floor
    if (character.y + character.height >= canvas.height) {
        character.y = canvas.height - character.height;
        character.isStanding = true;
        character.velocityY = 0;
    }
}

/**
 * Checks for horizontal collision of the character with the grid or falling block.
 * Added logic to "climb" a single block upon collision.
 * CORRECTION: The logic was reinforced to prevent the runner from "phasing through" the block.
 */
function checkCharacterHorizontalCollision(character, dir) {
    if (character.isEliminated) return true;

    const charTopRow = Math.floor(character.y / BLOCK_SIZE);
    const charBottomRow = Math.floor((character.y + character.height - 1) / BLOCK_SIZE);
    const nextCol = character.col + dir;

    if (nextCol < 0 || nextCol >= COLS) return true;

    let isBlocked = false;
    // Check for collision with the static grid
    for (let r = charTopRow; r <= charBottomRow; r++) {
        if (r >= 0 && r < ROWS && gameGrid[r][nextCol] !== 0) {
            isBlocked = true;
            break;
        }
    }

    // If blocked by the grid, try to "climb"
    if (isBlocked) {
        const spaceAboveIsClear = (charTopRow - 1 >= 0 && gameGrid[charTopRow - 1][nextCol] === 0);
        if (spaceAboveIsClear) {
            character.y -= BLOCK_SIZE;
            return false; // Allow movement after climbing
        }
        return true; // Cannot climb, movement is blocked
    }

    // Check for collision with the falling block
    if (currentBlock && currentBlock.isFalling) {
        for (let r = 0; r < currentBlock.shape.length; r++) {
            for (let c = 0; c < currentBlock.shape[r].length; c++) {
                if (currentBlock.shape[r][c] !== 0) {
                    const blockPieceX = currentBlock.x + c;
                    const blockPieceY = currentBlock.y + r;
                    // Checks if the runner's next step collides with the CURRENT position of the block
                    if (nextCol === blockPieceX) {
                        for (let charRow = charTopRow; charRow <= charBottomRow; charRow++) {
                            if (charRow === blockPieceY) {
                                return true; // Collision detected, movement prevented
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
}

function checkCrushCollision(block, offsetY = 0) {
    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const blockCol = block.x + c;
                const blockRow = block.y + r + offsetY;
                for (const character of characters) {
                    if (character.isEliminated) continue;
                    const charCol = character.col;
                    const charTopRow = Math.floor(character.y / BLOCK_SIZE);
                    // If block lands on a character, eliminate them
                    if (blockCol === charCol && blockRow === charTopRow) {
                        eliminateRunner(character);
                    }
                }
            }
        }
    }
}

function checkAndPushRunners(block, dir) {
    let canBlockMove = true;
    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const blockCol = block.x + c;
                const blockRow = block.y + r;
                for (const character of characters) {
                    if (character.isEliminated) continue;
                    const charCol = character.col;
                    const charRow = Math.floor(character.y / BLOCK_SIZE);
                    // Check if the block is about to move into the character's space
                    if (blockCol + dir === charCol && blockRow === charRow) {
                        if (checkCharacterHorizontalCollision(character, dir)) {
                             // Character is blocked, so the block cannot move either
                            canBlockMove = false;
                        } else {
                            // Push the character
                            character.col += dir;
                            character.x = character.col * BLOCK_SIZE;
                        }
                    }
                }
            }
        }
    }
    return canBlockMove;
}

function solidifyBlock() {
    if (!currentBlock) return;
    const isBlockEmpty = currentBlock.shape.flat().every(cell => cell === 0);
    if (isBlockEmpty) {
        newBlock();
        return;
    }
    // Check for final crushing before solidifying
    checkCrushCollision(currentBlock, 0);

    for (let r = 0; r < currentBlock.shape.length; r++) {
        for (let c = 0; c < currentBlock.shape[r].length; c++) {
            if (currentBlock.shape[r][c] !== 0) {
                const newY = currentBlock.y + r;
                const newX = currentBlock.x + c;
                if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
                    gameGrid[newY][newX] = currentBlock.color;
                }
            }
        }
    }
    checkLineClears();
    newBlock();
}

function checkLineClears() {
    let clearedCount = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (gameGrid[r].every(cell => cell !== 0)) {
            gameGrid.splice(r, 1);
            gameGrid.unshift(Array(COLS).fill(0));
            clearedCount++;
            r++; // Re-check the same row index since a new row was added
        }
    }
    if (clearedCount > 0) {
        linesRemaining -= clearedCount;
        if (linesRemaining < 0) linesRemaining = 0;
        linesRemainingDisplay.querySelector('span:last-child').textContent = linesRemaining;
        if (linesRemaining <= 0) {
            endGame(`The block controller wins!`);
        }
    }
}

function gameLoop(time = 0) {
    if (gameOver || isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    // Automatic block drop
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        if (currentBlock) {
            if (!checkBlockCollision(currentBlock, 0, 1) && !checkCrushCollision(currentBlock, 1)) {
                currentBlock.y++;
            } else {
                solidifyBlock();
            }
        }
        dropCounter = 0;
    }

    // Handle continuous key presses for movement
    moveCounter += deltaTime;
    if (moveCounter > moveInterval) {
        if (keysPressed['a'] || keysPressed['A']) move(currentBlock, -1);
        if (keysPressed['d'] || keysPressed['D']) move(currentBlock, 1);
        if (keysPressed['s'] || keysPressed['S']) softDrop();

        if (characters[0] && !characters[0].isEliminated) {
            if (keysPressed['ArrowLeft']) moveCharacter(characters[0], -1);
            if (keysPressed['ArrowRight']) moveCharacter(characters[0], 1);
        }
        if (characters[1] && !characters[1].isEliminated) {
            if (keysPressed['f'] || keysPressed['F']) moveCharacter(characters[1], -1);
            if (keysPressed['h'] || keysPressed['H']) moveCharacter(characters[1], 1);
        }
        if (characters[2] && !characters[2].isEliminated) {
            if (keysPressed['j'] || keysPressed['J']) moveCharacter(characters[2], -1);
            if (keysPressed['l'] || keysPressed['L']) moveCharacter(characters[2], 1);
        }
        moveCounter = 0;
    }

    updateCharacters();
    updateProjectiles();
    draw();
    requestAnimationFrame(gameLoop);
}

function updateCharacters() {
    characters.forEach(character => {
        if (character.isEliminated) return;
        // Gravity
        character.velocityY += 0.8;
        checkLandingCollision(character);
        character.y += character.velocityY;
    });
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.y += p.velocityY;
        if (p.y < 0) { // Remove if off-screen
            projectiles.splice(i, 1);
            continue;
        }
        // Check collision with the falling block
        if (currentBlock && currentBlock.isFalling) {
            const projGridX = Math.floor(p.x / BLOCK_SIZE);
            const projGridY = Math.floor(p.y / BLOCK_SIZE);
            let hit = false;
            for (let r = 0; r < currentBlock.shape.length; r++) {
                for (let c = 0; c < currentBlock.shape[r].length; c++) {
                    if (currentBlock.shape[r][c] !== 0) {
                        if (projGridX === currentBlock.x + c && projGridY === currentBlock.y + r) {
                            currentBlock.shape[r][c] = 0; // Destroy part of the block
                            projectiles.splice(i, 1);
                            score++;
                            playerScoreDisplay.querySelector('span:last-child').textContent = score;
                            hit = true;
                            break;
                        }
                    }
                }
                if (hit) break;
            }
        }
    }
}

function move(block, dir) {
    if (gameOver || isPaused || !block) return;
    if (checkAndPushRunners(block, dir)) {
        if (!checkBlockCollision(block, dir, 0)) {
            block.x += dir;
        }
    }
}

function rotate(block) {
    if (gameOver || isPaused || !block) return;
    const originalShape = JSON.parse(JSON.stringify(block.shape));
    const n = block.shape.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            rotated[c][n - 1 - r] = block.shape[r][c];
        }
    }
    block.shape = rotated;
    if (checkBlockCollision(block)) {
        block.shape = originalShape; // Revert if collision
    }
}

function softDrop() {
    if (gameOver || isPaused || !currentBlock) return;
    if (!checkBlockCollision(currentBlock, 0, 1)) {
        currentBlock.y++;
        dropCounter = 0; // Reset drop counter for faster drop
    } else {
        solidifyBlock();
    }
}

function moveCharacter(character, dir) {
    if (gameOver || isPaused || character.isEliminated) return;
    if (!checkCharacterHorizontalCollision(character, dir)) {
        character.col += dir;
        character.x = character.col * BLOCK_SIZE;
    }
}

function jump(character) {
    if (gameOver || isPaused || character.isEliminated) return;
    if (character.isStanding) {
        character.velocityY = -15; // Jump power
        character.isStanding = false;
    }
}

function shoot(character) {
    if (gameOver || isPaused || character.isEliminated || character.shotsRemaining <= 0) return;
    character.shotsRemaining--;
    projectiles.push({
        x: character.x + character.width / 2 - 2.5,
        y: character.y,
        width: 5,
        height: 10,
        color: '#facc15',
        velocityY: -10
    });
    updateRunnerStatus();
    if (character.rechargeTimerId === null && character.shotsRemaining < maxShotsPerRunner) {
        startRecharge(character);
    }
}

function startRecharge(character) {
    character.rechargeStartTime = Date.now();
    character.rechargeTimerId = setInterval(() => {
        const elapsedTime = Date.now() - character.rechargeStartTime;
        if (elapsedTime >= shotRechargeTime) {
            character.shotsRemaining = maxShotsPerRunner;
            clearInterval(character.rechargeTimerId);
            character.rechargeTimerId = null;
            character.rechargeStartTime = null;
        }
        updateRunnerStatus();
    }, 100);
}

function eliminateRunner(character) {
    if (!character.isEliminated) {
        character.isEliminated = true;
        updateRunnerStatus();
        let allEliminated = characters.every(c => c.isEliminated);
        if (allEliminated) {
            endGame("The block controller wins! All runners are eliminated.");
        }
    }
}

// UI Update functions
function updateRunnerStatus() {
    runnerStatusContainer.innerHTML = '<h3>Runner Status</h3>';
    characters.forEach((char, index) => {
        const rechargeProgress = char.rechargeStartTime ?
            Math.min(((Date.now() - char.rechargeStartTime) / shotRechargeTime) * 100, 100) :
            (char.shotsRemaining === maxShotsPerRunner ? 100 : (char.shotsRemaining / maxShotsPerRunner) * 100);

        const statusHTML = `
            <div class="player-status-item">
                <h4>Player ${index + 2} (${char.color})</h4>
                <p>Status: <span style="color: ${char.isEliminated ? '#ef4444' : '#22c55e'};">${char.isEliminated ? 'Eliminated' : 'Active'}</span></p>
                <p>Shots: ${char.shotsRemaining}/${maxShotsPerRunner}</p>
                <div class="shot-recharge-bar"><div class="shot-recharge-progress" style="width: ${rechargeProgress}%;"></div></div>
            </div>`;
        runnerStatusContainer.innerHTML += statusHTML;
    });
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameTime / 60).toString().padStart(2, '0');
    const seconds = (gameTime % 60).toString().padStart(2, '0');
    timerDisplay.querySelector('span:last-child').textContent = `${minutes}:${seconds}`;
}

function startGame() {
    menuScreen.style.display = 'none';
    mainContainer.style.display = 'flex';
    const runnerCount = parseInt(runnerCountSelect.value, 10);
    linesRemaining = parseInt(linesInput.value, 10);
    maxShotsPerRunner = parseInt(maxShotsInput.value, 10);
    shotRechargeTime = parseInt(rechargeTimeInput.value, 10) * 1000;
    gameTime = parseInt(timeInput.value, 10) * 60;
    const speedMap = { 'slow': 800, 'medium': 600, 'fast': 400, 'very-fast': 250 };
    dropInterval = speedMap[speedSelect.value];
    resetGame(runnerCount);
    gameOver = false;
    isPaused = false;
    lastTime = 0;
    gameLoop();
}

function resetGame(runnerCount) {
    gameGrid = createGrid();
    projectiles = [];
    score = 0;
    playerScoreDisplay.querySelector('span:last-child').textContent = '0';
    linesRemainingDisplay.querySelector('span:last-child').textContent = linesRemaining;
    
    characters = [];
    for (let i = 0; i < runnerCount; i++) {
        const startCol = Math.floor(COLS / (runnerCount + 1)) * (i + 1);
        characters.push({
            x: startCol * BLOCK_SIZE,
            y: canvas.height - BLOCK_SIZE,
            width: BLOCK_SIZE,
            height: BLOCK_SIZE,
            col: startCol,
            color: runnerColors[i % runnerColors.length],
            velocityY: 0,
            isStanding: true,
            isEliminated: false,
            shotsRemaining: maxShotsPerRunner,
            rechargeTimerId: null,
            rechargeStartTime: null
        });
    }
    
    newBlock();
    updateRunnerStatus();
    
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    updateTimerDisplay();
    countdownIntervalId = setInterval(() => {
        if (!isPaused && !gameOver) {
            gameTime--;
            updateTimerDisplay();
            if (gameTime <= 0) {
                endGame("Time's up! The runners win!");
            }
        }
    }, 1000);
}

function endGame(message) {
    gameOver = true;
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    gameMessageElement.innerHTML = `<h2>${message}</h2><button id="playAgainButton">Play Again</button>`;
    gameMessageElement.style.display = 'flex';
    document.getElementById('playAgainButton').onclick = backToMenu;
    document.getElementById('playAgainButton').focus();
}

function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.style.display = 'flex';
        initPauseMenu();
    } else {
        pauseScreen.style.display = 'none';
        lastTime = performance.now(); // Reset time to avoid a large jump after unpausing
        gameLoop();
    }
}

function resumeGame() {
    togglePause();
}

function backToMenu() {
    gameOver = true;
    isPaused = false;
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    
    // Hide all game elements and show menu
    mainContainer.style.display = 'none';
    pauseScreen.style.display = 'none';
    gameMessageElement.style.display = 'none';
    menuScreen.style.display = 'flex';
    initMenu();
}

function updateFocus(elements, index, className = 'focused-menu-item') {
    elements.forEach(el => el.classList.remove(className));
    if (elements[index]) {
        elements[index].classList.add(className);
        elements[index].focus();
    }
}

function initMenu() {
    menuOptions = Array.from(document.querySelectorAll('#menuScreen .menu-option'));
    focusedMenuElementIndex = menuOptions.length - 1;
    updateFocus(menuOptions, focusedMenuElementIndex);
}

function initPauseMenu() {
    pauseMenuOptions = Array.from(document.querySelectorAll('#pauseScreen .pause-menu-option'));
    focusedPauseMenuElementIndex = 0;
    updateFocus(pauseMenuOptions, focusedPauseMenuElementIndex);
}

// Event Listeners
document.addEventListener('keydown', e => {
    // Menu Navigation
    if (menuScreen.style.display === 'flex') {
        if (e.key === 'ArrowUp') {
            focusedMenuElementIndex = (focusedMenuElementIndex - 1 + menuOptions.length) % menuOptions.length;
            updateFocus(menuOptions, focusedMenuElementIndex);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            focusedMenuElementIndex = (focusedMenuElementIndex + 1) % menuOptions.length;
            updateFocus(menuOptions, focusedMenuElementIndex);
            e.preventDefault();
        } else if (e.key === 'Enter') {
            menuOptions[focusedMenuElementIndex].click();
        }
        return;
    }
    // Pause Menu Navigation
    if (isPaused) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            focusedPauseMenuElementIndex = (focusedPauseMenuElementIndex + 1) % pauseMenuOptions.length;
            updateFocus(pauseMenuOptions, focusedPauseMenuElementIndex);
            e.preventDefault();
        } else if (e.key === 'Enter') {
            pauseMenuOptions[focusedPauseMenuElementIndex].click();
        }
    }
    
    if (e.key.toLowerCase() === 'p') {
        togglePause();
        return;
    }
    
    if (gameOver || isPaused) return;

    // Set key as pressed for continuous actions
    keysPressed[e.key] = true;
    
    // Handle single-press actions
    switch (e.key.toLowerCase()) {
        case 'w': rotate(currentBlock); break;
        case 'arrowup': if (characters[0]) jump(characters[0]); break;
        case 'arrowdown': if (characters[0]) shoot(characters[0]); break;
        case 't': if (characters[1]) jump(characters[1]); break;
        case 'g': if (characters[1]) shoot(characters[1]); break;
        case 'i': if (characters[2]) jump(characters[2]); break;
        case 'k': if (characters[2]) shoot(characters[2]); break;
    }
});

document.addEventListener('keyup', e => {
    delete keysPressed[e.key];
});

// Button Clicks
startGameButton.addEventListener('click', startGame);
resumeButton.addEventListener('click', resumeGame);
backToMenuButton.addEventListener('click', backToMenu);

// Initialize Menu
initMenu();

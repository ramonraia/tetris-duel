// Firebase settings. For compatibility only, not used in this game.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// DOM elements
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

function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

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
    }

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

    characters.forEach(character => {
        if (!character.isEliminated) {
            ctx.fillStyle = character.color;
            ctx.fillRect(character.x, character.y, character.width, character.height);
        }
    });

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
                if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && gameGrid[newY][newX] !== 0)) {
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
    if (charBottomRow < ROWS && charCol >= 0 && charCol < COLS && gameGrid[charBottomRow][charCol] !== 0) {
        character.y = charBottomRow * BLOCK_SIZE - character.height;
        character.isStanding = true;
        character.velocityY = 0;
    }

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

    if (character.y + character.height >= canvas.height) {
        character.y = canvas.height - character.height;
        character.isStanding = true;
        character.velocityY = 0;
    }
}

/**
 * Checks for horizontal collision of the character with the game grid.
 * Added logic to "climb" a single block upon collision.
 * CORRECTION: The logic was reinforced to prevent the runner from "phasing through" the block.
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

    // Check for collision with the grid
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
            character.y = (charTopRow - 1) * BLOCK_SIZE;
            return false;
        }
        return true;
    }

    // Check for collision with the falling block
    if (currentBlock && currentBlock.isFalling) {
        const blockGridX = Math.floor(currentBlock.x);
        const blockGridY = Math.floor(currentBlock.y);

        for (let r = 0; r < currentBlock.shape.length; r++) {
            for (let c = 0; c < currentBlock.shape[r].length; c++) {
                if (currentBlock.shape[r][c] !== 0) {
                    const blockPieceX = blockGridX + c;
                    const blockPieceY = blockGridY + r;

                    // HERE IS THE KEY CORRECTION:
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

// Updated crush collision logic to be more precise
function checkCrushCollision(block, offsetX = 0, offsetY = 0) {
    const potentialCrushers = [];
    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const blockCol = block.x + c + offsetX;
                const blockRow = block.y + r + offsetY;

                for (const character of characters) {
                    if (character.isEliminated) continue;

                    const charCol = character.col;
                    const charTopRow = Math.floor(character.y / BLOCK_SIZE);
                    const charBottomRow = Math.floor((character.y + character.height - 1) / BLOCK_SIZE);

                    if (blockCol === charCol && blockRow === charTopRow) {
                        // The block is on the same top row as the character
                        potentialCrushers.push(character);
                    } else if (blockCol === charCol && blockRow > charTopRow && blockRow <= charBottomRow) {
                        // The block is vertically overlapping the character
                        eliminateRunner(character);
                        return true;
                    }
                }
            }
        }
    }
    // Check if the collision is at the top (without immediate crushing)
    for (const character of potentialCrushers) {
        if (character.isStanding) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if the runner can be pushed or if they will be crushed.
 */
function checkAndPushRunners(block, dir) {
    let blockMoved = false;

    // Loop to check if the block moves left or right
    for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
            if (block.shape[r][c] !== 0) {
                const blockCol = block.x + c;
                const blockRow = block.y + r;

                for (const character of characters) {
                    if (character.isEliminated) continue;

                    const charCol = character.col;
                    const charRow = Math.floor(character.y / BLOCK_SIZE);

                    // If the block collides with the runner
                    if (blockCol + dir === charCol && blockRow === charRow) {
                        const nextCharCol = charCol + dir;

                        // Check if the runner's next space is blocked by a wall or grid
                        const isBlockedByWorld = nextCharCol < 0 || nextCharCol >= COLS || (gameGrid[charRow] && gameGrid[charRow][nextCharCol] !== 0);

                        if (isBlockedByWorld) {
                            // The runner cannot move. Let's check if they are in a safe space
                            // relative to the block pushing them.

                            // The runner's relative position inside the block
                            const relativeCol = charCol - block.x;
                            const relativeRow = charRow - block.y;

                            // If the relative position is within the block's boundaries
                            if (relativeRow >= 0 && relativeRow < block.shape.length && relativeCol >= 0 && relativeCol < block.shape[relativeRow].length) {
                                // If the runner's next space is in a SOLID part of the block
                                // that is pushing them, they are crushed.
                                if (block.shape[relativeRow][relativeCol] !== 0) {
                                    eliminateRunner(character);
                                }
                                // Otherwise, they are in an empty space and remain safe, but stop.
                                // No action is needed, as they don't move.
                            } else {
                                // The runner is being crushed against something outside the block's boundaries.
                                eliminateRunner(character);
                            }
                        } else {
                            // The space is free, push the runner to the side.
                            character.col += dir;
                            character.x = character.col * BLOCK_SIZE;
                        }
                    }
                }
            }
        }
    }

    // The block should only move if there is no solid collision (wall/other blocks)
    if (!checkBlockCollision(block, dir, 0)) {
        blockMoved = true;
        block.x += dir;
    }
    return blockMoved;
}

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

    if (clearedCount > 0) {
        linesRemaining -= clearedCount;
        if (linesRemaining < 0) linesRemaining = 0;
        const linesSpan = linesRemainingDisplay.querySelector('span:last-child');
        linesSpan.textContent = linesRemaining;

        if (linesRemaining <= 0) {
            endGame(`O controlador de blocos venceu!`);
            return;
        }
    }
}

function solidifyBlock() {
    const isBlockEmpty = currentBlock.shape.flat().every(cell => cell === 0);
    if (isBlockEmpty) {
        newBlock();
        return;
    }

    // --- Check for final crushing before solidifying ---
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

    for (let r = 0; r < currentBlock.shape.length; r++) {
        for (let c = 0; c < currentBlock.shape[r].length; c++) {
            if (currentBlock.shape[r][c] !== 0) {
                const newY = currentBlock.y + r;
                const newX = currentBlock.x + c;
                if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
                    gameGrid[newY][newX] = currentBlock.color;
                } else {
                    endGame("Os corredores venceram! O bloco saiu da área.");
                    return;
                }
            }
        }
    }
    newBlock();
    checkLineClears();
}

let lastTime = 0;
let dropCounter = 0;

function gameLoop(time = 0) {
    if (gameOver || isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        if (!currentBlock || currentBlock.shape.flat().every(cell => cell === 0)) {
            newBlock();
        }

        if (currentBlock) {
            if (checkCrushCollision(currentBlock, 0, 1)) {
                 let activeRunners = characters.filter(c => !c.isEliminated).length;
                 if (activeRunners === 0) {
                    endGame("O controlador de blocos venceu! Todos os corredores foram esmagados.");
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

    moveCounter += deltaTime;
    if (moveCounter > moveInterval) {
        if (keysPressed['a'] || keysPressed['A']) { move(currentBlock, -1); }
        if (keysPressed['d'] || keysPressed['D']) { move(currentBlock, 1); }
        if (keysPressed['s'] || keysPressed['S']) { softDrop(); }

        if (characters[0] && !characters[0].isEliminated) {
            if (keysPressed['ArrowLeft']) { moveCharacter(characters[0], -1); }
            if (keysPressed['ArrowRight']) { moveCharacter(characters[0], 1); }
        }
        if (characters[1] && !characters[1].isEliminated) {
            if (keysPressed['f'] || keysPressed['F']) { moveCharacter(characters[1], -1); }
            if (keysPressed['h'] || keysPressed['H']) { moveCharacter(characters[1], 1); }
        }
        if (characters[2] && !characters[2].isEliminated) {
            if (keysPressed['j'] || keysPressed['J']) { moveCharacter(characters[2], -1); }
            if (keysPressed['l'] || keysPressed['L']) { moveCharacter(characters[2], 1); }
        }

        moveCounter = 0;
    }

    characters.forEach(character => {
        if (character.isEliminated) return;

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
        }

        checkLandingCollision(character);

        if (character.y > canvas.height) {
            eliminateRunner(character);
        }
    });

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
        }

        if (pRow >= 0 && pRow < ROWS && pCol >= 0 && pCol < COLS && gameGrid[pRow][pCol] !== 0) {
            gameGrid[pRow][pCol] = 0;
            score++;
            projectiles.splice(index, 1);
            checkLineClears();
        } else if (p.y < 0) {
            projectiles.splice(index, 1);
        }
    });

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

function rotate(matrix) {
    const N = matrix.length - 1;
    const result = matrix.map((row, i) =>
        row.map((val, j) => matrix[N - j][i])
    );
    return result;
}

// Updated block movement logic to drag runners
function move(block, dir) {
    if (!block) return;

    // Checks the block's lateral collision with runners and pushes them
    checkAndPushRunners(block, dir);
}

function moveCharacter(character, dir) {
    // The key: The horizontal collision is now more robust
    if (character && !character.isEliminated && !checkCharacterHorizontalCollision(character, dir)) {
        character.col += dir;
        character.x = character.col * BLOCK_SIZE;
    }
}

function softDrop() {
    if (currentBlock) {
        if (checkCrushCollision(currentBlock, 0, 1)) {
            let activeRunners = characters.filter(c => !c.isEliminated).length;
             if (activeRunners === 0) {
                endGame("O controlador de blocos venceu! Todos os corredores foram esmagados.");
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

function jump(character) {
    const jumpStrength = 10;
    if (character && !character.isEliminated && character.isStanding) {
        character.velocityY = -jumpStrength;
        character.isStanding = false;
    }
}

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

function eliminateRunner(character) {
    character.isEliminated = true;
    const statusElement = document.getElementById(`runner-status-${character.id}`);
    if (statusElement) {
        statusElement.classList.add('bg-red-800');
        statusElement.classList.remove('bg-gray-700');
        statusElement.innerHTML = `<h4>Corredor ${character.id + 1}</h4><p class="text-red-300">Eliminado!</p>`;
    }

    const activeRunners = characters.filter(c => !c.isEliminated).length;
    if (activeRunners === 0) {
        endGame("O controlador de blocos venceu! Todos os corredores foram eliminados.");
    }
}

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
        gameLoop();
        startProgressiveSpeed();
        startCountdown();
        lastRechargeTime = Date.now();
    }
}

function endGame(message) {
    gameOver = true;
    gameMessageElement.textContent = message;
    gameMessageElement.style.display = 'flex';
    clearInterval(speedIntervalId);
    clearInterval(countdownIntervalId);
    setTimeout(showMenu, 3000);
}

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

function updateMenuFocus() {
    menuOptions.forEach((option, index) => {
        if (index === focusedMenuElementIndex) {
            option.classList.add('focused-menu-item');
        } else {
            option.classList.remove('focused-menu-item');
        }
    });
}

function updatePauseMenuFocus() {
    pauseMenuOptions.forEach((option, index) => {
        if (index === focusedPauseMenuElementIndex) {
            option.classList.add('focused-menu-item');
        } else {
            option.classList.remove('focused-menu-item');
        }
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

function startProgressiveSpeed() {
    speedIntervalId = setInterval(() => {
        if (!isPaused && !gameOver) {
            dropInterval = Math.max(100, dropInterval * 0.7);
        }
    }, 60000);
}

function startCountdown() {
    countdownIntervalId = setInterval(() => {
        if (!isPaused && !gameOver) {
            gameTime--;
            const timerSpan = timerDisplay.querySelector('span:last-child');
            timerSpan.textContent = formatTime(gameTime);
            if (gameTime <= 0) {
                endGame("Os corredores venceram! O tempo acabou.");
            }
        }
    }, 1000);
}

function createRunnerStatusUI() {
    runnerStatusContainer.innerHTML = '';
    characters.forEach((character, index) => {
        const statusDiv = document.createElement('div');
        statusDiv.id = `runner-status-${index}`;
        statusDiv.className = 'player-status-item';
        statusDiv.innerHTML = `
            <h4 style="color:${character.color}">Corredor ${index + 1}</h4>
            <p>Tiros Restantes: <span id="shots-remaining-${index}">${character.shotsRemaining}</span></p>
            <div class="shot-recharge-bar mt-1">
                <div id="recharge-progress-${index}" class="shot-recharge-progress" style="width: 0%;"></div>
            </div>
        `;
        runnerStatusContainer.appendChild(statusDiv);
    });
}

function startGame() {
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

startGameButton.addEventListener('click', startGame);
resumeButton.addEventListener('click', togglePause);
backToMenuButton.addEventListener('click', () => {
    gameOver = true;
    showMenu();
});

window.onload = function() {
    showMenu();
}

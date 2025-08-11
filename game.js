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
 * FIX: Logic was reinforced to prevent the runner from "phasing through" the block.
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
            endGame(`The block controller wins!`);
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
                    endGame("The runners win! The block left the area.");
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
                     endGame("The block controller wins! All runners have been crushed.");
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

    updateCharacters(deltaTime);
    updateProjectiles(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

function updateCharacters(deltaTime) {
    characters.forEach(character => {
        if (character.isEliminated) return;

        character.velocityY += 0.5;
        character.y += character.velocityY;

        checkLandingCollision(character);

        if (character.isRecharging) {
            const now = Date.now();
            const elapsed = now - character.rechargeStartTime;
            if (elapsed >= shotRechargeTime) {
                character.isRecharging = false;
                character.shotsLeft = maxShotsPerRunner;
            }
        }
        updateRunnerStatus(character);
    });
    score = characters.filter(c => !c.isEliminated).length;
    const scoreSpan = playerScoreDisplay.querySelector('span:last-child');
    scoreSpan.textContent = score;
}

function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.y += p.velocityY;
        if (p.y < 0) {
            projectiles.splice(i, 1);
            continue;
        }

        const projCol = Math.floor(p.x / BLOCK_SIZE);
        const projRow = Math.floor(p.y / BLOCK_SIZE);

        if (currentBlock && currentBlock.isFalling) {
            for (let r = 0; r < currentBlock.shape.length; r++) {
                for (let c = 0; c < currentBlock.shape[r].length; c++) {
                    if (currentBlock.shape[r][c] !== 0) {
                        const blockCol = currentBlock.x + c;
                        const blockRow = currentBlock.y + r;
                        if (projCol === blockCol && projRow === blockRow) {
                            currentBlock.shape[r][c] = 0;
                            projectiles.splice(i, 1);
                            break;
                        }
                    }
                }
            }
        }
    }
}

function move(block, dir) {
    if (isPaused || gameOver) return;
    if (!block || !block.isFalling) return;

    const pushed = checkAndPushRunners(block, dir);
}

function rotate(block) {
    if (isPaused || gameOver || !block) return;
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
        block.shape = originalShape;
    }
}

function softDrop() {
    if (isPaused || gameOver || !currentBlock) return;
    if (!checkBlockCollision(currentBlock, 0, 1)) {
        currentBlock.y++;
    } else {
        solidifyBlock();
    }
}

function moveCharacter(character, dir) {
    if (isPaused || gameOver || character.isEliminated) return;
    if (!checkCharacterHorizontalCollision(character, dir)) {
        character.col += dir;
        character.x = character.col * BLOCK_SIZE;
    }
}

function jump(character) {
    if (isPaused || gameOver || character.isEliminated) return;
    if (character.isStanding) {
        character.velocityY = -12;
        character.isStanding = false;
    }
}

function shoot(character) {
    if (isPaused || gameOver || character.isEliminated || character.isRecharging || character.shotsLeft <= 0) return;

    projectiles.push({
        x: character.x + character.width / 2 - 2.5,
        y: character.y,
        width: 5,
        height: 10,
        color: character.color,
        velocityY: -10
    });

    character.shotsLeft--;
    if (character.shotsLeft <= 0) {
        character.isRecharging = true;
        character.rechargeStartTime = Date.now();
    }
    updateRunnerStatus(character);
}

function eliminateRunner(character) {
    if (!character.isEliminated) {
        character.isEliminated = true;
        updateRunnerStatus(character);
        let activeRunners = characters.filter(c => !c.isEliminated).length;
        if (activeRunners === 0) {
            endGame("The block controller wins! All runners have been eliminated.");
        }
    }
}

function updateRunnerStatus(character) {
    let statusDiv = document.getElementById(`runner-status-${character.id}`);
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = `runner-status-${character.id}`;
        statusDiv.className = 'player-status-item';
        runnerStatusContainer.appendChild(statusDiv);
    }

    if (character.isEliminated) {
        statusDiv.innerHTML = `<h4>Runner ${character.id} (ELIMINATED)</h4>`;
        statusDiv.style.backgroundColor = '#dc2626';
    } else {
        let rechargeHTML = '';
        if (character.isRecharging) {
            const now = Date.now();
            const elapsed = now - character.rechargeStartTime;
            const progress = Math.min(100, (elapsed / shotRechargeTime) * 100);
            rechargeHTML = `
                <div>Recharging...</div>
                <div class="shot-recharge-bar">
                    <div class="shot-recharge-progress" style="width: ${progress}%;"></div>
                </div>`;
        }
        statusDiv.innerHTML = `
            <h4>Runner ${character.id}</h4>
            <div>Shots: ${character.shotsLeft}</div>
            ${rechargeHTML}
        `;
    }
}

function updateTimer() {
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const timerSpan = timerDisplay.querySelector('span:last-child');
    timerSpan.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (gameTime <= 0) {
        clearInterval(countdownIntervalId);
        endGame("The runners win! Time is up.");
    }
    if (!isPaused && !gameOver) {
        gameTime--;
    }
}

function startCountdown() {
    let countdown = 3;
    showMessage(`Game starts in ${countdown}...`);
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            showMessage(`Game starts in ${countdown}...`);
        } else {
            clearInterval(countdownInterval);
            showMessage('Go!');
            setTimeout(() => {
                gameMessageElement.style.display = 'none';
                isPaused = false;
                gameLoop();
            }, 1000);
        }
    }, 1000);
}

function showMessage(msg, permanent = false) {
    gameMessageElement.innerHTML = msg;
    gameMessageElement.style.display = 'flex';
    if (!permanent) {
        setTimeout(() => {
            if (gameMessageElement.innerHTML === msg) {
                gameMessageElement.style.display = 'none';
            }
        }, 1500);
    }
}

function endGame(winner) {
    if (gameOver) return;
    gameOver = true;
    clearInterval(speedIntervalId);
    clearInterval(countdownIntervalId);
    const message = `${winner}<br><br><button onclick="restartGame()">Play Again</button><button onclick="goToMenu()">Back to Menu</button>`;
    gameMessageElement.innerHTML = message;
    gameMessageElement.style.display = 'flex';
}

function resetGame() {
    isPaused = true;
    gameOver = false;
    gameGrid = createGrid();
    projectiles = [];
    score = 0;
    
    // Reset from menu inputs
    linesRemaining = parseInt(linesInput.value, 10);
    gameTime = parseInt(timeInput.value, 10) * 60;
    maxShotsPerRunner = parseInt(maxShotsInput.value, 10);
    shotRechargeTime = parseInt(rechargeTimeInput.value, 10) * 1000;
    const speed = speedSelect.value;
    switch(speed) {
        case 'slow': dropInterval = 1000; break;
        case 'medium': dropInterval = 700; break;
        case 'fast': dropInterval = 400; break;
        case 'very-fast': dropInterval = 200; break;
        default: dropInterval = 700;
    }

    const runnerCount = parseInt(runnerCountSelect.value, 10);
    characters = [];
    runnerStatusContainer.innerHTML = ''; // Clear previous status
    const runnerColors = ['#fca5a5', '#fdba74', '#fde047'];
    for (let i = 0; i < runnerCount; i++) {
        characters.push({
            id: i + 1,
            x: (i * 2 + 3) * BLOCK_SIZE,
            y: canvas.height - BLOCK_SIZE * 2,
            width: BLOCK_SIZE,
            height: BLOCK_SIZE * 2,
            col: (i * 2 + 3),
            color: runnerColors[i % runnerColors.length],
            velocityY: 0,
            isStanding: true,
            isEliminated: false,
            shotsLeft: maxShotsPerRunner,
            isRecharging: false,
            rechargeStartTime: 0
        });
        updateRunnerStatus(characters[i]);
    }
    
    const scoreSpan = playerScoreDisplay.querySelector('span:last-child');
    scoreSpan.textContent = characters.length;
    
    const linesSpan = linesRemainingDisplay.querySelector('span:last-child');
    linesSpan.textContent = linesRemaining;
    
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    countdownIntervalId = setInterval(updateTimer, 1000);
    updateTimer();
    
    newBlock();
    lastTime = 0;
    dropCounter = 0;
}

function restartGame() {
    gameMessageElement.style.display = 'none';
    resetGame();
    startCountdown();
}

function goToMenu() {
    gameOver = true;
    isPaused = false;
    mainContainer.style.display = 'none';
    gameMessageElement.style.display = 'none';
    pauseScreen.style.display = 'none';
    menuScreen.style.display = 'flex';
    if(countdownIntervalId) clearInterval(countdownIntervalId);
    if(speedIntervalId) clearInterval(speedIntervalId);
    setupMenuNavigation();
}

function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    pauseScreen.style.display = isPaused ? 'flex' : 'none';
    if (!isPaused) {
        lastTime = performance.now(); // Reset lastTime to avoid a large deltaTime jump
        gameLoop();
        setupPauseMenuNavigation();
    }
}

function setupMenuNavigation() {
    menuOptions = Array.from(document.querySelectorAll('#menuScreen .menu-option'));
    focusedMenuElementIndex = menuOptions.length - 1; // Start focus on the button
    menuOptions.forEach(el => el.classList.remove('focused-menu-item'));
    menuOptions[focusedMenuElementIndex].classList.add('focused-menu-item');
}

function navigateMenu(direction) {
    menuOptions[focusedMenuElementIndex].classList.remove('focused-menu-item');
    focusedMenuElementIndex = (focusedMenuElementIndex + direction + menuOptions.length) % menuOptions.length;
    menuOptions[focusedMenuElementIndex].classList.add('focused-menu-item');
    menuOptions[focusedMenuElementIndex].focus();
}

function setupPauseMenuNavigation() {
    pauseMenuOptions = Array.from(document.querySelectorAll('#pauseScreen .pause-menu-option'));
    focusedPauseMenuElementIndex = 0;
    pauseMenuOptions.forEach(el => el.classList.remove('focused-menu-item'));
    if (pauseMenuOptions.length > 0) {
        pauseMenuOptions[focusedPauseMenuElementIndex].classList.add('focused-menu-item');
    }
}

function navigatePauseMenu(direction) {
    pauseMenuOptions[focusedPauseMenuElementIndex].classList.remove('focused-menu-item');
    focusedPauseMenuElementIndex = (focusedPauseMenuElementIndex + direction + pauseMenuOptions.length) % pauseMenuOptions.length;
    pauseMenuOptions[focusedPauseMenuElementIndex].classList.add('focused-menu-item');
    pauseMenuOptions[focusedPauseMenuElementIndex].focus();
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;

    if (menuScreen.style.display === 'flex') {
        if (e.key === 'ArrowUp') navigateMenu(-1);
        if (e.key === 'ArrowDown') navigateMenu(1);
        if (e.key === 'Enter') menuOptions[focusedMenuElementIndex].click();
        return;
    }
    
    if (isPaused) {
        if (e.key === 'ArrowUp') navigatePauseMenu(-1);
        if (e.key === 'ArrowDown') navigatePauseMenu(1);
        if (e.key === 'Enter') pauseMenuOptions[focusedPauseMenuElementIndex].click();
    }
    
    if (e.key === 'w' || e.key === 'W') { rotate(currentBlock); }
    if (e.key === 'p' || e.key === 'P') { togglePause(); }

    if (characters[0] && !characters[0].isEliminated) {
        if (e.key === 'ArrowUp') { jump(characters[0]); }
        if (e.key === 'ArrowDown') { shoot(characters[0]); }
    }
    if (characters[1] && !characters[1].isEliminated) {
        if (e.key === 't' || e.key === 'T') { jump(characters[1]); }
        if (e.key === 'g' || e.key === 'G') { shoot(characters[1]); }
    }
    if (characters[2] && !characters[2].isEliminated) {
        if (e.key === 'i' || e.key === 'I') { jump(characters[2]); }
        if (e.key === 'k' || e.key === 'K') { shoot(characters[2]); }
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

startGameButton.addEventListener('click', () => {
    menuScreen.style.display = 'none';
    mainContainer.style.display = 'flex';
    resetGame();
    startCountdown();
});

resumeButton.addEventListener('click', togglePause);
backToMenuButton.addEventListener('click', goToMenu);

// Initial setup
setupMenuNavigation();

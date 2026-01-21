// Game constants
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game state
let snake = [];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let highScore = 0;
let gameLoop = null;
let isGameRunning = false;
let isPaused = false;
let gameSpeed = 100;
let gameHistory = [];

// UI elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const statusElement = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Clear badge when popup opens
if (chrome.runtime) {
  chrome.runtime.sendMessage({ action: 'popupOpened' }).catch(() => {
    // Ignore errors if background script is not ready
  });
}

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Remove active class from all tabs and contents
    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    btn.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update history display when switching to history tab
    if (tabName === 'history') {
      displayHistory();
    }
  });
});

// Initialize game
function init() {
  loadHighScore();
  loadHistory();
  resetGame();
  updateConnectionStatus();
  setInterval(updateConnectionStatus, 2000);
}

// Load high score from storage
function loadHighScore() {
  const saved = localStorage.getItem('snakeHighScore');
  highScore = saved ? parseInt(saved) : 0;
  highScoreElement.textContent = highScore;
}

// Save high score
function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snakeHighScore', highScore);
    highScoreElement.textContent = highScore;
  }
}

// Load history from storage
function loadHistory() {
  const saved = localStorage.getItem('snakeHistory');
  gameHistory = saved ? JSON.parse(saved) : [];
}

// Save game to history
function saveGameToHistory() {
  const now = new Date();
  const gameData = {
    score: score,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: now.getTime()
  };
  
  gameHistory.unshift(gameData); // Add to beginning
  
  // Keep only last 50 games
  if (gameHistory.length > 50) {
    gameHistory = gameHistory.slice(0, 50);
  }
  
  localStorage.setItem('snakeHistory', JSON.stringify(gameHistory));
}

// Display history
function displayHistory() {
  const historyList = document.getElementById('historyList');
  const totalGamesEl = document.getElementById('totalGames');
  const avgScoreEl = document.getElementById('avgScore');
  const bestScoreEl = document.getElementById('bestScore');
  
  if (gameHistory.length === 0) {
    historyList.innerHTML = `
      <div class="empty-history">
        <p>🎮 No games played yet</p>
        <p class="empty-subtext">Start playing to see your score history!</p>
      </div>
    `;
    totalGamesEl.textContent = '0';
    avgScoreEl.textContent = '0';
    bestScoreEl.textContent = '0';
    return;
  }
  
  // Calculate stats
  const totalGames = gameHistory.length;
  const totalScore = gameHistory.reduce((sum, game) => sum + game.score, 0);
  const avgScore = Math.round(totalScore / totalGames);
  const bestScore = Math.max(...gameHistory.map(game => game.score));
  
  totalGamesEl.textContent = totalGames;
  avgScoreEl.textContent = avgScore;
  bestScoreEl.textContent = bestScore;
  
  // Display history items
  historyList.innerHTML = gameHistory.map((game, index) => {
    const isBest = game.score === bestScore;
    return `
      <div class="history-item ${isBest ? 'best' : ''}">
        <div class="history-info">
          <div class="history-score">${game.score} points</div>
          <div class="history-date">
            ${game.date}
            <span class="history-time">${game.time}</span>
          </div>
        </div>
        ${isBest ? '<div class="history-badge">🏆 BEST</div>' : ''}
      </div>
    `;
  }).join('');
}

// Clear history
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all game history? This cannot be undone.')) {
    gameHistory = [];
    localStorage.setItem('snakeHistory', JSON.stringify(gameHistory));
    displayHistory();
  }
});

// Update connection status
function updateConnectionStatus() {
  const isOnline = navigator.onLine;
  if (isOnline) {
    statusElement.className = 'online';
    statusText.textContent = 'Online';
  } else {
    statusElement.className = 'offline';
    statusText.textContent = 'Offline';
  }
}

// Reset game state
function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  dx = 1;
  dy = 0;
  score = 0;
  gameSpeed = 100;
  scoreElement.textContent = score;
  generateFood();
  drawGame();
}

// Generate food at random position
function generateFood() {
  food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount)
  };
  
  // Make sure food doesn't spawn on snake
  for (let segment of snake) {
    if (segment.x === food.x && segment.y === food.y) {
      generateFood();
      return;
    }
  }
}

// Start game
function startGame() {
  if (isGameRunning) return;
  
  isGameRunning = true;
  isPaused = false;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  startBtn.textContent = 'Playing...';
  
  gameLoop = setInterval(updateGame, gameSpeed);
}

// Pause/Resume game
function togglePause() {
  if (!isGameRunning) return;
  
  isPaused = !isPaused;
  
  if (isPaused) {
    clearInterval(gameLoop);
    pauseBtn.textContent = 'Resume';
  } else {
    gameLoop = setInterval(updateGame, gameSpeed);
    pauseBtn.textContent = 'Pause';
  }
}

// Game over
function gameOver() {
  clearInterval(gameLoop);
  isGameRunning = false;
  isPaused = false;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  startBtn.textContent = 'Start Game';
  pauseBtn.textContent = 'Pause';
  
  // Save score to history (only if score > 0)
  if (score > 0) {
    saveGameToHistory();
  }
  
  saveHighScore();
  
  // Draw game over message
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 40);
  
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
  
  if (score === highScore && score > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('New High Score!', canvas.width / 2, canvas.height / 2 + 35);
  }
  
  // Press Space to play again
  ctx.fillStyle = '#a0a0a0';
  ctx.font = '16px Arial';
  ctx.fillText('Press Space to play again', canvas.width / 2, canvas.height / 2 + 70);
}

// Update game state
function updateGame() {
  if (isPaused) return;
  
  // Move snake
  let head = { x: snake[0].x + dx, y: snake[0].y + dy };
  
  // Wrap around borders instead of game over
  if (head.x < 0) {
    head.x = tileCount - 1;
  } else if (head.x >= tileCount) {
    head.x = 0;
  }
  
  if (head.y < 0) {
    head.y = tileCount - 1;
  } else if (head.y >= tileCount) {
    head.y = 0;
  }
  
  // Check self collision
  for (let segment of snake) {
    if (segment.x === head.x && segment.y === head.y) {
      gameOver();
      return;
    }
  }
  
  // Add new head
  snake.unshift(head);
  
  // Check food collision
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = score;
    generateFood();
    
    // Increase speed slightly
    if (score % 50 === 0 && gameSpeed > 50) {
      gameSpeed -= 5;
      clearInterval(gameLoop);
      gameLoop = setInterval(updateGame, gameSpeed);
    }
  } else {
    // Remove tail if no food eaten
    snake.pop();
  }
  
  drawGame();
}

// Draw game
function drawGame() {
  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 1;
  for (let i = 0; i <= tileCount; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize, 0);
    ctx.lineTo(i * gridSize, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i * gridSize);
    ctx.lineTo(canvas.width, i * gridSize);
    ctx.stroke();
  }
  
  // Draw snake
  snake.forEach((segment, index) => {
    if (index === 0) {
      // Head - pure black
      ctx.fillStyle = '#000000';
      ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
      
      // Eyes - white
      ctx.fillStyle = '#ffffff';
      const eyeSize = 3;
      if (dx === 1) { // Right
        ctx.fillRect(segment.x * gridSize + 13, segment.y * gridSize + 5, eyeSize, eyeSize);
        ctx.fillRect(segment.x * gridSize + 13, segment.y * gridSize + 12, eyeSize, eyeSize);
      } else if (dx === -1) { // Left
        ctx.fillRect(segment.x * gridSize + 4, segment.y * gridSize + 5, eyeSize, eyeSize);
        ctx.fillRect(segment.x * gridSize + 4, segment.y * gridSize + 12, eyeSize, eyeSize);
      } else if (dy === 1) { // Down
        ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 13, eyeSize, eyeSize);
        ctx.fillRect(segment.x * gridSize + 12, segment.y * gridSize + 13, eyeSize, eyeSize);
      } else if (dy === -1) { // Up
        ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 4, eyeSize, eyeSize);
        ctx.fillRect(segment.x * gridSize + 12, segment.y * gridSize + 4, eyeSize, eyeSize);
      }
    } else {
      // Body - dark gray
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
    }
  });
  
  // Draw food - black circle
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(
    food.x * gridSize + gridSize / 2,
    food.y * gridSize + gridSize / 2,
    gridSize / 2 - 2,
    0,
    2 * Math.PI
  );
  ctx.fill();
  
  // Add white highlight to food
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(
    food.x * gridSize + gridSize / 2 - 2,
    food.y * gridSize + gridSize / 2 - 2,
    2,
    0,
    2 * Math.PI
  );
  ctx.fill();
}

// Handle keyboard input
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    
    // If game is not running, reset and start it
    if (!isGameRunning) {
      resetGame();
      startGame();
    } else {
      // If game is running, toggle pause
      togglePause();
    }
    return;
  }
  
  if (isPaused || !isGameRunning) return;
  
  // Prevent reverse direction
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      if (dy === 0) {
        dx = 0;
        dy = -1;
      }
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      if (dy === 0) {
        dx = 0;
        dy = 1;
      }
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      if (dx === 0) {
        dx = -1;
        dy = 0;
      }
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      if (dx === 0) {
        dx = 1;
        dy = 0;
      }
      break;
  }
});

// Button event listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', () => {
  if (isGameRunning) {
    clearInterval(gameLoop);
    isGameRunning = false;
    isPaused = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Start Game';
    pauseBtn.textContent = 'Pause';
  }
  gameSpeed = 100;
  resetGame();
});

// Initialize on load
init();
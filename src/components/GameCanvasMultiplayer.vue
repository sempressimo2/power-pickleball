<template>
  <div class="game-container" ref="gameContainer">
    <!-- Top Controls -->
    <div class="top-controls">
      <!-- Game Status -->
      <div v-if="isMultiplayer" class="game-status">
        <span class="status-indicator" :class="{ connected: isConnected }"></span>
        <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>

      <!-- Audio Toggle Button -->
      <button 
        @click="toggleAudio" 
        class="control-button audio-toggle"
        :class="{ muted: !audioEnabled }"
      >
        <i class="fas" :class="audioEnabled ? 'fa-volume-up' : 'fa-volume-mute'"></i>
      </button>

      <!-- Fullscreen Button -->
      <button 
        @click="toggleFullscreen" 
        class="control-button fullscreen-toggle"
      >
        <i class="fas" :class="isFullscreen ? 'fa-compress' : 'fa-expand'"></i>
      </button>

      <!-- Menu Button -->
      <button 
        @click="toggleMenu" 
        class="control-button fab" 
        v-if="gameStarted"
      >
        <i class="fas" :class="menuOpen ? 'fa-times' : 'fa-pause'"></i>
      </button>
    </div>

    <!-- Main Canvas -->
    <div class="canvas-wrapper" ref="canvasWrapper">
      <canvas
        ref="gameCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousemove="handleMouseMove"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @click="handleCanvasClick"
      ></canvas>
      
      <!-- Game Overlay -->
      <div class="game-overlay">
        <!-- Multiplayer Info -->
        <div v-if="isMultiplayer && opponentName" class="multiplayer-info">
          <div class="player-info">
            <span class="player-label">{{ playerNumber === 1 ? 'YOU' : 'OPPONENT' }}</span>
            <span class="player-name">{{ playerNumber === 1 ? playerName : opponentName }}</span>
          </div>
          <div class="vs">VS</div>
          <div class="player-info">
            <span class="player-label">{{ playerNumber === 2 ? 'YOU' : 'OPPONENT' }}</span>
            <span class="player-name">{{ playerNumber === 2 ? playerName : opponentName }}</span>
          </div>
        </div>

        <!-- Waiting for opponent -->
        <div v-if="isMultiplayer && waitingForOpponent" class="waiting-overlay">
          <div class="waiting-content">
            <div class="spinner"></div>
            <h3>Waiting for opponent to ready up...</h3>
            <p>{{ readyStatus }}</p>
          </div>
        </div>

        <!-- Opponent disconnected -->
        <div v-if="opponentDisconnected" class="disconnect-overlay">
          <div class="disconnect-content">
            <i class="fas fa-wifi-slash"></i>
            <h3>Opponent Disconnected</h3>
            <p>Your opponent has left the game</p>
            <button @click="exitGame" class="btn btn-primary">
              <i class="fas fa-home"></i> Return to Menu
            </button>
          </div>
        </div>

        <!-- Serve instruction -->
        <div v-if="gameStarted && isServing && isMyServe && !gameActive" class="serve-instruction">
          <i class="fas" :class="isMobile ? 'fa-hand-paper' : 'fa-hand-pointer'"></i>
          {{ isMobile ? 'Swipe to serve' : 'Click to serve' }}
        </div>
        
        <!-- Winner overlay -->
        <div v-if="showWinner" class="winner-overlay">
          <h2>{{ winnerText }}</h2>
          <p>{{ player1Score }} - {{ player2Score }}</p>
          <button @click="exitGame" class="btn-replay">
            <i class="fas fa-home"></i> Back to Menu
          </button>
        </div>
      </div>
    </div>
    
    <!-- Menu -->
    <transition name="scale">
      <div v-if="menuOpen && gameStarted" class="control-menu">
        <button @click="toggleGame" class="control-menu-item">
          <i class="fas" :class="gamePaused ? 'fa-play' : 'fa-pause'"></i>
          <span>{{ gamePaused ? 'Resume' : 'Pause' }}</span>
        </button>
        <button @click="exitGame" class="control-menu-item">
          <i class="fas fa-home"></i>
          <span>Exit Game</span>
        </button>
      </div>
    </transition>
    
    <!-- Start overlay for local game -->
    <div v-if="!gameStarted && !isMultiplayer" class="start-overlay">
      <button @click="startGame" class="btn-start">
        <i class="fas fa-play"></i> 
        {{ isMobile ? 'Tap to Start' : 'Start Game' }}
      </button>
    </div>

    <!-- Ready button for multiplayer -->
    <div v-if="!gameStarted && isMultiplayer && !waitingForOpponent && !gameReady" class="start-overlay">
      <button @click="playerReady" class="btn-start">
        <i class="fas fa-check"></i> Ready
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAudio } from '../composables/useAudio.js'
import { useMultiplayer } from '../composables/useMultiplayer'

const router = useRouter()
const multiplayer = useMultiplayer()
const { audioEnabled, gameSounds, initAudio, toggleAudio, preloadAudio } = useAudio()

// Canvas refs
const gameContainer = ref(null)
const gameCanvas = ref(null)
const canvasWrapper = ref(null)
const canvasWidth = ref(1200)
const canvasHeight = ref(600)

// Game settings
let gameSettings = null
const isMultiplayer = ref(false)
const playerName = ref('')
const opponentName = ref('')
const playerNumber = ref(null)

// Connection state
const isConnected = computed(() => multiplayer.isConnected.value)
const waitingForOpponent = ref(false)
const opponentDisconnected = ref(false)
const gameReady = ref(false)
const readyStatus = ref('Waiting for opponent...')

// Game state - Using absolute scores (player1 and player2)
const player1Score = ref(0)
const player2Score = ref(0)
const gameActive = ref(false)
const gameStarted = ref(false)
const gamePaused = ref(false)
const isServing = ref(true)
const showWinner = ref(false)
const winnerText = ref('')
const rallyCount = ref(0)

// Track first return for paddle movement
const isFirstReturn = ref(false)
const serverJustServed = ref(false)

// Movement speed constants
const PADDLE_MOVE_SPEED = 180

// Determine if it's my serve
const isMyServe = computed(() => {
  if (!isMultiplayer.value) return true
  
  const totalScore = player1Score.value + player2Score.value
  const currentServer = totalScore % 2 === 0 ? 'player1' : 'player2'
  return (playerNumber.value === 1 && currentServer === 'player1') ||
         (playerNumber.value === 2 && currentServer === 'player2')
})

// UI state
const menuOpen = ref(false)
const isFullscreen = ref(false)
const isMobile = ref(false)

// Touch controls
const touchStartY = ref(0)
const touchStartX = ref(0)
const touchActive = ref(false)
const touchStartTime = ref(0)

let ctx = null
let animationId = null
let gameLoopRunning = false
let lastBallUpdateTime = 0
let lastPaddleUpdateTime = 0
const BALL_UPDATE_INTERVAL = 1000 / 60 // 60 FPS for ball
const PADDLE_UPDATE_INTERVAL = 16 // 60 FPS for paddle updates

// Court dimensions
const court = {
  width: 880,
  height: 400,
  x: 160,
  y: 100,
  kitchenWidth: 140,
  lineWidth: 3
}

const netX = court.x + court.width / 2

// Game objects - ABSOLUTE POSITIONS (same for both players)
const ball = ref({
  x: -100,
  y: -100,
  radius: 10,
  speedX: 0,
  speedY: 0,
  color: '#ffd23f'
})

// Paddles - ALWAYS at fixed positions
const player1Paddle = ref({
  x: 100,
  y: 250,
  width: 14,
  height: 68,
  color: '#00c853',
  targetY: 250,
  targetX: 100,
  isMovingIn: false
})

const player2Paddle = ref({
  x: 1085,
  y: 250,
  width: 15,
  height: 75,
  color: '#ff6b35',
  targetY: 250,
  targetX: 1085,
  isMovingIn: false
})

// References to MY paddle and OPPONENT paddle based on player number
const myPaddle = computed(() => {
  return playerNumber.value === 2 ? player2Paddle.value : player1Paddle.value
})

const opponentPaddle = computed(() => {
  return playerNumber.value === 2 ? player1Paddle.value : player2Paddle.value
})

// Initialize multiplayer handlers
const initMultiplayerHandlers = () => {
  console.log('Initializing multiplayer handlers')
  
  // Handle server errors
  multiplayer.onMessage('error', (data) => {
    console.error('Server error:', data.message)
    alert(`Server error: ${data.message}`)
  })

  // Handle ready confirmation
  multiplayer.onMessage('readyConfirmed', () => {
    console.log('Ready confirmed by server!')
  })
  
  // Handle opponent paddle movement
  multiplayer.onMessage('opponentPaddleMove', (data) => {
    // Update the correct paddle based on which player sent it
    const paddleToUpdate = data.playerNumber === 1 ? player1Paddle : player2Paddle
    
    paddleToUpdate.value.targetY = data.paddle.y
    paddleToUpdate.value.targetX = data.paddle.targetX || data.paddle.x
    
    if (data.paddle.isMovingIn !== undefined) {
      paddleToUpdate.value.isMovingIn = data.paddle.isMovingIn
    }
  })

  // Handle serve from opponent
  multiplayer.onMessage('serveExecuted', (data) => {
    console.log('Opponent served')
    
    // Ball position is absolute - same for both players
    ball.value.x = data.ball.x
    ball.value.y = data.ball.y
    ball.value.speedX = data.ball.speedX
    ball.value.speedY = data.ball.speedY
    
    isServing.value = false
    gameActive.value = true
    rallyCount.value = 0
    serverJustServed.value = true
    isFirstReturn.value = true
    
    // Ensure game loop is running
    startGameLoop()
  })

  // Handle ball sync
  multiplayer.onMessage('ballSync', (data) => {
    // Ball position is absolute - same for both players
    ball.value.x = data.ball.x
    ball.value.y = data.ball.y
    ball.value.speedX = data.ball.speedX
    ball.value.speedY = data.ball.speedY
  })

  // Handle score updates
  multiplayer.onMessage('scoreUpdate', (data) => {
    console.log('Score update received:', data)
    
    // Always use absolute scores
    player1Score.value = data.scores.player1
    player2Score.value = data.scores.player2
    
    isServing.value = true
    gameActive.value = false
    rallyCount.value = 0
    isFirstReturn.value = false
    serverJustServed.value = false
    
    // Setup for next serve and keep loop running
    setupServe()
  })

  // Handle game over
  multiplayer.onMessage('gameOver', (data) => {
    console.log('Game over:', data)
    const didIWin = (playerNumber.value === 1 && data.winner === 'player1') ||
                    (playerNumber.value === 2 && data.winner === 'player2')
    winnerText.value = didIWin ? 'You Win!' : 'You Lose!'
    showWinner.value = true
    gameActive.value = false
    gameStarted.value = false
    gameLoopRunning = false
    
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  })

  // Handle player ready status
  multiplayer.onMessage('playerReadyStatus', (data) => {
    console.log('Ready status update:', data)
    readyStatus.value = `Players ready: ${data.readyCount}/${data.totalPlayers}`
  })

  // Handle game start
  multiplayer.onMessage('gameStart', (data) => {
    console.log('GAME START RECEIVED!')
    console.log('Game state:', data.gameState)
    
    waitingForOpponent.value = false
    gameStarted.value = true
    gameReady.value = true
    
    // Update game state from server
    if (data.gameState) {
      player1Score.value = data.gameState.scores.player1
      player2Score.value = data.gameState.scores.player2
    }
    
    // Setup the serve and start the game loop
    setupServe()
    startGameLoop()
    
    console.log('Game started successfully!')
  })

  // Handle opponent disconnect
  multiplayer.onMessage('opponentDisconnected', () => {
    console.log('Opponent disconnected')
    opponentDisconnected.value = true
    gameActive.value = false
    gameLoopRunning = false
    
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  })
}

// Player ready for multiplayer
const playerReady = () => {
  console.log('Player clicking ready')
  waitingForOpponent.value = true
  multiplayer.sendPlayerReady()
}

// Touch and mouse handlers
const handleTouchStart = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  const rect = gameCanvas.value.getBoundingClientRect()
  touchStartY.value = (touch.clientY - rect.top) * (canvasHeight.value / rect.height)
  touchStartX.value = (touch.clientX - rect.left) * (canvasWidth.value / rect.width)
  touchStartTime.value = Date.now()
  touchActive.value = true
}

const handleTouchMove = (e) => {
  e.preventDefault()
  if (!touchActive.value || isServing.value) return
  
  const touch = e.touches[0]
  const rect = gameCanvas.value.getBoundingClientRect()
  const touchY = (touch.clientY - rect.top) * (canvasHeight.value / rect.height)
  
  // Update MY paddle
  myPaddle.value.targetY = touchY - myPaddle.value.height / 2
}

const handleTouchEnd = (e) => {
  e.preventDefault()
  
  if (touchActive.value && isServing.value && isMyServe.value && !gameActive.value) {
    const duration = Date.now() - touchStartTime.value
    if (duration < 300) {
      handleServe()
    }
  }
  
  touchActive.value = false
}

const handleMouseMove = (e) => {
  if (isMobile.value || isServing.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const scaleY = canvasHeight.value / rect.height
  const mouseY = (e.clientY - rect.top) * scaleY
  
  // Update MY paddle
  myPaddle.value.targetY = mouseY - myPaddle.value.height / 2
}

const handleCanvasClick = () => {
  if (isServing.value && isMyServe.value && !gameActive.value && !isMobile.value && gameStarted.value) {
    handleServe()
  }
}

// Serve function
const handleServe = () => {
  if (!isMyServe.value || !gameStarted.value) return
  
  console.log('Executing serve')
  gameSounds.serve()
  
  // Calculate serve trajectory
  const serveSpeed = 480 * (gameSettings?.difficulty?.speed || 1)
  const angle = (Math.random() - 0.5) * 0.4
  
  // Serve direction based on which player is serving
  if (playerNumber.value === 1) {
    ball.value.speedX = serveSpeed * Math.cos(angle)
    ball.value.speedY = serveSpeed * Math.sin(angle)
  } else {
    ball.value.speedX = -serveSpeed * Math.cos(angle)
    ball.value.speedY = serveSpeed * Math.sin(angle)
  }
  
  isServing.value = false
  gameActive.value = true
  rallyCount.value = 0
  serverJustServed.value = true
  isFirstReturn.value = true
  
  // Move serving paddle into the court
  if (playerNumber.value === 1) {
    player1Paddle.value.targetX = court.x + 40
    player1Paddle.value.isMovingIn = true
  } else {
    player2Paddle.value.targetX = court.x + court.width - 40
    player2Paddle.value.isMovingIn = true
  }
  
  // Send serve to opponent
  if (isMultiplayer.value) {
    multiplayer.sendServe({
      x: ball.value.x,
      y: ball.value.y,
      speedX: ball.value.speedX,
      speedY: ball.value.speedY
    })
  }
  
  // Ensure game loop is running
  startGameLoop()
}

// Start or ensure game loop is running
const startGameLoop = () => {
  if (!gameLoopRunning) {
    gameLoopRunning = true
    lastTime = 0
    gameLoop()
  }
}

// Setup serve positions
const setupServe = () => {
  console.log('Setting up serve...')
  isServing.value = true
  isFirstReturn.value = false
  serverJustServed.value = false
  ball.value.speedX = 0
  ball.value.speedY = 0
  
  // Reset paddles to baseline positions
  player1Paddle.value.x = 100
  player1Paddle.value.targetX = 100
  player1Paddle.value.isMovingIn = false
  
  player2Paddle.value.x = 1085
  player2Paddle.value.targetX = 1085
  player2Paddle.value.isMovingIn = false
  
  // Determine who's serving
  const totalScore = player1Score.value + player2Score.value
  const isPlayer1Serving = totalScore % 2 === 0
  
  // Position ball next to serving player
  if (isPlayer1Serving) {
    ball.value.x = player1Paddle.value.x + player1Paddle.value.width + 30
    ball.value.y = player1Paddle.value.y + player1Paddle.value.height / 2
  } else {
    ball.value.x = player2Paddle.value.x - 30
    ball.value.y = player2Paddle.value.y + player2Paddle.value.height / 2
  }
}

// Update game state
const update = (deltaTime) => {
  if (!gameActive.value || gamePaused.value) return
  
  // Move ball
  ball.value.x += ball.value.speedX * deltaTime
  ball.value.y += ball.value.speedY * deltaTime
  
  // Ball collision with top/bottom walls
  if (ball.value.y - ball.value.radius < court.y || 
      ball.value.y + ball.value.radius > court.y + court.height) {
    gameSounds.wallBounce()
    ball.value.speedY = -ball.value.speedY
    
    if (ball.value.y - ball.value.radius < court.y) {
      ball.value.y = court.y + ball.value.radius
    } else {
      ball.value.y = court.y + court.height - ball.value.radius
    }
  }
  
  // Update MY paddle (whichever one I control)
  const myPaddleRef = playerNumber.value === 1 ? player1Paddle : player2Paddle
  
  // Handle horizontal movement
  if (myPaddleRef.value.isMovingIn) {
    const diff = myPaddleRef.value.targetX - myPaddleRef.value.x
    const moveSpeed = PADDLE_MOVE_SPEED * deltaTime
    if (Math.abs(diff) > moveSpeed) {
      myPaddleRef.value.x += diff > 0 ? moveSpeed : -moveSpeed
    } else {
      myPaddleRef.value.x = myPaddleRef.value.targetX
      myPaddleRef.value.isMovingIn = false
    }
  }
  
  // Update vertical position
  const paddleSpeed = 0.25
  const oldY = myPaddleRef.value.y
  const oldX = myPaddleRef.value.x
  myPaddleRef.value.y += (myPaddleRef.value.targetY - myPaddleRef.value.y) * paddleSpeed
  myPaddleRef.value.y = Math.max(court.y, Math.min(court.y + court.height - myPaddleRef.value.height, myPaddleRef.value.y))
  
  // Send paddle position to opponent
  if (isMultiplayer.value) {
    const now = Date.now()
    const paddleMoved = Math.abs(oldY - myPaddleRef.value.y) > 0.5 || Math.abs(oldX - myPaddleRef.value.x) > 0.5
    
    if ((paddleMoved || now - lastPaddleUpdateTime > 100) && now - lastPaddleUpdateTime > PADDLE_UPDATE_INTERVAL) {
      multiplayer.sendPaddleMove({
        x: myPaddleRef.value.x,
        y: myPaddleRef.value.y,
        targetX: myPaddleRef.value.targetX,
        isMovingIn: myPaddleRef.value.isMovingIn
      })
      lastPaddleUpdateTime = now
    }
  }
  
  // Update opponent paddle (smooth interpolation)
  const opponentPaddleRef = playerNumber.value === 1 ? player2Paddle : player1Paddle
  
  if (opponentPaddleRef.value.isMovingIn) {
    const diff = opponentPaddleRef.value.targetX - opponentPaddleRef.value.x
    const moveSpeed = PADDLE_MOVE_SPEED * deltaTime
    if (Math.abs(diff) > moveSpeed) {
      opponentPaddleRef.value.x += diff > 0 ? moveSpeed : -moveSpeed
    } else {
      opponentPaddleRef.value.x = opponentPaddleRef.value.targetX
      opponentPaddleRef.value.isMovingIn = false
    }
  }
  
  if (isMultiplayer.value) {
    const opponentSpeed = 0.3
    opponentPaddleRef.value.y += (opponentPaddleRef.value.targetY - opponentPaddleRef.value.y) * opponentSpeed
    opponentPaddleRef.value.y = Math.max(court.y, Math.min(court.y + court.height - opponentPaddleRef.value.height, opponentPaddleRef.value.y))
  }
  
  // Ball collision with player 1 paddle (LEFT)
  if (ball.value.x - ball.value.radius < player1Paddle.value.x + player1Paddle.value.width &&
      ball.value.x + ball.value.radius > player1Paddle.value.x &&
      ball.value.y - ball.value.radius < player1Paddle.value.y + player1Paddle.value.height &&
      ball.value.y + ball.value.radius > player1Paddle.value.y &&
      ball.value.speedX < 0) {
    
    gameSounds.paddleHit(0.8)
    
    const hitPos = (ball.value.y - (player1Paddle.value.y + player1Paddle.value.height / 2)) / (player1Paddle.value.height / 2)
    ball.value.speedX = Math.abs(ball.value.speedX) * 1.05
    ball.value.x = player1Paddle.value.x + player1Paddle.value.width + ball.value.radius
    ball.value.speedY = hitPos * 360
    rallyCount.value++
    
    // Handle first return
    if (isFirstReturn.value && playerNumber.value === 1 && !isMyServe.value) {
      player1Paddle.value.targetX = court.x + 40
      player1Paddle.value.isMovingIn = true
      isFirstReturn.value = false
    } else if (isFirstReturn.value && playerNumber.value === 2 && isMyServe.value) {
      player1Paddle.value.targetX = court.x + 40
      player1Paddle.value.isMovingIn = true
      isFirstReturn.value = false
    }
  }
  
  // Ball collision with player 2 paddle (RIGHT)
  if (ball.value.x + ball.value.radius > player2Paddle.value.x &&
      ball.value.x - ball.value.radius < player2Paddle.value.x + player2Paddle.value.width &&
      ball.value.y - ball.value.radius < player2Paddle.value.y + player2Paddle.value.height &&
      ball.value.y + ball.value.radius > player2Paddle.value.y &&
      ball.value.speedX > 0) {
    
    gameSounds.paddleHit(0.9)
    
    const hitPos = (ball.value.y - (player2Paddle.value.y + player2Paddle.value.height / 2)) / (player2Paddle.value.height / 2)
    ball.value.speedX = -Math.abs(ball.value.speedX) * 1.05
    ball.value.x = player2Paddle.value.x - ball.value.radius
    ball.value.speedY = hitPos * 360
    rallyCount.value++
    
    // Handle first return
    if (isFirstReturn.value && playerNumber.value === 2 && !isMyServe.value) {
      player2Paddle.value.targetX = court.x + court.width - 40
      player2Paddle.value.isMovingIn = true
      isFirstReturn.value = false
    } else if (isFirstReturn.value && playerNumber.value === 1 && isMyServe.value) {
      player2Paddle.value.targetX = court.x + court.width - 40
      player2Paddle.value.isMovingIn = true
      isFirstReturn.value = false
    }
  }
  
  // Check for scoring
  if (ball.value.x < court.x - 50) {
    // Ball went past left side - Player 2 scores
    gameActive.value = false
    player2Score.value++
    handleScoreUpdate()
    
  } else if (ball.value.x > court.x + court.width + 50) {
    // Ball went past right side - Player 1 scores
    gameActive.value = false
    player1Score.value++
    handleScoreUpdate()
  }
  
  // Send ball updates if multiplayer
  if (isMultiplayer.value && gameActive.value) {
    const now = Date.now()
    if (now - lastBallUpdateTime > BALL_UPDATE_INTERVAL) {
      multiplayer.sendBallUpdate({
        x: ball.value.x,
        y: ball.value.y,
        speedX: ball.value.speedX,
        speedY: ball.value.speedY
      })
      lastBallUpdateTime = now
    }
  }
}

// Handle score update
const handleScoreUpdate = () => {
  if (isMultiplayer.value) {
    const scores = { 
      player1: player1Score.value, 
      player2: player2Score.value 
    }
    
    const totalScore = player1Score.value + player2Score.value
    const currentServer = totalScore % 2 === 0 ? 'player1' : 'player2'
    
    multiplayer.sendScore(scores, currentServer)
  }
  
  checkWinner()
}

// Check for winner
const checkWinner = () => {
  const myScore = playerNumber.value === 1 ? player1Score.value : player2Score.value
  const oppScore = playerNumber.value === 1 ? player2Score.value : player1Score.value
  
  if ((player1Score.value >= 11 || player2Score.value >= 11) && 
      Math.abs(player1Score.value - player2Score.value) >= 2) {
    
    gameSounds.gameWin()
    
    winnerText.value = myScore > oppScore ? 'You Win!' : 
                      isMultiplayer.value ? 'You Lose!' : 'Computer Wins!'
    
    showWinner.value = true
    gameActive.value = false
    gameStarted.value = false
    gameLoopRunning = false
  } else {
    // Continue playing - setup next serve
    setTimeout(() => {
      setupServe()
      // Keep the game loop running
      if (gameLoopRunning) {
        draw() // Draw the new serve position
      }
    }, 1000)
  }
}

// Drawing functions
const drawCourt = () => {
  const theme = gameSettings?.court || {}
  
  // Draw background
  ctx.fillStyle = theme.backgroundColor || '#0a3d0c'
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // Draw base court
  ctx.fillStyle = theme.baseColor || '#1e7e34'
  ctx.fillRect(court.x, court.y, court.width, court.height)
  
  // Draw court lines
  ctx.strokeStyle = theme.lineColor || '#ffffff'
  ctx.lineWidth = court.lineWidth
  ctx.strokeRect(court.x, court.y, court.width, court.height)
  
  // Draw kitchen zones
  ctx.fillStyle = theme.kitchenColor || 'rgba(255, 193, 7, 0.2)'
  ctx.fillRect(netX - court.kitchenWidth, court.y, court.kitchenWidth, court.height)
  ctx.fillRect(netX, court.y, court.kitchenWidth, court.height)
  
  // Draw kitchen lines
  ctx.strokeStyle = theme.lineColor || '#ffffff'
  ctx.lineWidth = court.lineWidth
  ctx.beginPath()
  ctx.moveTo(netX - court.kitchenWidth, court.y)
  ctx.lineTo(netX - court.kitchenWidth, court.y + court.height)
  ctx.moveTo(netX + court.kitchenWidth, court.y)
  ctx.lineTo(netX + court.kitchenWidth, court.y + court.height)
  ctx.stroke()
  
  // Draw net
  ctx.strokeStyle = theme.netColor || '#ffffff'
  ctx.lineWidth = 4
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(netX, court.y - 20)
  ctx.lineTo(netX, court.y + court.height + 20)
  ctx.stroke()
  ctx.setLineDash([])
  
  // Draw scores - ALWAYS show Player 1 on left, Player 2 on right
  ctx.save()
  ctx.font = 'bold 48px sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 10
  
  ctx.fillText(player1Score.value.toString(), court.x + court.width / 4, 70)
  ctx.fillText(player2Score.value.toString(), court.x + 3 * court.width / 4, 70)
  
  // Draw serve indicator
  if (isServing.value && gameStarted.value) {
    ctx.font = 'bold 16px sans-serif'
    const totalScore = player1Score.value + player2Score.value
    const servingPlayer = totalScore % 2 === 0 ? 'player1' : 'player2'
    
    if (isMyServe.value) {
      ctx.fillStyle = myPaddle.value.color
      ctx.fillText('YOUR SERVE', canvasWidth.value / 2, 45)
    } else {
      ctx.fillStyle = opponentPaddle.value.color
      ctx.fillText('OPPONENT SERVE', canvasWidth.value / 2, 45)
    }
  }
  
  // Draw rally counter
  if (rallyCount.value > 2 && gameActive.value) {
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fillText(`Rally: ${rallyCount.value} hits`, canvasWidth.value / 2, canvasHeight.value - 20)
  }
  
  ctx.restore()
}

const drawPaddle = (paddle) => {
  ctx.shadowBlur = 20
  ctx.shadowColor = paddle.color
  ctx.fillStyle = paddle.color
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
  ctx.shadowBlur = 0
}

const drawBall = () => {
  // Calculate distance from the net for scaling effect
  const distanceFromNet = Math.abs(ball.value.x - netX)
  const maxDistance = court.width / 2
  
  // Calculate scale factor
  const normalizedDistance = Math.min(distanceFromNet / maxDistance, 1)
  const scaleFactor = 1 + (0.3 * (1 - normalizedDistance) * (1 - normalizedDistance))
  
  // Apply scaling to the ball radius
  const scaledRadius = ball.value.radius * scaleFactor
  
  ctx.shadowBlur = 15 * scaleFactor
  ctx.shadowColor = ball.value.color
  ctx.fillStyle = ball.value.color
  ctx.beginPath()
  ctx.arc(ball.value.x, ball.value.y, scaledRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

const draw = () => {
  if (!ctx) return
  drawCourt()
  drawPaddle(player1Paddle.value)
  drawPaddle(player2Paddle.value)
  if (ball.value.x > 0) { // Only draw ball if it's in play
    drawBall()
  }
}

// Game loop
let lastTime = 0
const gameLoop = (currentTime = 0) => {
  if (!gameLoopRunning) {
    animationId = null
    return
  }
  
  const deltaTime = (currentTime - lastTime) / 1000 || 0.016
  lastTime = currentTime
  
  update(deltaTime)
  draw()
  
  animationId = requestAnimationFrame(gameLoop)
}

// Start game (for local play)
const startGame = () => {
  if (!gameStarted.value) {
    gameSounds.gameStart()
    gameStarted.value = true
    showWinner.value = false
    setupServe()
    startGameLoop()
  }
}

// Toggle menu
const toggleMenu = () => {
  gameSounds.menuOpen()
  menuOpen.value = !menuOpen.value
}

// Toggle game pause
const toggleGame = () => {
  gameSounds.menuClick()
  gamePaused.value = !gamePaused.value
  menuOpen.value = false
}

// Exit game
const exitGame = () => {
  gameSounds.menuClick()
  
  gameLoopRunning = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  
  if (isMultiplayer.value) {
    multiplayer.leaveGame()
  }
  
  router.push('/')
}

// Fullscreen handling
const toggleFullscreen = async () => {
  gameSounds.menuClick()
  
  if (!document.fullscreenElement) {
    try {
      await gameContainer.value.requestFullscreen()
      isFullscreen.value = true
    } catch (err) {
      console.error('Fullscreen failed:', err)
    }
  } else {
    try {
      await document.exitFullscreen()
      isFullscreen.value = false
    } catch (err) {
      console.error('Exit fullscreen failed:', err)
    }
  }
  
  menuOpen.value = false
}

// Check if mobile
const checkMobile = () => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (window.innerWidth <= 768)
}

// Resize canvas
const resizeCanvas = () => {
  if (!canvasWrapper.value) return
  
  const wrapper = canvasWrapper.value
  const containerWidth = wrapper.clientWidth
  const containerHeight = wrapper.clientHeight
  
  const aspectRatio = 2
  let newWidth = containerWidth
  let newHeight = containerWidth / aspectRatio
  
  if (newHeight > containerHeight) {
    newHeight = containerHeight
    newWidth = containerHeight * aspectRatio
  }
  
  if (gameCanvas.value) {
    gameCanvas.value.style.width = `${newWidth}px`
    gameCanvas.value.style.height = `${newHeight}px`
  }
}

// Load game settings
const loadGameSettings = () => {
  const settings = sessionStorage.getItem('gameSettings')
  if (settings) {
    gameSettings = JSON.parse(settings)
    
    if (gameSettings.gameType === 'online') {
      isMultiplayer.value = true
      playerName.value = gameSettings.playerName || 'Player'
      opponentName.value = gameSettings.opponentName || 'Opponent'
      playerNumber.value = gameSettings.playerNumber || 1
      
      console.log(`Playing as Player ${playerNumber.value}: ${playerName.value} vs ${opponentName.value}`)
    }
    
    if (gameSettings.court) {
      ball.value.color = gameSettings.court.ballColor
    }
  }
}

onMounted(async () => {
  ctx = gameCanvas.value.getContext('2d')
  loadGameSettings()
  checkMobile()
  resizeCanvas()
  
  await initAudio()
  
  if (isMultiplayer.value) {
    // Ensure we're connected
    if (!multiplayer.isConnected.value) {
      try {
        await multiplayer.connect()
      } catch (error) {
        console.error('Failed to connect to multiplayer server:', error)
        alert('Failed to connect to multiplayer server. Please try again.')
        router.push('/')
        return
      }
    }
    
    initMultiplayerHandlers()
  }
  
  // Initial draw
  draw()
  
  // Event listeners
  gameContainer.value.addEventListener('click', preloadAudio, { once: true })
  gameContainer.value.addEventListener('touchstart', preloadAudio, { once: true })
  
  window.addEventListener('resize', () => {
    checkMobile()
    resizeCanvas()
  })
  
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      checkMobile()
      resizeCanvas()
    }, 500)
  })
  
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
    setTimeout(() => {
      resizeCanvas()
    }, 100)
  })
})

onUnmounted(() => {
  gameLoopRunning = false
  
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  
  if (isMultiplayer.value) {
    multiplayer.leaveGame()
  }
  
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('orientationchange', resizeCanvas)
})
</script>

<style scoped>
@import './GameCanvas.css';

.game-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
}

.status-indicator.connected {
  background: #44ff44;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.multiplayer-info {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 30px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 30px;
  border-radius: 10px;
  color: white;
  z-index: 10;
}

.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.player-label {
  font-size: 0.8rem;
  opacity: 0.7;
}

.player-name {
  font-size: 1.1rem;
  font-weight: bold;
}

.vs {
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffd700;
}

.waiting-overlay,
.disconnect-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  color: white;
  z-index: 100;
}

.waiting-content h3,
.disconnect-content h3 {
  margin-top: 20px;
  font-size: 1.5rem;
}

.disconnect-content i {
  font-size: 3rem;
  color: #ff4444;
  margin-bottom: 20px;
}

.disconnect-content p {
  margin: 10px 0 30px;
  opacity: 0.8;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

.serve-instruction {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px 40px;
  border-radius: 10px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 50;
}

.serve-instruction i {
  font-size: 1.5rem;
  color: #ffd700;
}
</style>
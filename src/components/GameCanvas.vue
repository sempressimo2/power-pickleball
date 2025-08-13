<template>
  <div class="game-container" ref="gameContainer">
    <!-- Minimal floating UI -->
    <div class="floating-ui" v-if="!isFullscreen">
      <button @click="enterFullscreen" class="fullscreen-prompt" v-if="isMobile && !gameStarted">
        <i class="fas fa-expand"></i>
        <span>Tap for fullscreen</span>
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
      
      <!-- Minimal Overlay UI -->
      <div class="game-overlay">
        <!-- Serve instruction for mobile -->
        <div v-if="isServing && !gameActive" class="serve-instruction">
          <i class="fas fa-hand-pointer"></i>
          {{ isMobile ? 'Tap to serve' : 'Click to serve' }}
        </div>
        
        <!-- Winner overlay -->
        <div v-if="showWinner" class="winner-overlay">
          <h2>{{ winner }}</h2>
          <p>{{ playerScore }} - {{ computerScore }}</p>
          <button @click="resetGame" class="btn-replay">
            <i class="fas fa-redo"></i> Play Again
          </button>
        </div>
      </div>
    </div>
    
    <!-- Floating Action Button (FAB) -->
    <div class="fab-container" v-if="gameStarted">
      <button @click="toggleMenu" class="fab" :class="{ active: menuOpen }">
        <i class="fas" :class="menuOpen ? 'fa-times' : (gameActive ? 'fa-pause' : 'fa-play')"></i>
      </button>
      
      <!-- FAB Menu -->
      <transition name="scale">
        <div v-if="menuOpen" class="fab-menu">
          <button @click="toggleGame" class="fab-menu-item">
            <i class="fas" :class="gameActive ? 'fa-pause' : 'fa-play'"></i>
            <span>{{ gameActive ? 'Pause' : 'Resume' }}</span>
          </button>
          <button @click="resetGame" class="fab-menu-item">
            <i class="fas fa-redo"></i>
            <span>Reset</span>
          </button>
          <button @click="toggleFullscreen" class="fab-menu-item" v-if="!isMobile">
            <i class="fas fa-expand"></i>
            <span>Fullscreen</span>
          </button>
          <button @click="exitGame" class="fab-menu-item">
            <i class="fas fa-home"></i>
            <span>Exit</span>
          </button>
        </div>
      </transition>
    </div>
    
    <!-- Start button for desktop/first time -->
    <div v-if="!gameStarted && !isMobile" class="start-overlay">
      <button @click="startGame" class="btn-start">
        <i class="fas fa-play"></i> Start Game
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const gameContainer = ref(null)
const gameCanvas = ref(null)
const canvasWrapper = ref(null)

// Responsive canvas dimensions
const canvasWidth = ref(1200)
const canvasHeight = ref(600)

// Game state
const playerScore = ref(0)
const computerScore = ref(0)
const gameActive = ref(false)
const gameStarted = ref(false)
const gameTime = ref(0)
const isPlayerServe = ref(true)
const isServing = ref(true)
const showWinner = ref(false)
const winner = ref('')

// UI state
const menuOpen = ref(false)
const isFullscreen = ref(false)
const isMobile = ref(false)

// Touch control state
const touchStartY = ref(0)
const touchActive = ref(false)

let ctx = null
let animationId = null
let startTime = null
let elapsedTime = 0
let gameSettings = null

// Frame rate regulation
let lastFrameTime = 0
const targetFPS = 60
const frameInterval = 1000 / targetFPS
let deltaTime = 0

// Rally tracking
let isFirstReturn = ref(false)
let serverJustServed = ref(false)

// Physics constants
const BALL_BASE_SPEED = 480
const COMPUTER_BASE_SPEED = 270
const BALL_ACCELERATION = 1.05
const PADDLE_MOVE_SPEED = 180

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

// Game objects
const ball = ref({
  x: 0,
  y: 0,
  radius: 10,
  speedX: 0,
  speedY: 0,
  color: '#ffd23f'
})

const playerPaddle = {
  x: 100,
  y: 250,
  width: 15,
  height: 75,
  color: '#00c853',
  targetY: 250,
  targetX: 100,
  isMovingIn: false
}

const computerPaddle = {
  x: 1085,
  y: 250,
  width: 15,
  height: 75,
  color: '#ff6b35',
  targetX: 1085,
  isMovingIn: false
}

// Check if mobile device
const checkMobile = () => {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (window.innerWidth <= 768)
}

// Resize canvas for mobile
const resizeCanvas = () => {
  if (!canvasWrapper.value) return
  
  const wrapper = canvasWrapper.value
  const containerWidth = wrapper.clientWidth
  const containerHeight = wrapper.clientHeight
  
  // Maintain aspect ratio
  const aspectRatio = 2 // 1200/600
  let newWidth = containerWidth
  let newHeight = containerWidth / aspectRatio
  
  if (newHeight > containerHeight) {
    newHeight = containerHeight
    newWidth = containerHeight * aspectRatio
  }
  
  // Update canvas display size (CSS)
  if (gameCanvas.value) {
    gameCanvas.value.style.width = `${newWidth}px`
    gameCanvas.value.style.height = `${newHeight}px`
  }
}

// Touch controls
const handleTouchStart = (e) => {
  e.preventDefault()
  if (!gameStarted.value && isMobile.value) {
    startGame()
    return
  }
  
  const touch = e.touches[0]
  const rect = gameCanvas.value.getBoundingClientRect()
  touchStartY.value = (touch.clientY - rect.top) * (canvasHeight.value / rect.height)
  touchActive.value = true
  
  // Handle serve on tap
  if (isServing.value && isPlayerServe.value && !gameActive.value) {
    handleServe()
  }
}

const handleTouchMove = (e) => {
  e.preventDefault()
  if (!touchActive.value || isServing.value) return
  
  const touch = e.touches[0]
  const rect = gameCanvas.value.getBoundingClientRect()
  const touchY = (touch.clientY - rect.top) * (canvasHeight.value / rect.height)
  playerPaddle.targetY = touchY - playerPaddle.height / 2
}

const handleTouchEnd = (e) => {
  e.preventDefault()
  touchActive.value = false
}

const handleMouseMove = (e) => {
  if (isMobile.value || isServing.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const scaleY = canvasHeight.value / rect.height
  const mouseY = (e.clientY - rect.top) * scaleY
  playerPaddle.targetY = mouseY - playerPaddle.height / 2
}

const handleCanvasClick = () => {
  if (isServing.value && isPlayerServe.value && !gameActive.value && !isMobile.value) {
    handleServe()
  }
}

// Fullscreen handling
const enterFullscreen = async () => {
  try {
    if (gameContainer.value.requestFullscreen) {
      await gameContainer.value.requestFullscreen()
    } else if (gameContainer.value.webkitRequestFullscreen) {
      await gameContainer.value.webkitRequestFullscreen()
    } else if (gameContainer.value.msRequestFullscreen) {
      await gameContainer.value.msRequestFullscreen()
    }
    isFullscreen.value = true
    if (!gameStarted.value) {
      startGame()
    }
  } catch (err) {
    console.error('Fullscreen failed:', err)
  }
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    enterFullscreen()
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// Menu handling
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const toggleGame = () => {
  if (gameActive.value) {
    pauseGame()
  } else {
    resumeGame()
  }
  menuOpen.value = false
}

const exitGame = () => {
  router.push('/')
}

// Get game settings
const loadGameSettings = () => {
  const settings = sessionStorage.getItem('gameSettings')
  if (settings) {
    gameSettings = JSON.parse(settings)
    if (gameSettings.court) {
      ball.value.color = gameSettings.court.ballColor
    }
  } else {
    gameSettings = {
      court: {
        backgroundColor: '#0a3d0c',
        baseColor: '#1e7e34',
        lineColor: '#ffffff',
        kitchenColor: 'rgba(255, 193, 7, 0.2)',
        serviceColor: 'rgba(255, 255, 255, 0.05)',
        ballColor: '#fff700',
        netColor: '#ffffff'
      },
      difficulty: { speed: 1 }
    }
  }
}

// Enhanced draw function with on-canvas scores
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
  
  // Draw centerlines
  ctx.beginPath()
  ctx.moveTo(court.x, court.y + court.height / 2)
  ctx.lineTo(netX - court.kitchenWidth, court.y + court.height / 2)
  ctx.moveTo(netX + court.kitchenWidth, court.y + court.height / 2)
  ctx.lineTo(court.x + court.width, court.y + court.height / 2)
  ctx.stroke()
  
  // Highlight service area during serve
  if (isServing.value) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)'
    if (isPlayerServe.value) {
      const serveFromRight = playerScore.value % 2 === 0
      if (serveFromRight) {
        ctx.fillRect(netX + court.kitchenWidth, court.y, 
                    (court.x + court.width) - (netX + court.kitchenWidth), court.height / 2)
      } else {
        ctx.fillRect(netX + court.kitchenWidth, court.y + court.height / 2, 
                    (court.x + court.width) - (netX + court.kitchenWidth), court.height / 2)
      }
    } else {
      const serveFromRight = computerScore.value % 2 === 0
      if (serveFromRight) {
        ctx.fillRect(court.x, court.y, netX - court.kitchenWidth - court.x, court.height / 2)
      } else {
        ctx.fillRect(court.x, court.y + court.height / 2, 
                    netX - court.kitchenWidth - court.x, court.height / 2)
      }
    }
  }
  
  // Draw net
  ctx.strokeStyle = theme.netColor || '#ffffff'
  ctx.lineWidth = 4
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(netX, court.y - 20)
  ctx.lineTo(netX, court.y + court.height + 20)
  ctx.stroke()
  ctx.setLineDash([])
  
  // Draw net posts
  ctx.fillStyle = theme.netColor || '#ffffff'
  ctx.fillRect(netX - 3, court.y - 25, 6, 20)
  ctx.fillRect(netX - 3, court.y + court.height + 5, 6, 20)
  
  // Draw scores on canvas (mobile-friendly large scores)
  ctx.save()
  ctx.font = isMobile.value ? 'bold 60px sans-serif' : 'bold 48px sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 10
  
  // Player score (left)
  ctx.fillText(playerScore.value.toString(), court.x + court.width / 4, 70)
  // Computer score (right)
  ctx.fillText(computerScore.value.toString(), court.x + 3 * court.width / 4, 70)
  
  // Score labels
  ctx.font = isMobile.value ? '14px sans-serif' : '12px sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillText('YOU', court.x + court.width / 4, 90)
  ctx.fillText('CPU', court.x + 3 * court.width / 4, 90)
  
  ctx.restore()
  
  // Draw timer if game is active
  if (gameStarted.value && gameTime.value > 0) {
    const minutes = Math.floor(gameTime.value / 60)
    const seconds = gameTime.value % 60
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    ctx.save()
    ctx.font = '16px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.textAlign = 'center'
    ctx.fillText(timeString, canvasWidth.value / 2, 30)
    ctx.restore()
  }
}

const drawPaddle = (paddle) => {
  ctx.shadowBlur = 20
  ctx.shadowColor = paddle.color
  ctx.fillStyle = paddle.color
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
  ctx.shadowBlur = 0
}

const drawBall = () => {
  ctx.shadowBlur = 15
  ctx.shadowColor = ball.value.color
  ctx.fillStyle = ball.value.color
  ctx.beginPath()
  ctx.arc(ball.value.x, ball.value.y, ball.value.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

const draw = () => {
  drawCourt()
  drawPaddle(playerPaddle)
  drawPaddle(computerPaddle)
  drawBall()
}

// Serve functions
const getServeTargets = (isPlayerServing, serveFromRight) => {
  let targetArea = {}
  
  if (isPlayerServing) {
    if (serveFromRight) {
      targetArea = {
        x1: netX + court.kitchenWidth,
        x2: court.x + court.width - 20,
        y1: court.y + 20,
        y2: court.y + court.height / 2 - 20
      }
    } else {
      targetArea = {
        x1: netX + court.kitchenWidth,
        x2: court.x + court.width - 20,
        y1: court.y + court.height / 2 + 20,
        y2: court.y + court.height - 20
      }
    }
  } else {
    if (serveFromRight) {
      targetArea = {
        x1: court.x + 20,
        x2: netX - court.kitchenWidth,
        y1: court.y + 20,
        y2: court.y + court.height / 2 - 20
      }
    } else {
      targetArea = {
        x1: court.x + 20,
        x2: netX - court.kitchenWidth,
        y1: court.y + court.height / 2 + 20,
        y2: court.y + court.height - 20
      }
    }
  }
  
  const targets = [
    {
      x: (targetArea.x1 + targetArea.x2) / 2,
      y: (targetArea.y1 + targetArea.y2) / 2
    },
    {
      x: isPlayerServing ? targetArea.x2 : targetArea.x1,
      y: targetArea.y1
    },
    {
      x: isPlayerServing ? targetArea.x2 : targetArea.x1,
      y: targetArea.y2
    }
  ]
  
  return targets
}

const calculateServeVelocity = (startX, startY, targetX, targetY, isPlayerServing) => {
  const speed = gameSettings?.difficulty?.speed || 1
  const baseSpeed = BALL_BASE_SPEED * speed
  
  const dx = targetX - startX
  const dy = targetY - startY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  const speedX = (dx / distance) * baseSpeed
  const speedY = (dy / distance) * baseSpeed * 0.5
  
  return { speedX, speedY }
}

const setupServe = () => {
  isServing.value = true
  isFirstReturn.value = false
  serverJustServed.value = false
  ball.value.speedX = 0
  ball.value.speedY = 0
  
  playerPaddle.x = 100
  playerPaddle.targetX = 100
  playerPaddle.isMovingIn = false
  computerPaddle.x = 1085
  computerPaddle.targetX = 1085
  computerPaddle.isMovingIn = false
  
  if (isPlayerServe.value) {
    const serveFromRight = playerScore.value % 2 === 0
    
    if (serveFromRight) {
      const serveY = court.y + 3 * court.height / 4
      playerPaddle.y = serveY - playerPaddle.height / 2
      playerPaddle.targetY = playerPaddle.y
      ball.value.x = playerPaddle.x + playerPaddle.width + 30
      ball.value.y = serveY
    } else {
      const serveY = court.y + court.height / 4
      playerPaddle.y = serveY - playerPaddle.height / 2
      playerPaddle.targetY = playerPaddle.y
      ball.value.x = playerPaddle.x + playerPaddle.width + 30
      ball.value.y = serveY
    }
    
    computerPaddle.y = court.y + court.height / 2 - computerPaddle.height / 2
    
  } else {
    const serveFromRight = computerScore.value % 2 === 0
    
    if (serveFromRight) {
      const serveY = court.y + 3 * court.height / 4
      computerPaddle.y = serveY - computerPaddle.height / 2
      ball.value.x = computerPaddle.x - 30
      ball.value.y = serveY
    } else {
      const serveY = court.y + court.height / 4
      computerPaddle.y = serveY - computerPaddle.height / 2
      ball.value.x = computerPaddle.x - 30
      ball.value.y = serveY
    }
    
    playerPaddle.y = court.y + court.height / 2 - playerPaddle.height / 2
    playerPaddle.targetY = playerPaddle.y
    
    setTimeout(() => {
      if (!gameActive.value && isServing.value && !isPlayerServe.value) {
        const targets = getServeTargets(false, serveFromRight)
        const targetIndex = Math.floor(Math.random() * 3)
        const target = targets[targetIndex]
        
        const velocity = calculateServeVelocity(
          ball.value.x, ball.value.y,
          target.x, target.y,
          false
        )
        
        ball.value.speedX = velocity.speedX
        ball.value.speedY = velocity.speedY
        isServing.value = false
        serverJustServed.value = true
        isFirstReturn.value = true
        gameActive.value = true
        
        computerPaddle.targetX = court.x + court.width - 40
        computerPaddle.isMovingIn = true
        
        lastFrameTime = 0
        if (!animationId) gameLoop(performance.now())
      }
    }, 1500)
  }
  
  draw()
}

const handleServe = () => {
  if (isServing.value && isPlayerServe.value && !gameActive.value) {
    const serveFromRight = playerScore.value % 2 === 0
    
    const targets = getServeTargets(true, serveFromRight)
    const targetIndex = Math.floor(Math.random() * 3)
    const target = targets[targetIndex]
    
    const velocity = calculateServeVelocity(
      ball.value.x, ball.value.y,
      target.x, target.y,
      true
    )
    
    ball.value.speedX = velocity.speedX
    ball.value.speedY = velocity.speedY
    
    isServing.value = false
    serverJustServed.value = true
    isFirstReturn.value = true
    gameActive.value = true
    gameStarted.value = true
    
    playerPaddle.targetX = court.x + 40
    playerPaddle.isMovingIn = true
    
    if (!startTime) {
      startTime = Date.now()
    }
    
    lastFrameTime = 0
    if (!animationId) {
      gameLoop(performance.now())
    }
  }
}

const update = (dt) => {
  if (!gameActive.value) return
  
  // Update timer
  if (startTime) {
    const now = Date.now()
    const totalSeconds = Math.floor((now - startTime + elapsedTime) / 1000)
    gameTime.value = totalSeconds
  }
  
  // Move ball
  ball.value.x += ball.value.speedX * dt
  ball.value.y += ball.value.speedY * dt
  
  // Ball collision with boundaries
  if (ball.value.y - ball.value.radius < court.y || 
      ball.value.y + ball.value.radius > court.y + court.height) {
    ball.value.speedY = -ball.value.speedY
    if (ball.value.y - ball.value.radius < court.y) {
      ball.value.y = court.y + ball.value.radius
    } else {
      ball.value.y = court.y + court.height - ball.value.radius
    }
  }
  
  // Ball collision with paddles
  if (ball.value.x - ball.value.radius < playerPaddle.x + playerPaddle.width &&
      ball.value.x + ball.value.radius > playerPaddle.x &&
      ball.value.y - ball.value.radius < playerPaddle.y + playerPaddle.height &&
      ball.value.y + ball.value.radius > playerPaddle.y) {
    ball.value.speedX = Math.abs(ball.value.speedX) * BALL_ACCELERATION
    const hitPos = (ball.value.y - (playerPaddle.y + playerPaddle.height / 2)) / (playerPaddle.height / 2)
    ball.value.speedY = hitPos * 360
    ball.value.x = playerPaddle.x + playerPaddle.width + ball.value.radius
    
    if (isFirstReturn.value && !isPlayerServe.value) {
      playerPaddle.targetX = court.x + 40
      playerPaddle.isMovingIn = true
      isFirstReturn.value = false
    }
  }
  
  if (ball.value.x + ball.value.radius > computerPaddle.x &&
      ball.value.x - ball.value.radius < computerPaddle.x + computerPaddle.width &&
      ball.value.y - ball.value.radius < computerPaddle.y + computerPaddle.height &&
      ball.value.y + ball.value.radius > computerPaddle.y) {
    ball.value.speedX = -Math.abs(ball.value.speedX) * BALL_ACCELERATION
    const hitPos = (ball.value.y - (computerPaddle.y + computerPaddle.height / 2)) / (computerPaddle.height / 2)
    ball.value.speedY = hitPos * 360
    ball.value.x = computerPaddle.x - ball.value.radius
    
    if (isFirstReturn.value && isPlayerServe.value) {
      computerPaddle.targetX = court.x + court.width - 40
      computerPaddle.isMovingIn = true
      isFirstReturn.value = false
    }
  }
  
  // Paddle horizontal movement
  if (playerPaddle.isMovingIn) {
    const diff = playerPaddle.targetX - playerPaddle.x
    const moveSpeed = PADDLE_MOVE_SPEED * dt
    if (Math.abs(diff) > moveSpeed) {
      playerPaddle.x += diff > 0 ? moveSpeed : -moveSpeed
    } else {
      playerPaddle.x = playerPaddle.targetX
      playerPaddle.isMovingIn = false
    }
  }
  
  if (computerPaddle.isMovingIn) {
    const diff = computerPaddle.targetX - computerPaddle.x
    const moveSpeed = PADDLE_MOVE_SPEED * dt
    if (Math.abs(diff) > moveSpeed) {
      computerPaddle.x += diff > 0 ? moveSpeed : -moveSpeed
    } else {
      computerPaddle.x = computerPaddle.targetX
      computerPaddle.isMovingIn = false
    }
  }
  
  // Smooth player paddle vertical movement
  if (!isServing.value) {
    const paddleSpeed = 0.2
    playerPaddle.y += (playerPaddle.targetY - playerPaddle.y) * paddleSpeed
  }
  
  // Computer AI
  if (!isServing.value && ball.value.speedX > 0) {
    const difficultySpeed = gameSettings?.difficulty?.speed || 1
    const computerSpeed = COMPUTER_BASE_SPEED * difficultySpeed * dt
    const targetY = ball.value.y - computerPaddle.height / 2
    const diff = targetY - computerPaddle.y
    
    if (Math.abs(diff) > computerSpeed) {
      computerPaddle.y += diff > 0 ? computerSpeed : -computerSpeed
    } else {
      computerPaddle.y = targetY
    }
  }
  
  // Keep paddles in bounds
  computerPaddle.y = Math.max(court.y, Math.min(court.y + court.height - computerPaddle.height, computerPaddle.y))
  playerPaddle.y = Math.max(court.y, Math.min(court.y + court.height - playerPaddle.height, playerPaddle.y))
  playerPaddle.targetY = Math.max(court.y, Math.min(court.y + court.height - playerPaddle.height, playerPaddle.targetY))
  
  // Score points
  if (ball.value.x < court.x - 50) {
    computerScore.value++
    gameActive.value = false
    
    if (isPlayerServe.value) {
      isPlayerServe.value = false
    }
    
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    
    checkWinner()
  } else if (ball.value.x > court.x + court.width + 50) {
    playerScore.value++
    gameActive.value = false
    
    if (!isPlayerServe.value) {
      isPlayerServe.value = true
    }
    
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    
    checkWinner()
  }
}

const checkWinner = () => {
  if ((playerScore.value >= 11 || computerScore.value >= 11) && 
      Math.abs(playerScore.value - computerScore.value) >= 2) {
    winner.value = playerScore.value > computerScore.value ? 'You Win!' : 'Computer Wins!'
    showWinner.value = true
    gameActive.value = false
    gameStarted.value = false
  } else {
    setTimeout(() => setupServe(), 1000)
  }
}

const gameLoop = (currentTime) => {
  if (!lastFrameTime) {
    lastFrameTime = currentTime
  }
  
  const elapsed = currentTime - lastFrameTime
  
  if (elapsed >= frameInterval) {
    deltaTime = Math.min(elapsed / 1000, 0.1)
    update(deltaTime)
    draw()
    lastFrameTime = currentTime - (elapsed % frameInterval)
  }
  
  if (gameActive.value) {
    animationId = requestAnimationFrame(gameLoop)
  }
}

const startGame = () => {
  if (!gameStarted.value) {
    gameStarted.value = true
    showWinner.value = false
    setupServe()
    if (isMobile.value) {
      menuOpen.value = false
    }
  }
}

const resumeGame = () => {
  gameActive.value = true
  lastFrameTime = 0
  if (!startTime) {
    startTime = Date.now()
  }
  if (!animationId) {
    gameLoop(performance.now())
  }
}

const pauseGame = () => {
  gameActive.value = false
  if (startTime) {
    elapsedTime += Date.now() - startTime
    startTime = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

const resetGame = () => {
  gameActive.value = false
  gameStarted.value = false
  playerScore.value = 0
  computerScore.value = 0
  gameTime.value = 0
  startTime = null
  elapsedTime = 0
  lastFrameTime = 0
  deltaTime = 0
  isPlayerServe.value = true
  isServing.value = true
  isFirstReturn.value = false
  serverJustServed.value = false
  showWinner.value = false
  winner.value = ''
  menuOpen.value = false
  
  ball.value.x = -100
  ball.value.y = -100
  ball.value.speedX = 0
  ball.value.speedY = 0
  
  playerPaddle.x = 100
  playerPaddle.targetX = 100
  playerPaddle.y = court.y + court.height / 2 - playerPaddle.height / 2
  playerPaddle.targetY = playerPaddle.y
  playerPaddle.isMovingIn = false
  
  computerPaddle.x = 1085
  computerPaddle.targetX = 1085
  computerPaddle.y = court.y + court.height / 2 - computerPaddle.height / 2
  computerPaddle.isMovingIn = false
  
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  
  draw()
}

onMounted(() => {
  ctx = gameCanvas.value.getContext('2d')
  loadGameSettings()
  checkMobile()
  resizeCanvas()
  
  ball.value.x = -100
  ball.value.y = -100
  draw()
  
  // Listen for resize
  window.addEventListener('resize', () => {
    checkMobile()
    resizeCanvas()
  })
  
  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
    resizeCanvas()
  })
  
  // Auto-prompt fullscreen on mobile
  if (isMobile.value) {
    // Show fullscreen prompt
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

canvas {
  max-width: 100%;
  max-height: 100%;
  display: block;
  touch-action: none;
  cursor: none;
}

/* Floating UI */
.floating-ui {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.fullscreen-prompt {
  background: rgba(0, 200, 83, 0.9);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  animation: pulse 2s infinite;
  box-shadow: 0 4px 15px rgba(0, 200, 83, 0.4);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Game Overlay */
.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.serve-instruction {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  padding: 15px 30px;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: bounce 2s infinite;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.winner-overlay {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  pointer-events: all;
}

.winner-overlay h2 {
  font-size: 3rem;
  margin: 0 0 15px 0;
  color: #00c853;
}

.winner-overlay p {
  font-size: 1.5rem;
  margin: 0 0 25px 0;
}

.btn-replay {
  background: linear-gradient(135deg, #00c853, #00e676);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

/* Start Overlay */
.start-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
}

.btn-start {
  background: linear-gradient(135deg, #00c853, #00e676);
  color: white;
  border: none;
  padding: 20px 40px;
  border-radius: 35px;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 6px 25px rgba(0, 200, 83, 0.4);
  transition: transform 0.3s ease;
}

.btn-start:hover {
  transform: scale(1.05);
}

/* FAB Container */
.fab-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00c853, #00e676);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.fab.active {
  background: linear-gradient(135deg, #ff6b35, #ff8c42);
  transform: rotate(45deg);
}

.fab:hover {
  transform: scale(1.1);
}

.fab.active:hover {
  transform: rotate(45deg) scale(1.1);
}

/* FAB Menu */
.fab-menu {
  position: absolute;
  bottom: 70px;
  right: 0;
  background: white;
  border-radius: 15px;
  padding: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  min-width: 160px;
}

.fab-menu-item {
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
  color: #333;
  transition: background 0.3s ease;
  text-align: left;
}

.fab-menu-item:hover {
  background: #f0f0f0;
}

.fab-menu-item i {
  width: 20px;
  color: #00c853;
}

/* Transitions */
.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s ease;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Mobile-specific styles */
@media (max-width: 768px) {
  .game-container {
    padding: 0;
  }
  
  .serve-instruction {
    padding: 12px 25px;
    font-size: 1rem;
  }
  
  .winner-overlay h2 {
    font-size: 2rem;
  }
  
  .winner-overlay p {
    font-size: 1.2rem;
  }
  
  .fab-container {
    bottom: 15px;
    right: 15px;
  }
  
  .fab {
    width: 48px;
    height: 48px;
    font-size: 1.1rem;
  }
}

/* Fullscreen styles */
.game-container:fullscreen {
  padding: 0;
}

.game-container:-webkit-full-screen {
  padding: 0;
}
</style>
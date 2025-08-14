<template>
  <div class="game-container" ref="gameContainer">
    <!-- Top Right Control Buttons - Same for both desktop and mobile -->
    <div class="top-controls">
      <!-- Audio Toggle Button -->
      <button 
        @click="toggleAudio" 
        class="control-button audio-toggle"
        :class="{ muted: !audioEnabled }"
        :title="audioEnabled ? 'Mute Sounds' : 'Enable Sounds'"
      >
        <i class="fas" :class="audioEnabled ? 'fa-volume-up' : 'fa-volume-mute'"></i>
      </button>

      <!-- Fullscreen Button - Always visible -->
      <button 
        @click="toggleFullscreen" 
        class="control-button fullscreen-toggle"
        :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
      >
        <i class="fas" :class="isFullscreen ? 'fa-compress' : 'fa-expand'"></i>
      </button>

      <!-- Play/Pause Button - Show after game starts -->
      <button 
        @click="toggleMenu" 
        class="control-button fab" 
        :class="{ active: menuOpen }"
        v-if="gameStarted"
        :title="gameActive ? 'Game Menu' : 'Game Menu'"
      >
        <i class="fas" :class="menuOpen ? 'fa-times' : (gameActive ? 'fa-pause' : 'fa-play')"></i>
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
        <!-- Serve instruction -->
        <div v-if="isServing && isPlayerServe && !gameActive" class="serve-instruction">
          <i class="fas" :class="isMobile ? 'fa-hand-paper' : 'fa-hand-pointer'"></i>
          {{ isMobile ? 'Swipe to serve' : 'Click to serve' }}
        </div>
        
        <!-- CPU serve countdown warning -->
        <div v-if="isServing && !isPlayerServe && !gameActive && cpuServeCountdown > 0" class="cpu-serve-warning">
          <div class="countdown-circle">
            <span class="countdown-number">{{ cpuServeCountdown }}</span>
          </div>
          <p>CPU serving in {{ cpuServeCountdown }}...</p>
        </div>
        
        <!-- Side Out notification -->
        <transition name="slide-fade">
          <div v-if="showSideOut" class="side-out-notification">
            <div class="side-out-content">
              <h3>SIDE OUT!</h3>
              <p>{{ sideOutMessage }}</p>
            </div>
          </div>
        </transition>
        
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
    
    <!-- Menu positioned below control buttons -->
    <transition name="scale">
      <div v-if="menuOpen && gameStarted" class="control-menu">
        <button @click="toggleGame" class="control-menu-item">
          <i class="fas" :class="gameActive ? 'fa-pause' : 'fa-play'"></i>
          <span>{{ gameActive ? 'Pause' : 'Resume' }}</span>
        </button>
        <button @click="resetGame" class="control-menu-item">
          <i class="fas fa-redo"></i>
          <span>Reset</span>
        </button>
        <button @click="toggleAudio" class="control-menu-item">
          <i class="fas" :class="audioEnabled ? 'fa-volume-up' : 'fa-volume-mute'"></i>
          <span>{{ audioEnabled ? 'Mute' : 'Unmute' }}</span>
        </button>
        <button @click="toggleFullscreen" class="control-menu-item">
          <i class="fas" :class="isFullscreen ? 'fa-compress' : 'fa-expand'"></i>
          <span>{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
        </button>
        <button @click="exitGame" class="control-menu-item">
          <i class="fas fa-home"></i>
          <span>Exit</span>
        </button>
      </div>
    </transition>
    
    <!-- Start overlay - Shows start button or prompts to tap screen -->
    <div v-if="!gameStarted" class="start-overlay">
      <button @click="startGame" class="btn-start">
        <i class="fas fa-play"></i> 
        {{ isMobile ? 'Tap to Start' : 'Start Game' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAudio } from '../composables/useAudio.js'

const router = useRouter()

// Initialize audio system
const { audioEnabled, gameSounds, initAudio, toggleAudio, preloadAudio } = useAudio()

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

// CPU serve countdown
const cpuServeCountdown = ref(0)
let cpuServeTimer = null

// Side out notification
const showSideOut = ref(false)
const sideOutMessage = ref('')

// UI state
const menuOpen = ref(false)
const isFullscreen = ref(false)
const isMobile = ref(false)

// Touch control state for swipe detection
const touchStartY = ref(0)
const touchStartX = ref(0)
const touchActive = ref(false)
const touchStartTime = ref(0)

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
let rallyCount = ref(0) // Track rallies for statistics

// Physics constants
const BALL_BASE_SPEED = 480
const COMPUTER_BASE_SPEED = 270
const BALL_ACCELERATION = 1.05
const PADDLE_MOVE_SPEED = 180

// Swipe detection constants
const SWIPE_MIN_DISTANCE = 50
const SWIPE_MAX_TIME = 300

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
  width: 14,
  height: 68,
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

// Detect swipe gesture
const detectSwipe = (startX, startY, endX, endY, duration) => {
  const deltaX = endX - startX
  const deltaY = endY - startY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  
  if (distance < SWIPE_MIN_DISTANCE || duration > SWIPE_MAX_TIME) {
    return null
  }
  
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
  
  // Determine swipe direction
  if (Math.abs(angle) < 45) return 'right'
  if (Math.abs(angle) > 135) return 'left'
  if (angle > 45 && angle < 135) return 'down'
  if (angle < -45 && angle > -135) return 'up'
  
  return null
}

// CPU serve countdown
const startCpuServeCountdown = () => {
  cpuServeCountdown.value = 3
  
  cpuServeTimer = setInterval(() => {
    if (cpuServeCountdown.value > 1) {
      gameSounds.countdown() // Play countdown sound
    }
    cpuServeCountdown.value--
    
    if (cpuServeCountdown.value <= 0) {
      clearInterval(cpuServeTimer)
      cpuServeTimer = null
      
      // Auto-serve for CPU
      if (!gameActive.value && isServing.value && !isPlayerServe.value) {
        executeCpuServe()
      }
    }
  }, 1000)
}

const stopCpuServeCountdown = () => {
  if (cpuServeTimer) {
    clearInterval(cpuServeTimer)
    cpuServeTimer = null
  }
  cpuServeCountdown.value = 0
}

// Show side out notification
const displaySideOut = (losingServer) => {
  showSideOut.value = true
  if (losingServer === 'player') {
    sideOutMessage.value = 'You lost serve. Computer\'s turn to serve!'
  } else {
    sideOutMessage.value = 'Computer lost serve. Your turn to serve!'
  }
  
  // Auto-hide after 2.5 seconds
  setTimeout(() => {
    showSideOut.value = false
  }, 2500)
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

// Touch controls with swipe detection
const handleTouchStart = (e) => {
  e.preventDefault()
  if (!gameStarted.value && isMobile.value) {
    startGame()
    return
  }
  
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
  playerPaddle.targetY = touchY - playerPaddle.height / 2
}

const handleTouchEnd = (e) => {
  e.preventDefault()
  
  if (touchActive.value && isServing.value && isPlayerServe.value && !gameActive.value) {
    const touch = e.changedTouches[0]
    const rect = gameCanvas.value.getBoundingClientRect()
    const touchEndX = (touch.clientX - rect.left) * (canvasWidth.value / rect.width)
    const touchEndY = (touch.clientY - rect.top) * (canvasHeight.value / rect.height)
    const duration = Date.now() - touchStartTime.value
    
    const swipeDirection = detectSwipe(
      touchStartX.value, touchStartY.value,
      touchEndX, touchEndY,
      duration
    )
    
    // Serve on any swipe gesture
    if (swipeDirection) {
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
  playerPaddle.targetY = mouseY - playerPaddle.height / 2
}

const handleCanvasClick = () => {
  if (isServing.value && isPlayerServe.value && !gameActive.value && !isMobile.value) {
    handleServe()
  }
}

// Enhanced fullscreen handling with orientation lock
const enterFullscreen = async () => {
  try {
    // Request fullscreen first
    if (gameContainer.value.requestFullscreen) {
      await gameContainer.value.requestFullscreen()
    } else if (gameContainer.value.webkitRequestFullscreen) {
      await gameContainer.value.webkitRequestFullscreen()
    } else if (gameContainer.value.msRequestFullscreen) {
      await gameContainer.value.msRequestFullscreen()
    }
    
    isFullscreen.value = true
    
    // Lock orientation to landscape on mobile devices
    if (isMobile.value && screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock('landscape')
        console.log('Orientation locked to landscape')
      } catch (orientationError) {
        console.log('Orientation lock not supported or failed:', orientationError)
        // Fallback: try different landscape orientations
        try {
          await screen.orientation.lock('landscape-primary')
        } catch (fallbackError) {
          try {
            await screen.orientation.lock('landscape-secondary')
          } catch (finalError) {
            console.log('All orientation lock attempts failed')
          }
        }
      }
    }
    
    // Start game automatically on mobile after fullscreen
    if (!gameStarted.value && isMobile.value) {
      // Small delay to let orientation change settle
      setTimeout(() => {
        startGame()
      }, 500)
    }
    
  } catch (err) {
    console.error('Fullscreen failed:', err)
  }
}

const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen()
    }
    
    isFullscreen.value = false
    
    // Unlock orientation when exiting fullscreen on mobile
    if (isMobile.value && screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock()
        console.log('Orientation unlocked')
      } catch (orientationError) {
        console.log('Orientation unlock failed:', orientationError)
      }
    }
    
  } catch (err) {
    console.error('Exit fullscreen failed:', err)
  }
}

const toggleFullscreen = () => {
  gameSounds.menuClick() // Play menu sound
  if (!document.fullscreenElement) {
    enterFullscreen()
  } else {
    exitFullscreen()
  }
  menuOpen.value = false
}

// Menu handling
const toggleMenu = () => {
  gameSounds.menuOpen() // Play menu open sound
  menuOpen.value = !menuOpen.value
}

const toggleGame = () => {
  gameSounds.menuClick() // Play menu click sound
  if (gameActive.value) {
    pauseGame()
  } else {
    resumeGame()
  }
  menuOpen.value = false
}

const exitGame = () => {
  gameSounds.menuClick() // Play menu click sound
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

// Enhanced draw function with on-canvas scores and serve indicator
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
  
  // Draw scores on canvas
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
  
  // Draw serve indicator (text only, no arrows)
  if (!gameActive.value || isServing.value) {
    ctx.save()
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    
    if (isPlayerServe.value) {
      ctx.fillStyle = 'rgba(0, 200, 83, 0.9)'
      ctx.fillText('YOUR SERVE', canvasWidth.value / 2 - 100, 45)
    } else {
      ctx.fillStyle = 'rgba(255, 107, 53, 0.9)'
      ctx.fillText('CPU SERVE', canvasWidth.value / 2 + 100, 45)
    }
    
    ctx.restore()
  }
  
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
  
  // Draw rally count (optional - shows engagement)
  if (rallyCount.value > 2 && gameActive.value) {
    ctx.save()
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.textAlign = 'center'
    ctx.fillText(`Rally: ${rallyCount.value} hits`, canvasWidth.value / 2, canvasHeight.value - 20)
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
  // Calculate distance from the net for scaling effect
  const distanceFromNet = Math.abs(ball.value.x - netX)
  const maxDistance = court.width / 2
  
  // Calculate scale factor (1.0 at the ends, up to 1.3 at the net)
  // Using a smooth cosine curve for natural scaling
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
  rallyCount.value = 0
  ball.value.speedX = 0
  ball.value.speedY = 0
  
  stopCpuServeCountdown() // Clear any existing countdown
  
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
    
    // Start the 3-second countdown for CPU serve
    startCpuServeCountdown()
  }
  
  draw()
}

const executeCpuServe = () => {
  if (!gameActive.value && isServing.value && !isPlayerServe.value) {
    gameSounds.serve() // Play serve sound
    
    const serveFromRight = computerScore.value % 2 === 0
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
}

const handleServe = () => {
  if (isServing.value && isPlayerServe.value && !gameActive.value) {
    gameSounds.serve() // Play serve sound
    
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
    
    gameSounds.wallBounce() // Play wall bounce sound
    
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
    
    gameSounds.paddleHit(0.8) // Play paddle hit sound
    
    ball.value.speedX = Math.abs(ball.value.speedX) * BALL_ACCELERATION
    const hitPos = (ball.value.y - (playerPaddle.y + playerPaddle.height / 2)) / (playerPaddle.height / 2)
    ball.value.speedY = hitPos * 360
    ball.value.x = playerPaddle.x + playerPaddle.width + ball.value.radius
    
    rallyCount.value++ // Increment rally count
    
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
    
    gameSounds.paddleHit(0.9) // Play paddle hit sound
    
    ball.value.speedX = -Math.abs(ball.value.speedX) * BALL_ACCELERATION
    const hitPos = (ball.value.y - (computerPaddle.y + computerPaddle.height / 2)) / (computerPaddle.height / 2)
    ball.value.speedY = hitPos * 360
    ball.value.x = computerPaddle.x - ball.value.radius
    
    rallyCount.value++ // Increment rally count
    
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
  
  // CORRECT PICKLEBALL SCORING - Only server can score
  if (ball.value.x < court.x - 50) {
    // Ball went past player - player lost the rally
    gameActive.value = false
    
    if (isPlayerServe.value) {
      // Player was serving and lost - SIDE OUT, no score
      gameSounds.sideOut() // Play side out sound
      isPlayerServe.value = false
      displaySideOut('player')
    } else {
      // Computer was serving and won - Computer scores
      gameSounds.score() // Play score sound
      computerScore.value++
      // Computer keeps serving
    }
    
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    
    checkWinner()
  } else if (ball.value.x > court.x + court.width + 50) {
    // Ball went past computer - computer lost the rally
    gameActive.value = false
    
    if (!isPlayerServe.value) {
      // Computer was serving and lost - SIDE OUT, no score
      gameSounds.sideOut() // Play side out sound
      isPlayerServe.value = true
      displaySideOut('computer')
    } else {
      // Player was serving and won - Player scores
      gameSounds.score() // Play score sound
      playerScore.value++
      // Player keeps serving
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
    
    gameSounds.gameWin() // Play game win sound
    
    winner.value = playerScore.value > computerScore.value ? 'You Win!' : 'Computer Wins!'
    showWinner.value = true
    gameActive.value = false
    gameStarted.value = false
  } else {
    setTimeout(() => setupServe(), showSideOut.value ? 2500 : 1000)
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
    gameSounds.gameStart() // Play game start sound
    
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
  gameSounds.menuClick() // Play menu click sound
  
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
  showSideOut.value = false
  winner.value = ''
  menuOpen.value = false
  rallyCount.value = 0
  
  stopCpuServeCountdown() // Clear countdown on reset
  
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

onMounted(async () => {
  ctx = gameCanvas.value.getContext('2d')
  loadGameSettings()
  checkMobile()
  resizeCanvas()
  
  // Initialize audio system
  await initAudio()
  
  ball.value.x = -100
  ball.value.y = -100
  draw()
  
  // Add click/touch handlers for mobile audio context
  gameContainer.value.addEventListener('click', preloadAudio, { once: true })
  gameContainer.value.addEventListener('touchstart', preloadAudio, { once: true })
  
  // Listen for resize and orientation changes
  window.addEventListener('resize', () => {
    checkMobile()
    resizeCanvas()
  })
  
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      checkMobile()
      resizeCanvas()
    }, 500) // Delay to let orientation change settle
  })
  
  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
    setTimeout(() => {
      resizeCanvas()
    }, 100)
  })
  
  // Handle fullscreen exit via escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen.value) {
      exitFullscreen()
    }
  })
})

onUnmounted(() => {
  stopCpuServeCountdown() // Clean up countdown on unmount
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('orientationchange', resizeCanvas)
})
</script>

<style scoped>
@import './GameCanvas.css';

/* Additional CSS for audio button */
.audio-toggle.muted {
  opacity: 0.6;
  color: #ff6b6b;
}

.audio-toggle {
  color: #4ecdc4;
  transition: color 0.3s ease, opacity 0.3s ease;
}

.audio-toggle:hover {
  color: #26a69a;
}
</style>
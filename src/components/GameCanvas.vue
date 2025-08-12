<template>
  <div class="game-container">
    <div class="game-controls-bar">
      <div class="score-board">
        <div class="score-item">
          <span class="score-label">You</span>
          <span class="score-value">{{ playerScore }}</span>
        </div>
        <div class="timer">
          <i class="fas fa-clock"></i> {{ gameTime }}
        </div>
        <div class="score-item">
          <span class="score-label">CPU</span>
          <span class="score-value">{{ computerScore }}</span>
        </div>
      </div>
      
      <div class="game-info">
        <span class="serve-indicator" v-if="!gameActive && !gameStarted">
          <i class="fas fa-table-tennis"></i> {{ isPlayerServe ? 'Your Serve' : 'CPU Serve' }}
        </span>
        <span class="serve-position" v-if="isServing">
          Serving from: {{ getServePosition() }}
        </span>
        <span class="side-out-indicator" v-if="sideOutMessage">
          {{ sideOutMessage }}
        </span>
      </div>
      
      <div class="game-controls">
        <button @click="startGame" class="control-btn play" v-if="!gameActive" :title="gameStarted ? 'Resume' : 'Start'">
          <i class="fas fa-play"></i>
        </button>
        <button @click="pauseGame" class="control-btn pause" v-else title="Pause">
          <i class="fas fa-pause"></i>
        </button>
        <button @click="resetGame" class="control-btn reset" title="Reset">
          <i class="fas fa-redo"></i>
        </button>
        <button @click="toggleFullscreen" class="control-btn fullscreen" title="Fullscreen">
          <i class="fas fa-expand"></i>
        </button>
      </div>
    </div>
    
    <div class="canvas-wrapper" ref="canvasWrapper">
      <canvas
        ref="gameCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousemove="handleMouseMove"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @click="handleServe"
      ></canvas>
      
      <!-- Mobile Controls Overlay -->
      <div v-if="isMobile" class="mobile-controls">
        <!-- Left side touch zone for paddle movement -->
        <div 
          class="touch-zone left"
          @touchstart="handleTouchZoneStart"
          @touchmove="handleTouchZoneMove"
          @touchend="handleTouchZoneEnd"
        >
          <div class="touch-hint" v-if="!gameStarted">
            <i class="fas fa-hand-pointer"></i>
            <span>Drag to move paddle</span>
          </div>
        </div>
        
        <!-- Right side serve button -->
        <div class="touch-zone right">
          <button 
            v-if="isServing && isPlayerServe && !gameActive"
            @click="handleServe"
            class="mobile-serve-btn"
          >
            <i class="fas fa-table-tennis"></i>
            <span>TAP TO SERVE</span>
          </button>
        </div>
        
        <!-- Mobile game controls -->
        <div class="mobile-game-buttons">
          <button 
            @click="startGame" 
            v-if="!gameActive && !isServing"
            class="mobile-control-btn start"
          >
            <i class="fas fa-play"></i>
          </button>
          <button 
            @click="pauseGame" 
            v-if="gameActive"
            class="mobile-control-btn pause"
          >
            <i class="fas fa-pause"></i>
          </button>
          <button 
            @click="resetGame"
            class="mobile-control-btn reset"
          >
            <i class="fas fa-redo"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Mobile orientation hint -->
    <div v-if="isMobile && isPortrait" class="orientation-hint">
      <i class="fas fa-mobile-alt"></i>
      <p>Rotate device for better experience</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const gameCanvas = ref(null)
const canvasWrapper = ref(null)
const canvasWidth = ref(1200)
const canvasHeight = ref(600)
const playerScore = ref(0)
const computerScore = ref(0)
const gameActive = ref(false)
const gameStarted = ref(false)
const gameTime = ref('00:00')
const isPlayerServe = ref(true)
const isServing = ref(true)
const sideOutMessage = ref('')

// Mobile detection and controls
const isMobile = ref(false)
const isPortrait = ref(false)
const touchStartY = ref(0)
const isTouchActive = ref(false)

let ctx = null
let animationId = null
let startTime = null
let elapsedTime = 0
let gameSettings = null

// Frame rate regulation
let lastFrameTime = 0
const targetFPS = 60
const frameInterval = 1000 / targetFPS // Target 60 FPS
let deltaTime = 0

// Rally tracking
let isFirstReturn = ref(false) // Track if waiting for first return after serve
let serverJustServed = ref(false) // Track if server just served and needs to move in

// Physics constants (per second, will be scaled by deltaTime)
const BALL_BASE_SPEED = 480 // pixels per second
const COMPUTER_BASE_SPEED = 270 // pixels per second
const BALL_ACCELERATION = 1.05 // 5% speed increase per hit
const PADDLE_MOVE_SPEED = 180 // Speed for moving paddles into court after serve

// Court dimensions (properly scaled)
const court = {
  width: 880,  // 44 feet scaled
  height: 400, // 20 feet scaled
  x: 160,
  y: 100,
  kitchenWidth: 140, // 7 feet from net on each side
  lineWidth: 3
}

// Calculate net position (center of court)
const netX = court.x + court.width / 2

// Game objects
const ball = ref({
  x: 0,
  y: 0,
  radius: 10,
  speedX: 0, // pixels per second
  speedY: 0, // pixels per second
  color: '#ffd23f'
})

const playerPaddle = {
  x: 100,
  y: 250,
  width: 15,
  height: 75, // Reduced from 100 to 75 (75% size)
  color: '#00c853',
  targetY: 250, // For smooth mouse tracking
  targetX: 100, // For horizontal movement
  isMovingIn: false // Track if paddle is moving into court
}

const computerPaddle = {
  x: 1085,
  y: 250,
  width: 15,
  height: 75, // Reduced from 100 to 75 (75% size)
  color: '#ff6b35',
  targetX: 1085, // For horizontal movement
  isMovingIn: false // Track if paddle is moving into court
}

// Detect mobile device
const detectMobile = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  isMobile.value = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
                   ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0)
  
  // Also check screen size
  if (window.innerWidth <= 768) {
    isMobile.value = true
  }
}

// Check orientation
const checkOrientation = () => {
  isPortrait.value = window.innerHeight > window.innerWidth
  
  // Adjust canvas size for mobile
  if (isMobile.value) {
    const wrapper = canvasWrapper.value
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect()
      const aspectRatio = 1200 / 600
      
      if (isPortrait.value) {
        // Portrait mode - scale down
        canvasWidth.value = Math.min(1200, rect.width * 0.95)
        canvasHeight.value = canvasWidth.value / aspectRatio
      } else {
        // Landscape mode - use more space
        const maxWidth = Math.min(1200, rect.width * 0.98)
        const maxHeight = Math.min(600, window.innerHeight * 0.7)
        
        if (maxWidth / maxHeight > aspectRatio) {
          canvasHeight.value = maxHeight
          canvasWidth.value = maxHeight * aspectRatio
        } else {
          canvasWidth.value = maxWidth
          canvasHeight.value = maxWidth / aspectRatio
        }
      }
    }
  }
}

// Get serve position text
const getServePosition = () => {
  if (isPlayerServe.value) {
    return playerScore.value % 2 === 0 ? 'Right Court' : 'Left Court'
  } else {
    return computerScore.value % 2 === 0 ? 'Right Court' : 'Left Court'
  }
}

// Touch event handlers for mobile
const handleTouchStart = (e) => {
  if (isMobile.value && !isServing.value) {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = gameCanvas.value.getBoundingClientRect()
    touchStartY.value = (touch.clientY - rect.top) * (canvasHeight.value / rect.height)
    isTouchActive.value = true
  }
}

const handleTouchMove = (e) => {
  if (!isServing.value && isTouchActive.value) {
    e.preventDefault()
    const rect = gameCanvas.value.getBoundingClientRect()
    const touch = e.touches[0]
    const scaleY = canvasHeight.value / rect.height
    const touchY = (touch.clientY - rect.top) * scaleY
    playerPaddle.targetY = touchY - playerPaddle.height / 2
  }
}

const handleTouchEnd = (e) => {
  if (isMobile.value) {
    e.preventDefault()
    isTouchActive.value = false
  }
}

// Touch zone handlers for better mobile control
const handleTouchZoneStart = (e) => {
  if (!isServing.value) {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    const rect = canvasWrapper.value.getBoundingClientRect()
    touchStartY.value = touch.clientY - rect.top
    isTouchActive.value = true
  }
}

const handleTouchZoneMove = (e) => {
  if (!isServing.value && isTouchActive.value) {
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches[0]
    const rect = canvasWrapper.value.getBoundingClientRect()
    const relativeY = touch.clientY - rect.top
    const canvasY = (relativeY / rect.height) * canvasHeight.value
    playerPaddle.targetY = canvasY - playerPaddle.height / 2
  }
}

const handleTouchZoneEnd = (e) => {
  e.preventDefault()
  e.stopPropagation()
  isTouchActive.value = false
}

// Calculate serve target points
const getServeTargets = (isPlayerServing, serveFromRight) => {
  let targetArea = {}
  
  if (isPlayerServing) {
    // Player serving to computer's side (right side of net)
    if (serveFromRight) {
      // Serve to computer's left service area (diagonal)
      targetArea = {
        x1: netX + court.kitchenWidth,
        x2: court.x + court.width - 20,  // Leave margin from baseline
        y1: court.y + 20,  // Leave margin from sideline
        y2: court.y + court.height / 2 - 20
      }
    } else {
      // Serve to computer's right service area (diagonal)
      targetArea = {
        x1: netX + court.kitchenWidth,
        x2: court.x + court.width - 20,
        y1: court.y + court.height / 2 + 20,
        y2: court.y + court.height - 20
      }
    }
  } else {
    // Computer serving to player's side (left side of net)
    if (serveFromRight) {
      // Serve to player's left service area (diagonal)
      targetArea = {
        x1: court.x + 20,
        x2: netX - court.kitchenWidth,
        y1: court.y + 20,
        y2: court.y + court.height / 2 - 20
      }
    } else {
      // Serve to player's right service area (diagonal)
      targetArea = {
        x1: court.x + 20,
        x2: netX - court.kitchenWidth,
        y1: court.y + court.height / 2 + 20,
        y2: court.y + court.height - 20
      }
    }
  }
  
  // Calculate the 3 target points
  const targets = [
    // Middle of service court
    {
      x: (targetArea.x1 + targetArea.x2) / 2,
      y: (targetArea.y1 + targetArea.y2) / 2
    },
    // Top corner of service court
    {
      x: isPlayerServing ? targetArea.x2 : targetArea.x1,
      y: targetArea.y1
    },
    // Bottom corner of service court
    {
      x: isPlayerServing ? targetArea.x2 : targetArea.x1,
      y: targetArea.y2
    }
  ]
  
  return targets
}

// Calculate velocity needed to reach target (in pixels per second)
const calculateServeVelocity = (startX, startY, targetX, targetY, isPlayerServing) => {
  const speed = gameSettings?.difficulty?.speed || 1
  const baseSpeed = BALL_BASE_SPEED * speed
  
  // Calculate distance
  const dx = targetX - startX
  const dy = targetY - startY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Normalize and apply speed (in pixels per second)
  const speedX = (dx / distance) * baseSpeed
  const speedY = (dy / distance) * baseSpeed * 0.5  // Reduce Y speed for more realistic trajectory
  
  return { speedX, speedY }
}

// Get game settings from sessionStorage
const loadGameSettings = () => {
  const settings = sessionStorage.getItem('gameSettings')
  if (settings) {
    gameSettings = JSON.parse(settings)
    if (gameSettings.court) {
      ball.value.color = gameSettings.court.ballColor
    }
  } else {
    // Default settings
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

const drawCourt = () => {
  const theme = gameSettings?.court || {}
  
  // Draw background (outside court area) with theme color
  ctx.fillStyle = theme.backgroundColor || '#0a3d0c'
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // Draw base court
  ctx.fillStyle = theme.baseColor || '#1e7e34'
  ctx.fillRect(court.x, court.y, court.width, court.height)
  
  // Draw outer court boundaries
  ctx.strokeStyle = theme.lineColor || '#ffffff'
  ctx.lineWidth = court.lineWidth
  ctx.strokeRect(court.x, court.y, court.width, court.height)
  
  // Draw kitchen (non-volley zone) - NEXT TO THE NET
  ctx.fillStyle = theme.kitchenColor || 'rgba(255, 193, 7, 0.2)'
  // Left kitchen (7 feet from net)
  ctx.fillRect(netX - court.kitchenWidth, court.y, court.kitchenWidth, court.height)
  // Right kitchen (7 feet from net)
  ctx.fillRect(netX, court.y, court.kitchenWidth, court.height)
  
  // Draw kitchen lines
  ctx.strokeStyle = theme.lineColor || '#ffffff'
  ctx.lineWidth = court.lineWidth
  ctx.beginPath()
  // Left kitchen line
  ctx.moveTo(netX - court.kitchenWidth, court.y)
  ctx.lineTo(netX - court.kitchenWidth, court.y + court.height)
  // Right kitchen line
  ctx.moveTo(netX + court.kitchenWidth, court.y)
  ctx.lineTo(netX + court.kitchenWidth, court.y + court.height)
  ctx.stroke()
  
  // Draw baseline centerlines (divides left and right service areas)
  ctx.beginPath()
  // Left side centerline (from baseline to kitchen)
  ctx.moveTo(court.x, court.y + court.height / 2)
  ctx.lineTo(netX - court.kitchenWidth, court.y + court.height / 2)
  // Right side centerline (from baseline to kitchen)
  ctx.moveTo(netX + court.kitchenWidth, court.y + court.height / 2)
  ctx.lineTo(court.x + court.width, court.y + court.height / 2)
  ctx.stroke()
  
  // Highlight target service area during serve
  if (isServing.value) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.1)'
    if (isPlayerServe.value) {
      // Player serving - highlight target area on computer's side
      const serveFromRight = playerScore.value % 2 === 0
      if (serveFromRight) {
        // Serve to computer's left service area (diagonal)
        ctx.fillRect(netX + court.kitchenWidth, court.y, 
                    (court.x + court.width) - (netX + court.kitchenWidth), court.height / 2)
      } else {
        // Serve to computer's right service area (diagonal)
        ctx.fillRect(netX + court.kitchenWidth, court.y + court.height / 2, 
                    (court.x + court.width) - (netX + court.kitchenWidth), court.height / 2)
      }
    } else {
      // Computer serving - highlight target area on player's side
      const serveFromRight = computerScore.value % 2 === 0
      if (serveFromRight) {
        // Serve to player's left service area (diagonal)
        ctx.fillRect(court.x, court.y, netX - court.kitchenWidth - court.x, court.height / 2)
      } else {
        // Serve to player's right service area (diagonal)
        ctx.fillRect(court.x, court.y + court.height / 2, 
                    netX - court.kitchenWidth - court.x, court.height / 2)
      }
    }
  }
  
  // Draw net (center line)
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
  
  // Draw scores on court
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.font = 'bold 48px Poppins'
  ctx.textAlign = 'center'
  ctx.fillText(playerScore.value, court.x + court.width / 4, 60)
  ctx.fillText(computerScore.value, court.x + 3 * court.width / 4, 60)
  
  // Draw serving indicator
  if (!gameActive.value && !sideOutMessage.value) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '14px Poppins'
    if (isPlayerServe.value) {
      ctx.fillText('YOUR SERVE', court.x + court.width / 4, 85)
    } else {
      ctx.fillText('CPU SERVE', court.x + 3 * court.width / 4, 85)
    }
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
  // Draw court with theme
  drawCourt()
  
  // Draw paddles
  drawPaddle(playerPaddle)
  drawPaddle(computerPaddle)
  
  // Draw ball
  drawBall()
  
  // Draw serve instruction if serving (desktop only)
  if (isServing.value && !gameActive.value && !isMobile.value) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '16px Poppins'
    ctx.textAlign = 'center'
    if (isPlayerServe.value) {
      ctx.fillText('Click to serve diagonally cross-court', canvasWidth.value / 2, canvasHeight.value - 30)
    }
  }
  
  // Draw side out message
  if (sideOutMessage.value) {
    ctx.fillStyle = 'rgba(255, 193, 7, 0.9)'
    ctx.font = 'bold 36px Poppins'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 20
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.fillText('SIDE OUT!', canvasWidth.value / 2, canvasHeight.value / 2)
    ctx.font = '20px Poppins'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText(sideOutMessage.value.includes('Your') ? 'Your serve' : 'CPU serve', 
                 canvasWidth.value / 2, canvasHeight.value / 2 + 40)
    ctx.shadowBlur = 0
  }
}

const showSideOut = (newServer) => {
  sideOutMessage.value = newServer ? 'Side Out! Your serve' : 'Side Out! CPU serve'
  draw() // Force redraw to show message
  setTimeout(() => {
    sideOutMessage.value = ''
    setupServe()
  }, 2000)
}

const setupServe = () => {
  isServing.value = true
  isFirstReturn.value = false
  serverJustServed.value = false
  ball.value.speedX = 0
  ball.value.speedY = 0
  
  // Reset paddle positions - paddles start outside court for serve
  playerPaddle.x = 100 // Outside left baseline
  playerPaddle.targetX = 100
  playerPaddle.isMovingIn = false
  computerPaddle.x = 1085 // Outside right baseline
  computerPaddle.targetX = 1085
  computerPaddle.isMovingIn = false
  
  if (isPlayerServe.value) {
    // Player serves from behind baseline
    const serveFromRight = playerScore.value % 2 === 0
    
    // Position ball and paddle at serve position
    if (serveFromRight) {
      // Serve from right court
      const serveY = court.y + 3 * court.height / 4
      playerPaddle.y = serveY - playerPaddle.height / 2
      playerPaddle.targetY = playerPaddle.y
      ball.value.x = playerPaddle.x + playerPaddle.width + 30
      ball.value.y = serveY
    } else {
      // Serve from left court
      const serveY = court.y + court.height / 4
      playerPaddle.y = serveY - playerPaddle.height / 2
      playerPaddle.targetY = playerPaddle.y
      ball.value.x = playerPaddle.x + playerPaddle.width + 30
      ball.value.y = serveY
    }
    
    // Position computer paddle in center of their side
    computerPaddle.y = court.y + court.height / 2 - computerPaddle.height / 2
    
  } else {
    // Computer serves
    const serveFromRight = computerScore.value % 2 === 0
    
    // Position ball and paddle at serve position
    if (serveFromRight) {
      // Serve from right court (from computer's perspective, which is left on screen)
      const serveY = court.y + 3 * court.height / 4
      computerPaddle.y = serveY - computerPaddle.height / 2
      ball.value.x = computerPaddle.x - 30
      ball.value.y = serveY
    } else {
      // Serve from left court (from computer's perspective, which is right on screen)
      const serveY = court.y + court.height / 4
      computerPaddle.y = serveY - computerPaddle.height / 2
      ball.value.x = computerPaddle.x - 30
      ball.value.y = serveY
    }
    
    // Position player paddle in center of their side
    playerPaddle.y = court.y + court.height / 2 - playerPaddle.height / 2
    playerPaddle.targetY = playerPaddle.y
    
    // Auto-serve for computer after delay
    setTimeout(() => {
      if (!gameActive.value && isServing.value && !isPlayerServe.value) {
        // Get serve targets and randomly pick one
        const targets = getServeTargets(false, serveFromRight)
        const targetIndex = Math.floor(Math.random() * 3)
        const target = targets[targetIndex]
        
        // Calculate velocity to reach target
        const velocity = calculateServeVelocity(
          ball.value.x, ball.value.y,
          target.x, target.y,
          false
        )
        
        ball.value.speedX = velocity.speedX
        ball.value.speedY = velocity.speedY
        isServing.value = false
        serverJustServed.value = true // Computer just served
        isFirstReturn.value = true // Waiting for player's first return
        gameActive.value = true
        
        // Set computer paddle to move inside court after serving
        computerPaddle.targetX = court.x + court.width - 40 // Inside right baseline
        computerPaddle.isMovingIn = true
        
        lastFrameTime = 0
        if (!animationId) gameLoop(performance.now())
      }
    }, 1500)
  }
  
  // Force a draw to show the new positions
  draw()
}

const handleServe = () => {
  if (isServing.value && isPlayerServe.value && !gameActive.value) {
    const serveFromRight = playerScore.value % 2 === 0
    
    // Get serve targets and randomly pick one
    const targets = getServeTargets(true, serveFromRight)
    const targetIndex = Math.floor(Math.random() * 3)
    const target = targets[targetIndex]
    
    // Calculate velocity to reach target
    const velocity = calculateServeVelocity(
      ball.value.x, ball.value.y,
      target.x, target.y,
      true
    )
    
    ball.value.speedX = velocity.speedX
    ball.value.speedY = velocity.speedY
    
    isServing.value = false
    serverJustServed.value = true // Player just served
    isFirstReturn.value = true // Waiting for computer's first return
    gameActive.value = true
    gameStarted.value = true
    
    // Set player paddle to move inside court after serving
    playerPaddle.targetX = court.x + 40 // Inside left baseline
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
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    gameTime.value = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Move ball using delta time
  ball.value.x += ball.value.speedX * dt
  ball.value.y += ball.value.speedY * dt
  
  // Ball collision with court boundaries
  if (ball.value.y - ball.value.radius < court.y || 
      ball.value.y + ball.value.radius > court.y + court.height) {
    ball.value.speedY = -ball.value.speedY
    // Ensure ball stays within bounds
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
    ball.value.speedY = hitPos * 360 // pixels per second
    // Ensure ball doesn't get stuck in paddle
    ball.value.x = playerPaddle.x + playerPaddle.width + ball.value.radius
    
    // If this was the first return after computer served, move player paddle in
    if (isFirstReturn.value && !isPlayerServe.value) {
      playerPaddle.targetX = court.x + 40 // Inside left baseline
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
    ball.value.speedY = hitPos * 360 // pixels per second
    // Ensure ball doesn't get stuck in paddle
    ball.value.x = computerPaddle.x - ball.value.radius
    
    // If this was the first return after player served, move computer paddle in
    if (isFirstReturn.value && isPlayerServe.value) {
      computerPaddle.targetX = court.x + court.width - 40 // Inside right baseline
      computerPaddle.isMovingIn = true
      isFirstReturn.value = false
    }
  }
  
  // Handle horizontal paddle movement (moving into court after serve)
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
  
  // Smooth player paddle vertical movement (lerp towards target) - only during play
  if (!isServing.value) {
    const paddleSpeed = 0.2 // Smoothing factor
    playerPaddle.y += (playerPaddle.targetY - playerPaddle.y) * paddleSpeed
  }
  
  // Computer AI with delta time - only move during play
  if (!isServing.value && ball.value.speedX > 0) { // Only track when ball is coming towards computer
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
  
  // Keep paddles within court boundaries (vertical)
  computerPaddle.y = Math.max(court.y, Math.min(court.y + court.height - computerPaddle.height, computerPaddle.y))
  playerPaddle.y = Math.max(court.y, Math.min(court.y + court.height - playerPaddle.height, playerPaddle.y))
  playerPaddle.targetY = Math.max(court.y, Math.min(court.y + court.height - playerPaddle.height, playerPaddle.targetY))
  
  // Handle scoring - ONLY THE SERVING SIDE CAN SCORE
  if (ball.value.x < court.x - 50) {
    // Ball went past player's side
    gameActive.value = false
    
    // Cancel animation frame before handling score
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    
    if (!isPlayerServe.value) {
      // Computer was serving and won the rally - SCORES
      computerScore.value++
      // Computer keeps serving after scoring
      setTimeout(() => setupServe(), 1000)
    } else {
      // Player was serving and lost the rally - SIDE OUT
      isPlayerServe.value = false // Change serve to computer
      showSideOut(false) // Show side out message
    }
    
  } else if (ball.value.x > court.x + court.width + 50) {
    // Ball went past computer's side
    gameActive.value = false
    
    // Cancel animation frame before handling score
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    
    if (isPlayerServe.value) {
      // Player was serving and won the rally - SCORES
      playerScore.value++
      // Player keeps serving after scoring
      setTimeout(() => setupServe(), 1000)
    } else {
      // Computer was serving and lost the rally - SIDE OUT
      isPlayerServe.value = true // Change serve to player
      showSideOut(true) // Show side out message
    }
  }
  
  // Check for game win (11 points, win by 2)
  if ((playerScore.value >= 11 || computerScore.value >= 11) && 
      Math.abs(playerScore.value - computerScore.value) >= 2) {
    endGame()
  }
}

const gameLoop = (currentTime) => {
  if (!lastFrameTime) {
    lastFrameTime = currentTime
  }
  
  const elapsed = currentTime - lastFrameTime
  
  // Only update if enough time has passed (frame rate limiting)
  if (elapsed >= frameInterval) {
    // Calculate delta time in seconds
    deltaTime = Math.min(elapsed / 1000, 0.1) // Cap at 0.1 seconds to prevent huge jumps
    
    update(deltaTime)
    draw()
    
    // Update last frame time, accounting for any excess time
    lastFrameTime = currentTime - (elapsed % frameInterval)
  }
  
  if (gameActive.value) {
    animationId = requestAnimationFrame(gameLoop)
  }
}

const handleMouseMove = (e) => {
  if (!isServing.value && !isMobile.value) { // Only allow paddle movement during play on desktop
    const rect = gameCanvas.value.getBoundingClientRect()
    const scaleY = canvasHeight.value / rect.height
    const mouseY = (e.clientY - rect.top) * scaleY
    playerPaddle.targetY = mouseY - playerPaddle.height / 2
  }
}

const startGame = () => {
  if (!gameStarted.value) {
    gameStarted.value = true
    setupServe()
  } else {
    // Resume from pause
    gameActive.value = true
    lastFrameTime = 0 // Reset frame timing
    if (!startTime) {
      startTime = Date.now()
    }
    if (!animationId) {
      gameLoop(performance.now())
    }
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
  gameTime.value = '00:00'
  startTime = null
  elapsedTime = 0
  lastFrameTime = 0
  deltaTime = 0
  isPlayerServe.value = true
  isServing.value = true
  isFirstReturn.value = false
  serverJustServed.value = false
  sideOutMessage.value = ''
  
  // Reset ball position
  ball.value.x = -100 // Start off-screen
  ball.value.y = -100
  ball.value.speedX = 0
  ball.value.speedY = 0
  
  // Reset paddle positions
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

const endGame = () => {
  gameActive.value = false
  const winner = playerScore.value > computerScore.value ? 'You Win!' : 'Computer Wins!'
  
  // Cancel animation frame
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  
  // Draw winner message
  setTimeout(() => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px Poppins'
    ctx.textAlign = 'center'
    ctx.fillText(winner, canvasWidth.value / 2, canvasHeight.value / 2)
    ctx.font = '24px Poppins'
    ctx.fillText(`Final Score: ${playerScore.value} - ${computerScore.value}`, canvasWidth.value / 2, canvasHeight.value / 2 + 50)
    ctx.font = '16px Poppins'
    ctx.fillText('Press Reset to play again', canvasWidth.value / 2, canvasHeight.value / 2 + 100)
  }, 100)
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    canvasWrapper.value.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

onMounted(() => {
  ctx = gameCanvas.value.getContext('2d')
  loadGameSettings()
  detectMobile()
  checkOrientation()
  
  // Initialize ball position off-screen
  ball.value.x = -100
  ball.value.y = -100
  draw()
  
  // Add event listeners for orientation change
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})
</script>

<style scoped>
/* Import existing styles */
@import './GameCanvas.css';

/* Mobile-specific styles */
.mobile-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.touch-zone {
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
}

.touch-zone.left {
  left: 0;
  width: 50%;
  background: linear-gradient(to right, rgba(0, 200, 83, 0.05), transparent);
}

.touch-zone.right {
  right: 0;
  width: 50%;
  background: linear-gradient(to left, rgba(255, 107, 53, 0.05), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.touch-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  text-align: center;
  pointer-events: none;
  animation: fadeInOut 3s ease-in-out infinite;
}

.touch-hint i {
  display: block;
  font-size: 24px;
  margin-bottom: 8px;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.mobile-serve-btn {
  background: linear-gradient(135deg, #ffc107, #ff9800);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 20px 30px;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(255, 193, 7, 0.4);
  transition: all 0.3s ease;
  animation: pulse 2s ease-in-out infinite;
}

.mobile-serve-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 10px rgba(255, 193, 7, 0.4);
}

.mobile-serve-btn i {
  font-size: 24px;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 20px rgba(255, 193, 7, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 30px rgba(255, 193, 7, 0.6);
  }
}

.mobile-game-buttons {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  pointer-events: auto;
}

.mobile-control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.mobile-control-btn:active {
  transform: scale(0.9);
  background: rgba(0, 0, 0, 0.7);
}

.mobile-control-btn.start {
  background: rgba(0, 200, 83, 0.3);
  border-color: #00c853;
}

.mobile-control-btn.pause {
  background: rgba(255, 193, 7, 0.3);
  border-color: #ffc107;
}

.mobile-control-btn.reset {
  background: rgba(255, 107, 53, 0.3);
  border-color: #ff6b35;
}

.orientation-hint {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(10, 61, 12, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 1000;
  font-size: 18px;
  text-align: center;
  padding: 20px;
}

.orientation-hint i {
  font-size: 48px;
  margin-bottom: 20px;
  animation: rotate 2s ease-in-out infinite;
}

@keyframes rotate {
  0%, 100% { transform: rotate(-90deg); }
  50% { transform: rotate(0deg); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .game-controls-bar {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  
  .score-board {
    font-size: 14px;
  }
  
  .game-controls {
    display: none; /* Hide desktop controls on mobile */
  }
  
  .canvas-wrapper {
    margin-top: 10px;
  }
}

@media (max-height: 600px) and (orientation: landscape) {
  .game-controls-bar {
    position: absolute;
    top: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 5;
  }
  
  .mobile-game-buttons {
    bottom: 10px;
  }
  
  .mobile-control-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}

/* Side out indicator animation */
.side-out-indicator {
  font-size: 18px;
  font-weight: bold;
  color: #ffc107;
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
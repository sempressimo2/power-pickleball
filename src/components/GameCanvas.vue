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
        @touchmove="handleTouchMove"
        @click="handleServe"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

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

// Get serve position text
const getServePosition = () => {
  if (isPlayerServe.value) {
    return playerScore.value % 2 === 0 ? 'Right Court' : 'Left Court'
  } else {
    return computerScore.value % 2 === 0 ? 'Right Court' : 'Left Court'
  }
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
  
  // Draw serve instruction if serving
  if (isServing.value && !gameActive.value) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '16px Poppins'
    ctx.textAlign = 'center'
    if (isPlayerServe.value) {
      ctx.fillText('Click to serve diagonally cross-court', canvasWidth.value / 2, canvasHeight.value - 30)
    }
  }
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
  
  // Score points and handle serve changes
  if (ball.value.x < court.x - 50) {
    // Computer scores
    computerScore.value++
    gameActive.value = false
    
    // In pickleball, serve changes when serving side loses
    if (isPlayerServe.value) {
      // Player was serving and lost, change serve
      isPlayerServe.value = false
    }
    // If computer was serving and scored, they keep serving
    
    // Cancel animation frame before setting up new serve
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    
    setTimeout(() => setupServe(), 1000)
  } else if (ball.value.x > court.x + court.width + 50) {
    // Player scores
    playerScore.value++
    gameActive.value = false
    
    // In pickleball, serve changes when serving side loses
    if (!isPlayerServe.value) {
      // Computer was serving and lost, change serve
      isPlayerServe.value = true
    }
    // If player was serving and scored, they keep serving
    
    // Cancel animation frame before setting up new serve
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    
    setTimeout(() => setupServe(), 1000)
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
  if (!isServing.value) { // Only allow paddle movement during play
    const rect = gameCanvas.value.getBoundingClientRect()
    const scaleY = canvasHeight.value / rect.height
    const mouseY = (e.clientY - rect.top) * scaleY
    playerPaddle.targetY = mouseY - playerPaddle.height / 2
  }
}

const handleTouchMove = (e) => {
  if (!isServing.value) { // Only allow paddle movement during play
    e.preventDefault()
    const rect = gameCanvas.value.getBoundingClientRect()
    const touch = e.touches[0]
    const scaleY = canvasHeight.value / rect.height
    const touchY = (touch.clientY - rect.top) * scaleY
    playerPaddle.targetY = touchY - playerPaddle.height / 2
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
  // Initialize ball position off-screen
  ball.value.x = -100
  ball.value.y = -100
  draw()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.game-container {
  background: rgba(26, 26, 46, 0.05);
  border-radius: var(--radius-lg);
  padding: 15px;
  box-shadow: var(--shadow-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px 20px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.score-board {
  display: flex;
  align-items: center;
  gap: 30px;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-label {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
}

.timer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0f0f0;
  border-radius: 20px;
  font-weight: 600;
  color: #666;
}

.game-info {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 5px;
}

.serve-indicator {
  padding: 8px 16px;
  background: var(--gradient-secondary);
  color: white;
  border-radius: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.serve-position {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.game-controls {
  display: flex;
  gap: 10px;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 1rem;
  color: white;
}

.control-btn.play {
  background: var(--gradient-primary);
}

.control-btn.pause {
  background: linear-gradient(135deg, #ffa500, #ff8c00);
}

.control-btn.reset {
  background: linear-gradient(135deg, #6c757d, #495057);
}

.control-btn.fullscreen {
  background: linear-gradient(135deg, #007bff, #0056b3);
}

.control-btn:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-md);
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  border-radius: var(--radius-md);
  padding: 10px;
  position: relative;
  overflow: hidden;
}

canvas {
  border-radius: var(--radius-md);
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: none;
}

.canvas-wrapper:fullscreen {
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-wrapper:fullscreen canvas {
  max-width: 90vw;
  max-height: 90vh;
}

@media (max-width: 768px) {
  .game-controls-bar {
    flex-direction: column;
    gap: 15px;
  }
  
  .score-board {
    width: 100%;
    justify-content: space-around;
  }
  
  .control-btn {
    width: 35px;
    height: 35px;
    font-size: 0.9rem;
  }
  
  .serve-indicator {
    font-size: 0.9rem;
    padding: 6px 12px;
  }
}
</style>
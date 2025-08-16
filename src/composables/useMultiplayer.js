// useMultiplayer.js
import { ref, onUnmounted } from 'vue'

class MultiplayerService {
  constructor() {
    this.ws = null
    this.roomId = ref(null)
    this.playerNumber = ref(null)
    this.isConnected = ref(false)
    this.isSearching = ref(false)
    this.matchFound = ref(false)
    this.opponentName = ref('')
    this.gameState = ref(null)
    this.messageHandlers = new Map()
    this.heartbeatInterval = null
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
        console.log('Connecting to:', wsUrl)
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          console.log('Connected to multiplayer server')
          this.isConnected.value = true
          
          // Restore room if we have one
          this.restoreRoom()
          
          // Setup heartbeat to keep connection alive
          this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.send({ type: 'ping' });
            }
          }, 25000); // Send ping every 25 seconds
          
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        }
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.cleanup()
          reject(error)
        }
        
        this.ws.onclose = () => {
          console.log('Disconnected from multiplayer server')
          this.cleanup()
        }
      } catch (error) {
        console.error('Failed to connect:', error)
        reject(error)
      }
    })
  }

  restoreRoom() {
    // Try to restore room from sessionStorage
    const gameSettings = sessionStorage.getItem('gameSettings')
    if (gameSettings) {
      const settings = JSON.parse(gameSettings)
      if (settings.roomId && settings.playerNumber) {
        console.log('Restoring room:', settings.roomId)
        this.roomId.value = settings.roomId
        this.playerNumber.value = settings.playerNumber
        this.opponentName.value = settings.opponentName || ''
        
        // Tell server to restore our room assignment
        this.send({
          type: 'restoreRoom',
          roomId: settings.roomId,
          playerNumber: settings.playerNumber,
          playerName: settings.playerName
        })
      }
    }
  }

  cleanup() {
    this.isConnected.value = false
    this.isSearching.value = false
    this.matchFound.value = false
    // Don't clear room data on cleanup - we might need it for reconnection
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  handleMessage(data) {
    console.log('Received message:', data.type)
    
    switch (data.type) {
      case 'connected':
        this.clientId = data.clientId
        console.log('Assigned client ID:', this.clientId)
        break
        
      case 'searchingForMatch':
        this.isSearching.value = true
        console.log('Searching for match...')
        break
        
      case 'matchFound':
        console.log('Match found!', data)
        this.isSearching.value = false
        this.matchFound.value = true
        this.roomId.value = data.roomId
        this.playerNumber.value = data.playerNumber
        this.opponentName.value = data.opponentName
        this.gameState.value = data.gameState
        
        // Store in sessionStorage for persistence
        const currentSettings = JSON.parse(sessionStorage.getItem('gameSettings') || '{}')
        sessionStorage.setItem('gameSettings', JSON.stringify({
          ...currentSettings,
          roomId: data.roomId,
          playerNumber: data.playerNumber,
          opponentName: data.opponentName
        }))
        break
        
      case 'roomRestored':
        console.log('Room restored successfully')
        this.matchFound.value = true
        break
        
      case 'playerReadyStatus':
        console.log(`Ready status: ${data.readyCount}/${data.totalPlayers}`)
        break
        
      case 'gameStart':
        console.log('Game starting!')
        break
        
      case 'opponentDisconnected':
        console.log('Opponent disconnected')
        this.handleOpponentDisconnect()
        break
        
      case 'pong':
        // Server responded to ping
        break
    }
    
    // Call registered handlers
    const handler = this.messageHandlers.get(data.type)
    if (handler) {
      handler(data)
    }
  }

  findMatch(playerName, difficulty) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('Not connected to server')
      return false
    }
    
    console.log(`Finding match for ${playerName} at ${difficulty} difficulty`)
    this.send({
      type: 'findMatch',
      playerName,
      difficulty
    })
    return true
  }

  cancelMatchmaking() {
    console.log('Cancelling matchmaking')
    this.isSearching.value = false
    this.send({ type: 'cancelMatchmaking' })
  }

  sendPaddleMove(paddle) {
    this.send({
      type: 'paddleMove',
      paddle
    })
  }

  sendServe(ball) {
    console.log('Sending serve')
    this.send({
      type: 'serve',
      ball
    })
  }

  sendBallUpdate(ball) {
    this.send({
      type: 'ballUpdate',
      ball
    })
  }

  sendScore(scores, currentServer) {
    console.log('Sending score update:', scores)
    this.send({
      type: 'score',
      scores,
      currentServer
    })
  }

  sendPlayerReady() {
    console.log('Sending player ready for room:', this.roomId.value)
    this.send({ 
      type: 'playerReady',
      roomId: this.roomId.value,
      playerNumber: this.playerNumber.value
    })
  }

  leaveGame() {
    console.log('Leaving game')
    
    // Clear from sessionStorage
    const settings = JSON.parse(sessionStorage.getItem('gameSettings') || '{}')
    delete settings.roomId
    delete settings.playerNumber
    delete settings.opponentName
    sessionStorage.setItem('gameSettings', JSON.stringify(settings))
    
    this.roomId.value = null
    this.playerNumber.value = null
    this.matchFound.value = false
    this.opponentName.value = ''
    this.send({ type: 'leaveGame' })
  }

  onMessage(type, handler) {
    this.messageHandlers.set(type, handler)
  }

  offMessage(type) {
    this.messageHandlers.delete(type)
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('Cannot send message, WebSocket not open')
    }
  }

  disconnect() {
    console.log('Disconnecting from server')
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.cleanup()
  }

  handleOpponentDisconnect() {
    this.matchFound.value = false
    this.roomId.value = null
    this.playerNumber.value = null
    this.opponentName.value = ''
    
    // Clear from sessionStorage
    const settings = JSON.parse(sessionStorage.getItem('gameSettings') || '{}')
    delete settings.roomId
    delete settings.playerNumber
    delete settings.opponentName
    sessionStorage.setItem('gameSettings', JSON.stringify(settings))
  }
}

const multiplayerService = new MultiplayerService()

export function useMultiplayer() {
  onUnmounted(() => {
    // Don't leave game on unmount - we might be navigating
  })

  return multiplayerService
}
// server.js
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// Game rooms storage
const gameRooms = new Map();
const waitingPlayers = [];
const connectedClients = new Map();

console.log(`WebSocket server running on port ${PORT}`);

class GameRoom {
  constructor(roomId, player1, player2) {
    this.roomId = roomId;
    this.players = [player1, player2];
    this.player1 = player1;
    this.player2 = player2;
    this.gameState = {
      ball: { x: 600, y: 300, speedX: 0, speedY: 0 },
      scores: { player1: 0, player2: 0 },
      paddles: {
        player1: { x: 100, y: 250 },
        player2: { x: 1085, y: 250 }
      },
      currentServer: 'player1',
      isServing: true,
      gameActive: false,
      winner: null,
      rallyCount: 0
    };
    this.readyPlayers = new Set();
    this.gameStarted = false;
    this.lastBallUpdate = Date.now();
  }

  broadcast(message, excludePlayer = null) {
    console.log(`Broadcasting ${message.type} to room ${this.roomId}`);
    this.players.forEach(player => {
      if (player !== excludePlayer && player.readyState === 1) {
        try {
          player.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to player:', error);
        }
      }
    });
  }

  handlePlayerReady(ws) {
    const playerId = ws.clientId;
    
    console.log(`handlePlayerReady called for ${playerId} (${ws.playerName})`);
    console.log(`Current ready players:`, Array.from(this.readyPlayers));
    
    if (this.gameStarted) {
      console.log('Game already started, ignoring ready');
      return;
    }
    
    if (!this.readyPlayers.has(playerId)) {
      this.readyPlayers.add(playerId);
      console.log(`Added ${playerId} to ready players. Count: ${this.readyPlayers.size}/2`);
      
      // Send confirmation back to the player who clicked ready
      ws.send(JSON.stringify({
        type: 'readyConfirmed'
      }));
      
      // Notify all players about ready status
      this.broadcast({
        type: 'playerReadyStatus',
        readyCount: this.readyPlayers.size,
        totalPlayers: 2
      });
      
      if (this.readyPlayers.size === 2) {
        console.log(`Both players ready! Starting game in room ${this.roomId}`);
        this.gameStarted = true;
        this.startGame();
      }
    } else {
      console.log(`Player ${playerId} already marked as ready`);
    }
  }

  startGame() {
    console.log(`=== STARTING GAME IN ROOM ${this.roomId} ===`);
    this.gameState.gameActive = true;
    this.gameState.isServing = true;
    this.gameState.currentServer = 'player1';
    
    const startMessage = {
      type: 'gameStart',
      gameState: this.gameState
    };
    
    // Send individually to ensure delivery
    console.log('Sending gameStart to player 1:', this.player1.playerName);
    this.player1.send(JSON.stringify(startMessage));
    
    console.log('Sending gameStart to player 2:', this.player2.playerName);
    this.player2.send(JSON.stringify(startMessage));
    
    console.log('Game start messages sent!');
  }

  handlePlayerDisconnect(player) {
    console.log(`Player ${player.clientId} disconnected from room ${this.roomId}`);
    const otherPlayer = this.players.find(p => p !== player);
    if (otherPlayer && otherPlayer.readyState === 1) {
      otherPlayer.send(JSON.stringify({
        type: 'opponentDisconnected'
      }));
    }
    // Clean up the room
    gameRooms.delete(this.roomId);
  }
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;
  ws.isAlive = true;
  connectedClients.set(clientId, ws);
  
  console.log(`\n=== Client connected: ${clientId} ===`);
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: clientId
  }));

  // Setup ping/pong for connection health
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const messageStr = message.toString();
      const data = JSON.parse(messageStr);
      console.log(`\n>>> Message from ${ws.clientId} (${ws.playerName || 'unnamed'}): ${data.type}`);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
      console.error('Raw message:', message.toString());
    }
  });

  ws.on('close', () => {
    console.log(`\n=== Client disconnected: ${clientId} ===`);
    handleDisconnect(ws);
    connectedClients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Heartbeat interval to detect broken connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

function handleMessage(ws, data) {
  switch (data.type) {
    case 'findMatch':
      handleMatchmaking(ws, data);
      break;
    
    case 'restoreRoom':
      handleRestoreRoom(ws, data);
      break;
    
    case 'cancelMatchmaking':
      removeFromWaitingList(ws);
      break;
    
    case 'paddleMove':
      handlePaddleMove(ws, data);
      break;
    
    case 'serve':
      handleServe(ws, data);
      break;
    
    case 'ballUpdate':
      handleBallUpdate(ws, data);
      break;
    
    case 'score':
      handleScore(ws, data);
      break;
    
    case 'playerReady':
      console.log('>>> Handling playerReady message');
      handlePlayerReady(ws, data);
      break;
    
    case 'leaveGame':
      handleLeaveGame(ws);
      break;
      
    case 'ping':
      ws.isAlive = true;
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    default:
      console.log(`Unknown message type: ${data.type}`);
  }
}

function handleMatchmaking(ws, data) {
  ws.playerName = data.playerName || 'Player';
  ws.difficulty = data.difficulty || 'medium';
  
  console.log(`\n=== MATCHMAKING ===`);
  console.log(`Player ${ws.clientId} (${ws.playerName}) looking for ${ws.difficulty} match`);
  
  // Remove from waiting list if already there
  removeFromWaitingList(ws);
  
  // Check for available opponent with same difficulty
  const opponent = waitingPlayers.find(player => 
    player.difficulty === ws.difficulty && player !== ws && player.readyState === 1
  );
  
  if (opponent) {
    // Match found - create game room
    const roomId = uuidv4();
    const gameRoom = new GameRoom(roomId, ws, opponent);
    gameRooms.set(roomId, gameRoom);
    
    // Remove opponent from waiting list
    removeFromWaitingList(opponent);
    
    // Assign room IDs and player numbers
    ws.roomId = roomId;
    ws.playerNumber = 1;
    opponent.roomId = roomId;
    opponent.playerNumber = 2;
    
    console.log(`\n=== MATCH CREATED ===`);
    console.log(`Room: ${roomId}`);
    console.log(`Player 1: ${ws.playerName} (${ws.clientId})`);
    console.log(`Player 2: ${opponent.playerName} (${opponent.clientId})`);
    
    // Notify both players
    ws.send(JSON.stringify({
      type: 'matchFound',
      roomId: roomId,
      playerNumber: 1,
      opponentName: opponent.playerName,
      gameState: gameRoom.gameState
    }));
    
    opponent.send(JSON.stringify({
      type: 'matchFound',
      roomId: roomId,
      playerNumber: 2,
      opponentName: ws.playerName,
      gameState: gameRoom.gameState
    }));
    
  } else {
    // No match - add to waiting list
    waitingPlayers.push(ws);
    ws.send(JSON.stringify({
      type: 'searchingForMatch'
    }));
    console.log(`Added to waiting list. Total waiting: ${waitingPlayers.length}`);
  }
}

function handleRestoreRoom(ws, data) {
  console.log(`\n=== RESTORING ROOM ===`);
  console.log(`Room: ${data.roomId}`);
  console.log(`Player: ${data.playerNumber} (${data.playerName})`);
  
  const gameRoom = gameRooms.get(data.roomId);
  if (gameRoom) {
    // Restore the connection to the room
    ws.roomId = data.roomId;
    ws.playerNumber = data.playerNumber;
    ws.playerName = data.playerName || 'Player';
    
    // Update the player reference in the room
    if (data.playerNumber === 1) {
      gameRoom.player1 = ws;
      gameRoom.players[0] = ws;
    } else {
      gameRoom.player2 = ws;
      gameRoom.players[1] = ws;
    }
    
    console.log('Room restored successfully');
    ws.send(JSON.stringify({
      type: 'roomRestored',
      roomId: data.roomId,
      playerNumber: data.playerNumber,
      gameState: gameRoom.gameState
    }));
  } else {
    console.log('Room not found for restoration');
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room no longer exists'
    }));
  }
}

function removeFromWaitingList(ws) {
  const index = waitingPlayers.indexOf(ws);
  if (index > -1) {
    waitingPlayers.splice(index, 1);
    console.log(`Removed ${ws.clientId} from waiting list`);
  }
}

function handlePaddleMove(ws, data) {
  if (!ws.roomId) return;
  
  const gameRoom = gameRooms.get(ws.roomId);
  if (!gameRoom) return;
  
  const paddleKey = ws.playerNumber === 1 ? 'player1' : 'player2';
  gameRoom.gameState.paddles[paddleKey] = data.paddle;
  
  // Broadcast to other player
  gameRoom.broadcast({
    type: 'opponentPaddleMove',
    paddle: data.paddle,
    playerNumber: ws.playerNumber
  }, ws);
}

function handleServe(ws, data) {
  if (!ws.roomId) return;
  
  const gameRoom = gameRooms.get(ws.roomId);
  if (!gameRoom) return;
  
  console.log(`Player ${ws.playerNumber} served in room ${ws.roomId}`);
  
  gameRoom.gameState.ball = data.ball;
  gameRoom.gameState.isServing = false;
  gameRoom.gameState.rallyCount = 0;
  
  // Send raw ball data without transformation
  gameRoom.broadcast({
    type: 'serveExecuted',
    ball: data.ball,
    server: ws.playerNumber
  }, ws);
}

function handleBallUpdate(ws, data) {
  if (!ws.roomId) return;
  
  const gameRoom = gameRooms.get(ws.roomId);
  if (!gameRoom) return;
  
  // Rate limit ball updates
  const now = Date.now();
  if (now - gameRoom.lastBallUpdate < 16) return; // Max 60 updates per second
  gameRoom.lastBallUpdate = now;
  
  gameRoom.gameState.ball = data.ball;
  
  // Send to other player
  gameRoom.broadcast({
    type: 'ballSync',
    ball: data.ball,
    timestamp: now
  }, ws);
}

function handleScore(ws, data) {
  if (!ws.roomId) return;
  
  const gameRoom = gameRooms.get(ws.roomId);
  if (!gameRoom) return;
  
  console.log(`Score update: P1=${data.scores.player1}, P2=${data.scores.player2}`);
  
  gameRoom.gameState.scores = data.scores;
  gameRoom.gameState.currentServer = data.currentServer;
  gameRoom.gameState.isServing = true;
  gameRoom.gameState.rallyCount = 0;
  
  // Check for winner
  const { player1, player2 } = gameRoom.gameState.scores;
  if ((player1 >= 11 || player2 >= 11) && Math.abs(player1 - player2) >= 2) {
    gameRoom.gameState.winner = player1 > player2 ? 'player1' : 'player2';
    console.log(`Game over! Winner: ${gameRoom.gameState.winner}`);
    
    gameRoom.broadcast({
      type: 'gameOver',
      winner: gameRoom.gameState.winner,
      scores: gameRoom.gameState.scores
    });
    
    // Clean up room after game ends
    setTimeout(() => {
      gameRooms.delete(ws.roomId);
      console.log(`Room ${ws.roomId} cleaned up`);
    }, 5000);
  } else {
    gameRoom.broadcast({
      type: 'scoreUpdate',
      scores: data.scores,
      currentServer: data.currentServer,
      scorer: ws.playerNumber
    });
  }
}

function handlePlayerReady(ws, data) {
  console.log(`\n=== PLAYER READY ===`);
  console.log(`Player: ${ws.clientId} (${ws.playerName})`);
  
  // Check if room info is in the message (sent from client)
  if (data && data.roomId && data.playerNumber) {
    ws.roomId = data.roomId;
    ws.playerNumber = data.playerNumber;
    console.log(`Room info restored from message: Room ${data.roomId}, Player ${data.playerNumber}`);
  }
  
  console.log(`Room: ${ws.roomId}`);
  
  if (!ws.roomId) {
    console.log('ERROR: Player has no room!');
    ws.send(JSON.stringify({
      type: 'error',
      message: 'No room assigned'
    }));
    return;
  }
  
  const gameRoom = gameRooms.get(ws.roomId);
  if (!gameRoom) {
    console.log(`ERROR: Room ${ws.roomId} not found!`);
    console.log('Available rooms:', Array.from(gameRooms.keys()));
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found'
    }));
    return;
  }
  
  // Update the player reference in the room (in case of reconnection)
  if (ws.playerNumber === 1) {
    gameRoom.player1 = ws;
    gameRoom.players[0] = ws;
  } else if (ws.playerNumber === 2) {
    gameRoom.player2 = ws;
    gameRoom.players[1] = ws;
  }
  
  console.log('Room found, processing ready...');
  gameRoom.handlePlayerReady(ws);
}

function handleLeaveGame(ws) {
  if (!ws.roomId) return;
  
  console.log(`Player ${ws.clientId} leaving room ${ws.roomId}`);
  
  const gameRoom = gameRooms.get(ws.roomId);
  if (gameRoom) {
    gameRoom.handlePlayerDisconnect(ws);
  }
  
  ws.roomId = null;
  ws.playerNumber = null;
}

function handleDisconnect(ws) {
  removeFromWaitingList(ws);
  if (ws.roomId) {
    handleLeaveGame(ws);
  }
}
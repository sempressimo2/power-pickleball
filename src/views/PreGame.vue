<template>
  <div class="pregame-page">
    <div class="container">
      <h1>Game Setup</h1>
      
      <div class="setup-grid">
        <!-- Game Type Selection -->
        <div class="setup-section card">
          <h2><i class="fas fa-gamepad"></i> Game Type</h2>
          <div class="game-type-selection">
            <div 
              class="type-card"
              :class="{ selected: selectedGameType === 'local' }"
              @click="selectedGameType = 'local'"
            >
              <div class="type-icon">
                <i class="fas fa-desktop"></i>
              </div>
              <h3>Local Play</h3>
              <p>Play vs Computer</p>
            </div>
            
            <div 
              class="type-card"
              :class="{ selected: selectedGameType === 'online' }"
              @click="selectedGameType = 'online'"
            >
              <div class="type-icon">
                <i class="fas fa-globe"></i>
              </div>
              <h3>Online Play</h3>
              <p>Play vs Human</p>
            </div>
          </div>
        </div>

        <!-- Player Name (for online) -->
        <div v-if="selectedGameType === 'online'" class="setup-section card">
          <h2><i class="fas fa-user"></i> Player Name</h2>
          <input 
            v-model="playerName" 
            type="text" 
            placeholder="Enter your name"
            class="name-input"
            maxlength="20"
          />
        </div>
        
        <!-- Game Mode Selection -->
        <div class="setup-section card">
          <h2><i class="fas fa-users"></i> Game Mode</h2>
          <div class="mode-selection">
            <div 
              class="mode-card"
              :class="{ selected: selectedMode === 'singles' }"
              @click="selectedMode = 'singles'"
            >
              <div class="mode-icon">
                <i class="fas fa-user"></i>
              </div>
              <h3>Singles</h3>
              <p>1 vs 1 Classic Match</p>
            </div>
            
            <div 
              class="mode-card"
              :class="{ selected: selectedMode === 'doubles' }"
              @click="selectedMode = 'doubles'"
            >
              <div class="mode-icon">
                <i class="fas fa-user-friends"></i>
              </div>
              <h3>Doubles</h3>
              <p>2 vs 2 Team Match</p>
              <span class="coming-soon">Coming Soon</span>
            </div>
          </div>
        </div>
        
        <!-- Court Selection -->
        <div class="setup-section card">
          <h2><i class="fas fa-palette"></i> Select Court</h2>
          <div class="court-selection">
            <div 
              v-for="court in courts" 
              :key="court.id"
              class="court-card"
              :class="{ selected: selectedCourt === court.id }"
              @click="selectedCourt = court.id"
            >
              <div class="court-preview" :style="{ background: court.preview }">
                <div class="court-mini">
                  <div class="net-line"></div>
                  <div class="kitchen-area" :style="{ background: court.kitchenColor }"></div>
                </div>
              </div>
              <h4>{{ court.name }}</h4>
              <p>{{ court.description }}</p>
            </div>
          </div>
        </div>
        
        <!-- Difficulty Settings -->
        <div class="setup-section card">
          <h2><i class="fas fa-sliders-h"></i> {{ selectedGameType === 'online' ? 'Skill Level' : 'Difficulty' }}</h2>
          <div class="difficulty-selection">
            <div 
              v-for="level in difficulties" 
              :key="level.id"
              class="difficulty-card"
              :class="{ selected: selectedDifficulty === level.id }"
              @click="selectedDifficulty = level.id"
            >
              <div class="difficulty-icon">
                <i :class="level.icon"></i>
              </div>
              <h4>{{ level.name }}</h4>
              <div class="difficulty-stars">
                <i v-for="n in 5" :key="n" 
                   class="fas fa-star" 
                   :class="{ filled: n <= level.stars }"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="action-buttons">
        <router-link to="/" class="btn btn-outline">
          <i class="fas fa-arrow-left"></i> Back
        </router-link>
        <button @click="startGame" class="btn btn-primary btn-lg" :disabled="searching">
          <i v-if="!searching" class="fas fa-play"></i>
          <i v-else class="fas fa-spinner fa-spin"></i>
          {{ searching ? 'Finding Opponent...' : 'Start Game' }}
        </button>
      </div>

      <!-- Matchmaking Modal -->
      <div v-if="searching" class="matchmaking-modal">
        <div class="matchmaking-content">
          <div class="spinner-container">
            <div class="spinner"></div>
          </div>
          <h3>Finding Opponent...</h3>
          <p>Looking for a player at your skill level</p>
          <button @click="cancelSearch" class="btn btn-outline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMultiplayer } from '../composables/useMultiplayer'

const router = useRouter()
const multiplayer = useMultiplayer()

const selectedGameType = ref('local')
const selectedMode = ref('singles')
const selectedCourt = ref('classic')
const selectedDifficulty = ref('medium')
const playerName = ref('')
const searching = ref(false)

const courts = [
  {
    id: 'america',
    name: 'Stars & Stripes',
    description: 'Patriotic red, white & blue',
    preview: 'linear-gradient(90deg, #B22234, #fff, #3C3B6E)',
    backgroundColor: '#0d1b2a',
    baseColor: '#1a2a4a',
    lineColor: '#ffffff',
    kitchenColor: 'rgba(178, 34, 52, 0.3)',
    serviceColor: 'rgba(60, 59, 110, 0.15)',
    ballColor: '#ffffff',
    netColor: '#B22234'
  },
  {
    id: 'classic',
    name: 'Classic Green',
    description: 'Traditional tennis court',
    preview: 'linear-gradient(135deg, #1e7e34, #28a745)',
    backgroundColor: '#0a3d0c',
    baseColor: '#1e7e34',
    lineColor: '#ffffff',
    kitchenColor: 'rgba(255, 193, 7, 0.2)',
    serviceColor: 'rgba(255, 255, 255, 0.05)',
    ballColor: '#fff700',
    netColor: '#ffffff'
  },
  {
    id: 'futuristic',
    name: 'Cyber Court',
    description: 'Neon lights & cyber vibes',
    preview: 'linear-gradient(135deg, #00ffff, #ff00ff, #00ff00)',
    backgroundColor: '#000000',
    baseColor: '#0a0a0a',
    lineColor: '#00ffff',
    kitchenColor: 'rgba(255, 0, 255, 0.2)',
    serviceColor: 'rgba(0, 255, 255, 0.1)',
    ballColor: '#00ff00',
    netColor: '#ff00ff'
  },
  {
    id: 'dark',
    name: 'Night Mode',
    description: 'Sleek dark theme',
    preview: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
    backgroundColor: '#000000',
    baseColor: '#0d0d0d',
    lineColor: '#666666',
    kitchenColor: 'rgba(255, 107, 53, 0.15)',
    serviceColor: 'rgba(255, 255, 255, 0.03)',
    ballColor: '#ff6b35',
    netColor: '#333333'
  }
]

const difficulties = [
  { id: 'easy', name: 'Beginner', stars: 1, icon: 'fas fa-baby', speed: 0.7 },
  { id: 'medium', name: 'Intermediate', stars: 3, icon: 'fas fa-user', speed: 1 },
  { id: 'hard', name: 'Advanced', stars: 4, icon: 'fas fa-user-graduate', speed: 1.3 },
  { id: 'expert', name: 'Expert', stars: 5, icon: 'fas fa-user-ninja', speed: 1.6 }
]

const startGame = async () => {
  const court = courts.find(c => c.id === selectedCourt.value)
  const difficulty = difficulties.find(d => d.id === selectedDifficulty.value)
  
  if (selectedGameType.value === 'online') {
    const name = playerName.value.trim() || 'Player'
    searching.value = true
    
    try {
      // Connect to multiplayer server
      if (!multiplayer.isConnected.value) {
        await multiplayer.connect()
      }
      
      // Find match
      multiplayer.findMatch(name, selectedDifficulty.value)
      
      // Wait for match
      multiplayer.onMessage('matchFound', (data) => {
        searching.value = false
        
        // Store game settings
        sessionStorage.setItem('gameSettings', JSON.stringify({
          mode: selectedMode.value,
          court: court,
          difficulty: difficulty,
          gameType: 'online',
          playerName: name,
          roomId: data.roomId,
          playerNumber: data.playerNumber,
          opponentName: data.opponentName
        }))
        
        router.push('/game')
      })
    } catch (error) {
      console.error('Failed to connect:', error)
      searching.value = false
      alert('Failed to connect to multiplayer server. Please try again.')
    }
  } else {
    // Local game
    sessionStorage.setItem('gameSettings', JSON.stringify({
      mode: selectedMode.value,
      court: court,
      difficulty: difficulty,
      gameType: 'local'
    }))
    
    router.push('/game')
  }
}

const cancelSearch = () => {
  searching.value = false
  multiplayer.cancelMatchmaking()
}
</script>

<style scoped>
.pregame-page {
  padding: 40px 0;
  min-height: calc(100vh - 140px);
}

.container h1 {
  text-align: center;
  margin-bottom: 40px;
  font-size: 2.5rem;
}

.setup-grid {
  display: grid;
  gap: 30px;
  margin-bottom: 40px;
}

.setup-section h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 25px;
  color: var(--primary-color);
  font-size: 1.5rem;
}

/* Game Type Selection (NEW) */
.game-type-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.type-card {
  padding: 25px;
  background: #f8f9fa;
  border-radius: var(--radius-lg);
  text-align: center;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s ease;
}

.type-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.type-card.selected {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 200, 83, 0.05));
}

.type-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 15px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

/* Player Name Input (NEW) */
.name-input {
  width: 100%;
  padding: 12px 20px;
  font-size: 1.1rem;
  border: 2px solid #ddd;
  border-radius: var(--radius-md);
  transition: border-color 0.3s ease;
}

.name-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* Game Mode Selection (ORIGINAL) */
.mode-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.mode-card {
  padding: 25px;
  background: #f8f9fa;
  border-radius: var(--radius-lg);
  text-align: center;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s ease;
  position: relative;
}

.mode-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.mode-card.selected {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 200, 83, 0.05));
}

.mode-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 15px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.mode-card h3 {
  margin-bottom: 5px;
  color: var(--dark-color);
}

.mode-card p {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.coming-soon {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--secondary-color);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Court Selection (ORIGINAL) */
.court-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}

.court-card {
  cursor: pointer;
  border: 3px solid transparent;
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
}

.court-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.court-card.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 20px rgba(0, 200, 83, 0.3);
}

.court-preview {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.court-mini {
  width: 80px;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  position: relative;
}

.net-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(-50%);
}

.kitchen-area {
  position: absolute;
  left: 35%;
  right: 35%;
  top: 0;
  bottom: 0;
  opacity: 0.8;
}

.court-card h4 {
  padding: 10px 15px 5px;
  margin: 0;
  color: var(--dark-color);
}

.court-card p {
  padding: 0 15px 15px;
  margin: 0;
  color: #666;
  font-size: 0.85rem;
}

/* Difficulty Selection (ORIGINAL) */
.difficulty-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.difficulty-card {
  padding: 20px;
  background: #f8f9fa;
  border-radius: var(--radius-lg);
  text-align: center;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s ease;
}

.difficulty-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.difficulty-card.selected {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 200, 83, 0.05));
}

.difficulty-icon {
  font-size: 2rem;
  color: var(--primary-color);
  margin-bottom: 10px;
}

.difficulty-card h4 {
  margin: 10px 0 5px;
  color: var(--dark-color);
}

.difficulty-stars {
  display: flex;
  justify-content: center;
  gap: 3px;
}

.difficulty-stars i {
  font-size: 0.8rem;
  color: #ddd;
}

.difficulty-stars i.filled {
  color: #ffd700;
}

/* Action Buttons (ORIGINAL) */
.action-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.btn-lg {
  padding: 15px 40px;
  font-size: 1.2rem;
}

/* Matchmaking Modal (NEW) */
.matchmaking-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.matchmaking-content {
  background: white;
  padding: 40px;
  border-radius: var(--radius-lg);
  text-align: center;
  min-width: 300px;
}

.spinner-container {
  margin-bottom: 20px;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.matchmaking-content h3 {
  margin-bottom: 10px;
  color: var(--dark-color);
}

.matchmaking-content p {
  color: #666;
  margin-bottom: 20px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .court-selection {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .difficulty-selection {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .game-type-selection {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 15px;
  }
  
  .action-buttons .btn {
    width: 100%;
  }
}
</style>
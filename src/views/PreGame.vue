<template>
  <div class="pregame-page">
    <div class="container">
      <h1>Game Setup</h1>
      
      <div class="setup-grid">
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
          <h2><i class="fas fa-sliders-h"></i> Difficulty</h2>
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
        <button @click="startGame" class="btn btn-primary btn-lg">
          <i class="fas fa-play"></i> Start Game
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const selectedMode = ref('singles')
const selectedCourt = ref('classic')
const selectedDifficulty = ref('medium')

const courts = [
  {
    id: 'america',
    name: 'Stars & Stripes',
    description: 'Patriotic red, white & blue',
    preview: 'linear-gradient(90deg, #B22234, #fff, #3C3B6E)',
    backgroundColor: '#0d1b2a',  // Dark navy background
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
    backgroundColor: '#0a3d0c',  // Dark forest green background
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
    backgroundColor: '#000000',  // Pure black for cyber theme
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
    backgroundColor: '#000000',  // Black background
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

const startGame = () => {
  const court = courts.find(c => c.id === selectedCourt.value)
  const difficulty = difficulties.find(d => d.id === selectedDifficulty.value)
  
  // Store game settings in sessionStorage
  sessionStorage.setItem('gameSettings', JSON.stringify({
    mode: selectedMode.value,
    court: court,
    difficulty: difficulty
  }))
  
  router.push('/game')
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

/* Game Mode Selection */
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

/* Court Selection */
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

/* Difficulty Selection */
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

/* Action Buttons */
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

@media (max-width: 768px) {
  .court-selection {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .difficulty-selection {
    grid-template-columns: repeat(2, 1fr);
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
<template>
  <div class="game-page">
    <div class="container-fluid">
      <div class="game-header">
        <h2>Power Pickleball Arena</h2>
        <p v-if="authStore.isAuthenticated" class="player-info">
          <i class="fas fa-user"></i> {{ authStore.user?.name }}
        </p>
        <p v-else class="player-info">
          Guest Player - <router-link to="/register">Sign up</router-link> to save progress
        </p>
      </div>
      
      <GameCanvas />
      
      <!-- Minimized tips - now as a collapsible -->
      <div class="game-tips-mini">
        <button @click="showTips = !showTips" class="tips-toggle">
          <i class="fas fa-info-circle"></i> {{ showTips ? 'Hide' : 'Show' }} Tips
        </button>
        <div v-if="showTips" class="tips-content">
          <span><strong>Move:</strong> Mouse/Touch</span>
          <span><strong>Score:</strong> First to 11</span>
          <span><strong>Tip:</strong> Hit edges for power shots</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import GameCanvas from '../components/GameCanvas.vue'

const authStore = useAuthStore()
const showTips = ref(false)
</script>

<style scoped>
.game-page {
  padding: 10px 0;
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
}

.container-fluid {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  margin-bottom: 10px;
}

.game-header h2 {
  font-size: 1.5rem;
  margin: 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.player-info {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

.player-info a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}

.game-tips-mini {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.tips-toggle {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
}

.tips-toggle:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.tips-content {
  position: absolute;
  bottom: 45px;
  right: 0;
  background: white;
  padding: 15px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 250px;
  font-size: 0.85rem;
}

.tips-content span {
  display: block;
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.tips-content span:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .game-header {
    flex-direction: column;
    gap: 5px;
  }
  
  .game-header h2 {
    font-size: 1.2rem;
  }
  
  .game-tips-mini {
    bottom: 10px;
    right: 10px;
  }
}
</style>
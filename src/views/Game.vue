<template>
  <div class="game-page">
    <component :is="gameComponent" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import GameCanvas from '../components/GameCanvas.vue'
import GameCanvasMultiplayer from '../components/GameCanvasMultiplayer.vue'

const gameSettings = JSON.parse(sessionStorage.getItem('gameSettings') || '{}')
const gameComponent = computed(() => {
  return gameSettings.gameType === 'online' ? GameCanvasMultiplayer : GameCanvas
})
</script>

<style scoped>
.game-page {
  width: 100vw;
  height: calc(100vh - 140px);
  padding: 0;
  margin: 0;
  overflow: hidden;
  background: #000;
}

@media (max-width: 768px) {
  .game-page {
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
  }
}
</style>
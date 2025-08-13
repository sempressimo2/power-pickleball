<template>
  <div class="game-page">
    <GameCanvas />
  </div>
</template>

<script setup>
import GameCanvas from '../components/GameCanvas.vue'
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

/* Mobile - hide nav and footer for full screen */
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
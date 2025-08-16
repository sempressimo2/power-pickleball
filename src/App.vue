<!-- App.vue -->
<template>
  <div id="app">
    <NavBar v-if="!isMobileGame" />
    <main class="main-content" :class="{ 'mobile-game': isMobileGame }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Footer v-if="!isMobileGame" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'

const route = useRoute()

// Hide nav/footer on mobile game page
const isMobileGame = computed(() => {
  const isMobile = window.innerWidth <= 768
  const isGamePage = route.path === '/game'
  return isMobile && isGamePage
})
</script>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 80px;
}

.main-content.mobile-game {
  padding-top: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
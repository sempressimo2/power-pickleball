<template>
  <nav class="navbar">
    <div class="container">
      <div class="nav-content">
        <router-link to="/" class="logo">
          <i class="fas fa-table-tennis-paddle-ball"></i>
          <span>Power Pickleball</span>
        </router-link>
        
        <ul class="nav-links">
          <li><router-link to="/" class="nav-link">Home</router-link></li>
          <li><router-link to="/pregame" class="nav-link">Play Now</router-link></li>
          <li><router-link to="/leaderboard" class="nav-link">Leaderboard</router-link></li>
          <li><router-link to="/how-to-play" class="nav-link">How to Play</router-link></li>
        </ul>
        
        <div class="nav-actions">
          <template v-if="authStore.isAuthenticated">
            <router-link to="/profile" class="nav-link">
              <i class="fas fa-user-circle"></i> Profile
            </router-link>
            <button @click="handleLogout" class="btn btn-outline">Logout</button>
          </template>
          <template v-else>
            <router-link to="/login" class="btn btn-outline">Login</router-link>
            <router-link to="/register" class="btn btn-primary">Sign Up</router-link>
          </template>
        </div>
        
        <button @click="toggleMobile" class="mobile-toggle">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>
    
    <div v-if="mobileOpen" class="mobile-menu">
      <ul class="mobile-links">
        <li><router-link to="/" @click="mobileOpen = false">Home</router-link></li>
        <li><router-link to="/game" @click="mobileOpen = false">Play Now</router-link></li>
        <li><router-link to="/leaderboard" @click="mobileOpen = false">Leaderboard</router-link></li>
        <li><router-link to="/how-to-play" @click="mobileOpen = false">How to Play</router-link></li>
        <template v-if="authStore.isAuthenticated">
          <li><router-link to="/profile" @click="mobileOpen = false">Profile</router-link></li>
          <li><button @click="handleLogout" class="btn btn-outline">Logout</button></li>
        </template>
        <template v-else>
          <li><router-link to="/login" @click="mobileOpen = false">Login</router-link></li>
          <li><router-link to="/register" @click="mobileOpen = false">Sign Up</router-link></li>
        </template>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const mobileOpen = ref(false)

const toggleMobile = () => {
  mobileOpen.value = !mobileOpen.value
}

const handleLogout = () => {
  authStore.logout()
  router.push('/')
  mobileOpen.value = false
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
  z-index: 1000;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.logo i {
  font-size: 2rem;
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 30px;
}

.nav-link {
  text-decoration: none;
  color: var(--dark-color);
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--primary-color);
}

.nav-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--dark-color);
  cursor: pointer;
}

.mobile-menu {
  display: none;
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  background: white;
  box-shadow: var(--shadow-lg);
  padding: 20px;
}

.mobile-links {
  list-style: none;
}

.mobile-links li {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.mobile-links a {
  text-decoration: none;
  color: var(--dark-color);
  font-weight: 500;
}

@media (max-width: 768px) {
  .nav-links,
  .nav-actions {
    display: none;
  }
  
  .mobile-toggle {
    display: block;
  }
  
  .mobile-menu {
    display: block;
  }
}
</style>
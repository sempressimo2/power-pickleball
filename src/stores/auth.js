import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)
  const isGuest = computed(() => !token.value)

  function login(userData) {
    user.value = userData
    token.value = userData.token
    localStorage.setItem('token', userData.token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function register(userData) {
    user.value = userData
    token.value = userData.token
    localStorage.setItem('token', userData.token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function initAuth() {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      user.value = JSON.parse(savedUser)
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isGuest,
    login,
    logout,
    register,
    initAuth
  }
})
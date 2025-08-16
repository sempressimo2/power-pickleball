
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)
  const isGuest = computed(() => !token.value)


  async function login({ email, password }) {
    try {
      const data = await api.login(email, password)
      user.value = data
      token.value = data.token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Login failed' }
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }


  async function register({ email, password, displayName }) {
    try {
      const data = await api.register(email, password, displayName)
      user.value = data
      token.value = data.token
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Registration failed' }
    }
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
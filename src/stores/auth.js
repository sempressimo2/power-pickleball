// stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi, registerApi, meApi, logoutApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)
  const isGuest = computed(() => !token.value)

  async function login(credentials) {
    const data = await loginApi(credentials.email, credentials.password)
    user.value = {
      userId: data.userId,
      displayName: data.displayName,
      email: data.email
    }
    token.value = data.token
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(user.value))
    return data
  }

  async function logout() {
    if (token.value) {
      try { await logoutApi(token.value) } catch { /* ignore */ }
    }
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function register(payload) {
    const data = await registerApi(payload.email, payload.password, payload.displayName)
    user.value = {
      userId: data.userId,
      displayName: data.displayName,
      email: data.email
    }
    token.value = data.token
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(user.value))
    return data
  }

  async function initAuth() {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken) token.value = savedToken
    if (savedUser) user.value = JSON.parse(savedUser)
    if (token.value && !user.value) {
      try {
        const me = await meApi(token.value)
        user.value = me
        localStorage.setItem('user', JSON.stringify(me))
      } catch {
        logout()
      }
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
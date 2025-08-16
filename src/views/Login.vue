<template>
  <div class="auth-page">
    <div class="container">
      <div class="auth-card card">
        <h2>Welcome Back!</h2>
        <p class="auth-subtitle">Login to continue playing</p>
        
        <form @submit.prevent="handleLogin" class="auth-form">
          <div v-if="error" class="alert alert-error">
            {{ error }}
          </div>
          
          <div class="form-group">
            <label class="form-label">Email</label>
            <input
              v-model="email"
              type="email"
              class="form-input"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <input
              v-model="password"
              type="password"
              class="form-input"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="rememberMe" type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" class="forgot-link">Forgot password?</a>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>
        
        <div class="auth-divider">
          <span>OR</span>
        </div>
        
        <button @click="playAsGuest" class="btn btn-outline btn-block">
          <i class="fas fa-user"></i> Play as Guest
        </button>
        
        <div class="auth-footer">
          <p>Don't have an account? <router-link to="/register">Sign up</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    if (!email.value || !password.value) {
      throw new Error('Email and password required')
    }
    await authStore.login({ email: email.value, password: password.value })
    router.push('/game')
  } catch (e) {
    error.value = e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

const playAsGuest = () => {
  router.push('/game')
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.auth-card {
  max-width: 450px;
  width: 100%;
  margin: 0 auto;
}

.auth-card h2 {
  text-align: center;
  margin-bottom: 10px;
}

.auth-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.auth-form {
  margin-bottom: 20px;
}

.checkbox-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.forgot-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.forgot-link:hover {
  text-decoration: underline;
}

.btn-block {
  width: 100%;
  margin-top: 10px;
}

.auth-divider {
  text-align: center;
  margin: 20px 0;
  position: relative;
}

.auth-divider span {
  background: white;
  padding: 0 15px;
  color: #999;
  position: relative;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e0e0e0;
  z-index: -1;
}

.auth-footer {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.auth-footer a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
<template>
  <div class="auth-page">
    <div class="container">
      <div class="auth-card card">
        <h2>Create Account</h2>
        <p class="auth-subtitle">Join the Power Pickleball community!</p>
        
        <form @submit.prevent="handleRegister" class="auth-form">
          <div v-if="error" class="alert alert-error">
            {{ error }}
          </div>
          
          <div v-if="success" class="alert alert-success">
            Account created successfully! Redirecting...
          </div>
          
          <div class="form-group">
            <label class="form-label">Username</label>
            <input
              v-model="username"
              type="text"
              class="form-input"
              placeholder="Choose a username"
              required
            />
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
              placeholder="Create a password"
              required
            />
            <small class="form-hint">Must be at least 8 characters</small>
          </div>
          
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              class="form-input"
              placeholder="Confirm your password"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="agreeToTerms" type="checkbox" required />
              <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
            </label>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
            {{ loading ? 'Creating Account...' : 'Sign Up' }}
          </button>
        </form>
        
        <div class="auth-footer">
          <p>Already have an account? <router-link to="/login">Login</router-link></p>
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

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeToTerms = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref(false)

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  
  // Validation
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    loading.value = false
    return
  }
  
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    loading.value = false
    return
  }
  
  // Simulate API call
  setTimeout(() => {
    if (username.value && email.value && password.value) {
      success.value = true
      authStore.register({
        id: 1,
        name: username.value,
        email: email.value,
        token: 'fake-jwt-token'
      })
      
      setTimeout(() => {
        router.push('/game')
      }, 1500)
    }
    loading.value = false
  }, 1000)
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

.form-hint {
  display: block;
  margin-top: 5px;
  color: #999;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  line-height: 1.5;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
}

.checkbox-label a {
  color: var(--primary-color);
  text-decoration: none;
}

.checkbox-label a:hover {
  text-decoration: underline;
}

.btn-block {
  width: 100%;
  margin-top: 20px;
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
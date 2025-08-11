<template>
  <div class="profile-page">
    <div class="container">
      <div class="profile-header card">
        <div class="profile-avatar">
          <div class="avatar-circle">
            {{ authStore.user?.name?.charAt(0).toUpperCase() }}
          </div>
          <button class="btn btn-outline btn-sm">Change Avatar</button>
        </div>
        
        <div class="profile-info">
          <h1>{{ authStore.user?.name }}</h1>
          <p class="profile-email">{{ authStore.user?.email }}</p>
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-value">42</span>
              <span class="stat-label">Rank</span>
            </div>
            <div class="stat">
              <span class="stat-value">156</span>
              <span class="stat-label">Games</span>
            </div>
            <div class="stat">
              <span class="stat-value">64%</span>
              <span class="stat-label">Win Rate</span>
            </div>
            <div class="stat">
              <span class="stat-value">2150</span>
              <span class="stat-label">Points</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="profile-content">
        <div class="profile-sidebar">
          <div class="card">
            <h3>Achievements</h3>
            <div class="achievements">
              <div class="achievement">
                <i class="fas fa-trophy"></i>
                <span>First Win</span>
              </div>
              <div class="achievement">
                <i class="fas fa-fire"></i>
                <span>Hot Streak</span>
              </div>
              <div class="achievement">
                <i class="fas fa-star"></i>
                <span>Rising Star</span>
              </div>
              <div class="achievement locked">
                <i class="fas fa-crown"></i>
                <span>Champion</span>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3>Recent Activity</h3>
            <ul class="activity-list">
              <li>Won against ComputerAI</li>
              <li>Achieved 5-game win streak</li>
              <li>Reached Top 50 ranking</li>
              <li>Completed daily challenge</li>
            </ul>
          </div>
        </div>
        
        <div class="profile-main">
          <div class="card">
            <h3>Account Settings</h3>
            <form @submit.prevent="updateProfile" class="settings-form">
              <div class="form-group">
                <label class="form-label">Username</label>
                <input v-model="username" type="text" class="form-input" />
              </div>
              
              <div class="form-group">
                <label class="form-label">Email</label>
                <input v-model="email" type="email" class="form-input" />
              </div>
              
              <div class="form-group">
                <label class="form-label">Bio</label>
                <textarea v-model="bio" class="form-input" rows="3" 
                  placeholder="Tell us about yourself..."></textarea>
              </div>
              
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </form>
          </div>
          
          <div class="card">
            <h3>Game Preferences</h3>
            <div class="preferences">
              <div class="preference-item">
                <label class="switch-label">
                  <input type="checkbox" v-model="soundEnabled" />
                  <span>Sound Effects</span>
                </label>
              </div>
              <div class="preference-item">
                <label class="switch-label">
                  <input type="checkbox" v-model="musicEnabled" />
                  <span>Background Music</span>
                </label>
              </div>
              <div class="preference-item">
                <label class="switch-label">
                  <input type="checkbox" v-model="notificationsEnabled" />
                  <span>Push Notifications</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="card danger-zone">
            <h3>Danger Zone</h3>
            <p>Once you delete your account, there is no going back.</p>
            <button class="btn btn-outline" style="border-color: var(--danger-color); color: var(--danger-color)">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const username = ref(authStore.user?.name || '')
const email = ref(authStore.user?.email || '')
const bio = ref('')
const soundEnabled = ref(true)
const musicEnabled = ref(true)
const notificationsEnabled = ref(false)

const updateProfile = () => {
  // Handle profile update
  console.log('Profile updated')
}
</script>

<style scoped>
.profile-page {
  padding: 40px 0;
}

.profile-header {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  padding: 40px;
}

.profile-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.avatar-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
}

.profile-info {
  flex: 1;
}

.profile-info h1 {
  font-size: 2rem;
  margin-bottom: 5px;
}

.profile-email {
  color: #666;
  margin-bottom: 20px;
}

.profile-stats {
  display: flex;
  gap: 40px;
}

.profile-stats .stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-stats .stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary-color);
}

.profile-stats .stat-label {
  color: #666;
  font-size: 14px;
}

.profile-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
}

.achievements {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.achievement {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: var(--radius-md);
  gap: 8px;
}

.achievement i {
  font-size: 2rem;
  color: var(--accent-color);
}

.achievement.locked {
  opacity: 0.5;
}

.achievement.locked i {
  color: #ccc;
}

.activity-list {
  list-style: none;
  padding: 0;
}

.activity-list li {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  color: #666;
}

.activity-list li:last-child {
  border-bottom: none;
}

.settings-form {
  margin-bottom: 0;
}

.preferences {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.switch-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.danger-zone {
  border: 2px solid var(--danger-color);
}

.danger-zone h3 {
  color: var(--danger-color);
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .profile-stats {
    justify-content: center;
  }
  
  .profile-content {
    grid-template-columns: 1fr;
  }
}
</style>
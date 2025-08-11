<template>
  <div class="leaderboard-page">
    <div class="container">
      <div class="page-header">
        <h1>Global Leaderboard</h1>
        <p>See how you rank against players worldwide!</p>
      </div>
      
      <div class="leaderboard-filters card">
        <div class="filter-group">
          <button
            v-for="period in periods"
            :key="period"
            @click="selectedPeriod = period"
            :class="['filter-btn', { active: selectedPeriod === period }]"
          >
            {{ period }}
          </button>
        </div>
        
        <div class="filter-group">
          <button
            v-for="mode in gameModes"
            :key="mode"
            @click="selectedMode = mode"
            :class="['filter-btn', { active: selectedMode === mode }]"
          >
            {{ mode }}
          </button>
        </div>
      </div>
      
      <div class="card">
        <LeaderboardTable />
      </div>
      
      <div class="your-rank card" v-if="authStore.isAuthenticated">
        <h3>Your Ranking</h3>
        <div class="rank-info">
          <div class="rank-item">
            <span class="rank-label">Current Rank</span>
            <span class="rank-value">#42</span>
          </div>
          <div class="rank-item">
            <span class="rank-label">Points</span>
            <span class="rank-value">2,150</span>
          </div>
          <div class="rank-item">
            <span class="rank-label">Win Rate</span>
            <span class="rank-value">64%</span>
          </div>
          <div class="rank-item">
            <span class="rank-label">Streak</span>
            <span class="rank-value">5 Wins</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import LeaderboardTable from '../components/LeaderboardTable.vue'

const authStore = useAuthStore()

const selectedPeriod = ref('All Time')
const selectedMode = ref('Singles')

const periods = ['Today', 'This Week', 'This Month', 'All Time']
const gameModes = ['Singles', 'Doubles', 'Tournament']
</script>

<style scoped>
.leaderboard-page {
  padding: 40px 0;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header p {
  color: #666;
  font-size: 1.2rem;
  margin-top: 10px;
}

.leaderboard-filters {
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 10px;
}

.filter-btn {
  padding: 10px 20px;
  background: #f0f0f0;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  background: #e0e0e0;
}

.filter-btn.active {
  background: var(--gradient-primary);
  color: white;
}

.your-rank {
  margin-top: 30px;
}

.your-rank h3 {
  margin-bottom: 20px;
  text-align: center;
}

.rank-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  text-align: center;
}

.rank-item {
  padding: 20px;
  background: #f8f9fa;
  border-radius: var(--radius-md);
}

.rank-label {
  display: block;
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

.rank-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .leaderboard-filters {
    flex-direction: column;
  }
  
  .filter-group {
    justify-content: center;
  }
}
</style>
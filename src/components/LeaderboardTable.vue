<template>
  <div class="leaderboard-table">
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Wins</th>
          <th>Losses</th>
          <th>Win Rate</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(player, index) in players" :key="player.id" :class="{ 'top-three': index < 3 }">
          <td class="rank">
            <span v-if="index === 0" class="medal gold"><i class="fas fa-trophy"></i></span>
            <span v-else-if="index === 1" class="medal silver"><i class="fas fa-medal"></i></span>
            <span v-else-if="index === 2" class="medal bronze"><i class="fas fa-award"></i></span>
            <span v-else>{{ index + 1 }}</span>
          </td>
          <td class="player-name">
            <div class="player-info">
              <div class="avatar">{{ player.name.charAt(0) }}</div>
              <span>{{ player.name }}</span>
            </div>
          </td>
          <td>{{ player.wins }}</td>
          <td>{{ player.losses }}</td>
          <td>
            <span class="win-rate">{{ player.winRate }}%</span>
          </td>
          <td class="points">{{ player.points }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const players = ref([
  { id: 1, name: 'ProPickler', wins: 245, losses: 32, winRate: 88, points: 4850 },
  { id: 2, name: 'SmashMaster', wins: 212, losses: 45, winRate: 83, points: 4420 },
  { id: 3, name: 'NetNinja', wins: 198, losses: 52, winRate: 79, points: 4180 },
  { id: 4, name: 'SpinDoctor', wins: 175, losses: 68, winRate: 72, points: 3850 },
  { id: 5, name: 'AceHunter', wins: 162, losses: 74, winRate: 69, points: 3620 },
  { id: 6, name: 'RallyKing', wins: 145, losses: 85, winRate: 63, points: 3350 },
  { id: 7, name: 'CourtJester', wins: 132, losses: 92, winRate: 59, points: 3120 },
  { id: 8, name: 'DropShotPro', wins: 118, losses: 98, winRate: 55, points: 2880 },
  { id: 9, name: 'BackhandBoss', wins: 105, losses: 105, winRate: 50, points: 2650 },
  { id: 10, name: 'ServeMachine', wins: 92, losses: 118, winRate: 44, points: 2420 }
])
</script>

<style scoped>
.leaderboard-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

thead {
  background: var(--gradient-primary);
  color: white;
}

th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.5px;
}

tbody tr {
  background: white;
  transition: all 0.3s ease;
}

tbody tr:hover {
  background: #f8f9fa;
  transform: scale(1.02);
}

tbody tr.top-three {
  background: linear-gradient(90deg, rgba(0, 200, 83, 0.1) 0%, transparent 100%);
}

td {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.rank {
  font-weight: 700;
  font-size: 1.2rem;
}

.medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  border-radius: 50%;
}

.medal.gold {
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: white;
}

.medal.silver {
  background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
  color: white;
}

.medal.bronze {
  background: linear-gradient(135deg, #cd7f32, #e8a55d);
  color: white;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: var(--gradient-secondary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.player-name span {
  font-weight: 600;
}

.win-rate {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(0, 200, 83, 0.1);
  color: var(--primary-color);
  border-radius: 20px;
  font-weight: 600;
}

.points {
  font-weight: 700;
  color: var(--secondary-color);
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  th, td {
    padding: 10px 5px;
    font-size: 14px;
  }
  
  .avatar {
    width: 30px;
    height: 30px;
  }
}
</style>
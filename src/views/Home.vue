<template>
  <div class="home">
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <h1 class="hero-title">Welcome to Power Pickleball!</h1>
          <p class="hero-subtitle">
            Experience the thrill of pickleball right from your browser. 
            Challenge players worldwide and become the ultimate champion!
          </p>
          <div class="hero-actions">
            <router-link to="/pregame" class="btn btn-primary btn-lg">
            <i class="fas fa-play"></i> Play Now
            </router-link>
            <router-link to="/how-to-play" class="btn btn-outline btn-lg">
              <i class="fas fa-book"></i> Learn How
            </router-link>
          </div>
        </div>
        <div class="hero-image">
          <div class="game-preview">
            <i class="fas fa-table-tennis-paddle-ball"></i>
          </div>
        </div>
      </div>
    </section>
    
    <section class="features">
      <div class="container">
        <h2>Why Play Power Pickleball?</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-gamepad"></i>
            </div>
            <h3>Easy to Play</h3>
            <p>Simple controls and intuitive gameplay make it fun for everyone!</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-trophy"></i>
            </div>
            <h3>Competitive</h3>
            <p>Climb the leaderboards and prove you're the best player!</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-users"></i>
            </div>
            <h3>Multiplayer</h3>
            <p>Challenge friends or compete against players worldwide!</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-mobile-alt"></i>
            </div>
            <h3>Play Anywhere</h3>
            <p>Works on desktop, tablet, and mobile devices!</p>
          </div>
        </div>
      </div>
    </section>
    
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">10K+</div>
            <div class="stat-label">Active Players</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">50K+</div>
            <div class="stat-label">Games Played</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">100+</div>
            <div class="stat-label">Tournaments</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">24/7</div>
            <div class="stat-label">Online Play</div>
          </div>
        </div>
      </div>
    </section>
    
    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <h2>Ready to Start Playing?</h2>
          <p>Join thousands of players and experience the excitement!</p>
          <div class="cta-actions">
            <router-link to="/register" class="btn btn-primary btn-lg">
              Create Account
            </router-link>
            <router-link to="/game" class="btn btn-outline btn-lg">
              Play as Guest
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding-top: 0;
}

.hero {
  padding: 80px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  /* Solid gradient background */
  color: white;  /* Ensure all text is white */
}

.hero .container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-title {
  font-size: 3.5rem;
  margin-bottom: 20px;
  color: white;  /* Make title solid white */
  text-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.hero-subtitle {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.95);  /* Slightly transparent white */
  margin-bottom: 30px;
  line-height: 1.6;
  text-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.hero-actions {
  display: flex;
  gap: 20px;
}

.btn-lg {
  padding: 15px 30px;
  font-size: 1.1rem;
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.game-preview {
  width: 300px;
  height: 300px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 40px rgba(0, 200, 83, 0.3);
  animation: bounce 2s ease-in-out infinite;
}

.game-preview i {
  font-size: 8rem;
  color: white;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.features {
  padding: 80px 0;
  background: white;
}

.features h2 {
  text-align: center;
  margin-bottom: 50px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  text-align: center;
  padding: 30px;
  border-radius: var(--radius-lg);
  background: white;
  box-shadow: var(--shadow-md);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon i {
  font-size: 2rem;
  color: white;
}

.stats {
  padding: 60px 0;
  background: var(--gradient-primary);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 30px;
  text-align: center;
}

.stat-number {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 1.2rem;
  opacity: 0.9;
}

.cta {
  padding: 80px 0;
  background: white;
}

.cta-content {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.cta-content h2 {
  margin-bottom: 20px;
}

.cta-content p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 30px;
}

.cta-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

@media (max-width: 768px) {
  .hero .container {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .game-preview {
    width: 200px;
    height: 200px;
  }
  
  .game-preview i {
    font-size: 5rem;
  }
}
</style>
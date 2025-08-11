<template>
  <div class="how-to-play-page">
    <div class="container">
      <div class="page-header">
        <h1>How to Play Power Pickleball</h1>
        <p>Master the game with our comprehensive guide!</p>
      </div>
      
      <div class="content-grid">
        <div class="card">
          <h2><i class="fas fa-gamepad"></i> Basic Controls</h2>
          <ul class="guide-list">
            <li><strong>Mouse Movement:</strong> Move your mouse up and down to control your paddle</li>
            <li><strong>Touch Controls:</strong> On mobile, drag your finger to move the paddle</li>
            <li><strong>Start/Pause:</strong> Use the on-screen buttons to control the game</li>
            <li><strong>Reset:</strong> Click reset to start a new game</li>
          </ul>
        </div>
        
        <div class="card">
          <h2><i class="fas fa-bullseye"></i> Objective</h2>
          <p>
            The goal is simple: prevent the ball from passing your paddle while trying to score 
            on your opponent. Be the first to reach 11 points (winning by 2) to claim victory!
          </p>
          <div class="highlight-box">
            <strong>Pro Tip:</strong> Anticipate where the ball will go and position your paddle early!
          </div>
        </div>
        
        <div class="card">
          <h2><i class="fas fa-trophy"></i> Scoring System</h2>
          <ul class="guide-list">
            <li>Score a point when the ball passes your opponent's paddle</li>
            <li>First player to 11 points wins (must win by 2)</li>
            <li>In tournament mode, matches are best of 3 games</li>
            <li>Earn bonus points for consecutive wins</li>
          </ul>
        </div>
        
        <div class="card">
          <h2><i class="fas fa-rocket"></i> Advanced Techniques</h2>
          <ul class="guide-list">
            <li><strong>Edge Shots:</strong> Hit the ball with the edge of your paddle for extra speed</li>
            <li><strong>Spin Control:</strong> The position where you hit affects the ball's spin</li>
            <li><strong>Strategic Positioning:</strong> Stay centered but be ready to move quickly</li>
            <li><strong>Mind Games:</strong> Vary your return angles to keep opponents guessing</li>
          </ul>
        </div>
        
        <div class="card">
          <h2><i class="fas fa-star"></i> Game Modes</h2>
          <div class="mode-grid">
            <div class="mode-item">
              <h3>Singles</h3>
              <p>Classic 1v1 matches against AI or other players</p>
            </div>
            <div class="mode-item">
              <h3>Doubles</h3>
              <p>Team up with a partner for 2v2 action (Coming Soon)</p>
            </div>
            <div class="mode-item">
              <h3>Tournament</h3>
              <p>Compete in brackets for ultimate glory (Coming Soon)</p>
            </div>
            <div class="mode-item">
              <h3>Practice</h3>
              <p>Hone your skills against AI with adjustable difficulty</p>
            </div>
          </div>
        </div>
        
        <div class="card full-width">
          <h2><i class="fas fa-lightbulb"></i> Tips for Beginners</h2>
          <div class="tips-container">
            <div class="tip-card">
              <div class="tip-number">1</div>
              <div class="tip-content">
                <strong>Start Slow:</strong> Focus on keeping the ball in play before attempting advanced shots
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-number">2</div>
              <div class="tip-content">
                <strong>Watch the Ball:</strong> Keep your eyes on the ball, not your opponent's paddle
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-number">3</div>
              <div class="tip-content">
                <strong>Center Position:</strong> Return to center position after each shot
              </div>
            </div>
            <div class="tip-card">
              <div class="tip-number">4</div>
              <div class="tip-content">
                <strong>Practice Daily:</strong> Consistent practice leads to improvement
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="cta-section">
        <h2>Ready to Play?</h2>
        <router-link to="/game" class="btn btn-primary btn-lg">
          <i class="fas fa-play"></i> Start Playing Now
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.how-to-play-page {
  padding: 40px 0;
}

.page-header {
  text-align: center;
  margin-bottom: 50px;
}

.page-header p {
  color: #666;
  font-size: 1.2rem;
  margin-top: 10px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
}

.card h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  color: var(--primary-color);
}

.guide-list {
  list-style: none;
  padding: 0;
}

.guide-list li {
  padding: 10px 0;
  padding-left: 25px;
  position: relative;
  line-height: 1.6;
}

.guide-list li:before {
  content: '▸';
  position: absolute;
  left: 0;
  color: var(--primary-color);
  font-weight: bold;
}

.highlight-box {
  margin-top: 20px;
  padding: 15px;
  background: linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 200, 83, 0.05));
  border-left: 4px solid var(--primary-color);
  border-radius: var(--radius-md);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.mode-item {
  padding: 15px;
  background: #f8f9fa;
  border-radius: var(--radius-md);
}

.mode-item h3 {
  color: var(--secondary-color);
  margin-bottom: 5px;
}

.full-width {
  grid-column: 1 / -1;
}

.tips-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.tip-card {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: var(--radius-md);
}

.tip-number {
  width: 35px;
  height: 35px;
  background: var(--gradient-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.cta-section {
  text-align: center;
  padding: 40px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border-radius: var(--radius-lg);
}

.cta-section h2 {
  margin-bottom: 20px;
}

.btn-lg {
  padding: 15px 30px;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
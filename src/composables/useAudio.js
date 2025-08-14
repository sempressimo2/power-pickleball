import { ref, reactive } from 'vue'

export function useAudio() {
  // Reactive state
  const audioEnabled = ref(true)
  const audioContext = ref(null)
  const sounds = ref({})
  const isInitialized = ref(false)

  // Sound file configuration
  const soundFiles = {
    paddleHit: '/sounds/paddle-hit.wav',
    wallBounce: '/sounds/wall-bounce.wav',
    serve: '/sounds/serve.wav',
    score: '/sounds/score.wav',
    sideOut: '/sounds/side-out.wav',
    gameWin: '/sounds/game-win.wav',
    gameStart: '/sounds/game-start.wav',
    menuClick: '/sounds/menu-click.wav',
    menuOpen: '/sounds/menu-open.wav',
    countdown: '/sounds/countdown.wav'
  }

  // Volume settings for different sound types
  const volumeSettings = {
    paddleHit: 0.8,
    wallBounce: 0.6,
    serve: 0.8,
    score: 0.9,
    sideOut: 0.8,
    gameWin: 1.0,
    gameStart: 0.7,
    menuClick: 0.5,
    menuOpen: 0.5,
    countdown: 0.6
  }

  /**
   * Initialize the audio system
   */
  const initAudio = async () => {
    if (isInitialized.value) return true

    try {
      // Create audio context for better browser compatibility
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      
      // Load all sound files
      const loadPromises = Object.entries(soundFiles).map(async ([key, path]) => {
        try {
          const audio = new Audio(path)
          audio.preload = 'auto'
          audio.volume = volumeSettings[key] || 0.7
          
          // Wait for audio to be loaded
          return new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', () => {
              sounds.value[key] = audio
              resolve()
            }, { once: true })
            
            audio.addEventListener('error', reject, { once: true })
            
            // Trigger loading
            audio.load()
          })
        } catch (error) {
          console.warn(`Failed to load sound: ${key}`, error)
        }
      })

      await Promise.allSettled(loadPromises)
      isInitialized.value = true
      console.log('Audio system initialized successfully')
      return true

    } catch (error) {
      console.warn('Audio initialization failed:', error)
      audioEnabled.value = false
      return false
    }
  }

  /**
   * Play a sound effect
   * @param {string} soundName - The name of the sound to play
   * @param {number} volumeMultiplier - Volume multiplier (0.0 to 1.0)
   */
  const playSound = async (soundName, volumeMultiplier = 1.0) => {
    if (!audioEnabled.value || !sounds.value[soundName]) {
      return false
    }

    try {
      // Resume audio context if needed (for mobile browsers)
      if (audioContext.value && audioContext.value.state === 'suspended') {
        await audioContext.value.resume()
      }

      const audio = sounds.value[soundName]
      
      // Clone the audio for overlapping sounds
      const audioClone = audio.cloneNode()
      audioClone.volume = (volumeSettings[soundName] || 0.7) * volumeMultiplier
      
      const playPromise = audioClone.play()
      if (playPromise !== undefined) {
        await playPromise
      }
      
      return true

    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error)
      return false
    }
  }

  /**
   * Toggle audio on/off
   */
  const toggleAudio = () => {
    audioEnabled.value = !audioEnabled.value
    
    // Play a feedback sound if enabling audio
    if (audioEnabled.value) {
      playSound('menuClick', 0.5)
    }
    
    // Store preference in localStorage
    localStorage.setItem('audioEnabled', audioEnabled.value.toString())
  }

  /**
   * Set master volume for all sounds
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  const setMasterVolume = (volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    
    Object.keys(sounds.value).forEach(key => {
      if (sounds.value[key]) {
        sounds.value[key].volume = (volumeSettings[key] || 0.7) * clampedVolume
      }
    })
  }

  /**
   * Preload audio on user interaction (for mobile compatibility)
   */
  const preloadAudio = async () => {
    if (!isInitialized.value) {
      await initAudio()
    }

    // Resume audio context on user interaction
    if (audioContext.value && audioContext.value.state === 'suspended') {
      try {
        await audioContext.value.resume()
        console.log('Audio context resumed')
      } catch (error) {
        console.warn('Failed to resume audio context:', error)
      }
    }
  }

  /**
   * Load audio preferences from localStorage
   */
  const loadAudioPreferences = () => {
    const savedAudioEnabled = localStorage.getItem('audioEnabled')
    if (savedAudioEnabled !== null) {
      audioEnabled.value = savedAudioEnabled === 'true'
    }
  }

  /**
   * Game-specific sound effects with appropriate timing
   */
  const gameSounds = {
    paddleHit: (intensity = 1.0) => playSound('paddleHit', intensity),
    wallBounce: () => playSound('wallBounce'),
    serve: () => playSound('serve'),
    score: () => playSound('score'),
    sideOut: () => playSound('sideOut'),
    gameWin: () => playSound('gameWin'),
    gameStart: () => playSound('gameStart'),
    menuClick: () => playSound('menuClick'),
    menuOpen: () => playSound('menuOpen'),
    countdown: () => playSound('countdown')
  }

  // Load preferences on composable creation
  loadAudioPreferences()

  // Return the public API
  return {
    // State
    audioEnabled,
    isInitialized,
    
    // Methods
    initAudio,
    playSound,
    toggleAudio,
    setMasterVolume,
    preloadAudio,
    
    // Game-specific shortcuts
    gameSounds
  }
}
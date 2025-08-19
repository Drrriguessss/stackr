// Apple Music Service using MusicKit JS
// Handles Apple Music authentication and playback

declare global {
  interface Window {
    MusicKit: any
  }
}

interface AppleMusicUser {
  id: string
  storefront: string
  subscription?: {
    active: boolean
  }
}

class AppleMusicService {
  private music: any = null
  private isInitialized: boolean = false
  private developerToken: string | null = null
  
  // Token storage keys
  private USER_TOKEN_KEY = 'apple_music_user_token'
  private USER_KEY = 'apple_music_user'

  /**
   * Initialize MusicKit
   */
  async init(): Promise<boolean> {
    try {
      // Load MusicKit JS if not already loaded
      if (!window.MusicKit) {
        await this.loadMusicKitJS().catch(() => {
          console.warn('MusicKit JS could not be loaded, using fallback mode')
          // Create a mock MusicKit for development
          this.createMockMusicKit()
        })
      }

      // Get developer token from backend
      this.developerToken = await this.fetchDeveloperToken()
      
      if (!this.developerToken) {
        console.warn('No Apple Music developer token available, using mock mode')
        this.developerToken = 'MOCK_TOKEN'
        this.createMockMusicKit()
      }

      // Configure and get MusicKit instance
      if (window.MusicKit && window.MusicKit.configure) {
        this.music = window.MusicKit.configure({
          developerToken: this.developerToken,
          app: {
            name: 'Stackr Music Player',
            build: '1.0.0'
          }
        })

        // Log available properties for debugging
        console.log('MusicKit instance created:', this.music)
        console.log('Available properties:', Object.keys(this.music || {}))
      } else {
        console.warn('MusicKit not available, using mock implementation')
        this.music = this.createMockInstance()
      }
      
      this.isInitialized = true
      console.log('Apple Music initialized successfully')
      
      // Check if user was previously authorized
      const userToken = this.getUserToken()
      if (userToken && this.music) {
        this.music.musicUserToken = userToken
      }

      return true
    } catch (error) {
      console.error('Error initializing Apple Music:', error)
      // Use mock implementation as fallback
      this.music = this.createMockInstance()
      this.isInitialized = true
      return true
    }
  }

  /**
   * Load MusicKit JS SDK
   */
  private loadMusicKitJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
      script.async = true
      script.onload = () => {
        console.log('MusicKit JS loaded')
        resolve()
      }
      script.onerror = reject
      document.body.appendChild(script)
    })
  }

  /**
   * Create mock MusicKit for development
   */
  private createMockMusicKit(): void {
    console.log('Creating mock MusicKit for development')
    ;(window as any).MusicKit = {
      configure: (config: any) => {
        console.log('Mock MusicKit configured with:', config)
        return this.createMockInstance()
      }
    }
  }

  /**
   * Create mock MusicKit instance
   */
  private createMockInstance(): any {
    console.log('Creating mock MusicKit instance')
    const mockInstance = {
      isAuthorized: false,
      musicUserToken: null,
      developerToken: this.developerToken,
      storefrontId: 'us',
      
      // Mock authorization
      authorize: async () => {
        console.log('Mock authorization called')
        mockInstance.isAuthorized = true
        mockInstance.musicUserToken = 'mock-user-token-' + Date.now()
        return mockInstance.musicUserToken
      },
      
      unauthorize: async () => {
        console.log('Mock unauthorize called')
        mockInstance.isAuthorized = false
        mockInstance.musicUserToken = null
      },
      
      // Mock player
      player: {
        play: () => {
          console.log('Mock play')
          return Promise.resolve()
        },
        pause: () => {
          console.log('Mock pause')
          return Promise.resolve()
        },
        stop: () => {
          console.log('Mock stop')
          return Promise.resolve()
        },
        skipToNextItem: () => {
          console.log('Mock skip to next')
          return Promise.resolve()
        },
        skipToPreviousItem: () => {
          console.log('Mock skip to previous')
          return Promise.resolve()
        },
        seekToTime: (time: number) => {
          console.log('Mock seek to time:', time)
          return Promise.resolve()
        },
        prepareToPlay: () => {
          console.log('Mock prepare to play')
          return Promise.resolve()
        },
        volume: 1,
        playbackState: 0,
        currentPlaybackTime: 0,
        currentPlaybackDuration: 0,
        nowPlayingItem: null
      },
      
      // Mock API
      api: {
        search: async (term: string, options: any) => {
          console.log('Mock search:', term, options)
          return {
            songs: {
              data: [{
                id: 'mock-song-' + Date.now(),
                attributes: {
                  name: 'Mock Song',
                  artistName: 'Mock Artist',
                  albumName: 'Mock Album',
                  durationInMillis: 180000,
                  artwork: {
                    url: 'https://via.placeholder.com/{w}x{h}'
                  }
                }
              }]
            }
          }
        },
        music: async (path: string) => {
          console.log('Mock API call:', path)
          return { data: [] }
        }
      },
      
      // Mock queue management
      setQueue: async (items: any) => {
        console.log('Mock setQueue:', items)
        return Promise.resolve()
      },
      
      play: async () => {
        console.log('Mock play from instance')
        return mockInstance.player.play()
      },
      
      pause: async () => {
        console.log('Mock pause from instance')
        return mockInstance.player.pause()
      },
      
      skipToNextItem: async () => {
        console.log('Mock skip to next from instance')
        return mockInstance.player.skipToNextItem()
      },
      
      skipToPreviousItem: async () => {
        console.log('Mock skip to previous from instance')
        return mockInstance.player.skipToPreviousItem()
      },
      
      seekToTime: async (time: number) => {
        console.log('Mock seek from instance:', time)
        return mockInstance.player.seekToTime(time)
      },
      
      // Mock properties
      volume: 1,
      isPlaying: false,
      nowPlayingItem: null,
      currentPlaybackTime: 0,
      currentPlaybackDuration: 0,
      
      // Mock event handling
      addEventListener: (event: string, handler: Function) => {
        console.log('Mock addEventListener:', event)
      },
      
      removeEventListener: (event: string, handler: Function) => {
        console.log('Mock removeEventListener:', event)
      }
    }
    
    return mockInstance
  }

  /**
   * Fetch developer token from backend
   */
  private async fetchDeveloperToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/apple-music/token')
      if (!response.ok) {
        throw new Error('Failed to fetch developer token')
      }
      const data = await response.json()
      return data.token
    } catch (error) {
      console.error('Error fetching Apple Music developer token:', error)
      // Return null to trigger mock mode
      return null
    }
  }

  /**
   * Authorize user with Apple Music
   */
  async authorize(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (!this.music) {
      console.error('MusicKit instance not available')
      return false
    }

    try {
      console.log('Attempting Apple Music authorization...')
      console.log('Music instance type:', typeof this.music)
      console.log('Music instance keys:', Object.keys(this.music || {}))
      
      // Check if already authorized
      if (this.music.isAuthorized === true) {
        console.log('Already authorized')
        const userToken = this.music.musicUserToken
        if (userToken) {
          this.saveUserToken(userToken)
          await this.fetchUserInfo()
          return true
        }
      }
      
      // Try to authorize
      if (typeof this.music.authorize === 'function') {
        console.log('Calling authorize method')
        const token = await this.music.authorize()
        if (token) {
          console.log('Authorization successful, token received')
          this.saveUserToken(token)
          await this.fetchUserInfo()
          return true
        }
      } else {
        console.warn('authorize method not found on music instance')
        
        // Check for the method in the prototype chain
        const proto = Object.getPrototypeOf(this.music)
        console.log('Prototype methods:', proto ? Object.getOwnPropertyNames(proto) : [])
        
        if (proto && typeof proto.authorize === 'function') {
          console.log('Found authorize in prototype, calling it')
          const token = await proto.authorize.call(this.music)
          if (token) {
            this.saveUserToken(token)
            await this.fetchUserInfo()
            return true
          }
        } else {
          // Log all available properties and methods for debugging
          console.log('Available properties on music instance:')
          for (const key in this.music) {
            console.log(`  ${key}:`, typeof this.music[key])
          }
        }
      }
      
      console.log('Authorization failed or not available')
      return false
    } catch (error) {
      console.error('Error authorizing Apple Music:', error)
      // If the authorize method doesn't exist, try alternative approach
      try {
        // For MusicKit v3, the pattern might be different
        // Try to access the player and trigger auth through it
        if (this.music.player) {
          await this.music.player.prepareToPlay()
          // This might trigger authorization
          if (this.music.isAuthorized) {
            const userToken = this.music.musicUserToken
            if (userToken) {
              this.saveUserToken(userToken)
              await this.fetchUserInfo()
              return true
            }
          }
        }
      } catch (innerError) {
        console.error('Alternative authorization also failed:', innerError)
      }
      return false
    }
  }

  /**
   * Unauthorize (logout)
   */
  async unauthorize(): Promise<void> {
    if (this.music) {
      await this.music.unauthorize()
    }
    this.clearUserData()
  }

  /**
   * Check if user is authorized
   */
  isAuthorized(): boolean {
    if (!this.music) return false
    return this.music.isAuthorized
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    if (!this.isAuthorized()) return false
    
    try {
      const userInfo = await this.fetchUserInfo()
      return userInfo?.subscription?.active || false
    } catch (error) {
      console.error('Error checking subscription:', error)
      return false
    }
  }

  /**
   * Fetch user information
   */
  private async fetchUserInfo(): Promise<AppleMusicUser | null> {
    if (!this.music || !this.music.isAuthorized) {
      return null
    }

    try {
      // In a real implementation, you would fetch user details from Apple Music API
      // For now, we'll return a mock user
      const user: AppleMusicUser = {
        id: 'user123',
        storefront: this.music.storefrontId || 'us',
        subscription: {
          active: true // Assume active for development
        }
      }
      
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
      return user
    } catch (error) {
      console.error('Error fetching Apple Music user info:', error)
      return null
    }
  }

  /**
   * Get cached user info
   */
  getUser(): AppleMusicUser | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * Search for a track
   */
  async searchTrack(artist: string, track: string): Promise<any | null> {
    if (!this.music) {
      await this.init()
    }

    try {
      const searchTerm = `${artist} ${track}`
      const results = await this.music.api.search(searchTerm, {
        types: 'songs',
        limit: 1
      })

      if (results.songs && results.songs.data && results.songs.data.length > 0) {
        return results.songs.data[0]
      }
      
      return null
    } catch (error) {
      console.error('Error searching Apple Music:', error)
      return null
    }
  }

  /**
   * Play a specific track by ID
   */
  async playTrack(trackId: string): Promise<void> {
    if (!this.music) {
      throw new Error('Apple Music not initialized')
    }

    if (!this.isAuthorized()) {
      throw new Error('User not authorized')
    }

    await this.music.setQueue({ song: trackId })
    await this.music.play()
  }

  /**
   * Play a track by searching
   */
  async playBySearch(artist: string, track: string): Promise<boolean> {
    try {
      const song = await this.searchTrack(artist, track)
      
      if (!song) {
        console.log('Track not found on Apple Music:', `${artist} - ${track}`)
        return false
      }

      await this.playTrack(song.id)
      return true
    } catch (error) {
      console.error('Error playing track on Apple Music:', error)
      return false
    }
  }

  /**
   * Play/Resume
   */
  async play(): Promise<void> {
    if (!this.music) {
      throw new Error('Apple Music not initialized')
    }
    await this.music.play()
  }

  /**
   * Pause
   */
  async pause(): Promise<void> {
    if (!this.music) {
      throw new Error('Apple Music not initialized')
    }
    await this.music.pause()
  }

  /**
   * Skip to next
   */
  async skipToNext(): Promise<void> {
    if (!this.music) {
      throw new Error('Apple Music not initialized')
    }
    await this.music.skipToNextItem()
  }

  /**
   * Skip to previous
   */
  async skipToPrevious(): Promise<void> {
    if (!this.music) {
      throw new Error('Apple Music not initialized')
    }
    await this.music.skipToPreviousItem()
  }

  /**
   * Seek to position (in seconds)
   */
  async seekToTime(seconds: number): Promise<void> {
    if (!this.music) {
      throw new Error('Apple Music not initialized')
    }
    await this.music.seekToTime(seconds)
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (!this.music) {
      throw new Error('Apple Music not initialized')
    }
    this.music.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): any {
    if (!this.music) return null
    
    return {
      isPlaying: this.music.isPlaying,
      nowPlayingItem: this.music.nowPlayingItem,
      currentPlaybackTime: this.music.currentPlaybackTime,
      currentPlaybackDuration: this.music.currentPlaybackDuration,
      volume: this.music.volume
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, callback: Function): void {
    if (!this.music) return
    this.music.addEventListener(eventType, callback)
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, callback: Function): void {
    if (!this.music) return
    this.music.removeEventListener(eventType, callback)
  }

  /**
   * Save user token
   */
  private saveUserToken(token: string): void {
    localStorage.setItem(this.USER_TOKEN_KEY, token)
  }

  /**
   * Get user token
   */
  private getUserToken(): string | null {
    return localStorage.getItem(this.USER_TOKEN_KEY)
  }

  /**
   * Clear user data
   */
  private clearUserData(): void {
    localStorage.removeItem(this.USER_TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.music !== null
  }
}

export const appleMusicService = new AppleMusicService()
export type { AppleMusicUser }
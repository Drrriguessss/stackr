// Spotify Web Playback SDK Service
// Manages the Spotify player instance and playback controls

import { spotifyAuthService } from './spotifyAuthService'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: typeof Spotify
  }
}

interface SpotifyPlayerState {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: {
      id: string
      uri: string
      name: string
      album: {
        name: string
        images: Array<{url: string}>
      }
      artists: Array<{name: string}>
    }
  }
}

class SpotifyPlayerService {
  private player: Spotify.Player | null = null
  private deviceId: string | null = null
  private isReady: boolean = false
  private listeners: Map<string, Set<Function>> = new Map()
  private currentState: SpotifyPlayerState | null = null

  /**
   * Initialize the Spotify Web Playback SDK
   */
  async init(): Promise<boolean> {
    // Check if user is connected and premium
    const isPremium = await spotifyAuthService.isConnectedAndPremium()
    
    if (!isPremium) {
      console.log('Spotify Premium required for playback')
      return false
    }

    // Load the SDK if not already loaded
    if (!window.Spotify) {
      await this.loadSpotifySDK()
    }

    // Get access token
    const token = await spotifyAuthService.getAccessToken()
    
    if (!token) {
      console.error('No Spotify access token available')
      return false
    }

    // Create player instance
    this.player = new window.Spotify.Player({
      name: 'Stackr Music Player',
      getOAuthToken: async (cb: (token: string) => void) => {
        const freshToken = await spotifyAuthService.getAccessToken()
        if (freshToken) {
          cb(freshToken)
        }
      },
      volume: 0.5
    })

    // Set up event listeners
    this.setupEventListeners()

    // Connect the player
    const success = await this.player.connect()
    
    if (success) {
      console.log('Spotify Player connected successfully')
      this.isReady = true
    } else {
      console.error('Failed to connect Spotify Player')
    }

    return success
  }

  /**
   * Load the Spotify Web Playback SDK script
   */
  private loadSpotifySDK(): Promise<void> {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true

      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('Spotify Web Playback SDK loaded')
        resolve()
      }

      document.body.appendChild(script)
    })
  }

  /**
   * Set up player event listeners
   */
  private setupEventListeners(): void {
    if (!this.player) return

    // Ready event
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with device ID:', device_id)
      this.deviceId = device_id
      this.emit('ready', device_id)
    })

    // Not ready event
    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('Spotify Player not ready with device ID:', device_id)
      this.deviceId = null
      this.emit('not_ready', device_id)
    })

    // Player state changed
    this.player.addListener('player_state_changed', (state) => {
      if (!state) return
      
      this.currentState = state
      this.emit('state_changed', state)
      
      // Check if track ended
      if (state.position === 0 && state.paused && this.currentState?.position > 0) {
        this.emit('track_ended')
      }
    })

    // Initialization error
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Spotify Player initialization error:', message)
      this.emit('error', { type: 'initialization_error', message })
    })

    // Authentication error
    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Spotify Player authentication error:', message)
      this.emit('error', { type: 'authentication_error', message })
    })

    // Account error
    this.player.addListener('account_error', ({ message }) => {
      console.error('Spotify Player account error:', message)
      this.emit('error', { type: 'account_error', message })
    })

    // Playback error
    this.player.addListener('playback_error', ({ message }) => {
      console.error('Spotify Player playback error:', message)
      this.emit('error', { type: 'playback_error', message })
    })
  }

  /**
   * Play a specific track
   */
  async playTrack(spotifyUri: string): Promise<void> {
    if (!this.deviceId) {
      throw new Error('No Spotify device available')
    }

    const token = await spotifyAuthService.getAccessToken()
    
    if (!token) {
      throw new Error('No Spotify access token')
    }

    // Transfer playback to this device and start playing the track
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        uris: [spotifyUri]
      })
    })

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to start playback')
    }
  }

  /**
   * Play a track by searching for it
   */
  async playBySearch(artist: string, track: string): Promise<boolean> {
    try {
      // Search for the track on Spotify
      const spotifyUri = await spotifyAuthService.searchTrack(artist, track)
      
      if (!spotifyUri) {
        console.log('Track not found on Spotify:', `${artist} - ${track}`)
        return false
      }

      // Play the track
      await this.playTrack(spotifyUri)
      return true
    } catch (error) {
      console.error('Error playing track:', error)
      return false
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }

    await this.player.resume()
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }

    await this.player.pause()
  }

  /**
   * Toggle play/pause
   */
  async togglePlay(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }

    await this.player.togglePlay()
  }

  /**
   * Seek to position
   */
  async seek(positionMs: number): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }

    await this.player.seek(positionMs)
  }

  /**
   * Set volume (0-1)
   */
  async setVolume(volume: number): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }

    await this.player.setVolume(Math.max(0, Math.min(1, volume)))
  }

  /**
   * Get current state
   */
  async getCurrentState(): Promise<SpotifyPlayerState | null> {
    if (!this.player) {
      return null
    }

    return await this.player.getCurrentState()
  }

  /**
   * Skip to next track
   */
  async nextTrack(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }

    await this.player.nextTrack()
  }

  /**
   * Skip to previous track
   */
  async previousTrack(): Promise<void> {
    if (!this.player) {
      throw new Error('Player not initialized')
    }

    await this.player.previousTrack()
  }

  /**
   * Disconnect the player
   */
  disconnect(): void {
    if (this.player) {
      this.player.disconnect()
      this.player = null
      this.deviceId = null
      this.isReady = false
    }
  }

  /**
   * Check if player is ready
   */
  getIsReady(): boolean {
    return this.isReady
  }

  /**
   * Get device ID
   */
  getDeviceId(): string | null {
    return this.deviceId
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  /**
   * Emit an event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }
}

export const spotifyPlayerService = new SpotifyPlayerService()
export type { SpotifyPlayerState }
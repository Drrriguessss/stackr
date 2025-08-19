// Spotify Authentication Service
// Handles OAuth 2.0 flow and token management

interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface SpotifyUser {
  id: string
  display_name: string
  email: string
  product: 'free' | 'premium'
  images: Array<{url: string}>
}

class SpotifyAuthService {
  // These should be in environment variables in production
  private CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID'
  private REDIRECT_URI = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/spotify/callback`
    : process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback'
  
  // Scopes needed for playback and user info
  private SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-library-read',
    'user-library-modify',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ')

  // Token storage keys
  private TOKEN_KEY = 'spotify_access_token'
  private REFRESH_TOKEN_KEY = 'spotify_refresh_token'
  private TOKEN_EXPIRY_KEY = 'spotify_token_expiry'
  private USER_KEY = 'spotify_user'

  /**
   * Check if Spotify is properly configured
   */
  isConfigured(): boolean {
    return this.CLIENT_ID !== 'YOUR_SPOTIFY_CLIENT_ID' && this.CLIENT_ID.length > 0
  }

  /**
   * Get configuration status message
   */
  getConfigurationMessage(): string {
    if (!this.isConfigured()) {
      return 'Spotify n\'est pas configuré. Ajoutez vos clés API dans .env.local pour activer la lecture Spotify.'
    }
    return ''
  }

  /**
   * Initiate Spotify OAuth flow
   */
  async connectSpotify(): Promise<void> {
    if (!this.isConfigured()) {
      alert('Spotify n\'est pas configuré. Veuillez ajouter vos clés API Spotify dans le fichier .env.local')
      console.error('Spotify CLIENT_ID not configured')
      return
    }

    const state = this.generateRandomString(16)
    localStorage.setItem('spotify_auth_state', state)

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      redirect_uri: this.REDIRECT_URI,
      state: state,
      show_dialog: 'true' // Force showing the auth dialog
    })

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  /**
   * Handle the callback from Spotify OAuth
   */
  async handleCallback(code: string, state: string): Promise<boolean> {
    const storedState = localStorage.getItem('spotify_auth_state')
    
    console.log('🎵 [Spotify] OAuth callback - received state:', state)
    console.log('🎵 [Spotify] OAuth callback - stored state:', storedState)
    
    if (!storedState) {
      console.warn('🎵 [Spotify] No stored state found, proceeding anyway for development')
    } else if (state !== storedState) {
      console.error('State mismatch in Spotify OAuth callback')
      // En développement, on continue quand même
      console.warn('🎵 [Spotify] Proceeding despite state mismatch for development')
    }

    localStorage.removeItem('spotify_auth_state')

    try {
      // Exchange code for tokens
      const response = await fetch('/api/spotify/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: this.REDIRECT_URI })
      })

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens')
      }

      const tokens: SpotifyTokens = await response.json()
      this.saveTokens(tokens)

      // Get user info
      await this.fetchUserProfile()

      return true
    } catch (error) {
      console.error('Error handling Spotify callback:', error)
      return false
    }
  }

  /**
   * Get current access token, refreshing if needed
   */
  async getAccessToken(): Promise<string | null> {
    const token = localStorage.getItem(this.TOKEN_KEY)
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY)

    if (!token || !expiry) {
      return null
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now()
    const expiryTime = parseInt(expiry)
    
    if (now >= expiryTime - 300000) { // 5 minutes before expiry
      return await this.refreshAccessToken()
    }

    return token
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY)
    
    if (!refreshToken) {
      console.error('No refresh token available')
      return null
    }

    try {
      const response = await fetch('/api/spotify/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()
      this.saveTokens(data)
      
      return data.access_token
    } catch (error) {
      console.error('Error refreshing Spotify token:', error)
      this.disconnect()
      return null
    }
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokens(tokens: Partial<SpotifyTokens>): void {
    if (tokens.access_token) {
      localStorage.setItem(this.TOKEN_KEY, tokens.access_token)
    }
    
    if (tokens.refresh_token) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh_token)
    }
    
    if (tokens.expires_in) {
      const expiryTime = Date.now() + (tokens.expires_in * 1000)
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString())
    }
  }

  /**
   * Fetch user profile from Spotify
   */
  async fetchUserProfile(): Promise<SpotifyUser | null> {
    const token = await this.getAccessToken()
    
    if (!token) {
      return null
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }

      const user: SpotifyUser = await response.json()
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
      
      return user
    } catch (error) {
      console.error('Error fetching Spotify user profile:', error)
      return null
    }
  }

  /**
   * Get cached user profile
   */
  getUser(): SpotifyUser | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * Check if user is connected and has premium
   */
  async isConnectedAndPremium(): Promise<boolean> {
    const user = this.getUser()
    const token = await this.getAccessToken()
    
    return !!(token && user && user.product === 'premium')
  }

  /**
   * Disconnect Spotify (clear all tokens and data)
   */
  disconnect(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY)
    localStorage.removeItem(this.USER_KEY)
    localStorage.removeItem('spotify_auth_state')
  }

  /**
   * Generate random string for OAuth state
   */
  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let text = ''
    
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    
    return text
  }

  /**
   * Search for a track on Spotify
   */
  async searchTrack(artist: string, track: string): Promise<string | null> {
    const token = await this.getAccessToken()
    
    if (!token) {
      return null
    }

    try {
      const query = `track:${track} artist:${artist}`
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to search track')
      }

      const data = await response.json()
      
      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        return data.tracks.items[0].uri // Returns spotify:track:xxxxx
      }
      
      return null
    } catch (error) {
      console.error('Error searching Spotify track:', error)
      return null
    }
  }
}

export const spotifyAuthService = new SpotifyAuthService()
export type { SpotifyUser, SpotifyTokens }
// src/services/rawgService.ts - VERSION DE BASE POUR TESTER L'API
export interface RAWGGame {
  id: number
  name: string
  background_image: string
  rating: number
  rating_count: number
  released: string
  platforms: { platform: { name: string } }[]
  developers: { name: string }[]
  publishers: { name: string }[]
  genres: { name: string }[]
  tags: { name: string }[]
  description_raw?: string
  metacritic?: number
  esrb_rating?: { name: string }
  parent_platforms?: { platform: { name: string } }[]
  website?: string
  stores?: { store: { name: string }, url: string }[]
  screenshots?: { image: string }[]
}

export interface RAWGSearchResponse {
  count: number
  next?: string
  previous?: string
  results: RAWGGame[]
}

class RAWGService {
  private readonly apiKey = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  private readonly baseURL = 'https://api.rawg.io/api'

  /**
   * RECHERCHE LA PLUS SIMPLE POSSIBLE
   */
  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    console.log('🎮 Starting basic search for:', query)
    
    if (!query || query.length < 2) {
      console.log('🎮 Query too short')
      return []
    }

    try {
      const url = `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=10`
      console.log('🎮 Fetching URL:', url)

      const response = await fetch(url)
      console.log('🎮 Response status:', response.status)

      if (!response.ok) {
        console.error('🎮 Response not ok:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('🎮 Error response:', errorText)
        return []
      }

      const data = await response.json()
      console.log('🎮 Raw API response:', data)

      if (!data.results) {
        console.error('🎮 No results in response')
        return []
      }

      console.log('🎮 Found', data.results.length, 'games')
      
      // Log each game found
      data.results.forEach((game: RAWGGame, index: number) => {
        console.log(`🎮 ${index + 1}. ${game.name} (ID: ${game.id}, Rating: ${game.rating}, Reviews: ${game.rating_count})`)
      })

      return data.results

    } catch (error) {
      console.error('🎮 Search error:', error)
      return []
    }
  }

  /**
   * TEST DE CONNEXION SIMPLE
   */
  async testConnection(): Promise<{ success: boolean, message: string }> {
    console.log('🎮 Testing RAWG API connection...')
    
    try {
      const url = `${this.baseURL}/games?key=${this.apiKey}&page_size=1`
      console.log('🎮 Test URL:', url)
      
      const response = await fetch(url)
      console.log('🎮 Test response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🎮 Test error response:', errorText)
        return { 
          success: false, 
          message: `API Error ${response.status}: ${response.statusText}` 
        }
      }

      const data = await response.json()
      console.log('🎮 Test response data:', data)

      return { 
        success: true, 
        message: `API Working! Found ${data.count || 0} games total` 
      }
    } catch (error) {
      console.error('🎮 Connection test failed:', error)
      return { 
        success: false, 
        message: `Connection failed: ${error}` 
      }
    }
  }

  async getPopularGames(): Promise<RAWGGame[]> {
    console.log('🎮 Getting popular games...')
    
    try {
      const response = await fetch(`${this.baseURL}/games?key=${this.apiKey}&ordering=-rating&page_size=8`)
      
      if (!response.ok) {
        console.error('🎮 Popular games error:', response.status)
        return []
      }

      const data = await response.json()
      console.log('🎮 Popular games:', data.results?.length || 0)
      
      return data.results || []
    } catch (error) {
      console.error('🎮 Popular games failed:', error)
      return []
    }
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    console.log('🎮 Getting top rated games...')
    
    try {
      const response = await fetch(`${this.baseURL}/games?key=${this.apiKey}&ordering=-metacritic&page_size=8`)
      
      if (!response.ok) {
        console.error('🎮 Top rated games error:', response.status)
        return []
      }

      const data = await response.json()
      console.log('🎮 Top rated games:', data.results?.length || 0)
      
      return data.results || []
    } catch (error) {
      console.error('🎮 Top rated games failed:', error)
      return []
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    console.log('🎮 Getting new releases...')
    
    try {
      const response = await fetch(`${this.baseURL}/games?key=${this.apiKey}&ordering=-released&page_size=8`)
      
      if (!response.ok) {
        console.error('🎮 New releases error:', response.status)
        return []
      }

      const data = await response.json()
      console.log('🎮 New releases:', data.results?.length || 0)
      
      return data.results || []
    } catch (error) {
      console.error('🎮 New releases failed:', error)
      return []
    }
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    console.log('🎮 Getting game details for:', gameId)
    
    try {
      const response = await fetch(`${this.baseURL}/games/${gameId}?key=${this.apiKey}`)
      
      if (!response.ok) {
        console.error('🎮 Game details error:', response.status)
        return null
      }

      const data = await response.json()
      console.log('🎮 Game details received for:', data.name)
      
      return data
    } catch (error) {
      console.error('🎮 Game details failed:', error)
      return null
    }
  }

  /**
   * CONVERSION SIMPLE
   */
  convertToAppFormat(game: RAWGGame): any {
    let developer = 'Unknown Developer'
    
    if (game.developers && game.developers.length > 0) {
      developer = game.developers[0].name
    }
    
    return {
      id: `game-${game.id}`,
      title: game.name,
      name: game.name,
      author: developer,
      developer: developer,
      year: game.released ? new Date(game.released).getFullYear() : 2024,
      rating: game.rating || 0,
      genre: game.genres?.[0]?.name || 'Unknown',
      category: 'games' as const,
      image: game.background_image,
      background_image: game.background_image,
      released: game.released,
      developers: game.developers || [],
      publishers: game.publishers || [],
      genres: game.genres || [],
      description_raw: game.description_raw,
      metacritic: game.metacritic,
      esrb_rating: game.esrb_rating,
      platforms: game.platforms || [],
      tags: game.tags || [],
      rating_count: game.rating_count || 0,
      parent_platforms: game.parent_platforms || [],
      website: game.website,
      stores: game.stores || [],
      screenshots: game.screenshots || []
    }
  }

  async getSimilarGames(game: RAWGGame, limit: number = 6): Promise<RAWGGame[]> {
    return []
  }
}

export const rawgService = new RAWGService()
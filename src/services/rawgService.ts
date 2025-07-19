// src/services/rawgService.ts - VERSION ULTRA-SIMPLE QUI MARCHE
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
   * 🎯 RECHERCHE ULTRA-SIMPLE - JUSTE FAIRE CONFIANCE À L'API
   */
  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    if (!query || query.trim().length < 2) {
      return []
    }

    const cleanQuery = query.trim()
    console.log('🎮 [RAWG] SIMPLE search for:', cleanQuery)

    try {
      // ✅ REQUÊTE LA PLUS SIMPLE POSSIBLE
      const url = `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(cleanQuery)}&page_size=20`
      
      console.log('🎮 [RAWG] URL:', url)

      const response = await fetch(url)

      if (!response.ok) {
        console.error('🎮 [RAWG] HTTP Error:', response.status, response.statusText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: RAWGSearchResponse = await response.json()
      console.log('🎮 [RAWG] Raw API response:', data)

      if (!data.results) {
        console.error('🎮 [RAWG] No results field in response')
        return []
      }

      const games = data.results
      console.log(`🎮 [RAWG] Found ${games.length} games`)

      // ✅ RETOURNER DIRECTEMENT LES RÉSULTATS DE L'API (ELLE SAIT MIEUX)
      games.forEach((game, i) => {
        if (i < 5) { // Log seulement les 5 premiers
          console.log(`  ${i + 1}. ${game.name} (${game.released ? new Date(game.released).getFullYear() : 'N/A'})`)
        }
      })

      return games.slice(0, maxResults)

    } catch (error) {
      console.error('🎮 [RAWG] Search failed:', error)
      
      // ✅ TEST DE CONNECTIVITÉ BASIQUE
      try {
        const testUrl = `${this.baseURL}/games?key=${this.apiKey}&page_size=1`
        const testResponse = await fetch(testUrl)
        
        if (testResponse.ok) {
          console.log('🎮 [RAWG] API is working, search query might be the issue')
        } else {
          console.error('🎮 [RAWG] API is down:', testResponse.status)
        }
      } catch (testError) {
        console.error('🎮 [RAWG] Cannot reach API at all:', testError)
      }
      
      return []
    }
  }

  /**
   * ✅ TEST DE CONNEXION SIMPLE
   */
  async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      console.log('🎮 [RAWG] Testing connection...')
      
      const response = await fetch(`${this.baseURL}/games?key=${this.apiKey}&page_size=1`)
      
      if (!response.ok) {
        return { 
          success: false, 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }
      }
      
      const data = await response.json()
      console.log('🎮 [RAWG] Connection test successful:', data)
      
      return { 
        success: true, 
        message: `Connected! ${data.count || 0} games available` 
      }
    } catch (error) {
      console.error('🎮 [RAWG] Connection test failed:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      }
    }
  }

  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching popular games:', error)
      return []
    }
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-metacritic`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching top rated games:', error)
      return []
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-released`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return []
    }
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    try {
      const response = await fetch(`${this.baseURL}/games/${gameId}?key=${this.apiKey}`)
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching game details:', error)
      return null
    }
  }

  /**
   * ✅ CONVERSION SIMPLE
   */
  convertToAppFormat(game: RAWGGame): any {
    let developer = 'Unknown Developer'
    
    if (game.developers && game.developers.length > 0) {
      developer = game.developers[0].name
    } else if (game.publishers && game.publishers.length > 0) {
      developer = game.publishers[0].name
    }
    
    return {
      id: `game-${game.id}`,
      title: game.name || 'Unknown Game',
      name: game.name || 'Unknown Game',
      author: developer,
      developer: developer,
      year: game.released ? new Date(game.released).getFullYear() : new Date().getFullYear(),
      rating: game.rating ? Number(game.rating.toFixed(1)) : 0,
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
    if (!game.genres || game.genres.length === 0) return []
    
    try {
      const genre = game.genres[0].name
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&genres=${genre}&page_size=${limit + 5}&ordering=-rating`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return (data.results || []).filter(g => g.id !== game.id).slice(0, limit)
    } catch (error) {
      console.error('Error fetching similar games:', error)
      return []
    }
  }
}

// Instance singleton
export const rawgService = new RAWGService()
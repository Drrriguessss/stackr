// src/services/rawgService.ts - VERSION CORRIGÉE AVEC DIAGNOSTIC COMPLET
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
  results: RAWGGame[] // ✅ C'est "results" pas "result" !
}

class RAWGService {
  private readonly apiKey = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  private readonly baseURL = 'https://api.rawg.io/api'
  
  // ✅ TEST DE CONNECTIVITÉ AVEC DIAGNOSTIC COMPLET
  async testConnection(): Promise<{ success: boolean, message: string, data?: any }> {
    try {
      console.log('🔧 [RAWG] Testing API connection...')
      
      const testUrl = `${this.baseURL}/games?key=${this.apiKey}&page_size=1`
      console.log('🔧 [RAWG] Test URL:', testUrl)
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Stackr/1.0'
        }
      })
      
      console.log('🔧 [RAWG] Response status:', response.status)
      console.log('🔧 [RAWG] Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔧 [RAWG] Error response:', errorText)
        return {
          success: false,
          message: `API Error ${response.status}: ${errorText}`
        }
      }
      
      const data = await response.json()
      console.log('🔧 [RAWG] Response data structure:', {
        count: data.count,
        hasResults: !!data.results,
        resultsLength: data.results?.length || 0,
        firstGame: data.results?.[0]?.name || 'N/A'
      })
      
      return {
        success: true,
        message: `API working! Found ${data.count} games total`,
        data: data
      }
      
    } catch (error) {
      console.error('🔧 [RAWG] Connection test failed:', error)
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
  
  // ✅ RECHERCHE AVEC DIAGNOSTIC DÉTAILLÉ
  async searchGames(query: string, pageSize: number = 20): Promise<RAWGGame[]> {
    try {
      console.log('🎮 [RAWG] Starting search for:', query, 'pageSize:', pageSize)
      
      // Test de connectivité d'abord
      const connectionTest = await this.testConnection()
      if (!connectionTest.success) {
        console.error('🎮 [RAWG] Connection test failed:', connectionTest.message)
        throw new Error(`RAWG API unavailable: ${connectionTest.message}`)
      }
      
      console.log('🎮 [RAWG] Connection OK, proceeding with search...')
      
      // URL de recherche
      const searchUrl = `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=${Math.min(pageSize, 40)}&ordering=-released`
      console.log('🎮 [RAWG] Search URL:', searchUrl)
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Stackr/1.0'
        }
      })
      
      console.log('🎮 [RAWG] Search response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🎮 [RAWG] Search error response:', errorText)
        throw new Error(`RAWG Search API Error: ${response.status} - ${errorText}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      console.log('🎮 [RAWG] Search response data:', {
        count: data.count,
        hasResults: !!data.results,
        resultsLength: data.results?.length || 0,
        next: !!data.next,
        previous: !!data.previous
      })
      
      if (!data.results) {
        console.error('🎮 [RAWG] No results array in response:', data)
        throw new Error('RAWG API returned invalid response structure')
      }
      
      if (data.results.length === 0) {
        console.log('🎮 [RAWG] No games found for query:', query)
        return []
      }
      
      // Log des premiers résultats
      console.log('🎮 [RAWG] First 3 results:')
      data.results.slice(0, 3).forEach((game, index) => {
        console.log(`  ${index + 1}. ${game.name} (${game.id}) - ${game.released || 'No date'}`)
      })
      
      return data.results
      
    } catch (error) {
      console.error('🎮 [RAWG] Search failed:', error)
      
      // Tentative de fallback avec des jeux statiques pour le debug
      console.log('🎮 [RAWG] Returning fallback data for debugging...')
      return this.getFallbackGames(query)
    }
  }
  
  // ✅ DONNÉES DE FALLBACK POUR DEBUG
  private getFallbackGames(query: string): RAWGGame[] {
    const fallbackGames: RAWGGame[] = [
      {
        id: 22511,
        name: "Elden Ring",
        background_image: "https://media.rawg.io/media/games/5eb/5eb49eb2fa0738fdb5bacea557b1bc57.jpg",
        rating: 4.8,
        rating_count: 500000,
        released: "2022-02-25",
        platforms: [{ platform: { name: "PlayStation 5" } }],
        developers: [{ name: "FromSoftware" }],
        publishers: [{ name: "Bandai Namco Entertainment" }],
        genres: [{ name: "Action" }, { name: "RPG" }],
        tags: [{ name: "RPG" }, { name: "Action" }]
      },
      {
        id: 41494,
        name: "Cyberpunk 2077",
        background_image: "https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg",
        rating: 4.1,
        rating_count: 300000,
        released: "2020-12-10",
        platforms: [{ platform: { name: "PC" } }],
        developers: [{ name: "CD PROJEKT RED" }],
        publishers: [{ name: "CD PROJEKT RED" }],
        genres: [{ name: "RPG" }, { name: "Adventure" }],
        tags: [{ name: "Cyberpunk" }, { name: "RPG" }]
      },
      {
        id: 3328,
        name: "The Witcher 3: Wild Hunt",
        background_image: "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg",
        rating: 4.9,
        rating_count: 800000,
        released: "2015-05-18",
        platforms: [{ platform: { name: "PC" } }],
        developers: [{ name: "CD PROJEKT RED" }],
        publishers: [{ name: "CD PROJEKT RED" }],
        genres: [{ name: "RPG" }, { name: "Adventure" }],
        tags: [{ name: "Fantasy" }, { name: "RPG" }]
      }
    ]
    
    // Filtrer selon la requête
    const queryLower = query.toLowerCase()
    const filtered = fallbackGames.filter(game => 
      game.name.toLowerCase().includes(queryLower)
    )
    
    console.log('🎮 [RAWG] Fallback filtered results:', filtered.length, 'games')
    return filtered.length > 0 ? filtered : fallbackGames.slice(0, 3)
  }
  
  // ✅ AUTRES MÉTHODES AVEC ERROR HANDLING
  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&dates=2020-01-01,2025-12-31&metacritic=80,100`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching popular games:', error)
      return this.getFallbackGames('popular')
    }
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&metacritic=90,100`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching top rated games:', error)
      return this.getFallbackGames('top rated')
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentDate = new Date()
      const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, currentDate.getDate())
      const sixMonthsLater = new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, currentDate.getDate())
      
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-released&dates=${threeMonthsAgo.toISOString().split('T')[0]},${sixMonthsLater.toISOString().split('T')[0]}`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return this.getFallbackGames('new releases')
    }
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/games/${gameId}?key=${this.apiKey}`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const game: RAWGGame = await response.json()
      return game
    } catch (error) {
      console.error('Error fetching game details:', error)
      return null
    }
  }

  convertToAppFormat(game: RAWGGame): any {
    let developer = 'Unknown Developer'
    let finalDeveloper = 'Unknown Developer'
    
    if (game.developers && game.developers.length > 0) {
      developer = game.developers[0].name
      finalDeveloper = developer
      console.log('🎮 Using primary developer:', developer)
    }
    else if (game.publishers && game.publishers.length > 0) {
      developer = game.publishers[0].name
      finalDeveloper = `${developer} (Publisher)`
      console.log('🎮 Using publisher as developer fallback:', developer)
    }
    
    console.log('🎮 Converting game:', game.name, '→ Developer:', finalDeveloper)
    
    const converted = {
      id: `game-${game.id}`,
      title: game.name || 'Unknown Game',
      name: game.name || 'Unknown Game',
      author: finalDeveloper,
      developer: finalDeveloper,
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
    
    console.log('🎮 Converted result:', {
      title: converted.title,
      developer: converted.developer,
      author: converted.author,
      year: converted.year,
      rating: converted.rating
    })
    
    return converted
  }

  async getSimilarGames(game: RAWGGame, limit: number = 6): Promise<RAWGGame[]> {
    try {
      if (!game.genres || game.genres.length === 0) {
        return []
      }
      
      const genre = game.genres[0].name
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&genres=${genre}&page_size=${limit + 5}&ordering=-rating`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      
      return (data.results || [])
        .filter(g => g.id !== game.id)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching similar games:', error)
      return []
    }
  }

  async getGamesByDeveloper(developerId: number, excludeGameId: number, limit: number = 6): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&developers=${developerId}&page_size=${limit + 5}&ordering=-rating`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      
      return (data.results || [])
        .filter(g => g.id !== excludeGameId)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching games by developer:', error)
      return []
    }
  }
}

export const rawgService = new RAWGService()
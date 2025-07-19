// src/services/rawgService.ts - VERSION CORRIGÉE POUR DÉVELOPPEURS
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
   * ✅ FONCTION CORRIGÉE : Obtenir le vrai développeur
   */
  private getCorrectDeveloper(game: RAWGGame): string {
    console.log('🎮 Getting developer for:', game.name)
    console.log('🎮 Raw developers:', game.developers)
    console.log('🎮 Raw publishers:', game.publishers)

    // 1. Développeur principal de l'API
    if (game.developers && game.developers.length > 0) {
      const mainDev = game.developers[0].name
      if (mainDev && mainDev.trim() !== '' && mainDev !== 'Unknown' && !mainDev.includes('undefined')) {
        console.log('🎮 ✅ Found developer from API:', mainDev)
        return mainDev
      }
    }

    // 2. Publisher en second recours (mais marquer comme tel)
    if (game.publishers && game.publishers.length > 0) {
      const mainPub = game.publishers[0].name
      if (mainPub && mainPub.trim() !== '' && mainPub !== 'Unknown' && !mainPub.includes('undefined')) {
        console.log('🎮 ⚠️ Using publisher as developer:', mainPub)
        return mainPub  // On peut retirer "(Publisher)" pour simplifier
      }
    }

    // 3. Mapping manuel pour les gros studios connus
    const gameNameLower = game.name.toLowerCase()
    const mappings: { [key: string]: string } = {
      "assassin's creed origins": "Ubisoft Montreal",
      "assassin's creed odyssey": "Ubisoft Quebec", 
      "assassin's creed valhalla": "Ubisoft Montreal",
      "assassin's creed": "Ubisoft",
      "monster hunter world": "Capcom",
      "monster hunter rise": "Capcom",
      "monster hunter": "Capcom",
      "call of duty modern warfare": "Infinity Ward",
      "call of duty black ops": "Treyarch",
      "call of duty": "Activision",
      "the witcher 3": "CD Projekt RED",
      "the witcher": "CD Projekt RED",
      "cyberpunk 2077": "CD Projekt RED",
      "cyberpunk": "CD Projekt RED",
      "elder scrolls v": "Bethesda Game Studios",
      "elder scrolls": "Bethesda Game Studios",
      "fallout 4": "Bethesda Game Studios",
      "fallout": "Bethesda Game Studios",
      "halo infinite": "343 Industries",
      "halo": "343 Industries",
      "god of war": "Santa Monica Studio",
      "spider-man": "Insomniac Games",
      "marvel's spider-man": "Insomniac Games",
      "zelda breath of the wild": "Nintendo EPD",
      "zelda tears of the kingdom": "Nintendo EPD", 
      "zelda": "Nintendo",
      "mario": "Nintendo",
      "ori and the will of the wisps": "Moon Studios",
      "ori and the blind forest": "Moon Studios",
      "ori and the": "Moon Studios",
      "the last of us part ii": "Naughty Dog",
      "the last of us": "Naughty Dog",
      "last of us": "Naughty Dog",
      "uncharted": "Naughty Dog",
      "horizon zero dawn": "Guerrilla Games",
      "horizon forbidden west": "Guerrilla Games",
      "horizon": "Guerrilla Games",
      "ghost of tsushima": "Sucker Punch Productions",
      "baldur's gate 3": "Larian Studios",
      "elden ring": "FromSoftware",
      "dark souls": "FromSoftware",
      "sekiro": "FromSoftware",
      "bloodborne": "FromSoftware",
      "grand theft auto v": "Rockstar North",
      "grand theft auto": "Rockstar Games",
      "red dead redemption": "Rockstar Games"
    }

    // Chercher d'abord les correspondances exactes, puis partielles
    for (const [keyword, studio] of Object.entries(mappings)) {
      if (gameNameLower.includes(keyword)) {
        console.log('🎮 📋 Found developer via mapping:', studio, 'for keyword:', keyword)
        return studio
      }
    }

    console.log('🎮 ❌ No developer found, using fallback')
    return "Developer" // ✅ Éviter "Unknown Developer"
  }

  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    console.log('🎮 Enhanced search for:', query)
    
    if (!query || query.length < 2) {
      console.log('🎮 Query too short')
      return []
    }

    try {
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      
      const url = `${this.baseURL}/games?` + new URLSearchParams({
        key: this.apiKey,
        search: query,
        page_size: '20',
        dates: `2000-01-01,${nextYear}-12-31`,
        ordering: '-relevance'
      }).toString()

      console.log('🎮 Enhanced URL with 2025 games:', url)

      const response = await fetch(url)
      console.log('🎮 Response status:', response.status)

      if (!response.ok) {
        console.error('🎮 Response error:', response.status, response.statusText)
        return []
      }

      const data = await response.json()
      console.log('🎮 Raw API response:', data)

      if (!data.results) {
        console.error('🎮 No results in response')
        return []
      }

      console.log('🎮 Found', data.results.length, 'games (including 2025)')
      
      // ✅ Log avec développeurs corrects
      data.results.forEach((game: RAWGGame, index: number) => {
        const developer = this.getCorrectDeveloper(game)
        const year = game.released ? new Date(game.released).getFullYear() : 'TBA'
        console.log(`🎮 ${index + 1}. ${game.name} by ${developer} (${year})`)
      })

      return data.results

    } catch (error) {
      console.error('🎮 Enhanced search error:', error)
      return []
    }
  }

  async searchWithRecentGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    console.log('🎮 Searching with recent games priority for:', query)
    
    const normalResults = await this.searchGames(query, maxResults)
    
    const recentGames = normalResults.filter(game => {
      if (!game.released) return false
      const year = new Date(game.released).getFullYear()
      return year >= 2024
    })

    console.log(`🎮 Found ${recentGames.length} recent games (2024+) in normal search`)

    if (recentGames.length < 2) {
      console.log('🎮 Searching specifically for 2025 games...')
      
      try {
        const recentUrl = `${this.baseURL}/games?` + new URLSearchParams({
          key: this.apiKey,
          search: query,
          page_size: '10',
          dates: '2024-01-01,2026-12-31',
          ordering: '-released'
        }).toString()

        const recentResponse = await fetch(recentUrl)
        
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          console.log(`🎮 Found ${recentData.results?.length || 0} additional recent games`)
          
          if (recentData.results && recentData.results.length > 0) {
            const combinedResults = [...normalResults]
            const existingIds = new Set(normalResults.map(g => g.id))
            
            recentData.results.forEach((game: RAWGGame) => {
              if (!existingIds.has(game.id)) {
                combinedResults.unshift(game)
                console.log(`🎮 ➕ Added recent game: ${game.name} (${game.released ? new Date(game.released).getFullYear() : 'TBA'})`)
              }
            })
            
            return combinedResults.slice(0, maxResults)
          }
        }
      } catch (error) {
        console.warn('🎮 Recent games search failed:', error)
      }
    }

    return normalResults
  }

  async testConnection(): Promise<{ success: boolean, message: string }> {
    console.log('🎮 Testing RAWG API connection...')
    
    try {
      const url = `${this.baseURL}/games?key=${this.apiKey}&page_size=1`
      const response = await fetch(url)
      
      if (!response.ok) {
        return { 
          success: false, 
          message: `API Error ${response.status}: ${response.statusText}` 
        }
      }

      const data = await response.json()
      
      return { 
        success: true, 
        message: `API Working! Found ${data.count || 0} games total` 
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error}` 
      }
    }
  }

  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&ordering=-rating&page_size=8&dates=2020-01-01,2026-12-31`
      )
      
      if (!response.ok) return []

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('🎮 Popular games failed:', error)
      return []
    }
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&ordering=-metacritic&page_size=8&metacritic=80,100`
      )
      
      if (!response.ok) return []

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('🎮 Top rated games failed:', error)
      return []
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentYear = new Date().getFullYear()
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&ordering=-released&page_size=8&dates=${currentYear}-01-01,${currentYear + 1}-12-31`
      )
      
      if (!response.ok) return []

      const data = await response.json()
      console.log(`🎮 New releases: found ${data.results?.length || 0} games for ${currentYear}-${currentYear + 1}`)
      
      return data.results || []
    } catch (error) {
      console.error('🎮 New releases failed:', error)
      return []
    }
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    try {
      const response = await fetch(`${this.baseURL}/games/${gameId}?key=${this.apiKey}`)
      
      if (!response.ok) return null

      const data = await response.json()
      return data
    } catch (error) {
      console.error('🎮 Game details failed:', error)
      return null
    }
  }

  /**
   * ✅ CONVERSION AVEC DÉVELOPPEUR CORRECT
   */
  convertToAppFormat(game: RAWGGame): any {
    const developer = this.getCorrectDeveloper(game)
    
    console.log('🎮 Converting game:', game.name, 'Developer:', developer)
    
    return {
      id: `game-${game.id}`,
      title: game.name,
      name: game.name,
      author: developer,      // ✅ UTILISÉ pour compatibilité
      developer: developer,   // ✅ UTILISÉ spécifiquement pour les jeux
      year: game.released ? new Date(game.released).getFullYear() : new Date().getFullYear(),
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
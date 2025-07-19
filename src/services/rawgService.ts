// src/services/rawgService.ts - CORRIGÉ: Développeurs + Jeux récents 2025
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
   * 🎯 RECHERCHE AMÉLIORÉE avec jeux 2025 inclus
   */
  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    console.log('🎮 Enhanced search for:', query)
    
    if (!query || query.length < 2) {
      console.log('🎮 Query too short')
      return []
    }

    try {
      // ✅ INCLURE LES JEUX 2025 et futurs avec dates étendues
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      
      const url = `${this.baseURL}/games?` + new URLSearchParams({
        key: this.apiKey,
        search: query,
        page_size: '20',
        dates: `2000-01-01,${nextYear}-12-31`, // ✅ Inclure 2025 et futurs
        ordering: '-relevance' // Pertinence d'abord
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

  /**
   * 🛠️ CORRECTION: Obtenir le vrai développeur (pas "Unknown Developer")
   */
  private getCorrectDeveloper(game: RAWGGame): string {
    // ✅ 1. Développeur principal
    if (game.developers && game.developers.length > 0) {
      const mainDev = game.developers[0].name
      if (mainDev && mainDev.trim() !== '') {
        return mainDev
      }
    }

    // ✅ 2. Publisher en second recours
    if (game.publishers && game.publishers.length > 0) {
      const mainPub = game.publishers[0].name
      if (mainPub && mainPub.trim() !== '') {
        return `${mainPub} (Publisher)`
      }
    }

    // ✅ 3. Mapping manuel pour les gros studios connus
    const gameNameLower = game.name.toLowerCase()
    
    if (gameNameLower.includes("assassin's creed")) {
      return "Ubisoft"
    }
    if (gameNameLower.includes("monster hunter")) {
      return "Capcom"
    }
    if (gameNameLower.includes("call of duty")) {
      return "Activision"
    }
    if (gameNameLower.includes("the witcher")) {
      return "CD Projekt RED"
    }
    if (gameNameLower.includes("cyberpunk")) {
      return "CD Projekt RED"
    }
    if (gameNameLower.includes("elder scrolls") || gameNameLower.includes("fallout")) {
      return "Bethesda"
    }

    return "Unknown Developer"
  }

  /**
   * 🔄 RECHERCHE SUPPLÉMENTAIRE pour les jeux récents manqués
   */
  async searchWithRecentGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    console.log('🎮 Searching with recent games priority for:', query)
    
    // ✅ Recherche normale d'abord
    const normalResults = await this.searchGames(query, maxResults)
    
    // ✅ Recherche spécifique pour 2025 si peu de résultats récents
    const recentGames = normalResults.filter(game => {
      if (!game.released) return false
      const year = new Date(game.released).getFullYear()
      return year >= 2024
    })

    console.log(`🎮 Found ${recentGames.length} recent games (2024+) in normal search`)

    // Si pas assez de jeux récents, faire une recherche spécifique 2025
    if (recentGames.length < 2) {
      console.log('🎮 Searching specifically for 2025 games...')
      
      try {
        const recentUrl = `${this.baseURL}/games?` + new URLSearchParams({
          key: this.apiKey,
          search: query,
          page_size: '10',
          dates: '2024-01-01,2026-12-31', // ✅ Focus sur 2024-2026
          ordering: '-released' // Plus récents d'abord
        }).toString()

        const recentResponse = await fetch(recentUrl)
        
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          console.log(`🎮 Found ${recentData.results?.length || 0} additional recent games`)
          
          if (recentData.results && recentData.results.length > 0) {
            // ✅ Combiner et dédupliquer
            const combinedResults = [...normalResults]
            const existingIds = new Set(normalResults.map(g => g.id))
            
            recentData.results.forEach((game: RAWGGame) => {
              if (!existingIds.has(game.id)) {
                combinedResults.unshift(game) // Ajouter au début
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
      // ✅ Inclure les jeux récents dans les populaires
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
      // ✅ Nouvelles sorties incluant 2025
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
   * ✅ CONVERSION avec développeur correct
   */
  convertToAppFormat(game: RAWGGame): any {
    const developer = this.getCorrectDeveloper(game)
    
    return {
      id: `game-${game.id}`,
      title: game.name,
      name: game.name,
      author: developer,
      developer: developer,
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

// ✅ UTILISER LA MÉTHODE AMÉLIORÉE DANS SearchModal
// Dans SearchModal.tsx, remplacer :
// const games = await rawgService.searchGames(query, 20)
// Par :
// const games = await rawgService.searchWithRecentGames(query, 20)
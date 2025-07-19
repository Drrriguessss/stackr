// src/services/rawgService.ts - VERSION SIMPLIFIÉE COMME LES AUTRES SERVICES
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
   * 🎯 RECHERCHE SIMPLIFIÉE - UN SEUL APPEL API COMME LES AUTRES SERVICES
   */
  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    if (!query || query.trim().length < 2) {
      return []
    }

    const cleanQuery = query.trim()
    console.log('🎮 [RAWG] Simple search for:', cleanQuery)

    try {
      // ✅ UN SEUL APPEL API - comme OMDB, Books et Music
      const url = `${this.baseURL}/games?` + new URLSearchParams({
        key: this.apiKey,
        search: cleanQuery,
        page_size: Math.min(maxResults * 2, 40).toString(), // Un peu plus pour avoir du choix
        ordering: '-relevance,-released' // Pertinence puis récence
      }).toString()

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Stackr/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data: RAWGSearchResponse = await response.json()
      const games = data.results || []

      console.log(`🎮 [RAWG] API returned ${games.length} games`)

      if (games.length === 0) {
        return []
      }

      // ✅ FILTRAGE MINIMAL - juste éliminer les résultats vraiment non pertinents
      const filteredGames = games.filter(game => this.isBasicRelevant(game, cleanQuery))
      
      // ✅ TRI SIMPLE mais efficace - comme les autres services
      const sortedGames = this.simpleSortByRelevance(filteredGames, cleanQuery)

      console.log(`🎮 [RAWG] Final results: ${sortedGames.length} games`)
      
      // Log des premiers résultats pour debug avec années détaillées
      sortedGames.slice(0, 8).forEach((game, i) => {
        const year = game.released ? new Date(game.released).getFullYear() : 0
        const recencyIcon = year >= 2024 ? '🔥' : year >= 2023 ? '⭐' : year >= 2020 ? '📅' : year >= 2015 ? '🕰️' : '📜'
        const monthDay = game.released ? new Date(game.released).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
        console.log(`  ${i + 1}. ${game.name} (${year} ${monthDay}) ${recencyIcon}`)
      })

      return sortedGames.slice(0, maxResults)

    } catch (error) {
      console.error('🎮 [RAWG] Search failed:', error)
      return this.getFallbackResults(cleanQuery, maxResults)
    }
  }

  /**
   * ✅ FILTRAGE MINIMAL - juste éliminer les vrais hors-sujet
   */
  private isBasicRelevant(game: RAWGGame, query: string): boolean {
    const gameName = game.name.toLowerCase()
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2)

    // Très permissif - juste éliminer les vraiment hors-sujet
    
    // Si le titre contient la requête complète
    if (gameName.includes(queryLower)) return true
    
    // Si le titre contient au moins un mot important de la requête
    if (queryWords.some(word => gameName.includes(word))) return true
    
    // Si c'est une recherche courte et qu'il y a une correspondance partielle
    if (query.length <= 5 && gameName.includes(queryLower.substring(0, 3))) return true

    return false
  }

  /**
   * ✅ TRI SIMPLE - comme OMDB et les autres services
   */
  private simpleSortByRelevance(games: RAWGGame[], query: string): RAWGGame[] {
    const queryLower = query.toLowerCase()
    const currentYear = new Date().getFullYear()

    return games.sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aYear = a.released ? new Date(a.released).getFullYear() : 0
      const bYear = b.released ? new Date(b.released).getFullYear() : 0

      // 1. Correspondance exacte en premier
      const aExact = aName === queryLower
      const bExact = bName === queryLower
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // 2. Commence par la requête
      const aStarts = aName.startsWith(queryLower)
      const bStarts = bName.startsWith(queryLower)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      // 3. Contient la requête complète
      const aContains = aName.includes(queryLower)
      const bContains = bName.includes(queryLower)
      if (aContains && !bContains) return -1
      if (!aContains && bContains) return 1

      // 4. Pour les matchs équivalents, prioriser par récence GRADUÉE
      if ((aContains && bContains) || (aStarts && bStarts)) {
        // ✅ BONUS RÉCENCE GRADUÉ pour prioriser les jeux 2024-2025
        const getRecencyBonus = (year: number) => {
          if (year >= 2024) return 10 // 🔥 MAXIMUM pour 2024-2025
          if (year >= 2023) return 8  // ⭐ FORT pour 2023  
          if (year >= 2020) return 5  // 📅 MODÉRÉ pour 2020-2022
          if (year >= 2015) return 2  // 🕰️ LÉGER pour 2015-2019
          return 0 // Pas de bonus pour plus ancien
        }
        
        const aBonus = getRecencyBonus(aYear)
        const bBonus = getRecencyBonus(bYear)
        
        if (aBonus !== bBonus) return bBonus - aBonus
        
        // Si même bonus, trier par année exacte (plus récent = premier)
        if (aYear !== bYear) return bYear - aYear
      }

      // 5. Sinon par rating
      return (b.rating || 0) - (a.rating || 0)
    })
  }

  /**
   * ✅ FALLBACK SIMPLE avec jeux populaires récents
   */
  private getFallbackResults(query: string, maxResults: number): RAWGGame[] {
    const fallbackGames: RAWGGame[] = [
      {
        id: 326243,
        name: "The Legend of Zelda: Tears of the Kingdom",
        background_image: "https://media.rawg.io/media/games/8d9/8d92b2b6b28c5497f7a52049e6d0e95d.jpg",
        rating: 4.9, rating_count: 300000, released: "2023-05-12",
        platforms: [{ platform: { name: "Nintendo Switch" } }],
        developers: [{ name: "Nintendo EPD" }], publishers: [{ name: "Nintendo" }],
        genres: [{ name: "Adventure" }], tags: [{ name: "Open World" }]
      },
      {
        id: 422,
        name: "Baldur's Gate 3", 
        background_image: "https://media.rawg.io/media/games/699/69993db1cfcaf895c8b22603ee1aae62.jpg",
        rating: 4.9, rating_count: 400000, released: "2023-08-03",
        platforms: [{ platform: { name: "PC" } }],
        developers: [{ name: "Larian Studios" }], publishers: [{ name: "Larian Studios" }],
        genres: [{ name: "RPG" }], tags: [{ name: "RPG" }]
      },
      {
        id: 622492,
        name: "Marvel's Spider-Man 2",
        background_image: "https://media.rawg.io/media/games/709/709bf81f874ce5d25d625b37b014cb63.jpg", 
        rating: 4.6, rating_count: 200000, released: "2023-10-20",
        platforms: [{ platform: { name: "PlayStation 5" } }],
        developers: [{ name: "Insomniac Games" }], publishers: [{ name: "Sony Interactive Entertainment" }],
        genres: [{ name: "Action" }], tags: [{ name: "Superhero" }]
      },
      {
        id: 22511,
        name: "Elden Ring",
        background_image: "https://media.rawg.io/media/games/5eb/5eb49eb2fa0738fdb5bacea557b1bc57.jpg",
        rating: 4.8, rating_count: 500000, released: "2022-02-25",
        platforms: [{ platform: { name: "PlayStation 5" } }],
        developers: [{ name: "FromSoftware" }], publishers: [{ name: "Bandai Namco Entertainment" }],
        genres: [{ name: "Action" }], tags: [{ name: "RPG" }]
      },
      {
        id: 58175,
        name: "God of War",
        background_image: "https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg",
        rating: 4.7, rating_count: 400000, released: "2018-04-20",
        platforms: [{ platform: { name: "PlayStation 4" } }],
        developers: [{ name: "Santa Monica Studio" }], publishers: [{ name: "Sony Interactive Entertainment" }],
        genres: [{ name: "Action" }], tags: [{ name: "Action" }]
      }
    ]

    const queryLower = query.toLowerCase()
    const matching = fallbackGames.filter(game => 
      game.name.toLowerCase().includes(queryLower)
    )

    return matching.length > 0 ? matching.slice(0, maxResults) : fallbackGames.slice(0, maxResults)
  }

  /**
   * ✅ MÉTHODES CONSERVÉES POUR COMPATIBILITÉ
   */
  async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/games?key=${this.apiKey}&page_size=1`)
      if (!response.ok) return { success: false, message: `API Error ${response.status}` }
      const data = await response.json()
      return { success: true, message: `Connected! ${data.count || 0} games available` }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' }
    }
  }

  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating,-released&dates=2020-01-01,2025-12-31`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching popular games:', error)
      return this.getFallbackResults('popular', 20)
    }
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-metacritic,-rating`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching top rated games:', error)
      return this.getFallbackResults('top rated', 20)
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentYear = new Date().getFullYear()
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-released&dates=${currentYear}-01-01,${currentYear + 1}-12-31`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return this.getFallbackResults('new releases', 20)
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
   * ✅ CONVERSION SIMPLIFIÉE
   */
  convertToAppFormat(game: RAWGGame): any {
    let developer = 'Unknown Developer'
    
    if (game.developers && game.developers.length > 0) {
      developer = game.developers[0].name
    } else if (game.publishers && game.publishers.length > 0) {
      developer = `${game.publishers[0].name} (Publisher)`
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
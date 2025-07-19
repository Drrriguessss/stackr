// src/services/rawgService.ts - VERSION OPTIMISÉE POUR LA PERTINENCE
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
   * 🎯 RECHERCHE ULTRA-OPTIMISÉE POUR LA PERTINENCE
   */
  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    if (!query || query.trim().length < 2) {
      return []
    }

    const cleanQuery = query.trim()
    console.log('🎮 [RAWG] RELEVANCE-FIRST search for:', cleanQuery)

    try {
      // ✅ RECHERCHE AVEC PLUS DE RÉSULTATS POUR MIEUX FILTRER
      const url = `${this.baseURL}/games?` + new URLSearchParams({
        key: this.apiKey,
        search: cleanQuery,
        page_size: '40', // Plus de résultats pour une meilleure sélection
        ordering: '-relevance' // Laisser l'API faire le travail initial
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

      // ✅ SCORE DE PERTINENCE ULTRA-PRÉCIS
      const scoredGames = games.map(game => {
        const score = this.calculateRelevanceScore(game, cleanQuery)
        return { ...game, relevanceScore: score }
      })

      // ✅ TRI PAR SCORE DE PERTINENCE UNIQUEMENT
      const sortedGames = scoredGames
        .filter(game => game.relevanceScore > 0) // Éliminer les non-pertinents
        .sort((a, b) => b.relevanceScore - a.relevanceScore) // Score décroissant

      console.log('🎯 [RAWG] Top results by relevance:')
      sortedGames.slice(0, 8).forEach((game, i) => {
        console.log(`  ${i + 1}. ${game.name} (Score: ${game.relevanceScore})`)
      })

      return sortedGames.slice(0, maxResults)

    } catch (error) {
      console.error('🎮 [RAWG] Search failed:', error)
      return this.getFallbackResults(cleanQuery, maxResults)
    }
  }

  /**
   * 🎯 CALCUL DU SCORE DE PERTINENCE ULTRA-PRÉCIS
   */
  private calculateRelevanceScore(game: RAWGGame, query: string): number {
    const queryLower = query.toLowerCase().trim()
    const gameName = game.name.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1)
    
    let score = 0

    // 🔥 CORRESPONDANCE EXACTE = 1000 points (priorité absolue)
    if (gameName === queryLower) {
      score += 1000
      console.log(`🔥 EXACT MATCH: ${game.name} (+1000)`)
      return score // Retour immédiat pour les correspondances exactes
    }

    // 🎯 CORRESPONDANCE DÉBUT DE TITRE = 500 points
    if (gameName.startsWith(queryLower)) {
      score += 500
      console.log(`🎯 STARTS WITH: ${game.name} (+500)`)
    }

    // 📍 SÉQUENCE COMPLÈTE DANS LE TITRE = 300 points
    if (gameName.includes(queryLower)) {
      score += 300
      console.log(`📍 SEQUENCE MATCH: ${game.name} (+300)`)
    }

    // 🔤 CORRESPONDANCE DE TOUS LES MOTS-CLÉS = 200 points
    if (queryWords.length > 1) {
      const allWordsMatch = queryWords.every(word => gameName.includes(word))
      if (allWordsMatch) {
        score += 200
        console.log(`🔤 ALL WORDS: ${game.name} (+200)`)
      }
    }

    // 📝 CORRESPONDANCE PARTIELLE DES MOTS = 50 points par mot
    queryWords.forEach(word => {
      if (gameName.includes(word)) {
        score += 50
        console.log(`📝 WORD MATCH "${word}": ${game.name} (+50)`)
      }
    })

    // 🏢 CORRESPONDANCE DÉVELOPPEUR = 100 points
    if (game.developers?.length > 0) {
      const developerNames = game.developers.map(dev => dev.name.toLowerCase())
      queryWords.forEach(word => {
        if (developerNames.some(dev => dev.includes(word))) {
          score += 100
          console.log(`🏢 DEVELOPER MATCH "${word}": ${game.name} (+100)`)
        }
      })
    }

    // 🎮 CORRESPONDANCE GENRE = 30 points
    if (game.genres?.length > 0) {
      const genreNames = game.genres.map(genre => genre.name.toLowerCase())
      queryWords.forEach(word => {
        if (genreNames.some(genre => genre.includes(word))) {
          score += 30
          console.log(`🎮 GENRE MATCH "${word}": ${game.name} (+30)`)
        }
      })
    }

    // ⭐ BONUS QUALITÉ (rating élevé) = jusqu'à 50 points
    if (game.rating && game.rating_count > 10) {
      const qualityBonus = Math.min(50, Math.round(game.rating * 10))
      score += qualityBonus
      console.log(`⭐ QUALITY BONUS: ${game.name} (+${qualityBonus} for rating ${game.rating})`)
    }

    // 📅 BONUS RÉCENCE (jeux récents) = jusqu'à 30 points
    if (game.released) {
      const gameYear = new Date(game.released).getFullYear()
      const currentYear = new Date().getFullYear()
      if (gameYear >= currentYear - 1) { // Dernière année
        score += 30
        console.log(`📅 RECENT BONUS: ${game.name} (+30 for year ${gameYear})`)
      } else if (gameYear >= currentYear - 3) { // 3 dernières années
        score += 15
        console.log(`📅 MODERN BONUS: ${game.name} (+15 for year ${gameYear})`)
      }
    }

    // 🔢 MINIMUM SCORE POUR ÊTRE CONSIDÉRÉ
    if (score < 50 && !gameName.includes(queryWords[0])) {
      score = 0 // Éliminer les résultats non pertinents
    }

    console.log(`📊 FINAL SCORE for "${game.name}": ${score}`)
    return score
  }

  /**
   * ✅ VALIDATION ULTRA-MINIMALE
   */
  private isValidGame(game: RAWGGame): boolean {
    return !!(game.id && game.name && game.name.trim().length > 0)
  }

  /**
   * ✅ FALLBACK avec jeux populaires récents
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
      },
      {
        id: 41494,
        name: "Cyberpunk 2077",
        background_image: "https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg",
        rating: 4.1, rating_count: 400000, released: "2020-12-10",
        platforms: [{ platform: { name: "PC" } }],
        developers: [{ name: "CD PROJEKT RED" }], publishers: [{ name: "CD PROJEKT RED" }],
        genres: [{ name: "RPG" }], tags: [{ name: "RPG" }]
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
// src/services/rawgService.ts - VERSION OPTIMISÉE ET RECONSTITUÉE
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

interface SearchFilters {
  includeRecent?: boolean
  minYear?: number
  maxResults?: number
  ordering?: string
}

class RAWGService {
  private readonly apiKey = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  private readonly baseURL = 'https://api.rawg.io/api'
  
  // Cache pour éviter les requêtes répétées
  private searchCache = new Map<string, RAWGGame[]>()
  private cacheExpiry = new Map<string, number>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Test de connectivité simple
   */
  async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/games?key=${this.apiKey}&page_size=1`)
      
      if (!response.ok) {
        return { success: false, message: `API Error ${response.status}` }
      }
      
      const data = await response.json()
      return { 
        success: true, 
        message: `Connected! ${data.count || 0} games available` 
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      }
    }
  }

  /**
   * Recherche principale optimisée pour la pertinence et les jeux récents
   */
  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    if (!query || query.trim().length < 2) {
      return []
    }

    const cleanQuery = query.trim()
    const cacheKey = `search_${cleanQuery.toLowerCase()}`
    
    // Vérifier le cache
    if (this.isCacheValid(cacheKey)) {
      console.log('🎮 [RAWG] Using cached results for:', cleanQuery)
      return this.searchCache.get(cacheKey)!.slice(0, maxResults)
    }

    console.log('🎮 [RAWG] Searching games for:', cleanQuery)

    try {
      // Stratégie de recherche multi-étapes pour maximiser la pertinence
      const allResults = await this.performMultiStageSearch(cleanQuery)
      
      // Filtrer et trier pour optimiser la pertinence
      const filteredResults = this.filterAndSortResults(allResults, cleanQuery)
      
      // Mettre en cache
      this.cacheResults(cacheKey, filteredResults)
      
      console.log(`🎮 [RAWG] Found ${filteredResults.length} relevant games`)
      return filteredResults.slice(0, maxResults)
      
    } catch (error) {
      console.error('🎮 [RAWG] Search failed:', error)
      return this.getFallbackResults(cleanQuery)
    }
  }

  /**
   * Recherche multi-étapes pour capturer tous les résultats pertinents
   */
  private async performMultiStageSearch(query: string): Promise<RAWGGame[]> {
    const allResults: RAWGGame[] = []
    const seenIds = new Set<number>()

    // Étape 1: Recherche directe avec tri par pertinence
    const directResults = await this.fetchGamesFromAPI(query, {
      ordering: '-relevance,-released',
      maxResults: 30
    })
    
    this.addUniqueResults(allResults, directResults, seenIds)

    // Étape 2: Recherche avec tri par date (pour les jeux récents)
    const recentResults = await this.fetchGamesFromAPI(query, {
      ordering: '-released,-rating',
      minYear: 2020,
      maxResults: 20
    })
    
    this.addUniqueResults(allResults, recentResults, seenIds)

    // Étape 3: Recherche avec tri par rating (pour les classiques pertinents)
    const topResults = await this.fetchGamesFromAPI(query, {
      ordering: '-rating,-released',
      maxResults: 15
    })
    
    this.addUniqueResults(allResults, topResults, seenIds)

    console.log(`🎮 [RAWG] Multi-stage search collected ${allResults.length} unique games`)
    return allResults
  }

  /**
   * Requête API avec paramètres configurables
   */
  private async fetchGamesFromAPI(query: string, filters: SearchFilters = {}): Promise<RAWGGame[]> {
    const params = new URLSearchParams({
      key: this.apiKey,
      search: query,
      page_size: (filters.maxResults || 20).toString(),
      ordering: filters.ordering || '-relevance'
    })

    if (filters.minYear) {
      const endYear = new Date().getFullYear() + 1
      params.append('dates', `${filters.minYear}-01-01,${endYear}-12-31`)
    }

    const url = `${this.baseURL}/games?${params.toString()}`
    
    try {
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
      return data.results || []
      
    } catch (error) {
      console.warn(`🎮 [RAWG] API request failed for query "${query}":`, error)
      return []
    }
  }

  /**
   * Ajouter des résultats uniques à la collection
   */
  private addUniqueResults(collection: RAWGGame[], newResults: RAWGGame[], seenIds: Set<number>) {
    for (const result of newResults) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id)
        collection.push(result)
      }
    }
  }

  /**
   * Filtrage intelligent et tri par pertinence
   */
  private filterAndSortResults(results: RAWGGame[], query: string): RAWGGame[] {
    const queryLower = query.toLowerCase().trim()
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1)
    const currentYear = new Date().getFullYear()

    // Filtrer les résultats pertinents
    const relevantResults = results.filter(game => {
      return this.isGameRelevant(game, queryLower, queryWords)
    })

    // Trier par pertinence et récence
    relevantResults.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, queryLower, queryWords, currentYear)
      const scoreB = this.calculateRelevanceScore(b, queryLower, queryWords, currentYear)
      
      return scoreB - scoreA // Score décroissant
    })

    console.log(`🎮 [RAWG] Filtered ${results.length} → ${relevantResults.length} relevant games`)
    
    // Log des top 5 pour debug
    relevantResults.slice(0, 5).forEach((game, i) => {
      const year = game.released ? new Date(game.released).getFullYear() : 0
      const isRecent = year >= 2023 ? '🔥' : year >= 2020 ? '⭐' : ''
      console.log(`  ${i + 1}. ${game.name} (${year}) ${isRecent}`)
    })

    return relevantResults
  }

  /**
   * Vérifier si un jeu est pertinent pour la requête
   */
  private isGameRelevant(game: RAWGGame, queryLower: string, queryWords: string[]): boolean {
    const gameName = game.name.toLowerCase()
    const developers = game.developers?.map(d => d.name.toLowerCase()) || []
    const publishers = game.publishers?.map(p => p.name.toLowerCase()) || []

    // Correspondance exacte
    if (gameName === queryLower) return true

    // Le titre contient la requête complète
    if (gameName.includes(queryLower)) return true

    // Le titre commence par la requête
    if (gameName.startsWith(queryLower)) return true

    // Tous les mots de la requête sont dans le titre
    if (queryWords.length > 1) {
      const allWordsInTitle = queryWords.every(word => gameName.includes(word))
      if (allWordsInTitle) return true
    }

    // Majorité des mots présents (pour les requêtes longues)
    if (queryWords.length > 2) {
      const wordsInTitle = queryWords.filter(word => gameName.includes(word))
      if (wordsInTitle.length >= Math.ceil(queryWords.length * 0.6)) return true
    }

    // Match développeur/éditeur avec au moins un mot du titre
    const hasCreatorMatch = queryWords.some(word => 
      developers.some(dev => dev.includes(word)) ||
      publishers.some(pub => pub.includes(word))
    )
    const hasPartialTitleMatch = queryWords.some(word => gameName.includes(word))
    
    if (hasCreatorMatch && hasPartialTitleMatch) return true

    return false
  }

  /**
   * Calculer un score de pertinence pour le tri
   */
  private calculateRelevanceScore(game: RAWGGame, queryLower: string, queryWords: string[], currentYear: number): number {
    const gameName = game.name.toLowerCase()
    const releaseYear = game.released ? new Date(game.released).getFullYear() : 0
    
    let score = 0

    // Correspondance exacte (score max)
    if (gameName === queryLower) {
      score += 1000
    }
    // Correspondance de séquence complète
    else if (gameName.includes(queryLower)) {
      score += 800
    }
    // Commence par la requête
    else if (gameName.startsWith(queryLower)) {
      score += 700
    }
    // Tous les mots présents
    else if (queryWords.length > 1 && queryWords.every(word => gameName.includes(word))) {
      score += 600
    }
    // Majorité des mots présents
    else {
      const wordsInTitle = queryWords.filter(word => gameName.includes(word))
      score += (wordsInTitle.length / queryWords.length) * 400
    }

    // Bonus pour les jeux récents (2023+)
    if (releaseYear >= 2023) {
      score += 200
    } else if (releaseYear >= 2020) {
      score += 100
    } else if (releaseYear >= 2015) {
      score += 50
    }

    // Bonus pour le rating
    if (game.rating >= 4.0) {
      score += 50
    } else if (game.rating >= 3.5) {
      score += 25
    }

    // Bonus pour la popularité
    if (game.rating_count >= 1000) {
      score += 30
    } else if (game.rating_count >= 100) {
      score += 15
    }

    return score
  }

  /**
   * Gestion du cache
   */
  private isCacheValid(key: string): boolean {
    if (!this.searchCache.has(key)) return false
    
    const expiry = this.cacheExpiry.get(key)
    if (!expiry || Date.now() > expiry) {
      this.searchCache.delete(key)
      this.cacheExpiry.delete(key)
      return false
    }
    
    return true
  }

  private cacheResults(key: string, results: RAWGGame[]) {
    this.searchCache.set(key, results)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION)
  }

  /**
   * Résultats de fallback en cas d'erreur
   */
  private getFallbackResults(query: string): RAWGGame[] {
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
        id: 622492,
        name: "Marvel's Spider-Man 2",
        background_image: "https://media.rawg.io/media/games/709/709bf81f874ce5d25d625b37b014cb63.jpg",
        rating: 4.6,
        rating_count: 200000,
        released: "2023-10-20",
        platforms: [{ platform: { name: "PlayStation 5" } }],
        developers: [{ name: "Insomniac Games" }],
        publishers: [{ name: "Sony Interactive Entertainment" }],
        genres: [{ name: "Action" }, { name: "Adventure" }],
        tags: [{ name: "Superhero" }, { name: "Action" }]
      },
      {
        id: 422,
        name: "Baldur's Gate 3",
        background_image: "https://media.rawg.io/media/games/699/69993db1cfcaf895c8b22603ee1aae62.jpg",
        rating: 4.9,
        rating_count: 400000,
        released: "2023-08-03",
        platforms: [{ platform: { name: "PC" } }],
        developers: [{ name: "Larian Studios" }],
        publishers: [{ name: "Larian Studios" }],
        genres: [{ name: "RPG" }, { name: "Strategy" }],
        tags: [{ name: "RPG" }, { name: "Turn-Based Combat" }]
      },
      {
        id: 326243,
        name: "The Legend of Zelda: Tears of the Kingdom",
        background_image: "https://media.rawg.io/media/games/8d9/8d92b2b6b28c5497f7a52049e6d0e95d.jpg",
        rating: 4.9,
        rating_count: 300000,
        released: "2023-05-12",
        platforms: [{ platform: { name: "Nintendo Switch" } }],
        developers: [{ name: "Nintendo EPD" }],
        publishers: [{ name: "Nintendo" }],
        genres: [{ name: "Adventure" }, { name: "Puzzle" }],
        tags: [{ name: "Open World" }, { name: "Adventure" }]
      }
    ]

    const queryLower = query.toLowerCase()
    return fallbackGames.filter(game => 
      game.name.toLowerCase().includes(queryLower)
    )
  }

  /**
   * Méthodes existantes conservées
   */
  async getPopularGames(): Promise<RAWGGame[]> {
    return this.fetchGamesFromAPI('', {
      ordering: '-rating,-released',
      minYear: 2020,
      maxResults: 20
    })
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    return this.fetchGamesFromAPI('', {
      ordering: '-metacritic,-rating',
      maxResults: 20
    })
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    const currentYear = new Date().getFullYear()
    return this.fetchGamesFromAPI('', {
      ordering: '-released',
      minYear: currentYear,
      maxResults: 20
    })
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    try {
      const response = await fetch(`${this.baseURL}/games/${gameId}?key=${this.apiKey}`)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching game details:', error)
      return null
    }
  }

  /**
   * Conversion vers le format de l'app avec gestion améliorée des développeurs
   */
  convertToAppFormat(game: RAWGGame): any {
    let developer = 'Unknown Developer'
    
    // Prioriser les développeurs, puis les éditeurs
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
    if (!game.genres || game.genres.length === 0) {
      return []
    }
    
    const genre = game.genres[0].name
    const results = await this.fetchGamesFromAPI(genre, {
      ordering: '-rating',
      maxResults: limit + 5
    })
    
    return results.filter(g => g.id !== game.id).slice(0, limit)
  }
}

// Instance singleton
export const rawgService = new RAWGService()
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
      
      // 📱 LOG SPÉCIAL MOBILE pour debug
      if (filteredResults.length > 0) {
        console.log('🎮 [RAWG] Top 5 results for mobile:')
        filteredResults.slice(0, 5).forEach((game, i) => {
          const year = game.released ? new Date(game.released).getFullYear() : 0
          const relevanceIndicator = game.name.toLowerCase().includes(cleanQuery.toLowerCase()) ? '🎯' : ''
          const recentIndicator = year >= 2023 ? '🔥' : year >= 2020 ? '⭐' : ''
          console.log(`  ${i + 1}. ${game.name} (${year}) ${relevanceIndicator}${recentIndicator}`)
        })
      }
      
      return filteredResults.slice(0, maxResults)
      
    } catch (error) {
      console.error('🎮 [RAWG] Search failed:', error)
      return this.getFallbackResults(cleanQuery)
    }
  }

  /**
   * Recherche multi-étapes pour capturer TOUS les résultats pertinents
   */
  private async performMultiStageSearch(query: string): Promise<RAWGGame[]> {
    const allResults: RAWGGame[] = []
    const seenIds = new Set<number>()

    console.log('🎮 [RAWG] Starting comprehensive multi-stage search for:', query)

    // Étape 1: Recherche large par pertinence (plus de résultats)
    const directResults = await this.fetchGamesFromAPI(query, {
      ordering: '-relevance,-released',
      maxResults: 40 // Augmenté de 30 → 40
    })
    this.addUniqueResults(allResults, directResults, seenIds)
    console.log(`🎮 [RAWG] Stage 1 (relevance): ${directResults.length} games`)

    // Étape 2: Recherche par date récente (tous les jeux récents)
    const recentResults = await this.fetchGamesFromAPI(query, {
      ordering: '-released,-rating',
      minYear: 2018, // Élargi de 2020 → 2018
      maxResults: 30 // Augmenté de 20 → 30
    })
    this.addUniqueResults(allResults, recentResults, seenIds)
    console.log(`🎮 [RAWG] Stage 2 (recent): ${recentResults.length} games`)

    // Étape 3: Recherche par popularité/rating
    const popularResults = await this.fetchGamesFromAPI(query, {
      ordering: '-rating,-metacritic',
      maxResults: 25 // Augmenté de 15 → 25
    })
    this.addUniqueResults(allResults, popularResults, seenIds)
    console.log(`🎮 [RAWG] Stage 3 (popular): ${popularResults.length} games`)

    // Étape 4: NOUVELLE - Recherche élargie avec mots-clés partiels
    if (query.length > 5) {
      const partialResults = await this.fetchGamesFromAPI(query.split(' ')[0], {
        ordering: '-rating,-released',
        maxResults: 20
      })
      this.addUniqueResults(allResults, partialResults, seenIds)
      console.log(`🎮 [RAWG] Stage 4 (partial): ${partialResults.length} games`)
    }

    // Étape 5: NOUVELLE - Recherche par franchise si détectée
    const franchiseQuery = this.detectFranchise(query)
    if (franchiseQuery && franchiseQuery !== query) {
      const franchiseResults = await this.fetchGamesFromAPI(franchiseQuery, {
        ordering: '-released,-rating',
        maxResults: 15
      })
      this.addUniqueResults(allResults, franchiseResults, seenIds)
      console.log(`🎮 [RAWG] Stage 5 (franchise "${franchiseQuery}"): ${franchiseResults.length} games`)
    }

    console.log(`🎮 [RAWG] Total unique games collected: ${allResults.length}`)
    return allResults
  }

  /**
   * Détecter les franchises principales pour une recherche élargie
   */
  private detectFranchise(query: string): string | null {
    const queryLower = query.toLowerCase()
    
    const franchises: Record<string, string> = {
      'assassin': 'assassin\'s creed',
      'call of duty': 'call of duty',
      'cod': 'call of duty',
      'battlefield': 'battlefield',
      'elder scrolls': 'elder scrolls',
      'skyrim': 'elder scrolls',
      'fallout': 'fallout',
      'witcher': 'witcher',
      'cyberpunk': 'cyberpunk',
      'grand theft': 'grand theft auto',
      'gta': 'grand theft auto',
      'fifa': 'fifa',
      'madden': 'madden',
      'spider': 'spider-man',
      'spiderman': 'spider-man',
      'batman': 'batman',
      'zelda': 'zelda',
      'mario': 'mario',
      'pokemon': 'pokemon',
      'halo': 'halo',
      'god of war': 'god of war',
      'uncharted': 'uncharted',
      'final fantasy': 'final fantasy',
      'resident evil': 'resident evil',
      'tekken': 'tekken',
      'street fighter': 'street fighter',
      'mortal kombat': 'mortal kombat'
    }

    for (const [key, franchise] of Object.entries(franchises)) {
      if (queryLower.includes(key) && queryLower !== franchise) {
        return franchise
      }
    }

    return null
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
   * Filtrage intelligent et tri par pertinence (VERSION INCLUSIVE)
   */
  private filterAndSortResults(results: RAWGGame[], query: string): RAWGGame[] {
    const queryLower = query.toLowerCase().trim()
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1)
    const currentYear = new Date().getFullYear()

    console.log(`🎮 [RAWG] Filtering ${results.length} games with query: "${queryLower}"`)

    // ✅ FILTRAGE MOINS STRICT - Laisser passer plus de jeux
    const relevantResults = results.filter(game => {
      const isRelevant = this.isGameRelevant(game, queryLower, queryWords)
      if (!isRelevant) {
        // Log seulement quelques rejets pour éviter le spam
        if (Math.random() < 0.1) {
          console.log(`🎮 [RAWG] Filtered out: ${game.name}`)
        }
      }
      return isRelevant
    })

    console.log(`🎮 [RAWG] After filtering: ${relevantResults.length} relevant games`)

    // ✅ TRI PAR SCORE DE PERTINENCE
    relevantResults.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, queryLower, queryWords, currentYear)
      const scoreB = this.calculateRelevanceScore(b, queryLower, queryWords, currentYear)
      
      return scoreB - scoreA // Score décroissant
    })

    // ✅ LOG DÉTAILLÉ DES RÉSULTATS POUR DEBUG MOBILE
    console.log('🎮 [RAWG] Top 10 sorted results:')
    relevantResults.slice(0, 10).forEach((game, i) => {
      const year = game.released ? new Date(game.released).getFullYear() : 0
      const score = this.calculateRelevanceScore(game, queryLower, queryWords, currentYear)
      const relevanceIcon = game.name.toLowerCase().includes(queryLower) ? '🎯' : '📍'
      const recentIcon = year >= 2023 ? '🔥' : year >= 2020 ? '⭐' : year >= 2015 ? '📅' : '🕰️'
      console.log(`  ${i + 1}. ${game.name} (${year}) [Score: ${score}] ${relevanceIcon}${recentIcon}`)
    })

    return relevantResults
  }

  /**
   * Vérifier si un jeu est pertinent pour la requête (VERSION INCLUSIVE)
   */
  private isGameRelevant(game: RAWGGame, queryLower: string, queryWords: string[]): boolean {
    const gameName = game.name.toLowerCase()
    const developers = game.developers?.map(d => d.name.toLowerCase()) || []
    const publishers = game.publishers?.map(p => p.name.toLowerCase()) || []
    const genres = game.genres?.map(g => g.name.toLowerCase()) || []

    // ✅ APPROCHE INCLUSIVE - Accepter plus de jeux, laisser le scoring décider

    // 1. Correspondance exacte (toujours pertinent)
    if (gameName === queryLower) return true

    // 2. Le titre contient la requête complète
    if (gameName.includes(queryLower)) return true

    // 3. Le titre commence par la requête ou un mot de la requête
    if (gameName.startsWith(queryLower)) return true
    if (queryWords.some(word => word.length > 2 && gameName.startsWith(word))) return true

    // 4. Tous les mots importants de la requête sont dans le titre
    const importantWords = queryWords.filter(word => word.length > 2) // Ignorer "of", "the", etc.
    if (importantWords.length > 0) {
      const wordsInTitle = importantWords.filter(word => gameName.includes(word))
      
      // Si tous les mots importants sont présents
      if (wordsInTitle.length === importantWords.length) return true
      
      // Si au moins 60% des mots importants sont présents
      if (wordsInTitle.length >= Math.ceil(importantWords.length * 0.6)) return true
    }

    // 5. Match développeur/éditeur avec titre partiel (plus flexible)
    const hasCreatorMatch = queryWords.some(word => 
      word.length > 2 && (
        developers.some(dev => dev.includes(word)) ||
        publishers.some(pub => pub.includes(word))
      )
    )
    const hasAnyTitleMatch = queryWords.some(word => 
      word.length > 2 && gameName.includes(word)
    )
    
    if (hasCreatorMatch && hasAnyTitleMatch) return true

    // 6. NOUVEAU - Match par genre + mot-clé (pour élargir les résultats)
    const hasGenreRelevance = genres.some(genre => 
      queryWords.some(word => word.length > 3 && genre.includes(word))
    )
    if (hasGenreRelevance && hasAnyTitleMatch) return true

    // 7. NOUVEAU - Match partiel sur le nom de franchise
    const franchiseMatch = this.detectFranchise(gameName)
    if (franchiseMatch && queryLower.includes(franchiseMatch.split(' ')[0])) return true

    // 8. Pour les requêtes courtes (1-2 mots), être plus permissif
    if (queryWords.length <= 2 && queryWords.some(word => 
      word.length > 2 && gameName.includes(word)
    )) return true

    return false
  }

  /**
   * Calculer un score de pertinence pour le tri (optimisé mobile)
   */
  private calculateRelevanceScore(game: RAWGGame, queryLower: string, queryWords: string[], currentYear: number): number {
    const gameName = game.name.toLowerCase()
    const releaseYear = game.released ? new Date(game.released).getFullYear() : 0
    
    let score = 0

    // 🎯 PERTINENCE D'ABORD (scores élevés)
    
    // Correspondance exacte (priorité absolue)
    if (gameName === queryLower) {
      score += 10000
    }
    // Titre commence par la requête (ex: "assassin's creed" pour "assassin")
    else if (gameName.startsWith(queryLower)) {
      score += 8000
    }
    // Correspondance de séquence complète dans le titre
    else if (gameName.includes(queryLower)) {
      // Bonus si c'est au début du titre
      if (gameName.indexOf(queryLower) === 0) {
        score += 7000
      } else {
        score += 6000
      }
    }
    // Pour les requêtes multi-mots (ex: "assassin's creed")
    else if (queryWords.length > 1) {
      const wordsInTitle = queryWords.filter(word => gameName.includes(word))
      const matchRatio = wordsInTitle.length / queryWords.length
      
      // Tous les mots présents
      if (matchRatio === 1.0) {
        score += 5000
      }
      // Majorité des mots présents
      else if (matchRatio >= 0.6) {
        score += 3000 * matchRatio
      }
      // Au moins un mot clé important
      else if (matchRatio >= 0.3) {
        score += 1000 * matchRatio
      }
    }
    // Mot unique présent
    else if (queryWords.length === 1 && gameName.includes(queryWords[0])) {
      score += 2000
    }

    // 🚀 BONUS RÉCENCE (scores modérés pour ne pas dominer la pertinence)
    if (releaseYear >= 2024) {
      score += 800  // Réduit de 200 → 800
    } else if (releaseYear >= 2023) {
      score += 600  // Réduit de 200 → 600  
    } else if (releaseYear >= 2020) {
      score += 300  // Réduit de 100 → 300
    } else if (releaseYear >= 2015) {
      score += 100  // Réduit de 50 → 100
    }

    // 🏆 BONUS QUALITÉ (scores légers)
    if (game.rating >= 4.5) {
      score += 200
    } else if (game.rating >= 4.0) {
      score += 150
    } else if (game.rating >= 3.5) {
      score += 100
    }

    // 👥 BONUS POPULARITÉ (scores légers)
    if (game.rating_count >= 10000) {
      score += 150
    } else if (game.rating_count >= 1000) {
      score += 100
    } else if (game.rating_count >= 100) {
      score += 50
    }

    // 🎮 BONUS SPÉCIAL pour les franchises principales
    const gameNameForFranchise = gameName.replace(/[:\-–—]/g, ' ').trim()
    
    // Détecter les jeux principaux de franchise (pas les DLC ou spin-offs)
    const isMainEntry = this.isMainFranchiseEntry(gameNameForFranchise, queryLower)
    if (isMainEntry) {
      score += 1000
    }

    return score
  }

  /**
   * Détecter si c'est un jeu principal de franchise (pas un DLC/spin-off)
   */
  private isMainFranchiseEntry(gameName: string, query: string): boolean {
    // Mots qui indiquent souvent des DLC ou spin-offs
    const dlcKeywords = [
      'dlc', 'expansion', 'discovery tour', 'freedom cry', 'dead kings',
      'chronicles', 'liberation', 'bloodlines', 'legacy', 'season pass'
    ]
    
    // Si contient des mots-clés DLC, ce n'est pas un jeu principal
    if (dlcKeywords.some(keyword => gameName.includes(keyword))) {
      return false
    }
    
    // Pour Assassin's Creed, prioriser les jeux principaux
    if (query.includes('assassin')) {
      const mainACGames = [
        'valhalla', 'odyssey', 'origins', 'syndicate', 'unity', 
        'black flag', 'brotherhood', 'revelations', 'mirage'
      ]
      
      return mainACGames.some(mainGame => gameName.includes(mainGame))
    }
    
    return true // Par défaut, considérer comme jeu principal
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
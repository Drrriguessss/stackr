// src/services/optimalGamingAPI.ts - Optimal Gaming Search API
// Inspired by OptimalGamingAPI architecture with RAWG integration

import { rawgService, type RAWGGame } from './rawgService'

export interface OptimalGamingResult {
  id: string
  name: string
  title: string // Compatibility field
  background_image?: string
  image?: string // Compatibility field for components
  rating: number
  metacritic?: number
  released: string
  platforms: { platform: { name: string } }[]
  developers: { name: string }[]
  genres: { name: string }[]
  tags?: { name: string }[]
  esrb_rating?: { name: string, slug: string }
  added?: number // RAWG "added" count
  
  // Enhanced fields
  year?: number
  genre?: string // Primary genre (compatibility)
  developer?: string // Primary developer (compatibility)
  category: 'games' // For library compatibility
  type: 'game' // For components
  overview?: string // Description (compatibility)
  
  // Gaming-specific metadata
  relevanceScore?: number
  popularity?: number
  rating_count: number
  
  // Advanced scoring fields
  titleScore?: number
  qualityScore?: number
  recencyScore?: number
  popularityScore?: number
  sourceScore?: number
  totalScore?: number
  sourceType?: 'recent' | 'relevant'
  
  // Raw data preservation
  rawg?: RAWGGame
}

export interface SearchOptions {
  platforms?: string[]
  includePC?: boolean
  includeConsole?: boolean
  includeMobile?: boolean
  limit?: number
  excludeNSFW?: boolean
  prioritizeRecent?: boolean
  sortBy?: 'relevance' | 'date' | 'rating' | 'mixed'
  minYear?: number
  boostRecentGames?: boolean
  showOnly2025?: boolean
}

class OptimalGamingAPI {
  constructor() {
    // Using existing RAWG service which handles API keys
  }

  /**
   * Enhanced search with advanced filtering and sorting options
   */
  async search(query: string, options: SearchOptions = {}): Promise<OptimalGamingResult[]> {
    
    const {
      platforms = [],
      includePC = true,
      includeConsole = true,
      includeMobile = false,
      limit = 12,
      excludeNSFW = true,
      prioritizeRecent = true,
      sortBy = 'mixed',
      minYear = 2000,
      boostRecentGames = true,
      showOnly2025 = false
    } = options

    if (!query || query.trim().length < 2) {
      if (showOnly2025) {
        return await this.getLatest2025Games({ excludeNSFW, limit })
      }
      return []
    }

    try {
      console.log('🎮 [OptimalGaming] Enhanced search for:', `"${query}"`, 'Options:', options)
      
      if (showOnly2025) {
        // Special mode: 2025 games only, filtered by query
        const latest2025 = await this.getLatest2025Games({ excludeNSFW, limit: limit * 2 })
        const filtered2025 = latest2025.filter(game => 
          game.name.toLowerCase().includes(query.toLowerCase())
        )
        return this.applySortingStrategy(filtered2025, query, { sortBy, prioritizeRecent, boostRecentGames })
          .slice(0, limit)
      }

      // 1. Hybrid search: recent + relevant games + franchise search for popular series
      const [recentResults, relevantResults, franchiseResults] = await Promise.allSettled([
        this.searchRecentGames(query, { excludeNSFW }),
        this.searchRelevantGames(query, { excludeNSFW, minYear }),
        this.searchFranchiseVariations(query, { excludeNSFW })
      ])

      // 2. Combine and dedupe results intelligently
      const combinedResults = this.combineAndDedupeResults(
        recentResults.status === 'fulfilled' ? recentResults.value : [],
        relevantResults.status === 'fulfilled' ? relevantResults.value : [],
        franchiseResults.status === 'fulfilled' ? franchiseResults.value : []
      )

      // 3. Apply advanced filters
      const filteredResults = this.applyAdvancedFilters(combinedResults, {
        excludeNSFW,
        minYear,
        platforms,
        includePC,
        includeConsole,
        includeMobile
      })

      // 4. Apply intelligent sorting strategy
      const sortedResults = this.applySortingStrategy(filteredResults, query, {
        sortBy,
        prioritizeRecent,
        boostRecentGames
      })

      console.log('🎮 [OptimalGaming] Final enhanced results:', sortedResults.length)
      return sortedResults.slice(0, limit)

    } catch (error) {
      console.error('🎮 [OptimalGaming] Enhanced search failed:', error)
      return []
    }
  }

  /**
   * Convert RAWG game to optimal gaming format
   */
  private convertToOptimalFormat(rawgGame: RAWGGame, sourceType?: 'recent' | 'relevant'): OptimalGamingResult {
    const year = rawgGame.released ? new Date(rawgGame.released).getFullYear() : undefined
    const primaryDeveloper = rawgGame.developers?.[0]?.name || 'Unknown Developer'
    const primaryGenre = rawgGame.genres?.[0]?.name || 'Gaming'
    
    return {
      id: `game-${rawgGame.id}`,
      name: rawgGame.name,
      title: rawgGame.name, // Compatibility
      background_image: rawgGame.background_image,
      image: rawgGame.background_image, // Compatibility for components
      rating: rawgGame.rating || 0,
      metacritic: rawgGame.metacritic,
      released: rawgGame.released || '',
      platforms: rawgGame.platforms || [],
      developers: rawgGame.developers || [],
      genres: rawgGame.genres || [],
      tags: rawgGame.tags || [],
      esrb_rating: rawgGame.esrb_rating,
      added: (rawgGame as any).added, // RAWG field for popularity
      rating_count: rawgGame.rating_count || 0,
      
      // Enhanced compatibility fields
      year,
      genre: primaryGenre,
      developer: primaryDeveloper,
      category: 'games',
      type: 'game',
      overview: rawgGame.description_raw, // For detail modals
      
      // Gaming-specific metadata
      popularity: this.calculatePopularity(rawgGame),
      sourceType,
      
      // Preserve raw data
      rawg: rawgGame
    }
  }

  /**
   * Intelligent relevance ranking system
   */
  private rankByRelevance(games: OptimalGamingResult[], originalQuery: string): OptimalGamingResult[] {
    return games.map(game => ({
      ...game,
      relevanceScore: this.calculateGamingRelevance(game, originalQuery)
    })).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
  }

  /**
   * Advanced gaming relevance calculation
   */
  private calculateGamingRelevance(game: OptimalGamingResult, query: string): number {
    let score = 0
    const queryLower = query.toLowerCase()
    const nameLower = game.name.toLowerCase()

    // 1. Name matching (most important)
    if (nameLower === queryLower) score += 100
    else if (nameLower.startsWith(queryLower)) score += 80
    else if (nameLower.includes(queryLower)) score += 60
    else {
      // Check for partial word matches
      const queryWords = queryLower.split(' ')
      const nameWords = nameLower.split(' ')
      const matchingWords = queryWords.filter(qw => nameWords.some(nw => nw.includes(qw)))
      if (matchingWords.length > 0) {
        score += (matchingWords.length / queryWords.length) * 40
      }
    }

    // 2. Quality scoring (Metacritic)
    if (game.metacritic) {
      if (game.metacritic >= 90) score += 25
      else if (game.metacritic >= 80) score += 15
      else if (game.metacritic >= 70) score += 10
      else if (game.metacritic >= 60) score += 5
    }

    // 3. Community popularity (rating count as proxy)
    if (game.rating_count > 50000) score += 20
    else if (game.rating_count > 10000) score += 15
    else if (game.rating_count > 1000) score += 10
    else if (game.rating_count > 100) score += 5

    // 4. Community rating
    if (game.rating >= 4.5) score += 15
    else if (game.rating >= 4.0) score += 10
    else if (game.rating >= 3.5) score += 5

    // 5. Recency boost (slight preference for newer games)
    if (game.year) {
      const currentYear = new Date().getFullYear()
      if (game.year >= currentYear - 1) score += 12 // Very recent
      else if (game.year >= currentYear - 3) score += 8 // Recent
      else if (game.year >= currentYear - 5) score += 5 // Somewhat recent
    }

    // 6. Platform availability bonus (more platforms = more accessible)
    const platformCount = game.platforms?.length || 0
    if (platformCount >= 5) score += 8
    else if (platformCount >= 3) score += 5
    else if (platformCount >= 2) score += 3

    // 7. Penalties for low quality
    if (game.rating < 3.0) score -= 15
    if (game.rating_count < 50) score -= 10 // Very few reviews
    if (!game.background_image) score -= 5 // No image

    return Math.max(0, score)
  }

  /**
   * Calculate popularity score from various metrics
   */
  private calculatePopularity(rawgGame: RAWGGame): number {
    let popularity = 0
    
    // Base on rating count (proxy for how many people played/reviewed)
    if (rawgGame.rating_count) {
      popularity += Math.min(rawgGame.rating_count / 1000, 100) // Cap at 100
    }
    
    // Boost based on rating quality
    if (rawgGame.rating) {
      popularity += rawgGame.rating * 10
    }
    
    // Metacritic bonus
    if (rawgGame.metacritic) {
      popularity += rawgGame.metacritic / 2
    }
    
    return Math.round(popularity)
  }

  /**
   * Apply platform filtering
   */
  private applyPlatformFilter(games: OptimalGamingResult[], filters: {
    platforms: string[]
    includePC: boolean
    includeConsole: boolean
    includeMobile: boolean
  }): OptimalGamingResult[] {
    
    if (filters.platforms.length === 0 && filters.includePC && filters.includeConsole && filters.includeMobile) {
      return games // No filtering needed
    }

    return games.filter(game => {
      if (!game.platforms || game.platforms.length === 0) return true // Include if no platform data

      const platformNames = game.platforms.map(p => p.platform.name.toLowerCase())
      
      // Check specific platform filters
      if (filters.platforms.length > 0) {
        const hasSpecificPlatform = filters.platforms.some(platform => 
          platformNames.some(pName => pName.includes(platform.toLowerCase()))
        )
        if (!hasSpecificPlatform) return false
      }

      // Check general platform categories
      const hasPC = platformNames.some(p => p.includes('pc') || p.includes('steam') || p.includes('windows'))
      const hasConsole = platformNames.some(p => 
        p.includes('playstation') || p.includes('xbox') || p.includes('nintendo') || p.includes('switch')
      )
      const hasMobile = platformNames.some(p => p.includes('ios') || p.includes('android'))

      if (!filters.includePC && hasPC && !hasConsole && !hasMobile) return false
      if (!filters.includeConsole && hasConsole && !hasPC && !hasMobile) return false
      if (!filters.includeMobile && hasMobile && !hasPC && !hasConsole) return false

      return true
    })
  }

  /**
   * Search by specific platform
   */
  async searchByPlatform(query: string, platformName: string): Promise<OptimalGamingResult[]> {
    const platformMap: Record<string, string[]> = {
      'ps5': ['PlayStation 5', 'PS5'],
      'ps4': ['PlayStation 4', 'PS4'],
      'xbox-series': ['Xbox Series S/X', 'Xbox Series'],
      'xbox-one': ['Xbox One'],
      'nintendo-switch': ['Nintendo Switch', 'Switch'],
      'pc': ['PC', 'Windows'],
      'steam': ['PC', 'Steam'],
      'ios': ['iOS'],
      'android': ['Android']
    }

    const platformFilters = platformMap[platformName.toLowerCase()] || [platformName]
    
    return await this.search(query, {
      platforms: platformFilters,
      limit: 12
    })
  }

  /**
   * Search recent games (last 2 years) with NSFW filtering
   */
  private async searchRecentGames(query: string, options: { excludeNSFW: boolean }): Promise<OptimalGamingResult[]> {
    try {
      const currentYear = new Date().getFullYear()
      const recentGames = await rawgService.searchWithRecentGames(query, 20)
      
      // Extended filter: include games from 2023 to 2026 (wider range for new/upcoming games)
      const filtered = recentGames.filter(game => {
        const gameYear = game.released ? new Date(game.released).getFullYear() : 0
        return gameYear >= 2023 && gameYear <= 2026
      })
      
      console.log(`🎮 [OptimalGaming] Recent search for "${query}": found ${filtered.length} games (2023-2026)`)

      return filtered.map(game => this.convertToOptimalFormat(game, 'recent'))
    } catch (error) {
      console.error('🎮 Recent games search failed:', error)
      return []
    }
  }

  /**
   * Search high-quality games with metacritic filtering
   */
  private async searchRelevantGames(query: string, options: { excludeNSFW: boolean, minYear: number }): Promise<OptimalGamingResult[]> {
    try {
      const relevantGames = await rawgService.searchGames(query, 30)
      
      // More permissive filter for quality and year (especially for franchise games)
      const filtered = relevantGames.filter(game => {
        const gameYear = game.released ? new Date(game.released).getFullYear() : 0
        const hasDecentRating = (game.metacritic && game.metacritic >= 60) || game.rating >= 3.0
        const hasMinimalReviews = game.rating_count > 10 // Lower threshold
        const isRecentOrUpcoming = gameYear >= 2020 // More recent games
        
        // Be more lenient for popular franchises or newer games
        return gameYear >= options.minYear && (hasDecentRating || hasMinimalReviews || isRecentOrUpcoming)
      })
      
      console.log(`🎮 [OptimalGaming] Relevant search for "${query}": found ${filtered.length} quality games`)

      return filtered.map(game => this.convertToOptimalFormat(game, 'relevant'))
    } catch (error) {
      console.error('🎮 Relevant games search failed:', error)
      return []
    }
  }

  /**
   * Combine and dedupe results intelligently
   */
  private combineAndDedupeResults(recentResults: OptimalGamingResult[], relevantResults: OptimalGamingResult[], franchiseResults: OptimalGamingResult[] = []): OptimalGamingResult[] {
    const seenIds = new Set<string>()
    const combined: OptimalGamingResult[] = []

    // First priority: recent games
    recentResults.forEach(game => {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        combined.push(game)
      }
    })

    // Second: relevant games not already included
    relevantResults.forEach(game => {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        combined.push(game)
      }
    })

    // Third: franchise variations not already included
    franchiseResults.forEach(game => {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        combined.push(game)
      }
    })

    return combined
  }

  /**
   * Search franchise variations for popular game series
   */
  private async searchFranchiseVariations(query: string, options: { excludeNSFW: boolean }): Promise<OptimalGamingResult[]> {
    const lowerQuery = query.toLowerCase()
    const franchiseVariations: Record<string, string[]> = {
      'assassin': ['assassins creed', 'assassin creed', 'creed'],
      'call of duty': ['call duty', 'cod', 'modern warfare', 'warzone'],
      'grand theft': ['gta', 'grand theft auto'],
      'elder scrolls': ['skyrim', 'elderscrolls', 'oblivion'],
      'god of war': ['god war', 'kratos'],
      'final fantasy': ['ff', 'final fantasy'],
      'street fighter': ['street fighter', 'sf'],
      'tomb raider': ['lara croft', 'tomb raider'],
      'dead space': ['dead space'],
      'resident evil': ['re', 'resident evil', 'biohazard']
    }

    // Find matching franchise patterns
    const matchingVariations: string[] = []
    for (const [key, variations] of Object.entries(franchiseVariations)) {
      if (lowerQuery.includes(key) || variations.some(v => lowerQuery.includes(v.toLowerCase()))) {
        matchingVariations.push(...variations, key)
        break // Only match one franchise to avoid too many requests
      }
    }

    if (matchingVariations.length === 0) {
      return [] // No franchise detected
    }

    try {
      // Search with each variation
      const results: OptimalGamingResult[] = []
      for (const variation of matchingVariations.slice(0, 3)) { // Limit to 3 variations
        try {
          const games = await rawgService.searchGames(variation, 10)
          const converted = games.map(game => this.convertToOptimalFormat(game, 'relevant'))
          results.push(...converted)
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.warn(`🎮 Franchise search failed for "${variation}":`, error)
        }
      }

      console.log(`🎮 [OptimalGaming] Franchise search for "${query}": found ${results.length} additional games`)
      return results
    } catch (error) {
      console.error('🎮 Franchise search failed:', error)
      return []
    }
  }

  /**
   * Apply advanced filters including NSFW detection
   */
  private applyAdvancedFilters(games: OptimalGamingResult[], options: {
    excludeNSFW: boolean
    minYear: number
    platforms: string[]
    includePC: boolean
    includeConsole: boolean
    includeMobile: boolean
  }): OptimalGamingResult[] {
    let filtered = games

    // NSFW filtering
    if (options.excludeNSFW) {
      filtered = filtered.filter(game => !this.isNSFWContent(game))
    }

    // Year filtering
    filtered = filtered.filter(game => {
      if (!game.year) return true
      return game.year >= options.minYear
    })

    // Quality filtering
    filtered = filtered.filter(game => {
      // Remove games with very few reviews and low ratings
      if (game.rating_count < 10 && (game.added || 0) < 100) return false
      if (game.rating < 2.0 && game.rating_count > 100) return false
      return true
    })

    // Platform filtering
    filtered = this.applyPlatformFilter(filtered, options)

    return filtered
  }

  /**
   * Detect NSFW content using multiple signals
   */
  private isNSFWContent(game: OptimalGamingResult): boolean {
    const title = game.name ? game.name.toLowerCase() : ''
    const tags = game.tags ? game.tags.map(tag => tag.name.toLowerCase()) : []
    const genres = game.genres ? game.genres.map(genre => genre.name.toLowerCase()) : []

    // 1. Explicit tags
    const nsfwTags = [
      'nsfw', 'adult', 'mature', 'sexual content', 'nudity',
      'dating sim', 'visual novel', 'erotic', 'hentai',
      'adult only', 'ao rating', 'pornographic'
    ]

    const hasNSFWTags = tags.some(tag => 
      nsfwTags.some(nsfwTag => tag.includes(nsfwTag))
    )

    // 2. Suspicious genres
    const suspiciousGenres = ['dating sim']
    const hasSuspiciousGenre = genres.some(genre => 
      suspiciousGenres.includes(genre)
    )

    // 3. Title keywords
    const nsfwKeywords = [
      'sex', 'xxx', 'adult', 'erotic', 'hentai',
      'strip', 'porn', 'nude', 'hot'
    ]

    const hasNSFWTitle = nsfwKeywords.some(keyword => 
      title.includes(keyword)
    )

    // 4. ESRB rating
    const hasAdultRating = game.esrb_rating && 
      ['adults-only-ao', 'rating-pending'].includes(game.esrb_rating.slug)

    return hasNSFWTags || hasSuspiciousGenre || hasNSFWTitle || hasAdultRating
  }

  /**
   * Apply intelligent sorting strategies
   */
  private applySortingStrategy(games: OptimalGamingResult[], query: string, options: {
    sortBy: 'relevance' | 'date' | 'rating' | 'mixed'
    prioritizeRecent: boolean
    boostRecentGames: boolean
  }): OptimalGamingResult[] {
    // Calculate advanced scores for each game
    const scoredGames = games.map(game => ({
      ...game,
      ...this.calculateAdvancedScores(game, query, options)
    }))

    // Apply sorting strategy
    switch (options.sortBy) {
      case 'date':
        return this.sortByDateWithRelevance(scoredGames)
      case 'rating':
        return this.sortByRatingWithRecency(scoredGames)
      case 'mixed':
        return this.sortByMixedStrategy(scoredGames)
      case 'relevance':
      default:
        return this.sortByRelevanceWithRecency(scoredGames)
    }
  }

  /**
   * Calculate advanced scoring for each game
   */
  private calculateAdvancedScores(game: OptimalGamingResult, originalQuery: string, options: {
    prioritizeRecent: boolean
    boostRecentGames: boolean
  }) {
    const currentYear = new Date().getFullYear()

    // 1. Title relevance score
    const titleScore = this.calculateTitleRelevance(game.name, originalQuery)

    // 2. Quality score (Metacritic + RAWG rating)
    const qualityScore = this.calculateQualityScore(game)

    // 3. Recency score with 2025 boost
    const recencyScore = this.calculateRecencyScore(game.year || 0, currentYear, options.boostRecentGames)

    // 4. Popularity score
    const popularityScore = this.calculatePopularityScore(game)

    // 5. Source type score
    const sourceScore = game.sourceType === 'recent' ? 15 : 0

    const totalScore = titleScore + qualityScore + recencyScore + popularityScore + sourceScore

    return {
      titleScore,
      qualityScore,
      recencyScore,
      popularityScore,
      sourceScore,
      totalScore
    }
  }

  /**
   * Calculate title relevance using fuzzy matching
   */
  private calculateTitleRelevance(title: string, query: string): number {
    if (!title || !query) return 0
    
    const titleLower = title.toLowerCase()
    const queryLower = query.toLowerCase()

    if (titleLower === queryLower) return 100
    if (titleLower.startsWith(queryLower)) return 80
    if (titleLower.includes(queryLower)) return 60

    // Word matching
    const titleWords = titleLower.split(/\s+/)
    const queryWords = queryLower.split(/\s+/)
    let wordMatches = 0

    queryWords.forEach(qWord => {
      if (titleWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
        wordMatches++
      }
    })

    return (wordMatches / queryWords.length) * 40
  }

  /**
   * Calculate quality score from ratings and reviews
   */
  private calculateQualityScore(game: OptimalGamingResult): number {
    let score = 0

    // Metacritic scoring
    if (game.metacritic) {
      if (game.metacritic >= 90) score += 30
      else if (game.metacritic >= 80) score += 20
      else if (game.metacritic >= 70) score += 10
      else if (game.metacritic < 50) score -= 10
    }

    // RAWG rating
    if (game.rating >= 4.5) score += 20
    else if (game.rating >= 4.0) score += 15
    else if (game.rating >= 3.5) score += 10
    else if (game.rating < 3.0) score -= 10

    return Math.max(0, score)
  }

  /**
   * Calculate recency score with massive 2025 boost
   */
  private calculateRecencyScore(gameYear: number, currentYear: number, boostRecent: boolean): number {
    if (!gameYear) return 0

    let score = 0

    if (boostRecent) {
      // Massive boost for 2025 games
      if (gameYear === currentYear) score += 50
      else if (gameYear === currentYear - 1) score += 35
      else if (gameYear >= currentYear - 2) score += 25
      else if (gameYear >= currentYear - 5) score += 15
      else if (gameYear >= currentYear - 10) score += 5
      else if (gameYear < 1990) score -= 10 // Penalty for very old games
    }

    return score
  }

  /**
   * Calculate popularity from multiple signals
   */
  private calculatePopularityScore(game: OptimalGamingResult): number {
    let score = 0

    // Based on RAWG "added" count
    const added = game.added || 0
    if (added > 100000) score += 25
    else if (added > 50000) score += 20
    else if (added > 10000) score += 15
    else if (added > 1000) score += 10
    else if (added < 100) score -= 5

    // Rating count bonus
    if (game.rating_count > 10000) score += 10
    else if (game.rating_count > 1000) score += 5

    return score
  }

  /**
   * Sort by date with relevance tiebreaker
   */
  private sortByDateWithRelevance(games: OptimalGamingResult[]): OptimalGamingResult[] {
    return games.sort((a, b) => {
      const yearA = a.year || 0
      const yearB = b.year || 0
      
      if (yearA !== yearB) {
        return yearB - yearA // Newer first
      }

      return (b.totalScore || 0) - (a.totalScore || 0)
    })
  }

  /**
   * Sort by rating with recency bonus
   */
  private sortByRatingWithRecency(games: OptimalGamingResult[]): OptimalGamingResult[] {
    return games.sort((a, b) => {
      const scoreA = (a.qualityScore || 0) + ((a.recencyScore || 0) * 0.3)
      const scoreB = (b.qualityScore || 0) + ((b.recencyScore || 0) * 0.3)
      
      return scoreB - scoreA
    })
  }

  /**
   * Balanced mixed strategy
   */
  private sortByMixedStrategy(games: OptimalGamingResult[]): OptimalGamingResult[] {
    return games.sort((a, b) => {
      // 40% relevance, 30% quality, 20% recency, 10% popularity
      const scoreA = ((a.titleScore || 0) * 0.4) + ((a.qualityScore || 0) * 0.3) + 
                     ((a.recencyScore || 0) * 0.2) + ((a.popularityScore || 0) * 0.1)
      const scoreB = ((b.titleScore || 0) * 0.4) + ((b.qualityScore || 0) * 0.3) + 
                     ((b.recencyScore || 0) * 0.2) + ((b.popularityScore || 0) * 0.1)
      
      return scoreB - scoreA
    })
  }

  /**
   * Sort by total relevance score
   */
  private sortByRelevanceWithRecency(games: OptimalGamingResult[]): OptimalGamingResult[] {
    return games.sort((a, b) => {
      return (b.totalScore || 0) - (a.totalScore || 0)
    })
  }

  /**
   * Get latest 2025 games specifically
   */
  async getLatest2025Games(options: { excludeNSFW: boolean, limit: number }): Promise<OptimalGamingResult[]> {
    try {
      // Use RAWG service to get recent games but filter for 2025 only
      const allRecent = await rawgService.getNewReleases()
      
      const games2025 = allRecent.filter(game => {
        const gameYear = game.released ? new Date(game.released).getFullYear() : 0
        return gameYear === 2025
      })

      let converted = games2025.map(game => this.convertToOptimalFormat(game, 'recent'))

      // Apply NSFW filtering if requested
      if (options.excludeNSFW) {
        converted = converted.filter(game => !this.isNSFWContent(game))
      }

      // Sort by release date (newest first)
      converted.sort((a, b) => {
        const dateA = new Date(a.released || '').getTime() || 0
        const dateB = new Date(b.released || '').getTime() || 0
        return dateB - dateA
      })

      return converted.slice(0, options.limit)
    } catch (error) {
      console.error('🎮 2025 games fetch failed:', error)
      return []
    }
  }

  /**
   * Get trending games
   */
  async getTrending(): Promise<OptimalGamingResult[]> {
    try {
      console.log('🎮 [OptimalGaming] Fetching trending games')
      
      // Get popular games from RAWG
      const popularGames = await rawgService.getPopularGames()
      
      if (popularGames.length === 0) {
        console.log('🎮 [OptimalGaming] No popular games found')
        return []
      }

      // Convert and rank
      const convertedGames = popularGames.map(game => this.convertToOptimalFormat(game))
      
      // Sort by a combination of rating and popularity
      const rankedGames = convertedGames.sort((a, b) => {
        const scoreA = (a.rating * 20) + (a.popularity || 0) + (a.metacritic || 0)
        const scoreB = (b.rating * 20) + (b.popularity || 0) + (b.metacritic || 0)
        return scoreB - scoreA
      })

      console.log('🎮 [OptimalGaming] Trending games:', rankedGames.length)
      return rankedGames.slice(0, 8)

    } catch (error) {
      console.error('🎮 [OptimalGaming] Trending failed:', error)
      return []
    }
  }

  /**
   * Get similar games (for recommendations)
   */
  async getSimilarGames(gameId: string, limit: number = 6): Promise<OptimalGamingResult[]> {
    try {
      const cleanGameId = gameId.replace('game-', '')
      const similarRawgGames = await rawgService.getSimilarGames(cleanGameId, limit)
      
      return similarRawgGames.map(game => this.convertToOptimalFormat(game))
      
    } catch (error) {
      console.error('🎮 [OptimalGaming] Similar games failed:', error)
      return []
    }
  }
}

// Export singleton instance
export const optimalGamingAPI = new OptimalGamingAPI()
export default optimalGamingAPI
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
  
  // Raw data preservation
  rawg?: RAWGGame
}

class OptimalGamingAPI {
  constructor() {
    // Using existing RAWG service which handles API keys
  }

  /**
   * Optimal search with intelligent ranking and relevance scoring
   */
  async search(query: string, options: {
    platforms?: string[]
    includePC?: boolean
    includeConsole?: boolean
    includeMobile?: boolean
    limit?: number
  } = {}): Promise<OptimalGamingResult[]> {
    
    const {
      platforms = [],
      includePC = true,
      includeConsole = true,
      includeMobile = false,
      limit = 12
    } = options

    if (!query || query.trim().length < 2) return []

    try {
      console.log('🎮 [OptimalGaming] Starting optimized search for:', `"${query}"`)
      
      // Primary: RAWG search with recent games priority
      const rawgResults = await rawgService.searchWithRecentGames(query, limit * 2)
      
      if (rawgResults.length === 0) {
        console.log('🎮 [OptimalGaming] No RAWG results found')
        return []
      }

      console.log('🎮 [OptimalGaming] RAWG returned:', rawgResults.length, 'games')

      // Convert to optimal format
      const convertedResults = rawgResults.map(game => this.convertToOptimalFormat(game))
      
      // Apply intelligent ranking
      const rankedResults = this.rankByRelevance(convertedResults, query)
      
      // Apply platform filtering if specified
      let filteredResults = rankedResults
      if (platforms.length > 0 || !includePC || !includeConsole || !includeMobile) {
        filteredResults = this.applyPlatformFilter(rankedResults, {
          platforms,
          includePC,
          includeConsole,
          includeMobile
        })
      }

      console.log('🎮 [OptimalGaming] Final results:', filteredResults.length)
      return filteredResults.slice(0, limit)

    } catch (error) {
      console.error('🎮 [OptimalGaming] Search failed:', error)
      return []
    }
  }

  /**
   * Convert RAWG game to optimal gaming format
   */
  private convertToOptimalFormat(rawgGame: RAWGGame): OptimalGamingResult {
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
// Optimized Gaming API V2 - Minimal RAWG requests with free enrichment
import { rawgService } from './rawgService'

export interface OptimalGamingV2Result {
  id: string
  name: string
  title: string
  released: string
  rating: number
  metacritic?: number
  image: string
  background_image: string
  developer: string
  developers: any[]
  publishers: any[]
  genres: any[]
  platforms: any[]
  stores?: any[]
  description_raw?: string
  esrb_rating?: any
  tags?: any[]
  rating_count: number
  relevanceScore?: number
  steam?: {
    appid: string
    price?: any
    reviews?: any
    players?: number
    achievements?: number
  }
}

class OptimalGamingAPIV2 {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

  async search(query: string, options: any = {}): Promise<OptimalGamingV2Result[]> {
    const {
      platforms = [],
      includePC = true,
      includeConsole = true,
      includeMobile = false,
      limit = 20
    } = options

    // Check cache first
    const cacheKey = `search-${query}-${JSON.stringify(options)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log('🎮 [V2] Using cached results for:', query)
      return cached
    }

    try {
      console.log('🎮 [V2] Single RAWG search for:', query)
      
      // SINGLE RAWG REQUEST - optimized parameters
      const rawgResults = await rawgService.searchGames(query, limit)
      
      if (!rawgResults || rawgResults.length === 0) {
        console.log('🎮 [V2] No results found')
        return []
      }

      // Convert and rank by relevance
      const results = rawgResults
        .map(game => this.convertToV2Format(game))
        .map(game => ({
          ...game,
          relevanceScore: this.calculateGamingRelevance(game, query)
        }))
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

      // Optional: Enrich with Steam data (free API, no key needed for basic info)
      // This would be done client-side or with a separate free service
      
      // Cache the results
      this.setCache(cacheKey, results)
      
      console.log(`🎮 [V2] Found ${results.length} games with 1 RAWG request`)
      return results

    } catch (error) {
      console.error('🎮 [V2] Search failed:', error)
      return []
    }
  }

  private convertToV2Format(rawgGame: any): OptimalGamingV2Result {
    const converted = rawgService.convertToAppFormat(rawgGame)
    return {
      ...converted,
      title: converted.title || converted.name,
      relevanceScore: 0
    }
  }

  private calculateGamingRelevance(game: OptimalGamingV2Result, query: string): number {
    let score = 0
    const queryLower = query.toLowerCase()
    const nameLower = game.name.toLowerCase()

    // 1. Name matching
    if (nameLower === queryLower) score += 100
    else if (nameLower.startsWith(queryLower)) score += 80
    else if (nameLower.includes(queryLower)) score += 60

    // 2. Game quality
    if (game.metacritic && game.metacritic >= 90) score += 25
    else if (game.metacritic && game.metacritic >= 80) score += 15
    else if (game.metacritic && game.metacritic >= 70) score += 10

    // 3. Popularity
    if (game.rating_count > 50000) score += 20
    else if (game.rating_count > 10000) score += 15
    else if (game.rating_count > 1000) score += 10

    // 4. Community rating
    if (game.rating >= 4.5) score += 15
    else if (game.rating >= 4.0) score += 10
    else if (game.rating >= 3.5) score += 5

    // 5. Recency boost
    if (game.released) {
      const releaseYear = new Date(game.released).getFullYear()
      const currentYear = new Date().getFullYear()
      if (releaseYear >= currentYear - 2) score += 10
      else if (releaseYear >= currentYear - 5) score += 5
    }

    // 6. Penalties
    if (game.rating < 3.0) score -= 15
    if (game.rating_count < 100) score -= 10

    return Math.max(0, score)
  }

  async getTrending(limit: number = 8): Promise<OptimalGamingV2Result[]> {
    const cacheKey = `trending-${limit}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log('🎮 [V2] Using cached trending')
      return cached
    }

    try {
      // Single request for popular games
      const popular = await rawgService.getPopularGames()
      const results = popular
        .slice(0, limit)
        .map(game => this.convertToV2Format(game))
      
      this.setCache(cacheKey, results)
      console.log(`🎮 [V2] Loaded ${results.length} trending games with 1 request`)
      return results
    } catch (error) {
      console.error('🎮 [V2] Trending failed:', error)
      return []
    }
  }

  async getSimilarGames(gameId: string | number, limit: number = 6): Promise<OptimalGamingV2Result[]> {
    const cacheKey = `similar-${gameId}-${limit}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log('🎮 [V2] Using cached similar games')
      return cached
    }

    try {
      // Use existing optimized method - 1-2 requests max
      const similar = await rawgService.getSimilarGames(gameId, limit)
      const results = similar.map(game => this.convertToV2Format(game))
      
      this.setCache(cacheKey, results)
      console.log(`🎮 [V2] Found ${results.length} similar games`)
      return results
    } catch (error) {
      console.error('🎮 [V2] Similar games failed:', error)
      return []
    }
  }

  // Cache management
  private getFromCache(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
    
    // Clean old cache entries
    if (this.cache.size > 50) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      // Remove oldest 10 entries
      for (let i = 0; i < 10; i++) {
        this.cache.delete(sortedEntries[i][0])
      }
    }
  }

  // Clear cache manually if needed
  clearCache(): void {
    this.cache.clear()
    console.log('🎮 [V2] Cache cleared')
  }
}

export const optimalGamingAPIV2 = new OptimalGamingAPIV2()
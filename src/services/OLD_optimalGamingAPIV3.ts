// Optimal Gaming API V3 - Hybrid Search Strategy for Recent Games
import { rawgService } from './rawgService'

export interface OptimalGamingV3Result {
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
  added?: number
  relevanceScore?: number
  isRecentGame?: boolean
  steam?: {
    appid: string
    price?: any
    reviews?: any
    players?: number
    achievements?: number
  }
}

class OptimalGamingAPIV3 {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

  async search(query: string, options: any = {}): Promise<OptimalGamingV3Result[]> {
    const {
      platforms = [],
      includePC = true,
      includeConsole = true,
      includeMobile = false,
      limit = 20
    } = options

    // Check cache first
    const cacheKey = `search-v3-hybrid-${query}-${JSON.stringify(options)}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log('🎮 [V3] Using cached hybrid results for:', query)
      return cached
    }

    try {
      console.log('🎮 [V3] HYBRID STRATEGY: Combining recent + classic search for:', query)
      
      // 🚀 STRATÉGIE HYBRIDE: Combiner recherche récente + recherche classique
      const results = await this.hybridSearch(query, {
        platforms,
        includePC,
        includeConsole,
        includeMobile,
        limit
      })

      // Apply enhanced relevance ranking
      const rankedResults = this.rankByRelevanceEnhanced(results, query)
      
      // Cache the results
      this.setCache(cacheKey, rankedResults)
      
      console.log(`🎮 [V3] Hybrid search completed: ${rankedResults.length} games found`)
      return rankedResults

    } catch (error) {
      console.error('🎮 [V3] Hybrid search failed:', error)
      return []
    }
  }

  // 🚀 NOUVELLE MÉTHODE: Recherche hybride pour capturer les jeux récents
  private async hybridSearch(query: string, options: any = {}): Promise<OptimalGamingV3Result[]> {
    const { platforms = [], limit = 20 } = options
    
    try {
      console.log('🎮 [V3] Starting hybrid search strategy...')

      // 1️⃣ Recherche spécifique pour jeux récents (2023-2025+)
      const recentResults = await this.searchRecentGames(query, platforms)
      
      // 2️⃣ Recherche classique avec relevance pour les jeux établis
      const classicResults = await this.searchClassicGames(query, platforms)

      // 3️⃣ Fusionner intelligemment en évitant les doublons
      const mergedResults = this.mergeSearchResults(recentResults, classicResults)
      
      console.log(`🎮 [V3] Hybrid results: ${recentResults.length} recent + ${classicResults.length} classic = ${mergedResults.length} total`)
      
      return mergedResults.slice(0, limit)
      
    } catch (error) {
      console.error('🎮 [V3] Hybrid search error, falling back to classic:', error)
      
      // Fallback to classic search
      return await this.searchClassicGames(query, platforms)
    }
  }

  // 🆕 Recherche ciblée pour les jeux récents (2023-2025+)
  private async searchRecentGames(query: string, platforms: string[] = []): Promise<OptimalGamingV3Result[]> {
    try {
      console.log(`🎮 [V3] 🆕 Searching recent games for: "${query}"`)
      
      const currentYear = new Date().getFullYear()
      
      // Custom API call for recent games sorted by release date
      const recentGames = await this.searchGamesWithDateRange(query, {
        startDate: '2023-01-01',
        endDate: `${currentYear + 2}-12-31`,
        ordering: '-released', // Sort by release date (newest first)
        limit: 15
      })

      console.log(`🎮 [V3] 🆕 Found ${recentGames.length} recent games BEFORE filtering`)
      
      // 🎯 FILTRAGE INTELLIGENT: Filter relevant recent games before conversion
      const filteredRecentGames = this.filterRelevantRecentGames(recentGames, query)
      
      console.log(`🎮 [V3] 🎯 Filtered to ${filteredRecentGames.length} relevant recent games`)
      
      // Log first few filtered results for debugging
      filteredRecentGames.slice(0, 3).forEach((game, index) => {
        const year = game.released ? new Date(game.released).getFullYear() : 'TBA'
        console.log(`🎮 [V3] ✅ ${index + 1}. ${game.name} (${year})`)
      })

      return filteredRecentGames.map(game => ({ ...this.convertToV3Format(game), isRecentGame: true }))
      
    } catch (error) {
      console.error('🎮 [V3] Recent games search error:', error)
      return []
    }
  }

  // Custom search with date range and ordering
  private async searchGamesWithDateRange(query: string, options: any): Promise<any[]> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY
      if (!apiKey) {
        throw new Error('RAWG API key not configured')
      }

      const { startDate, endDate, ordering = '-released', limit = 15 } = options
      
      // Build URL with date range and ordering
      let url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=${limit}&ordering=${ordering}`
      
      if (startDate && endDate) {
        url += `&dates=${startDate},${endDate}`
      }
      
      console.log('🎮 [V3] RAWG API request (recent with date range):', url.replace(apiKey, 'KEY_HIDDEN'))
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`RAWG API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.results || []
      
    } catch (error) {
      console.error('🎮 [V3] Date range search failed:', error)
      return []
    }
  }

  // 📚 Recherche classique avec relevance (méthode éprouvée)
  private async searchClassicGames(query: string, platforms: string[] = []): Promise<OptimalGamingV3Result[]> {
    try {
      console.log(`🎮 [V3] 📚 Searching classic games for: "${query}"`)
      
      // Use existing rawgService with relevance ordering
      const classicGames = await rawgService.searchGames(query, 15)
      
      console.log(`🎮 [V3] 📚 Found ${classicGames.length} classic games`)
      
      return classicGames.map(game => ({ ...this.convertToV3Format(game), isRecentGame: false }))
      
    } catch (error) {
      console.error('🎮 [V3] Classic games search error:', error)
      return []
    }
  }

  // 🔀 Fusionner les résultats en évitant les doublons et en priorisant les récents
  private mergeSearchResults(recentResults: OptimalGamingV3Result[], classicResults: OptimalGamingV3Result[]): OptimalGamingV3Result[] {
    const seenIds = new Set<string>()
    const merged: OptimalGamingV3Result[] = []

    console.log('🎮 [V3] 🔀 Merging search results...')

    // 1️⃣ D'abord ajouter TOUS les jeux récents (priorité absolue)
    recentResults.forEach(game => {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        merged.push(game)
        console.log(`🎮 [V3] ➕ Added recent: ${game.name}`)
      }
    })

    // 2️⃣ Compléter avec les jeux classiques (sans doublons)
    classicResults.forEach(game => {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        merged.push(game)
        console.log(`🎮 [V3] ➕ Added classic: ${game.name}`)
      }
    })

    console.log(`🎮 [V3] 🔀 Merged: ${recentResults.length} recent + ${classicResults.length - (classicResults.length - (merged.length - recentResults.length))} unique classic = ${merged.length} total`)

    return merged
  }

  // 🎯 SCORING AMÉLIORÉ: Enhanced relevance with recent game boost
  private rankByRelevanceEnhanced(games: OptimalGamingV3Result[], originalQuery: string): OptimalGamingV3Result[] {
    const rankedGames = games.map(game => ({
      ...game,
      relevanceScore: this.calculateGamingRelevanceEnhanced(game, originalQuery)
    })).sort((a, b) => {
      // 🏆 INTELLIGENT SORTING: Recent franchise games first, then by relevance score
      
      // Detect if this is a franchise/series search
      const isSeriesSearch = this.detectSeriesSearch(originalQuery, a.name) && 
                           this.detectSeriesSearch(originalQuery, b.name)
      
      if (isSeriesSearch) {
        console.log(`🎮 [V3] 🏆 Detected series search for: ${originalQuery}`)
        
        // For franchises: always sort by date (recent to old)
        const yearA = a.released ? new Date(a.released).getFullYear() : 0
        const yearB = b.released ? new Date(b.released).getFullYear() : 0
        
        if (yearA !== yearB) {
          console.log(`🎮 [V3] 📅 Sorting by date: ${b.name} (${yearB}) vs ${a.name} (${yearA})`)
          return yearB - yearA // Newer first
        }
      }
      
      // Otherwise, sort by relevance score
      return (b.relevanceScore || 0) - (a.relevanceScore || 0)
    })

    // Log top 3 results
    rankedGames.slice(0, 3).forEach((game, index) => {
      const year = game.released ? new Date(game.released).getFullYear() : 'TBA'
      const recent = game.isRecentGame ? '🆕' : '📚'
      console.log(`🎮 [V3] 🏆 ${index + 1}. ${recent} ${game.name} (${year}) - Score: ${game.relevanceScore}`)
    })

    return rankedGames
  }

  // 🔍 Detect if this is a franchise/series search
  private detectSeriesSearch(query: string, gameName: string): boolean {
    const queryLower = query.toLowerCase().trim()
    const gameNameLower = gameName.toLowerCase()
    
    // Common franchise keywords
    const franchiseKeywords = [
      'assassin', 'call of duty', 'battlefield', 'fifa', 'nba', 
      'grand theft auto', 'elder scrolls', 'fallout', 'witcher',
      'far cry', 'tomb raider', 'resident evil', 'final fantasy',
      'mortal kombat', 'street fighter', 'tekken', 'mario', 'zelda',
      'cod', 'gta', 'assassins creed'
    ]
    
    // If query contains franchise keyword AND game name also contains it
    return franchiseKeywords.some(keyword => 
      queryLower.includes(keyword) && gameNameLower.includes(keyword)
    )
  }

  // 🚀 ENHANCED RELEVANCE CALCULATION with conditional boost scoring
  private calculateGamingRelevanceEnhanced(game: OptimalGamingV3Result, query: string): number {
    let score = 0
    const queryLower = query.toLowerCase()
    const nameLower = game.name.toLowerCase()

    // 1. Name matching (exact > starts > contains)
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

    // 2. Game quality (Metacritic)
    if (game.metacritic) {
      if (game.metacritic >= 90) score += 25
      else if (game.metacritic >= 80) score += 15
      else if (game.metacritic >= 70) score += 10
      else if (game.metacritic >= 60) score += 5
    }

    // 3. Community popularity (rating count + added)
    const popularity = (game.rating_count || 0) + (game.added || 0)
    if (popularity > 50000) score += 20
    else if (popularity > 10000) score += 15
    else if (popularity > 1000) score += 10
    else if (popularity > 100) score += 5

    // 4. Community rating
    if (game.rating >= 4.5) score += 15
    else if (game.rating >= 4.0) score += 10
    else if (game.rating >= 3.5) score += 5

    // 5. 🎯 CONDITIONAL RECENCY BOOST - Only for relevant games
    if (game.released) {
      const releaseYear = new Date(game.released).getFullYear()
      const currentYear = new Date().getFullYear()
      
      // Check if game passes relevance threshold for boost eligibility
      const baseRelevance = score // Current score without recency boost
      const isRelevantEnough = baseRelevance >= 30 || this.isFromKnownFranchise(game.name, query)
      
      if (isRelevantEnough) {
        // Apply massive boost for relevant recent games
        if (releaseYear >= 2024) {
          score += 60 // Major boost for current/upcoming games
          console.log(`🎮 [V3] 🚀 CONDITIONAL 2024+ BOOST: ${game.name} (+60 points)`)
        }
        // Strong boost for 2023
        else if (releaseYear >= 2023) {
          score += 40
          console.log(`🎮 [V3] ⬆️ CONDITIONAL 2023 BOOST: ${game.name} (+40 points)`)
        }
        // Medium boost for 2022
        else if (releaseYear >= currentYear - 2) {
          score += 20
        }
        // Light boost for 2020-2021
        else if (releaseYear >= currentYear - 5) {
          score += 10
        }
      } else {
        console.log(`🎮 [V3] ❌ BOOST DENIED: ${game.name} (relevance too low: ${baseRelevance})`)
      }
    }

    // 6. 🎯 SPECIAL HYBRID BOOST: If marked as recent from hybrid search
    if (game.isRecentGame) {
      score += 30
      console.log(`🎮 [V3] ⭐ HYBRID RECENT BOOST: ${game.name} (+30 points)`)
    }

    // 7. Penalties for low quality
    if (game.rating < 3.0) score -= 15
    if (game.rating_count < 50) score -= 10

    return Math.max(0, score)
  }

  private convertToV3Format(rawgGame: any): OptimalGamingV3Result {
    const converted = rawgService.convertToAppFormat(rawgGame)
    return {
      ...converted,
      title: converted.title || converted.name,
      relevanceScore: 0,
      isRecentGame: false
    }
  }

  async getTrending(limit: number = 8): Promise<OptimalGamingV3Result[]> {
    const cacheKey = `trending-v3-${limit}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log('🎮 [V3] Using cached trending')
      return cached
    }

    try {
      // Get popular games with recent bias
      const popular = await rawgService.getPopularGames()
      const results = popular
        .slice(0, limit)
        .map(game => this.convertToV3Format(game))
      
      this.setCache(cacheKey, results)
      console.log(`🎮 [V3] Loaded ${results.length} trending games`)
      return results
    } catch (error) {
      console.error('🎮 [V3] Trending failed:', error)
      return []
    }
  }

  async getSimilarGames(gameId: string | number, limit: number = 6): Promise<OptimalGamingV3Result[]> {
    const cacheKey = `similar-v3-${gameId}-${limit}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      console.log('🎮 [V3] Using cached similar games')
      return cached
    }

    try {
      const similar = await rawgService.getSimilarGames(gameId, limit)
      const results = similar.map(game => this.convertToV3Format(game))
      
      this.setCache(cacheKey, results)
      console.log(`🎮 [V3] Found ${results.length} similar games`)
      return results
    } catch (error) {
      console.error('🎮 [V3] Similar games failed:', error)
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

  clearCache(): void {
    this.cache.clear()
    console.log('🎮 [V3] Cache cleared')
  }

  // 🎯 NEW METHOD: Filter relevant recent games before applying boosts
  private filterRelevantRecentGames(games: any[], query: string): any[] {
    console.log(`🎮 [V3] 🎯 Filtering ${games.length} recent games for relevance...`)
    
    const relevantGames = games.filter(game => {
      const gameName = game.name.toLowerCase()
      const queryLower = query.toLowerCase()
      
      // 1. Check for exact or close matches first
      if (gameName.includes(queryLower) || queryLower.includes(gameName)) {
        console.log(`🎮 [V3] ✅ RELEVANT: ${game.name} (direct match)`)
        return true
      }
      
      // 2. Check if from known franchise
      if (this.isFromKnownFranchise(game.name, query)) {
        console.log(`🎮 [V3] ✅ RELEVANT: ${game.name} (known franchise)`)
        return true
      }
      
      // 3. Check for noise words that indicate irrelevant results
      if (this.hasNoiseWords(game.name, query)) {
        console.log(`🎮 [V3] ❌ IRRELEVANT: ${game.name} (noise words detected)`)
        return false
      }
      
      // 4. Check word-level relevance
      const queryWords = queryLower.split(' ').filter(w => w.length > 2) // Ignore short words
      const nameWords = gameName.split(' ').filter(w => w.length > 2)
      
      const relevantWordMatches = queryWords.filter(qWord => 
        nameWords.some(nWord => 
          nWord.includes(qWord) || qWord.includes(nWord) ||
          this.areWordsSimilar(qWord, nWord)
        )
      )
      
      const relevanceRatio = relevantWordMatches.length / queryWords.length
      
      if (relevanceRatio >= 0.5) { // At least 50% of query words should match meaningfully
        console.log(`🎮 [V3] ✅ RELEVANT: ${game.name} (${Math.round(relevanceRatio * 100)}% word match)`)
        return true
      } else {
        console.log(`🎮 [V3] ❌ IRRELEVANT: ${game.name} (${Math.round(relevanceRatio * 100)}% word match too low)`)
        return false
      }
    })
    
    console.log(`🎮 [V3] 🎯 Filtered: ${relevantGames.length}/${games.length} games passed relevance check`)
    return relevantGames
  }

  // 🏢 Check if game is from a known franchise
  private isFromKnownFranchise(gameName: string, query: string): boolean {
    const gameNameLower = gameName.toLowerCase()
    const queryLower = query.toLowerCase()
    
    const knownFranchises = {
      'assassin': ['assassin', 'creed'],
      'call of duty': ['call', 'duty', 'cod', 'warfare', 'ops'],
      'grand theft auto': ['grand', 'theft', 'auto', 'gta'],
      'elder scrolls': ['elder', 'scrolls', 'skyrim', 'oblivion'],
      'final fantasy': ['final', 'fantasy'],
      'street fighter': ['street', 'fighter'],
      'mortal kombat': ['mortal', 'kombat'],
      'resident evil': ['resident', 'evil', 'biohazard'],
      'battlefield': ['battlefield'],
      'fifa': ['fifa'],
      'madden': ['madden'],
      'need for speed': ['need', 'speed', 'nfs']
    }
    
    // Check if query matches any franchise and game contains franchise keywords
    for (const [franchise, keywords] of Object.entries(knownFranchises)) {
      if (queryLower.includes(franchise) || keywords.some(k => queryLower.includes(k))) {
        // Query is about this franchise, check if game is also from this franchise
        if (keywords.some(k => gameNameLower.includes(k))) {
          return true
        }
      }
    }
    
    return false
  }

  // 🚫 Check for noise words that indicate irrelevant matches
  private hasNoiseWords(gameName: string, query: string): boolean {
    const gameNameLower = gameName.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // Define noise patterns based on your examples
    const noisePatterns = [
      // Words that sound similar but are different
      { query: 'assassin', noise: ['breeding', 'creeps', 'greed', 'breed', 'creed hospital'] },
      { query: 'creed', noise: ['breeding', 'greed', 'feed', 'seed', 'weed', 'deed'] },
      { query: 'call of duty', noise: ['call girl', 'duty free', 'beautiful', 'call center'] },
      { query: 'duty', noise: ['beautiful', 'booty', 'cutie', 'fruity'] }
    ]
    
    // Check for specific noise patterns
    for (const pattern of noisePatterns) {
      if (queryLower.includes(pattern.query)) {
        for (const noiseWord of pattern.noise) {
          if (gameNameLower.includes(noiseWord)) {
            return true // This is likely noise
          }
        }
      }
    }
    
    // Generic noise detection - games with completely unrelated words
    const queryWords = queryLower.split(' ').filter(w => w.length > 2)
    const gameWords = gameNameLower.split(' ').filter(w => w.length > 2)
    
    // If game has words that are completely unrelated to any query word
    const suspiciousWords = ['hospital', 'breeding', 'jump', 'halls', 'insanity', 'kitchen', 'cooking']
    const hasSuspiciousWords = gameWords.some(gWord => suspiciousWords.includes(gWord))
    
    if (hasSuspiciousWords && !queryWords.some(qWord => gameWords.some(gWord => 
      gWord.includes(qWord) || qWord.includes(gWord)
    ))) {
      return true // Game has suspicious words and no meaningful overlap with query
    }
    
    return false
  }

  // 🔤 Check if two words are similar (basic similarity)
  private areWordsSimilar(word1: string, word2: string): boolean {
    // Very basic similarity check
    if (word1.length < 3 || word2.length < 3) return false
    
    // Check if one contains the other with some tolerance
    const longer = word1.length > word2.length ? word1 : word2
    const shorter = word1.length <= word2.length ? word1 : word2
    
    return longer.includes(shorter) && (longer.length - shorter.length) <= 2
  }
}

export const optimalGamingAPIV3 = new OptimalGamingAPIV3()
// src/services/optimalBoardGameAPI.ts - Optimal Board Games Search API
// Inspired by OptimalBoardGameAPI architecture with BoardGameGeek integration

export interface OptimalBoardGameResult {
  id: string
  source: 'bgg' | 'boardgameatlas' | 'geekdo'
  name: string
  alternateNames?: string[]
  description?: string
  image?: string
  thumbnail?: string
  yearPublished?: number
  minPlayers?: number
  maxPlayers?: number
  playingTime?: number
  minPlayTime?: number
  maxPlayTime?: number
  minAge?: number
  
  // Ratings and statistics
  rating?: number // BGG average rating (out of 10, converted to 5)
  bggRating?: number // Original BGG rating out of 10
  ratingsCount?: number
  usersRated?: number
  bayesAverage?: number
  weight?: number // Complexity rating
  rank?: number // BGG rank
  
  // Game information
  categories?: Array<{
    id: string
    name: string
  }>
  mechanics?: Array<{
    id: string
    name: string
  }>
  designers?: Array<{
    id: string
    name: string
  }>
  artists?: Array<{
    id: string
    name: string
  }>
  publishers?: Array<{
    id: string
    name: string
  }>
  families?: Array<{
    id: string
    name: string
  }>
  
  // Compatibility fields for components
  title?: string // Name alias for compatibility
  author?: string // Primary designer for compatibility
  category: 'boardgames' // For library compatibility
  type: 'boardgame' // For components
  overview?: string // Description alias
  year?: number // yearPublished alias
  genre?: string // Primary category
  
  // Enhanced metadata
  owned?: number // Number of users who own it
  trading?: number
  wanting?: number
  wishing?: number
  complexity?: string // Human readable complexity
  playerCountText?: string // "2-4 players"
  playTimeText?: string // "60-90 minutes"
  ageText?: string // "14+"
  
  // Advanced scoring fields
  titleScore?: number
  popularityScore?: number
  qualityScore?: number
  totalScore?: number
  
  // External links
  bggUrl?: string
  rulesUrl?: string
  videoLinks?: Array<{
    id: string
    title: string
    url: string
    category: string
  }>
  
  // Market data
  prices?: Array<{
    source: string
    price: string
    currency: string
    url: string
  }>
}

export interface BoardGameSearchOptions {
  limit?: number
  exact?: boolean
  includeExpansions?: boolean
  minPlayers?: number
  maxPlayers?: number
  minPlayTime?: number
  maxPlayTime?: number
  minAge?: number
  minYear?: number
  maxYear?: number
  categories?: string[]
  mechanics?: string[]
  minRating?: number
  complexity?: 'light' | 'medium' | 'heavy' | 'all'
  sortBy?: 'relevance' | 'rating' | 'year' | 'rank' | 'complexity'
  enrichResults?: boolean
}

class OptimalBoardGameAPI {
  private cache = new Map()
  private readonly CACHE_TTL = 3600000 // 1 hour in ms
  private readonly BGG_BASE_URL = 'https://boardgamegeek.com/xmlapi2'
  private lastRequestTime = 0
  private readonly REQUEST_DELAY = 1000 // BGG rate limiting: 1 request per second

  constructor() {
    // Using fetch API, no external dependencies needed for browser compatibility
  }

  /**
   * Main search method using BoardGameGeek API (free, most comprehensive)
   */
  async search(query: string, options: BoardGameSearchOptions = {}): Promise<OptimalBoardGameResult[]> {
    if (!query || query.trim().length < 2) return []

    const {
      limit = 12,
      exact = false,
      includeExpansions = false,
      enrichResults = true
    } = options

    try {
      console.log('🎲 [OptimalBoardGame] Starting search for:', `"${query}"`)

      // Primary search using BGG API
      const searchResults = await this.searchBGG(query, { exact })

      if (searchResults.length === 0) {
        console.log('🎲 [OptimalBoardGame] No BGG results found')
        return []
      }

      console.log('🎲 [OptimalBoardGame] BGG returned:', searchResults.length, 'games')

      // Get detailed information for top results
      const gameIds = searchResults
        .slice(0, Math.min(limit * 2, 20))
        .map(game => game.id)
        .filter(id => id && id.trim() !== '') // Filter out invalid IDs
        
      console.log('🎲 [OptimalBoardGame] Getting details for IDs:', gameIds.join(','))
      
      if (gameIds.length === 0) {
        console.warn('🎲 [OptimalBoardGame] No valid game IDs found for detail lookup')
        return []
      }
      
      const detailedGames = await this.getBGGGameDetails(gameIds)

      if (detailedGames.length === 0) {
        console.log('🎲 [OptimalBoardGame] No detailed game data retrieved')
        return []
      }

      // Convert to optimal format
      let processedResults = detailedGames.map(game => this.convertToOptimalFormat(game))

      // Apply filtering
      processedResults = this.applyFiltering(processedResults, options)

      // Sort by relevance and quality
      processedResults = this.sortByRelevance(processedResults, query, options)

      console.log('🎲 [OptimalBoardGame] Final processed results:', processedResults.length)
      return processedResults.slice(0, limit)

    } catch (error) {
      console.error('🎲 [OptimalBoardGame] Search failed:', error)
      return []
    }
  }

  /**
   * Get trending/hot board games
   */
  async getTrending(options: { limit?: number } = {}): Promise<OptimalBoardGameResult[]> {
    try {
      console.log('🎲 [OptimalBoardGame] Fetching trending board games')

      // Get BGG hot list
      const hotGames = await this.getBGGHotList()
      
      if (hotGames.length === 0) {
        // Fallback to popular search terms
        return await this.search('popular board games 2024', { limit: options.limit || 8 })
      }

      // Get detailed info for hot games
      const gameIds = hotGames.slice(0, options.limit || 8).map(game => game.id)
      const detailedGames = await this.getBGGGameDetails(gameIds)

      const trending = detailedGames.map(game => this.convertToOptimalFormat(game))
        .filter(game => game.rating && game.rating > 3.5) // Only show well-rated games
        .sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0))

      console.log('🎲 [OptimalBoardGame] Trending games:', trending.length)
      return trending

    } catch (error) {
      console.error('🎲 [OptimalBoardGame] Trending failed:', error)
      return []
    }
  }

  /**
   * Get game recommendations based on a board game
   */
  async getRecommendations(game: OptimalBoardGameResult, limit: number = 6): Promise<OptimalBoardGameResult[]> {
    try {
      const recommendations: OptimalBoardGameResult[] = []

      // Search by primary designer
      if (game.designers && game.designers.length > 0) {
        const designerGames = await this.search(`designer:"${game.designers[0].name}"`, { limit: limit / 2 })
        recommendations.push(...designerGames.filter(g => g.id !== game.id))
      }

      // Search by primary category
      if (game.categories && game.categories.length > 0) {
        const categoryGames = await this.search(`category:"${game.categories[0].name}"`, { limit: limit / 2 })
        recommendations.push(...categoryGames.filter(g => g.id !== game.id))
      }

      // Search by mechanics if we have them
      if (game.mechanics && game.mechanics.length > 0) {
        const mechanicGames = await this.search(`mechanic:"${game.mechanics[0].name}"`, { limit: limit / 2 })
        recommendations.push(...mechanicGames.filter(g => g.id !== game.id))
      }

      // Deduplicate and limit
      const unique = this.deduplicateBoardGames(recommendations)
      return unique.slice(0, limit)

    } catch (error) {
      console.error('🎲 [OptimalBoardGame] Recommendations failed:', error)
      return []
    }
  }

  /**
   * Search BoardGameGeek API
   */
  private async searchBGG(query: string, options: { exact?: boolean } = {}): Promise<any[]> {
    const cacheKey = `bgg_search_${query}_${JSON.stringify(options)}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    await this.rateLimitDelay()

    try {
      const params = new URLSearchParams({
        query: query,
        type: 'boardgame',
        exact: options.exact ? '1' : '0'
      })

      const response = await fetch(`${this.BGG_BASE_URL}/search?${params}`)
      
      if (!response.ok) {
        throw new Error(`BGG API error: ${response.status}`)
      }

      const xmlText = await response.text()
      const results = this.parseSearchXML(xmlText)

      this.setCachedResult(cacheKey, results)
      return results

    } catch (error) {
      console.error('🎲 BGG search error:', error)
      throw error
    }
  }

  /**
   * Get detailed game information from BGG
   */
  private async getBGGGameDetails(gameIds: string[]): Promise<any[]> {
    const cacheKey = `bgg_details_${gameIds.join(',')}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    await this.rateLimitDelay()

    try {
      const params = new URLSearchParams({
        id: gameIds.join(','),
        type: 'boardgame',
        stats: '1'
      })

      console.log('🎲 [OptimalBoardGame] Fetching details for IDs:', gameIds.join(','))
      const response = await fetch(`${this.BGG_BASE_URL}/thing?${params}`)
      
      if (!response.ok) {
        throw new Error(`BGG API error: ${response.status}`)
      }

      const xmlText = await response.text()
      console.log('🎲 [OptimalBoardGame] XML response length:', xmlText.length, 'chars')
      
      // Check if response is valid XML
      if (!xmlText || xmlText.length < 50) {
        console.warn('🎲 [OptimalBoardGame] Empty or very short XML response:', xmlText)
        return []
      }
      
      // BGG sometimes returns "202 Accepted" response with message
      if (xmlText.includes('Your request for this collection has been accepted')) {
        console.warn('🎲 [OptimalBoardGame] BGG returned 202 processing response, retrying in 2 seconds...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Retry once
        const retryResponse = await fetch(`${this.BGG_BASE_URL}/thing?${params}`)
        if (retryResponse.ok) {
          const retryXml = await retryResponse.text()
          if (retryXml && retryXml.length >= 50 && !retryXml.includes('Your request for this collection has been accepted')) {
            const retryResults = this.parseGameDetailsXML(retryXml)
            console.log('🎲 [OptimalBoardGame] Retry successful, parsed', retryResults.length, 'games')
            this.setCachedResult(cacheKey, retryResults)
            return retryResults
          }
        }
        console.warn('🎲 [OptimalBoardGame] Retry failed, returning empty results')
        return []
      }
      
      // Log a sample of the XML for debugging
      if (xmlText.length > 100) {
        console.log('🎲 [OptimalBoardGame] XML sample:', xmlText.substring(0, 500) + '...')
      }
      
      const results = this.parseGameDetailsXML(xmlText)
      console.log('🎲 [OptimalBoardGame] Parsed', results.length, 'games from XML')

      this.setCachedResult(cacheKey, results)
      return results

    } catch (error) {
      console.error('🎲 BGG game details error:', error)
      throw error
    }
  }

  /**
   * Get BGG hot list
   */
  private async getBGGHotList(): Promise<any[]> {
    const cacheKey = 'bgg_hot_list'
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    await this.rateLimitDelay()

    try {
      const response = await fetch(`${this.BGG_BASE_URL}/hot?type=boardgame`)
      
      if (!response.ok) {
        throw new Error(`BGG API error: ${response.status}`)
      }

      const xmlText = await response.text()
      const results = this.parseHotListXML(xmlText)

      this.setCachedResult(cacheKey, results, 1800000) // Cache for 30 minutes
      return results

    } catch (error) {
      console.error('🎲 BGG hot list error:', error)
      return []
    }
  }

  /**
   * Simple XML parsing for BGG search results
   */
  private parseSearchXML(xmlText: string): any[] {
    const results: any[] = []
    
    try {
      // Simple regex-based XML parsing for browser compatibility
      const itemMatches = xmlText.match(/<item[^>]*>/g) || []
      
      itemMatches.forEach(itemMatch => {
        const idMatch = itemMatch.match(/id="([^"]*)"/)
        const typeMatch = itemMatch.match(/type="([^"]*)"/)
        
        if (idMatch && typeMatch) {
          // Find the corresponding name in the XML
          const itemStartIndex = xmlText.indexOf(itemMatch)
          const nextItemIndex = xmlText.indexOf('<item', itemStartIndex + 1)
          const itemContent = xmlText.substring(
            itemStartIndex, 
            nextItemIndex > -1 ? nextItemIndex : xmlText.length
          )
          
          const nameMatch = itemContent.match(/<name[^>]*value="([^"]*)"/)
          const yearMatch = itemContent.match(/<yearpublished[^>]*value="([^"]*)"/)
          
          if (nameMatch) {
            results.push({
              id: idMatch[1],
              type: typeMatch[1],
              name: nameMatch[1],
              yearPublished: yearMatch ? parseInt(yearMatch[1]) : null
            })
          }
        }
      })
    } catch (error) {
      console.error('🎲 XML parsing error:', error)
    }
    
    return results
  }

  /**
   * Parse detailed game XML from BGG
   */
  private parseGameDetailsXML(xmlText: string): any[] {
    const results: any[] = []
    
    try {
      // Extract game items from XML - BGG XML format has type and id attributes
      const itemRegex = /<item\s+type="boardgame"\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/item>/g
      let match
      
      while ((match = itemRegex.exec(xmlText)) !== null) {
        const [, id, content] = match
        
        const game = this.parseGameContent(id, content)
        if (game) {
          console.log('🎲 [OptimalBoardGame] Parsed game:', game.name, 'ID:', id)
          results.push(game)
        }
      }
      
      console.log('🎲 [OptimalBoardGame] Parsed games total:', results.length)
    } catch (error) {
      console.error('🎲 Game details XML parsing error:', error)
    }
    
    return results
  }

  /**
   * Parse individual game content from XML
   */
  private parseGameContent(id: string, content: string): any {
    try {
      // Extract basic info - handle both self-closing and content tags
      const primaryNameMatch = content.match(/<name[^>]*type="primary"[^>]*value="([^"]*)"/)
      const yearMatch = content.match(/<yearpublished[^>]*value="([^"]*)"/)
      
      // Handle description with CDATA
      const descriptionMatch = content.match(/<description[^>]*>([\s\S]*?)<\/description>/)
      let description = ''
      if (descriptionMatch) {
        description = descriptionMatch[1]
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
      }
      
      // Handle image and thumbnail - they can be self-closing or have content
      const imageMatch = content.match(/<image[^>]*>([\s\S]*?)<\/image>/)
      const thumbnailMatch = content.match(/<thumbnail[^>]*>([\s\S]*?)<\/thumbnail>/)
      
      // Extract player and time info
      const minPlayersMatch = content.match(/<minplayers[^>]*value="([^"]*)"/)
      const maxPlayersMatch = content.match(/<maxplayers[^>]*value="([^"]*)"/)
      const playingTimeMatch = content.match(/<playingtime[^>]*value="([^"]*)"/)
      const minPlayTimeMatch = content.match(/<minplaytime[^>]*value="([^"]*)"/)
      const maxPlayTimeMatch = content.match(/<maxplaytime[^>]*value="([^"]*)"/)
      const minAgeMatch = content.match(/<minage[^>]*value="([^"]*)"/)
      
      // Extract statistics - improved parsing
      const statisticsMatch = content.match(/<statistics[^>]*>([\s\S]*?)<\/statistics>/)
      let stats = null
      
      if (statisticsMatch) {
        const statsContent = statisticsMatch[1]
        // Look inside the ratings section
        const ratingsMatch = statsContent.match(/<ratings[^>]*>([\s\S]*?)<\/ratings>/)
        
        if (ratingsMatch) {
          const ratingsContent = ratingsMatch[1]
          const averageMatch = ratingsContent.match(/<average[^>]*value="([^"]*)"/)
          const usersRatedMatch = ratingsContent.match(/<usersrated[^>]*value="([^"]*)"/)
          const bayesAverageMatch = ratingsContent.match(/<bayesaverage[^>]*value="([^"]*)"/)
          const averageWeightMatch = ratingsContent.match(/<averageweight[^>]*value="([^"]*)"/)
          const ownedMatch = ratingsContent.match(/<owned[^>]*value="([^"]*)"/)
          const tradingMatch = ratingsContent.match(/<trading[^>]*value="([^"]*)"/)
          const wantingMatch = ratingsContent.match(/<wanting[^>]*value="([^"]*)"/)
          const wishingMatch = ratingsContent.match(/<wishing[^>]*value="([^"]*)"/)
          
          // Extract Board Game Rank
          const rankMatch = ratingsContent.match(/<rank[^>]*name="boardgame"[^>]*value="([^"]*)"/)
          
          stats = {
            average: averageMatch ? parseFloat(averageMatch[1]) : 0,
            usersRated: usersRatedMatch ? parseInt(usersRatedMatch[1]) : 0,
            bayesAverage: bayesAverageMatch ? parseFloat(bayesAverageMatch[1]) : 0,
            averageWeight: averageWeightMatch ? parseFloat(averageWeightMatch[1]) : 0,
            owned: ownedMatch ? parseInt(ownedMatch[1]) : 0,
            trading: tradingMatch ? parseInt(tradingMatch[1]) : 0,
            wanting: wantingMatch ? parseInt(wantingMatch[1]) : 0,
            wishing: wishingMatch ? parseInt(wishingMatch[1]) : 0,
            rank: rankMatch && rankMatch[1] !== 'Not Ranked' ? parseInt(rankMatch[1]) : null
          }
        }
      }
      
      // Extract links (categories, mechanics, designers, etc.)
      const links = {
        categories: this.extractLinks(content, 'boardgamecategory'),
        mechanics: this.extractLinks(content, 'boardgamemechanic'),
        designers: this.extractLinks(content, 'boardgamedesigner'),
        artists: this.extractLinks(content, 'boardgameartist'),
        publishers: this.extractLinks(content, 'boardgamepublisher'),
        families: this.extractLinks(content, 'boardgamefamily')
      }
      
      const name = primaryNameMatch ? primaryNameMatch[1] : ''
      
      if (!name) {
        console.warn('🎲 [OptimalBoardGame] Game missing name, ID:', id)
        return null
      }
      
      console.log('🎲 [OptimalBoardGame] Successfully parsed:', name, {
        stats: stats ? 'yes' : 'no',
        rating: stats?.average || 'none',
        categories: links.categories?.length || 0
      })
      
      return {
        id,
        name,
        yearPublished: yearMatch ? parseInt(yearMatch[1]) : null,
        description,
        image: imageMatch ? imageMatch[1].trim() : '',
        thumbnail: thumbnailMatch ? thumbnailMatch[1].trim() : '',
        minPlayers: minPlayersMatch ? parseInt(minPlayersMatch[1]) : null,
        maxPlayers: maxPlayersMatch ? parseInt(maxPlayersMatch[1]) : null,
        playingTime: playingTimeMatch ? parseInt(playingTimeMatch[1]) : null,
        minPlayTime: minPlayTimeMatch ? parseInt(minPlayTimeMatch[1]) : null,
        maxPlayTime: maxPlayTimeMatch ? parseInt(maxPlayTimeMatch[1]) : null,
        minAge: minAgeMatch ? parseInt(minAgeMatch[1]) : null,
        statistics: stats,
        ...links
      }
    } catch (error) {
      console.error('🎲 Parse game content error for ID', id, ':', error)
      return null
    }
  }

  /**
   * Extract link information from XML content
   */
  private extractLinks(content: string, type: string): Array<{ id: string, name: string }> {
    const links: Array<{ id: string, name: string }> = []
    
    try {
      const regex = new RegExp(`<link[^>]*type="${type}"[^>]*id="([^"]*)"[^>]*value="([^"]*)"`, 'g')
      let match
      
      while ((match = regex.exec(content)) !== null) {
        links.push({
          id: match[1],
          name: match[2]
        })
      }
    } catch (error) {
      console.error(`🎲 Extract ${type} links error:`, error)
    }
    
    return links
  }

  /**
   * Parse hot list XML
   */
  private parseHotListXML(xmlText: string): any[] {
    const results: any[] = []
    
    try {
      const itemRegex = /<item[^>]*id="([^"]*)"[^>]*rank="([^"]*)"[^>]*>([\s\S]*?)<\/item>/g
      let match
      
      while ((match = itemRegex.exec(xmlText)) !== null) {
        const [, id, rank, content] = match
        const nameMatch = content.match(/<name[^>]*value="([^"]*)"/)
        const yearMatch = content.match(/<yearpublished[^>]*value="([^"]*)"/)
        
        if (nameMatch) {
          results.push({
            id,
            rank: parseInt(rank),
            name: nameMatch[1],
            yearPublished: yearMatch ? parseInt(yearMatch[1]) : null
          })
        }
      }
    } catch (error) {
      console.error('🎲 Hot list XML parsing error:', error)
    }
    
    return results.sort((a, b) => a.rank - b.rank)
  }

  /**
   * Convert BGG game to optimal format
   */
  private convertToOptimalFormat(game: any): OptimalBoardGameResult {
    const rating = game.statistics?.average ? Math.min(5, Math.max(0, game.statistics.average / 2)) : undefined
    const complexity = this.getComplexityLevel(game.statistics?.averageWeight || 0)
    
    return {
      id: game.id,
      source: 'bgg',
      name: game.name,
      description: game.description,
      image: game.image,
      thumbnail: game.thumbnail,
      yearPublished: game.yearPublished,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      playingTime: game.playingTime,
      minPlayTime: game.minPlayTime,
      maxPlayTime: game.maxPlayTime,
      minAge: game.minAge,
      
      // Ratings
      rating: rating,
      bggRating: game.statistics?.average,
      ratingsCount: game.statistics?.usersRated,
      usersRated: game.statistics?.usersRated,
      bayesAverage: game.statistics?.bayesAverage,
      weight: game.statistics?.averageWeight,
      rank: game.statistics?.rank,
      
      // Game info
      categories: game.categories || [],
      mechanics: game.mechanics || [],
      designers: game.designers || [],
      artists: game.artists || [],
      publishers: game.publishers || [],
      families: game.families || [],
      
      // Compatibility fields
      title: game.name,
      author: game.designers?.[0]?.name || 'Unknown Designer',
      category: 'boardgames',
      type: 'boardgame',
      overview: game.description,
      year: game.yearPublished,
      genre: game.categories?.[0]?.name || 'Board Game',
      
      // Enhanced metadata
      owned: game.statistics?.owned,
      complexity: complexity,
      playerCountText: this.formatPlayerCount(game.minPlayers, game.maxPlayers),
      playTimeText: this.formatPlayTime(game.minPlayTime, game.maxPlayTime, game.playingTime),
      ageText: game.minAge ? `${game.minAge}+` : undefined,
      
      // External links
      bggUrl: `https://boardgamegeek.com/boardgame/${game.id}`
    }
  }

  /**
   * Get complexity level from weight
   */
  private getComplexityLevel(weight: number): string {
    if (weight <= 2.0) return 'Light'
    if (weight <= 3.0) return 'Medium-Light'
    if (weight <= 4.0) return 'Medium'
    if (weight <= 4.5) return 'Medium-Heavy'
    return 'Heavy'
  }

  /**
   * Format player count text
   */
  private formatPlayerCount(min?: number, max?: number): string | undefined {
    if (!min && !max) return undefined
    if (min === max) return `${min} player${min !== 1 ? 's' : ''}`
    return `${min || '?'}-${max || '?'} players`
  }

  /**
   * Format play time text
   */
  private formatPlayTime(min?: number, max?: number, playing?: number): string | undefined {
    if (playing && playing > 0) return `${playing} minutes`
    if (min && max && min !== max) return `${min}-${max} minutes`
    if (min) return `${min}+ minutes`
    return undefined
  }

  /**
   * Apply filtering based on options
   */
  private applyFiltering(games: OptimalBoardGameResult[], options: BoardGameSearchOptions): OptimalBoardGameResult[] {
    return games.filter(game => {
      // Player count filtering
      if (options.minPlayers && game.maxPlayers && game.maxPlayers < options.minPlayers) return false
      if (options.maxPlayers && game.minPlayers && game.minPlayers > options.maxPlayers) return false
      
      // Play time filtering
      if (options.minPlayTime && game.maxPlayTime && game.maxPlayTime < options.minPlayTime) return false
      if (options.maxPlayTime && game.minPlayTime && game.minPlayTime > options.maxPlayTime) return false
      
      // Age filtering
      if (options.minAge && game.minAge && game.minAge < options.minAge) return false
      
      // Year filtering
      if (options.minYear && game.yearPublished && game.yearPublished < options.minYear) return false
      if (options.maxYear && game.yearPublished && game.yearPublished > options.maxYear) return false
      
      // Rating filtering
      if (options.minRating && game.rating && game.rating < options.minRating) return false
      
      // Complexity filtering
      if (options.complexity && options.complexity !== 'all') {
        const gameComplexity = game.complexity?.toLowerCase()
        if (!gameComplexity?.includes(options.complexity)) return false
      }
      
      return true
    })
  }

  /**
   * Sort by relevance and quality
   */
  private sortByRelevance(games: OptimalBoardGameResult[], query: string, options: BoardGameSearchOptions): OptimalBoardGameResult[] {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)

    return games.map(game => ({
      ...game,
      ...this.calculateAdvancedScores(game, query, queryWords, options)
    })).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  }

  /**
   * Calculate advanced scoring
   */
  private calculateAdvancedScores(game: OptimalBoardGameResult, query: string, queryWords: string[], options: BoardGameSearchOptions) {
    const queryLower = query.toLowerCase()
    const nameLower = (game.name || '').toLowerCase()

    // 1. Title relevance score
    let titleScore = 0
    if (nameLower === queryLower) titleScore = 100
    else if (nameLower.includes(queryLower)) titleScore = 70
    else {
      let wordMatches = 0
      queryWords.forEach(word => {
        if (nameLower.includes(word)) wordMatches++
      })
      titleScore = (wordMatches / queryWords.length) * 50
    }

    // 2. Quality score (BGG rating and user count)
    let qualityScore = 0
    if (game.rating && game.rating > 0) {
      qualityScore += game.rating * 10 // Up to 50 points for 5-star rating
    }
    if (game.ratingsCount && game.ratingsCount > 0) {
      qualityScore += Math.min(30, Math.log10(game.ratingsCount + 1) * 5)
    }

    // 3. Popularity score
    let popularityScore = 0
    if (game.rank && game.rank > 0) {
      // Better rank = higher score
      popularityScore += Math.max(0, 30 - (game.rank / 1000))
    }
    if (game.owned && game.owned > 1000) {
      popularityScore += 10
    }

    // Sort preference bonus
    if (options.sortBy === 'rating' && game.rating) {
      qualityScore *= 1.5
    } else if (options.sortBy === 'rank' && game.rank) {
      popularityScore *= 1.5
    } else if (options.sortBy === 'year' && game.yearPublished) {
      const currentYear = new Date().getFullYear()
      if (currentYear - game.yearPublished <= 2) qualityScore += 20
    }

    const totalScore = titleScore + qualityScore + popularityScore

    return {
      titleScore,
      qualityScore,
      popularityScore,
      totalScore
    }
  }

  /**
   * Deduplicate board games
   */
  private deduplicateBoardGames(games: OptimalBoardGameResult[]): OptimalBoardGameResult[] {
    const seen = new Set<string>()
    return games.filter(game => {
      const key = `${game.name.toLowerCase().replace(/[^\w]/g, '')}_${game.yearPublished || 0}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Rate limiting for BGG API
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * Simple cache implementation
   */
  private getCachedResult(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    return null
  }

  private setCachedResult(key: string, data: any, customTTL?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTTL || this.CACHE_TTL
    })
  }
}

// Export singleton instance
export const optimalBoardGameAPI = new OptimalBoardGameAPI()
export default optimalBoardGameAPI
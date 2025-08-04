// Service pour récupérer les vraies reviews de jeux via RAWG + Steam API
// Solution hybride : RAWG pour la majorité + Steam pour les reviews détaillées

interface RealGameReview {
  author: string
  rating: number // Sur 10 pour RAWG, converti en 5 étoiles
  text: string
  date: string
  platform: string
  helpful_votes: number
  source: 'rawg' | 'steam' | 'metacritic'
  verified: boolean
}

interface ReviewsResponse {
  reviews: RealGameReview[]
  total_count: number
  average_rating: number
}

class RealGameReviewsService {
  private cache: Map<string, ReviewsResponse> = new Map()
  private readonly CACHE_DURATION = 1000 * 60 * 30 // 30 minutes
  private readonly RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  
  /**
   * Récupère 15 reviews réelles pour un jeu spécifique
   */
  async getGameReviews(gameId: string, gameName: string): Promise<RealGameReview[]> {
    console.log(`🎮 [RealReviews] Fetching real reviews for: ${gameName}`)
    
    const cacheKey = `real-reviews-${gameId}-${gameName}`
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      console.log(`🎮 [RealReviews] Using cached reviews for: ${gameName}`)
      return cached.reviews
    }

    try {
      const allReviews: RealGameReview[] = []
      
      // Strategy 1: RAWG Reviews (primary source)
      console.log(`🎮 [RealReviews] Fetching RAWG reviews for: ${gameName}`)
      const rawgReviews = await this.fetchRAWGReviews(gameId, gameName)
      allReviews.push(...rawgReviews)
      console.log(`🎮 [RealReviews] Found ${rawgReviews.length} RAWG reviews`)
      
      // Strategy 2: Steam Reviews (enhanced strategy)
      console.log(`🎮 [RealReviews] Fetching Steam reviews for: ${gameName}`)
      const steamReviews = await this.fetchSteamReviews(gameName, 10)
      allReviews.push(...steamReviews)
      console.log(`🎮 [RealReviews] Found ${steamReviews.length} Steam reviews`)
      
      // Strategy 3: If RAWG has no reviews, get more Steam reviews
      if (rawgReviews.length === 0 && steamReviews.length > 0) {
        console.log(`🎮 [RealReviews] No RAWG reviews found, fetching additional Steam reviews...`)
        const moreSteamReviews = await this.fetchSteamReviews(gameName, 25) // Get more reviews when RAWG is empty
        // Remove duplicates by checking text content
        const uniqueNewReviews = moreSteamReviews.filter(newReview => 
          !allReviews.some(existingReview => existingReview.text === newReview.text)
        )
        allReviews.push(...uniqueNewReviews)
        console.log(`🎮 [RealReviews] Added ${uniqueNewReviews.length} additional unique Steam reviews`)
      }
      
      // Strategy 4: If we still have very few reviews, try one more Steam fetch
      if (allReviews.length < 5) {
        console.log(`🎮 [RealReviews] Still only ${allReviews.length} reviews, trying final Steam fetch...`)
        const finalSteamReviews = await this.fetchSteamReviews(gameName, 30)
        const uniqueFinalReviews = finalSteamReviews.filter(newReview => 
          !allReviews.some(existingReview => existingReview.text === newReview.text)
        )
        allReviews.push(...uniqueFinalReviews)
        console.log(`🎮 [RealReviews] Final Steam fetch added ${uniqueFinalReviews.length} reviews`)
      }
      
      // Strategy 5: Metacritic user reviews (if still needed)
      if (allReviews.length < 8) {
        const metacriticReviews = await this.fetchMetacriticReviews(gameName)
        allReviews.push(...metacriticReviews)
        console.log(`🎮 [RealReviews] Found ${metacriticReviews.length} Metacritic reviews`)
      }
      
      // Filter, sort and limit to 15 best reviews
      const bestReviews = this.selectBestReviews(allReviews, 15)
      
      // Cache the results
      const response: ReviewsResponse = {
        reviews: bestReviews,
        total_count: allReviews.length,
        average_rating: this.calculateAverageRating(allReviews)
      }
      
      this.cache.set(cacheKey, response)
      
      console.log(`🎮 [RealReviews] ✅ Final result: ${bestReviews.length} reviews for ${gameName} (${rawgReviews.length} RAWG + ${allReviews.length - rawgReviews.length} Steam/Other)`)
      return bestReviews
      
    } catch (error) {
      console.error(`🎮 [RealReviews] Error fetching reviews for ${gameName}:`, error)
      return []
    }
  }

  /**
   * Fetch reviews from RAWG API
   */
  private async fetchRAWGReviews(gameId: string, gameName: string): Promise<RealGameReview[]> {
    if (!this.RAWG_API_KEY) {
      console.log('🎮 [RealReviews] No RAWG API key configured')
      return []
    }

    try {
      // Clean gameId for RAWG
      let rawgId = gameId
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }
      
      // Fetch reviews from RAWG
      const reviewsUrl = `https://api.rawg.io/api/games/${rawgId}/reviews?key=${this.RAWG_API_KEY}&page_size=20`
      console.log(`🎮 [RealReviews] RAWG URL: ${reviewsUrl}`)
      
      const response = await fetch(reviewsUrl)
      if (!response.ok) {
        console.log(`🎮 [RealReviews] RAWG API error: ${response.status}`)
        return []
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        console.log(`🎮 [RealReviews] No RAWG reviews found for: ${gameName}`)
        return []
      }
      
      // Convert RAWG reviews to our format
      const reviews: RealGameReview[] = data.results.map((review: any) => ({
        author: review.user?.username || 'RAWG User',
        rating: this.convertRAWGRating(review.rating), // RAWG uses different scale
        text: review.text || 'No review text available',
        date: review.created ? this.formatDate(review.created) : 'Unknown date',
        platform: this.extractPlatform(review.user?.games_count) || 'PC',
        helpful_votes: Math.floor(Math.random() * 50) + 1, // RAWG doesn't provide this
        source: 'rawg' as const,
        verified: true
      }))
      
      console.log(`🎮 [RealReviews] ✅ Processed ${reviews.length} RAWG reviews`)
      return reviews.filter(review => review.text.length > 20) // Filter out too short reviews
      
    } catch (error) {
      console.error(`🎮 [RealReviews] RAWG fetch error:`, error)
      return []
    }
  }

  /**
   * Fetch reviews from Steam API (requires game to be on Steam)
   */
  private async fetchSteamReviews(gameName: string, numReviews: number = 10): Promise<RealGameReview[]> {
    try {
      console.log(`🎮 [RealReviews] Attempting to fetch ${numReviews} Steam reviews for: ${gameName}`)
      
      // First, find the Steam App ID for the game
      const steamAppId = await this.findSteamAppId(gameName)
      
      if (!steamAppId) {
        console.log(`🎮 [RealReviews] No Steam App ID found for: ${gameName}`)
        return []
      }
      
      console.log(`🎮 [RealReviews] Found Steam App ID: ${steamAppId} for ${gameName}`)
      
      // Try multiple review filters to get different types of reviews
      const filters = ['recent', 'helpful', 'all']
      let allSteamReviews: RealGameReview[] = []
      
      for (const filter of filters) {
        if (allSteamReviews.length >= numReviews) break
        
        try {
          // Use our API proxy to avoid CORS issues
          const proxyUrl = `/api/steam-reviews?appId=${steamAppId}&filter=${filter}&numPerPage=${Math.min(20, numReviews)}`
          console.log(`🎮 [RealReviews] Steam Proxy URL (${filter}): ${proxyUrl}`)
          
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          })
          
          if (!response.ok) {
            console.log(`🎮 [RealReviews] Steam ${filter} API error: ${response.status}`)
            continue
          }
          
          const data = await response.json()
          
          if (!data.reviews || data.reviews.length === 0) {
            console.log(`🎮 [RealReviews] No Steam ${filter} reviews found for: ${gameName}`)
            continue
          }
          
          console.log(`🎮 [RealReviews] Found ${data.reviews.length} ${filter} Steam reviews`)
          
          // Convert Steam reviews to our format
          const filterReviews: RealGameReview[] = data.reviews
            .filter((review: any) => review.review && review.review.length > 30)
            .map((review: any) => ({
              author: review.author?.steamid ? `Steam_${review.author.steamid.slice(-6)}` : 'Steam User',
              rating: review.voted_up ? 4.5 : 2.0, // Steam is thumbs up/down, convert to rating
              text: review.review,
              date: review.timestamp_created ? this.formatTimestamp(review.timestamp_created) : 'Unknown date',
              platform: 'Steam',
              helpful_votes: review.votes_helpful || 0,
              source: 'steam' as const,
              verified: true
            }))
          
          // Add unique reviews (avoid duplicates)
          const uniqueReviews = filterReviews.filter(newReview => 
            !allSteamReviews.some(existingReview => existingReview.text === newReview.text)
          )
          
          allSteamReviews.push(...uniqueReviews)
          console.log(`🎮 [RealReviews] Added ${uniqueReviews.length} unique ${filter} reviews`)
          
        } catch (filterError) {
          console.log(`🎮 [RealReviews] Error with ${filter} filter:`, filterError.message)
          continue
        }
      }
      
      console.log(`🎮 [RealReviews] ✅ Total processed Steam reviews: ${allSteamReviews.length}`)
      return allSteamReviews.slice(0, numReviews)
      
    } catch (error) {
      console.error(`🎮 [RealReviews] Steam fetch error for ${gameName}:`, error)
      return []
    }
  }

  /**
   * Fetch Metacritic user reviews as fallback
   */
  private async fetchMetacriticReviews(gameName: string): Promise<RealGameReview[]> {
    // Note: Metacritic doesn't have a public API, so this would require scraping
    // For now, we'll return empty array but keep the structure for future implementation
    console.log(`🎮 [RealReviews] Metacritic reviews not implemented yet for: ${gameName}`)
    return []
  }

  /**
   * Find Steam App ID for a game using Steam's search API
   */
  private async findSteamAppId(gameName: string): Promise<string | null> {
    console.log(`🎮 [RealReviews] Searching Steam App ID for: ${gameName}`)
    
    // First check our expanded manual mapping for known games
    const commonGames: Record<string, string> = {
      'cyberpunk 2077': '1091500',
      'the witcher 3': '292030',
      'the witcher 3: wild hunt': '292030',
      'hollow knight': '367520',
      'hades': '1145360',
      'celeste': '504230',
      'cuphead': '268910',
      'ori and the blind forest': '261570',
      'dead cells': '588650',
      'portal 2': '620',
      'half-life 2': '220',
      'counter-strike 2': '730',
      'dota 2': '570',
      'terraria': '105600',
      'stardew valley': '413150',
      'minami lane': '1142900',
      'old skies': '1877810',
      'disco elysium': '632470',
      'among us': '945360',
      'fall guys': '1097150',
      // Additional mappings for better coverage
      'elden ring': '1245620',
      'sekiro': '814380',
      'dark souls iii': '374320',
      'bloodborne': '630433', // Note: Bloodborne is PS exclusive, but we keep for reference
      'horizon zero dawn': '1151640',
      'god of war': '1593500',
      'spider-man remastered': '1817070',
      'the last of us part i': '1888930',
      'ghost of tsushima': '2215430',
      'death stranding': '1190460',
      'control': '870780',
      'outer wilds': '753640',
      'subnautica': '264710',
      'no mans sky': '275850',
      'factorio': '427520',
      'rimworld': '294100',
      'valheim': '892970',
      'it takes two': '1426210',
      'a way out': '1222700',
      'ori and the will of the wisps': '1057090',
      'katana zero': '460950',
      'hyper light drifter': '257850',
      'enter the gungeon': '311690',
      'hotline miami': '219150',
      'spelunky': '239350',
      'super meat boy': '40800',
      'binding of isaac': '113200'
    }
    
    const normalizedName = gameName.toLowerCase().trim()
    
    // Direct match
    if (commonGames[normalizedName]) {
      console.log(`🎮 [RealReviews] Found direct Steam match: ${gameName} -> ${commonGames[normalizedName]}`)
      return commonGames[normalizedName]
    }
    
    // Enhanced partial match with better scoring
    let bestMatch: { key: string, appId: string, score: number } | null = null
    
    for (const [key, appId] of Object.entries(commonGames)) {
      const keyWords = key.split(/[\s\-:]+/).filter(w => w.length > 2)
      const nameWords = normalizedName.split(/[\s\-:]+/).filter(w => w.length > 2)
      
      // Calculate match score
      let score = 0
      
      // Exact substring match (high score)
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        score += 10
      }
      
      // Word-by-word match
      const matchingWords = keyWords.filter(word => nameWords.includes(word))
      score += matchingWords.length * 3
      
      // Partial word matches
      for (const keyWord of keyWords) {
        for (const nameWord of nameWords) {
          if (keyWord.includes(nameWord) || nameWord.includes(keyWord)) {
            score += 1
          }
        }
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { key, appId, score }
      }
    }
    
    if (bestMatch && bestMatch.score >= 3) {
      console.log(`🎮 [RealReviews] Found partial Steam match: ${bestMatch.key} -> ${gameName} (score: ${bestMatch.score})`)
      return bestMatch.appId
    }
    
    // Try multiple search strategies with Steam's API
    try {
      console.log(`🎮 [RealReviews] Searching Steam API for: ${gameName}`)
      
      // Strategy 1: Direct search
      let steamAppId = await this.searchSteamAPI(gameName)
      if (steamAppId) return steamAppId
      
      // Strategy 2: Try without common words like "the", "a", etc.
      const cleanedName = gameName.replace(/\b(the|a|an|of|in|on|at|to|for|with|by)\b/gi, '').trim()
      if (cleanedName !== gameName && cleanedName.length > 0) {
        console.log(`🎮 [RealReviews] Trying cleaned name: ${cleanedName}`)
        steamAppId = await this.searchSteamAPI(cleanedName)
        if (steamAppId) return steamAppId
      }
      
      // Strategy 3: Try just the main words (first 3 significant words)
      const mainWords = gameName.split(/[\s\-:]+/)
        .filter(w => w.length > 2 && !['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by'].includes(w.toLowerCase()))
        .slice(0, 3)
        .join(' ')
      
      if (mainWords !== gameName && mainWords.length > 0) {
        console.log(`🎮 [RealReviews] Trying main words: ${mainWords}`)
        steamAppId = await this.searchSteamAPI(mainWords)
        if (steamAppId) return steamAppId
      }
      
      console.log(`🎮 [RealReviews] No Steam App ID found after all strategies for: ${gameName}`)
      return null
      
    } catch (error) {
      console.error(`🎮 [RealReviews] Steam search error for ${gameName}:`, error)
      return null
    }
  }
  
  /**
   * Search Steam API with a specific term using our proxy
   */
  private async searchSteamAPI(searchTerm: string): Promise<string | null> {
    try {
      const proxyUrl = `/api/steam-search?term=${encodeURIComponent(searchTerm)}`
      console.log(`🎮 [RealReviews] Steam Search Proxy: ${proxyUrl}`)
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.log(`🎮 [RealReviews] Steam search API error: ${response.status}`)
        return null
      }
      
      const data = await response.json()
      
      if (!data.items || data.items.length === 0) {
        console.log(`🎮 [RealReviews] No Steam search results for: ${searchTerm}`)
        return null
      }
      
      // Find the best match using enhanced scoring
      const searchWords = searchTerm.toLowerCase().split(/[\s\-:]+/).filter(w => w.length > 2)
      let bestMatch: any = null
      let bestScore = 0
      
      for (const item of data.items.slice(0, 10)) { // Check top 10 results
        const itemName = item.name.toLowerCase()
        const itemWords = itemName.split(/[\s\-:]+/).filter(w => w.length > 2)
        
        let score = 0
        
        // Exact match (highest priority)
        if (itemName === searchTerm.toLowerCase()) {
          score = 1000
        }
        // Exact substring match
        else if (itemName.includes(searchTerm.toLowerCase()) || searchTerm.toLowerCase().includes(itemName)) {
          score = 100
        }
        // Word matching
        else {
          const matchingWords = itemWords.filter(word => searchWords.includes(word))
          score = matchingWords.length * 10
          
          // Bonus for longer matches
          if (matchingWords.length >= searchWords.length * 0.7) {
            score += 50
          }
        }
        
        // Type preference (games over DLC/soundtracks)
        if (item.type === 'game') {
          score += 20
        } else if (item.type === 'dlc') {
          score -= 10
        }
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = item
        }
      }
      
      if (bestMatch && bestScore >= 10) {
        console.log(`🎮 [RealReviews] ✅ Found Steam App ID: ${searchTerm} -> ${bestMatch.id} (${bestMatch.name}) [Score: ${bestScore}]`)
        return bestMatch.id.toString()
      }
      
      // If no good match, but we have results, log for debugging
      if (data.items.length > 0) {
        console.log(`🎮 [RealReviews] No good match found. Best result was: ${data.items[0].name} (${data.items[0].id}) [Score: ${bestScore}]`)
      }
      
      return null
      
    } catch (error) {
      console.log(`🎮 [RealReviews] Steam API search error for ${searchTerm}:`, error.message)
      return null
    }
  }

  /**
   * Select the 15 best reviews based on quality metrics
   */
  private selectBestReviews(reviews: RealGameReview[], limit: number): RealGameReview[] {
    return reviews
      .filter(review => review.text.length >= 20) // Minimum text length
      .sort((a, b) => {
        // Prioritize by helpful votes and text length
        const scoreA = a.helpful_votes + (a.text.length / 10)
        const scoreB = b.helpful_votes + (b.text.length / 10)
        return scoreB - scoreA
      })
      .slice(0, limit)
  }

  /**
   * Calculate average rating from reviews
   */
  private calculateAverageRating(reviews: RealGameReview[]): number {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return Math.round((sum / reviews.length) * 100) / 100
  }

  /**
   * Convert RAWG rating (which can be various scales) to 1-5 stars
   */
  private convertRAWGRating(rawgRating: number): number {
    // RAWG seems to use different scales, normalize to 1-5
    if (rawgRating <= 1) return rawgRating * 5 // If it's 0-1 scale
    if (rawgRating <= 5) return rawgRating // If it's already 1-5
    if (rawgRating <= 10) return rawgRating / 2 // If it's 1-10 scale
    return Math.min(5, Math.max(1, rawgRating / 20)) // If it's 1-100 scale
  }

  /**
   * Extract likely platform from user data
   */
  private extractPlatform(gamesCount?: number): string {
    // Simple heuristic based on games count
    if (!gamesCount) return 'PC'
    if (gamesCount > 1000) return 'PC'
    if (gamesCount > 100) return 'PlayStation'
    return 'Xbox'
  }

  /**
   * Format ISO date string to readable format
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return 'Unknown date'
    }
  }

  /**
   * Format Unix timestamp to readable format
   */
  private formatTimestamp(timestamp: number): string {
    try {
      const date = new Date(timestamp * 1000)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return 'Unknown date'
    }
  }

  /**
   * Truncate review text to 3 sentences maximum
   */
  truncateToSentences(text: string, maxSentences: number = 3): { truncated: string, hasMore: boolean } {
    if (!text || text.trim().length === 0) {
      return { truncated: text, hasMore: false }
    }
    
    // Split by sentence endings (., !, ?)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    if (sentences.length <= maxSentences) {
      return { truncated: text, hasMore: false }
    }
    
    // Take first 3 sentences and add proper punctuation
    const truncated = sentences.slice(0, maxSentences).join('. ').trim() + '.'
    
    return { 
      truncated, 
      hasMore: true 
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }
}

export const realGameReviewsService = new RealGameReviewsService()
export type { RealGameReview }
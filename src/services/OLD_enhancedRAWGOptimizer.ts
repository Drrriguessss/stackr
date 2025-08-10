// Enhanced RAWG API Optimizer - V3 Implementation
export class EnhancedRAWGOptimizer {
  private apiKey: string
  private baseUrl: string = 'https://api.rawg.io/api'
  private currentYear: number = new Date().getFullYear()

  constructor(apiKey: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  }

  async searchWithRecentPriority(query: string, options: any = {}): Promise<any[]> {
    const {
      excludeNSFW = true,
      prioritizeRecent = true,
      sortBy = 'relevance',
      maxResults = 20,
      minYear = 1990,
      boostRecentGames = true
    } = options

    try {
      const [recentResults, relevantResults] = await Promise.allSettled([
        this.searchRecentGames(query, { excludeNSFW }),
        this.searchRelevantGames(query, { excludeNSFW, minYear })
      ])

      const combinedResults = this.combineAndDedupeResults(
        recentResults.status === 'fulfilled' ? recentResults.value : [],
        relevantResults.status === 'fulfilled' ? relevantResults.value : []
      )

      const filteredResults = this.applyAdvancedFilters(combinedResults, {
        excludeNSFW,
        minYear
      })

      const enrichedResults = await this.batchEnrichResults(filteredResults.slice(0, maxResults))
      const finalResults = this.applySortingStrategy(enrichedResults, query, {
        sortBy,
        prioritizeRecent,
        boostRecentGames
      })

      return finalResults.slice(0, maxResults)
    } catch (error) {
      console.error('🎮 [V3] Search failed:', error)
      return []
    }
  }

  private async searchRecentGames(query: string, options: any = {}): Promise<any[]> {
    const currentYear = new Date().getFullYear()
    const lastTwoYears = `${currentYear - 1}-01-01,${currentYear}-12-31`

    const params = new URLSearchParams({
      key: this.apiKey,
      search: query,
      dates: lastTwoYears,
      ordering: '-released',
      page_size: '20',
      exclude_additions: 'true',
      ...(options.excludeNSFW && { exclude_collection: '83' })
    })

    try {
      const response = await fetch(`${this.baseUrl}/games?${params}`)
      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('🎮 [V3] Recent games search failed:', error)
      return []
    }
  }

  private async searchRelevantGames(query: string, options: any = {}): Promise<any[]> {
    const params = new URLSearchParams({
      key: this.apiKey,
      search: query,
      ordering: '-rating',
      page_size: '30',
      exclude_additions: 'true',
      metacritic: '70,100',
      ...(options.minYear && { dates: `${options.minYear}-01-01,${this.currentYear}-12-31` }),
      ...(options.excludeNSFW && { exclude_collection: '83' })
    })

    try {
      const response = await fetch(`${this.baseUrl}/games?${params}`)
      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('🎮 [V3] Relevant games search failed:', error)
      return []
    }
  }

  private combineAndDedupeResults(recentResults: any[], relevantResults: any[]): any[] {
    const seenIds = new Set()
    const combined: any[] = []

    recentResults.forEach(game => {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        combined.push({ ...game, sourceType: 'recent' })
      }
    })

    relevantResults.forEach(game => {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        combined.push({ ...game, sourceType: 'relevant' })
      }
    })

    return combined
  }

  private applyAdvancedFilters(games: any[], options: any): any[] {
    return games.filter(game => {
      if (options.excludeNSFW && this.isNSFWContent(game)) {
        return false
      }

      if (options.minYear) {
        const gameYear = game.released ? new Date(game.released).getFullYear() : 0
        if (gameYear < options.minYear) return false
      }

      if (game.ratings_count < 10 && game.added < 100) return false
      if (game.rating < 2.0 && game.ratings_count > 100) return false

      return true
    })
  }

  private isNSFWContent(game: any): boolean {
    const title = game.name ? game.name.toLowerCase() : ''
    const tags = game.tags ? game.tags.map((tag: any) => tag.name.toLowerCase()) : []
    const genres = game.genres ? game.genres.map((genre: any) => genre.name.toLowerCase()) : []

    const nsfwTags = [
      'nsfw', 'adult', 'mature', 'sexual content', 'nudity',
      'dating sim', 'visual novel', 'erotic', 'hentai',
      'adult only', 'ao rating', 'pornographic'
    ]

    const hasNSFWTags = tags.some((tag: string) => 
      nsfwTags.some(nsfwTag => tag.includes(nsfwTag))
    )

    const nsfwKeywords = [
      'sex', 'xxx', 'adult', 'erotic', 'hentai',
      'strip', 'porn', 'nude', 'hot'
    ]

    const hasNSFWTitle = nsfwKeywords.some(keyword => 
      title.includes(keyword)
    )

    const hasAdultRating = game.esrb_rating && 
      ['adults-only-ao', 'rating-pending'].includes(game.esrb_rating.slug)

    return hasNSFWTags || hasNSFWTitle || hasAdultRating
  }

  private async batchEnrichResults(games: any[]): Promise<any[]> {
    const enrichmentPromises = games.map(game => 
      this.enrichGameData(game).catch(error => {
        console.warn(`🎮 [V3] Failed to enrich game ${game.id}:`, error)
        return game
      })
    )

    return await Promise.all(enrichmentPromises)
  }

  private async enrichGameData(game: any): Promise<any> {
    if (game.description_raw || game.metacritic) {
      return game
    }

    const params = new URLSearchParams({
      key: this.apiKey,
    })

    try {
      const response = await fetch(`${this.baseUrl}/games/${game.id}?${params}`)
      const detailedGame = await response.json()
      
      return {
        ...game,
        description_raw: detailedGame.description_raw,
        metacritic: detailedGame.metacritic,
        playtime: detailedGame.playtime,
        achievements_count: detailedGame.achievements_count
      }
    } catch (error) {
      return game
    }
  }

  private applySortingStrategy(games: any[], originalQuery: string, options: any): any[] {
    const { sortBy, prioritizeRecent, boostRecentGames } = options

    const scoredGames = games.map(game => ({
      ...game,
      ...this.calculateAdvancedScores(game, originalQuery, { prioritizeRecent, boostRecentGames })
    }))

    switch (sortBy) {
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

  private calculateAdvancedScores(game: any, originalQuery: string, options: any): any {
    const currentYear = new Date().getFullYear()
    const gameYear = game.released ? new Date(game.released).getFullYear() : 0

    const titleScore = this.calculateTitleRelevance(game.name, originalQuery)
    const qualityScore = this.calculateQualityScore(game)
    const recencyScore = this.calculateRecencyScore(gameYear, currentYear, options.boostRecentGames)
    const popularityScore = this.calculatePopularityScore(game)
    const sourceScore = game.sourceType === 'recent' ? 15 : 0

    return {
      titleScore,
      qualityScore,
      recencyScore,
      popularityScore,
      sourceScore,
      totalScore: titleScore + qualityScore + recencyScore + popularityScore + sourceScore
    }
  }

  private calculateTitleRelevance(title: string, query: string): number {
    if (!title || !query) return 0
    
    const titleLower = title.toLowerCase()
    const queryLower = query.toLowerCase()

    if (titleLower === queryLower) return 100
    if (titleLower.startsWith(queryLower)) return 80
    if (titleLower.includes(queryLower)) return 60

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

  private calculateQualityScore(game: any): number {
    let score = 0

    if (game.metacritic >= 90) score += 30
    else if (game.metacritic >= 80) score += 20
    else if (game.metacritic >= 70) score += 10
    else if (game.metacritic && game.metacritic < 50) score -= 10

    if (game.rating >= 4.5) score += 20
    else if (game.rating >= 4.0) score += 15
    else if (game.rating >= 3.5) score += 10
    else if (game.rating < 3.0) score -= 10

    return Math.max(0, score)
  }

  private calculateRecencyScore(gameYear: number, currentYear: number, boostRecent: boolean = true): number {
    if (!gameYear) return 0

    let score = 0

    if (boostRecent) {
      if (gameYear === currentYear) score += 50
      else if (gameYear === currentYear - 1) score += 35
      else if (gameYear >= currentYear - 2) score += 25
      else if (gameYear >= currentYear - 5) score += 15
      else if (gameYear >= currentYear - 10) score += 5
      else if (gameYear < 1990) score -= 10
    }

    return score
  }

  private calculatePopularityScore(game: any): number {
    let score = 0

    if (game.added > 100000) score += 25
    else if (game.added > 50000) score += 20
    else if (game.added > 10000) score += 15
    else if (game.added > 1000) score += 10
    else if (game.added < 100) score -= 5

    if (game.ratings_count > 10000) score += 10
    else if (game.ratings_count > 1000) score += 5

    return score
  }

  private sortByDateWithRelevance(games: any[]): any[] {
    return games.sort((a, b) => {
      const yearA = a.released ? new Date(a.released).getFullYear() : 0
      const yearB = b.released ? new Date(b.released).getFullYear() : 0
      
      if (yearA !== yearB) {
        return yearB - yearA
      }

      return b.totalScore - a.totalScore
    })
  }

  private sortByRatingWithRecency(games: any[]): any[] {
    return games.sort((a, b) => {
      const scoreA = a.qualityScore + (a.recencyScore * 0.3)
      const scoreB = b.qualityScore + (b.recencyScore * 0.3)
      
      return scoreB - scoreA
    })
  }

  private sortByMixedStrategy(games: any[]): any[] {
    return games.sort((a, b) => {
      const mixedScoreA = (a.titleScore * 0.4) + (a.qualityScore * 0.3) + 
                         (a.recencyScore * 0.2) + (a.popularityScore * 0.1)
      const mixedScoreB = (b.titleScore * 0.4) + (b.qualityScore * 0.3) + 
                         (b.recencyScore * 0.2) + (b.popularityScore * 0.1)
      
      return mixedScoreB - mixedScoreA
    })
  }

  private sortByRelevanceWithRecency(games: any[]): any[] {
    return games.sort((a, b) => {
      return b.totalScore - a.totalScore
    })
  }

  async getLatest2025Games(options: any = {}): Promise<any[]> {
    const { excludeNSFW = true, limit = 20 } = options
    
    const params = new URLSearchParams({
      key: this.apiKey,
      dates: '2025-01-01,2025-12-31',
      ordering: '-released',
      page_size: limit.toString(),
      exclude_additions: 'true',
      ...(excludeNSFW && { exclude_collection: '83' })
    })

    try {
      const response = await fetch(`${this.baseUrl}/games?${params}`)
      const data = await response.json()
      const games = data.results || []

      const filteredGames = excludeNSFW ? 
        games.filter((game: any) => !this.isNSFWContent(game)) : games

      return filteredGames
    } catch (error) {
      console.error('🎮 [V3] 2025 games fetch failed:', error)
      return []
    }
  }
}
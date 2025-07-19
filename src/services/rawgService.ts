// src/services/rawgService.ts - AMÉLIORATION POUR JEUX RÉCENTS
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
  results: RAWGGame[]
}

class RAWGService {
  private readonly apiKey = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  private readonly baseURL = 'https://api.rawg.io/api'
  
  // ✅ RECHERCHE PRINCIPALE AVEC JEUX RÉCENTS ET À VENIR
  async searchGames(query: string, pageSize: number = 20): Promise<RAWGGame[]> {
    try {
      console.log('🎮 RAWG: Starting enhanced search for:', query, 'pageSize:', pageSize)
      
      const allResults: RAWGGame[] = []
      
      // ✅ STRATÉGIE 1: Recherche standard
      const standardResults = await this.performStandardSearch(query, pageSize)
      allResults.push(...standardResults)
      
      // ✅ STRATÉGIE 2: Recherche spécifique pour jeux récents (2024-2025+)
      if (allResults.length < 10) {
        const recentResults = await this.searchRecentGames(query)
        allResults.push(...recentResults)
      }
      
      // ✅ STRATÉGIE 3: Recherche avec dates étendues si c'est une franchise connue
      if (allResults.length < 5 && this.isKnownFranchise(query)) {
        const franchiseResults = await this.searchFranchiseGames(query)
        allResults.push(...franchiseResults)
      }
      
      // Supprimer les doublons
      const uniqueResults = this.removeDuplicates(allResults)
      
      // Enrichir avec les détails complets
      const enrichedResults = await this.enrichWithDetails(uniqueResults.slice(0, Math.min(pageSize, 15)))
      
      // Trier par pertinence et date
      const sortedResults = this.sortByRelevanceAndDate(enrichedResults, query)
      
      console.log('🎮 RAWG: Final enhanced results count:', sortedResults.length)
      return sortedResults
      
    } catch (error) {
      console.error('🎮 RAWG: Enhanced search failed:', error)
      throw error
    }
  }

  // ✅ RECHERCHE STANDARD
  private async performStandardSearch(query: string, pageSize: number): Promise<RAWGGame[]> {
    try {
      const searchResponse = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=${Math.min(pageSize, 20)}`
      )
      
      if (!searchResponse.ok) {
        throw new Error(`RAWG Search API Error: ${searchResponse.status}`)
      }
      
      const searchData: RAWGSearchResponse = await searchResponse.json()
      console.log('🎮 RAWG: Standard search returned', searchData.results?.length || 0, 'games')
      
      return searchData.results || []
    } catch (error) {
      console.error('🎮 RAWG: Standard search failed:', error)
      return []
    }
  }

  // ✅ RECHERCHE SPÉCIFIQUE POUR JEUX RÉCENTS (2024-2025+)
  private async searchRecentGames(query: string): Promise<RAWGGame[]> {
    try {
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      
      console.log('🎮 RAWG: Searching recent/upcoming games for:', query)
      
      const allRecentResults: RAWGGame[] = []
      
      // Recherche pour l'année actuelle et suivante
      const years = [nextYear, currentYear, currentYear - 1]
      
      for (const year of years) {
        try {
          // Recherche avec année spécifique
          const yearResponse = await fetch(
            `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&dates=${year}-01-01,${year}-12-31&page_size=10&ordering=-released`
          )
          
          if (yearResponse.ok) {
            const yearData: RAWGSearchResponse = await yearResponse.json()
            if (yearData.results) {
              allRecentResults.push(...yearData.results)
              console.log(`🎮 RAWG: Found ${yearData.results.length} games for ${year}`)
            }
          }
        } catch (error) {
          console.warn(`🎮 RAWG: Error searching year ${year}:`, error)
        }
      }
      
      // Recherche également dans les prochaines sorties
      try {
        const upcomingResponse = await fetch(
          `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&dates=${currentYear}-01-01,${nextYear + 1}-12-31&page_size=10&ordering=-added`
        )
        
        if (upcomingResponse.ok) {
          const upcomingData: RAWGSearchResponse = await upcomingResponse.json()
          if (upcomingData.results) {
            allRecentResults.push(...upcomingData.results)
            console.log(`🎮 RAWG: Found ${upcomingData.results.length} upcoming games`)
          }
        }
      } catch (error) {
        console.warn('🎮 RAWG: Error searching upcoming games:', error)
      }
      
      return allRecentResults
    } catch (error) {
      console.error('🎮 RAWG: Recent games search failed:', error)
      return []
    }
  }

  // ✅ RECHERCHE POUR FRANCHISES CONNUES
  private async searchFranchiseGames(query: string): Promise<RAWGGame[]> {
    try {
      console.log('🎮 RAWG: Searching franchise games for:', query)
      
      const franchiseQueries = [
        query,
        `${query} 2024`,
        `${query} 2025`,
        `${query} latest`,
        `${query} new`,
        `${query} shadows`, // Spécifique pour Assassin's Creed
        `${query} mirage`,
        `${query} valhalla`
      ]
      
      const allFranchiseResults: RAWGGame[] = []
      
      for (const franchiseQuery of franchiseQueries) {
        try {
          const response = await fetch(
            `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(franchiseQuery)}&page_size=5&ordering=-released`
          )
          
          if (response.ok) {
            const data: RAWGSearchResponse = await response.json()
            if (data.results) {
              allFranchiseResults.push(...data.results)
            }
          }
        } catch (error) {
          console.warn(`🎮 RAWG: Error with franchise query "${franchiseQuery}":`, error)
        }
      }
      
      return allFranchiseResults
    } catch (error) {
      console.error('🎮 RAWG: Franchise search failed:', error)
      return []
    }
  }

  // ✅ VÉRIFIER SI C'EST UNE FRANCHISE CONNUE
  private isKnownFranchise(query: string): boolean {
    const knownFranchises = [
      'assassin\'s creed', 'assassins creed',
      'call of duty', 'battlefield', 'fifa', 'madden',
      'grand theft auto', 'gta', 'red dead',
      'the witcher', 'cyberpunk', 'elder scrolls',
      'fallout', 'doom', 'halo', 'gears of war',
      'uncharted', 'the last of us', 'god of war'
    ]
    
    const queryLower = query.toLowerCase()
    return knownFranchises.some(franchise => queryLower.includes(franchise))
  }

  // ✅ SUPPRIMER LES DOUBLONS
  private removeDuplicates(games: RAWGGame[]): RAWGGame[] {
    const seen = new Set<number>()
    const unique: RAWGGame[] = []
    
    for (const game of games) {
      if (!seen.has(game.id)) {
        seen.add(game.id)
        unique.push(game)
      }
    }
    
    return unique
  }

  // ✅ ENRICHIR AVEC LES DÉTAILS
  private async enrichWithDetails(games: RAWGGame[]): Promise<RAWGGame[]> {
    console.log('🎮 RAWG: Enriching', games.length, 'games with details...')
    
    const enrichedGames = await Promise.all(
      games.map(async (game, index) => {
        try {
          console.log(`🎮 RAWG: [${index + 1}/${games.length}] Fetching details for:`, game.name, 'ID:', game.id)
          
          const detailResponse = await fetch(
            `${this.baseURL}/games/${game.id}?key=${this.apiKey}`
          )
          
          if (!detailResponse.ok) {
            console.warn('🎮 RAWG: Failed to get details for', game.name, 'status:', detailResponse.status)
            return {
              ...game,
              developers: game.developers || [],
              publishers: game.publishers || []
            }
          }
          
          const gameDetail: RAWGGame = await detailResponse.json()
          
          console.log(`🎮 RAWG: Details for "${gameDetail.name}":`, {
            developers: gameDetail.developers?.map(d => d.name) || [],
            publishers: gameDetail.publishers?.map(p => p.name) || [],
            rating: gameDetail.rating,
            released: gameDetail.released
          })
          
          return gameDetail
          
        } catch (error) {
          console.warn('🎮 RAWG: Error getting details for', game.name, ':', error)
          return {
            ...game,
            developers: game.developers || [],
            publishers: game.publishers || []
          }
        }
      })
    )

    console.log('🎮 RAWG: Successfully enriched', enrichedGames.length, 'games with full details')
    return enrichedGames
  }

  // ✅ TRIER PAR PERTINENCE ET DATE
  private sortByRelevanceAndDate(games: RAWGGame[], query: string): RAWGGame[] {
    return games.sort((a, b) => {
      const queryLower = query.toLowerCase()
      
      // 1. Correspondance exacte du nom
      const aExactMatch = a.name.toLowerCase().includes(queryLower)
      const bExactMatch = b.name.toLowerCase().includes(queryLower)
      
      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1
      
      // 2. Jeux plus récents en premier (2024-2025+)
      const aYear = a.released ? new Date(a.released).getFullYear() : 0
      const bYear = b.released ? new Date(b.released).getFullYear() : 0
      
      const currentYear = new Date().getFullYear()
      
      // Priorité aux jeux récents/à venir
      const aIsRecent = aYear >= currentYear - 1
      const bIsRecent = bYear >= currentYear - 1
      
      if (aIsRecent && !bIsRecent) return -1
      if (!aIsRecent && bIsRecent) return 1
      
      // 3. Trier par année (plus récent en premier)
      if (aYear !== bYear) return bYear - aYear
      
      // 4. Trier par rating
      return (b.rating || 0) - (a.rating || 0)
    })
  }

  // ✅ MÉTHODES EXISTANTES INCHANGÉES
  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&dates=2020-01-01,2024-12-31&metacritic=80,100`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching popular games:', error)
      return []
    }
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&metacritic=90,100`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching top rated games:', error)
      return []
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentDate = new Date()
      const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, currentDate.getDate())
      const sixMonthsLater = new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, currentDate.getDate())
      
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-released&dates=${threeMonthsAgo.toISOString().split('T')[0]},${sixMonthsLater.toISOString().split('T')[0]}`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return []
    }
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/games/${gameId}?key=${this.apiKey}`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const game: RAWGGame = await response.json()
      return game
    } catch (error) {
      console.error('Error fetching game details:', error)
      return null
    }
  }

  convertToAppFormat(game: RAWGGame): any {
    let developer = 'Unknown Developer'
    let finalDeveloper = 'Unknown Developer'
    
    if (game.developers && game.developers.length > 0) {
      developer = game.developers[0].name
      finalDeveloper = developer
      console.log('🎮 Using primary developer:', developer)
    }
    else if (game.publishers && game.publishers.length > 0) {
      developer = game.publishers[0].name
      finalDeveloper = `${developer} (Publisher)`
      console.log('🎮 Using publisher as developer fallback:', developer)
    }
    
    console.log('🎮 Converting game:', game.name, '→ Developer:', finalDeveloper)
    
    const converted = {
      id: `game-${game.id}`,
      title: game.name || 'Unknown Game',
      name: game.name || 'Unknown Game',
      author: finalDeveloper,
      developer: finalDeveloper,
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
    
    console.log('🎮 Converted result:', {
      title: converted.title,
      developer: converted.developer,
      author: converted.author,
      year: converted.year,
      rating: converted.rating
    })
    
    return converted
  }

  async getSimilarGames(game: RAWGGame, limit: number = 6): Promise<RAWGGame[]> {
    try {
      if (!game.genres || game.genres.length === 0) {
        return []
      }
      
      const genre = game.genres[0].name
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&genres=${genre}&page_size=${limit + 5}&ordering=-rating`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      
      return (data.results || [])
        .filter(g => g.id !== game.id)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching similar games:', error)
      return []
    }
  }

  async getGamesByDeveloper(developerId: number, excludeGameId: number, limit: number = 6): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&developers=${developerId}&page_size=${limit + 5}&ordering=-rating`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      
      return (data.results || [])
        .filter(g => g.id !== excludeGameId)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching games by developer:', error)
      return []
    }
  }
}

export const rawgService = new RAWGService()
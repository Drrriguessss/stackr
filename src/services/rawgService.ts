// src/services/rawgService.ts - CORRECTION POUR JEUX RÉCENTS
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
  
  // ✅ RECHERCHE PRINCIPALE AVEC STRATÉGIE MULTI-DATES
  async searchGames(query: string, pageSize: number = 20): Promise<RAWGGame[]> {
    try {
      console.log('🎮 RAWG: Starting enhanced search for:', query, 'pageSize:', pageSize)
      
      const allResults: RAWGGame[] = []
      
      // ✅ STRATÉGIE 1: Recherche standard avec tous les jeux
      const standardResults = await this.performStandardSearch(query, pageSize)
      allResults.push(...standardResults)
      
      // ✅ STRATÉGIE 2: Recherche spécifique pour jeux futurs/récents (2024-2026)
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      
      const recentResults = await this.searchGamesByDateRange(query, currentYear, nextYear + 1)
      allResults.push(...recentResults)
      
      // ✅ STRATÉGIE 3: Recherche pour jeux à venir (dates futures)
      const upcomingResults = await this.searchUpcomingGames(query)
      allResults.push(...upcomingResults)
      
      // ✅ STRATÉGIE 4: Recherche spécifique pour franchises connues
      if (this.isKnownFranchise(query)) {
        const franchiseResults = await this.searchFranchiseGames(query)
        allResults.push(...franchiseResults)
      }
      
      // Supprimer les doublons
      const uniqueResults = this.removeDuplicates(allResults)
      
      // Enrichir avec les détails complets
      const enrichedResults = await this.enrichWithDetails(uniqueResults.slice(0, Math.min(pageSize, 15)))
      
      // ✅ TRIER PAR PERTINENCE ET DATE (PLUS RÉCENT EN PREMIER)
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
        `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=${Math.min(pageSize, 20)}&ordering=-released`
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

  // ✅ NOUVELLE MÉTHODE: Recherche par plage de dates
  private async searchGamesByDateRange(query: string, startYear: number, endYear: number): Promise<RAWGGame[]> {
    try {
      console.log(`🎮 RAWG: Searching games ${startYear}-${endYear} for:`, query)
      
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&dates=${startYear}-01-01,${endYear}-12-31&page_size=20&ordering=-released`
      )
      
      if (!response.ok) {
        console.warn(`🎮 RAWG: Date range search failed: ${response.status}`)
        return []
      }
      
      const data: RAWGSearchResponse = await response.json()
      console.log(`🎮 RAWG: Found ${data.results?.length || 0} games for ${startYear}-${endYear}`)
      
      return data.results || []
    } catch (error) {
      console.error(`🎮 RAWG: Error searching ${startYear}-${endYear}:`, error)
      return []
    }
  }

  // ✅ NOUVELLE MÉTHODE: Recherche de jeux à venir
  private async searchUpcomingGames(query: string): Promise<RAWGGame[]> {
    try {
      console.log('🎮 RAWG: Searching upcoming games for:', query)
      
      const currentDate = new Date().toISOString().split('T')[0]
      const futureDate = '2026-12-31'
      
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&dates=${currentDate},${futureDate}&page_size=15&ordering=-added`
      )
      
      if (!response.ok) {
        console.warn('🎮 RAWG: Upcoming games search failed:', response.status)
        return []
      }
      
      const data: RAWGSearchResponse = await response.json()
      console.log(`🎮 RAWG: Found ${data.results?.length || 0} upcoming games`)
      
      return data.results || []
    } catch (error) {
      console.error('🎮 RAWG: Error searching upcoming games:', error)
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
        `${query} 2026`,
        `${query} latest`,
        `${query} new`,
        `${query} shadows`, // Spécifique pour Assassin's Creed
        `${query} mirage`,
        `${query} valhalla`,
        `${query} odyssey`
      ]
      
      const allFranchiseResults: RAWGGame[] = []
      
      for (const franchiseQuery of franchiseQueries) {
        try {
          const response = await fetch(
            `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(franchiseQuery)}&page_size=10&ordering=-released`
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
      'assassin\'s creed', 'assassins creed', 'assassin creed',
      'call of duty', 'battlefield', 'fifa', 'madden',
      'grand theft auto', 'gta', 'red dead',
      'the witcher', 'cyberpunk', 'elder scrolls',
      'fallout', 'doom', 'halo', 'gears of war',
      'uncharted', 'the last of us', 'god of war',
      'spider-man', 'spiderman', 'marvel'
    ]
    
    const queryLower = query.toLowerCase()
    return knownFranchises.some(franchise => 
      queryLower.includes(franchise) || franchise.includes(queryLower)
    )
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

  // ✅ TRIER PAR PERTINENCE ET DATE (PERTINENCE D'ABORD)
  private sortByRelevanceAndDate(games: RAWGGame[], query: string): RAWGGame[] {
    return games.sort((a, b) => {
      const queryLower = query.toLowerCase()
      
      // 1. PRIORITÉ ABSOLUE: Correspondance exacte du nom
      const aExactMatch = a.name.toLowerCase() === queryLower
      const bExactMatch = b.name.toLowerCase() === queryLower
      
      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1
      
      // 2. Correspondance partielle forte du nom (contient le mot-clé)
      const aPartialMatch = a.name.toLowerCase().includes(queryLower)
      const bPartialMatch = b.name.toLowerCase().includes(queryLower)
      
      if (aPartialMatch && !bPartialMatch) return -1
      if (!aPartialMatch && bPartialMatch) return 1
      
      // 3. Pour les jeux qui matchent le nom, prioriser les récents
      if (aPartialMatch && bPartialMatch) {
        const aYear = a.released ? new Date(a.released).getFullYear() : 0
        const bYear = b.released ? new Date(b.released).getFullYear() : 0
        
        const currentYear = new Date().getFullYear()
        
        // Priorité aux jeux récents/à venir (2024+) SEULEMENT pour les matchs pertinents
        const aIsRecent = aYear >= currentYear
        const bIsRecent = bYear >= currentYear
        
        if (aIsRecent && !bIsRecent) return -1
        if (!aIsRecent && bIsRecent) return 1
        
        // Trier par année (plus récent en premier) pour les matchs pertinents
        if (aYear !== bYear) return bYear - aYear
      }
      
      // 4. Correspondance développeur (pour les cas où le nom ne match pas exactement)
      const aDeveloperMatch = a.developers?.some(dev => 
        dev.name.toLowerCase().includes(queryLower)
      ) || false
      const bDeveloperMatch = b.developers?.some(dev => 
        dev.name.toLowerCase().includes(queryLower)
      ) || false
      
      if (aDeveloperMatch && !bDeveloperMatch) return -1
      if (!aDeveloperMatch && bDeveloperMatch) return 1
      
      // 5. Trier par rating pour départager
      return (b.rating || 0) - (a.rating || 0)
    })
  }

  // ✅ MÉTHODES EXISTANTES INCHANGÉES
  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&dates=2020-01-01,2025-12-31&metacritic=80,100`
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
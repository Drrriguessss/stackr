// src/services/rawgService.ts - VERSION COMPLÈTE CORRIGÉE POUR DÉVELOPPEURS
import { getSimilarGameIds } from '@/data/similarGamesMapping'
import SteamImageService from './steamImageService'

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

class RAWGService {
  private readonly apiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  private readonly baseURL = 'https://api.rawg.io/api'

  /**
   * ✅ FONCTION COMPLÈTEMENT RÉÉCRITE : Obtenir le vrai développeur
   */
  private getCorrectDeveloper(game: RAWGGame): string {
    console.log('🎮 Getting developer for:', game.name)
    console.log('🎮 Raw developers:', game.developers)
    console.log('🎮 Raw publishers:', game.publishers)

    // 1. Développeur principal de l'API
    if (game.developers && game.developers.length > 0) {
      const mainDev = game.developers[0].name
      if (mainDev && mainDev.trim() !== '' && mainDev !== 'Unknown' && !mainDev.includes('undefined')) {
        console.log('🎮 ✅ Found developer from API:', mainDev)
        return mainDev
      }
    }

    // 2. Publisher en second recours pour certains cas spéciaux
    if (game.publishers && game.publishers.length > 0) {
      const mainPub = game.publishers[0].name
      if (mainPub && mainPub.trim() !== '' && mainPub !== 'Unknown' && !mainPub.includes('undefined')) {
        // ✅ AMÉLIORATION: Pour certains studios, le publisher EST le développeur
        const publisherAsDeveloper = [
          'Nintendo',
          'Valve Corporation',
          'Rockstar Games',
          'id Software', 
          'Bethesda Softworks',
          'Activision',
          'Electronic Arts',
          'Sony Interactive Entertainment'
        ]
        
        if (publisherAsDeveloper.some(studio => mainPub.includes(studio))) {
          console.log('🎮 ✅ Using publisher as developer (known case):', mainPub)
          return mainPub
        }
      }
    }

    // 3. Mapping manuel étendu pour les gros studios
    const gameNameLower = game.name.toLowerCase()
    const mappings: { [key: string]: string } = {
      // ✅ DOOM ETERNAL - CAS SPÉCIFIQUE
      "doom eternal": "id Software",
      "doom": "id Software",
      
      // Studios AAA
      "assassin's creed origins": "Ubisoft Montreal",
      "assassin's creed odyssey": "Ubisoft Quebec", 
      "assassin's creed valhalla": "Ubisoft Montreal",
      "assassin's creed": "Ubisoft",
      "monster hunter world": "Capcom",
      "monster hunter rise": "Capcom",
      "monster hunter": "Capcom",
      "call of duty modern warfare": "Infinity Ward",
      "call of duty black ops": "Treyarch",
      "call of duty": "Activision",
      "the witcher 3": "CD Projekt RED",
      "the witcher": "CD Projekt RED",
      "cyberpunk 2077": "CD Projekt RED",
      "cyberpunk": "CD Projekt RED",
      "elder scrolls v": "Bethesda Game Studios",
      "elder scrolls": "Bethesda Game Studios",
      "fallout 4": "Bethesda Game Studios",
      "fallout": "Bethesda Game Studios",
      "halo infinite": "343 Industries",
      "halo": "343 Industries",
      "god of war": "Santa Monica Studio",
      "spider-man": "Insomniac Games",
      "marvel's spider-man": "Insomniac Games",
      "zelda breath of the wild": "Nintendo EPD",
      "zelda tears of the kingdom": "Nintendo EPD", 
      "zelda": "Nintendo",
      "mario": "Nintendo",
      "ori and the will of the wisps": "Moon Studios",
      "ori and the blind forest": "Moon Studios",
      "ori and the": "Moon Studios",
      "the last of us part ii": "Naughty Dog",
      "the last of us": "Naughty Dog",
      "last of us": "Naughty Dog",
      "uncharted": "Naughty Dog",
      "horizon zero dawn": "Guerrilla Games",
      "horizon forbidden west": "Guerrilla Games",
      "horizon": "Guerrilla Games",
      "ghost of tsushima": "Sucker Punch Productions",
      "baldur's gate 3": "Larian Studios",
      "elden ring": "FromSoftware",
      "dark souls": "FromSoftware",
      "sekiro": "FromSoftware",
      "bloodborne": "FromSoftware",
      "grand theft auto v": "Rockstar North",
      "grand theft auto": "Rockstar Games",
      "red dead redemption": "Rockstar Games"
    }

    // Chercher d'abord les correspondances exactes, puis partielles
    for (const [keyword, studio] of Object.entries(mappings)) {
      if (gameNameLower.includes(keyword)) {
        console.log('🎮 📋 Found developer via enhanced mapping:', studio, 'for keyword:', keyword)
        return studio
      }
    }

    console.log('🎮 ❌ No developer found, using fallback')
    return "Game Studio" // ✅ Éviter "Unknown Developer"
  }

  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    console.log('🎮 Enhanced search for:', query)
    
    if (!query || query.length < 2) {
      console.log('🎮 Query too short')
      return []
    }

    try {
      const currentYear = new Date().getFullYear()
      const futureYear = currentYear + 5 // Include games up to 5 years in the future
      
      const url = `${this.baseURL}/games?` + new URLSearchParams({
        key: this.apiKey,
        search: query,
        page_size: '20',
        dates: `2000-01-01,${futureYear}-12-31`,
        ordering: '-relevance' // Sort by relevance first, then we'll sort by date client-side
      }).toString()

      console.log('🎮 Enhanced URL with future games:', url)
      console.log('🎮 Date range:', `2000-01-01 to ${futureYear}-12-31`)
      console.log('🎮 Ordering:', 'by release date (newest first)')

      const response = await fetch(url)
      console.log('🎮 Response status:', response.status)

      if (!response.ok) {
        console.error('🎮 Response error:', response.status, response.statusText)
        return []
      }

      const data = await response.json()
      console.log('🎮 Raw API response:', data)

      if (!data.results) {
        console.error('🎮 No results in response')
        return []
      }

      console.log('🎮 Found', data.results.length, 'games (including 2025)')
      
      // ✅ Log avec développeurs corrects
      data.results.forEach((game: RAWGGame, index: number) => {
        console.log(`🎮 Game ${index + 1} raw data:`, {
          name: game.name,
          developers: game.developers,
          publishers: game.publishers,
          released: game.released
        })
        const developer = this.getCorrectDeveloper(game)
        const year = game.released ? new Date(game.released).getFullYear() : 'TBA'
        console.log(`🎮 ${index + 1}. ${game.name} by ${developer} (${year})`)
      })

      return data.results

    } catch (error) {
      console.error('🎮 Enhanced search error:', error)
      return []
    }
  }

  async searchWithRecentGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    console.log('🎮 Searching with recent games priority for:', query)
    
    const normalResults = await this.searchGames(query, maxResults)
    
    const recentGames = normalResults.filter(game => {
      if (!game.released) return false
      const year = new Date(game.released).getFullYear()
      return year >= 2024
    })

    console.log(`🎮 Found ${recentGames.length} recent games (2024+) in normal search`)

    if (recentGames.length < 2) {
      console.log('🎮 Searching specifically for 2025 games...')
      
      try {
        const recentUrl = `${this.baseURL}/games?` + new URLSearchParams({
          key: this.apiKey,
          search: query,
          page_size: '10',
          dates: `2024-01-01,${new Date().getFullYear() + 5}-12-31`,
          ordering: '-released'
        }).toString()

        const recentResponse = await fetch(recentUrl)
        
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          console.log(`🎮 Found ${recentData.results?.length || 0} additional recent games`)
          
          if (recentData.results && recentData.results.length > 0) {
            const combinedResults = [...normalResults]
            const existingIds = new Set(normalResults.map(g => g.id))
            
            recentData.results.forEach((game: RAWGGame) => {
              if (!existingIds.has(game.id)) {
                combinedResults.unshift(game)
                console.log(`🎮 ➕ Added recent game: ${game.name} (${game.released ? new Date(game.released).getFullYear() : 'TBA'})`)
              }
            })
            
            return combinedResults.slice(0, maxResults)
          }
        }
      } catch (error) {
        console.warn('🎮 Recent games search failed:', error)
      }
    }

    return normalResults
  }

  async testConnection(): Promise<{ success: boolean, message: string }> {
    console.log('🎮 Testing RAWG API connection...')
    
    try {
      const url = `${this.baseURL}/games?key=${this.apiKey}&page_size=1`
      const response = await fetch(url)
      
      if (!response.ok) {
        return { 
          success: false, 
          message: `API Error ${response.status}: ${response.statusText}` 
        }
      }

      const data = await response.json()
      
      return { 
        success: true, 
        message: `API Working! Found ${data.count || 0} games total` 
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error}` 
      }
    }
  }

  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&ordering=-rating&page_size=8&dates=2020-01-01,2026-12-31`
      )
      
      if (!response.ok) return []

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('🎮 Popular games failed:', error)
      return []
    }
  }

  async getTopRatedGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&ordering=-metacritic&page_size=8&metacritic=80,100`
      )
      
      if (!response.ok) return []

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('🎮 Top rated games failed:', error)
      return []
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentYear = new Date().getFullYear()
      const futureYear = currentYear + 2 // Include upcoming releases
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&ordering=-released&page_size=8&dates=${currentYear}-01-01,${futureYear}-12-31`
      )
      
      if (!response.ok) return []

      const data = await response.json()
      console.log(`🎮 New releases: found ${data.results?.length || 0} games for ${currentYear}-${currentYear + 1}`)
      
      return data.results || []
    } catch (error) {
      console.error('🎮 New releases failed:', error)
      return []
    }
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    try {
      const response = await fetch(`${this.baseURL}/games/${gameId}?key=${this.apiKey}`)
      
      if (!response.ok) return null

      const data = await response.json()
      return data
    } catch (error) {
      console.error('🎮 Game details failed:', error)
      return null
    }
  }

  /**
   * 🔍 Extraire Steam App ID depuis les stores RAWG
   */
  private extractSteamAppId(game: RAWGGame): string | null {
    if (!game.stores || !Array.isArray(game.stores)) return null
    
    const steamStore = game.stores.find(store => {
      if (!store || !store.store || !store.store.name || !store.url) return false
      return store.store.name.toLowerCase().includes('steam') ||
             store.url.includes('store.steampowered.com')
    })
    
    if (steamStore?.url) {
      // Extraire l'App ID depuis l'URL Steam
      const steamUrlMatch = steamStore.url.match(/\/app\/(\d+)/)
      if (steamUrlMatch) {
        console.log(`🎮 [RAWG] Found Steam App ID for ${game.name}: ${steamUrlMatch[1]}`)
        return steamUrlMatch[1]
      }
    }
    
    return null
  }

  /**
   * 🎯 Obtenir la meilleure image possible (Steam portrait si dispo, sinon RAWG)
   */
  private getBestGameImage(game: RAWGGame): string {
    // 1. Essayer d'obtenir une image Steam portrait
    const steamAppId = this.extractSteamAppId(game)
    if (steamAppId) {
      const steamPortraitImage = SteamImageService.getBestPortraitImage(steamAppId)
      console.log(`🎮 [RAWG] Using Steam portrait image for ${game.name}: ${steamPortraitImage}`)
      return steamPortraitImage
    }
    
    // 2. Fallback vers l'image RAWG background
    console.log(`🎮 [RAWG] Using RAWG background image for ${game.name}`)
    return game.background_image || ''
  }

  /**
   * ✅ CONVERSION COMPLÈTEMENT RÉÉCRITE AVEC DÉVELOPPEUR CORRECT ET IMAGES AMÉLIORÉES
   */
  convertToAppFormat(game: RAWGGame): any {
    if (!game || !game.name) {
      console.error('🎮 Invalid game object:', game)
      return null
    }
    
    const developer = this.getCorrectDeveloper(game)
    const bestImage = this.getBestGameImage(game)
    
    console.log('🎮 Converting game:', game.name, 'Developer:', developer)
    console.log('🎮 Raw developers array:', game.developers)
    
    return {
      id: `game-${game.id}`,
      title: game.name,
      name: game.name,
      author: developer,      // ✅ Pour compatibilité
      developer: developer,   // ✅ Champ spécifique
      year: game.released ? new Date(game.released).getFullYear() : new Date().getFullYear(),
      rating: game.rating || 0,
      genre: game.genres?.[0]?.name || 'Unknown',
      category: 'games' as const,
      image: bestImage,       // 🎯 IMAGE AMÉLIORÉE
      background_image: game.background_image, // Préserver l'original
      released: game.released,
      
      // ✅ PRÉSERVER TOUTES LES DONNÉES API
      developers: game.developers || [], // Array complet
      publishers: game.publishers || [], // Array complet
      genres: game.genres || [],
      
      // Autres données
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

  /**
   * Get games similar to the current game using multiple strategies
   */
  async getSimilarGames(gameId: string | number, limit: number = 6): Promise<RAWGGame[]> {
    console.log(`🎮 [Similar Games] Fetching similar games for gameId: ${gameId}`)
    
    try {
      // Clean gameId if it comes with 'game-' prefix
      let cleanGameId = gameId.toString()
      if (cleanGameId.startsWith('game-')) {
        cleanGameId = cleanGameId.replace('game-', '')
      }
      
      // Strategy 1: Check manual mapping first
      const mappedSimilarIds = getSimilarGameIds(cleanGameId)
      if (mappedSimilarIds.length > 0) {
        console.log(`🎮 [Similar Games] Found ${mappedSimilarIds.length} games in manual mapping`)
        
        // Fetch details for each mapped game
        const similarGames: RAWGGame[] = []
        for (const similarId of mappedSimilarIds.slice(0, limit)) {
          try {
            const game = await this.getGameDetails(similarId)
            if (game) {
              similarGames.push(game)
              console.log(`🎮 [Similar Games] ✅ Loaded: ${game.name}`)
            }
          } catch (err) {
            console.log(`🎮 [Similar Games] Failed to load game ${similarId}`)
          }
        }
        
        if (similarGames.length > 0) {
          console.log(`🎮 [Similar Games] Successfully loaded ${similarGames.length} games from mapping`)
          return similarGames
        }
      }
      
      // RAWG API endpoint for game suggestions/similar games
      // Note: RAWG's /suggested endpoint provides games that are similar based on their algorithm
      const url = `${this.baseURL}/games/${cleanGameId}/suggested?key=${this.apiKey}&page_size=${limit}`
      console.log(`🎮 [Similar Games] API URL: ${url}`)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.log(`🎮 [Similar Games] API error: ${response.status}`)
        
        // If the suggestions endpoint fails, try searching by genre/tags
        return await this.fallbackSimilarGames(cleanGameId, limit)
      }
      
      const data = await response.json()
      console.log(`🎮 [Similar Games] Found ${data.results?.length || 0} similar games`)
      
      if (!data.results || data.results.length === 0) {
        console.log(`🎮 [Similar Games] No results from suggestions, trying fallback...`)
        return await this.fallbackSimilarGames(cleanGameId, limit)
      }
      
      // Log similar games for debugging
      console.log(`🎮 [Similar Games] Full response:`, {
        count: data.count,
        next: data.next,
        previous: data.previous,
        numberOfResults: data.results?.length || 0
      })
      
      data.results.forEach((game: RAWGGame, index: number) => {
        console.log(`🎮 [Similar Games] ${index + 1}. ${game.name} (${game.released ? new Date(game.released).getFullYear() : 'TBA'})`)
      })
      
      // Special logging for Minami Lane to debug
      if (cleanGameId === '871520' || data.results?.some((g: any) => g.name.toLowerCase().includes('minami lane'))) {
        console.log('🎮 [Similar Games] Special debug for Minami Lane - full first result:', data.results?.[0])
      }
      
      return data.results || []
      
    } catch (error) {
      console.error(`🎮 [Similar Games] Error fetching similar games:`, error)
      return await this.fallbackSimilarGames(gameId.toString().replace('game-', ''), limit)
    }
  }
  
  /**
   * Intelligent fallback method to find truly similar games
   */
  private async fallbackSimilarGames(gameId: string, limit: number = 6): Promise<RAWGGame[]> {
    console.log(`🎮 [Similar Games] Using intelligent fallback for gameId: ${gameId}`)
    
    try {
      // Get the current game details
      const gameDetails = await this.getGameDetails(gameId)
      
      if (!gameDetails) {
        console.log(`🎮 [Similar Games] Could not get game details for fallback`)
        return []
      }
      
      console.log(`🎮 [Similar Games] Analyzing game:`, {
        name: gameDetails.name,
        genres: gameDetails.genres?.map(g => g.name),
        tags: gameDetails.tags?.slice(0, 10).map(t => t.name)
      })
      
      // Special handling for specific types of games based on their characteristics
      const gameName = gameDetails.name.toLowerCase()
      const genres = gameDetails.genres?.map(g => g.name.toLowerCase()) || []
      const tags = gameDetails.tags?.map(t => t.name.toLowerCase()) || []
      
      // Identify game type based on tags and genres
      const isManagementGame = tags.some(t => t.includes('management') || t.includes('building') || t.includes('tycoon'))
      const isIndieGame = genres.includes('indie') || tags.includes('indie')
      const isCasualGame = genres.includes('casual') || tags.includes('casual')
      const isSimulation = genres.includes('simulation')
      const is2D = tags.includes('2d')
      const isRelaxing = tags.includes('relaxing') || tags.includes('cute') || tags.includes('colorful')
      
      let searchParams: string[] = [`key=${this.apiKey}`]
      
      // Build intelligent search based on game type
      if (isManagementGame && isIndieGame) {
        // For indie management games like Minami Lane
        console.log(`🎮 [Similar Games] Searching for indie management/building games`)
        
        // Use specific tags that match this game type
        const relevantTags = ['management', 'building', 'city-builder', 'tycoon', 'economy', 'sandbox']
        const matchingTags = tags.filter(t => relevantTags.some(rt => t.includes(rt)))
        
        if (matchingTags.length > 0) {
          searchParams.push(`tags=${matchingTags.slice(0, 2).join(',')}`)
        } else {
          searchParams.push('tags=management,building')
        }
        
        // Add indie genre filter
        searchParams.push('genres=indie')
        
        // Prioritize newer indie games
        searchParams.push('ordering=-added')
        searchParams.push('page_size=30') // Get more to filter
        
      } else if (isSimulation && isCasualGame) {
        // For casual simulation games
        console.log(`🎮 [Similar Games] Searching for casual simulation games`)
        searchParams.push('genres=simulation,casual')
        searchParams.push('ordering=-rating')
        searchParams.push('page_size=20')
        
      } else {
        // Generic fallback using main genre and specific tags
        console.log(`🎮 [Similar Games] Using generic search`)
        
        // Use the most specific genre
        if (gameDetails.genres && gameDetails.genres.length > 0) {
          const genreQuery = gameDetails.genres.slice(0, 2).map(g => g.slug).join(',')
          searchParams.push(`genres=${genreQuery}`)
        }
        
        // Use meaningful tags (avoid generic ones like "Singleplayer", "Steam Achievements")
        const meaningfulTags = tags.filter(t => 
          !t.includes('steam') && 
          !t.includes('singleplayer') && 
          !t.includes('achievements') &&
          !t.includes('cloud') &&
          !t.includes('controller')
        ).slice(0, 3)
        
        if (meaningfulTags.length > 0) {
          searchParams.push(`tags=${meaningfulTags.join(',')}`)
        }
        
        searchParams.push('ordering=-added')
        searchParams.push('page_size=20')
      }
      
      // Add metacritic filter for quality (but not too high for indie games)
      if (isIndieGame) {
        searchParams.push('metacritic=60,100')
      } else {
        searchParams.push('metacritic=70,100')
      }
      
      const searchUrl = `${this.baseURL}/games?${searchParams.join('&')}`
      console.log(`🎮 [Similar Games] Intelligent search URL: ${searchUrl}`)
      
      const response = await fetch(searchUrl)
      
      if (!response.ok) {
        console.log(`🎮 [Similar Games] Search failed: ${response.status}`)
        return []
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        console.log(`🎮 [Similar Games] No results found`)
        return []
      }
      
      // Filter and score games based on similarity
      const scoredGames = data.results
        .filter((game: RAWGGame) => game.id.toString() !== gameId)
        .map((game: RAWGGame) => {
          let score = 0
          
          // Score based on matching genres
          const gameGenres = game.genres?.map(g => g.name.toLowerCase()) || []
          genres.forEach(genre => {
            if (gameGenres.includes(genre)) score += 10
          })
          
          // Score based on matching tags (more specific tags get higher scores)
          const gameTags = game.tags?.map(t => t.name.toLowerCase()) || []
          tags.forEach(tag => {
            if (gameTags.includes(tag)) {
              // Higher score for more specific tags
              if (['management', 'building', 'tycoon', 'city-builder'].includes(tag)) {
                score += 15
              } else if (['2d', 'isometric', 'cute', 'colorful', 'relaxing'].includes(tag)) {
                score += 8
              } else {
                score += 3
              }
            }
          })
          
          // Bonus for indie games if original is indie
          if (isIndieGame && gameGenres.includes('indie')) {
            score += 5
          }
          
          // Penalty for AAA games if original is indie
          if (isIndieGame && game.rating_count > 10000) {
            score -= 10
          }
          
          return { ...game, similarityScore: score }
        })
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit)
      
      console.log(`🎮 [Similar Games] Found ${scoredGames.length} similar games after intelligent filtering`)
      
      scoredGames.forEach((game: any, index: number) => {
        console.log(`🎮 [Similar Games] ${index + 1}. ${game.name} (Score: ${game.similarityScore})`)
      })
      
      return scoredGames
      
    } catch (error) {
      console.error(`🎮 [Similar Games] Intelligent fallback error:`, error)
      return []
    }
  }
}

export const rawgService = new RAWGService()
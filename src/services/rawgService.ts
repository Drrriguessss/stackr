// src/services/rawgService.ts - SERVICE COMPLET AVEC CORRECTION DÉVELOPPEURS
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
  
  // ✅ MÉTHODE PRINCIPALE : Rechercher des jeux avec détails complets incluant développeurs
  async searchGames(query: string, pageSize: number = 20): Promise<RAWGGame[]> {
    try {
      console.log('🎮 RAWG: Starting search for:', query, 'pageSize:', pageSize)
      
      // Étape 1: Recherche initiale
      const searchResponse = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=${Math.min(pageSize, 20)}`
      )
      
      if (!searchResponse.ok) {
        throw new Error(`RAWG Search API Error: ${searchResponse.status}`)
      }
      
      const searchData: RAWGSearchResponse = await searchResponse.json()
      console.log('🎮 RAWG: Initial search returned', searchData.results?.length || 0, 'games')
      
      if (!searchData.results || searchData.results.length === 0) {
        console.log('🎮 RAWG: No games found for query:', query)
        return []
      }

      // ✅ Étape 2: Récupérer les détails complets pour avoir les développeurs
      console.log('🎮 RAWG: Fetching detailed info for', searchData.results.length, 'games...')
      
      const gamesWithDetails = await Promise.all(
        searchData.results.slice(0, Math.min(pageSize, 15)).map(async (game, index) => {
          try {
            console.log(`🎮 RAWG: [${index + 1}/${searchData.results.length}] Fetching details for:`, game.name, 'ID:', game.id)
            
            // Récupérer les détails complets
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
            
            // Log des développeurs trouvés
            const developers = gameDetail.developers || []
            const publishers = gameDetail.publishers || []
            
            console.log(`🎮 RAWG: Details for "${gameDetail.name}":`, {
              developers: developers.map(d => d.name),
              publishers: publishers.map(p => p.name),
              rating: gameDetail.rating,
              released: gameDetail.released
            })
            
            return gameDetail
            
          } catch (error) {
            console.warn('🎮 RAWG: Error getting details for', game.name, ':', error)
            // Fallback vers les données de base avec structure minimale
            return {
              ...game,
              developers: game.developers || [],
              publishers: game.publishers || []
            }
          }
        })
      )

      console.log('🎮 RAWG: Successfully processed', gamesWithDetails.length, 'games with full details')
      
      // Filtrer les jeux valides et trier par pertinence
      const validGames = gamesWithDetails
        .filter(game => game && game.name)
        .sort((a, b) => {
          // Trier par correspondance de nom puis par rating
          const queryLower = query.toLowerCase()
          const aMatch = a.name.toLowerCase().includes(queryLower)
          const bMatch = b.name.toLowerCase().includes(queryLower)
          
          if (aMatch && !bMatch) return -1
          if (!aMatch && bMatch) return 1
          
          return (b.rating || 0) - (a.rating || 0)
        })
      
      console.log('🎮 RAWG: Returning', validGames.length, 'valid games')
      return validGames
      
    } catch (error) {
      console.error('🎮 RAWG: Search failed:', error)
      throw error
    }
  }

  // Obtenir les jeux populaires
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

  // Obtenir les jeux les mieux notés
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

  // Obtenir les nouveautés
  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentDate = new Date()
      const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, currentDate.getDate())
      
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-released&dates=${threeMonthsAgo.toISOString().split('T')[0]},${currentDate.toISOString().split('T')[0]}`
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

  // Obtenir les détails d'un jeu spécifique
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

  // ✅ CONVERSION AMÉLIORÉE avec gestion robuste des développeurs
  convertToAppFormat(game: RAWGGame): any {
    // ✅ EXTRACTION INTELLIGENTE DU DÉVELOPPEUR
    let developer = 'Unknown Developer'
    let finalDeveloper = 'Unknown Developer'
    
    // Priorité 1: Développeurs directs
    if (game.developers && game.developers.length > 0) {
      developer = game.developers[0].name
      finalDeveloper = developer
      console.log('🎮 Using primary developer:', developer)
    }
    // Priorité 2: Publishers comme fallback
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
      author: finalDeveloper,           // ✅ Pour compatibilité avec getCreator
      developer: finalDeveloper,        // ✅ Propriété spécifique aux jeux
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
      
      // Données supplémentaires
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

  // Obtenir des jeux similaires basés sur le genre
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
      
      // Filtrer le jeu actuel et retourner les autres
      return (data.results || [])
        .filter(g => g.id !== game.id)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching similar games:', error)
      return []
    }
  }

  // Obtenir des jeux par développeur
  async getGamesByDeveloper(developerId: number, excludeGameId: number, limit: number = 6): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&developers=${developerId}&page_size=${limit + 5}&ordering=-rating`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      
      // Filtrer le jeu actuel et retourner les autres
      return (data.results || [])
        .filter(g => g.id !== excludeGameId)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching games by developer:', error)
      return []
    }
  }
}

// Instance singleton
export const rawgService = new RAWGService()
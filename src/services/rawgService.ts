// src/services/rawgService.ts - FILTRAGE INTELLIGENT POUR ÉLIMINER LES FAUX RÉSULTATS
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
  private readonly apiKey = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  private readonly baseURL = 'https://api.rawg.io/api'

  /**
   * 🎯 RECHERCHE AVEC FILTRAGE INTELLIGENT
   */
  async searchGames(query: string, maxResults: number = 20): Promise<RAWGGame[]> {
    if (!query || query.trim().length < 2) {
      return []
    }

    const cleanQuery = query.trim()
    console.log('🎮 [RAWG] SMART search for:', cleanQuery)

    try {
      // ✅ DEMANDER PLUS DE RÉSULTATS POUR AVOIR DU CHOIX
      const url = `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(cleanQuery)}&page_size=40`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: RAWGSearchResponse = await response.json()

      if (!data.results) {
        return []
      }

      const rawGames = data.results
      console.log(`🎮 [RAWG] Raw results: ${rawGames.length} games`)

      // 🧹 FILTRAGE INTELLIGENT - ÉLIMINER LES FAUX POSITIFS
      const filteredGames = rawGames.filter(game => this.isRealGame(game, cleanQuery))
      console.log(`🎮 [RAWG] After filtering: ${filteredGames.length} games`)

      // 🎯 TRI PAR PERTINENCE ET QUALITÉ
      const sortedGames = this.sortByRelevanceAndQuality(filteredGames, cleanQuery)

      console.log('🎯 [RAWG] Final results:')
      sortedGames.slice(0, 8).forEach((game, i) => {
        console.log(`  ${i + 1}. ${game.name} (${game.released ? new Date(game.released).getFullYear() : 'N/A'}) - ${game.rating_count} reviews`)
      })

      return sortedGames.slice(0, maxResults)

    } catch (error) {
      console.error('🎮 [RAWG] Search failed:', error)
      return []
    }
  }

  /**
   * 🧹 DÉTECTEUR DE VRAIS JEUX (vs DLC/Collections/Fakes)
   */
  private isRealGame(game: RAWGGame, query: string): boolean {
    const name = game.name.toLowerCase()
    const queryLower = query.toLowerCase()

    // ❌ ÉLIMINER LES COLLECTIONS/BUNDLES/DLC
    const badKeywords = [
      'collection', 'bundle', 'pack', 'goodies', 'dlc', 'expansion',
      'soundtrack', 'ost', 'theme', 'wallpaper', 'avatar', 'season pass',
      'complete edition', 'definitive edition', 'ultimate edition',
      'pre-order', 'beta', 'alpha', 'demo', 'trailer'
    ]

    for (const keyword of badKeywords) {
      if (name.includes(keyword)) {
        console.log(`❌ Filtered out: ${game.name} (contains "${keyword}")`)
        return false
      }
    }

    // ❌ ÉLIMINER LES JEUX AVEC TROP PEU DE REVIEWS (probablement faux/inconnus)
    if (game.rating_count < 10) {
      console.log(`❌ Filtered out: ${game.name} (only ${game.rating_count} reviews)`)
      return false
    }

    // ❌ ÉLIMINER LES JEUX AVEC UN RATING TROP BAS (< 2.0)
    if (game.rating && game.rating < 2.0) {
      console.log(`❌ Filtered out: ${game.name} (rating too low: ${game.rating})`)
      return false
    }

    // ❌ ÉLIMINER LES JEUX SANS DÉVELOPPEUR CONNU
    if (!game.developers || game.developers.length === 0) {
      console.log(`❌ Filtered out: ${game.name} (no developer)`)
      return false
    }

    // ✅ GARDER LES CORRESPONDANCES EXACTES (même si peu de reviews)
    if (name === queryLower) {
      console.log(`✅ Exact match kept: ${game.name}`)
      return true
    }

    // ✅ GARDER LES JEUX AVEC BEAUCOUP DE REVIEWS (= populaires)
    if (game.rating_count >= 1000) {
      console.log(`✅ Popular game kept: ${game.name} (${game.rating_count} reviews)`)
      return true
    }

    // ✅ GARDER LES JEUX RÉCENTS AVEC QUELQUES REVIEWS
    if (game.released) {
      const gameYear = new Date(game.released).getFullYear()
      const currentYear = new Date().getFullYear()
      
      if (gameYear >= currentYear - 2 && game.rating_count >= 50) {
        console.log(`✅ Recent game kept: ${game.name} (${gameYear}, ${game.rating_count} reviews)`)
        return true
      }
    }

    // ✅ GARDER LES JEUX AVEC UN BON RATING ET ASSEZ DE REVIEWS
    if (game.rating >= 3.5 && game.rating_count >= 100) {
      console.log(`✅ Well-rated game kept: ${game.name} (${game.rating}/5, ${game.rating_count} reviews)`)
      return true
    }

    console.log(`❌ Filtered out: ${game.name} (insufficient criteria)`)
    return false
  }

  /**
   * 🎯 TRI PAR PERTINENCE ET QUALITÉ
   */
  private sortByRelevanceAndQuality(games: RAWGGame[], query: string): RAWGGame[] {
    return games.sort((a, b) => {
      const queryLower = query.toLowerCase()
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()

      // 1️⃣ CORRESPONDANCE EXACTE = PRIORITÉ ABSOLUE
      const aExact = aName === queryLower
      const bExact = bName === queryLower
      
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // 2️⃣ CORRESPONDANCE DÉBUT DE TITRE
      const aStarts = aName.startsWith(queryLower)
      const bStarts = bName.startsWith(queryLower)
      
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      // 3️⃣ CONTIENT LA REQUÊTE COMPLÈTE
      const aContains = aName.includes(queryLower)
      const bContains = bName.includes(queryLower)
      
      if (aContains && !bContains) return -1
      if (!aContains && bContains) return 1

      // 4️⃣ POUR LES CORRESPONDANCES SIMILAIRES, TRIER PAR POPULARITÉ
      if ((aContains && bContains) || (aStarts && bStarts)) {
        // Priorité aux jeux avec le plus de reviews (= plus populaires)
        if (a.rating_count !== b.rating_count) {
          return b.rating_count - a.rating_count
        }
        
        // Puis par rating
        return (b.rating || 0) - (a.rating || 0)
      }

      // 5️⃣ SINON, TRIER PAR POPULARITÉ GÉNÉRALE
      return b.rating_count - a.rating_count
    })
  }

  async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/games?key=${this.apiKey}&page_size=1`)
      
      if (!response.ok) {
        return { 
          success: false, 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }
      }
      
      const data = await response.json()
      
      return { 
        success: true, 
        message: `Connected! ${data.count || 0} games available` 
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      }
    }
  }

  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&metacritic=75,100`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
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
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-metacritic&metacritic=80,100`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching top rated games:', error)
      return []
    }
  }

  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentYear = new Date().getFullYear()
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-released&dates=${currentYear - 1}-01-01,${currentYear + 1}-12-31`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      
      // Filtrer les vrais jeux récents
      const realGames = (data.results || []).filter(game => this.isRealGame(game, ''))
      return realGames
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return []
    }
  }

  async getGameDetails(gameId: string | number): Promise<RAWGGame | null> {
    try {
      const response = await fetch(`${this.baseURL}/games/${gameId}?key=${this.apiKey}`)
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching game details:', error)
      return null
    }
  }

  convertToAppFormat(game: RAWGGame): any {
    let developer = 'Unknown Developer'
    
    if (game.developers && game.developers.length > 0) {
      developer = game.developers[0].name
    } else if (game.publishers && game.publishers.length > 0) {
      developer = game.publishers[0].name
    }
    
    return {
      id: `game-${game.id}`,
      title: game.name || 'Unknown Game',
      name: game.name || 'Unknown Game',
      author: developer,
      developer: developer,
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
  }

  async getSimilarGames(game: RAWGGame, limit: number = 6): Promise<RAWGGame[]> {
    if (!game.genres || game.genres.length === 0) return []
    
    try {
      const genre = game.genres[0].name
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&genres=${genre}&page_size=${limit + 10}&ordering=-rating`
      )
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data: RAWGSearchResponse = await response.json()
      
      const realGames = (data.results || [])
        .filter(g => g.id !== game.id)
        .filter(g => this.isRealGame(g, ''))
        .slice(0, limit)
      
      return realGames
    } catch (error) {
      console.error('Error fetching similar games:', error)
      return []
    }
  }
}

// Instance singleton
export const rawgService = new RAWGService()
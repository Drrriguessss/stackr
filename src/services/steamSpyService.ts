import { fetchWithCache } from '@/utils/apiCache'
import SteamImageService from './steamImageService'

const STEAMSPY_BASE_URL = 'https://steamspy.com/api.php'

// Types SteamSpy
export interface SteamSpyGame {
  appid: number
  name: string
  developer: string
  publisher: string
  score_rank?: string
  positive: number
  negative: number
  userscore: number
  owners: string
  average_forever: number
  average_2weeks: number
  median_forever: number
  median_2weeks: number
  price: string
  initialprice: string
  discount: string
  languages: string
  genre: string
  ccu: number
  tags: { [key: string]: number }
}

export interface SteamSpyResponse {
  [appid: string]: SteamSpyGame
}

class SteamSpyService {
  private buildUrl(request: string, params: Record<string, any> = {}): string {
    const queryParams = new URLSearchParams({
      request,
      ...params
    })
    return `${STEAMSPY_BASE_URL}?${queryParams.toString()}`
  }

  // Convertir un jeu SteamSpy vers notre format d'application
  convertToAppFormat(game: SteamSpyGame, appid: string): any {
    // Calculer le score basé sur les ratings positifs/négatifs
    const totalReviews = game.positive + game.negative
    const rating = totalReviews > 0 
      ? Math.round(((game.positive / totalReviews) * 5) * 10) / 10
      : 0

    // Parser les owners (format: "1,000,000 .. 2,000,000")
    const ownersRange = game.owners || "0 .. 0"
    const ownersNumbers = ownersRange.split(' .. ')
    const minOwners = parseInt(ownersNumbers[0]?.replace(/,/g, '') || '0')
    
    // 🎯 UTILISER LE FORMAT PORTRAIT POUR COHÉRENCE AVEC LES FILMS
    const steamImageUrl = SteamImageService.getBestPortraitImage(appid)
    console.log(`🎮 [Steam Images] Using portrait format for ${game.name}: ${steamImageUrl}`)

    return {
      id: `game-${appid}`,
      title: game.name || 'Unknown Game',
      year: new Date().getFullYear(), // SteamSpy ne fournit pas l'année de sortie
      image: steamImageUrl,
      category: 'games' as const,
      rating: Math.min(5, Math.max(0, rating)), // Assurer que c'est entre 0 et 5
      genre: this.parseGenre(game.genre),
      developer: game.developer || 'Unknown Developer',
      
      // Données additionnelles SteamSpy
      steamAppId: parseInt(appid),
      owners: game.owners,
      ownersCount: minOwners,
      positiveReviews: game.positive || 0,
      negativeReviews: game.negative || 0,
      price: game.price,
      discount: game.discount,
      averagePlaytime: game.average_forever,
      tags: game.tags,
      publisher: game.publisher
    }
  }

  private parseGenre(genreString: string): string {
    if (!genreString) return 'Unknown'
    
    // SteamSpy retourne les genres séparés par des virgules
    const genres = genreString.split(',').map(g => g.trim())
    return genres[0] || 'Unknown' // Prendre le premier genre
  }

  // 🔥 Top 100 jeux des 2 dernières semaines (par activité)
  async getTop100In2Weeks(): Promise<any[]> {
    try {
      const url = this.buildUrl('top100in2weeks')
      const cacheKey = 'steamspy-top100-2weeks'
      
      console.log('🎮 [SteamSpy] Fetching top 100 games in 2 weeks...')
      const response: SteamSpyResponse = await fetchWithCache(url, cacheKey)
      
      // Convertir l'objet en array et trier par nombre de reviews positives
      const gamesArray = Object.entries(response)
        .map(([appid, game]) => ({ ...game, appid: parseInt(appid) }))
        .sort((a, b) => (b.positive || 0) - (a.positive || 0))
        .slice(0, 20) // Prendre le top 20
      
      return gamesArray.map(game => 
        this.convertToAppFormat(game, game.appid.toString())
      )
    } catch (error) {
      console.error('🎮 [SteamSpy] Error fetching top 100 in 2 weeks:', error)
      return this.getMockGames()
    }
  }

  // 🌟 Top 100 jeux les plus possédés
  async getTop100Owned(page: number = 0): Promise<any[]> {
    try {
      const url = this.buildUrl('top100owned', { page })
      const cacheKey = `steamspy-top100-owned-${page}`
      
      console.log('🎮 [SteamSpy] Fetching top 100 owned games, page:', page)
      const response: SteamSpyResponse = await fetchWithCache(url, cacheKey)
      
      // Convertir et trier par nombre de propriétaires
      const gamesArray = Object.entries(response)
        .map(([appid, game]) => ({ ...game, appid: parseInt(appid) }))
        .sort((a, b) => {
          // Parser les owners pour trier
          const getOwnersMin = (owners: string) => {
            const match = owners?.match(/^([\d,]+)/)
            return parseInt(match?.[1]?.replace(/,/g, '') || '0')
          }
          return getOwnersMin(b.owners || '0') - getOwnersMin(a.owners || '0')
        })
        .slice(0, 20) // Top 20
      
      return gamesArray.map(game => 
        this.convertToAppFormat(game, game.appid.toString())
      )
    } catch (error) {
      console.error('🎮 [SteamSpy] Error fetching top 100 owned:', error)
      return this.getMockGames()
    }
  }

  // 🆕 Nouveautés Steam (combinaison intelligente pour de meilleurs résultats)
  async getNewReleases(): Promise<any[]> {
    try {
      console.log('🎮 [SteamSpy] Fetching new releases...')
      
      // Combiner plusieurs sources pour avoir de vrais "nouveaux" jeux
      const [recentActive, ownedPage1, ownedPage2] = await Promise.all([
        this.getTop100In2Weeks().catch(() => []),
        this.getTop100Owned(1).catch(() => []),
        this.getTop100Owned(2).catch(() => [])
      ])

      // Créer un pool de jeux uniques
      const allGames = [...recentActive, ...ownedPage1, ...ownedPage2]
      const uniqueGames = allGames.filter((game, index, self) => 
        index === self.findIndex(g => g.steamAppId === game.steamAppId)
      )

      // Trier avec diversité forcée et filtrage intelligent
      const sortedGames = uniqueGames
        .filter(game => {
          // Filtrage plus permissif pour débugger
          const totalReviews = (game.positiveReviews || 0) + (game.negativeReviews || 0)
          const hasMinReviews = totalReviews >= 500  // Réduit de 1000 à 500
          const hasDecentRating = game.rating >= 3.0  // Réduit de 3.5 à 3.0
          
          // Log pour débugger
          if (!hasMinReviews || !hasDecentRating) {
            console.log(`🔍 [SteamSpy Filter] ${game.title}: reviews=${totalReviews}, rating=${game.rating}, pass=${hasMinReviews && hasDecentRating}`)
          }
          
          return hasMinReviews && hasDecentRating
        })
        .sort((a, b) => {
          // Pénaliser les développeurs sur-représentés (comme Valve)
          const developerPenalty = (dev: string) => {
            if (dev?.toLowerCase().includes('valve')) return 0.7
            if (dev?.toLowerCase().includes('microsoft')) return 0.8
            return 1.0
          }
          
          // Priorité aux jeux avec bon ratio reviews/owners
          const ratioA = (a.positiveReviews || 0) / Math.max(a.ownersCount || 1, 1000)
          const ratioB = (b.positiveReviews || 0) / Math.max(b.ownersCount || 1, 1000)
          
          // Score avec diversité et qualité
          const diversityA = developerPenalty(a.developer)
          const diversityB = developerPenalty(b.developer)
          
          const scoreA = (a.rating || 0) * Math.min(ratioA * 1000, 10) * diversityA
          const scoreB = (b.rating || 0) * Math.min(ratioB * 1000, 10) * diversityB
          
          return scoreB - scoreA
        })

      // Forcer la diversité : max 2 jeux par développeur
      const diverseGames = []
      const developerCount: { [key: string]: number } = {}
      
      for (const game of sortedGames) {
        const dev = game.developer?.toLowerCase() || 'unknown'
        const currentCount = developerCount[dev] || 0
        
        if (currentCount < 2) { // Max 2 jeux par dev
          diverseGames.push(game)
          developerCount[dev] = currentCount + 1
          
          if (diverseGames.length >= 12) break // Arrêter à 12 jeux
        }
      }
      
      return diverseGames
    } catch (error) {
      console.error('🎮 [SteamSpy] Error fetching new releases:', error)
      return this.getMockGames()
    }
  }

  // 🎯 Jeux populaires (alias pour top 2 weeks)
  async getPopularGames(): Promise<any[]> {
    return this.getTop100In2Weeks()
  }

  // 📊 Données mockées de fallback
  private getMockGames(): any[] {
    return [
      {
        id: 'game-730',
        title: 'Counter-Strike 2',
        year: 2023,
        image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
        category: 'games' as const,
        rating: 4.5,
        genre: 'Action',
        developer: 'Valve',
        steamAppId: 730,
        owners: '50,000,000 .. 100,000,000',
        ownersCount: 50000000
      },
      {
        id: 'game-1086940',
        title: 'Baldur\'s Gate 3',
        year: 2023,
        image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
        category: 'games' as const,
        rating: 4.8,
        genre: 'RPG',
        developer: 'Larian Studios',
        steamAppId: 1086940,
        owners: '10,000,000 .. 20,000,000',
        ownersCount: 10000000
      },
      {
        id: 'game-1245620',
        title: 'ELDEN RING',
        year: 2022,
        image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
        category: 'games' as const,
        rating: 4.7,
        genre: 'Action RPG',
        developer: 'FromSoftware',
        steamAppId: 1245620,
        owners: '20,000,000 .. 50,000,000',
        ownersCount: 20000000
      }
    ]
  }

  // 🔍 Recherche de jeu par ID (pour les détails)
  async getGameDetails(appid: string): Promise<any | null> {
    try {
      const url = this.buildUrl('appdetails', { appid })
      const cacheKey = `steamspy-game-${appid}`
      
      console.log('🎮 [SteamSpy] Fetching game details:', appid)
      const response: SteamSpyResponse = await fetchWithCache(url, cacheKey)
      
      const gameData = response[appid]
      if (!gameData) return null
      
      return this.convertToAppFormat(gameData, appid)
    } catch (error) {
      console.error('🎮 [SteamSpy] Error fetching game details:', error)
      return null
    }
  }
}

// Export singleton instance
export const steamSpyService = new SteamSpyService()

// Export types
export type { SteamSpyGame, SteamSpyResponse }
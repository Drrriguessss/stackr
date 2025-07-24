// src/services/cheapSharkService.ts - Service de jeux vidéo avec CheapShark + fallback
import { fetchWithCache } from '@/utils/apiCache'

// Types pour CheapShark API
interface CheapSharkDeal {
  gameID: string
  title: string
  metacriticLink: string
  dealRating: string
  steamAppID: string
  salePrice: string
  normalPrice: string
  savings: string
  metacriticScore: string
  steamRatingText: string
  steamRatingPercent: string
  steamRatingCount: string
  releaseDate: number
  lastChange: number
  dealID: string
  storeID: string
  thumb: string
}

interface SteamAppDetails {
  name: string
  steam_appid: number
  is_free: boolean
  detailed_description: string
  short_description: string
  header_image: string
  screenshots: Array<{ path_thumbnail: string; path_full: string }>
  release_date: { date: string }
  developers: string[]
  publishers: string[]
  genres: Array<{ description: string }>
  categories: Array<{ description: string }>
}

class CheapSharkGameService {
  private readonly baseUrl = 'https://www.cheapshark.com/api/1.0'
  private readonly steamApiUrl = 'https://store.steampowered.com/api'

  // 🎮 Obtenir des jeux populaires avec des données enrichies
  async getPopularGames(): Promise<any[]> {
    try {
      console.log('🎮 [CheapShark] Fetching popular games...')
      
      // Récupérer les deals populaires
      const dealsUrl = `${this.baseUrl}/deals?storeID=1&upperPrice=50&pageSize=50&sortBy=Metacritic`
      const deals: CheapSharkDeal[] = await fetchWithCache(dealsUrl, 'cheapshark-deals')
      
      console.log(`🎮 [CheapShark] Found ${deals.length} deals`)
      
      // Filtrer et convertir les meilleurs jeux
      const games = deals
        .filter(deal => {
          return deal.metacriticScore && parseInt(deal.metacriticScore) >= 70 &&
                 deal.steamRatingPercent && parseInt(deal.steamRatingPercent) >= 70
        })
        .slice(0, 20)
        .map(deal => this.convertDealToGame(deal))
      
      console.log(`🎮 [CheapShark] Converted ${games.length} games`)
      return games.slice(0, 8) // Top 8 pour l'affichage
      
    } catch (error) {
      console.error('🎮 [CheapShark] Error fetching games:', error)
      return this.getFallbackGames()
    }
  }

  // 🆕 Nouveaux jeux (récents avec bonnes notes)
  async getNewReleases(): Promise<any[]> {
    try {
      console.log('🎮 [CheapShark] Fetching new releases...')
      
      const currentYear = new Date().getFullYear()
      const lastYear = currentYear - 1
      
      // Rechercher des jeux récents
      const dealsUrl = `${this.baseUrl}/deals?storeID=1&upperPrice=60&pageSize=40&sortBy=recent`
      const deals: CheapSharkDeal[] = await fetchWithCache(dealsUrl, 'cheapshark-new')
      
      const recentGames = deals
        .filter(deal => {
          const releaseYear = deal.releaseDate ? new Date(deal.releaseDate * 1000).getFullYear() : 0
          return releaseYear >= lastYear && 
                 deal.metacriticScore && parseInt(deal.metacriticScore) >= 65
        })
        .slice(0, 12)
        .map(deal => this.convertDealToGame(deal))
      
      console.log(`🎮 [CheapShark] Found ${recentGames.length} new games`)
      return recentGames.slice(0, 8)
      
    } catch (error) {
      console.error('🎮 [CheapShark] Error fetching new releases:', error)
      return this.getFallbackGames()
    }
  }

  // 🔥 Jeux tendance (avec plus de reviews récentes)
  async getTrendingGames(): Promise<any[]> {
    try {
      console.log('🎮 [CheapShark] Fetching trending games...')
      
      const dealsUrl = `${this.baseUrl}/deals?storeID=1&upperPrice=40&pageSize=30&sortBy=Deal Rating`
      const deals: CheapSharkDeal[] = await fetchWithCache(dealsUrl, 'cheapshark-trending')
      
      const trendingGames = deals
        .filter(deal => {
          return deal.steamRatingCount && parseInt(deal.steamRatingCount) >= 1000 &&
                 deal.steamRatingPercent && parseInt(deal.steamRatingPercent) >= 75
        })
        .slice(0, 12)
        .map(deal => this.convertDealToGame(deal))
      
      console.log(`🎮 [CheapShark] Found ${trendingGames.length} trending games`)
      return trendingGames.slice(0, 8)
      
    } catch (error) {
      console.error('🎮 [CheapShark] Error fetching trending games:', error)
      return this.getFallbackGames()
    }
  }

  // Convertir un deal CheapShark en format de l'app
  private convertDealToGame(deal: CheapSharkDeal): any {
    const releaseYear = deal.releaseDate ? new Date(deal.releaseDate * 1000).getFullYear() : 2024
    const rating = deal.metacriticScore ? parseInt(deal.metacriticScore) / 20 : 4.0 // Convertir 0-100 en 0-5
    
    return {
      id: `game-cs-${deal.gameID}`,
      title: deal.title,
      year: releaseYear,
      image: deal.thumb || this.generatePlaceholderImage(deal.title),
      category: 'games' as const,
      rating: Math.min(5, Math.max(1, Math.round(rating * 10) / 10)),
      genre: 'PC Game',
      developer: 'Various',
      
      // Données CheapShark
      cheapSharkId: deal.gameID,
      steamAppId: deal.steamAppID,
      metacriticScore: deal.metacriticScore,
      steamRating: deal.steamRatingPercent,
      steamReviews: deal.steamRatingCount,
      salePrice: deal.salePrice,
      normalPrice: deal.normalPrice,
      savings: deal.savings,
      
      // Données simulées pour compatibilité
      description: `${deal.title} is a highly-rated PC game with excellent reviews from the gaming community.`,
      owners: this.estimateOwners(deal.steamRatingCount),
      ownersCount: this.estimateOwnersCount(deal.steamRatingCount),
    }
  }

  private generatePlaceholderImage(title: string): string {
    const encodedTitle = encodeURIComponent(title.substring(0, 20))
    const colors = ['4285f4', 'ea4335', 'fbbc04', '34a853', '9aa0a6', 'ff6d01', '9c27b0']
    const color = colors[title.length % colors.length]
    return `https://via.placeholder.com/600x800/${color}/ffffff?text=${encodedTitle}`
  }

  private estimateOwners(steamReviews: string): string {
    const reviews = parseInt(steamReviews) || 0
    // Estimer basé sur le ratio review/owner (généralement 1-3%)
    const estimated = reviews * 50
    
    if (estimated >= 10000000) return '10,000,000+'
    if (estimated >= 5000000) return '5,000,000 - 10,000,000'
    if (estimated >= 1000000) return '1,000,000 - 5,000,000'
    if (estimated >= 500000) return '500,000 - 1,000,000'
    return '100,000 - 500,000'
  }

  private estimateOwnersCount(steamReviews: string): number {
    const reviews = parseInt(steamReviews) || 0
    return reviews * 50
  }

  // Jeux de fallback si l'API échoue
  private getFallbackGames(): any[] {
    const fallbackGames = [
      {
        id: 'game-cs-fallback-1',
        title: 'Cyberpunk 2077',
        year: 2020,
        image: 'https://via.placeholder.com/600x800/ff6b35/ffffff?text=Cyberpunk+2077',
        category: 'games' as const,
        rating: 4.1,
        genre: 'RPG',
        developer: 'CD Projekt Red'
      },
      {
        id: 'game-cs-fallback-2',
        title: 'The Witcher 3',
        year: 2015,
        image: 'https://via.placeholder.com/600x800/4285f4/ffffff?text=The+Witcher+3',
        category: 'games' as const,
        rating: 4.8,
        genre: 'RPG',
        developer: 'CD Projekt Red'
      },
      {
        id: 'game-cs-fallback-3',
        title: 'Grand Theft Auto V',
        year: 2013,
        image: 'https://via.placeholder.com/600x800/34a853/ffffff?text=GTA+V',
        category: 'games' as const,
        rating: 4.5,
        genre: 'Action',
        developer: 'Rockstar Games'
      },
      {
        id: 'game-cs-fallback-4',
        title: 'Red Dead Redemption 2',
        year: 2018,
        image: 'https://via.placeholder.com/600x800/ea4335/ffffff?text=RDR2',
        category: 'games' as const,
        rating: 4.7,
        genre: 'Action',
        developer: 'Rockstar Games'
      },
      {
        id: 'game-cs-fallback-5',
        title: 'Baldurs Gate 3',
        year: 2023,
        image: 'https://via.placeholder.com/600x800/9c27b0/ffffff?text=Baldurs+Gate+3',
        category: 'games' as const,
        rating: 4.9,
        genre: 'RPG',
        developer: 'Larian Studios'
      },
      {
        id: 'game-cs-fallback-6',
        title: 'Elden Ring',
        year: 2022,
        image: 'https://via.placeholder.com/600x800/fbbc04/ffffff?text=Elden+Ring',
        category: 'games' as const,
        rating: 4.6,
        genre: 'Action RPG',
        developer: 'FromSoftware'
      },
      {
        id: 'game-cs-fallback-7',
        title: 'Hades',
        year: 2020,
        image: 'https://via.placeholder.com/600x800/ff6d01/ffffff?text=Hades',
        category: 'games' as const,
        rating: 4.4,
        genre: 'Roguelike',
        developer: 'Supergiant Games'
      },
      {
        id: 'game-cs-fallback-8',
        title: 'Portal 2',
        year: 2011,
        image: 'https://via.placeholder.com/600x800/9aa0a6/ffffff?text=Portal+2',
        category: 'games' as const,
        rating: 4.8,
        genre: 'Puzzle',
        developer: 'Valve'
      }
    ]
    
    console.log('🎮 [CheapShark] Using fallback games')
    return fallbackGames
  }
}

// Export singleton
export const cheapSharkGameService = new CheapSharkGameService()
export type { CheapSharkDeal }
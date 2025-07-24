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

  // 🌟 4 Jeux quotidiens pour Hero Carousel
  async getDailyHeroGames(): Promise<any[]> {
    try {
      console.log('🌟 [CheapShark] Fetching daily hero games (4 per day rotation)...')
      
      const [recentDeals, topRated, popularDeals] = await Promise.all([
        fetchWithCache(`${this.baseUrl}/deals?storeID=1&upperPrice=80&pageSize=60&sortBy=recent`, 'cheapshark-hero-recent'),
        fetchWithCache(`${this.baseUrl}/deals?storeID=1&upperPrice=80&pageSize=40&sortBy=Metacritic`, 'cheapshark-hero-rated'),
        fetchWithCache(`${this.baseUrl}/deals?storeID=1&upperPrice=60&pageSize=40&sortBy=Deal Rating`, 'cheapshark-hero-popular')
      ])
      
      // Combiner toutes les sources
      const allDeals = [...recentDeals, ...topRated, ...popularDeals]
      const currentYear = new Date().getFullYear()
      
      // Filtrer pour des jeux de qualité (minimum 4/5 étoiles)
      const qualityGames = allDeals
        .filter(deal => {
          const releaseYear = deal.releaseDate ? new Date(deal.releaseDate * 1000).getFullYear() : 0
          const metacritic = parseInt(deal.metacriticScore) || 0
          const steamRating = parseInt(deal.steamRatingPercent) || 0
          
          // Jeux récents (3 dernières années) OU excellent score
          const isRecentOrExcellent = (releaseYear >= currentYear - 2) || (metacritic >= 85)
          
          // Score élevé: 80+ Metacritic OU 90+ Steam (équivalent 4/5 étoiles)
          const hasHighScore = metacritic >= 80 || steamRating >= 90
          
          // Doit avoir une image Steam
          const hasImage = deal.steamAppID && deal.steamAppID !== '0'
          
          return isRecentOrExcellent && hasHighScore && hasImage
        })
        .map(deal => this.convertDealToGame(deal))
      
      // Déduplication par titre
      const uniqueGames = this.deduplicateGames(qualityGames)
      
      // ✅ FILTRAGE FINAL: Garantir 4/5 étoiles minimum
      const premiumGames = uniqueGames.filter(game => game.rating >= 4.0)
      
      console.log(`🌟 [CheapShark] Games after 4+ stars filter: ${premiumGames.length}/${uniqueGames.length}`)
      
      // Sélection quotidienne déterministe
      const dailySelection = this.selectDailyGames(premiumGames, 4)
      
      console.log(`🌟 [CheapShark] Selected daily hero games:`, dailySelection.map(g => `${g.title} (${g.year})`))
      
      return dailySelection.length >= 4 ? dailySelection : this.getFallbackHeroGames()
      
    } catch (error) {
      console.error('🌟 [CheapShark] Error fetching daily hero games:', error)
      return this.getFallbackHeroGames()
    }
  }

  // Sélection quotidienne déterministe basée sur la date
  private selectDailyGames(games: any[], count: number): any[] {
    if (games.length < count) return games
    
    // Utiliser la date comme seed pour avoir les mêmes jeux toute la journée
    const today = new Date()
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    const seed = this.hashString(dateString)
    
    // Mélanger de façon déterministe
    const shuffled = [...games]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed + i) % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled.slice(0, count)
  }

  // Fonction de hash simple pour créer un seed reproductible
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // Fallback : 4 jeux premium sélectionnés
  private getFallbackHeroGames(): any[] {
    const fallbackGames = [
      {
        id: 'game-cs-hero-1',
        title: 'Baldurs Gate 3',
        year: 2023,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg',
        category: 'games' as const,
        rating: 4.9,
        genre: 'RPG',
        platform: 'PC',
        metacriticScore: '96',
        description: 'An epic role-playing game that sets new standards for the genre.'
      },
      {
        id: 'game-cs-hero-2',
        title: 'Elden Ring',
        year: 2022,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
        category: 'games' as const,
        rating: 4.6,
        genre: 'Action RPG',
        platform: 'PC',
        metacriticScore: '94',
        description: 'A masterpiece that redefines the open-world action RPG genre.'
      },
      {
        id: 'game-cs-hero-3',
        title: 'Hades',
        year: 2020,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg',
        category: 'games' as const,
        rating: 4.8,
        genre: 'Roguelike',
        platform: 'PC',
        metacriticScore: '93',
        description: 'A superbly crafted roguelike with incredible storytelling.'
      },
      {
        id: 'game-cs-hero-4',
        title: 'The Witcher 3: Wild Hunt',
        year: 2015,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg',
        category: 'games' as const,
        rating: 4.8,
        genre: 'RPG',
        platform: 'PC',
        metacriticScore: '92',
        description: 'An immersive open-world RPG with unparalleled depth.'
      }
    ]

    // Appliquer la même logique de sélection quotidienne
    return this.selectDailyGames(fallbackGames, 4)
  }

  // 🔥 Jeux tendance (privilégiant les jeux récents avec activité)
  async getTrendingGames(): Promise<any[]> {
    try {
      console.log('🎮 [CheapShark] Fetching truly trending games...')
      
      // Combiner plusieurs sources pour un vrai trending
      const [recentDeals, popularDeals] = await Promise.all([
        // 1. Jeux récents avec deals (activité récente)
        fetchWithCache(`${this.baseUrl}/deals?storeID=1&upperPrice=60&pageSize=25&sortBy=recent`, 'cheapshark-recent-activity'),
        // 2. Jeux populaires actuels
        fetchWithCache(`${this.baseUrl}/deals?storeID=1&upperPrice=50&pageSize=25&sortBy=Metacritic`, 'cheapshark-popular-current')
      ])
      
      // Combiner et scorer les jeux
      const allDeals = [...recentDeals, ...popularDeals]
      const scoredGames = allDeals
        .map(deal => ({
          ...deal,
          trendingScore: this.calculateTrendingScore(deal)
        }))
        .filter(deal => deal.trendingScore > 0)
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 15) // Top 15 pour diversité
      
      // Déduplication par titre
      const uniqueGames = this.deduplicateGames(scoredGames)
      
      const trendingGames = uniqueGames
        .slice(0, 8)
        .map(deal => this.convertToAppFormat(deal))
      
      console.log(`🎮 [CheapShark] Found ${trendingGames.length} truly trending games`)
      console.log(`🎮 [CheapShark] Top trending titles:`, trendingGames.slice(0, 3).map(g => `${g.title} (${g.year})`))
      
      return trendingGames
      
    } catch (error) {
      console.error('🎮 [CheapShark] Error fetching trending games:', error)
      return this.getFallbackGames()
    }
  }

  // 📊 Calculer le score de trending d'un jeu
  private calculateTrendingScore(deal: CheapSharkDeal): number {
    let score = 0
    
    const currentYear = new Date().getFullYear()
    const releaseYear = deal.releaseDate ? new Date(deal.releaseDate * 1000).getFullYear() : 0
    const age = currentYear - releaseYear
    
    // 1. Bonus pour les jeux récents (facteur le plus important)
    if (age <= 1) score += 100 // Jeux de cette année ou l'année dernière
    else if (age <= 2) score += 80 // 2024-2023
    else if (age <= 3) score += 60 // 2022
    else if (age <= 5) score += 30 // 2020-2021
    else if (age <= 8) score += 10 // 2017-2019
    // Jeux plus anciens : score de base seulement
    
    // 2. Score Metacritic (qualité)
    const metacritic = parseInt(deal.metacriticScore) || 0
    if (metacritic >= 90) score += 25
    else if (metacritic >= 80) score += 20
    else if (metacritic >= 70) score += 15
    else if (metacritic >= 60) score += 10
    
    // 3. Popularité Steam (nombre de reviews)
    const reviews = parseInt(deal.steamRatingCount) || 0
    if (reviews >= 50000) score += 20
    else if (reviews >= 10000) score += 15
    else if (reviews >= 5000) score += 10
    else if (reviews >= 1000) score += 5
    
    // 4. Rating Steam (satisfaction)
    const steamRating = parseInt(deal.steamRatingPercent) || 0
    if (steamRating >= 95) score += 15
    else if (steamRating >= 85) score += 10
    else if (steamRating >= 75) score += 5
    
    // 5. Bonus pour les deals récents (activité marketplace)
    const lastChangeHours = deal.lastChange ? (Date.now() / 1000 - deal.lastChange) / 3600 : 999999
    if (lastChangeHours <= 24) score += 20 // Deal dans les 24h
    else if (lastChangeHours <= 168) score += 10 // Deal cette semaine
    
    // 6. Bonus pour les économies importantes
    const savings = parseFloat(deal.savings) || 0
    if (savings >= 75) score += 15
    else if (savings >= 50) score += 10
    else if (savings >= 25) score += 5
    
    return score
  }

  // 🎯 Déduplication des jeux par titre similaire
  private deduplicateGames(games: any[]): any[] {
    const seen = new Set<string>()
    return games.filter(game => {
      const cleanTitle = game.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seen.has(cleanTitle)) {
        return false
      }
      seen.add(cleanTitle)
      return true
    })
  }

  // 🎮 Convertir avec données de trending
  private convertToAppFormat(deal: any): any {
    const converted = this.convertDealToGame(deal)
    
    // Ajouter les métadonnées de trending
    converted.trendingScore = deal.trendingScore
    converted.trendingReason = this.getTrendingReason(deal)
    
    return converted
  }

  // 📈 Expliquer pourquoi ce jeu est trending
  private getTrendingReason(deal: any): string {
    const currentYear = new Date().getFullYear()
    const releaseYear = deal.releaseDate ? new Date(deal.releaseDate * 1000).getFullYear() : 0
    const age = currentYear - releaseYear
    
    if (age <= 1) return "New Release"
    if (age <= 2) return "Recently Popular"
    if (parseFloat(deal.savings) >= 50) return "Major Sale"
    if (parseInt(deal.steamRatingCount) >= 20000) return "Community Favorite"
    if (parseInt(deal.metacriticScore) >= 85) return "Critically Acclaimed"
    
    return "Trending Now"
  }

  // Convertir un deal CheapShark en format de l'app
  private convertDealToGame(deal: CheapSharkDeal): any {
    const releaseYear = deal.releaseDate ? new Date(deal.releaseDate * 1000).getFullYear() : 2024
    
    // ✅ CALCUL CORRIGÉ: Rating basé sur les deux sources
    let rating = 4.0 // Default fallback
    const metacriticScore = parseInt(deal.metacriticScore) || 0
    const steamRating = parseInt(deal.steamRatingPercent) || 0
    
    if (metacriticScore > 0) {
      rating = metacriticScore / 20 // Convertir 0-100 en 0-5
    } else if (steamRating > 0) {
      rating = steamRating / 20 // Convertir 0-100 en 0-5
    }
    
    // ✅ AMÉLIORATION: Utiliser l'image Steam si disponible
    const imageUrl = this.getSteamImageUrl(deal.steamAppID, deal.title) || deal.thumb || this.generatePlaceholderImage(deal.title)
    
    return {
      id: `game-cs-${deal.gameID}`,
      title: deal.title,
      year: releaseYear,
      image: imageUrl,
      category: 'games' as const,
      rating: Math.min(5, Math.max(0, Math.round(rating * 10) / 10)), // Permettre 0, pas de minimum artificiel
      genre: this.getGenreFromTitle(deal.title),
      developer: null, // Ne pas afficher si on ne connait pas
      
      // ✅ NOUVEAU: Nom original pour la recherche RAWG
      originalTitle: deal.title,
      searchableTitle: this.cleanTitleForSearch(deal.title),
      
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

  // ✅ NOUVEAU: Obtenir l'URL d'image Steam de meilleure qualité
  private getSteamImageUrl(steamAppId: string, title: string): string | null {
    if (!steamAppId || steamAppId === '0') return null
    
    // ✨ Utiliser les capsules Steam (format plus vertical) au lieu des headers
    // Capsule: ~231x87 px (plus compact, moins bannière)
    // Library: ~600x900 px (portrait vertical comme les films)
    
    // Essayer d'abord le format library (vertical)
    return `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`
  }

  // ✅ NOUVEAU: Nettoyer le titre pour la recherche RAWG
  private cleanTitleForSearch(title: string): string {
    return title
      .replace(/™|®|©/g, '') // Supprimer les symboles de marque
      .replace(/\s*-\s*(Game of the Year|GOTY|Definitive|Enhanced|Special|Deluxe|Ultimate|Complete|Director's Cut).*$/i, '') // Supprimer les éditions spéciales
      .replace(/\s*\(.*\)$/g, '') // Supprimer le contenu entre parenthèses en fin
      .replace(/[:\-–—]/g, ' ') // Remplacer les deux-points et tirets par des espaces
      .replace(/\s+/g, ' ') // Normaliser les espaces multiples
      .trim()
  }

  // ✅ NOUVEAU: Deviner le genre d'après le titre
  private getGenreFromTitle(title: string): string {
    const lowerTitle = title.toLowerCase()
    
    // Patterns de genres
    if (lowerTitle.includes('rpg') || lowerTitle.includes('role playing')) return 'RPG'
    if (lowerTitle.includes('shooter') || lowerTitle.includes('fps')) return 'Shooter'
    if (lowerTitle.includes('strategy') || lowerTitle.includes('rts')) return 'Strategy'
    if (lowerTitle.includes('racing') || lowerTitle.includes('race')) return 'Racing'
    if (lowerTitle.includes('sports') || lowerTitle.includes('football') || lowerTitle.includes('basketball')) return 'Sports'
    if (lowerTitle.includes('horror') || lowerTitle.includes('scary')) return 'Horror'
    if (lowerTitle.includes('simulation') || lowerTitle.includes('simulator')) return 'Simulation'
    if (lowerTitle.includes('puzzle')) return 'Puzzle'
    if (lowerTitle.includes('adventure')) return 'Adventure'
    if (lowerTitle.includes('action')) return 'Action'
    
    // Par défaut
    return 'PC Game'
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

  // Jeux de fallback si l'API échoue (avec vraies images Steam)
  private getFallbackGames(): any[] {
    const fallbackGames = [
      {
        id: 'game-cs-fallback-1',
        title: 'Cyberpunk 2077',
        year: 2020,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
        category: 'games' as const,
        rating: 4.1,
        genre: 'RPG',
        developer: 'CD Projekt Red',
        originalTitle: 'Cyberpunk 2077',
        searchableTitle: 'cyberpunk 2077'
      },
      {
        id: 'game-cs-fallback-2',
        title: 'The Witcher 3: Wild Hunt',
        year: 2015,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg',
        category: 'games' as const,
        rating: 4.8,
        genre: 'RPG',
        developer: 'CD Projekt Red',
        originalTitle: 'The Witcher 3: Wild Hunt',
        searchableTitle: 'witcher 3'
      },
      {
        id: 'game-cs-fallback-3',
        title: 'Grand Theft Auto V',
        year: 2013,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
        category: 'games' as const,
        rating: 4.5,
        genre: 'Action',
        developer: 'Rockstar Games',
        originalTitle: 'Grand Theft Auto V',
        searchableTitle: 'grand theft auto v'
      },
      {
        id: 'game-cs-fallback-4',
        title: 'Red Dead Redemption 2',
        year: 2018,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg',
        category: 'games' as const,
        rating: 4.7,
        genre: 'Action',
        developer: 'Rockstar Games',
        originalTitle: 'Red Dead Redemption 2',
        searchableTitle: 'red dead redemption 2'
      },
      {
        id: 'game-cs-fallback-5',
        title: 'Baldurs Gate 3',
        year: 2023,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg',
        category: 'games' as const,
        rating: 4.9,
        genre: 'RPG',
        developer: 'Larian Studios',
        originalTitle: 'Baldurs Gate 3',
        searchableTitle: 'baldurs gate 3'
      },
      {
        id: 'game-cs-fallback-6',
        title: 'Elden Ring',
        year: 2022,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
        category: 'games' as const,
        rating: 4.6,
        genre: 'Action RPG',
        developer: 'FromSoftware',
        originalTitle: 'Elden Ring',
        searchableTitle: 'elden ring'
      },
      {
        id: 'game-cs-fallback-7',
        title: 'Hades',
        year: 2020,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg',
        category: 'games' as const,
        rating: 4.4,
        genre: 'Roguelike',
        developer: 'Supergiant Games',
        originalTitle: 'Hades',
        searchableTitle: 'hades'
      },
      {
        id: 'game-cs-fallback-8',
        title: 'Portal 2',
        year: 2011,
        image: 'https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg',
        category: 'games' as const,
        rating: 4.8,
        genre: 'Puzzle',
        developer: 'Valve',
        originalTitle: 'Portal 2',
        searchableTitle: 'portal 2'
      }
    ]
    
    console.log('🎮 [CheapShark] Using fallback games with Steam images')
    return fallbackGames
  }
}

// Export singleton
export const cheapSharkGameService = new CheapSharkGameService()
export type { CheapSharkDeal }
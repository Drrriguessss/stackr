import { fetchWithCache } from '@/utils/apiCache'

const FREETOGAME_BASE_URL = 'https://www.freetogame.com/api'

// Types FreeToGame
export interface FreeToGameItem {
  id: number
  title: string
  thumbnail: string
  short_description: string
  game_url: string
  genre: string
  platform: string
  publisher: string
  developer: string
  release_date: string
  freetogame_profile_url: string
}

class FreeToGameService {
  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const queryParams = new URLSearchParams(params)
    const query = queryParams.toString()
    return `${FREETOGAME_BASE_URL}${endpoint}${query ? '?' + query : ''}`
  }

  // Convertir un jeu FreeToGame vers notre format d'application
  convertToAppFormat(game: FreeToGameItem): any {
    // Générer un rating basé sur la popularité et le genre
    const genreRatings: { [key: string]: number } = {
      'Shooter': 4.2,
      'MMORPG': 4.0,
      'Action RPG': 4.3,
      'Battle Royale': 3.8,
      'Racing': 3.9,
      'Strategy': 4.1,
      'Card': 3.7,
      'Fighting': 4.0,
      'Sports': 3.5,
      'MOBA': 4.2
    }
    
    const baseRating = genreRatings[game.genre] || 3.8
    const randomVariation = (Math.random() - 0.5) * 0.6 // ±0.3
    const rating = Math.min(5, Math.max(2.5, baseRating + randomVariation))

    // Parser l'année depuis la date de release
    const releaseYear = game.release_date ? new Date(game.release_date).getFullYear() : new Date().getFullYear()

    return {
      id: `game-ftg-${game.id}`,
      title: game.title,
      year: releaseYear,
      image: game.thumbnail,
      category: 'games' as const,
      rating: Math.round(rating * 10) / 10, // 1 décimale
      genre: game.genre,
      developer: game.developer || 'Unknown Developer',
      
      // Données additionnelles FreeToGame
      freeToGameId: game.id,
      description: game.short_description,
      publisher: game.publisher,
      platform: game.platform,
      releaseDate: game.release_date,
      gameUrl: game.game_url,
      profileUrl: game.freetogame_profile_url,
      
      // Données simulées pour compatibilité
      owners: this.estimateOwners(game.genre, releaseYear),
      ownersCount: this.estimateOwnersCount(game.genre, releaseYear),
      positiveReviews: this.estimatePositiveReviews(rating),
      negativeReviews: this.estimateNegativeReviews(rating)
    }
  }

  private estimateOwners(genre: string, year: number): string {
    // Estimer les propriétaires basé sur le genre et l'âge
    const baseOwners = {
      'Shooter': 15000000,
      'MMORPG': 8000000,
      'Action RPG': 12000000,
      'Battle Royale': 25000000,
      'MOBA': 20000000
    }[genre] || 5000000

    // Réduire pour les jeux plus anciens
    const currentYear = new Date().getFullYear()
    const ageMultiplier = Math.max(0.3, 1 - (currentYear - year) * 0.1)
    const estimated = Math.round(baseOwners * ageMultiplier)

    if (estimated >= 50000000) return '50,000,000 .. 100,000,000'
    if (estimated >= 20000000) return '20,000,000 .. 50,000,000'
    if (estimated >= 10000000) return '10,000,000 .. 20,000,000'
    if (estimated >= 5000000) return '5,000,000 .. 10,000,000'
    return '1,000,000 .. 5,000,000'
  }

  private estimateOwnersCount(genre: string, year: number): number {
    const baseOwners = {
      'Shooter': 15000000,
      'MMORPG': 8000000,
      'Action RPG': 12000000,
      'Battle Royale': 25000000,
      'MOBA': 20000000
    }[genre] || 5000000

    const currentYear = new Date().getFullYear()
    const ageMultiplier = Math.max(0.3, 1 - (currentYear - year) * 0.1)
    return Math.round(baseOwners * ageMultiplier)
  }

  private estimatePositiveReviews(rating: number): number {
    // Estimer les reviews positives basé sur le rating
    const baseReviews = Math.round(Math.random() * 50000 + 10000) // 10k-60k
    const ratingMultiplier = rating / 3.0 // Normaliser
    return Math.round(baseReviews * ratingMultiplier)
  }

  private estimateNegativeReviews(rating: number): number {
    const positiveReviews = this.estimatePositiveReviews(rating)
    const negativeRatio = Math.max(0.05, (5 - rating) / 5) // Plus le rating est bas, plus de négatives
    return Math.round(positiveReviews * negativeRatio)
  }

  // 🔥 Jeux populaires triés par popularité
  async getPopularGames(): Promise<any[]> {
    try {
      const url = this.buildUrl('/games', { 'sort-by': 'popularity' })
      const cacheKey = 'freetogame-popular'
      
      console.log('🎮 [FreeToGame] Fetching popular games...')
      const response: FreeToGameItem[] = await fetchWithCache(url, cacheKey)
      
      return response
        .slice(0, 30) // Top 30 pour avoir du choix
        .map(game => this.convertToAppFormat(game))
        .filter(game => {
          // Filtrer les jeux de qualité
          return game.rating >= 3.0 && game.year >= 2020
        })
        .slice(0, 20) // Top 20 final
    } catch (error) {
      console.error('🎮 [FreeToGame] Error fetching popular games:', error)
      return this.getMockGames()
    }
  }

  // 🆕 Nouvelles sorties
  async getNewReleases(): Promise<any[]> {
    try {
      const url = this.buildUrl('/games', { 'sort-by': 'release-date' })
      const cacheKey = 'freetogame-new-releases'
      
      console.log('🎮 [FreeToGame] Fetching new releases...')
      const response: FreeToGameItem[] = await fetchWithCache(url, cacheKey)
      
      return response
        .slice(0, 25) // Top 25 plus récents
        .map(game => this.convertToAppFormat(game))
        .filter(game => {
          // Favoriser les jeux récents et de qualité
          const currentYear = new Date().getFullYear()
          return game.rating >= 3.2 && game.year >= currentYear - 2 // 2 dernières années
        })
        .sort((a, b) => b.year - a.year) // Tri par année décroissante  
        .slice(0, 15) // Top 15 récents
    } catch (error) {
      console.error('🎮 [FreeToGame] Error fetching new releases:', error)
      return this.getMockGames()
    }
  }

  // 🎯 Jeux par genre
  async getGamesByGenre(genre: string): Promise<any[]> {
    try {
      const url = this.buildUrl('/games', { category: genre.toLowerCase() })
      const cacheKey = `freetogame-genre-${genre}`
      
      console.log(`🎮 [FreeToGame] Fetching ${genre} games...`)
      const response: FreeToGameItem[] = await fetchWithCache(url, cacheKey)
      
      return response
        .slice(0, 20)
        .map(game => this.convertToAppFormat(game))
        .filter(game => game.rating >= 3.0)
    } catch (error) {
      console.error(`🎮 [FreeToGame] Error fetching ${genre} games:`, error)
      return this.getMockGames()
    }
  }

  // 🎮 Jeux PC uniquement
  async getPCGames(): Promise<any[]> {
    try {
      const url = this.buildUrl('/games', { platform: 'pc' })
      const cacheKey = 'freetogame-pc-games'
      
      console.log('🎮 [FreeToGame] Fetching PC games...')
      const response: FreeToGameItem[] = await fetchWithCache(url, cacheKey)
      
      return response
        .slice(0, 25)
        .map(game => this.convertToAppFormat(game))
        .filter(game => game.rating >= 3.1)
        .slice(0, 20)
    } catch (error) {
      console.error('🎮 [FreeToGame] Error fetching PC games:', error)
      return this.getMockGames()
    }
  }

  // 📊 Données mockées de fallback
  private getMockGames(): any[] {
    return [
      {
        id: 'game-ftg-540',
        title: 'Delta Force',
        year: 2024,
        image: 'https://www.freetogame.com/g/540/thumbnail.jpg',
        category: 'games' as const,
        rating: 4.2,
        genre: 'Shooter',
        developer: 'Team Jade',
        freeToGameId: 540,
        owners: '10,000,000 .. 20,000,000',
        ownersCount: 15000000
      },
      {
        id: 'game-ftg-516',
        title: 'PUBG: BATTLEGROUNDS',
        year: 2022,
        image: 'https://www.freetogame.com/g/516/thumbnail.jpg',
        category: 'games' as const,
        rating: 3.8,
        genre: 'Shooter',
        developer: 'KRAFTON, Inc.',
        freeToGameId: 516,
        owners: '50,000,000 .. 100,000,000',
        ownersCount: 75000000
      },
      {
        id: 'game-ftg-523',
        title: 'Marvel Rivals',
        year: 2024,
        image: 'https://www.freetogame.com/g/523/thumbnail.jpg',
        category: 'games' as const,
        rating: 4.1,
        genre: 'Shooter',
        developer: 'NetEase',
        freeToGameId: 523,
        owners: '20,000,000 .. 50,000,000',
        ownersCount: 35000000
      }
    ]
  }
}

// Export singleton instance
export const freeToGameService = new FreeToGameService()

// Export types
export type { FreeToGameItem }
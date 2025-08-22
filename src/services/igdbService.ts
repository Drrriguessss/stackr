// src/services/igdbService.ts - IGDB API Service for Game Cover Art

import { fetchWithCache } from '@/utils/apiCache'

// IGDB requires Twitch credentials
const IGDB_BASE_URL = 'https://api.igdb.com/v4'
const IGDB_IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload'

// Types IGDB
export interface IGDBCover {
  id: number
  image_id: string
  game: number
  height: number
  width: number
  url: string
  checksum: string
}

export interface IGDBGame {
  id: number
  name: string
  cover?: IGDBCover
  first_release_date?: number
  genres?: number[]
  rating?: number
  rating_count?: number
  summary?: string
  screenshots?: any[]
}

class IGDBService {
  private readonly clientId = process.env.NEXT_PUBLIC_IGDB_CLIENT_ID || ''
  private readonly accessToken = process.env.NEXT_PUBLIC_IGDB_ACCESS_TOKEN || ''

  constructor() {
    if (!this.clientId || !this.accessToken) {
      console.warn('🎮 [IGDB] API credentials not configured')
    }
  }

  /**
   * 🔑 Headers pour les requêtes IGDB
   */
  private getHeaders(): HeadersInit {
    return {
      'Client-ID': this.clientId,
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * 🎯 FONCTION PRINCIPALE: Obtenir l'image cover au format portrait (3:4)
   */
  static getCoverImageUrl(imageId: string, size: 'thumb' | 'cover_small' | 'cover_big' | 'cover_big_2x' = 'cover_big'): string {
    // IGDB Image URL format: https://images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg
    return `${IGDB_IMAGE_BASE}/t_${size}/${imageId}.jpg`
  }

  /**
   * 🔍 Rechercher des jeux par nom
   */
  async searchGames(query: string, limit: number = 10): Promise<IGDBGame[]> {
    try {
      // IGDB utilise une syntaxe SQL-like dans le body
      const requestBody = `
        search "${query}";
        fields name, cover.image_id, first_release_date, genres, rating, rating_count, summary;
        limit ${limit};
        where cover != null;
      `.trim()

      console.log('🎮 [IGDB] Searching games:', query)
      console.log('🎮 [IGDB] Request body:', requestBody)

      // Use our API route to avoid CORS issues
      const response = await fetch('/api/igdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'games',
          body: requestBody
        })
      })

      if (!response.ok) {
        console.error('🎮 [IGDB] Search failed:', response.status, response.statusText)
        return []
      }

      const games: IGDBGame[] = await response.json()
      console.log(`🎮 [IGDB] Found ${games.length} games with covers`)

      return games

    } catch (error) {
      console.error('🎮 [IGDB] Search error:', error)
      return []
    }
  }

  /**
   * 🌟 Obtenir les jeux populaires avec covers
   */
  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    try {
      if (!this.clientId || !this.accessToken) {
        console.warn('🎮 [IGDB] Cannot get popular games - missing credentials')
        return this.getMockGames()
      }

      const requestBody = `
        fields name, cover.image_id, first_release_date, genres, rating, rating_count, summary;
        where cover != null & rating_count > 100 & rating > 75;
        sort rating_count desc;
        limit ${limit};
      `.trim()

      console.log('🎮 [IGDB] Fetching popular games...')

      const response = await fetch(`${IGDB_BASE_URL}/games`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: requestBody
      })

      if (!response.ok) {
        console.error('🎮 [IGDB] Popular games failed:', response.status, response.statusText)
        return this.getMockGames()
      }

      const games: IGDBGame[] = await response.json()
      console.log(`🎮 [IGDB] Retrieved ${games.length} popular games`)

      return games

    } catch (error) {
      console.error('🎮 [IGDB] Popular games error:', error)
      return this.getMockGames()
    }
  }

  /**
   * 🆕 Obtenir les nouveaux jeux avec covers
   */
  async getNewReleases(limit: number = 20): Promise<IGDBGame[]> {
    try {
      if (!this.clientId || !this.accessToken) {
        return this.getMockGames()
      }

      // Jeux sortis dans les 6 derniers mois
      const sixMonthsAgo = Math.floor((Date.now() - (6 * 30 * 24 * 60 * 60 * 1000)) / 1000)

      const requestBody = `
        fields name, cover.image_id, first_release_date, genres, rating, rating_count, summary;
        where cover != null & first_release_date > ${sixMonthsAgo};
        sort first_release_date desc;
        limit ${limit};
      `.trim()

      console.log('🎮 [IGDB] Fetching new releases...')

      const response = await fetch(`${IGDB_BASE_URL}/games`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: requestBody
      })

      if (!response.ok) {
        console.error('🎮 [IGDB] New releases failed:', response.status, response.statusText)
        return this.getMockGames()
      }

      const games: IGDBGame[] = await response.json()
      console.log(`🎮 [IGDB] Retrieved ${games.length} new releases`)

      return games

    } catch (error) {
      console.error('🎮 [IGDB] New releases error:', error)
      return this.getMockGames()
    }
  }

  /**
   * 🎨 Récupérer les artworks d'un jeu
   */
  async getGameArtworks(gameId: number): Promise<any[]> {
    try {
      const requestBody = `
        fields image_id, width, height;
        where game = ${gameId};
        limit 10;
      `.trim()

      const response = await fetch('/api/igdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'artworks',
          body: requestBody
        })
      })

      if (!response.ok) {
        console.error('🎮 [IGDB] Artworks request failed:', response.status)
        return []
      }

      const artworks = await response.json()
      console.log(`🎮 [IGDB] Found ${artworks.length} artworks for game ${gameId}`)
      return artworks

    } catch (error) {
      console.error('🎮 [IGDB] Artworks error:', error)
      return []
    }
  }

  /**
   * 📸 Récupérer les screenshots d'un jeu
   */
  async getGameScreenshots(gameId: number): Promise<any[]> {
    try {
      const requestBody = `
        fields image_id, width, height;
        where game = ${gameId};
        limit 10;
      `.trim()

      const response = await fetch('/api/igdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'screenshots',
          body: requestBody
        })
      })

      if (!response.ok) {
        console.error('🎮 [IGDB] Screenshots request failed:', response.status)
        return []
      }

      const screenshots = await response.json()
      console.log(`🎮 [IGDB] Found ${screenshots.length} screenshots for game ${gameId}`)
      return screenshots

    } catch (error) {
      console.error('🎮 [IGDB] Screenshots error:', error)
      return []
    }
  }

  /**
   * 🎬 Récupérer les vidéos/trailers d'un jeu
   */
  async getGameVideos(gameId: number): Promise<any[]> {
    try {
      const requestBody = `
        fields video_id, name, checksum;
        where game = ${gameId};
        limit 10;
      `.trim()

      const response = await fetch('/api/igdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'game_videos',
          body: requestBody
        })
      })

      if (!response.ok) {
        console.error('🎮 [IGDB] Videos request failed:', response.status)
        return []
      }

      const videos = await response.json()
      console.log(`🎮 [IGDB] Found ${videos.length} videos for game ${gameId}`)
      return videos

    } catch (error) {
      console.error('🎮 [IGDB] Videos error:', error)
      return []
    }
  }

  /**
   * 🎬 Générer l'URL d'une vidéo IGDB (YouTube)
   */
  getVideoUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=localhost`
  }

  /**
   * 🖼️ Générer l'URL d'une image IGDB
   */
  getImageUrl(imageId: string, size: 'cover_small' | 'screenshot_med' | 'cover_big' | 'logo_med' | '720p' | '1080p' | 'screenshot_big' = 'screenshot_big'): string {
    return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`
  }

  /**
   * 🔄 Convertir un jeu IGDB vers notre format d'application
   */
  convertToAppFormat(game: IGDBGame): any {
    const releaseYear = game.first_release_date 
      ? new Date(game.first_release_date * 1000).getFullYear()
      : new Date().getFullYear()

    // 🎯 UTILISER L'IMAGE COVER PORTRAIT IGDB (3:4 ratio)
    const coverImageUrl = game.cover?.image_id 
      ? IGDBService.getCoverImageUrl(game.cover.image_id, 'cover_big')
      : null

    console.log(`🎮 [IGDB] Converting game: ${game.name}`)
    console.log(`🎮 [IGDB] Cover image URL: ${coverImageUrl}`)

    return {
      id: `igdb-game-${game.id}`,
      title: game.name,
      name: game.name,
      year: releaseYear,
      image: coverImageUrl, // 🎯 IMAGE PORTRAIT 3:4
      category: 'games' as const,
      rating: game.rating ? Math.round(game.rating / 20) : 0, // Convertir 0-100 vers 0-5
      genre: 'Game', // IGDB genres nécessitent un autre appel API
      developer: 'Game Studio', // IGDB developers nécessitent un autre appel API
      
      // Données IGDB spécifiques
      igdbId: game.id,
      summary: game.summary,
      firstReleaseDate: game.first_release_date,
      ratingCount: game.rating_count,
      coverImageId: game.cover?.image_id
    }
  }

  /**
   * 📊 Données mockées de fallback
   */
  private getMockGames(): IGDBGame[] {
    return [
      {
        id: 1942,
        name: 'The Witcher 3: Wild Hunt',
        cover: {
          id: 89386,
          image_id: 'co1wyy',
          game: 1942,
          height: 800,
          width: 600,
          url: '//images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg',
          checksum: 'cb1f9d8c-7b6d-4b9e-9c7a-8a5b6c9d0e1f'
        },
        first_release_date: 1431993600,
        rating: 92.5,
        rating_count: 3500,
        summary: 'An open-world RPG adventure in a fantasy universe.'
      },
      {
        id: 11208,
        name: 'Cyberpunk 2077',
        cover: {
          id: 138825,
          image_id: 'co2lbd',
          game: 11208,
          height: 800,
          width: 600,
          url: '//images.igdb.com/igdb/image/upload/t_thumb/co2lbd.jpg',
          checksum: 'ab2c3d4e-5f6g-7h8i-9j0k-1l2m3n4o5p6q'
        },
        first_release_date: 1607558400,
        rating: 78.2,
        rating_count: 2800,
        summary: 'An open-world action-adventure story set in Night City.'
      }
    ]
  }

  /**
   * 🧪 Tester la connexion à l'API
   */
  async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      if (!this.clientId || !this.accessToken) {
        return {
          success: false,
          message: 'IGDB credentials not configured'
        }
      }

      const response = await fetch(`${IGDB_BASE_URL}/games`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: 'fields name; limit 1;'
      })

      if (!response.ok) {
        return {
          success: false,
          message: `IGDB API Error: ${response.status} ${response.statusText}`
        }
      }

      const data = await response.json()

      return {
        success: true,
        message: `IGDB connection successful! Retrieved ${data.length} test game(s)`
      }

    } catch (error) {
      return {
        success: false,
        message: `IGDB connection failed: ${error}`
      }
    }
  }
}

export const igdbService = new IGDBService()
export default IGDBService
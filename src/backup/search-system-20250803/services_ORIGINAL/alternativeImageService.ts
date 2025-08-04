// Service d'images alternatives pour les jeux
// Explore plusieurs sources : Steam, IGDB, SteamGridDB, etc.

interface AlternativeGameImage {
  url: string
  source: 'steam' | 'igdb' | 'steamgriddb' | 'rawg' | 'fallback'
  type: 'screenshot' | 'artwork' | 'logo' | 'icon' | 'background'
  quality: 'hd' | 'standard' | 'thumbnail'
  width?: number
  height?: number
}

interface GameImageGallery {
  gameId: string
  gameName: string
  images: AlternativeGameImage[]
  sources: string[]
}

class AlternativeImageService {
  private readonly RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  
  /**
   * Récupère des images depuis plusieurs sources
   */
  async getGameImages(gameId: string, gameName: string): Promise<GameImageGallery> {
    console.log('🖼️ Fetching alternative images for:', gameName)
    
    const gallery: GameImageGallery = {
      gameId,
      gameName,
      images: [],
      sources: []
    }

    // 1. Essayer RAWG d'abord
    await this.addRAWGImages(gallery, gameId)
    
    // 2. Essayer Steam Store (pas d'API officielle, mais URLs prédictibles)
    await this.addSteamImages(gallery, gameName)
    
    // 3. Essayer les images génériques basées sur le nom
    await this.addGenericGameImages(gallery, gameName)
    
    // 4. Ajouter des images de fallback
    this.addFallbackImages(gallery)

    console.log('🖼️ Final gallery:', gallery)
    return gallery
  }

  /**
   * Ajoute des images depuis RAWG
   */
  private async addRAWGImages(gallery: GameImageGallery, gameId: string) {
    try {
      let rawgId = gameId
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }

      console.log('🖼️ Trying RAWG for game ID:', rawgId)

      // Test avec l'endpoint screenshots
      const screenshotsUrl = `https://api.rawg.io/api/games/${rawgId}/screenshots?key=${this.RAWG_API_KEY}`
      const screenshotsResponse = await fetch(screenshotsUrl)
      
      if (screenshotsResponse.ok) {
        const screenshotsData = await screenshotsResponse.json()
        console.log('🖼️ RAWG screenshots data:', screenshotsData)
        
        if (screenshotsData.results && screenshotsData.results.length > 0) {
          gallery.sources.push('rawg-screenshots')
          
          screenshotsData.results.slice(0, 6).forEach((screenshot: any) => {
            gallery.images.push({
              url: screenshot.image,
              source: 'rawg',
              type: 'screenshot',
              quality: 'hd',
              width: screenshot.width,
              height: screenshot.height
            })
          })
        }
      }

      // Test avec l'endpoint game details
      const gameUrl = `https://api.rawg.io/api/games/${rawgId}?key=${this.RAWG_API_KEY}`
      const gameResponse = await fetch(gameUrl)
      
      if (gameResponse.ok) {
        const gameData = await gameResponse.json()
        
        if (gameData.background_image) {
          gallery.sources.push('rawg-background')
          gallery.images.push({
            url: gameData.background_image,
            source: 'rawg',
            type: 'background',
            quality: 'hd'
          })
        }
      }

    } catch (error) {
      console.error('🖼️ RAWG images error:', error)
    }
  }

  /**
   * Essaie de récupérer des images depuis Steam
   * Note: Steam n'a pas d'API publique, mais on peut essayer des patterns d'URLs
   */
  private async addSteamImages(gallery: GameImageGallery, gameName: string) {
    try {
      console.log('🖼️ Trying Steam images for:', gameName)
      
      // Steam utilise des App IDs, mais sans API officielle c'est compliqué
      // On peut essayer de deviner ou utiliser des bases de données externes
      
      // Pour l'instant, on skip cette partie car ça nécessiterait une base de données
      // de mapping nom de jeu -> Steam App ID
      
      gallery.sources.push('steam-attempted')
      
    } catch (error) {
      console.error('🖼️ Steam images error:', error)
    }
  }

  /**
   * Génère des images basées sur des services génériques
   */
  private async addGenericGameImages(gallery: GameImageGallery, gameName: string) {
    try {
      console.log('🖼️ Adding generic images for:', gameName)
      
      // 1. Images Unsplash (gaming related)
      const unsplashKeywords = [
        'gaming',
        'video game',
        'game controller',
        'esports',
        'gaming setup'
      ]
      
      unsplashKeywords.forEach((keyword, index) => {
        gallery.images.push({
          url: `https://source.unsplash.com/800x450/?${keyword}`,
          source: 'fallback',
          type: 'artwork',
          quality: 'hd'
        })
      })

      // 2. Images placeholder avec le nom du jeu
      gallery.images.push({
        url: `https://via.placeholder.com/800x450/2d3748/ffffff?text=${encodeURIComponent(gameName)}`,
        source: 'fallback',
        type: 'artwork',
        quality: 'standard'
      })

      gallery.sources.push('generic-images')
      
    } catch (error) {
      console.error('🖼️ Generic images error:', error)
    }
  }

  /**
   * Ajoute des images de fallback garanties
   */
  private addFallbackImages(gallery: GameImageGallery) {
    // Images de fallback gaming génériques
    const fallbackImages = [
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop', // Gaming controller
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop', // Gaming setup
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop', // Gaming keyboard
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop', // Gaming art
    ]

    fallbackImages.forEach((url, index) => {
      gallery.images.push({
        url,
        source: 'fallback',
        type: 'artwork',
        quality: 'hd'
      })
    })

    gallery.sources.push('fallback-guaranteed')
  }

  /**
   * Test d'une URL pour voir si l'image existe
   */
  private async testImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok && response.headers.get('content-type')?.startsWith('image/')
    } catch {
      return false
    }
  }

  /**
   * Filtre les images pour garder seulement celles qui fonctionnent
   */
  async validateImages(gallery: GameImageGallery): Promise<GameImageGallery> {
    console.log('🖼️ Validating images...')
    
    const validatedImages: AlternativeGameImage[] = []
    
    for (const image of gallery.images) {
      const isValid = await this.testImageUrl(image.url)
      if (isValid) {
        validatedImages.push(image)
        console.log('✅ Valid image:', image.url)
      } else {
        console.log('❌ Invalid image:', image.url)
      }
      
      // Limiter à 6 images maximum
      if (validatedImages.length >= 6) break
    }
    
    return {
      ...gallery,
      images: validatedImages
    }
  }
}

export const alternativeImageService = new AlternativeImageService()
export type { AlternativeGameImage, GameImageGallery }
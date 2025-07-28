// Service pour récupérer les vraies images HD des jeux depuis l'API RAWG
// Remplace les images de test par les vraies images spécifiques à chaque jeu

export interface IGDBGameImage {
  url: string
  type: 'screenshot' | 'artwork' | 'cover'
  width: number
  height: number
}

export interface IGDBGameGallery {
  gameId: string
  gameName: string
  images: IGDBGameImage[]
  success: boolean
}

class IGDBService {
  private readonly RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  
  /**
   * Récupère les vraies images HD depuis RAWG API pour chaque jeu spécifique
   */
  async getGameImages(gameId: string, gameName: string): Promise<IGDBGameGallery> {
    console.log('🎮 RAWG Service: Getting real images for', gameName, 'ID:', gameId)
    
    const gallery: IGDBGameGallery = {
      gameId,
      gameName,
      images: [],
      success: false
    }

    try {
      // Nettoyer l'ID RAWG
      let rawgId = gameId
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }
      
      console.log('🎮 Cleaned RAWG ID:', rawgId)
      console.log('🎮 RAWG API Key available:', !!this.RAWG_API_KEY)
      
      // 1. Récupérer les screenshots depuis RAWG
      const screenshots = await this.fetchRAWGScreenshots(rawgId)
      console.log('🎮 Found', screenshots.length, 'screenshots from RAWG')
      
      // 2. Récupérer l'image de fond depuis les détails du jeu
      const gameDetails = await this.fetchRAWGGameDetails(rawgId)
      if (gameDetails?.background_image) {
        console.log('🎮 Found background image from RAWG')
        gallery.images.unshift({
          url: gameDetails.background_image,
          type: 'cover',
          width: 1920,
          height: 1080
        })
      }
      
      // 3. Ajouter les screenshots
      screenshots.forEach(screenshot => {
        gallery.images.push({
          url: screenshot.image,
          type: 'screenshot',
          width: screenshot.width || 1920,
          height: screenshot.height || 1080
        })
      })
      
      // 4. Si on a des images, marquer comme succès
      if (gallery.images.length > 0) {
        gallery.success = true
        console.log('🎮 ✅ Successfully loaded', gallery.images.length, 'real images for', gameName)
      } else {
        console.log('🎮 ⚠️ No RAWG images found, using fallback')
        // Fallback avec images gaming génériques mais différentes selon le jeu
        gallery.images = this.generateGameSpecificFallbacks(gameName)
        gallery.success = true
      }
      
    } catch (error) {
      console.error('🎮 RAWG Service error:', error)
      // En cas d'erreur, utiliser des fallbacks spécifiques au jeu
      gallery.images = this.generateGameSpecificFallbacks(gameName)
      gallery.success = true // Toujours retourner un succès avec fallback
    }

    console.log('🎮 Final gallery for', gameName, ':', gallery.images.length, 'images')
    return gallery
  }
  
  /**
   * Récupère les screenshots depuis l'API RAWG
   */
  private async fetchRAWGScreenshots(rawgId: string): Promise<Array<{image: string, width?: number, height?: number}>> {
    try {
      if (!this.RAWG_API_KEY) {
        console.warn('🎮 No RAWG API key available')
        return []
      }
      
      const url = `https://api.rawg.io/api/games/${rawgId}/screenshots?key=${this.RAWG_API_KEY}`
      console.log('🎮 Fetching screenshots from:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.log('🎮 Screenshots API failed:', response.status, response.statusText)
        return []
      }
      
      const data = await response.json()
      console.log('🎮 Screenshots API response:', data)
      
      if (data.results && Array.isArray(data.results)) {
        return data.results.slice(0, 6) // Limiter à 6 screenshots
      }
      
      return []
    } catch (error) {
      console.error('🎮 Error fetching RAWG screenshots:', error)
      return []
    }
  }
  
  /**
   * Récupère les détails du jeu depuis l'API RAWG
   */
  private async fetchRAWGGameDetails(rawgId: string): Promise<{background_image?: string} | null> {
    try {
      if (!this.RAWG_API_KEY) {
        return null
      }
      
      const url = `https://api.rawg.io/api/games/${rawgId}?key=${this.RAWG_API_KEY}`
      console.log('🎮 Fetching game details from:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.log('🎮 Game details API failed:', response.status, response.statusText)
        return null
      }
      
      const data = await response.json()
      console.log('🎮 Game details API response (background):', data.background_image ? 'Found' : 'Not found')
      
      return data
    } catch (error) {
      console.error('🎮 Error fetching RAWG game details:', error)
      return null
    }
  }
  
  /**
   * Génère des images de fallback spécifiques selon le nom du jeu
   */
  private generateGameSpecificFallbacks(gameName: string): IGDBGameImage[] {
    console.log('🎮 Generating game-specific fallbacks for:', gameName)
    
    // Créer un hash simple du nom pour avoir des images cohérentes par jeu
    const gameHash = gameName.toLowerCase().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    const imageIndex = Math.abs(gameHash) % 4
    
    // Différentes collections d'images gaming selon le hash
    const imageSets = [
      // Set 1: Gaming setup
      [
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop&q=80'
      ],
      // Set 2: Gaming art
      [
        'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556065808-f644d4d28847?w=800&h=450&fit=crop&q=80'
      ],
      // Set 3: Esports
      [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&h=450&fit=crop&q=80'
      ],
      // Set 4: Controllers and devices
      [
        'https://images.unsplash.com/photo-1586182987320-4f376d39d787?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800&h=450&fit=crop&q=80'
      ]
    ]
    
    const selectedSet = imageSets[imageIndex]
    
    return selectedSet.map((url, index) => ({
      url,
      type: index === 0 ? 'cover' as const : 'screenshot' as const,
      width: 800,
      height: 450
    }))
  }

}

export const igdbService = new IGDBService()
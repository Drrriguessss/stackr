// src/services/steamImageService.ts - Service pour obtenir les bonnes images Steam

export interface SteamImageFormats {
  header: string           // 460x215 - Format horizontal actuel
  capsule_231x87: string   // 231x87 - Petit format horizontal
  capsule_616x353: string  // 616x353 - Grand format horizontal  
  library_600x900: string  // 600x900 - Format PORTRAIT idéal ! 
  library_hero: string     // Variable - Format hero
  portrait: string         // Format portrait (si disponible)
  logo: string            // Logo du jeu
}

class SteamImageService {
  
  /**
   * 🎯 FONCTION PRINCIPALE : Obtenir l'image au meilleur format portrait
   */
  static getBestPortraitImage(steamAppId: string | number): string {
    const appId = steamAppId.toString()
    
    // 1. PRIORITÉ 1: Library format 600x900 (ratio poster parfait!)
    const libraryImage = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
    
    return libraryImage
  }

  /**
   * 🔄 Fonction avec fallback intelligent
   */
  static getPortraitImageWithFallback(steamAppId: string | number): string {
    const appId = steamAppId.toString()
    
    // Liste des formats par ordre de préférence pour portrait
    const portraitFormats = [
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,    // IDEAL
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/portrait.png`,           // Alternative
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,      // Fallback
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`             // Dernier recours
    ]
    
    // Retourner le premier format (on testera la disponibilité côté client)
    return portraitFormats[0]
  }

  /**
   * 📊 Obtenir tous les formats disponibles pour tests
   */
  static getAllFormats(steamAppId: string | number): SteamImageFormats {
    const appId = steamAppId.toString()
    const baseUrl = 'https://cdn.cloudflare.steamstatic.com/steam/apps'
    
    return {
      header: `${baseUrl}/${appId}/header.jpg`,
      capsule_231x87: `${baseUrl}/${appId}/capsule_231x87.jpg`,
      capsule_616x353: `${baseUrl}/${appId}/capsule_616x353.jpg`,
      library_600x900: `${baseUrl}/${appId}/library_600x900.jpg`,  // 🎯 NOTRE CIBLE
      library_hero: `${baseUrl}/${appId}/library_hero.jpg`,
      portrait: `${baseUrl}/${appId}/portrait.png`,
      logo: `${baseUrl}/${appId}/logo.png`
    }
  }

  /**
   * ✅ Fonction pour tester la disponibilité d'une image
   */
  static async isImageAvailable(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 🔄 Fonction asynchrone avec test de disponibilité
   */
  static async getBestAvailablePortraitImage(steamAppId: string | number): Promise<string> {
    const appId = steamAppId.toString()
    
    const portraitFormats = [
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/portrait.png`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
    ]

    // Tester chaque format dans l'ordre
    for (const format of portraitFormats) {
      const isAvailable = await this.isImageAvailable(format)
      if (isAvailable) {
        console.log(`🎮 [Steam Images] Using format: ${format}`)
        return format
      }
    }

    // Fallback final
    return portraitFormats[portraitFormats.length - 1]
  }

  /**
   * 📏 Informations sur les ratios des formats
   */
  static getFormatInfo(): Record<string, { ratio: string, description: string }> {
    return {
      'library_600x900': {
        ratio: '2:3',
        description: '🎯 IDEAL - Format poster portrait comme les films'
      },
      'header': {
        ratio: '460:215 (~2.14:1)',
        description: '❌ Format horizontal actuel (problématique)'
      },
      'library_hero': {
        ratio: 'Variable',
        description: '⚠️ Format hero, peut être horizontal ou vertical'
      },
      'portrait': {
        ratio: 'Portrait',
        description: '✅ Format portrait si disponible'
      }
    }
  }
}

export default SteamImageService
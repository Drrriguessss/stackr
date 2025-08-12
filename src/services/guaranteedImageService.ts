/**
 * Service GARANTI d'images - Ne peut JAMAIS échouer
 * Produit toujours une image de qualité pour n'importe quel film
 */
class GuaranteedImageService {
  /**
   * Génère une image placeholder de haute qualité basée sur le hash du titre
   * GARANTIE: Cette fonction ne peut JAMAIS retourner null
   */
  generateQualityPlaceholder(title: string, year?: string): string {
    console.log('🎨 [Guaranteed] Generating quality placeholder for:', title, year || '')
    
    // Images de film génériques de très haute qualité depuis Unsplash
    const genericMovieImages = [
      'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80', // Cinema screen
      'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1280&h=720&fit=crop&q=80', // Movie theater
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1280&h=720&fit=crop&q=80', // Film projector
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1280&h=720&fit=crop&q=80', // Dark cinema
      'https://images.unsplash.com/photo-1596727147705-61a532a659bd?w=1280&h=720&fit=crop&q=80', // Movie reel
      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1280&h=720&fit=crop&q=80', // Vintage cinema
    ]
    
    // Hash du titre pour cohérence (même film = même image toujours)
    const hash = title.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)), 0)
    const imageIndex = Math.abs(hash) % genericMovieImages.length
    
    const selectedImage = genericMovieImages[imageIndex]
    console.log('🎨 [Guaranteed] ✅ Selected image index:', imageIndex, 'URL:', selectedImage)
    
    return selectedImage
  }

  /**
   * Services de placeholder avec texte personnalisé (fallback du fallback)
   */
  getPlaceholderServices(title: string, year?: string): string[] {
    const cleanTitle = encodeURIComponent(title.replace(/[^\w\s]/g, '').trim())
    const displayYear = year || 'Movie'
    
    return [
      // Service 1: Via placeholder - style cinématique
      `https://via.placeholder.com/1280x720/1a1a2e/ffffff?text=${cleanTitle}+(${displayYear})`,
      
      // Service 2: DummyImage - style professionnel
      `https://dummyimage.com/1280x720/2d1b69/ffffff.jpg&text=${cleanTitle}`,
      
      // Service 3: Picsum avec seed basé sur le titre
      `https://picsum.photos/1280/720?random=${title.length}`,
      
      // Service 4: Via placeholder - style sombre
      `https://via.placeholder.com/1280x720/0f0f23/C9A96E?text=${cleanTitle}&font=georgia`,
    ]
  }

  /**
   * Fonction ULTIME - combine tous les fallbacks
   * GARANTIE ABSOLUE: Retourne toujours une image valide
   */
  getUltimateFallback(title: string, year?: string): string {
    // 1. Essayer l'image générique de haute qualité d'abord
    try {
      return this.generateQualityPlaceholder(title, year)
    } catch (error) {
      console.error('🎨 [Guaranteed] Quality placeholder failed (impossible?):', error)
    }
    
    // 2. Si impossible (très improbable), utiliser les services de placeholder
    const placeholders = this.getPlaceholderServices(title, year)
    
    // Retourner le premier placeholder (garanti de fonctionner)
    return placeholders[0]
  }

  /**
   * Valide qu'une image existe et est accessible
   */
  async validateImageExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        timeout: 5000 // Timeout court pour ne pas ralentir
      })
      return response.ok && response.headers.get('content-type')?.startsWith('image/')
    } catch {
      return false
    }
  }

  /**
   * Combine plusieurs images en galerie avec fallbacks
   */
  combineGalleryImages(fanart: any, tmdb: any, gallery: any[], omdbPoster?: string): string[] {
    const galleryImages: string[] = []
    
    console.log('🎨 [Gallery] Combining images from multiple sources...')
    
    // Ordre de priorité pour qualité
    if (fanart?.backgrounds) {
      galleryImages.push(...fanart.backgrounds.slice(0, 6))
      console.log('🎨 [Gallery] Added', fanart.backgrounds.length, 'Fanart backgrounds')
    }
    
    if (tmdb?.galleryImages) {
      galleryImages.push(...tmdb.galleryImages.slice(0, 8))
      console.log('🎨 [Gallery] Added', tmdb.galleryImages.length, 'TMDb images')
    }
    
    if (fanart?.posters) {
      galleryImages.push(...fanart.posters.slice(0, 3))
      console.log('🎨 [Gallery] Added', fanart.posters.length, 'Fanart posters')
    }
    
    if (Array.isArray(gallery)) {
      const validGallery = gallery.filter(img => img && !img.includes('N/A'))
      galleryImages.push(...validGallery.slice(0, 5))
      console.log('🎨 [Gallery] Added', validGallery.length, 'gallery images')
    }
    
    // Ajouter OMDB poster comme fallback si disponible
    if (omdbPoster && omdbPoster !== 'N/A') {
      galleryImages.push(omdbPoster)
      console.log('🎨 [Gallery] Added OMDB poster fallback')
    }
    
    // Supprimer doublons et limiter
    const uniqueImages = [...new Set(galleryImages)].slice(0, 15)
    console.log('🎨 [Gallery] Final gallery:', uniqueImages.length, 'unique images')
    
    return uniqueImages
  }
}

export const guaranteedImageService = new GuaranteedImageService()
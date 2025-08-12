/**
 * Service de fallback pour obtenir des images de haute qualité
 * quand les APIs principales (TMDb, Fanart) échouent ou retournent
 * des images de mauvaise qualité
 */
class FallbackImageService {
  private readonly cache: Map<string, string> = new Map()

  /**
   * Génère une image de placeholder de haute qualité pour un film
   */
  async generateHighQualityPlaceholder(movieTitle: string, movieYear?: string): Promise<string> {
    // Nettoyer le titre pour l'URL
    const cleanTitle = encodeURIComponent(movieTitle.replace(/[^\w\s]/g, '').trim())
    const displayYear = movieYear ? ` (${movieYear})` : ''
    
    // Utiliser des services de placeholder de haute qualité
    const placeholderServices = [
      // Service 1: Unsplash avec des images cinématiques génériques
      () => this.getUnsplashCinematicImage(movieTitle),
      
      // Service 2: Placeholder haute résolution avec texte stylé
      () => `https://via.placeholder.com/1920x1080/1a1a1a/ffffff.png?text=${cleanTitle}${displayYear}`,
      
      // Service 3: DummyImage avec gradient et style film
      () => `https://dummyimage.com/1920x1080/2c3e50/ecf0f1&text=${cleanTitle}${displayYear}`,
      
      // Service 4: Placeholder avec style cinématique
      () => this.generateCinematicPlaceholder(movieTitle, movieYear),
    ]

    // Essayer chaque service jusqu'à ce qu'un fonctionne
    for (const service of placeholderServices) {
      try {
        const imageUrl = await service()
        if (imageUrl && await this.validateImageUrl(imageUrl)) {
          console.log(`🖼️ [Fallback] Generated placeholder for "${movieTitle}":`, imageUrl)
          return imageUrl
        }
      } catch (error) {
        console.warn('🖼️ [Fallback] Service failed, trying next...', error)
      }
    }

    // Fallback final: image locale par défaut
    return '/images/movie-placeholder-hd.jpg'
  }

  /**
   * Obtient une image cinématique depuis Unsplash
   */
  private async getUnsplashCinematicImage(movieTitle: string): Promise<string> {
    // Mots-clés cinématiques pour obtenir des images appropriées
    const cinematicKeywords = [
      'cinema screen dark',
      'movie theater',
      'film reel vintage',
      'cinematic lighting',
      'movie premiere',
      'dark cinema hall',
      'film strip background',
      'movie projector light'
    ]

    // Choisir un mot-clé aléatoire pour de la variété
    const randomKeyword = cinematicKeywords[Math.floor(Math.random() * cinematicKeywords.length)]
    const encodedKeyword = encodeURIComponent(randomKeyword)
    
    return `https://source.unsplash.com/1920x1080/?${encodedKeyword}&orientation=landscape&auto=format&fit=crop&w=1920&h=1080&q=80`
  }

  /**
   * Génère une image placeholder cinématique stylée
   */
  private generateCinematicPlaceholder(movieTitle: string, movieYear?: string): string {
    const cleanTitle = movieTitle.replace(/[^\w\s]/g, '').trim()
    const year = movieYear || 'Film'
    
    // Couleurs cinématiques (noir, or, rouge foncé)
    const colors = [
      { bg: '1a1a1a', text: 'FFD700' }, // Noir et or
      { bg: '2c1810', text: 'F4E4BC' }, // Brun foncé et crème
      { bg: '0f0f23', text: 'C9A96E' }, // Bleu nuit et or antique
      { bg: '1e1e1e', text: 'E5E5E5' }, // Gris foncé et gris clair
    ]
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    
    return `https://via.placeholder.com/1920x1080/${randomColor.bg}/${randomColor.text}.png?text=${encodeURIComponent(cleanTitle)}+%7C+${year}&font=georgia`
  }

  /**
   * Obtient des images depuis des sources alternatives
   */
  async getAlternativeMovieImages(movieTitle: string, imdbId?: string): Promise<string[]> {
    const images: string[] = []
    
    try {
      // Source 1: Images Wikipedia via Wikidata (si disponible)
      const wikiImage = await this.getWikipediaImage(movieTitle)
      if (wikiImage) images.push(wikiImage)
      
      // Source 2: Images génériques cinématiques de haute qualité
      const cinematicImages = await this.getCinematicStockImages(movieTitle)
      images.push(...cinematicImages)
      
      // Source 3: Placeholders stylés
      const placeholder = await this.generateHighQualityPlaceholder(movieTitle)
      images.push(placeholder)
      
    } catch (error) {
      console.error('🖼️ [Fallback] Error getting alternative images:', error)
    }

    return images.slice(0, 6) // Limiter à 6 images
  }

  /**
   * Essaie d'obtenir une image depuis Wikipedia
   */
  private async getWikipediaImage(movieTitle: string): Promise<string | null> {
    try {
      // Pour l'instant, retourner null - pourrait être implémenté plus tard
      // avec l'API Wikipedia/Wikidata
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Obtient des images de stock cinématiques
   */
  private async getCinematicStockImages(movieTitle: string): Promise<string[]> {
    // Images de stock cinématiques de haute qualité depuis Unsplash
    const cinematicQueries = [
      'cinema+dark+theater',
      'movie+screen+theater',
      'film+noir+lighting',
      'cinematic+atmosphere',
      'dark+cinema+hall'
    ]

    return cinematicQueries.map(query => 
      `https://source.unsplash.com/1920x1080/?${query}&orientation=landscape&auto=format&fit=crop&w=1920&h=1080&q=80`
    )
  }

  /**
   * Valide qu'une URL d'image est accessible
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok && response.headers.get('content-type')?.startsWith('image/')
    } catch {
      return false
    }
  }

  /**
   * Obtient la meilleure image possible pour un film
   * Combine toutes les stratégies de fallback
   */
  async getBestFallbackImage(movieTitle: string, movieYear?: string, imdbId?: string): Promise<{
    headerImage: string
    galleryImages: string[]
  }> {
    const cacheKey = `${imdbId || movieTitle}-${movieYear || 'unknown'}`
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      const cachedImage = this.cache.get(cacheKey)!
      return {
        headerImage: cachedImage,
        galleryImages: [cachedImage]
      }
    }

    console.log(`🖼️ [Fallback] Generating fallback images for: ${movieTitle} ${movieYear || ''}`)

    // Obtenir des images alternatives
    const alternativeImages = await this.getAlternativeMovieImages(movieTitle, imdbId)
    
    // La première image sera utilisée comme header
    const headerImage = alternativeImages[0] || await this.generateHighQualityPlaceholder(movieTitle, movieYear)
    
    // Cache le résultat
    this.cache.set(cacheKey, headerImage)

    return {
      headerImage,
      galleryImages: alternativeImages.length > 0 ? alternativeImages : [headerImage]
    }
  }

  /**
   * Nettoie le cache
   */
  clearCache() {
    this.cache.clear()
  }
}

export const fallbackImageService = new FallbackImageService()
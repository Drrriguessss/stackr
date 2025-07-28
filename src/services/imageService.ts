// Service pour récupérer les images officielles des jeux et films
// Utilise RAWG API pour les jeux et TMDB API pour les films

interface GameImage {
  id: string
  image: string
  type: 'screenshot' | 'background'
}

interface MovieImage {
  file_path: string
  aspect_ratio: number
  height: number
  width: number
  vote_average: number
  vote_count: number
  type: 'backdrop' | 'poster' | 'logo'
}

interface MediaGallery {
  trailer: {
    videoId: string
    provider: 'youtube' | 'tmdb' | 'rawg' | 'none'
    url: string
  } | null
  images: Array<{
    url: string
    type: 'screenshot' | 'backdrop' | 'poster' | 'background'
    aspectRatio: number
  }>
}

class ImageService {
  private readonly RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  private readonly TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
  private readonly TMDB_BASE_URL = 'https://api.themoviedb.org/3'
  private readonly TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'
  
  // Cache pour éviter les appels API répétés
  private imageCache: Map<string, MediaGallery> = new Map()

  /**
   * Récupère la galerie complète (trailer + images) pour un jeu
   */
  async getGameGallery(gameId: string, gameName: string, trailerInfo: any): Promise<MediaGallery> {
    console.log('🖼️ Getting game gallery for:', gameName, 'ID:', gameId)
    
    const cacheKey = `game-${gameId}-${gameName}`
    if (this.imageCache.has(cacheKey)) {
      console.log('🖼️ Game gallery found in cache')
      return this.imageCache.get(cacheKey)!
    }

    const gallery: MediaGallery = {
      trailer: trailerInfo,
      images: []
    }

    console.log('🖼️ Starting ENHANCED game media fetch with multiple sources...')

    // STRATÉGIE AMÉLIORÉE : Sources multiples avec fallbacks garantis
    
    // 1. Essayer RAWG d'abord (source principale)
    console.log('🖼️ Step 1: Trying RAWG API...')
    await this.tryRAWGImages(gallery, gameId, gameName)
    
    // 2. Si pas assez d'images RAWG, ajouter des sources alternatives
    if (gallery.images.length < 3) {
      console.log('🖼️ Step 2: Adding alternative sources...')
      await this.addAlternativeGameImages(gallery, gameName)
    }
    
    // 3. Si toujours pas assez, ajouter des images gaming génériques de qualité
    if (gallery.images.length < 3) {
      console.log('🖼️ Step 3: Adding high-quality fallback images...')
      this.addHighQualityFallbacks(gallery, gameName)
    }

    // Limiter à 6 images maximum
    gallery.images = gallery.images.slice(0, 6)
    
    console.log('🖼️ ENHANCED Final gallery:', {
      trailer: !!gallery.trailer,
      images: gallery.images.length,
      sources: gallery.images.map(img => img.type),
      imageUrls: gallery.images.map(img => img.url)
    })

    this.imageCache.set(cacheKey, gallery)
    return gallery
  }

  /**
   * Essaie de récupérer des images depuis RAWG
   */
  private async tryRAWGImages(gallery: MediaGallery, gameId: string, gameName: string) {
    try {
      // 1. Screenshots depuis RAWG
      const screenshots = await this.getGameScreenshots(gameId)
      console.log('🖼️ RAWG screenshots found:', screenshots.length)
      
      // 2. Image de fond depuis RAWG
      const gameDetails = await this.getGameBackground(gameId)
      if (gameDetails?.background_image) {
        console.log('🖼️ RAWG background found:', gameDetails.background_image)
        gallery.images.push({
          url: gameDetails.background_image,
          type: 'background',
          aspectRatio: 16/9
        })
      }

      // 3. Ajouter les screenshots
      screenshots.forEach(screenshot => {
        gallery.images.push({
          url: screenshot.image,
          type: 'screenshot',
          aspectRatio: 16/9
        })
      })
      
    } catch (error) {
      console.error('🖼️ RAWG images failed:', error)
    }
  }

  /**
   * Ajoute des images alternatives de haute qualité
   */
  private async addAlternativeGameImages(gallery: MediaGallery, gameName: string) {
    try {
      console.log('🖼️ Fetching alternative images for:', gameName)
      
      // Images gaming de haute qualité depuis Unsplash
      const gameKeywords = [
        `${gameName} game`,
        `${gameName} screenshot`,
        `${gameName} artwork`,
        'video game art',
        'game screenshot',
        'gaming wallpaper'
      ]
      
      // Ajouter des images Unsplash spécifiques au jeu
      gameKeywords.slice(0, 3).forEach(keyword => {
        const cleanKeyword = encodeURIComponent(keyword)
        gallery.images.push({
          url: `https://source.unsplash.com/featured/800x450/?${cleanKeyword}`,
          type: 'artwork',
          aspectRatio: 16/9
        })
      })
      
    } catch (error) {
      console.error('🖼️ Alternative images failed:', error)
    }
  }

  /**
   * Ajoute des images fallback de haute qualité garanties
   */
  private addHighQualityFallbacks(gallery: MediaGallery, gameName: string) {
    console.log('🖼️ Adding high-quality fallback images')
    
    // Images gaming HD garanties depuis Unsplash
    const fallbackImages = [
      {
        url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80',
        type: 'artwork' as const,
        aspectRatio: 16/9
      },
      {
        url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&q=80',
        type: 'artwork' as const,
        aspectRatio: 16/9
      },
      {
        url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop&q=80',
        type: 'artwork' as const,
        aspectRatio: 16/9
      },
      {
        url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop&q=80',
        type: 'artwork' as const,
        aspectRatio: 16/9
      },
      {
        url: 'https://images.unsplash.com/photo-1520658651009-4f4dbb96cc8b?w=800&h=450&fit=crop&q=80',
        type: 'artwork' as const,
        aspectRatio: 16/9
      },
      {
        url: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=450&fit=crop&q=80',
        type: 'artwork' as const,
        aspectRatio: 16/9
      }
    ]
    
    // Ajouter les images fallback
    fallbackImages.forEach(image => {
      gallery.images.push(image)
    })
    
    // Image placeholder personnalisée avec le nom du jeu
    gallery.images.push({
      url: `https://via.placeholder.com/800x450/2d3748/ffffff?text=${encodeURIComponent(gameName)}`,
      type: 'background',
      aspectRatio: 16/9
    })
  }

  /**
   * Récupère la galerie complète (trailer + images) pour un film
   */
  async getMovieGallery(movieId: string, movieTitle: string, trailerInfo: any): Promise<MediaGallery> {
    console.log('🖼️ Getting movie gallery for:', movieTitle)
    
    const cacheKey = `movie-${movieId}-${movieTitle}`
    if (this.imageCache.has(cacheKey)) {
      console.log('🖼️ Movie gallery found in cache')
      return this.imageCache.get(cacheKey)!
    }

    const gallery: MediaGallery = {
      trailer: trailerInfo,
      images: []
    }

    // Récupérer les images depuis TMDB
    const movieImages = await this.getMovieImages(movieTitle)
    
    // Ajouter les backdrops (images de fond) - priorité haute
    movieImages.backdrops.forEach(backdrop => {
      gallery.images.push({
        url: `${this.TMDB_IMAGE_BASE}/w1280${backdrop.file_path}`,
        type: 'backdrop',
        aspectRatio: backdrop.aspect_ratio
      })
    })

    // Ajouter quelques posters si pas assez de backdrops
    if (gallery.images.length < 4) {
      movieImages.posters.slice(0, 2).forEach(poster => {
        gallery.images.push({
          url: `${this.TMDB_IMAGE_BASE}/w500${poster.file_path}`,
          type: 'poster',
          aspectRatio: poster.aspect_ratio
        })
      })
    }

    // Limiter à 6 images maximum
    gallery.images = gallery.images.slice(0, 6)

    this.imageCache.set(cacheKey, gallery)
    return gallery
  }

  /**
   * Récupère les screenshots d'un jeu depuis RAWG
   */
  private async getGameScreenshots(gameId: string): Promise<GameImage[]> {
    try {
      // Nettoyer l'ID si nécessaire
      let rawgId = gameId
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }

      console.log('🖼️ Fetching screenshots for game ID:', rawgId)
      console.log('🖼️ RAWG API Key available:', !!this.RAWG_API_KEY)

      if (!this.RAWG_API_KEY) {
        console.warn('🖼️ No RAWG API key - using fallback')
        return []
      }

      const url = `https://api.rawg.io/api/games/${rawgId}/screenshots?key=${this.RAWG_API_KEY}`
      console.log('🖼️ Requesting URL:', url)

      const response = await fetch(url)
      console.log('🖼️ Response status:', response.status, response.statusText)

      if (!response.ok) {
        console.log('🖼️ No screenshots from RAWG API - Status:', response.status)
        // Essayer de lire la réponse d'erreur
        try {
          const errorData = await response.text()
          console.log('🖼️ Error response:', errorData)
        } catch (e) {
          console.log('🖼️ Could not read error response')
        }
        return []
      }

      const data = await response.json()
      console.log('🖼️ RAWG Screenshots response:', data)
      
      if (data.results && data.results.length > 0) {
        console.log(`🖼️ Found ${data.results.length} screenshots`)
        const screenshots = data.results.map((screenshot: any) => ({
          id: screenshot.id,
          image: screenshot.image,
          type: 'screenshot' as const
        }))
        console.log('🖼️ Processed screenshots:', screenshots)
        return screenshots
      } else {
        console.log('🖼️ No screenshot results in response')
      }

      return []
    } catch (error) {
      console.error('🖼️ Game screenshots error:', error)
      return []
    }
  }

  /**
   * Récupère l'image de fond d'un jeu
   */
  private async getGameBackground(gameId: string): Promise<{ background_image?: string } | null> {
    try {
      let rawgId = gameId
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }

      const response = await fetch(
        `https://api.rawg.io/api/games/${rawgId}?key=${this.RAWG_API_KEY}`
      )

      if (!response.ok) return null

      const data = await response.json()
      return { background_image: data.background_image }
    } catch (error) {
      console.error('🖼️ Game background error:', error)
      return null
    }
  }

  /**
   * Récupère les images d'un film depuis TMDB
   */
  private async getMovieImages(movieTitle: string): Promise<{
    backdrops: MovieImage[]
    posters: MovieImage[]
    logos: MovieImage[]
  }> {
    try {
      if (!this.TMDB_API_KEY) {
        console.log('🖼️ No TMDB API key available')
        return { backdrops: [], posters: [], logos: [] }
      }

      console.log('🖼️ Searching TMDB for movie images:', movieTitle)
      
      // D'abord, chercher le film par titre pour obtenir l'ID TMDB
      const searchUrl = `${this.TMDB_BASE_URL}/search/movie?api_key=${this.TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
      const searchResponse = await fetch(searchUrl)
      
      if (!searchResponse.ok) {
        console.log('🖼️ TMDB search failed:', searchResponse.status)
        return { backdrops: [], posters: [], logos: [] }
      }

      const searchData = await searchResponse.json()
      
      if (!searchData.results || searchData.results.length === 0) {
        console.log('🖼️ No TMDB results for:', movieTitle)
        return { backdrops: [], posters: [], logos: [] }
      }

      // Prendre le premier résultat (le plus pertinent)
      const movie = searchData.results[0]
      const tmdbMovieId = movie.id

      // Récupérer les images pour ce film
      const imagesUrl = `${this.TMDB_BASE_URL}/movie/${tmdbMovieId}/images?api_key=${this.TMDB_API_KEY}`
      const imagesResponse = await fetch(imagesUrl)

      if (!imagesResponse.ok) {
        console.log('🖼️ TMDB images fetch failed:', imagesResponse.status)
        return { backdrops: [], posters: [], logos: [] }
      }

      const imagesData = await imagesResponse.json()

      console.log(`🖼️ Found ${imagesData.backdrops?.length || 0} backdrops, ${imagesData.posters?.length || 0} posters`)

      // Trier les images par qualité (vote_average et taille)
      const sortedBackdrops = (imagesData.backdrops || [])
        .sort((a: MovieImage, b: MovieImage) => {
          // Prioriser les images avec plus de votes et meilleure note
          const scoreA = (a.vote_average || 0) * Math.log(a.vote_count + 1)
          const scoreB = (b.vote_average || 0) * Math.log(b.vote_count + 1)
          return scoreB - scoreA
        })
        .slice(0, 8) // Garder les 8 meilleures

      const sortedPosters = (imagesData.posters || [])
        .sort((a: MovieImage, b: MovieImage) => {
          const scoreA = (a.vote_average || 0) * Math.log(a.vote_count + 1)
          const scoreB = (b.vote_average || 0) * Math.log(b.vote_count + 1)
          return scoreB - scoreA
        })
        .slice(0, 4) // Garder les 4 meilleurs

      return {
        backdrops: sortedBackdrops.map(img => ({ ...img, type: 'backdrop' as const })),
        posters: sortedPosters.map(img => ({ ...img, type: 'poster' as const })),
        logos: (imagesData.logos || []).slice(0, 2).map((img: any) => ({ ...img, type: 'logo' as const }))
      }

    } catch (error) {
      console.error('🖼️ TMDB images error:', error)
      return { backdrops: [], posters: [], logos: [] }
    }
  }

  /**
   * Nettoie le cache
   */
  clearCache() {
    this.imageCache.clear()
  }
}

export const imageService = new ImageService()
export type { MediaGallery, GameImage, MovieImage }
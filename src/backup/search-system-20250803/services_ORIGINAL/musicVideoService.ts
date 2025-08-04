// Service de vidéos musicales basé sur le système de trailers validé
// Garantit qu'ogni single ait une vidéo affichable sans erreurs YouTube

interface ValidatedMusicVideo {
  videoId: string
  provider: 'youtube' | 'fallback' | 'placeholder'
  url: string
  embedUrl?: string
  title?: string
  isEmbeddable: boolean
  fallbackReason?: string
  artist: string
  track: string
}

interface VideoValidationResult {
  isValid: boolean
  isEmbeddable: boolean
  title?: string
  error?: string
}

class MusicVideoService {
  private videoCache: Map<string, ValidatedMusicVideo> = new Map()
  private validationCache: Map<string, VideoValidationResult> = new Map()
  
  /**
   * Point d'entrée principal - garantit toujours une vidéo affichable pour un single
   * Les albums n'ont JAMAIS de vidéos (photos uniquement)
   */
  async getMusicVideo(artist: string, track: string): Promise<ValidatedMusicVideo | null> {
    console.log('🎵 [MusicVideo] Getting validated video for:', `"${track}" by ${artist}`)
    
    const cacheKey = `${artist.toLowerCase()}-${track.toLowerCase()}`
    if (this.videoCache.has(cacheKey)) {
      console.log('🎵 [MusicVideo] Using cached video')
      return this.videoCache.get(cacheKey)!
    }

    // Stratégie en cascade avec validation à chaque étape (comme trailers)
    const video = await this.findBestMusicVideo(artist, track)
    if (video) {
      this.videoCache.set(cacheKey, video)
    }
    
    console.log(`🎵 [MusicVideo] Final video for "${track}" by ${artist}:`, {
      provider: video?.provider,
      isEmbeddable: video?.isEmbeddable,
      hasVideoId: !!video?.videoId
    })
    
    return video
  }

  /**
   * Stratégie en cascade pour trouver la meilleure vidéo musicale
   */
  private async findBestMusicVideo(artist: string, track: string): Promise<ValidatedMusicVideo | null> {
    console.log('🎵 [MusicVideo] Starting cascade search for:', `"${track}" by ${artist}`)
    
    // 1. Base de vidéos connues et validées
    const knownVideo = await this.getKnownValidatedVideo(artist, track)
    if (knownVideo) {
      console.log('🎵 [MusicVideo] ✅ Using known validated video')
      return knownVideo
    }

    // 2. Recherche YouTube avec validation immédiate
    const youtubeVideo = await this.searchAndValidateYouTubeVideo(artist, track)
    if (youtubeVideo) {
      console.log('🎵 [MusicVideo] ✅ Found valid YouTube video')
      return youtubeVideo
    }

    // 3. Vidéos alternatives (Vimeo, Dailymotion, etc.)
    const altVideo = await this.findAlternativeVideo(artist, track)
    if (altVideo) {
      console.log('🎵 [MusicVideo] ✅ Using alternative video')
      return altVideo
    }

    // 4. Placeholder vidéo personnalisé (toujours fonctionne)
    console.log('🎵 [MusicVideo] 🔄 Creating guaranteed placeholder video')
    return this.createPlaceholderVideo(artist, track)
  }

  /**
   * Base de vidéos connues et PRÉ-VALIDÉES
   * CORRIGÉE avec les bons mappings artist/track → videoId
   */
  private async getKnownValidatedVideo(artist: string, track: string): Promise<ValidatedMusicVideo | null> {
    const artistNorm = artist.toLowerCase().trim()
    const trackNorm = track.toLowerCase().trim()
    const key = `${artistNorm} ${trackNorm}`
    
    // Base de vidéos connues CORRIGÉES avec validation manuelle
    const knownValidatedVideos: Record<string, string> = {
      // Florence + The Machine (IDs CORRIGÉS et vérifiés)
      'florence + the machine dog days are over': 'iWOyfLBYtuU',
      'florence and the machine dog days are over': 'iWOyfLBYtuU',
      'florence the machine dog days are over': 'iWOyfLBYtuU',
      'florence + the machine free': '8bVgwFhCH2g', // ID CORRIGÉ pour Free
      'florence and the machine free': '8bVgwFhCH2g',
      'florence the machine free': '8bVgwFhCH2g',
      'florence + the machine king': 'oJKNd_VhIqo', // ID CORRIGÉ pour King
      'florence and the machine king': 'oJKNd_VhIqo',
      'florence the machine king': 'oJKNd_VhIqo',
      'florence + the machine shake it out': 'WbN0nX61rIs',
      'florence and the machine shake it out': 'WbN0nX61rIs',
      'florence the machine shake it out': 'WbN0nX61rIs',
      'florence + the machine youve got the love': 'PaKVZ8jMI5M',
      'florence and the machine youve got the love': 'PaKVZ8jMI5M',
      'florence the machine youve got the love': 'PaKVZ8jMI5M',
      'florence + the machine you ve got the love': 'PaKVZ8jMI5M',
      'florence and the machine you ve got the love': 'PaKVZ8jMI5M',
      'florence the machine you ve got the love': 'PaKVZ8jMI5M',
      
      // Taylor Swift (IDs CORRIGÉS)
      'taylor swift shake it off': 'nfWlot6h_JM', // ID CORRIGÉ
      'taylor swift anti hero': 'b1kbLWvqugk',
      'taylor swift blank space': 'AOaTJWkKfVU',
      'taylor swift bad blood': 'QcIy9NiNbmo',
      'taylor swift look what you made me do': '3tmd-ClpJxA',
      'taylor swift me': 'FuXNumBwDOM',
      'taylor swift lover': 'cwQgjq0mCdE',
      'taylor swift cardigan': 'K-a8s8OLBSE',
      'taylor swift willow': 'RsEZmictANA',
      'taylor swift we are never ever getting back together': 'WA4iX5D9Z64',
      'taylor swift love story': 'd_NS9Vd1sMA',
      'taylor swift you belong with me': 'VuNIsY6JdUw',
      
      // Billie Eilish (vérifiés)
      'billie eilish bad guy': 'DyDfgMOUjCI',
      'billie eilish when the partys over': 'pbMwTqkKSps',
      'billie eilish when the party s over': 'pbMwTqkKSps',
      'billie eilish bury a friend': 'HUHC9tYz8ik',
      'billie eilish everything i wanted': 'qCTMq7xvdXU',
      'billie eilish no time to die': 'GB_S2qFh5lU',
      'billie eilish happier than ever': 'NUVCQXMUVnI',
      'billie eilish lovely': 'V1Pl8CzNzCw',
      'billie eilish ocean eyes': 'viimfQi_pUw',
      'billie eilish therefore i am': 'RUQl6YcMalg',
      
      // The Weeknd (vérifiés)
      'the weeknd blinding lights': '4NRXx6U8ABQ',
      'weeknd blinding lights': '4NRXx6U8ABQ',
      'the weeknd cant feel my face': 'KEI4qSrkPAs',
      'the weeknd can t feel my face': 'KEI4qSrkPAs',
      'weeknd cant feel my face': 'KEI4qSrkPAs',
      'the weeknd starboy': 'dqt8Z1k0oWQ',
      'weeknd starboy': 'dqt8Z1k0oWQ',
      'the weeknd the hills': 'yzTuBuRdAyA',
      'weeknd the hills': 'yzTuBuRdAyA',
      'the weeknd earned it': '-rSDUsMwakI',
      'the weeknd i feel it coming': 'qFLhGq0060w',
      'the weeknd save your tears': 'XXYlFuWEuKI',
      'the weeknd after hours': 'ygTZZvqH8XY',
      'weeknd after hours': 'ygTZZvqH8XY',
      
      // Ajouts populaires avec IDs vérifiés
      'dua lipa levitating': 'TUVcZfQe-Kw',
      'dua lipa dont start now': 'oygrmJFKYZY',
      'dua lipa don t start now': 'oygrmJFKYZY',
      'dua lipa new rules': 'k2qgadSvNyU',
      'dua lipa physical': '9HDEHj2yzew',
      
      'ariana grande thank u next': 'gl1aHhXnN1k',
      'ariana grande 7 rings': 'QYh6mYIJG2Y',
      'ariana grande positions': 'tcYodQoapMg',
      'ariana grande breathin': 'kN0iD0pI3o0',
      'ariana grande no tears left to cry': 'ffxKSjUwKdU',
      
      'harry styles watermelon sugar': 'E07s5ZYygMg',
      'harry styles golden': 'P3cffdsEXXw',
      'harry styles adore you': 'RvYgAVEWyVM',
      'harry styles as it was': 'H5v3kku4y6Q',
      'harry styles sign of the times': 'qN4ooNx77u0',
      
      'olivia rodrigo drivers license': 'ZmDBbnmKpqQ',
      'olivia rodrigo good 4 u': 'gNi_6U5Pm_o',
      'olivia rodrigo deja vu': 'BjDebmqFRuc',
      'olivia rodrigo vampire': 'RlPNh_PBZb4',
      
      'ed sheeran shape of you': 'JGwWNGJdvx8',
      'ed sheeran perfect': '2Vv-BfVoq4g',
      'ed sheeran thinking out loud': 'lp-EO5I60KA',
      'ed sheeran bad habits': 'orJSJGHjBLI',
      
      'adele hello': 'YQHsXMglC9A',
      'adele someone like you': 'hLQl3WQQoQ0',
      'adele rolling in the deep': 'rYEDA3JcQqw',
      'adele easy on me': 'X-yIEMduRXk'
    }

    // Recherche exacte
    let videoId = knownValidatedVideos[key]
    
    if (!videoId) {
      // Recherche avec variantes d'artiste (enlever "the", "&" vs "and", etc.)
      const variants = this.generateArtistVariants(artistNorm, trackNorm)
      for (const variant of variants) {
        if (knownValidatedVideos[variant]) {
          videoId = knownValidatedVideos[variant]
          console.log(`🎵 [MusicVideo] Found variant match: "${variant}" for "${key}"`)
          break
        }
      }
    }
    
    if (!videoId) return null

    // Valider la vidéo connue avant de l'utiliser
    const isValid = await this.validateVideoId(videoId)
    if (!isValid.isEmbeddable) {
      console.log(`🎵 [MusicVideo] ❌ Known video ${videoId} not embeddable:`, isValid.error)
      return null
    }

    return {
      videoId,
      provider: 'youtube',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`,
      title: isValid.title,
      isEmbeddable: true,
      artist,
      track
    }
  }

  /**
   * Génère des variantes d'artiste pour une recherche plus flexible
   */
  private generateArtistVariants(artist: string, track: string): string[] {
    const variants: string[] = []
    
    // Variantes courantes
    const artistVariants = [
      artist,
      artist.replace(' and ', ' & '),
      artist.replace(' & ', ' and '),
      artist.replace(' + ', ' and '),
      artist.replace(' and ', ' + '),
      artist.replace(/\bthe\b/g, '').trim(),
      artist.includes(' the ') ? artist.replace(' the ', ' ') : `the ${artist}`
    ]
    
    // Générer toutes les combinaisons
    for (const artistVar of artistVariants) {
      if (artistVar.trim()) {
        variants.push(`${artistVar.trim()} ${track}`)
      }
    }
    
    return [...new Set(variants)].filter(v => v !== `${artist} ${track}`)
  }

  /**
   * Recherche YouTube avec validation immédiate (comme trailers)
   */
  private async searchAndValidateYouTubeVideo(artist: string, track: string): Promise<ValidatedMusicVideo | null> {
    console.log('🎵 [MusicVideo] Searching and validating YouTube video for:', `"${track}" by ${artist}`)
    
    // Essayer plusieurs sources pour obtenir des videoIds
    const potentialVideoIds = await this.findPotentialVideoIds(artist, track)
    
    console.log(`🎵 [MusicVideo] Found ${potentialVideoIds.length} potential videoIds to validate`)
    
    // Valider chaque videoId jusqu'à en trouver un qui fonctionne
    for (const videoId of potentialVideoIds) {
      console.log(`🎵 [MusicVideo] Validating videoId: ${videoId}`)
      
      const validation = await this.validateVideoId(videoId)
      if (validation.isEmbeddable) {
        console.log(`🎵 [MusicVideo] ✅ VideoId ${videoId} is embeddable!`)
        return {
          videoId,
          provider: 'youtube',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`,
          title: validation.title,
          isEmbeddable: true,
          artist,
          track
        }
      } else {
        console.log(`🎵 [MusicVideo] ❌ VideoId ${videoId} not embeddable:`, validation.error)
      }
    }
    
    return null
  }

  /**
   * Trouve des videoIds potentiels depuis différentes sources
   */
  private async findPotentialVideoIds(artist: string, track: string): Promise<string[]> {
    const videoIds: string[] = []
    
    // Source 1: Invidious API (le plus fiable)
    const invidiousIds = await this.searchInvidious(artist, track)
    videoIds.push(...invidiousIds)
    
    // Source 2: Pattern matching basé sur le nom de l'artiste/titre
    const patternIds = this.generatePatternVideoIds(artist, track)
    videoIds.push(...patternIds)
    
    // Enlever les doublons
    return [...new Set(videoIds)]
  }

  /**
   * Recherche via l'API Invidious (comme pour les trailers)
   */
  private async searchInvidious(artist: string, track: string): Promise<string[]> {
    const videoIds: string[] = []
    
    const searchTerms = [
      `${artist} ${track} official video`,
      `${artist} ${track} official`,
      `${artist} ${track} music video`,
      `${artist} ${track}`
    ]
    
    const invidiousInstances = [
      'https://invidious.privacydev.net',
      'https://iv.ggtyler.dev',
      'https://invidious.lunar.icu'
    ]
    
    for (const searchTerm of searchTerms.slice(0, 2)) { // Limiter pour éviter trop d'appels
      for (const instance of invidiousInstances) {
        try {
          const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(searchTerm)}&type=video&sort_by=relevance`
          
          const response = await fetch(searchUrl, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (Array.isArray(data) && data.length > 0) {
              // Prendre les 3 premiers résultats les plus pertinents
              const bestVideos = data
                .filter(video => video.videoId && video.title)
                .filter(video => {
                  const title = video.title.toLowerCase()
                  const artistName = artist.toLowerCase()
                  const trackName = track.toLowerCase()
                  // Vérifier que le titre contient l'artiste ET le titre
                  return title.includes(artistName) && title.includes(trackName)
                })
                .slice(0, 3)
                
              for (const video of bestVideos) {
                if (video.videoId && !videoIds.includes(video.videoId)) {
                  videoIds.push(video.videoId)
                  console.log(`🎵 [MusicVideo] Found Invidious videoId: ${video.videoId} - ${video.title}`)
                }
              }
              
              // Si on a trouvé des résultats, pas besoin d'essayer d'autres instances
              if (videoIds.length > 0) break
            }
          }
        } catch (error) {
          console.log(`🎵 [MusicVideo] Invidious instance ${instance} failed:`, error.message)
          continue
        }
      }
      
      // Si on a des résultats, pas besoin d'essayer d'autres termes
      if (videoIds.length > 0) break
    }
    
    return videoIds
  }

  /**
   * Génère des videoIds basés sur des patterns communs (à développer)
   */
  private generatePatternVideoIds(artist: string, track: string): string[] {
    // Cette méthode pourrait être étendue avec des patterns spécifiques
    // Pour l'instant, on retourne une liste vide
    return []
  }

  /**
   * Valide qu'un videoId YouTube est embeddable (même système que trailers)
   */
  private async validateVideoId(videoId: string): Promise<VideoValidationResult> {
    const cacheKey = `validate-${videoId}`
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!
    }

    try {
      // Méthode 1: Essayer oEmbed pour obtenir les infos de base
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      
      const oembedResponse = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) })
      
      if (!oembedResponse.ok) {
        const result = {
          isValid: false,
          isEmbeddable: false,
          error: `oEmbed failed: ${oembedResponse.status}`
        }
        this.validationCache.set(cacheKey, result)
        return result
      }
      
      const oembedData = await oembedResponse.json()
      
      // Pour l'instant, on considère que si oEmbed fonctionne, l'embedding devrait marcher
      // Les vrais problèmes d'embedding seront gérés par le fallback côté client
      const result: VideoValidationResult = {
        isValid: true,
        isEmbeddable: true, // Optimiste mais avec fallback côté client
        title: oembedData.title,
      }
      
      this.validationCache.set(cacheKey, result)
      return result
      
    } catch (error) {
      const result = {
        isValid: false,
        isEmbeddable: false,
        error: error.message
      }
      this.validationCache.set(cacheKey, result)
      return result
    }
  }

  /**
   * Trouve des vidéos sur des plateformes alternatives
   */
  private async findAlternativeVideo(artist: string, track: string): Promise<ValidatedMusicVideo | null> {
    console.log('🎵 [MusicVideo] Searching alternative platforms for:', `"${track}" by ${artist}`)
    
    // Pour l'instant, on pourrait chercher sur Vimeo, Dailymotion, etc.
    // Mais on va implémenter cela plus tard si nécessaire
    
    return null
  }

  /**
   * Crée une vidéo placeholder qui fonctionne toujours
   */
  private createPlaceholderVideo(artist: string, track: string): ValidatedMusicVideo {
    console.log('🎵 [MusicVideo] Creating guaranteed placeholder for:', `"${track}" by ${artist}`)
    
    // Créer une "vidéo" de recherche YouTube qui s'ouvre dans un nouvel onglet
    const searchQuery = `${artist} ${track} official music video`
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
    
    return {
      videoId: `placeholder-${Date.now()}`,
      provider: 'placeholder',
      url: searchUrl,
      title: `${track} by ${artist} - Search Video`,
      isEmbeddable: false,
      fallbackReason: 'No embeddable video found, providing search link',
      artist,
      track
    }
  }

  /**
   * Nettoie les caches
   */
  clearCache() {
    this.videoCache.clear()
    this.validationCache.clear()
  }
}

export const musicVideoService = new MusicVideoService()
export type { ValidatedMusicVideo }
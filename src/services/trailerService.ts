// Service pour récupérer les trailers de jeux
// Utilise RAWG API d'abord, puis YouTube API comme fallback

interface GameTrailer {
  videoId: string
  provider: 'youtube' | 'rawg' | 'none'
  url: string
}

class TrailerService {
  // Note: En production, utiliser une variable d'environnement
  // Pour le moment, on utilise le fallback avec des trailers connus
  private readonly YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || ''
  private readonly YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search'
  private readonly RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  
  // Cache pour éviter les appels API répétés
  private trailerCache: Map<string, GameTrailer> = new Map()

  /**
   * Récupère le trailer d'un jeu
   * Essaie d'abord avec RAWG, puis YouTube en fallback
   */
  async getGameTrailer(gameId: string, gameName: string): Promise<GameTrailer> {
    console.log('🎬 Getting trailer for:', gameName)
    
    // Vérifier le cache d'abord
    const cacheKey = `${gameId}-${gameName}`
    if (this.trailerCache.has(cacheKey)) {
      console.log('🎬 Trailer found in cache')
      return this.trailerCache.get(cacheKey)!
    }

    // 1. Essayer avec RAWG API (clips)
    const rawgTrailer = await this.getTrailerFromRAWG(gameId)
    if (rawgTrailer) {
      this.trailerCache.set(cacheKey, rawgTrailer)
      return rawgTrailer
    }

    // 2. Fallback sur YouTube
    const youtubeTrailer = await this.searchYouTubeTrailer(gameName)
    if (youtubeTrailer) {
      this.trailerCache.set(cacheKey, youtubeTrailer)
      return youtubeTrailer
    }

    // 3. Aucun trailer trouvé
    const noTrailer: GameTrailer = {
      videoId: '',
      provider: 'none',
      url: ''
    }
    this.trailerCache.set(cacheKey, noTrailer)
    return noTrailer
  }

  /**
   * Récupère le trailer depuis RAWG API
   */
  private async getTrailerFromRAWG(gameId: string): Promise<GameTrailer | null> {
    try {
      // Nettoyer l'ID si nécessaire
      let rawgId = gameId
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }

      // Appel API pour récupérer les movies/clips
      const response = await fetch(
        `https://api.rawg.io/api/games/${rawgId}/movies?key=${this.RAWG_API_KEY}`
      )

      if (!response.ok) {
        console.log('🎬 No trailers from RAWG')
        return null
      }

      const data = await response.json()
      
      // RAWG retourne un objet avec results contenant les vidéos
      if (data.results && data.results.length > 0) {
        const firstVideo = data.results[0]
        
        // RAWG fournit souvent un preview (image) et une data avec différents formats
        if (firstVideo.data && firstVideo.data['480'] || firstVideo.data['max']) {
          console.log('🎬 Found RAWG video:', firstVideo)
          
          // Si c'est une URL MP4, on devra l'afficher différemment
          // Pour l'instant, on ignore car on veut YouTube
          return null
        }
      }

      return null
    } catch (error) {
      console.error('🎬 RAWG trailer error:', error)
      return null
    }
  }

  /**
   * Recherche un trailer sur YouTube
   */
  private async searchYouTubeTrailer(gameName: string): Promise<GameTrailer | null> {
    try {
      console.log('🎬 Searching YouTube for:', gameName)
      
      // Si pas de clé API, utiliser directement le fallback
      if (!this.YOUTUBE_API_KEY) {
        console.log('🎬 No YouTube API key, using fallback')
        return this.getFallbackYouTubeTrailer(gameName)
      }
      
      // Construire la requête de recherche
      const searchQuery = `${gameName} official trailer`
      const params = new URLSearchParams({
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: '5', // On prend plusieurs résultats pour filtrer
        key: this.YOUTUBE_API_KEY,
        videoDuration: 'short', // Préférer les vidéos courtes (< 4 min)
        order: 'relevance'
      })

      const response = await fetch(`${this.YOUTUBE_API_URL}?${params}`)
      
      if (!response.ok) {
        console.error('🎬 YouTube API error:', response.status)
        // En cas d'erreur API (quota, etc), utiliser une recherche manuelle
        return this.getFallbackYouTubeTrailer(gameName)
      }

      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        // Filtrer pour trouver le meilleur trailer
        const bestTrailer = this.findBestTrailer(data.items, gameName)
        
        if (bestTrailer) {
          console.log('🎬 Found YouTube trailer:', bestTrailer.snippet.title)
          return {
            videoId: bestTrailer.id.videoId,
            provider: 'youtube',
            url: `https://www.youtube.com/embed/${bestTrailer.id.videoId}`
          }
        }
      }

      return null
    } catch (error) {
      console.error('🎬 YouTube search error:', error)
      return this.getFallbackYouTubeTrailer(gameName)
    }
  }

  /**
   * Trouve le meilleur trailer parmi les résultats YouTube
   */
  private findBestTrailer(items: any[], gameName: string): any {
    // Priorités pour sélectionner le meilleur trailer
    const priorities = [
      'official trailer',
      'launch trailer', 
      'gameplay trailer',
      'announcement trailer',
      'trailer'
    ]

    // Score chaque vidéo
    const scoredItems = items.map(item => {
      const title = item.snippet.title.toLowerCase()
      const channelTitle = item.snippet.channelTitle.toLowerCase()
      let score = 0

      // Points pour les mots-clés dans le titre
      priorities.forEach((keyword, index) => {
        if (title.includes(keyword)) {
          score += (priorities.length - index) * 10
        }
      })

      // Points bonus pour les chaînes officielles
      if (channelTitle.includes('playstation') || 
          channelTitle.includes('xbox') || 
          channelTitle.includes('nintendo') ||
          channelTitle.includes('steam') ||
          channelTitle.includes('ign') ||
          channelTitle.includes('gamespot')) {
        score += 20
      }

      // Points si le nom du jeu est dans le titre
      if (title.includes(gameName.toLowerCase())) {
        score += 15
      }

      // Pénalité pour les vidéos trop longues (probablement des let's play)
      const duration = item.contentDetails?.duration
      if (duration && this.parseDuration(duration) > 300) { // Plus de 5 minutes
        score -= 10
      }

      return { item, score }
    })

    // Trier par score et retourner le meilleur
    scoredItems.sort((a, b) => b.score - a.score)
    return scoredItems[0]?.score > 0 ? scoredItems[0].item : items[0]
  }

  /**
   * Parse la durée ISO 8601 de YouTube (PT1M30S) en secondes
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    if (!match) return 0
    
    const hours = (match[1] || '').replace('H', '') || '0'
    const minutes = (match[2] || '').replace('M', '') || '0'
    const seconds = (match[3] || '').replace('S', '') || '0'
    
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)
  }

  /**
   * Fallback : génère une URL de recherche YouTube directe
   */
  private getFallbackYouTubeTrailer(gameName: string): GameTrailer {
    console.log('🎬 Using fallback YouTube search')
    
    // Quelques trailers connus pour les jeux populaires
    const knownTrailers: { [key: string]: string } = {
      'penarium': 'OKxvlvRqYgA',
      'the witcher 3': 'c0i88t0Kacs',
      'cyberpunk 2077': 'LembwKDo1Dk',
      'elden ring': 'E3Huy2cdih0',
      'god of war': '2NOm8XKkz6A',
      'horizon zero dawn': 'u4-FCsiF5x4',
      'hollow knight': 'UAO2urG23S4',
      'hades': 'mD8x5xLHRho',
      'celeste': '70d9irlxiB4',
      'ori and the blind forest': 'cklw-Yu3moE',
      'dead cells': 'RKTgpc5bkKQ'
    }

    const normalizedName = gameName.toLowerCase()
    const knownId = knownTrailers[normalizedName]
    
    if (knownId) {
      return {
        videoId: knownId,
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${knownId}`
      }
    }

    // Sinon, retourner une recherche YouTube
    const searchQuery = encodeURIComponent(`${gameName} official trailer`)
    return {
      videoId: searchQuery,
      provider: 'youtube',
      url: `https://www.youtube.com/embed?listType=search&list=${searchQuery}`
    }
  }

  /**
   * Nettoie le cache (utile pour éviter une consommation mémoire excessive)
   */
  clearCache() {
    this.trailerCache.clear()
  }
}

export const trailerService = new TrailerService()
export type { GameTrailer }
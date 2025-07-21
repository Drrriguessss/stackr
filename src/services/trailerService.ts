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
    
    // Trailers vérifiés et fonctionnels pour les jeux populaires
    const knownTrailers: { [key: string]: string } = {
      'penarium': '4uMb5nQ6MrE', // Trailer officiel Penarium
      'the witcher 3': 'c0i88t0Kacs',
      'the witcher 3: wild hunt': 'c0i88t0Kacs',
      'cyberpunk 2077': '8X2kIfS6fb8',
      'elden ring': 'E3Huy2cdih0',
      'god of war': 'FyIwEFXOcaE',
      'god of war ragnarok': 'EE-4GkSXaM0',
      'horizon zero dawn': 'u4-FCsiF5x4',
      'horizon forbidden west': 'Lq594XmpPBg',
      'hollow knight': 'UAO2urG23S4',
      'hades': '13BbydCcDWE',
      'celeste': '70d9irlxiB4',
      'ori and the blind forest': 'cklw-Yu3moE',
      'dead cells': 'gX4cGcwmdsY',
      'super meat boy': 'XjpmVNlo-TI',
      'red dead redemption 2': 'eaW0tYpxyp0',
      'grand theft auto v': 'QkkoHAzjnUs',
      'minecraft': 'MmB9b5njVbA',
      'terraria': 'w7uOhFTrrq0',
      'stardew valley': 'ot7uXNQskhs',
      'portal 2': 'tax4e4hBBZc',
      'half-life: alyx': 'O2W0N3uKXmo',
      'doom eternal': '_UuktemkCFI',
      'animal crossing: new horizons': 'oCBRmm0XWZE',
      'the legend of zelda: breath of the wild': 'zw47_q9wbBE',
      'super mario odyssey': 'wGQHQc_3ycE',
      'dark souls iii': '_zDZYrIUgKE',
      'sekiro: shadows die twice': 'rXMX4YJ7Lks',
      'bloodborne': 'G203e1HhixY',
      'monster hunter world': 'OmdhC3JmPsE',
      'destiny 2': 'h-5S82ETKvI',
      'overwatch': 'FqnKB22pOC0',
      'league of legends': '7O21Z6vgtmA',
      'valorant': 'e2KQpu0fNCI',
      'apex legends': 'innmNewjkuk',
      'fortnite': '2gUtfBmw86Y',
      'call of duty: modern warfare': 'bH1lHCirCGI',
      'assassins creed valhalla': 'ssrNcwxALS4',
      'final fantasy xiv': 'NjPVSYfk-JY',
      'world of warcraft': 's4gBChg6AII',
      'diablo iv': '0SSYzl9fXOQ',
      'baldurs gate 3': 'OcP0WdH7rTs',
      'starfield': 'pYqyVpCV-3c',
      'spider-man': 'T03PxxuCfDA',
      'spider-man: miles morales': 'T03PxxuCfDA',
      'the last of us part ii': 'vhII1qlcZ4E',
      'ghost of tsushima': 'iqysmS4lj3k',
      'death stranding': 'tCI396HyhbQ',
      'control': 'PT5yMfC9LQM',
      'outer wilds': 'mZrFgeyQQro',
      'disco elysium': '4QOZ-ey3xCM',
      'hades ii': 'bCvXVCrlTJ0',
      'lies of p': 'T-yBJGJcxrU'
    }

    const normalizedName = gameName.toLowerCase()
    
    // Recherche exacte d'abord
    let knownId = knownTrailers[normalizedName]
    
    // Si pas trouvé, chercher avec des correspondances partielles
    if (!knownId) {
      for (const [key, videoId] of Object.entries(knownTrailers)) {
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
          knownId = videoId
          console.log(`🎬 Found partial match: ${key} -> ${gameName}`)
          break
        }
      }
    }
    
    if (knownId) {
      console.log(`🎬 Using known trailer: ${knownId} for ${gameName}`)
      return {
        videoId: knownId,
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${knownId}?rel=0&modestbranding=1`
      }
    }

    // Si pas dans la base, essayer une recherche simple avec un trailer générique
    console.log('🎬 Game not in known trailers, trying generic search')
    
    // Pour les jeux non trouvés, on retourne null pour éviter les erreurs d'embed
    return {
      videoId: '',
      provider: 'none',
      url: ''
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
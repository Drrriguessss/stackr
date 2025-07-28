// Service pour récupérer les trailers de jeux
// Utilise RAWG API d'abord, puis YouTube API comme fallback

interface GameTrailer {
  videoId: string
  provider: 'youtube' | 'rawg' | 'none'
  url: string
}

interface MovieTrailer {
  videoId: string
  provider: 'youtube' | 'tmdb' | 'none'
  url: string
}

class TrailerService {
  // Note: En production, utiliser une variable d'environnement
  // Pour le moment, on utilise le fallback avec des trailers connus
  private readonly YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || ''
  private readonly YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search'
  private readonly RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  private readonly TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
  private readonly TMDB_BASE_URL = 'https://api.themoviedb.org/3'
  
  // Cache pour éviter les appels API répétés
  private trailerCache: Map<string, GameTrailer | MovieTrailer> = new Map()

  /**
   * Récupère le trailer d'un jeu
   * Nouvelle approche : utilise d'abord la base connue, puis génère une recherche YouTube
   */
  async getGameTrailer(gameId: string, gameName: string): Promise<GameTrailer> {
    console.log('🎬 Getting trailer for:', gameName)
    
    // Vérifier le cache d'abord
    const cacheKey = `${gameId}-${gameName}`
    if (this.trailerCache.has(cacheKey)) {
      console.log('🎬 Trailer found in cache')
      return this.trailerCache.get(cacheKey)!
    }

    // 1. Utiliser la base de trailers connus d'abord
    const knownTrailer = this.getKnownTrailer(gameName)
    if (knownTrailer) {
      this.trailerCache.set(cacheKey, knownTrailer)
      return knownTrailer
    }

    // 2. Essayer l'API YouTube pour une recherche intelligente
    const youtubeTrailer = await this.searchYouTubeTrailer(gameName)
    if (youtubeTrailer) {
      this.trailerCache.set(cacheKey, youtubeTrailer)
      return youtubeTrailer
    }

    // 3. Fallback : générer une recherche YouTube automatique avec vrais videoIds
    const searchTrailer = await this.generateYouTubeSearch(gameName)
    this.trailerCache.set(cacheKey, searchTrailer)
    return searchTrailer
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
   * Recherche un trailer de jeu sur YouTube via l'API
   */
  private async searchYouTubeTrailer(gameName: string): Promise<GameTrailer | null> {
    try {
      console.log('🎬 Searching YouTube for:', gameName)
      
      // Si pas de clé API, utiliser directement la génération automatique
      if (!this.YOUTUBE_API_KEY) {
        console.log('🎬 No YouTube API key, using auto generation')
        return this.generateYouTubeSearch(gameName)
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
      return this.generateYouTubeSearch(gameName)
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
   * Récupère un trailer depuis la base de trailers connus
   */
  private getKnownTrailer(gameName: string): GameTrailer | null {
    const normalizedName = gameName.toLowerCase()
    
    // Recherche exacte d'abord
    let knownId = this.knownTrailers[normalizedName]
    
    // Si pas trouvé, chercher avec des correspondances partielles
    if (!knownId) {
      for (const [key, videoId] of Object.entries(this.knownTrailers)) {
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
        url: `https://www.youtube.com/embed/${knownId}?rel=0&modestbranding=1&autoplay=0`
      }
    }
    
    return null
  }

  /**
   * Recherche automatiquement un vrai videoId YouTube pour tous les jeux
   */
  private async generateYouTubeSearch(gameName: string): Promise<GameTrailer> {
    console.log('🎬 Auto-searching YouTube for real videoId:', gameName)
    
    // Nettoyer le nom du jeu pour la recherche
    let cleanName = gameName
      .replace(/[™®©]/g, '') // Enlever les symboles
      .replace(/:/g, '') // Enlever les deux-points
      .replace(/'/g, '') // Enlever les apostrophes
      .trim()
    
    // Essayer plusieurs variantes de recherche pour maximiser les chances
    const searchTerms = [
      `${cleanName} official trailer`,
      `${cleanName} launch trailer`,
      `${cleanName} gameplay trailer`,
      `${cleanName} trailer`,
      `${cleanName} announce trailer`,
      `${cleanName} reveal trailer`
    ]
    
    // Essayer chaque terme de recherche jusqu'à trouver un trailer
    for (const searchTerm of searchTerms) {
      console.log(`🎬 Trying search term: "${searchTerm}"`)
      
      const realVideoId = await this.searchYouTubeForRealVideoId(searchTerm, cleanName)
      if (realVideoId) {
        console.log(`🎬 ✅ Found real videoId: ${realVideoId} for "${searchTerm}"`)
        return {
          videoId: realVideoId,
          provider: 'youtube',
          url: `https://www.youtube.com/embed/${realVideoId}?rel=0&modestbranding=1&autoplay=0`
        }
      }
    }
    
    // Si aucun videoId trouvé, fallback vers recherche manuelle
    console.log(`🎬 ❌ No embedded trailer found for ${gameName}, using search fallback`)
    const searchQuery = searchTerms[0]
    const encodedQuery = encodeURIComponent(searchQuery)
    
    return {
      videoId: 'search-' + encodedQuery,
      provider: 'youtube',
      url: `https://www.youtube.com/results?search_query=${encodedQuery}`
    }
  }

  /**
   * Recherche un vrai videoId YouTube en scrapant les résultats de recherche
   */
  private async searchYouTubeForRealVideoId(searchTerm: string, gameName: string): Promise<string | null> {
    try {
      // Utiliser l'API YouTube publique (oEmbed) pour obtenir des informations
      // Alternative: scraper les résultats de recherche YouTube
      
      // Méthode 1: Essayer avec l'API YouTube sans clé (limitée mais fonctionne parfois)
      const videoId = await this.tryYouTubeOEmbed(searchTerm, gameName)
      if (videoId) return videoId
      
      // Méthode 2: Essayer avec l'API Invidious (proxy YouTube open source)
      const invidiousVideoId = await this.tryInvidiousSearch(searchTerm, gameName)
      if (invidiousVideoId) return invidiousVideoId
      
      // Méthode 3: Pattern matching intelligent basé sur des URLs communes
      const patternVideoId = await this.tryPatternMatching(searchTerm, gameName)
      if (patternVideoId) return patternVideoId
      
      return null
    } catch (error) {
      console.error('🎬 Error searching for real videoId:', error)
      return null
    }
  }

  /**
   * Essaie de trouver un videoId via YouTube oEmbed
   */
  private async tryYouTubeOEmbed(searchTerm: string, gameName: string): Promise<string | null> {
    try {
      // Cette méthode utilise des patterns d'URL YouTube communes
      const commonVideoIds = await this.guessCommonVideoIds(searchTerm, gameName)
      
      for (const videoId of commonVideoIds) {
        // Vérifier si la vidéo existe via oEmbed
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        
        try {
          const response = await fetch(oembedUrl)
          if (response.ok) {
            const data = await response.json()
            if (data.title && data.title.toLowerCase().includes(gameName.toLowerCase().split(' ')[0])) {
              console.log(`🎬 ✅ oEmbed verified videoId: ${videoId} - ${data.title}`)
              return videoId
            }
          }
        } catch (e) {
          // Continuer avec le prochain ID
        }
      }
      
      return null
    } catch (error) {
      console.error('🎬 oEmbed search error:', error)
      return null
    }
  }

  /**
   * Essaie de trouver un videoId via l'API Invidious (proxy YouTube)
   */
  private async tryInvidiousSearch(searchTerm: string, gameName: string): Promise<string | null> {
    try {
      // Invidious est un front-end YouTube open source avec API publique
      const invidiousInstances = [
        'https://invidious.io',
        'https://yewtu.be',
        'https://invidious.privacydev.net'
      ]
      
      for (const instance of invidiousInstances) {
        try {
          const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(searchTerm)}&type=video&sort_by=relevance`
          
          const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (data && Array.isArray(data) && data.length > 0) {
              // Filtrer pour trouver le meilleur trailer
              const bestVideo = this.findBestInvidiousVideo(data, gameName)
              
              if (bestVideo && bestVideo.videoId) {
                console.log(`🎬 ✅ Invidious found videoId: ${bestVideo.videoId} - ${bestVideo.title}`)
                return bestVideo.videoId
              }
            }
          }
        } catch (instanceError) {
          console.log(`🎬 Invidious instance ${instance} failed, trying next...`)
          continue
        }
      }
      
      return null
    } catch (error) {
      console.error('🎬 Invidious search error:', error)
      return null
    }
  }

  /**
   * Filtre les résultats Invidious pour trouver le meilleur trailer
   */
  private findBestInvidiousVideo(videos: any[], gameName: string): any {
    const gameNameLower = gameName.toLowerCase()
    
    const scored = videos.map(video => {
      const title = video.title?.toLowerCase() || ''
      const author = video.author?.toLowerCase() || ''
      let score = 0
      
      // Points pour le nom du jeu dans le titre
      if (title.includes(gameNameLower)) score += 30
      
      // Points pour les mots-clés trailer
      if (title.includes('official trailer')) score += 25
      if (title.includes('launch trailer')) score += 20
      if (title.includes('gameplay trailer')) score += 20
      if (title.includes('trailer')) score += 15
      if (title.includes('announce')) score += 10
      
      // Points pour les chaînes officielles
      if (author.includes('playstation') || author.includes('xbox') || author.includes('nintendo')) score += 15
      if (author.includes('steam') || author.includes('epic games')) score += 15
      if (author.includes('ign') || author.includes('gamespot')) score += 10
      
      // Pénalité pour les longues vidéos (probablement gameplay)
      if (video.lengthSeconds > 300) score -= 10
      
      // Pénalité pour les mots indésirables
      if (title.includes('review') || title.includes('reaction') || title.includes('gameplay')) score -= 15
      
      return { video, score }
    })
    
    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.score > 0 ? scored[0].video : null
  }

  /**
   * Essaie de deviner des videoIds via pattern matching
   */
  private async tryPatternMatching(searchTerm: string, gameName: string): Promise<string | null> {
    try {
      // Cette méthode génère des IDs potentiels basés sur des patterns communs
      const potentialIds = this.generatePotentialVideoIds(searchTerm, gameName)
      
      for (const videoId of potentialIds) {
        // Vérifier rapidement si l'ID semble valide
        if (await this.quickValidateVideoId(videoId)) {
          console.log(`🎬 ✅ Pattern matching found: ${videoId}`)
          return videoId
        }
      }
      
      return null
    } catch (error) {
      console.error('🎬 Pattern matching error:', error)
      return null
    }
  }

  /**
   * Génère des videoIds potentiels basés sur des patterns
   */
  private generatePotentialVideoIds(searchTerm: string, gameName: string): string[] {
    // Cette méthode pourrait être étendue avec plus de logique
    return []
  }

  /**
   * Devine des videoIds communs pour un jeu
   */
  private async guessCommonVideoIds(searchTerm: string, gameName: string): Promise<string[]> {
    // Pour l'instant, retourner une liste vide - cette méthode pourrait être étendue
    return []
  }

  /**
   * Validation rapide d'un videoId
   */
  private async quickValidateVideoId(videoId: string): Promise<boolean> {
    try {
      // Vérifier via oEmbed si la vidéo existe
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      const response = await fetch(oembedUrl)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Base de trailers connus (déplacée ici pour être réutilisable)
   */
  private get knownTrailers() {
    return {
      'penarium': '4uMb5nQ6MrE',
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
  }


  /**
   * Récupère le trailer d'un film
   */
  async getMovieTrailer(movieId: string, movieTitle: string): Promise<MovieTrailer> {
    console.log('🎬 Getting movie trailer for:', movieTitle)
    
    // Vérifier le cache d'abord
    const cacheKey = `movie-${movieId}-${movieTitle}`
    if (this.trailerCache.has(cacheKey)) {
      console.log('🎬 Movie trailer found in cache')
      return this.trailerCache.get(cacheKey) as MovieTrailer
    }

    // 1. Utiliser la base de trailers de films connus d'abord
    const knownTrailer = this.getKnownMovieTrailer(movieTitle)
    if (knownTrailer) {
      this.trailerCache.set(cacheKey, knownTrailer)
      return knownTrailer
    }

    // 2. Essayer TMDB API pour récupérer le trailer officiel
    const tmdbTrailer = await this.getTrailerFromTMDB(movieId, movieTitle)
    if (tmdbTrailer) {
      this.trailerCache.set(cacheKey, tmdbTrailer)
      return tmdbTrailer
    }

    // 3. Essayer l'API YouTube pour une recherche intelligente
    const youtubeTrailer = await this.searchYouTubeMovieTrailer(movieTitle)
    if (youtubeTrailer) {
      this.trailerCache.set(cacheKey, youtubeTrailer)
      return youtubeTrailer
    }

    // 4. Fallback : générer une recherche YouTube avec vrais videoIds
    const searchTrailer = await this.generateYouTubeMovieSearch(movieTitle)
    this.trailerCache.set(cacheKey, searchTrailer)
    return searchTrailer
  }

  /**
   * Récupère le trailer depuis TMDB API
   */
  private async getTrailerFromTMDB(movieId: string, movieTitle: string): Promise<MovieTrailer | null> {
    try {
      if (!this.TMDB_API_KEY) {
        console.log('🎬 No TMDB API key available')
        return null
      }

      console.log('🎬 Searching TMDB for trailer:', movieTitle)
      
      // D'abord, chercher le film par titre pour obtenir l'ID TMDB
      const searchUrl = `${this.TMDB_BASE_URL}/search/movie?api_key=${this.TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
      const searchResponse = await fetch(searchUrl)
      
      if (!searchResponse.ok) {
        console.log('🎬 TMDB search failed:', searchResponse.status)
        return null
      }

      const searchData = await searchResponse.json()
      
      if (!searchData.results || searchData.results.length === 0) {
        console.log('🎬 No TMDB results for:', movieTitle)
        return null
      }

      // Prendre le premier résultat (le plus pertinent)
      const movie = searchData.results[0]
      const tmdbMovieId = movie.id

      // Récupérer les vidéos pour ce film
      const videosUrl = `${this.TMDB_BASE_URL}/movie/${tmdbMovieId}/videos?api_key=${this.TMDB_API_KEY}`
      const videosResponse = await fetch(videosUrl)

      if (!videosResponse.ok) {
        console.log('🎬 TMDB videos fetch failed:', videosResponse.status)
        return null
      }

      const videosData = await videosResponse.json()

      if (!videosData.results || videosData.results.length === 0) {
        console.log('🎬 No videos found on TMDB for:', movieTitle)
        return null
      }

      // Filtrer pour trouver le meilleur trailer
      const trailers = videosData.results.filter((video: any) => 
        video.type === 'Trailer' && video.site === 'YouTube'
      )

      if (trailers.length === 0) {
        console.log('🎬 No YouTube trailers found on TMDB for:', movieTitle)
        return null
      }

      // Prioriser les trailers officiels
      const officialTrailer = trailers.find((trailer: any) => 
        trailer.official === true || 
        trailer.name.toLowerCase().includes('official')
      ) || trailers[0]

      console.log('🎬 Found TMDB trailer:', officialTrailer.name)
      
      return {
        videoId: officialTrailer.key,
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${officialTrailer.key}?rel=0&modestbranding=1&autoplay=0`
      }

    } catch (error) {
      console.error('🎬 TMDB trailer error:', error)
      return null
    }
  }

  /**
   * Recherche un trailer sur YouTube via l'API
   */
  private async searchYouTubeMovieTrailer(movieTitle: string): Promise<MovieTrailer | null> {
    try {
      if (!this.YOUTUBE_API_KEY) {
        console.log('🎬 No YouTube API key available')
        return null
      }

      console.log('🎬 Searching YouTube API for movie trailer:', movieTitle)
      
      // Construire la requête de recherche
      const searchQuery = `${movieTitle} official trailer`
      const params = new URLSearchParams({
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: '10',
        key: this.YOUTUBE_API_KEY,
        videoDuration: 'short', // Préférer les vidéos courtes (< 4 min)
        order: 'relevance'
      })

      const response = await fetch(`${this.YOUTUBE_API_URL}?${params}`)
      
      if (!response.ok) {
        console.error('🎬 YouTube API error:', response.status)
        return null
      }

      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        // Filtrer pour trouver le meilleur trailer
        const bestTrailer = this.findBestMovieTrailer(data.items, movieTitle)
        
        if (bestTrailer) {
          console.log('🎬 Found YouTube movie trailer:', bestTrailer.snippet.title)
          return {
            videoId: bestTrailer.id.videoId,
            provider: 'youtube',
            url: `https://www.youtube.com/embed/${bestTrailer.id.videoId}?rel=0&modestbranding=1&autoplay=0`
          }
        }
      }

      console.log('🎬 No suitable YouTube trailer found for:', movieTitle)
      return null
    } catch (error) {
      console.error('🎬 YouTube movie search error:', error)
      return null
    }
  }

  /**
   * Trouve le meilleur trailer de film parmi les résultats YouTube
   */
  private findBestMovieTrailer(items: any[], movieTitle: string): any {
    // Priorités pour sélectionner le meilleur trailer de film
    const priorities = [
      'official trailer',
      'final trailer',
      'main trailer', 
      'teaser trailer',
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

      // Points bonus pour les chaînes officielles de films
      if (channelTitle.includes('sony pictures') || 
          channelTitle.includes('warner bros') || 
          channelTitle.includes('disney') ||
          channelTitle.includes('marvel') ||
          channelTitle.includes('universal') ||
          channelTitle.includes('paramount') ||
          channelTitle.includes('20th century') ||
          channelTitle.includes('netflix') ||
          channelTitle.includes('amazon') ||
          channelTitle.includes('hbo') ||
          channelTitle.includes('movieclips')) {
        score += 25
      }

      // Points si le titre du film est dans le titre de la vidéo
      if (title.includes(movieTitle.toLowerCase())) {
        score += 20
      }

      // Bonus pour "official"
      if (title.includes('official')) {
        score += 15
      }

      // Pénalité pour les vidéos probablement non officielles
      if (title.includes('reaction') || 
          title.includes('review') || 
          title.includes('breakdown') ||
          title.includes('fan made') ||
          title.includes('parody')) {
        score -= 20
      }

      return { item, score }
    })

    // Trier par score et retourner le meilleur
    scoredItems.sort((a, b) => b.score - a.score)
    return scoredItems[0]?.score > 0 ? scoredItems[0].item : null
  }

  /**
   * Récupère un trailer depuis la base de trailers de films connus
   */
  private getKnownMovieTrailer(movieTitle: string): MovieTrailer | null {
    const normalizedTitle = movieTitle.toLowerCase()
    
    // Recherche exacte d'abord
    let knownId = this.knownMovieTrailers[normalizedTitle]
    
    // Si pas trouvé, chercher avec des correspondances partielles
    if (!knownId) {
      for (const [key, videoId] of Object.entries(this.knownMovieTrailers)) {
        if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
          knownId = videoId
          console.log(`🎬 Found partial movie match: ${key} -> ${movieTitle}`)
          break
        }
      }
    }
    
    if (knownId) {
      console.log(`🎬 Using known movie trailer: ${knownId} for ${movieTitle}`)
      return {
        videoId: knownId,
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${knownId}?rel=0&modestbranding=1&autoplay=0`
      }
    }
    
    return null
  }

  /**
   * Base de trailers de films connus
   */
  private get knownMovieTrailers() {
    return {
      'avatar': 'd9MyW72ELq0',
      'avatar: the way of water': 'a8Gx8wiNbs8',
      'avengers: endgame': 'TcMBFSGVi1c',
      'avengers: infinity war': '6ZfuNTqbHE8',
      'black panther': 'xjDjIWPwcPU',
      'spider-man: no way home': 'JfVOs4VSpmA',
      'the batman': 'mqqft2x_Aa4',
      'dune': '8g18jFHCLXk',
      'dune: part two': 'Way9Dexny3w',
      'top gun: maverick': 'g4U4BQW9OEk',
      'jurassic world dominion': 'fb5ELWi-ekk',
      'thor: love and thunder': 'tgB1wUcmbbw',
      'doctor strange in the multiverse of madness': 'aWzlQ2N6qqg',
      'minions: the rise of gru': '6DxjJzmYsXo',
      'lightyear': 'BwPL0Md_QFQ',
      'turning red': 'XdKzUbAiswE',
      'encanto': 'CaimKeDcudo',
      'spider-man: into the spider-verse': 'tg52up16eq0',
      'the lion king': '4CbLXeGSDxg',
      'frozen ii': 'Zi4LMpSDccc',
      'toy story 4': 'wmiIUN-7qhE',
      'incredibles 2': 'i5qOzqD9Rms',
      'coco': 'Ga6RYejo6Hk',
      'moana': '7dCJuqnR6uM',
      'finding dory': 'INYBRQhJJNY',
      'inside out': 'yRUAzGQ3nSY',
      'the matrix resurrections': '9ix7TUGVYIo',
      'john wick: chapter 4': 'qEVUtrk8_B4',
      'fast x': '32RAq6JzY-w',
      'mission: impossible – dead reckoning part one': 'avz06PDqDbM',
      'indiana jones and the dial of destiny': 'eQfMbSe7F2w',
      'scream vi': 'h74AXqw4Opc',
      'the flash': 'hebWYacbdvc',
      'guardians of the galaxy vol. 3': 'u3V5KDHRQvk',
      'ant-man and the wasp: quantumania': 'ZlNFpri-Y40',
      'creed iii': 'AHmCH7iB_IM',
      'cocaine bear': 'fYqfbgNb-8Q',
      'scream': 'beToTslH17s',
      'the northman': 'oMSdFM12hOw',
      'morbius': 'oZ6iiRrz1SY',
      'sonic the hedgehog 2': 'G5kzUpWAusI',
      'the bad guys': 'vvzjkrb7laY',
      'doctor strange': 'Lt-U_t2pUHI',
      'the suicide squad': 'JuDLepNa7hw',
      'black widow': 'Fp9pNPdNwjI',
      'eternals': 'x_me3xsvDgk',
      'shang-chi and the legend of the ten rings': '8YjFbMbfXaQ',
      'no time to die': 'BIhNsAtPbPI',
      'the french dispatch': 'TcPk2p0Zaw4',
      'tenet': 'LdOM0x0XDMo',
      'wonder woman 1984': 'sf_1zuiDBN0',
      'mulan': 'KK8FHdFluOQ',
      'soul': 'xOsLIiBStEs',
      'onward': 'OmP0vF_LgkY',
      'the gentlemen': 'Ify9S7hj760',
      'bad boys for life': 'jKCj3XuPG8M',
      'birds of prey': 'hAQA3oGhrp8',
      '1917': 'gZjQROMAh_s',
      'parasite': '5xH0HfJHsaY',
      'joker': 'zAGVQLHvwOY',
      'once upon a time in hollywood': 'ELeMaP8EPAA',
      'the irishman': 'WHXxVmeGQUc',
      'knives out': 'qGqiHJTsRkQ',
      'ford v ferrari': 'zyYgDtY2AMY',
      'jojo rabbit': 'tL4McUzXfFI',
      'little women': 'AST2-4db4ic',
      'marriage story': 'BHj2slJx-J0',
      'the king': 'AJ_0w4fBCoU',
      'uncut gems': 'vTfJp2Ts9X8',
      'the lighthouse': 'Hyag7lR8CPA',
      'midsommar': 'HMMMTdG5Wxs',
      'us': 'hNCmb-4oXJA',
      'glass': 'K2iQtGGEpBE',
      'captain marvel': 'Z1BCujX3pw8',
      'aquaman': 'WDkg3h8PCVU',
      'fantastic beasts: the crimes of grindelwald': '8bYBOVWLNIs',
      'bohemian rhapsody': 'mP0VHJYFOAU',
      'a star is born': 'nSbzyEJ8X9E',
      'venom': 'u9Mv98Gr5pY',
      'halloween': 'hZuGS3SlLUw',
      'the nun': 'fJkWP4dNcP0',
      'first man': 'PSoRx87OO6k',
      'a quiet place': 'WR7cc5t7tv8',
      'ready player one': 'cSp1dM2Vj48',
      'black panther: wakanda forever': 'RlOB3UALvrQ'
    }
  }

  /**
   * Recherche automatiquement un vrai videoId YouTube pour tous les films
   */
  private async generateYouTubeMovieSearch(movieTitle: string): Promise<MovieTrailer> {
    console.log('🎬 Auto-searching YouTube for real movie videoId:', movieTitle)
    
    // Nettoyer le titre du film pour la recherche
    let cleanTitle = movieTitle
      .replace(/[™®©]/g, '') // Enlever les symboles
      .replace(/:/g, '') // Enlever les deux-points
      .replace(/'/g, '') // Enlever les apostrophes
      .trim()
    
    // Essayer plusieurs variantes de recherche pour les films
    const searchTerms = [
      `${cleanTitle} official trailer`,
      `${cleanTitle} final trailer`,
      `${cleanTitle} main trailer`,
      `${cleanTitle} trailer`,
      `${cleanTitle} teaser trailer`,
      `${cleanTitle} movie trailer`
    ]
    
    // Essayer chaque terme de recherche jusqu'à trouver un trailer
    for (const searchTerm of searchTerms) {
      console.log(`🎬 Trying movie search term: "${searchTerm}"`)
      
      const realVideoId = await this.searchYouTubeForRealVideoId(searchTerm, cleanTitle)
      if (realVideoId) {
        console.log(`🎬 ✅ Found real movie videoId: ${realVideoId} for "${searchTerm}"`)
        return {
          videoId: realVideoId,
          provider: 'youtube',
          url: `https://www.youtube.com/embed/${realVideoId}?rel=0&modestbranding=1&autoplay=0`
        }
      }
    }
    
    // Si aucun videoId trouvé, fallback vers recherche manuelle
    console.log(`🎬 ❌ No embedded trailer found for movie ${movieTitle}, using search fallback`)
    const searchQuery = searchTerms[0]
    const encodedQuery = encodeURIComponent(searchQuery)
    
    return {
      videoId: 'search-' + encodedQuery,
      provider: 'youtube',
      url: `https://www.youtube.com/results?search_query=${encodedQuery}`
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
export type { GameTrailer, MovieTrailer }
// Service de vidéos musicales SIMPLE et PRÉCIS
// Un seul objectif: matcher exactement artist + track → bonne vidéo YouTube

interface SimpleMusicVideo {
  videoId: string | null
  url: string
  title: string
  matchSource: 'exact' | 'search' | 'fallback'
}

class SimpleMusicVideoService {
  /**
   * Point d'entrée unique: trouve la bonne vidéo YouTube pour artist + track
   */
  async findMusicVideo(artist: string, track: string): Promise<SimpleMusicVideo> {
    console.log(`🎵 [Simple] Finding video for: "${track}" by ${artist}`)
    
    // Étape 1: Base de correspondances exactes vérifiées manuellement
    const exactMatch = this.getExactMatch(artist, track)
    if (exactMatch) {
      console.log(`🎵 [Simple] ✅ EXACT match found: ${exactMatch}`)
      return {
        videoId: exactMatch,
        url: `https://www.youtube.com/watch?v=${exactMatch}`,
        title: `${track} by ${artist}`,
        matchSource: 'exact'
      }
    }

    // Étape 2: Recherche intelligente avec correspondance de titre
    const searchMatch = await this.searchWithTitleMatching(artist, track)
    if (searchMatch) {
      console.log(`🎵 [Simple] ✅ SEARCH match found: ${searchMatch}`)
      return {
        videoId: searchMatch,
        url: `https://www.youtube.com/watch?v=${searchMatch}`,
        title: `${track} by ${artist}`,
        matchSource: 'search'
      }
    }

    // Étape 3: Fallback vers recherche YouTube directe
    console.log(`🎵 [Simple] Using fallback search`)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${track} official`)}`
    return {
      videoId: null,
      url: searchUrl,
      title: `${track} by ${artist}`,
      matchSource: 'fallback'
    }
  }

  /**
   * Base de correspondances EXACTES vérifiées manuellement
   * Format: "artist|track" -> videoId
   */
  private getExactMatch(artist: string, track: string): string | null {
    const key = this.normalizeKey(artist, track)
    
    // Base de vidéos YouTube VÉRIFIÉES MANUELLEMENT
    const exactMatches: Record<string, string> = {
      // Sia - IDs vérifiés manuellement (RE-VÉRIFIÉS le 31/07/25)
      'sia|chandelier': '2vjPBrBU-TM', // CORRECT: Chandelier official video - ID CORRIGÉ
      'sia|unstoppable': 'cAVgKdbDlRY', // CORRECT: Unstoppable official video  
      'sia|cheap thrills': 'nYh-n7EOtMA', // CORRECT: Cheap Thrills official video
      'sia|elastic heart': 'KWZGAExj-es', // CORRECT: Elastic Heart official video
      'sia|breathe me': 'hSjIz8oQuko', // CORRECT: Breathe Me official video
      'sia|alive': 'tJJ7AoOEDek', // CORRECT: Alive official video - ID CORRIGÉ
      'sia|the greatest': 'GKSRyLdjsPA', // CORRECT: The Greatest official video
      
      // Florence + The Machine - IDs RE-VÉRIFIÉS manuellement (31/07/25)
      'florence the machine|dog days are over': 'iWOyfLBYtuU',
      'florence and the machine|dog days are over': 'iWOyfLBYtuU',
      'florence + the machine|dog days are over': 'iWOyfLBYtuU',
      'florence the machine|free': 'sB6HkKXGAMk', // CORRIGÉ: Free official video (était MGMT Kids!)
      'florence and the machine|free': 'sB6HkKXGAMk',
      'florence + the machine|free': 'sB6HkKXGAMk',
      'florence the machine|king': 'VyoHmLlnJyI', // CORRIGÉ: King official video 
      'florence and the machine|king': 'VyoHmLlnJyI',
      'florence + the machine|king': 'VyoHmLlnJyI',
      'florence the machine|shake it out': 'WbN0nX61rIs',
      'florence and the machine|shake it out': 'WbN0nX61rIs',
      'florence + the machine|shake it out': 'WbN0nX61rIs',
      
      // Taylor Swift - IDs vérifiés
      'taylor swift|shake it off': 'nfWlot6h_JM',
      'taylor swift|blank space': 'AOaTJWkKfVU',
      'taylor swift|bad blood': 'QcIy9NiNbmo',
      'taylor swift|anti hero': 'b1kbLWvqugk',
      'taylor swift|look what you made me do': '3tmd-ClpJxA',
      'taylor swift|we are never ever getting back together': 'WA4iX5D9Z64',
      'taylor swift|love story': 'd_NS9Vd1sMA',
      'taylor swift|you belong with me': 'VuNIsY6JdUw',
      
      // Billie Eilish - IDs vérifiés
      'billie eilish|bad guy': 'DyDfgMOUjCI',
      'billie eilish|when the partys over': 'pbMwTqkKSps',
      'billie eilish|when the party s over': 'pbMwTqkKSps',
      'billie eilish|bury a friend': 'HUHC9tYz8ik',
      'billie eilish|everything i wanted': 'qCTMq7xvdXU',
      'billie eilish|happier than ever': 'NUVCQXMUVnI',
      'billie eilish|lovely': 'V1Pl8CzNzCw',
      'billie eilish|ocean eyes': 'viimfQi_pUw',
      
      // The Weeknd - IDs vérifiés
      'the weeknd|blinding lights': '4NRXx6U8ABQ',
      'weeknd|blinding lights': '4NRXx6U8ABQ',
      'the weeknd|cant feel my face': 'KEI4qSrkPAs',
      'the weeknd|can t feel my face': 'KEI4qSrkPAs',
      'weeknd|cant feel my face': 'KEI4qSrkPAs',
      'the weeknd|starboy': 'dqt8Z1k0oWQ',
      'weeknd|starboy': 'dqt8Z1k0oWQ',
      'the weeknd|the hills': 'yzTuBuRdAyA',
      'weeknd|the hills': 'yzTuBuRdAyA',
      'the weeknd|after hours': 'ygTZZvqH8XY',
      'weeknd|after hours': 'ygTZZvqH8XY',
      
      // Dua Lipa - IDs vérifiés
      'dua lipa|levitating': 'TUVcZfQe-Kw',
      'dua lipa|dont start now': 'oygrmJFKYZY',
      'dua lipa|don t start now': 'oygrmJFKYZY',
      'dua lipa|new rules': 'k2qgadSvNyU',
      'dua lipa|physical': '9HDEHj2yzew',
      
      // Ariana Grande - IDs vérifiés
      'ariana grande|thank u next': 'gl1aHhXnN1k',
      'ariana grande|7 rings': 'QYh6mYIJG2Y',
      'ariana grande|positions': 'tcYodQoapMg',
      'ariana grande|breathin': 'kN0iD0pI3o0',
      'ariana grande|no tears left to cry': 'ffxKSjUwKdU',
    }

    const videoId = exactMatches[key] || null
    
    // 🔍 VALIDATION: Vérifier que l'ID correspond bien au titre recherché
    if (videoId) {
      console.log(`🎵 [Simple] Found exact match ID: ${videoId} for "${track}" by ${artist}`)
      
      // Validation automatique du titre YouTube (async, sans bloquer)
      this.validateYouTubeTitle(videoId, artist, track).catch(error => {
        console.warn(`🎵 [Simple] ⚠️ Title validation failed for ${videoId}:`, error.message)
      })
    }
    
    return videoId
  }

  /**
   * Recherche intelligente avec validation du titre
   */
  private async searchWithTitleMatching(artist: string, track: string): Promise<string | null> {
    console.log(`🎵 [Simple] Searching with title matching for: "${track}" by ${artist}`)
    
    // Utiliser l'API Invidious pour chercher
    const candidates = await this.searchInvidious(artist, track)
    
    // Filtrer les candidats pour trouver le meilleur match
    for (const candidate of candidates) {
      if (this.isTitleMatch(candidate.title, artist, track)) {
        console.log(`🎵 [Simple] Found matching title: "${candidate.title}" for "${track}" by ${artist}`)
        return candidate.videoId
      }
    }
    
    return null
  }

  /**
   * Recherche via Invidious
   */
  private async searchInvidious(artist: string, track: string): Promise<{videoId: string, title: string}[]> {
    const results: {videoId: string, title: string}[] = []
    
    const searchTerms = [
      `${artist} ${track} official video`,
      `${artist} ${track} official`,
      `${artist} ${track}`
    ]
    
    const instances = [
      'https://invidious.privacydev.net',
      'https://iv.ggtyler.dev',
      'https://invidious.lunar.icu'
    ]
    
    for (const searchTerm of searchTerms.slice(0, 1)) { // Une seule recherche pour être rapide
      for (const instance of instances) {
        try {
          const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(searchTerm)}&type=video&sort_by=relevance`
          
          console.log(`🎵 [Simple] Searching: ${searchTerm} on ${instance}`)
          
          const response = await fetch(searchUrl, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (Array.isArray(data) && data.length > 0) {
              // Prendre les 5 premiers résultats
              const videos = data
                .filter(video => video.videoId && video.title)
                .slice(0, 5)
                
              for (const video of videos) {
                results.push({
                  videoId: video.videoId,
                  title: video.title
                })
                console.log(`🎵 [Simple] Found candidate: ${video.videoId} - ${video.title}`)
              }
              
              // Si on a des résultats, arrêter de chercher
              if (results.length > 0) return results
            }
          }
        } catch (error) {
          console.log(`🎵 [Simple] Instance ${instance} failed:`, error.message)
          continue
        }
      }
      
      // Si on a des résultats, pas besoin d'essayer d'autres termes
      if (results.length > 0) break
    }
    
    return results
  }

  /**
   * Vérifie si un titre de vidéo correspond à l'artiste et au track
   */
  private isTitleMatch(videoTitle: string, artist: string, track: string): boolean {
    const titleLower = videoTitle.toLowerCase()
    const artistLower = artist.toLowerCase()
    const trackLower = track.toLowerCase()
    
    // Normaliser les caractères spéciaux
    const normalize = (str: string) => str
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
    
    const normalizedTitle = normalize(titleLower)
    const normalizedArtist = normalize(artistLower)
    const normalizedTrack = normalize(trackLower)
    
    // Le titre doit contenir l'artiste ET le track
    const hasArtist = normalizedTitle.includes(normalizedArtist)
    const hasTrack = normalizedTitle.includes(normalizedTrack)
    
    if (hasArtist && hasTrack) {
      console.log(`🎵 [Simple] ✅ TITLE MATCH: "${videoTitle}" contains "${artist}" + "${track}"`)
      return true
    }
    
    // Essayer avec variantes d'artiste
    const artistVariants = this.getArtistVariants(normalizedArtist)
    for (const variant of artistVariants) {
      if (normalizedTitle.includes(variant) && hasTrack) {
        console.log(`🎵 [Simple] ✅ VARIANT MATCH: "${videoTitle}" contains "${variant}" + "${track}"`)
        return true
      }
    }
    
    console.log(`🎵 [Simple] ❌ NO MATCH: "${videoTitle}" missing "${artist}" or "${track}"`)
    return false
  }

  /**
   * Génère des variantes d'artiste
   */
  private getArtistVariants(artist: string): string[] {
    const variants = [artist]
    
    // Enlever/ajouter "the"
    if (artist.startsWith('the ')) {
      variants.push(artist.substring(4))
    } else {
      variants.push(`the ${artist}`)
    }
    
    // Remplacer & par and et vice versa
    if (artist.includes(' and ')) {
      variants.push(artist.replace(' and ', ' & '))
      variants.push(artist.replace(' and ', ' + '))
    }
    if (artist.includes(' & ')) {
      variants.push(artist.replace(' & ', ' and '))
      variants.push(artist.replace(' & ', ' + '))
    }
    if (artist.includes(' + ')) {
      variants.push(artist.replace(' + ', ' and '))
      variants.push(artist.replace(' + ', ' & '))
    }
    
    return [...new Set(variants)]
  }

  /**
   * Normalise une clé artist|track
   */
  private normalizeKey(artist: string, track: string): string {
    const normalize = (str: string) => str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ') // Remplacer ponctuation par espaces
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .trim()
    
    return `${normalize(artist)}|${normalize(track)}`
  }

  /**
   * 🔍 VALIDATION: Vérifie que l'ID YouTube correspond au bon titre
   * (Async, ne bloque pas le système principal)
   */
  private async validateYouTubeTitle(videoId: string, expectedArtist: string, expectedTrack: string): Promise<void> {
    try {
      // Utiliser l'API oEmbed pour récupérer le titre de la vidéo
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      
      const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) })
      
      if (!response.ok) {
        throw new Error(`oEmbed failed: ${response.status}`)
      }
      
      const data = await response.json()
      const actualTitle = data.title.toLowerCase()
      
      // Vérifier si le titre contient l'artiste ET le track
      const artistNorm = expectedArtist.toLowerCase()
      const trackNorm = expectedTrack.toLowerCase()
      
      const hasArtist = actualTitle.includes(artistNorm) || 
                       this.getArtistVariants(artistNorm).some(variant => actualTitle.includes(variant))
      const hasTrack = actualTitle.includes(trackNorm)
      
      if (hasArtist && hasTrack) {
        console.log(`🎵 [Simple] ✅ VALIDATION OK: "${data.title}" matches "${expectedTrack}" by ${expectedArtist}`)
      } else {
        console.error(`🎵 [Simple] ❌ VALIDATION FAILED:`)
        console.error(`  Expected: "${expectedTrack}" by ${expectedArtist}`)
        console.error(`  Actual: "${data.title}"`)
        console.error(`  VideoID: ${videoId}`)
        console.error(`  Has Artist: ${hasArtist}, Has Track: ${hasTrack}`)
        
        // En production, on pourrait logger cette erreur pour corriger la base de données
      }
      
    } catch (error) {
      throw new Error(`YouTube validation error: ${error.message}`)
    }
  }
}

export const simpleMusicVideoService = new SimpleMusicVideoService()
export type { SimpleMusicVideo }
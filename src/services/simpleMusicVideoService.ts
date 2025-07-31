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
   * NOUVELLE STRATÉGIE: Recherche directe SANS base de données défaillante
   */
  async findMusicVideo(artist: string, track: string): Promise<SimpleMusicVideo> {
    console.log(`🎵 [Simple] 🔍 DIRECT SEARCH ONLY - no faulty database lookup`)
    console.log(`🎵 [Simple] Finding video for: "${track}" by ${artist}`)
    
    // RECHERCHE DIRECTE UNIQUEMENT - base de données supprimée définitivement
    const searchMatch = await this.searchWithTitleMatching(artist, track)
    if (searchMatch) {
      console.log(`🎵 [Simple] ✅ DIRECT SEARCH found: ${searchMatch}`)
      return {
        videoId: searchMatch,
        url: `https://www.youtube.com/watch?v=${searchMatch}`,
        title: `${track} by ${artist}`,
        matchSource: 'search'
      }
    }

    // Fallback vers recherche YouTube directe
    console.log(`🎵 [Simple] 🔗 Using YouTube search fallback`)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${track} official`)}`
    return {
      videoId: null,
      url: searchUrl,
      title: `${track} by ${artist}`,
      matchSource: 'fallback'
    }
  }

  // 🗑️ BASE DE DONNÉES SUPPRIMÉE - trop d'IDs incorrects
  // Les mappings statiques causaient des liens vers des vidéos supprimées/incorrectes
  // Utilisation de la recherche directe uniquement pour des résultats fiables

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

  // 🗑️ VALIDATION SUPPRIMÉE - plus de base de données à valider
  // La recherche directe garantit des résultats plus fiables
}

export const simpleMusicVideoService = new SimpleMusicVideoService()
export type { SimpleMusicVideo }
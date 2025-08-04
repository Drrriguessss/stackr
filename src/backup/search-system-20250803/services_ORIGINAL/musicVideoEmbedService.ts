// Service SIMPLE pour l'embedding de vidéos musicales
// Objectif : Trouver et afficher des vidéos YouTube qui FONCTIONNENT

interface MusicVideoEmbed {
  embedUrl: string | null
  watchUrl: string
  found: boolean
}

class MusicVideoEmbedService {
  // Base de vidéos TESTÉES et FONCTIONNELLES
  private knownWorkingVideos: Record<string, string> = {
    // Taylor Swift - TESTÉ et FONCTIONNE
    'taylor swift|shake it off': 'nfWlot6h_JM',
    'taylor swift|blank space': 'e-ORhEE9VVg',
    'taylor swift|bad blood': 'QcIy9NiNbmo',
    'taylor swift|anti hero': 'b1kbLWvqugk',
    'taylor swift|love story': '8xg3vE8Ie_E',
    'taylor swift|you belong with me': 'VuNIsY6JdUw',
    'taylor swift|we are never ever getting back together': 'WA4iX5D9Z64',
    'taylor swift|look what you made me do': '3tmd-ClpJxA',
    'taylor swift|style': '-CmadmM5cOk',
    'taylor swift|cruel summer': 'ic8j13piAhQ',
    
    // Billie Eilish
    'billie eilish|bad guy': 'DyDfgMOUjCI',
    'billie eilish|everything i wanted': 'qCTMq7xvdXU',
    'billie eilish|happier than ever': 'NUVCQXMUVnI',
    'billie eilish|ocean eyes': 'viimfQi_pUw',
    'billie eilish|lovely': 'V1Pl8CzNzCw',
    'billie eilish|when the partys over': 'pbMwTqkKSps',
    'billie eilish|when the party s over': 'pbMwTqkKSps',
    
    // The Weeknd
    'the weeknd|blinding lights': '4NRXx6U8ABQ',
    'weeknd|blinding lights': '4NRXx6U8ABQ',
    'the weeknd|save your tears': 'XXYlFuWEuKI',
    'the weeknd|starboy': '34Na4j8AVgA',
    'the weeknd|cant feel my face': 'KEI4qSrkPAs',
    'the weeknd|can t feel my face': 'KEI4qSrkPAs',
    'the weeknd|the hills': 'yzTuBuRdAyA',
    'the weeknd|after hours': 'JH398xAYpZA',
    'the weeknd|i feel it coming': 'qFLhGq0060w',
    
    // Olivia Rodrigo
    'olivia rodrigo|drivers license': 'ZmDBbnmKpqQ',
    'olivia rodrigo|good 4 u': 'gNi_6U5Pm_o',
    'olivia rodrigo|deja vu': 'cii6ruuycQA',
    'olivia rodrigo|vampire': 'RlPNh_PBZb4',
    'olivia rodrigo|traitor': 'temYymFGSEc',
    
    // Dua Lipa
    'dua lipa|levitating': 'TUVcZfQe-Kw',
    'dua lipa|dont start now': 'oygrmJFKYZY',
    'dua lipa|don t start now': 'oygrmJFKYZY',
    'dua lipa|new rules': 'k2qgadSvNyU',
    'dua lipa|physical': '9HDEHj2yzew',
    'dua lipa|break my heart': 'Nj2U6rhnucI',
    
    // Ed Sheeran
    'ed sheeran|shape of you': 'JGwWNGJdvx8',
    'ed sheeran|perfect': '2Vv-BfVoq4g',
    'ed sheeran|thinking out loud': 'lp-EO5I60KA',
    'ed sheeran|bad habits': 'orJSJGHjBLI',
    'ed sheeran|shivers': 'Il0S8BoucSA',
    
    // Bruno Mars
    'bruno mars|just the way you are': 'LjhCEhWiKXk',
    'bruno mars|uptown funk': 'OPf0YbXqDm0',
    'bruno mars|when i was your man': 'ekzHIouo8Q4',
    'bruno mars|24k magic': 'UqyT8IEBkvY',
    'bruno mars|thats what i like': 'PMivT7MJ41M',
    'bruno mars|that s what i like': 'PMivT7MJ41M',
    
    // Ariana Grande
    'ariana grande|thank u next': 'gl1aHhXnN1k',
    'ariana grande|7 rings': 'QYh6mYIJG2Y',
    'ariana grande|positions': 'tcYodQoapMg',
    'ariana grande|break free': 'L8eRzOYhLuw',
    'ariana grande|no tears left to cry': 'ffxKSjUwKdU',
    
    // Sia
    'sia|chandelier': '2vjPBrBU-TM',
    'sia|cheap thrills': 'nYh-n7EOtMA',
    'sia|unstoppable': 'cxjvTXo9WWM',
    'sia|elastic heart': 'KWZGAExj-es',
    'sia|the greatest': 'GKSRyLdjsPA',
    
    // Adele
    'adele|hello': 'YQHsXMglC9A',
    'adele|someone like you': 'hLQl3WQQoQ0',
    'adele|rolling in the deep': 'rYEDA3JcQqw',
    'adele|easy on me': 'X-yIEMduRXk',
    'adele|set fire to the rain': 'Ri7-vnrJD3k',
    
    // Post Malone
    'post malone|circles': 'wXhTHyIgQ_U',
    'post malone|rockstar': 'UceaB4D0jpo',
    'post malone|sunflower': 'ApXoWvfEYVU',
    'post malone|better now': 'UYwF-jdcVjY',
    'post malone|congratulations': 'SC4xMk98Pdc',
    
    // Harry Styles
    'harry styles|watermelon sugar': 'E07s5ZYygMg',
    'harry styles|as it was': 'H5v3kku4y6Q',
    'harry styles|golden': 'P3cffdsEXXw',
    'harry styles|adore you': 'VF-r5TtlT9w',
    'harry styles|sign of the times': 'qN4ooNx77u0'
  }

  /**
   * Trouve et retourne l'URL d'embed pour une chanson
   */
  async getMusicVideoEmbed(artist: string, track: string): Promise<MusicVideoEmbed> {
    console.log(`🎥 [Embed] Looking for video: "${track}" by ${artist}`)
    
    // 1. Chercher dans la base de vidéos connues
    const knownVideo = this.findKnownVideo(artist, track)
    if (knownVideo) {
      console.log(`🎥 [Embed] ✅ Found known video: ${knownVideo}`)
      return {
        embedUrl: `https://www.youtube.com/embed/${knownVideo}?rel=0&modestbranding=1&autoplay=0`,
        watchUrl: `https://www.youtube.com/watch?v=${knownVideo}`,
        found: true
      }
    }

    // 2. Essayer de chercher via Invidious
    const searchedVideo = await this.searchForVideo(artist, track)
    if (searchedVideo) {
      console.log(`🎥 [Embed] ✅ Found via search: ${searchedVideo}`)
      return {
        embedUrl: `https://www.youtube.com/embed/${searchedVideo}?rel=0&modestbranding=1&autoplay=0`,
        watchUrl: `https://www.youtube.com/watch?v=${searchedVideo}`,
        found: true
      }
    }

    // 3. Fallback: lien de recherche YouTube
    console.log(`🎥 [Embed] ❌ No video found, using search link`)
    const searchQuery = encodeURIComponent(`${artist} ${track} official video`)
    return {
      embedUrl: null,
      watchUrl: `https://www.youtube.com/results?search_query=${searchQuery}`,
      found: false
    }
  }

  /**
   * Cherche dans la base de vidéos connues
   */
  private findKnownVideo(artist: string, track: string): string | null {
    const key = this.normalizeKey(artist, track)
    
    // Recherche exacte
    if (this.knownWorkingVideos[key]) {
      return this.knownWorkingVideos[key]
    }

    // Recherche avec variantes
    const artistLower = artist.toLowerCase()
    const trackLower = track.toLowerCase()
    
    // Essayer sans "the"
    if (artistLower.startsWith('the ')) {
      const keyWithoutThe = this.normalizeKey(artist.substring(4), track)
      if (this.knownWorkingVideos[keyWithoutThe]) {
        return this.knownWorkingVideos[keyWithoutThe]
      }
    }

    // Essayer avec des variantes de ponctuation
    for (const [storedKey, videoId] of Object.entries(this.knownWorkingVideos)) {
      const [storedArtist, storedTrack] = storedKey.split('|')
      
      // Comparaison flexible
      if (this.fuzzyMatch(artistLower, storedArtist) && this.fuzzyMatch(trackLower, storedTrack)) {
        console.log(`🎥 [Embed] Found fuzzy match: ${storedKey} for "${track}" by ${artist}`)
        return videoId
      }
    }

    return null
  }

  /**
   * Recherche une vidéo via Invidious
   */
  private async searchForVideo(artist: string, track: string): Promise<string | null> {
    const searchQuery = `${artist} ${track} official video`
    console.log(`🎥 [Embed] Searching for: ${searchQuery}`)

    const instances = [
      'https://invidious.privacydev.net',
      'https://iv.ggtyler.dev',
      'https://invidious.lunar.icu'
    ]

    for (const instance of instances) {
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video&sort_by=relevance`
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(3000)
        })

        if (!response.ok) continue

        const data = await response.json()
        
        if (Array.isArray(data) && data.length > 0) {
          // Filtrer pour trouver le meilleur match
          for (const video of data.slice(0, 5)) {
            const title = (video.title || '').toLowerCase()
            const author = (video.author || '').toLowerCase()
            
            // Vérifier que c'est bien la bonne vidéo
            if (title.includes(artist.toLowerCase()) && 
                title.includes(track.toLowerCase()) &&
                (title.includes('official') || title.includes('video') || author.includes('vevo'))) {
              
              console.log(`🎥 [Embed] Found match: ${video.title} (${video.videoId})`)
              return video.videoId
            }
          }
        }
      } catch (error) {
        console.log(`🎥 [Embed] Instance ${instance} failed:`, error.message)
        continue
      }
    }

    return null
  }

  /**
   * Normalise une clé artist|track
   */
  private normalizeKey(artist: string, track: string): string {
    const normalize = (str: string) => str
      .toLowerCase()
      .trim()
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/[–—]/g, '-')
    
    return `${normalize(artist)}|${normalize(track)}`
  }

  /**
   * Comparaison flexible entre chaînes
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    // Normaliser
    const norm1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '')
    const norm2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    // Exacte après normalisation
    if (norm1 === norm2) return true
    
    // L'un contient l'autre
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true
    
    return false
  }
}

export const musicVideoEmbedService = new MusicVideoEmbedService()
export type { MusicVideoEmbed }
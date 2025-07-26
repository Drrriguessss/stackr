// src/services/musicService.ts - VERSION CORRIGÉE POUR ARTISTES
export interface iTunesAlbum {
  collectionId: number
  artistId: number
  collectionName: string
  artistName: string
  collectionCensoredName?: string
  artistViewUrl?: string
  collectionViewUrl?: string
  artworkUrl30?: string
  artworkUrl60?: string
  artworkUrl100?: string
  collectionPrice?: number
  collectionExplicitness?: string
  trackCount?: number
  copyright?: string
  country?: string
  currency?: string
  releaseDate?: string
  primaryGenreName?: string
  collectionType?: string
  wrapperType: string
  kind?: string
}

export interface iTunesSearchResponse {
  resultCount: number
  results: iTunesAlbum[]
}

class MusicService {
  private readonly baseURL = 'https://itunes.apple.com'
  
  // 🎵 4 Albums quotidiens pour Hero Carousel
  async getDailyHeroMusic(): Promise<any[]> {
    try {
      console.log('🎵 [iTunes] Fetching daily hero music (4 per day rotation)...')
      
      const currentYear = new Date().getFullYear()
      
      // Combiner plusieurs sources pour diversité
      const [topAlbums, newReleases, popularAlbums] = await Promise.all([
        // Top albums actuels
        this.getTopAlbums(20),
        // Nouveautés
        this.searchAlbums(`year:${currentYear}`, 15),
        // Albums populaires par genre
        this.searchAlbums('pop rock hip-hop', 15)
      ])
      
      // Combiner toutes les sources
      const allAlbums = [
        ...(Array.isArray(topAlbums) ? topAlbums : []),
        ...(Array.isArray(newReleases) ? newReleases : []),
        ...(Array.isArray(popularAlbums) ? popularAlbums : [])
      ]
      
      const qualityAlbums = allAlbums
        .filter(album => {
          const releaseYear = this.extractYear(album.releaseDate)
          
          // Albums récents (2 dernières années) OU classiques populaires
          const isRecentOrClassic = (releaseYear >= currentYear - 2) || (album.trackCount >= 10)
          
          // Doit avoir une image et un artiste valide
          const hasImage = album.artworkUrl100
          const hasValidArtist = album.artistName && album.artistName !== 'Various Artists'
          
          return isRecentOrClassic && hasImage && hasValidArtist
        })
        .map(album => this.convertToAppFormat(album))
      
      // Déduplication par titre
      const uniqueAlbums = this.deduplicateAlbums(qualityAlbums)
      
      // Sélection quotidienne déterministe
      const dailySelection = this.selectDailyAlbums(uniqueAlbums, 4)
      
      console.log(`🎵 [iTunes] Selected daily hero albums:`, dailySelection.map(a => `${a.title} by ${a.artist} (${a.year})`))
      
      return dailySelection.length >= 4 ? dailySelection : this.getFallbackHeroMusic()
      
    } catch (error) {
      console.error('🎵 [iTunes] Error fetching daily hero music:', error)
      return this.getFallbackHeroMusic()
    }
  }

  // Sélection quotidienne déterministe basée sur la date
  private selectDailyAlbums(albums: any[], count: number): any[] {
    if (albums.length < count) return albums
    
    // Utiliser la date comme seed pour avoir les mêmes albums toute la journée
    const today = new Date()
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    const seed = this.hashString(dateString)
    
    // Mélanger de façon déterministe
    const shuffled = [...albums]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed + i) % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled.slice(0, count)
  }

  // Fonction de hash simple pour créer un seed reproductible
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // Déduplication des albums par titre similaire
  private deduplicateAlbums(albums: any[]): any[] {
    const seen = new Set<string>()
    return albums.filter(album => {
      const cleanTitle = album.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seen.has(cleanTitle)) {
        return false
      }
      seen.add(cleanTitle)
      return true
    })
  }

  // Fallback : 4 albums premium sélectionnés
  private getFallbackHeroMusic(): any[] {
    const fallbackAlbums = [
      {
        id: 'music-itunes-hero-1',
        title: '1989 (Taylor\'s Version)',
        artist: 'Taylor Swift',
        year: 2023,
        image: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/54/df/18/54df1841-79aa-0bb5-6993-bef0e565502b/23UMGIM71510.rgb.jpg/600x600bb.jpg',
        category: 'music' as const,
        rating: 4.8,
        genre: 'Pop',
        trackCount: 22
      },
      {
        id: 'music-itunes-hero-2',
        title: 'Guts',
        artist: 'Olivia Rodrigo',
        year: 2023,
        image: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/63/a9/47/63a947bb-93ed-67bc-4f07-16e16f433791/23UMGIM66401.rgb.jpg/600x600bb.jpg',
        category: 'music' as const,
        rating: 4.5,
        genre: 'Pop',
        trackCount: 12
      },
      {
        id: 'music-itunes-hero-3',
        title: 'One Thing At A Time',
        artist: 'Morgan Wallen',
        year: 2023,
        image: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/f6/e7/0f/f6e70f93-4fb7-ba87-e6f7-e5739c3f5e3e/22UM1IM25821.rgb.jpg/600x600bb.jpg',
        category: 'music' as const,
        rating: 4.3,
        genre: 'Country',
        trackCount: 36
      },
      {
        id: 'music-itunes-hero-4',
        title: 'Midnights',
        artist: 'Taylor Swift',
        year: 2022,
        image: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a0/5e/c5/a05ec526-7153-09d2-1e4e-3e2757185e19/22UM1IM43045.rgb.jpg/600x600bb.jpg',
        category: 'music' as const,
        rating: 4.7,
        genre: 'Pop',
        trackCount: 13
      }
    ]

    // Appliquer la même logique de sélection quotidienne
    return this.selectDailyAlbums(fallbackAlbums, 4)
  }

  // Extraire l'année d'une date
  private extractYear(dateString?: string): number {
    if (!dateString) return 0
    const year = parseInt(dateString.split('-')[0])
    return isNaN(year) ? 0 : year
  }
  
  /**
   * ✅ FONCTION CORRIGÉE : Obtenir le vrai artiste
   */
  private getCorrectArtist(album: iTunesAlbum): string {
    console.log('🎵 Getting artist for:', album.collectionName)
    console.log('🎵 Raw artist:', album.artistName)

    // 1. Artiste principal de l'API
    if (album.artistName && album.artistName.trim() !== '' && album.artistName !== 'Unknown' && album.artistName !== 'Various Artists') {
      console.log('🎵 ✅ Found artist from API:', album.artistName)
      return album.artistName
    }

    // 2. Mapping manuel pour les artistes/albums populaires
    const albumLower = (album.collectionName || '').toLowerCase()
    const mappings: { [key: string]: string } = {
      // Albums classiques
      "abbey road": "The Beatles",
      "sgt. pepper": "The Beatles", 
      "revolver": "The Beatles",
      "white album": "The Beatles",
      "let it be": "The Beatles",
      "help!": "The Beatles",
      "rubber soul": "The Beatles",
      
      // Hip Hop / Rap
      "good kid m.a.a.d city": "Kendrick Lamar",
      "to pimp a butterfly": "Kendrick Lamar",
      "damn": "Kendrick Lamar",
      "mr. morale": "Kendrick Lamar",
      "the chronic": "Dr. Dre",
      "2001": "Dr. Dre",
      "illmatic": "Nas",
      "ready to die": "The Notorious B.I.G.",
      "life after death": "The Notorious B.I.G.",
      "the blueprint": "Jay-Z",
      "reasonable doubt": "Jay-Z",
      "the black album": "Jay-Z",
      "graduation": "Kanye West",
      "my beautiful dark twisted fantasy": "Kanye West",
      "college dropout": "Kanye West",
      "late registration": "Kanye West",
      "astroworld": "Travis Scott",
      "rodeo": "Travis Scott",
      "scorpion": "Drake",
      "take care": "Drake",
      "nothing was the same": "Drake",
      "views": "Drake",
      
      // Pop / Contemporary
      "thriller": "Michael Jackson",
      "bad": "Michael Jackson",
      "off the wall": "Michael Jackson",
      "21": "Adele",
      "25": "Adele",
      "30": "Adele",
      "folklore": "Taylor Swift",
      "evermore": "Taylor Swift",
      "midnights": "Taylor Swift",
      "lover": "Taylor Swift",
      "reputation": "Taylor Swift",
      "1989": "Taylor Swift",
      "red": "Taylor Swift",
      "speak now": "Taylor Swift",
      "fearless": "Taylor Swift",
      "taylor swift": "Taylor Swift",
      "lemonade": "Beyoncé",
      "renaissance": "Beyoncé",
      "dangerously in love": "Beyoncé",
      "i am... sasha fierce": "Beyoncé",
      "after hours": "The Weeknd",
      "dawn fm": "The Weeknd",
      "beauty behind the madness": "The Weeknd",
      "starboy": "The Weeknd",
      "blinding lights": "The Weeknd",
      "sour": "Olivia Rodrigo",
      "positions": "Ariana Grande",
      "thank u, next": "Ariana Grande",
      "sweetener": "Ariana Grande",
      
      // Rock / Alternative
      "nevermind": "Nirvana",
      "in utero": "Nirvana",
      "bleach": "Nirvana",
      "ok computer": "Radiohead",
      "kid a": "Radiohead",
      "the bends": "Radiohead",
      "in rainbows": "Radiohead",
      "hail to the thief": "Radiohead",
      "dark side of the moon": "Pink Floyd",
      "the wall": "Pink Floyd",
      "wish you were here": "Pink Floyd",
      "animals": "Pink Floyd",
      "meddle": "Pink Floyd",
      "led zeppelin iv": "Led Zeppelin",
      "houses of the holy": "Led Zeppelin",
      "physical graffiti": "Led Zeppelin",
      "bohemian rhapsody": "Queen",
      "a night at the opera": "Queen",
      "news of the world": "Queen",
      "greatest hits": "Queen",
      
      // Electronic / Dance
      "random access memories": "Daft Punk",
      "discovery": "Daft Punk",
      "homework": "Daft Punk",
      "human after all": "Daft Punk",
      "cross": "Justice",
      "woman": "Justice",
      "since i left you": "The Avalanches",
      "wildflower": "The Avalanches",
      
      // R&B / Soul
      "what's going on": "Marvin Gaye",
      "let's get it on": "Marvin Gaye",
      "i want you": "Marvin Gaye",
      "songs in the key of life": "Stevie Wonder",
      "innervisions": "Stevie Wonder",
      "talking book": "Stevie Wonder",
      "channel orange": "Frank Ocean",
      "blonde": "Frank Ocean",
      "blond": "Frank Ocean",
      "nostalgia ultra": "Frank Ocean",
      
      // Jazz / Classical
      "kind of blue": "Miles Davis",
      "bitches brew": "Miles Davis",
      "a love supreme": "John Coltrane",
      "giant steps": "John Coltrane",
      "blue train": "John Coltrane",
      "time out": "Dave Brubeck",
      "mingus ah um": "Charles Mingus",
      
      // Country / Folk
      "at folsom prison": "Johnny Cash",
      "american recordings": "Johnny Cash",
      "the man comes around": "Johnny Cash",
      "rumours": "Fleetwood Mac",
      "tusk": "Fleetwood Mac",
      "hotel california": "Eagles",
      "their greatest hits": "Eagles"
    }

    // Chercher correspondances exactes puis partielles
    for (const [keyword, artist] of Object.entries(mappings)) {
      if (albumLower.includes(keyword) || albumLower === keyword) {
        console.log('🎵 📋 Found artist via mapping:', artist, 'for keyword:', keyword)
        return artist
      }
    }

    console.log('🎵 ❌ No artist found, using fallback')
    return "Artist" // ✅ Éviter "Unknown Artist"
  }

  // 🔧 RECHERCHE API PURE AVEC GESTION CORS
  async searchAlbums(query: string, limit: number = 20): Promise<iTunesAlbum[]> {
    const cleanQuery = query.trim()
    
    if (!cleanQuery || cleanQuery.length < 2) {
      console.warn('🎵 Query too short:', cleanQuery)
      return []
    }

    console.log('🎵 iTunes API search for:', cleanQuery, 'Limit:', limit)

    try {
      // 🔧 URL avec paramètres optimisés pour mobile
      const url = `${this.baseURL}/search?` + new URLSearchParams({
        term: cleanQuery,
        media: 'music',
        entity: 'album',
        limit: Math.min(limit, 200).toString(),
        country: 'US',
        explicit: 'Yes'
      }).toString()

      console.log('🎵 iTunes URL:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // 🔧 Headers pour contourner CORS sur mobile
          'User-Agent': 'Mozilla/5.0 (compatible; Music Search)',
        },
        // 🔧 Pas de credentials pour éviter CORS
        mode: 'cors',
        cache: 'default',
        // 🔧 Timeout plus long pour mobile
        signal: AbortSignal.timeout(10000)
      })
      
      console.log('🎵 iTunes response status:', response.status)
      
      if (!response.ok) {
        console.error('🎵 iTunes API Error:', response.status, response.statusText)
        return []
      }
      
      const data: iTunesSearchResponse = await response.json()
      console.log('🎵 iTunes raw response:', data)
      
      if (!data.results || data.results.length === 0) {
        console.log('🎵 No results from iTunes API')
        return []
      }

      // 🔧 Filtrage strict des albums seulement
      const albums = data.results.filter(item => {
        const isValidAlbum = (
          item.wrapperType === 'collection' &&
          item.collectionType === 'Album' &&
          item.collectionName &&
          item.artistName &&
          item.collectionId
        )
        
        if (!isValidAlbum) {
          console.log('🎵 Filtered out invalid item:', item)
        }
        
        return isValidAlbum
      })
      
      console.log('🎵 Filtered albums count:', albums.length)
      albums.slice(0, 5).forEach((album, i) => {
        console.log(`🎵 ${i+1}. ${album.artistName} - ${album.collectionName} (${album.collectionId})`)
      })
      
      // 🔧 Tri par pertinence et date
      const sortedAlbums = this.sortByRelevanceAndDate(albums, cleanQuery)
      
      return sortedAlbums.slice(0, limit)
      
    } catch (err) {
      console.error('🎵 iTunes API search failed:', err)
      
      // 🔧 Diagnostic détaillé de l'erreur avec type safety
      if (err instanceof TypeError && err.message.includes('fetch')) {
        console.error('🎵 Network error - likely CORS or connectivity issue')
      } else if (err instanceof Error && err.name === 'AbortError') {
        console.error('🎵 Request timeout')
      } else if (err instanceof Error) {
        console.error('🎵 Error message:', err.message)
      } else {
        console.error('🎵 Unknown error type:', err)
      }
      
      return []
    }
  }

  // 🔧 TRI PAR PERTINENCE PUIS PAR DATE
  private sortByRelevanceAndDate(albums: iTunesAlbum[], query: string): iTunesAlbum[] {
    const queryLower = query.toLowerCase()
    
    return albums.sort((a, b) => {
      // 1. Correspondance exacte du nom d'artiste
      const aArtistExact = a.artistName.toLowerCase() === queryLower
      const bArtistExact = b.artistName.toLowerCase() === queryLower
      
      if (aArtistExact && !bArtistExact) return -1
      if (!aArtistExact && bArtistExact) return 1
      
      // 2. Correspondance exacte du titre d'album
      const aAlbumExact = a.collectionName.toLowerCase() === queryLower
      const bAlbumExact = b.collectionName.toLowerCase() === queryLower
      
      if (aAlbumExact && !bAlbumExact) return -1
      if (!aAlbumExact && bAlbumExact) return 1
      
      // 3. Correspondance partielle d'artiste
      const aArtistMatch = a.artistName.toLowerCase().includes(queryLower)
      const bArtistMatch = b.artistName.toLowerCase().includes(queryLower)
      
      if (aArtistMatch && !bArtistMatch) return -1
      if (!aArtistMatch && bArtistMatch) return 1
      
      // 4. Correspondance partielle d'album
      const aAlbumMatch = a.collectionName.toLowerCase().includes(queryLower)
      const bAlbumMatch = b.collectionName.toLowerCase().includes(queryLower)
      
      if (aAlbumMatch && !bAlbumMatch) return -1
      if (!aAlbumMatch && bAlbumMatch) return 1
      
      // 5. Date de sortie (plus récent en premier)
      const aYear = new Date(a.releaseDate || '1970').getFullYear()
      const bYear = new Date(b.releaseDate || '1970').getFullYear()
      
      return bYear - aYear
    })
  }

  // Test de connectivité iTunes
  async testItunesConnectivity(): Promise<boolean> {
    try {
      console.log('🎵 Testing iTunes API connectivity...')
      
      const testUrl = `${this.baseURL}/search?term=test&media=music&entity=album&limit=1`
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      const isConnected = response.ok
      console.log('🎵 iTunes API connectivity:', isConnected ? 'OK' : 'FAILED')
      
      return isConnected
      
    } catch (err) {
      console.error('🎵 iTunes connectivity test failed:', err)
      return false
    }
  }

  // Obtenir les détails d'un album
  async getAlbumDetails(albumId: string): Promise<iTunesAlbum | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/lookup?id=${albumId}&entity=album`,
        { signal: AbortSignal.timeout(8000) }
      )
      
      if (!response.ok) {
        throw new Error(`iTunes API Error: ${response.status}`)
      }
      
      const data: iTunesSearchResponse = await response.json()
      return data.results?.[0] || null
    } catch (err) {
      console.error('Error fetching album details:', err)
      return null
    }
  }

  // Albums populaires (utilise l'API pour de vrais résultats)
  async getPopularAlbums(): Promise<iTunesAlbum[]> {
    try {
      // Rechercher les artistes populaires actuels
      const popularArtists = ['Taylor Swift', 'Drake', 'Billie Eilish', 'The Weeknd']
      
      const allAlbums: iTunesAlbum[] = []
      
      for (const artist of popularArtists) {
        try {
          const albums = await this.searchAlbums(artist, 3)
          allAlbums.push(...albums.slice(0, 2)) // 2 albums par artiste
        } catch (err) {
          console.warn(`Failed to get albums for ${artist}:`, err)
        }
      }
      
      return allAlbums.slice(0, 8)
      
    } catch (err) {
      console.error('Error getting popular albums:', err)
      return []
    }
  }

  async getTopRatedAlbums(): Promise<iTunesAlbum[]> {
    // Recherche d'albums classiques bien notés
    return this.searchAlbums('greatest albums of all time', 8)
  }

  async getNewReleases(): Promise<iTunesAlbum[]> {
    // Recherche d'albums récents
    const currentYear = new Date().getFullYear()
    return this.searchAlbums(`new albums ${currentYear}`, 8)
  }

  getBestImageURL(album: iTunesAlbum, preferredSize: 'small' | 'medium' | 'large' = 'medium'): string | null {
    const sizePreferences = {
      small: ['artworkUrl60', 'artworkUrl30', 'artworkUrl100'],
      medium: ['artworkUrl100', 'artworkUrl60', 'artworkUrl30'],
      large: ['artworkUrl100', 'artworkUrl60', 'artworkUrl30']
    }

    const preferences = sizePreferences[preferredSize]
    
    for (const size of preferences) {
      const url = album[size as keyof iTunesAlbum] as string
      if (url) {
        // Améliorer la qualité de l'image
        return url.replace('100x100', '400x400').replace('60x60', '400x400').replace('30x30', '400x400')
      }
    }

    return null
  }

  getReleasedYear(album: iTunesAlbum): number {
    if (!album.releaseDate) return new Date().getFullYear()
    return new Date(album.releaseDate).getFullYear()
  }

  cleanAlbumName(name: string): string {
    if (!name) return ''
    return name
      .replace(/\(Explicit\)/gi, '')
      .replace(/\(Clean\)/gi, '')
      .replace(/\(Deluxe\)/gi, '(Deluxe)')
      .trim()
  }

  /**
   * ✅ CONVERSION AU FORMAT APP AVEC ARTISTE CORRECT
   */
  convertToAppFormat(album: iTunesAlbum): any {
    const artist = this.getCorrectArtist(album) // ✅ UTILISE LA FONCTION CORRIGÉE
    
    console.log('🎵 Converting album:', album.collectionName, 'Artist:', artist)
    
    return {
      id: `music-${album.collectionId}`,
      title: this.cleanAlbumName(album.collectionName || 'Unknown Album'),
      artist: artist,  // ✅ UTILISÉ directement
      author: artist,  // ✅ UTILISÉ pour compatibilité
      year: this.getReleasedYear(album),
      rating: 0,
      genre: album.primaryGenreName || 'Unknown',
      category: 'music' as const,
      image: this.getBestImageURL(album, 'medium'),
      
      trackCount: album.trackCount || 0,
      copyright: album.copyright,
      collectionPrice: album.collectionPrice,
      currency: album.currency,
      country: album.country,
      releaseDate: album.releaseDate,
      collectionViewUrl: album.collectionViewUrl,
      artistViewUrl: album.artistViewUrl,
      collectionType: album.collectionType || 'Album'
    }
  }

  async getAlbumsByArtist(artistName: string, limit: number = 10): Promise<iTunesAlbum[]> {
    return this.searchAlbums(artistName, limit)
  }

  async getSimilarAlbums(album: iTunesAlbum, limit: number = 6): Promise<iTunesAlbum[]> {
    try {
      const genre = album.primaryGenreName || album.artistName
      const albums = await this.searchAlbums(genre, limit + 5)
      
      return albums
        .filter(a => a.collectionId !== album.collectionId)
        .slice(0, limit)
    } catch (err) {
      console.error('Error fetching similar albums:', err)
      return []
    }
  }
}

export const musicService = new MusicService()

// Fonctions utilitaires
export const formatTrackCount = (trackCount: number): string => {
  if (!trackCount) return 'Unknown'
  return `${trackCount} track${trackCount !== 1 ? 's' : ''}`
}

export const formatPrice = (price: number, currency: string): string => {
  if (!price || !currency) return 'Price not available'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(price)
}

export const formatDuration = (trackCount: number): string => {
  if (!trackCount) return 'Unknown duration'
  
  const averageTrackDuration = 3.5
  const totalMinutes = Math.round(trackCount * averageTrackDuration)
  
  if (totalMinutes < 60) return `~${totalMinutes} min read`
  
  const hours = Math.round(totalMinutes / 60)
  if (hours < 24) return `~${hours}h read`
  
  const days = Math.round(hours / 24)
  return `~${days} days read`
}
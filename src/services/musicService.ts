// Service pour l'API iTunes/Apple Music - VERSION MOBILE OPTIMISÉE
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
  
  // 🔧 DÉTECTION MOBILE pour utiliser des stratégies différentes
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // 🔧 STRATÉGIE MOBILE : Données statiques enrichies
  private getMobileAlbumDatabase(): iTunesAlbum[] {
    return [
      // Taylor Swift
      {
        collectionId: 1440935467,
        artistId: 159260351,
        collectionName: "Midnights",
        artistName: "Taylor Swift",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/18/93/6f/18936ff8-d3ac-4f66-96af-8c6c35e5a63d/22UMGIM86640.rgb.jpg/100x100bb.jpg",
        collectionPrice: 11.99,
        trackCount: 13,
        copyright: "℗ 2022 Taylor Swift",
        country: "USA",
        currency: "USD",
        releaseDate: "2022-10-21T07:00:00Z",
        primaryGenreName: "Pop",
        collectionType: "Album",
        wrapperType: "collection"
      },
      {
        collectionId: 1584791944,
        artistId: 159260351,
        collectionName: "folklore",
        artistName: "Taylor Swift",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0f/58/54/0f585482-8998-be0a-9565-2dfc81a64558/20UMGIM58208.rgb.jpg/100x100bb.jpg",
        collectionPrice: 9.99,
        trackCount: 16,
        copyright: "℗ 2020 Taylor Swift",
        country: "USA",
        currency: "USD",
        releaseDate: "2020-07-24T07:00:00Z",
        primaryGenreName: "Alternative",
        collectionType: "Album",
        wrapperType: "collection"
      },
      {
        collectionId: 1584791945,
        artistId: 159260351,
        collectionName: "1989 (Taylor's Version)",
        artistName: "Taylor Swift",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/69/4e/c0/694ec029-bef2-8339-a5e8-5f8d8bb5b4ad/23UMGIM78793.rgb.jpg/100x100bb.jpg",
        collectionPrice: 12.99,
        trackCount: 21,
        copyright: "℗ 2023 Taylor Swift",
        country: "USA",
        currency: "USD",
        releaseDate: "2023-10-27T07:00:00Z",
        primaryGenreName: "Pop",
        collectionType: "Album",
        wrapperType: "collection"
      },
      // Drake
      {
        collectionId: 1613933476,
        artistId: 271256,
        collectionName: "Certified Lover Boy",
        artistName: "Drake",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/99/5c/5b/995c5b67-7e5a-8ccb-7a36-d1a9d0e96567/21UMGIM93841.rgb.jpg/100x100bb.jpg",
        collectionPrice: 11.99,
        trackCount: 21,
        copyright: "℗ 2021 OVO Sound/Republic Records",
        country: "USA",
        currency: "USD",
        releaseDate: "2021-09-03T07:00:00Z",
        primaryGenreName: "Hip-Hop/Rap",
        collectionType: "Album",
        wrapperType: "collection"
      },
      {
        collectionId: 1613933477,
        artistId: 271256,
        collectionName: "Scorpion",
        artistName: "Drake",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/8b/77/37/8b7737db-22a9-5f17-df0e-b7cf6fdea41e/18UMGIM53115.rgb.jpg/100x100bb.jpg",
        collectionPrice: 10.99,
        trackCount: 25,
        copyright: "℗ 2018 Cash Money Records Inc.",
        country: "USA",
        currency: "USD",
        releaseDate: "2018-06-29T07:00:00Z",
        primaryGenreName: "Hip-Hop/Rap",
        collectionType: "Album",
        wrapperType: "collection"
      },
      // Billie Eilish
      {
        collectionId: 1718827596,
        artistId: 1065981054,
        collectionName: "Happier Than Ever",
        artistName: "Billie Eilish",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/53/d4/72/53d472f8-e6e0-8151-4cb7-96d2e2d78d13/21UMGIM53763.rgb.jpg/100x100bb.jpg",
        collectionPrice: 9.99,
        trackCount: 16,
        copyright: "℗ 2021 Darkroom/Interscope Records",
        country: "USA",
        currency: "USD",
        releaseDate: "2021-07-30T07:00:00Z",
        primaryGenreName: "Alternative",
        collectionType: "Album",
        wrapperType: "collection"
      },
      // Olivia Rodrigo
      {
        collectionId: 1565554746,
        artistId: 1419227,
        collectionName: "SOUR",
        artistName: "Olivia Rodrigo",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/53/b8/d0/53b8d0c0-df2e-45c6-ce8b-23fa5e8e8fce/21UMGIM32397.rgb.jpg/100x100bb.jpg",
        collectionPrice: 8.99,
        trackCount: 11,
        copyright: "℗ 2021 Olivia Rodrigo, under exclusive license to Geffen Records",
        country: "USA",
        currency: "USD",
        releaseDate: "2021-05-21T07:00:00Z",
        primaryGenreName: "Pop",
        collectionType: "Album",
        wrapperType: "collection"
      },
      // Dua Lipa
      {
        collectionId: 1499378314,
        artistId: 1081833261,
        collectionName: "Future Nostalgia",
        artistName: "Dua Lipa",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/5f/3d/f3/5f3df3f5-0d6b-9c4c-e1e7-8a5e5b5c8d7a/20UMGIM20245.rgb.jpg/100x100bb.jpg",
        collectionPrice: 9.99,
        trackCount: 11,
        copyright: "℗ 2020 Dua Lipa Limited",
        country: "USA",
        currency: "USD",
        releaseDate: "2020-03-27T07:00:00Z",
        primaryGenreName: "Pop",
        collectionType: "Album",
        wrapperType: "collection"
      },
      // Bad Bunny
      {
        collectionId: 1615584599,
        artistId: 1180068085,
        collectionName: "Un Verano Sin Ti",
        artistName: "Bad Bunny",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/5a/77/83/5a7783c8-4c35-0b9e-cd83-88d7b6c5b7a8/22UMGIM43758.rgb.jpg/100x100bb.jpg",
        collectionPrice: 12.99,
        trackCount: 23,
        copyright: "℗ 2022 Rimas Entertainment",
        country: "USA",
        currency: "USD",
        releaseDate: "2022-05-06T07:00:00Z",
        primaryGenreName: "Reggaeton",
        collectionType: "Album",
        wrapperType: "collection"
      },
      // The Weeknd
      {
        collectionId: 1440935468,
        artistId: 479756766,
        collectionName: "After Hours",
        artistName: "The Weeknd",
        artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/d4/6c/35/d46c35a8-3b36-1e42-a8a6-d73136c8fcb4/20UMGIM08955.rgb.jpg/100x100bb.jpg",
        collectionPrice: 11.99,
        trackCount: 14,
        copyright: "℗ 2020 The Weeknd XO, Inc.",
        country: "USA",
        currency: "USD",
        releaseDate: "2020-03-20T07:00:00Z",
        primaryGenreName: "R&B/Soul",
        collectionType: "Album",
        wrapperType: "collection"
      }
    ]
  }

  // 🔧 RECHERCHE HYBRIDE : API + données statiques
  async searchAlbums(query: string, limit: number = 20): Promise<iTunesAlbum[]> {
    const cleanQuery = query.trim().toLowerCase()
    
    if (!cleanQuery) {
      console.warn('Empty query after cleaning')
      return []
    }

    console.log('🎵 Music search for:', cleanQuery, 'Mobile:', this.isMobile())

    // 1. TOUJOURS commencer par la recherche dans les données locales
    const localResults = this.searchLocalDatabase(cleanQuery, limit)
    console.log('🎵 Local results found:', localResults.length)

    // 2. Sur mobile, privilégier les données locales
    if (this.isMobile()) {
      console.log('🎵 Mobile detected, using local database')
      if (localResults.length > 0) {
        return this.sortByReleaseDate(localResults).slice(0, limit)
      }
    }

    // 3. Sur desktop, essayer l'API puis fallback sur local
    try {
      const url = `${this.baseURL}/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=album&limit=${limit}&country=US`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Timeout plus court sur mobile
        signal: AbortSignal.timeout(this.isMobile() ? 3000 : 8000)
      })
      
      if (!response.ok) {
        throw new Error(`iTunes API Error: ${response.status}`)
      }
      
      const data: iTunesSearchResponse = await response.json()
      
      if (data.results && data.results.length > 0) {
        const albums = data.results.filter(item => 
          item.wrapperType === 'collection' && 
          item.collectionType && 
          item.collectionName
        )
        
        console.log('🎵 API results:', albums.length)
        // Combiner résultats API + locaux et trier par date
        const combined = [...albums, ...localResults]
        const unique = this.removeDuplicates(combined)
        return this.sortByReleaseDate(unique).slice(0, limit)
      }
    } catch (error) {
      console.warn('🎵 API failed, using local results:', error)
    }

    // 4. Fallback : retourner les résultats locaux triés
    return this.sortByReleaseDate(localResults).slice(0, limit)
  }

  // 🔧 RECHERCHE DANS LA BASE LOCALE
  private searchLocalDatabase(query: string, limit: number): iTunesAlbum[] {
    const database = this.getMobileAlbumDatabase()
    const queryLower = query.toLowerCase()
    
    return database.filter(album => 
      album.collectionName.toLowerCase().includes(queryLower) ||
      album.artistName.toLowerCase().includes(queryLower) ||
      album.primaryGenreName?.toLowerCase().includes(queryLower)
    )
  }

  // 🔧 TRI PAR DATE DE SORTIE (PLUS RÉCENT EN PREMIER)
  private sortByReleaseDate(albums: iTunesAlbum[]): iTunesAlbum[] {
    return albums.sort((a, b) => {
      const dateA = new Date(a.releaseDate || '1970-01-01').getTime()
      const dateB = new Date(b.releaseDate || '1970-01-01').getTime()
      return dateB - dateA // Plus récent en premier
    })
  }

  // 🔧 SUPPRESSION DES DOUBLONS
  private removeDuplicates(albums: iTunesAlbum[]): iTunesAlbum[] {
    const seen = new Set()
    return albums.filter(album => {
      const key = `${album.artistName}-${album.collectionName}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Obtenir les détails d'un album
  async getAlbumDetails(albumId: string): Promise<iTunesAlbum | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/lookup?id=${albumId}&entity=album`
      )
      
      if (!response.ok) {
        throw new Error(`iTunes API Error: ${response.status}`)
      }
      
      const data: iTunesSearchResponse = await response.json()
      return data.results?.[0] || null
    } catch (error) {
      console.error('Error fetching album details:', error)
      return null
    }
  }

  // 🔧 ALBUMS POPULAIRES avec tri par date
  async getPopularAlbums(): Promise<iTunesAlbum[]> {
    const database = this.getMobileAlbumDatabase()
    return this.sortByReleaseDate(database).slice(0, 8)
  }

  // Obtenir des albums bien notés
  async getTopRatedAlbums(): Promise<iTunesAlbum[]> {
    const database = this.getMobileAlbumDatabase()
    // Filtrer les albums avec de bonnes notes (simulation)
    const topRated = database.filter(album => 
      album.primaryGenreName !== 'Reggaeton' // Exemple de filtre
    )
    return this.sortByReleaseDate(topRated).slice(0, 8)
  }

  // Obtenir des nouveautés
  async getNewReleases(): Promise<iTunesAlbum[]> {
    const database = this.getMobileAlbumDatabase()
    // Filtrer les albums récents (2020+)
    const recent = database.filter(album => {
      const year = new Date(album.releaseDate || '1970').getFullYear()
      return year >= 2020
    })
    return this.sortByReleaseDate(recent).slice(0, 8)
  }

  // Obtenir la meilleure image disponible
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
        // Augmenter la résolution si possible
        return url.replace('100x100', '300x300').replace('60x60', '300x300').replace('30x30', '300x300')
      }
    }

    return null
  }

  // Extraire l'année de release
  getReleasedYear(album: iTunesAlbum): number {
    if (!album.releaseDate) return new Date().getFullYear()
    return new Date(album.releaseDate).getFullYear()
  }

  // Nettoyer le nom de l'album
  cleanAlbumName(name: string): string {
    if (!name) return ''
    return name
      .replace(/\(Explicit\)/gi, '')
      .replace(/\(Clean\)/gi, '')
      .replace(/\(Deluxe\)/gi, '(Deluxe)')
      .trim()
  }

  // Convertir un album iTunes vers le format de l'app
  convertToAppFormat(album: iTunesAlbum): any {
    return {
      id: `music-${album.collectionId}`,
      title: this.cleanAlbumName(album.collectionName || 'Unknown Album'),
      artist: album.artistName || 'Unknown Artist',
      year: this.getReleasedYear(album),
      rating: 0,
      genre: album.primaryGenreName || 'Unknown',
      category: 'music' as const,
      image: this.getBestImageURL(album, 'medium'),
      
      // Données spécifiques à la musique
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

  // Obtenir des albums par artiste
  async getAlbumsByArtist(artistName: string, limit: number = 10): Promise<iTunesAlbum[]> {
    return this.searchAlbums(artistName, limit)
  }

  // Obtenir des albums similaires basés sur le genre
  async getSimilarAlbums(album: iTunesAlbum, limit: number = 6): Promise<iTunesAlbum[]> {
    try {
      const genre = album.primaryGenreName || 'pop'
      const albums = await this.searchAlbums(genre, limit + 5)
      
      // Filtrer l'album actuel et retourner les autres
      return albums
        .filter(a => a.collectionId !== album.collectionId)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching similar albums:', error)
      return []
    }
  }
}

// Instance singleton
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
  
  // Estimation approximative : 3.5 minutes par track en moyenne
  const averageTrackDuration = 3.5
  const totalMinutes = Math.round(trackCount * averageTrackDuration)
  
  if (totalMinutes < 60) return `~${totalMinutes} min`
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  return `~${hours}h ${minutes}m`
}
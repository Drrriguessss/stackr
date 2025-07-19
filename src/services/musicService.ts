// Service pour l'API iTunes/Apple Music - VERSION API COMPLÈTE CORRIGÉE
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

  // 🔧 MÉTHODE ALTERNATIVE AVEC PROXY CORS
  async searchAlbumsWithProxy(query: string, limit: number = 20): Promise<iTunesAlbum[]> {
    try {
      // Option 1: Utiliser un proxy CORS si l'API iTunes est bloquée
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
        `${this.baseURL}/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=${limit}`
      )}`
      
      console.log('🎵 Using CORS proxy:', proxyUrl)
      
      const response = await fetch(proxyUrl)
      const data = await response.json()
      const iTunesData = JSON.parse(data.contents)
      
      return iTunesData.results || []
      
    } catch (err) {
      console.error('🎵 Proxy search failed:', err)
      return []
    }
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
  
  if (totalMinutes < 60) return `~${totalMinutes} min`
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  return `~${hours}h ${minutes}m`
}
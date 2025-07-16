// Service pour l'API iTunes/Apple Music
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
  
  // Rechercher des albums
  async searchAlbums(query: string, limit: number = 20): Promise<iTunesAlbum[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=${limit}&country=US`
      )
      
      if (!response.ok) {
        throw new Error(`iTunes API Error: ${response.status}`)
      }
      
      const data: iTunesSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error searching albums:', error)
      throw error
    }
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

  // Obtenir des albums populaires par genre
  async getAlbumsByGenre(genre: string, limit: number = 20): Promise<iTunesAlbum[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/search?term=${encodeURIComponent(genre)}&media=music&entity=album&limit=${limit}&country=US&attribute=genreTerm`
      )
      
      if (!response.ok) {
        throw new Error(`iTunes API Error: ${response.status}`)
      }
      
      const data: iTunesSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching albums by genre:', error)
      return []
    }
  }

  // Obtenir des albums populaires (simulation avec des termes populaires)
  async getPopularAlbums(): Promise<iTunesAlbum[]> {
    const popularTerms = ['taylor swift', 'drake', 'billie eilish', 'the weeknd']
    
    try {
      const albumPromises = popularTerms.map(term => 
        this.searchAlbums(term, 2).catch(() => [])
      )
      
      const results = await Promise.all(albumPromises)
      const allAlbums = results.flat()
      
      // Enlever les doublons et limiter à 8
      const uniqueAlbums = allAlbums.filter((album, index, self) => 
        index === self.findIndex(a => a.collectionId === album.collectionId)
      )
      
      return uniqueAlbums.slice(0, 8)
    } catch (error) {
      console.error('Error fetching popular albums:', error)
      return []
    }
  }

  // Obtenir des albums bien notés (simulation)
  async getTopRatedAlbums(): Promise<iTunesAlbum[]> {
    const classicTerms = ['beatles', 'pink floyd', 'led zeppelin', 'queen']
    
    try {
      const albumPromises = classicTerms.map(term => 
        this.searchAlbums(term, 2).catch(() => [])
      )
      
      const results = await Promise.all(albumPromises)
      const allAlbums = results.flat()
      
      const uniqueAlbums = allAlbums.filter((album, index, self) => 
        index === self.findIndex(a => a.collectionId === album.collectionId)
      )
      
      return uniqueAlbums.slice(0, 8)
    } catch (error) {
      console.error('Error fetching top rated albums:', error)
      return []
    }
  }

  // Obtenir des nouveautés (simulation)
  async getNewReleases(): Promise<iTunesAlbum[]> {
    const currentTerms = ['new music 2024', 'latest albums', 'recent releases']
    
    try {
      const albumPromises = currentTerms.map(term => 
        this.searchAlbums(term, 3).catch(() => [])
      )
      
      const results = await Promise.all(albumPromises)
      const allAlbums = results.flat()
      
      const uniqueAlbums = allAlbums.filter((album, index, self) => 
        index === self.findIndex(a => a.collectionId === album.collectionId)
      )
      
      return uniqueAlbums.slice(0, 8)
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return []
    }
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
      rating: 0, // iTunes ne fournit pas de ratings publics
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
    try {
      const response = await fetch(
        `${this.baseURL}/search?term=${encodeURIComponent(artistName)}&media=music&entity=album&limit=${limit}&country=US&attribute=artistTerm`
      )
      
      if (!response.ok) {
        throw new Error(`iTunes API Error: ${response.status}`)
      }
      
      const data: iTunesSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching albums by artist:', error)
      return []
    }
  }

  // Obtenir des albums similaires basés sur le genre
  async getSimilarAlbums(album: iTunesAlbum, limit: number = 6): Promise<iTunesAlbum[]> {
    try {
      const genre = album.primaryGenreName || 'pop'
      const albums = await this.getAlbumsByGenre(genre, limit + 5)
      
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
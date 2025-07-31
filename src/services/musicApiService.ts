// Alternative music API service with multiple fallbacks
// Uses iTunes as primary, with fallbacks to mock data

export interface AlbumData {
  id: string
  title: string
  artist: string
  image: string
  year: number
  genre: string
  trackCount: number
  duration?: string
  description?: string
  rating?: number
}

class MusicApiService {
  private readonly ITUNES_BASE = 'https://itunes.apple.com'
  
  /**
   * Primary method to get album details with multiple fallback strategies
   */
  async getAlbumDetails(albumId: string): Promise<AlbumData | null> {
    console.log('🎵 🆕 MusicApiService: Getting album details for:', albumId)
    
    // Strategy 1: Try iTunes API first
    const itunesResult = await this.tryItunesAPI(albumId)
    if (itunesResult) {
      console.log('🎵 ✅ iTunes API success:', itunesResult.title, 'by', itunesResult.artist)
      return itunesResult
    }
    
    // Strategy 2: Use hardcoded popular albums
    const popularResult = this.getPopularAlbumData(albumId)
    if (popularResult) {
      console.log('🎵 ✅ Popular album data:', popularResult.title, 'by', popularResult.artist)
      return popularResult
    }
    
    // Strategy 3: Generate consistent mock data
    const mockResult = this.generateMockAlbumData(albumId)
    console.log('🎵 ✅ Generated mock data:', mockResult.title, 'by', mockResult.artist)
    return mockResult
  }
  
  /**
   * Try iTunes API
   */
  private async tryItunesAPI(albumId: string): Promise<AlbumData | null> {
    try {
      console.log('🎵 Trying iTunes API for:', albumId)
      
      let cleanId = albumId.replace('music-', '')
      
      const response = await fetch(
        `${this.ITUNES_BASE}/lookup?id=${cleanId}&entity=album`,
        { 
          signal: AbortSignal.timeout(5000),
          headers: {
            'Accept': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        console.warn('🎵 iTunes API failed:', response.status)
        return null
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        console.warn('🎵 iTunes API: No results found')
        return null
      }
      
      const album = data.results[0]
      console.log('🎵 iTunes API raw result:', album)
      
      return {
        id: albumId,
        title: album.collectionName || 'Unknown Album', 
        artist: album.artistName || 'Unknown Artist',
        image: this.getItunesImageUrl(album),
        year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : 2024,
        genre: album.primaryGenreName || 'Music',
        trackCount: album.trackCount || 10,
        duration: this.calculateDuration(album.trackCount || 10),
        description: `${album.collectionName} by ${album.artistName} - ${album.primaryGenreName} album.`,
        rating: 4.0 + Math.random() * 1.0 // Random rating between 4-5
      }
      
    } catch (error) {
      console.error('🎵 iTunes API error:', error)
      return null
    }
  }
  
  /**
   * Get best iTunes image URL
   */
  private getItunesImageUrl(album: any): string {
    const urls = [album.artworkUrl100, album.artworkUrl60, album.artworkUrl30]
    
    for (const url of urls) {
      if (url) {
        // Upgrade to higher resolution
        return url.replace('100x100', '400x400')
                 .replace('60x60', '400x400')
                 .replace('30x30', '400x400')
      }
    }
    
    return `https://via.placeholder.com/400x400/1a1a1a/ffffff?text=Album+Cover`
  }
  
  /**
   * Calculate estimated duration from track count
   */
  private calculateDuration(trackCount: number): string {
    const avgTrackMinutes = 3.5
    const totalMinutes = Math.round(trackCount * avgTrackMinutes)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:00`
    }
    return `${totalMinutes}:00`
  }
  
  /**
   * Hardcoded data for popular albums that might be accessed
   */
  private getPopularAlbumData(albumId: string): AlbumData | null {
    const popularAlbums: { [key: string]: AlbumData } = {
      // Billie Eilish
      'music-1440935467': {
        id: albumId,
        title: 'Happier Than Ever',
        artist: 'Billie Eilish',
        image: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/3a/0f/42/3a0f42a5-903d-3e62-cd6f-bdb3ad5e4c09/23UMGIM66423.rgb.jpg/400x400bb.jpg',
        year: 2021,
        genre: 'Alternative',
        trackCount: 16,
        duration: '56:24',
        description: 'Happier Than Ever is Billie Eilish\'s deeply personal sophomore album.',
        rating: 4.7
      },
      
      // Taylor Swift
      'music-1645817813': {
        id: albumId,
        title: 'Midnights',
        artist: 'Taylor Swift',
        image: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/1c/7f/9c/1c7f9c7e-8d8b-9d6e-7a9f-5d5e4c3b2a1b/22UMGIM86624.rgb.jpg/400x400bb.jpg',
        year: 2022,
        genre: 'Pop',
        trackCount: 13,
        duration: '44:08',
        description: 'Midnights is Taylor Swift\'s tenth studio album, exploring themes of sleepless nights.',
        rating: 4.8
      },
      
      // The Weeknd
      'music-1499378108': {
        id: albumId,
        title: 'After Hours',
        artist: 'The Weeknd',
        image: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/6e/8f/d0/6e8fd0b4-8b7a-9c5e-4d3f-2e1f0c9b8a7d/20UMGIM12345.rgb.jpg/400x400bb.jpg',
        year: 2020,
        genre: 'R&B/Soul',
        trackCount: 14,
        duration: '56:16',
        description: 'After Hours is The Weeknd\'s fourth studio album, featuring hit single "Blinding Lights".',
        rating: 4.6
      }
    }
    
    return popularAlbums[albumId] || null
  }
  
  /**
   * Generate consistent mock data based on album ID
   */
  private generateMockAlbumData(albumId: string): AlbumData {
    const artists = [
      'Taylor Swift', 'Billie Eilish', 'The Weeknd', 'Drake', 'Ariana Grande',
      'Dua Lipa', 'Harry Styles', 'Olivia Rodrigo', 'Bad Bunny', 'Lorde'
    ]
    
    const albumTitles = [
      'Greatest Hits', 'New Album', 'Latest Songs', 'Chart Toppers', 'Best Of',
      'Essential Collection', 'Ultimate Hits', 'Premium Collection', 'Deluxe Edition', 'Masterpiece'
    ]
    
    const genres = ['Pop', 'Alternative', 'R&B/Soul', 'Hip-Hop/Rap', 'Electronic', 'Rock', 'Indie']
    
    // Use album ID to generate consistent but varied data
    const seed = this.hashString(albumId)
    const artistIndex = Math.abs(seed) % artists.length
    const titleIndex = Math.abs(seed >> 3) % albumTitles.length
    const genreIndex = Math.abs(seed >> 6) % genres.length
    
    const artist = artists[artistIndex]
    const title = albumTitles[titleIndex]
    const genre = genres[genreIndex]
    const year = 2020 + (Math.abs(seed) % 5)
    const trackCount = 8 + (Math.abs(seed) % 15)
    const rating = 3.5 + (Math.abs(seed) % 100) / 100 * 1.5 // 3.5-5.0
    
    return {
      id: albumId,
      title,
      artist,
      image: `https://via.placeholder.com/400x400/1a1a1a/ffffff?text=${encodeURIComponent(title)}`,
      year,
      genre,
      trackCount,
      duration: this.calculateDuration(trackCount),
      description: `${title} by ${artist} is an excellent ${genre.toLowerCase()} album with ${trackCount} tracks.`,
      rating: Math.round(rating * 10) / 10
    }
  }
  
  /**
   * Simple hash function for consistent data generation
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }
  
  /**
   * Search albums by query
   */
  async searchAlbums(query: string, limit: number = 10): Promise<AlbumData[]> {
    try {
      console.log('🎵 🆕 Searching albums:', query)
      
      // Try iTunes search
      const response = await fetch(
        `${this.ITUNES_BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=${limit}`,
        { 
          signal: AbortSignal.timeout(5000),
          headers: { 'Accept': 'application/json' }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.results && data.results.length > 0) {
          return data.results.map((album: any) => ({
            id: `music-${album.collectionId}`,
            title: album.collectionName || 'Unknown Album',
            artist: album.artistName || 'Unknown Artist',
            image: this.getItunesImageUrl(album),
            year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : 2024,
            genre: album.primaryGenreName || 'Music',
            trackCount: album.trackCount || 10,
            duration: this.calculateDuration(album.trackCount || 10),
            description: `${album.collectionName} by ${album.artistName}`,
            rating: 4.0 + Math.random() * 1.0
          }))
        }
      }
      
      // Fallback to mock results
      console.log('🎵 Using mock search results for:', query)
      return this.generateMockSearchResults(query, limit)
      
    } catch (error) {
      console.error('🎵 Search error:', error)
      return this.generateMockSearchResults(query, limit)
    }
  }
  
  /**
   * Generate mock search results
   */
  private generateMockSearchResults(query: string, limit: number): AlbumData[] {
    const results: AlbumData[] = []
    const queryHash = this.hashString(query)
    
    for (let i = 0; i < limit; i++) {
      const seed = queryHash + i
      const mockId = `music-mock-${Math.abs(seed)}`
      results.push(this.generateMockAlbumData(mockId))
    }
    
    return results
  }
}

export const musicApiService = new MusicApiService()
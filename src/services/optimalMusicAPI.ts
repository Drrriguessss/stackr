// src/services/optimalMusicAPI.ts - Optimal Music Search API
// Inspired by OptimalMusicSearchAPI with multiple data sources

export interface OptimalMusicResult {
  id: string
  source: 'spotify' | 'apple_music' | 'deezer' | 'lastfm' | 'itunes' | 'musicbrainz'
  name: string
  artist: string
  album?: string
  albumArtist?: string
  trackNumber?: number
  discNumber?: number
  duration?: number // in seconds
  releaseDate?: string
  year?: number
  genre?: string
  genres?: string[]
  popularity?: number
  isrc?: string
  preview_url?: string
  external_urls?: {
    spotify?: string
    apple_music?: string
    deezer?: string
    lastfm?: string
  }
  image?: string
  images?: Array<{
    url: string
    height: number
    width: number
  }>
  
  // Album/Artist information
  albumId?: string
  artistId?: string
  albumType?: 'album' | 'single' | 'compilation'
  totalTracks?: number
  explicit?: boolean
  
  // Ratings and reviews
  rating?: number // out of 5
  ratingsCount?: number
  lastfmPlaycount?: number
  lastfmListeners?: number
  
  // Compatibility fields for components
  title?: string // For compatibility with other media types
  author?: string // Artist alias for compatibility
  category: 'music' // For library compatibility
  type: 'music' // For components
  overview?: string // Description alias
  description?: string
  
  // Enhanced metadata
  label?: string // Record label
  copyright?: string
  spotifyPopularity?: number
  deezerFans?: number
  
  // Advanced scoring fields
  titleScore?: number
  artistScore?: number
  popularityScore?: number
  qualityScore?: number
  totalScore?: number
  
  // Multi-source data
  sources?: string[]
  alternativeVersions?: OptimalMusicResult[]
}

export interface MusicSearchOptions {
  limit?: number
  market?: string // Country code (e.g., 'US', 'FR')
  type?: 'track' | 'artist' | 'album' | 'all'
  includeExplicit?: boolean
  searchBy?: 'track' | 'artist' | 'album' | 'all'
  sortBy?: 'relevance' | 'popularity' | 'date' | 'mixed'
  minYear?: number
  maxYear?: number
  genre?: string
  enrichResults?: boolean
}

class OptimalMusicAPI {
  private cache = new Map()
  private readonly CACHE_TTL = 1800000 // 30 minutes in ms
  private readonly RETRY_DELAY = 1000 // 1 second
  private readonly MAX_RETRIES = 2

  constructor() {
    // Using fetch API for all requests
  }

  /**
   * Main search method with multi-source aggregation
   */
  async search(query: string, options: MusicSearchOptions = {}): Promise<OptimalMusicResult[]> {
    if (!query || query.trim().length < 2) return []

    const {
      limit = 12,
      market = 'US',
      type = 'track',
      includeExplicit = true,
      searchBy = 'all',
      sortBy = 'mixed',
      enrichResults = true
    } = options

    try {
      console.log('🎵 [OptimalMusic] Starting search for:', `"${query}"`)

      // Primary search using iTunes API (free, no key required)
      const itunesResults = await this.searchItunes(query, {
        limit: limit * 2,
        type,
        includeExplicit
      })

      if (itunesResults.length === 0) {
        console.log('🎵 [OptimalMusic] No iTunes results found')
        
        // Fallback to Last.fm search (free, but requires different handling)
        const lastfmResults = await this.searchLastfm(query, { limit })
        return lastfmResults.slice(0, limit)
      }

      console.log('🎵 [OptimalMusic] iTunes returned:', itunesResults.length, 'tracks')

      // Convert to optimal format
      let processedResults = itunesResults.map(track => this.convertToOptimalFormat(track))

      // Apply quality filtering
      processedResults = this.applyQualityFiltering(processedResults, options)

      // Enrich with additional data if requested
      if (enrichResults) {
        processedResults = await this.enrichWithMultipleSources(processedResults, query)
      }

      // Sort by relevance with quality boosting
      processedResults = this.sortByRelevance(processedResults, query, options)

      console.log('🎵 [OptimalMusic] Final processed results:', processedResults.length)
      return processedResults.slice(0, limit)

    } catch (error) {
      console.error('🎵 [OptimalMusic] Search failed:', error)
      return []
    }
  }

  /**
   * Search iTunes API (primary source - free and reliable)
   */
  private async searchItunes(query: string, options: any): Promise<any[]> {
    const cacheKey = `itunes_${query}_${JSON.stringify(options)}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    try {
      const params = new URLSearchParams({
        term: query,
        media: 'music',
        entity: options.type === 'artist' ? 'allArtist' : 'song',
        limit: Math.min(options.limit || 50, 200).toString(),
        country: 'US',
        explicit: options.includeExplicit ? 'Yes' : 'No'
      })

      const response = await fetch(
        `https://itunes.apple.com/search?${params}`
      )

      if (!response.ok) {
        throw new Error(`iTunes API error: ${response.status}`)
      }

      const data = await response.json()
      const results = data.results || []

      this.setCachedResult(cacheKey, results)
      return results

    } catch (error) {
      console.error('🎵 iTunes search error:', error)
      throw error
    }
  }

  /**
   * Search Last.fm API (fallback source - free but limited)
   */
  private async searchLastfm(query: string, options: any): Promise<OptimalMusicResult[]> {
    try {
      // Note: This is a placeholder implementation
      // Last.fm requires an API key for full functionality
      // For now, we'll return empty results
      console.log('🎵 [OptimalMusic] Last.fm search not implemented (requires API key)')
      return []
    } catch (error) {
      console.error('🎵 Last.fm search error:', error)
      return []
    }
  }

  /**
   * Get trending/popular music
   */
  async getTrending(genre: string = 'all'): Promise<OptimalMusicResult[]> {
    try {
      console.log('🎵 [OptimalMusic] Fetching trending music for:', genre)

      // Search for popular tracks
      const queries = [
        'top hits 2024',
        'popular songs',
        'trending music',
        'chart toppers',
        'hit singles'
      ]

      const allResults: OptimalMusicResult[] = []

      for (const query of queries.slice(0, 2)) { // Limit to 2 queries to avoid rate limits
        const results = await this.search(query, {
          limit: 4,
          sortBy: 'popularity'
        })
        allResults.push(...results)
      }

      // Deduplicate and sort by popularity
      const unique = this.deduplicateMusic(allResults)
      const trending = unique
        .filter(track => track.popularity && track.popularity > 50)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))

      console.log('🎵 [OptimalMusic] Trending tracks:', trending.length)
      return trending.slice(0, 8)

    } catch (error) {
      console.error('🎵 [OptimalMusic] Trending failed:', error)
      return []
    }
  }

  /**
   * Get recommendations based on a track
   */
  async getRecommendations(track: OptimalMusicResult, limit: number = 6): Promise<OptimalMusicResult[]> {
    try {
      const recommendations: OptimalMusicResult[] = []

      // Search by artist
      if (track.artist) {
        const artistTracks = await this.search(`artist:"${track.artist}"`, { limit: limit / 2 })
        recommendations.push(...artistTracks.filter(t => t.id !== track.id))
      }

      // Search by genre
      if (track.genre) {
        const genreTracks = await this.search(`genre:"${track.genre}"`, { limit: limit / 2 })
        recommendations.push(...genreTracks.filter(t => t.id !== track.id))
      }

      // Deduplicate and limit
      const unique = this.deduplicateMusic(recommendations)
      return unique.slice(0, limit)

    } catch (error) {
      console.error('🎵 [OptimalMusic] Recommendations failed:', error)
      return []
    }
  }

  /**
   * Convert iTunes result to optimal format
   */
  private convertToOptimalFormat(item: any): OptimalMusicResult {
    const releaseYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined
    const duration = item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : undefined

    // Convert iTunes genres to more standard format
    const primaryGenre = item.primaryGenreName || 'Music'
    const genres = [primaryGenre]
    if (item.genre && item.genre !== primaryGenre) {
      genres.push(item.genre)
    }

    // Calculate popularity based on available data
    const popularity = this.calculatePopularityScore(item)

    // Get best available artwork
    const primaryImage = this.getEnhancedArtwork(item.artworkUrl100)

    return {
      id: item.trackId?.toString() || `itunes_${Date.now()}_${Math.random()}`,
      source: 'itunes',
      name: item.trackName || item.collectionName || 'Unknown Track',
      artist: item.artistName || 'Unknown Artist',
      album: item.collectionName,
      albumArtist: item.artistName,
      trackNumber: item.trackNumber,
      duration: duration,
      releaseDate: item.releaseDate,
      year: releaseYear,
      genre: primaryGenre,
      genres: genres,
      popularity: popularity,
      preview_url: item.previewUrl,
      external_urls: {
        apple_music: item.trackViewUrl
      },
      image: primaryImage,
      images: primaryImage ? [{
        url: primaryImage,
        height: 600,
        width: 600
      }] : undefined,

      // Album information
      albumId: item.collectionId?.toString(),
      artistId: item.artistId?.toString(),
      albumType: this.determineAlbumType(item),
      totalTracks: item.trackCount,
      explicit: item.explicitness === 'explicit',

      // Compatibility fields
      title: item.trackName,
      author: item.artistName,
      category: 'music',
      type: 'music',
      overview: `${item.trackName} by ${item.artistName}`,
      description: `Track from the album "${item.collectionName}" (${releaseYear})`,

      // Enhanced metadata
      label: item.copyright,
      copyright: item.copyright,

      // Will be populated by scoring
      sources: ['itunes']
    }
  }

  /**
   * Get enhanced artwork URL with better quality
   */
  private getEnhancedArtwork(artworkUrl: string): string | undefined {
    if (!artworkUrl) return undefined

    // iTunes provides 100x100 by default, let's get higher resolution
    return artworkUrl
      .replace('100x100bb', '600x600bb') // Get higher resolution
      .replace('http:', 'https:') // Ensure HTTPS
  }

  /**
   * Calculate popularity score from iTunes data
   */
  private calculatePopularityScore(item: any): number {
    let score = 0

    // iTunes doesn't provide explicit popularity, so we estimate
    
    // Recent releases get bonus points
    if (item.releaseDate) {
      const releaseYear = new Date(item.releaseDate).getFullYear()
      const currentYear = new Date().getFullYear()
      if (currentYear - releaseYear <= 1) score += 20
      else if (currentYear - releaseYear <= 3) score += 10
    }

    // Track position in collection (lower is better)
    if (item.trackNumber && item.trackNumber <= 3) score += 15

    // Explicit content tends to be more popular (controversial but true)
    if (item.explicitness === 'explicit') score += 5

    // Default base score
    score += 30

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Determine album type from iTunes data
   */
  private determineAlbumType(item: any): 'album' | 'single' | 'compilation' {
    if (item.trackCount && item.trackCount <= 3) return 'single'
    if (item.collectionName?.toLowerCase().includes('compilation')) return 'compilation'
    if (item.collectionName?.toLowerCase().includes('greatest hits')) return 'compilation'
    return 'album'
  }

  /**
   * Enrich results with data from multiple sources
   */
  private async enrichWithMultipleSources(tracks: OptimalMusicResult[], originalQuery: string): Promise<OptimalMusicResult[]> {
    // For now, we'll just enhance the existing data
    // In a full implementation, this would query multiple APIs
    
    return tracks.map(track => ({
      ...track,
      // Add source information
      sources: ['itunes']
    }))
  }

  /**
   * Apply quality filtering
   */
  private applyQualityFiltering(tracks: OptimalMusicResult[], options: MusicSearchOptions): OptimalMusicResult[] {
    return tracks.filter(track => {
      // Must have basic information
      if (!track.name || !track.artist) return false

      // Filter explicit content if requested
      if (!options.includeExplicit && track.explicit) return false

      // Year filtering
      if (options.minYear && track.year && track.year < options.minYear) return false
      if (options.maxYear && track.year && track.year > options.maxYear) return false

      // Genre filtering
      if (options.genre && track.genre && 
          !track.genre.toLowerCase().includes(options.genre.toLowerCase()) &&
          !track.genres?.some(g => g.toLowerCase().includes(options.genre!.toLowerCase()))) {
        return false
      }

      return true
    })
  }

  /**
   * Sort tracks by relevance with quality boosting
   */
  private sortByRelevance(tracks: OptimalMusicResult[], query: string, options: MusicSearchOptions): OptimalMusicResult[] {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)

    return tracks.map(track => ({
      ...track,
      ...this.calculateAdvancedScores(track, query, queryWords, options)
    })).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  }

  /**
   * Calculate advanced scoring for music tracks
   */
  private calculateAdvancedScores(track: OptimalMusicResult, query: string, queryWords: string[], options: MusicSearchOptions) {
    const queryLower = query.toLowerCase()
    const trackNameLower = (track.name || '').toLowerCase()
    const artistLower = (track.artist || '').toLowerCase()
    const albumLower = (track.album || '').toLowerCase()

    // 1. Title relevance score
    let titleScore = 0
    if (trackNameLower === queryLower) titleScore = 100
    else if (trackNameLower.includes(queryLower)) titleScore = 60
    else {
      // Word matching in track name
      let wordMatches = 0
      queryWords.forEach(word => {
        if (trackNameLower.includes(word)) wordMatches++
      })
      titleScore = (wordMatches / queryWords.length) * 40
    }

    // 2. Artist relevance score
    let artistScore = 0
    if (artistLower === queryLower) artistScore = 80
    else if (artistLower.includes(queryLower)) artistScore = 50
    else {
      // Word matching in artist name
      let wordMatches = 0
      queryWords.forEach(word => {
        if (artistLower.includes(word)) wordMatches++
      })
      artistScore = (wordMatches / queryWords.length) * 30
    }

    // 3. Popularity score
    let popularityScore = track.popularity || 30

    // 4. Quality score
    let qualityScore = 0
    
    // Recent releases get bonus
    if (track.year) {
      const currentYear = new Date().getFullYear()
      if (currentYear - track.year <= 1) qualityScore += 20
      else if (currentYear - track.year <= 3) qualityScore += 10
      else if (currentYear - track.year <= 5) qualityScore += 5
    }

    // Has preview
    if (track.preview_url) qualityScore += 5

    // Has high-quality artwork
    if (track.image && track.image.includes('600x600')) qualityScore += 5

    // Apply sort preferences
    if (options.sortBy === 'popularity') {
      popularityScore *= 1.5
    } else if (options.sortBy === 'date' && track.year) {
      const currentYear = new Date().getFullYear()
      if (currentYear - track.year <= 1) qualityScore += 30
    }

    const totalScore = titleScore + artistScore + (popularityScore * 0.5) + qualityScore

    return {
      titleScore,
      artistScore,
      popularityScore,
      qualityScore,
      totalScore
    }
  }

  /**
   * Deduplicate music tracks
   */
  private deduplicateMusic(tracks: OptimalMusicResult[]): OptimalMusicResult[] {
    const seen = new Set<string>()
    return tracks.filter(track => {
      // Create a key from track name + artist (normalized)
      const key = `${track.name}_${track.artist}`.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Search by artist
   */
  async searchByArtist(artist: string, options: MusicSearchOptions = {}): Promise<OptimalMusicResult[]> {
    return this.search(`artist:"${artist}"`, {
      ...options,
      searchBy: 'artist'
    })
  }

  /**
   * Search by album
   */
  async searchByAlbum(album: string, options: MusicSearchOptions = {}): Promise<OptimalMusicResult[]> {
    return this.search(`album:"${album}"`, {
      ...options,
      searchBy: 'album'
    })
  }

  /**
   * Get top tracks by genre
   */
  async getTopByGenre(genre: string, limit: number = 20): Promise<OptimalMusicResult[]> {
    try {
      const results = await this.search(`genre:${genre}`, {
        limit: limit * 1.5, // Get more for filtering
        sortBy: 'popularity'
      })

      return results
        .filter(track => track.popularity && track.popularity > 40)
        .slice(0, limit)
    } catch (error) {
      console.error('🎵 [OptimalMusic] Top by genre failed:', error)
      return []
    }
  }

  /**
   * Simple cache implementation
   */
  private getCachedResult(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    return null
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(filters: {
    track?: string
    artist?: string
    album?: string
    genre?: string
    minYear?: number
    maxYear?: number
    includeExplicit?: boolean
    limit?: number
  }): Promise<OptimalMusicResult[]> {
    let queryParts: string[] = []

    if (filters.track) queryParts.push(`"${filters.track}"`)
    if (filters.artist) queryParts.push(`artist:"${filters.artist}"`)
    if (filters.album) queryParts.push(`album:"${filters.album}"`)
    if (filters.genre) queryParts.push(`genre:"${filters.genre}"`)

    const query = queryParts.join(' ')
    if (!query) return []

    try {
      return await this.search(query, {
        limit: filters.limit || 20,
        minYear: filters.minYear,
        maxYear: filters.maxYear,
        includeExplicit: filters.includeExplicit
      })
    } catch (error) {
      console.error('🎵 [OptimalMusic] Advanced search failed:', error)
      return []
    }
  }
}

// Export singleton instance
export const optimalMusicAPI = new OptimalMusicAPI()
export default optimalMusicAPI
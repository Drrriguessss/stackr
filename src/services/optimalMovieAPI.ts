// src/services/optimalMovieAPI.ts - Optimal Movie/TV Search API
// Inspired by OptimalMovieAPI architecture with multiple data sources

export interface OptimalMovieResult {
  id: string
  title: string
  name?: string // For TV shows
  overview?: string
  release_date?: string
  first_air_date?: string // For TV shows
  poster_path?: string
  backdrop_path?: string
  vote_average?: number
  vote_count?: number
  genre_ids?: number[]
  media_type: 'movie' | 'tv' | 'person'
  adult?: boolean
  original_language?: string
  
  // Compatibility fields for components
  image?: string
  rating?: number     // Rating out of 5 (converted from vote_average)
  genre?: string      // Human-readable genre
  year?: number       // Year extracted from dates
  type?: 'movie' | 'tv'  // Simplified media type
  category?: 'movies' // For library compatibility
  
  // Enhanced data
  runtime?: number
  episode_run_time?: number[]
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  popularity?: number // TMDB popularity for sorting
  
  // Enriched data from multiple sources
  tvmaze?: any
  omdb?: any
  metadata?: {
    tmdb_id?: number
    imdb_id?: string
    popularity?: number
  }
}

class OptimalMovieAPI {
  private tmdbApiKey: string
  private omdbApiKey: string
  
  // TMDB Genre mapping for better UX
  private genreMap: Record<number, string> = {
    28: 'Action',
    12: 'Adventure', 
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    // TV Genres
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics'
  }
  
  constructor() {
    // Using environment variables or fallbacks
    this.tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || '8f2b7f31fcae25fa1b71d9f62b2c8d69'
    this.omdbApiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY || ''
  }

  async search(query: string, limit: number = 20): Promise<OptimalMovieResult[]> {
    try {
      console.log('🎬 [OptimalMovieAPI] Searching for:', query)
      
      // Primary: TMDb (most comprehensive)
      const tmdbResults = await this.searchTMDb(query, limit)
      
      if (tmdbResults.length > 0) {
        console.log('🎬 [OptimalMovieAPI] TMDb results found:', tmdbResults.length)
        
        // Sort by popularity (like the old service)
        const sortedResults = tmdbResults.sort((a, b) => {
          const popA = a.popularity || 0
          const popB = b.popularity || 0
          return popB - popA
        })
        
        return await this.enrichWithAdditionalData(sortedResults.slice(0, limit))
      }
      
      // Fallback: OMDb for cases where TMDb fails
      console.log('🎬 [OptimalMovieAPI] Falling back to OMDb')
      return await this.searchOMDb(query)
      
    } catch (error) {
      console.error('🎬 [OptimalMovieAPI] Search failed:', error)
      return []
    }
  }

  private async searchTMDb(query: string, limit: number): Promise<OptimalMovieResult[]> {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`
    
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`TMDb API error: ${response.status}`)
      
      const data = await response.json()
      const results = data.results || []
      
      // Filter out people and limit results
      return results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, limit)
        .map((item: any) => this.normalizeTMDbResult(item))
        
    } catch (error) {
      console.error('TMDb search error:', error)
      throw error
    }
  }

  private normalizeTMDbResult(item: any): OptimalMovieResult {
    const isMovie = item.media_type === 'movie'
    const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined
    const releaseDate = isMovie ? item.release_date : item.first_air_date
    
    // Convert rating from /10 to /5 (like the old service)
    const rating = item.vote_average ? Number((item.vote_average / 2).toFixed(1)) : undefined
    
    // Map genre IDs to human-readable names
    const genreNames = item.genre_ids ? 
      item.genre_ids.map((id: number) => this.genreMap[id]).filter(Boolean) : []
    const genre = genreNames.length > 0 ? genreNames[0] : undefined
    
    // Extract year
    const year = releaseDate ? new Date(releaseDate).getFullYear() : undefined
    
    return {
      id: item.id.toString(),
      title: isMovie ? item.title : item.name,
      name: item.name,
      overview: item.overview,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      poster_path: posterUrl,
      backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
      vote_average: item.vote_average,
      vote_count: item.vote_count,
      genre_ids: item.genre_ids,
      media_type: item.media_type,
      adult: item.adult,
      original_language: item.original_language,
      popularity: item.popularity,
      
      // Compatibility fields for components
      image: posterUrl,
      rating: rating,
      genre: genre,
      year: year,
      type: item.media_type,
      category: 'movies',
      
      // Enhanced metadata
      metadata: {
        tmdb_id: item.id,
        popularity: item.popularity
      }
    }
  }

  private async searchOMDb(query: string): Promise<OptimalMovieResult[]> {
    if (!this.omdbApiKey) {
      console.warn('OMDb API key not available')
      return []
    }
    
    try {
      const url = `https://www.omdbapi.com/?apikey=${this.omdbApiKey}&s=${encodeURIComponent(query)}&type=movie`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.Response === 'True' && data.Search) {
        return data.Search.map((item: any) => this.normalizeOMDbResult(item))
      }
      
      return []
    } catch (error) {
      console.error('OMDb search error:', error)
      return []
    }
  }

  private normalizeOMDbResult(item: any): OptimalMovieResult {
    const posterUrl = item.Poster !== 'N/A' ? item.Poster : undefined
    const isTV = item.Type === 'series'
    const year = item.Year ? parseInt(item.Year) : undefined
    
    // Convert IMDb rating to /5 if available
    const rating = item.imdbRating && item.imdbRating !== 'N/A' ? 
      Number((parseFloat(item.imdbRating) / 2).toFixed(1)) : undefined
    
    return {
      id: item.imdbID,
      title: item.Title,
      name: isTV ? item.Title : undefined,
      overview: item.Plot !== 'N/A' ? item.Plot : undefined,
      release_date: item.Year,
      poster_path: posterUrl,
      media_type: isTV ? 'tv' : 'movie',
      
      // Compatibility fields
      image: posterUrl,
      rating: rating,
      genre: item.Genre !== 'N/A' ? item.Genre.split(',')[0].trim() : undefined,
      year: year,
      type: isTV ? 'tv' : 'movie',
      category: 'movies',
      
      // Enhanced metadata
      metadata: {
        imdb_id: item.imdbID,
        popularity: 0 // OMDb doesn't have popularity scores
      },
      
      omdb: item
    }
  }

  private async enrichWithAdditionalData(tmdbResults: OptimalMovieResult[]): Promise<OptimalMovieResult[]> {
    // For now, return TMDb results as-is
    // Future enhancement: enrich TV shows with TVMaze data
    const enriched = await Promise.all(
      tmdbResults.map(async (result) => {
        if (result.media_type === 'tv') {
          // Future: Add TVMaze enrichment here
          return { ...result, tvmaze: null }
        }
        return result
      })
    )
    
    return enriched
  }

  async getTrending(): Promise<OptimalMovieResult[]> {
    try {
      const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${this.tmdbApiKey}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`TMDb trending error: ${response.status}`)
      
      const data = await response.json()
      const results = data.results || []
      
      return results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 10)
        .map((item: any) => this.normalizeTMDbResult(item))
        
    } catch (error) {
      console.error('🎬 [OptimalMovieAPI] Trending fetch failed:', error)
      return []
    }
  }

  async getIMDbId(tmdbId: string, mediaType: 'movie' | 'tv' = 'movie'): Promise<string | null> {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${this.tmdbApiKey}`
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Failed to get external IDs for TMDB ID ${tmdbId}`)
        return null
      }
      
      const data = await response.json()
      return data.imdb_id || null
    } catch (error) {
      console.error('Error fetching IMDb ID:', error)
      return null
    }
  }
}

// Export singleton instance
export const optimalMovieAPI = new OptimalMovieAPI()
export default optimalMovieAPI
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
  
  // Enhanced data
  runtime?: number
  episode_run_time?: number[]
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
  
  // Enriched data from multiple sources
  tvmaze?: any
  omdb?: any
}

class OptimalMovieAPI {
  private tmdbApiKey: string
  private omdbApiKey: string
  
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
        return await this.enrichWithAdditionalData(tmdbResults)
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
    
    return {
      id: item.id.toString(),
      title: isMovie ? item.title : item.name,
      name: item.name,
      overview: item.overview,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
      backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
      vote_average: item.vote_average,
      vote_count: item.vote_count,
      genre_ids: item.genre_ids,
      media_type: item.media_type,
      adult: item.adult,
      original_language: item.original_language,
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
    return {
      id: item.imdbID,
      title: item.Title,
      release_date: item.Year,
      poster_path: item.Poster !== 'N/A' ? item.Poster : undefined,
      media_type: item.Type === 'series' ? 'tv' : 'movie',
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
}

// Export singleton instance
export const optimalMovieAPI = new OptimalMovieAPI()
export default optimalMovieAPI
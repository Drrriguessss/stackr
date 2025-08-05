// src/services/optimalMovieService.ts - New optimal movie/TV search service
import { tmdbService } from './tmdbService'
import { omdbService } from './omdbService'

export interface OptimalMovieResult {
  id: string
  title: string
  year?: number
  type: 'movie' | 'tv'
  image?: string
  overview?: string
  rating?: number
  genre?: string
  director?: string
  category: 'movies'
  metadata?: {
    tmdb_id?: number
    imdb_id?: string
    type?: string
    popularity?: number
  }
}

class OptimalMovieService {
  private readonly TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

  /**
   * Primary search using TMDB (best quality images and data)
   */
  async search(query: string, limit: number = 12): Promise<OptimalMovieResult[]> {
    if (!query || query.trim().length < 2) return []

    try {
      console.log('🎬 [OptimalMovie] Starting TMDB search for:', `"${query}"`)
      
      // Search both movies and TV shows on TMDB
      const [movieResults, tvResults] = await Promise.all([
        tmdbService.searchMovies(query),
        tmdbService.searchTVShows(query)
      ])

      console.log('🎬 [OptimalMovie] TMDB returned:', movieResults.length, 'movies,', tvResults.length, 'TV shows')

      // Convert and combine results
      const allResults: OptimalMovieResult[] = []

      // Process movies
      movieResults.slice(0, limit / 2).forEach(movie => {
        if (movie.title && movie.poster_path) {
          allResults.push({
            id: `tmdb-movie-${movie.id}`,
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            type: 'movie',
            image: this.TMDB_IMAGE_BASE + movie.poster_path,
            overview: movie.overview,
            rating: movie.vote_average ? Number((movie.vote_average / 2).toFixed(1)) : undefined,
            category: 'movies',
            metadata: {
              tmdb_id: movie.id,
              type: 'movie',
              popularity: movie.popularity
            }
          })
        }
      })

      // Process TV shows
      tvResults.slice(0, limit / 2).forEach(tv => {
        if (tv.name && tv.poster_path) {
          allResults.push({
            id: `tmdb-tv-${tv.id}`,
            title: tv.name,
            year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
            type: 'tv',
            image: this.TMDB_IMAGE_BASE + tv.poster_path,
            overview: tv.overview,
            rating: tv.vote_average ? Number((tv.vote_average / 2).toFixed(1)) : undefined,
            category: 'movies',
            metadata: {
              tmdb_id: tv.id,
              type: 'tv',
              popularity: tv.popularity
            }
          })
        }
      })

      // Sort by popularity (TMDB has great popularity scores)
      allResults.sort((a, b) => {
        const popA = a.metadata?.popularity || 0
        const popB = b.metadata?.popularity || 0
        return popB - popA
      })

      console.log('🎬 [OptimalMovie] Final TMDB results:', allResults.length)
      return allResults.slice(0, limit)

    } catch (error) {
      console.error('🎬 [OptimalMovie] TMDB search failed, falling back to OMDB:', error)
      
      // Fallback to OMDB if TMDB fails
      return this.fallbackToOMDB(query, limit)
    }
  }

  /**
   * Fallback search using OMDB when TMDB fails
   */
  private async fallbackToOMDB(query: string, limit: number): Promise<OptimalMovieResult[]> {
    try {
      console.log('🎬 [OptimalMovie] Using OMDB fallback for:', `"${query}"`)
      
      const omdbResults = await omdbService.searchMoviesAndSeries(query, 1)
      
      const convertedResults: OptimalMovieResult[] = []
      
      for (const omdbMovie of omdbResults.slice(0, limit)) {
        // Get detailed info for better data
        const details = await omdbService.getMovieDetails(omdbMovie.imdbID)
        const converted = omdbService.convertToAppFormat(details || omdbMovie)
        
        if (converted.image) {
          convertedResults.push({
            id: converted.id,
            title: converted.title,
            year: converted.year,
            type: converted.type === 'series' ? 'tv' : 'movie',
            image: converted.image,
            overview: converted.overview,
            rating: converted.rating,
            director: converted.director,
            category: 'movies',
            metadata: {
              imdb_id: omdbMovie.imdbID,
              type: converted.type
            }
          })
        }
      }

      console.log('🎬 [OptimalMovie] OMDB fallback results:', convertedResults.length)
      return convertedResults
      
    } catch (error) {
      console.error('🎬 [OptimalMovie] OMDB fallback also failed:', error)
      return []
    }
  }

  /**
   * Get trending movies and TV shows
   */
  async getTrending(): Promise<OptimalMovieResult[]> {
    try {
      const trending = await tmdbService.getTrendingMovies()
      
      return trending.slice(0, 8).map(movie => ({
        id: `tmdb-movie-${movie.id}`,
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        type: 'movie' as const,
        image: movie.poster_path ? this.TMDB_IMAGE_BASE + movie.poster_path : undefined,
        overview: movie.overview,
        rating: movie.vote_average ? Number((movie.vote_average / 2).toFixed(1)) : undefined,
        category: 'movies' as const,
        metadata: {
          tmdb_id: movie.id,
          type: 'movie',
          popularity: movie.popularity
        }
      })).filter(item => item.image) // Only items with images
      
    } catch (error) {
      console.error('🎬 [OptimalMovie] Trending failed:', error)
      return []
    }
  }
}

export const optimalMovieService = new OptimalMovieService()
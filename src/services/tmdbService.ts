import { fetchWithCache } from '@/utils/apiCache'

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

// Types TMDB
export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  release_date: string
  genre_ids: number[]
  adult: boolean
  original_language: string
  popularity: number
  vote_average: number
  vote_count: number
  video: boolean
}

export interface TMDBResponse {
  page: number
  results: TMDBMovie[]
  total_pages: number
  total_results: number
}

export interface TMDBGenre {
  id: number
  name: string
}

// Configuration des tailles d'images
const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original'
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original'
  }
}

// Map des genres pour conversion rapide
const GENRE_MAP: Record<number, string> = {
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
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
}

class TMDBService {
  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const queryParams = new URLSearchParams({
      api_key: TMDB_API_KEY || '',
      language: 'en-US',
      ...params
    })
    return `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`
  }

  // Helpers pour les images
  getImageUrl(path: string | null, type: 'poster' | 'backdrop' = 'poster', size: 'small' | 'medium' | 'large' | 'original' = 'medium'): string | null {
    if (!path) return null
    const imageSize = IMAGE_SIZES[type][size]
    return `${TMDB_IMAGE_BASE}/${imageSize}${path}`
  }

  // Convertir TMDB movie vers notre format
  convertToAppFormat(movie: TMDBMovie): any {
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : new Date().getFullYear()
    const genres = movie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean)
    
    return {
      id: `movie-${movie.id}`,
      title: movie.title,
      year: year,
      image: this.getImageUrl(movie.poster_path, 'poster', 'medium'),
      category: 'movies' as const,
      rating: movie.vote_average / 2, // Convert from 10-scale to 5-scale
      genre: genres[0] || 'Unknown',
      director: 'Unknown Director', // Will be fetched separately if needed
      // Additional TMDB data
      tmdbId: movie.id,
      overview: movie.overview,
      backdrop: this.getImageUrl(movie.backdrop_path, 'backdrop', 'large'),
      popularity: movie.popularity,
      voteCount: movie.vote_count,
      releaseDate: movie.release_date
    }
  }

  // 🔥 Trending Movies
  async getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<any[]> {
    try {
      const url = this.buildUrl(`/trending/movie/${timeWindow}`)
      const cacheKey = `tmdb-trending-${timeWindow}`
      
      console.log('🎬 [TMDB] Fetching trending movies:', timeWindow)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching trending movies:', error)
      return []
    }
  }

  // 🌟 Popular Movies
  async getPopularMovies(page: number = 1): Promise<any[]> {
    try {
      const url = this.buildUrl('/movie/popular', { page })
      const cacheKey = `tmdb-popular-${page}`
      
      console.log('🎬 [TMDB] Fetching popular movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching popular movies:', error)
      return []
    }
  }

  // ⭐ Top Rated Movies
  async getTopRatedMovies(page: number = 1): Promise<any[]> {
    try {
      const url = this.buildUrl('/movie/top_rated', { page })
      const cacheKey = `tmdb-top-rated-${page}`
      
      console.log('🎬 [TMDB] Fetching top rated movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching top rated movies:', error)
      return []
    }
  }

  // 🎬 Now Playing (In Theaters)
  async getNowPlayingMovies(page: number = 1): Promise<any[]> {
    try {
      const url = this.buildUrl('/movie/now_playing', { page })
      const cacheKey = `tmdb-now-playing-${page}`
      
      console.log('🎬 [TMDB] Fetching now playing movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching now playing movies:', error)
      return []
    }
  }

  // 🔜 Upcoming Movies
  async getUpcomingMovies(page: number = 1): Promise<any[]> {
    try {
      const url = this.buildUrl('/movie/upcoming', { page })
      const cacheKey = `tmdb-upcoming-${page}`
      
      console.log('🎬 [TMDB] Fetching upcoming movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching upcoming movies:', error)
      return []
    }
  }

  // 🔍 Discover Movies with Advanced Filters
  async discoverMovies(params: {
    sortBy?: string
    withGenres?: string
    primaryReleaseYear?: number
    'vote_average.gte'?: number
    page?: number
  } = {}): Promise<any[]> {
    try {
      const url = this.buildUrl('/discover/movie', {
        sort_by: params.sortBy || 'popularity.desc',
        ...params
      })
      const cacheKey = `tmdb-discover-${JSON.stringify(params)}`
      
      console.log('🎬 [TMDB] Discovering movies with params:', params)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error discovering movies:', error)
      return []
    }
  }

  // 🎭 Get Movie Genres
  async getMovieGenres(): Promise<TMDBGenre[]> {
    try {
      const url = this.buildUrl('/genre/movie/list')
      const cacheKey = 'tmdb-genres'
      
      const response = await fetchWithCache(url, cacheKey)
      return response.genres
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching genres:', error)
      return []
    }
  }

  // 📊 Get Movie Details (for additional info if needed)
  async getMovieDetails(movieId: number): Promise<any | null> {
    try {
      const url = this.buildUrl(`/movie/${movieId}`, {
        append_to_response: 'credits,videos,similar'
      })
      const cacheKey = `tmdb-movie-${movieId}`
      
      console.log('🎬 [TMDB] Fetching movie details:', movieId)
      const movie = await fetchWithCache(url, cacheKey)
      
      // Extract director from credits
      const director = movie.credits?.crew?.find((person: any) => person.job === 'Director')?.name || 'Unknown Director'
      
      const converted = this.convertToAppFormat(movie)
      return {
        ...converted,
        director,
        genres: movie.genres?.map((g: TMDBGenre) => g.name) || [],
        runtime: movie.runtime,
        budget: movie.budget,
        revenue: movie.revenue,
        tagline: movie.tagline,
        homepage: movie.homepage,
        imdb_id: movie.imdb_id,
        videos: movie.videos?.results || [],
        similar: movie.similar?.results?.slice(0, 6).map((m: TMDBMovie) => this.convertToAppFormat(m)) || []
      }
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching movie details:', error)
      return null
    }
  }
}

// Export singleton instance
export const tmdbService = new TMDBService()

// Export types
export type { TMDBMovie, TMDBResponse, TMDBGenre }
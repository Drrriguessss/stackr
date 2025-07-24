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
  
  // 🌟 4 Films quotidiens pour Hero Carousel
  async getDailyHeroMovies(): Promise<any[]> {
    try {
      console.log('🌟 [TMDB] Fetching daily hero movies (4 per day rotation)...')
      
      if (!TMDB_API_KEY) {
        console.warn('🚨 TMDB API key not configured, using fallback movies')
        return this.getFallbackHeroMovies()
      }
      
      const currentYear = new Date().getFullYear()
      
      // Combiner plusieurs sources pour diversité
      const [recentMovies, popularMovies, topRatedMovies] = await Promise.all([
        // Films récents 2024+
        fetchWithCache(
          this.buildUrl('/discover/movie', {
            'primary_release_date.gte': '2024-01-01',
            'vote_average.gte': 7.0,
            'vote_count.gte': 100,
            sort_by: 'popularity.desc',
            page: 1
          }),
          'tmdb-hero-recent',
          30
        ),
        // Films populaires actuels
        fetchWithCache(
          this.buildUrl('/movie/popular', { page: 1 }),
          'tmdb-hero-popular',
          30
        ),
        // Classiques bien notés
        fetchWithCache(
          this.buildUrl('/discover/movie', {
            'primary_release_date.lte': '2023-12-31',
            'primary_release_date.gte': '1990-01-01',
            'vote_average.gte': 8.0,
            'vote_count.gte': 1000,
            sort_by: 'vote_average.desc',
            page: 1
          }),
          'tmdb-hero-classics',
          30
        )
      ])
      
      // Combiner et filtrer
      const allMovies = [
        ...(recentMovies.results || []),
        ...(popularMovies.results || []),
        ...(topRatedMovies.results || [])
      ]
      
      const qualityMovies = allMovies
        .filter(movie => {
          const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0
          const rating = movie.vote_average || 0
          const voteCount = movie.vote_count || 0
          
          // Films récents (2024+) OU classiques excellents (8.0+)
          const isRecentOrClassic = (releaseYear >= 2024) || (rating >= 8.0 && releaseYear >= 1990)
          
          // Score décent et popularité minimum
          const hasDecentScore = rating >= 7.0 && voteCount >= 100
          
          // Doit avoir un poster
          const hasPoster = movie.poster_path
          
          return isRecentOrClassic && hasDecentScore && hasPoster && !movie.adult
        })
        .map(movie => this.convertToAppFormat(movie))
      
      // Déduplication par titre
      const uniqueMovies = this.deduplicateMovies(qualityMovies)
      
      // Sélection quotidienne déterministe
      const dailySelection = this.selectDailyMovies(uniqueMovies, 4)
      
      console.log(`🌟 [TMDB] Selected daily hero movies:`, dailySelection.map(m => `${m.title} (${m.year})`))
      
      return dailySelection.length >= 4 ? dailySelection : this.getFallbackHeroMovies()
      
    } catch (error) {
      console.error('🌟 [TMDB] Error fetching daily hero movies:', error)
      return this.getFallbackHeroMovies()
    }
  }

  // Sélection quotidienne déterministe basée sur la date
  private selectDailyMovies(movies: any[], count: number): any[] {
    if (movies.length < count) return movies
    
    // Utiliser la date comme seed pour avoir les mêmes films toute la journée
    const today = new Date()
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    const seed = this.hashString(dateString)
    
    // Mélanger de façon déterministe
    const shuffled = [...movies]
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

  // Déduplication des films par titre similaire
  private deduplicateMovies(movies: any[]): any[] {
    const seen = new Set<string>()
    return movies.filter(movie => {
      const cleanTitle = movie.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seen.has(cleanTitle)) {
        return false
      }
      seen.add(cleanTitle)
      return true
    })
  }

  // Fallback : 4 films premium sélectionnés
  private getFallbackHeroMovies(): any[] {
    const fallbackMovies = [
      {
        id: 'movie-tmdb-hero-1',
        title: 'Oppenheimer',
        year: 2023,
        image: 'https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        category: 'movies' as const,
        rating: 4.4,
        genre: 'Biography',
        director: 'Christopher Nolan',
        description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.'
      },
      {
        id: 'movie-tmdb-hero-2',
        title: 'Dune: Part Two',
        year: 2024,
        image: 'https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        category: 'movies' as const,
        rating: 4.3,
        genre: 'Science Fiction',
        director: 'Denis Villeneuve',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.'
      },
      {
        id: 'movie-tmdb-hero-3',
        title: 'The Godfather',
        year: 1972,
        image: 'https://image.tmdb.org/t/p/w342/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        category: 'movies' as const,
        rating: 4.7,
        genre: 'Crime',
        director: 'Francis Ford Coppola',
        description: 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.'
      },
      {
        id: 'movie-tmdb-hero-4',
        title: 'Pulp Fiction',
        year: 1994,
        image: 'https://image.tmdb.org/t/p/w342/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        category: 'movies' as const,
        rating: 4.6,
        genre: 'Crime',
        director: 'Quentin Tarantino',
        description: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.'
      }
    ]

    // Appliquer la même logique de sélection quotidienne
    return this.selectDailyMovies(fallbackMovies, 4)
  }

  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    // Vérifier si la clé API est disponible
    if (!TMDB_API_KEY) {
      console.warn('🚨 TMDB API key is not configured. Using mock data fallback.')
      return '' // Return empty string to trigger fallback in calling methods
    }
    
    const queryParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
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
      // Si pas de clé API, retourner des données mockées
      if (!TMDB_API_KEY) {
        console.warn('🎬 [TMDB] Using mock data - API key not configured')
        return this.getMockTrendingMovies()
      }
      
      const url = this.buildUrl(`/trending/movie/${timeWindow}`)
      if (!url) {
        return this.getMockTrendingMovies()
      }
      
      const cacheKey = `tmdb-trending-${timeWindow}`
      
      console.log('🎬 [TMDB] Fetching trending movies:', timeWindow)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching trending movies:', error)
      return this.getMockTrendingMovies()
    }
  }

  // 🌟 Popular Movies
  async getPopularMovies(page: number = 1): Promise<any[]> {
    try {
      if (!TMDB_API_KEY) {
        console.warn('🎬 [TMDB] Using mock data - API key not configured')
        return this.getMockPopularMovies()
      }
      
      const url = this.buildUrl('/movie/popular', { page })
      if (!url) {
        return this.getMockPopularMovies()
      }
      
      const cacheKey = `tmdb-popular-${page}`
      
      console.log('🎬 [TMDB] Fetching popular movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching popular movies:', error)
      return this.getMockPopularMovies()
    }
  }

  // ⭐ Top Rated Movies
  async getTopRatedMovies(page: number = 1): Promise<any[]> {
    try {
      if (!TMDB_API_KEY) {
        return this.getMockPopularMovies()
      }
      
      const url = this.buildUrl('/movie/top_rated', { page })
      if (!url) {
        return this.getMockPopularMovies()
      }
      
      const cacheKey = `tmdb-top-rated-${page}`
      
      console.log('🎬 [TMDB] Fetching top rated movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching top rated movies:', error)
      return this.getMockPopularMovies()
    }
  }

  // 🎬 Now Playing (In Theaters)
  async getNowPlayingMovies(page: number = 1): Promise<any[]> {
    try {
      if (!TMDB_API_KEY) {
        return this.getMockPopularMovies()
      }
      
      const url = this.buildUrl('/movie/now_playing', { page })
      if (!url) {
        return this.getMockPopularMovies()
      }
      
      const cacheKey = `tmdb-now-playing-${page}`
      
      console.log('🎬 [TMDB] Fetching now playing movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching now playing movies:', error)
      return this.getMockPopularMovies()
    }
  }

  // 🔜 Upcoming Movies
  async getUpcomingMovies(page: number = 1): Promise<any[]> {
    try {
      if (!TMDB_API_KEY) {
        return this.getMockPopularMovies()
      }
      
      const url = this.buildUrl('/movie/upcoming', { page })
      if (!url) {
        return this.getMockPopularMovies()
      }
      
      const cacheKey = `tmdb-upcoming-${page}`
      
      console.log('🎬 [TMDB] Fetching upcoming movies, page:', page)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error fetching upcoming movies:', error)
      return this.getMockPopularMovies()
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
      if (!TMDB_API_KEY) {
        return this.getMockPopularMovies()
      }
      
      const url = this.buildUrl('/discover/movie', {
        sort_by: params.sortBy || 'popularity.desc',
        ...params
      })
      if (!url) {
        return this.getMockPopularMovies()
      }
      
      const cacheKey = `tmdb-discover-${JSON.stringify(params)}`
      
      console.log('🎬 [TMDB] Discovering movies with params:', params)
      const response = await fetchWithCache(url, cacheKey)
      
      return response.results.map((movie: TMDBMovie) => this.convertToAppFormat(movie))
    } catch (error) {
      console.error('🎬 [TMDB] Error discovering movies:', error)
      return this.getMockPopularMovies()
    }
  }

  // 🎭 Get Movie Genres
  async getMovieGenres(): Promise<TMDBGenre[]> {
    try {
      if (!TMDB_API_KEY) {
        return []
      }
      
      const url = this.buildUrl('/genre/movie/list')
      if (!url) {
        return []
      }
      
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
      if (!TMDB_API_KEY) {
        return null
      }
      
      const url = this.buildUrl(`/movie/${movieId}`, {
        append_to_response: 'credits,videos,similar'
      })
      if (!url) {
        return null
      }
      
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
  // 🎭 Mock Data Methods (fallback when API key not available)
  private getMockTrendingMovies(): any[] {
    return [
      {
        id: 'movie-872585',
        title: 'Oppenheimer',
        year: 2023,
        image: 'https://m.media-amazon.com/images/M/MV5BMDBkYzU0MjUtYzBhNi00ODk0LWFkMDgtNjBmZGM2YTNhZmJjXkEyXkFqcGc@._V1_SX300.jpg',
        category: 'movies' as const,
        rating: 4.1,
        genre: 'Biography',
        director: 'Christopher Nolan',
        overview: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        backdrop: null,
        popularity: 95.5,
        voteCount: 5432,
        releaseDate: '2023-07-21'
      },
      {
        id: 'movie-76600',
        title: 'Avatar: The Way of Water',
        year: 2022,
        image: 'https://m.media-amazon.com/images/M/MV5BMmE0YjI2NjYtOWVjZi00ZGNiLThhNTctOTlkN2JiODVlNzAzXkEyXkFqcGc@._V1_SX300.jpg',
        category: 'movies' as const,
        rating: 3.8,
        genre: 'Action',
        director: 'James Cameron',
        overview: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.',
        backdrop: null,
        popularity: 89.2,
        voteCount: 4321,
        releaseDate: '2022-12-16'
      },
      {
        id: 'movie-385687',
        title: 'Fast X',
        year: 2023,
        image: 'https://m.media-amazon.com/images/M/MV5BNzZmOTU1ZTEtYzVhNi00NzQxLWI5ZjAtNWNhNjEwY2E3YmZjXkEyXkFqcGc@._V1_SX300.jpg',
        category: 'movies' as const,
        rating: 2.9,
        genre: 'Action',
        director: 'Louis Leterrier',
        overview: 'Dom Toretto and his family are targeted by the vengeful son of drug kingpin Hernan Reyes.',
        backdrop: null,
        popularity: 82.7,
        voteCount: 3890,
        releaseDate: '2023-05-19'
      }
    ]
  }

  private getMockPopularMovies(): any[] {
    return this.getMockTrendingMovies() // Réutiliser les mêmes données
  }
}

// Export singleton instance
export const tmdbService = new TMDBService()

// Export types
export type { TMDBMovie, TMDBResponse, TMDBGenre }
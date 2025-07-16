// Service pour l'API OMDB (plus simple que TMDB)
export interface OMDBMovie {
  imdbID: string
  Title: string
  Year: string
  Type: string
  Poster: string
  Plot?: string
  Director?: string
  Genre?: string
  imdbRating?: string
  Runtime?: string
  Released?: string
  Actors?: string
  Language?: string
  Country?: string
  Awards?: string
  Response?: string  // Ajout de la propriété Response
  Error?: string     // Ajout de la propriété Error
}

export interface OMDBSearchResponse {
  Search: OMDBMovie[]
  totalResults: string
  Response: string
  Error?: string
}

class OMDBService {
  private readonly apiKey = '649f9a63' // Votre clé OMDB fonctionnelle
  private readonly baseURL = 'https://www.omdbapi.com'
  
  // Rechercher des films
  async searchMovies(query: string, page: number = 1): Promise<OMDBMovie[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/?apikey=${this.apiKey}&s=${encodeURIComponent(query)}&type=movie&page=${page}`
      )
      
      if (!response.ok) {
        throw new Error(`OMDB API Error: ${response.status}`)
      }
      
      const data: OMDBSearchResponse = await response.json()
      
      if (data.Response === 'False') {
        throw new Error(data.Error || 'No movies found')
      }
      
      return data.Search || []
    } catch (error) {
      console.error('Error searching movies:', error)
      throw error
    }
  }

  // Obtenir les détails d'un film
  async getMovieDetails(imdbId: string): Promise<OMDBMovie | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/?apikey=${this.apiKey}&i=${imdbId}&plot=full`
      )
      
      if (!response.ok) {
        throw new Error(`OMDB API Error: ${response.status}`)
      }
      
      const movie: OMDBMovie = await response.json()
      
      if (movie.Response === 'False') {
        return null
      }
      
      return movie
    } catch (error) {
      console.error('Error fetching movie details:', error)
      return null
    }
  }

  // Obtenir des films populaires (simulation avec des films connus)
  async getPopularMovies(): Promise<OMDBMovie[]> {
    const popularMovieIds = [
      'tt0111161', // The Shawshank Redemption
      'tt0068646', // The Godfather
      'tt0468569', // The Dark Knight
      'tt0071562', // The Godfather Part II
      'tt0050083', // 12 Angry Men
      'tt0108052', // Schindler's List
      'tt0167260', // The Lord of the Rings: The Return of the King
      'tt0110912'  // Pulp Fiction
    ]

    try {
      const moviePromises = popularMovieIds.map(id => this.getMovieDetails(id))
      const movies = await Promise.all(moviePromises)
      return movies.filter(movie => movie !== null) as OMDBMovie[]
    } catch (error) {
      console.error('Error fetching popular movies:', error)
      return []
    }
  }

  // Obtenir les films les mieux notés
  async getTopRatedMovies(): Promise<OMDBMovie[]> {
    const topRatedIds = [
      'tt0111161', // The Shawshank Redemption
      'tt0068646', // The Godfather
      'tt0071562', // The Godfather Part II
      'tt0468569', // The Dark Knight
      'tt0050083', // 12 Angry Men
      'tt0108052', // Schindler's List
      'tt0167260', // The Lord of the Rings: The Return of the King
      'tt0110912'  // Pulp Fiction
    ]

    try {
      const moviePromises = topRatedIds.map(id => this.getMovieDetails(id))
      const movies = await Promise.all(moviePromises)
      return movies.filter(movie => movie !== null) as OMDBMovie[]
    } catch (error) {
      console.error('Error fetching top rated movies:', error)
      return []
    }
  }

  // Obtenir des films récents (simulation)
  async getRecentMovies(): Promise<OMDBMovie[]> {
    const recentMovieIds = [
      'tt6751668', // Parasite
      'tt7286456', // Joker
      'tt8503618', // Hamilton
      'tt1950186', // Ford v Ferrari
      'tt0816692', // Interstellar
      'tt4154756', // Avengers: Endgame
      'tt4633694', // Spider-Man: Into the Spider-Verse
      'tt2380307'  // Coco
    ]

    try {
      const moviePromises = recentMovieIds.map(id => this.getMovieDetails(id))
      const movies = await Promise.all(moviePromises)
      return movies.filter(movie => movie !== null) as OMDBMovie[]
    } catch (error) {
      console.error('Error fetching recent movies:', error)
      return []
    }
  }

  // Convertir un film OMDB vers le format de l'app
  convertToAppFormat(movie: OMDBMovie): any {
    return {
      id: `movie-${movie.imdbID}`,
      title: movie.Title,
      director: movie.Director || 'Unknown Director',
      year: parseInt(movie.Year) || new Date().getFullYear(),
      rating: movie.imdbRating ? Number((parseFloat(movie.imdbRating) / 2).toFixed(1)) : 0, // Convertir de /10 à /5
      genre: movie.Genre?.split(',')[0]?.trim() || 'Unknown',
      category: 'movies' as const,
      image: movie.Poster !== 'N/A' ? movie.Poster : undefined,
      overview: movie.Plot,
      runtime: movie.Runtime,
      released: movie.Released,
      actors: movie.Actors,
      language: movie.Language,
      country: movie.Country,
      awards: movie.Awards
    }
  }
}

// Instance singleton
export const omdbService = new OMDBService()

// Fonctions utilitaires
export const formatRuntime = (runtime: string): string => {
  if (!runtime || runtime === 'N/A') return 'N/A'
  return runtime
}

export const formatRating = (rating: string): number => {
  if (!rating || rating === 'N/A') return 0
  return Number((parseFloat(rating) / 2).toFixed(1))
}
// src/services/omdbService.ts - VERSION CORRIGÉE POUR DIRECTEURS
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
  Response?: string
  Error?: string
  totalSeasons?: string
  Seasons?: string
}

export interface OMDBSearchResponse {
  Search: OMDBMovie[]
  totalResults: string
  Response: string
  Error?: string
}

class OMDBService {
  private readonly apiKey = '649f9a63'
  private readonly baseURL = 'https://www.omdbapi.com'

  /**
   * ✅ FONCTION CORRIGÉE : Obtenir le vrai directeur
   */
  private getCorrectDirector(movie: OMDBMovie): string {
    console.log('🎬 Getting director for:', movie.Title)
    console.log('🎬 Raw director:', movie.Director)

    // 1. Directeur de l'API
    if (movie.Director && movie.Director !== 'N/A' && movie.Director.trim() !== '') {
      console.log('🎬 ✅ Found director from API:', movie.Director)
      return movie.Director
    }

    // 2. Mapping manuel pour les films/réalisateurs connus
    const titleLower = movie.Title.toLowerCase()
    const mappings: { [key: string]: string } = {
      // Films Christopher Nolan
      "inception": "Christopher Nolan",
      "interstellar": "Christopher Nolan", 
      "the dark knight": "Christopher Nolan",
      "dunkirk": "Christopher Nolan",
      "tenet": "Christopher Nolan",
      "oppenheimer": "Christopher Nolan",
      
      // Films Quentin Tarantino
      "pulp fiction": "Quentin Tarantino",
      "kill bill": "Quentin Tarantino",
      "django unchained": "Quentin Tarantino",
      "once upon a time in hollywood": "Quentin Tarantino",
      
      // Films Marvel/MCU
      "avengers: endgame": "Anthony Russo, Joe Russo",
      "avengers: infinity war": "Anthony Russo, Joe Russo",
      "spider-man: no way home": "Jon Watts",
      "black panther": "Ryan Coogler",
      "guardians of the galaxy": "James Gunn",
      
      // Films populaires récents
      "dune": "Denis Villeneuve",
      "blade runner 2049": "Denis Villeneuve",
      "the batman": "Matt Reeves",
      "top gun: maverick": "Joseph Kosinski",
      "everything everywhere all at once": "Daniels",
      "avatar: the way of water": "James Cameron",
      
      // Séries TV populaires
      "breaking bad": "Vince Gilligan (Creator)",
      "game of thrones": "David Benioff, D.B. Weiss (Creators)",
      "stranger things": "The Duffer Brothers (Creators)",
      "the office": "Greg Daniels (Creator)",
      "friends": "David Crane, Marta Kauffman (Creators)",
      "house of cards": "Beau Willimon (Creator)",
      
      // Films classiques
      "the godfather": "Francis Ford Coppola",
      "the shawshank redemption": "Frank Darabont",
      "schindler's list": "Steven Spielberg",
      "casablanca": "Michael Curtiz",
      "citizen kane": "Orson Welles"
    }

    // Chercher correspondances exactes puis partielles
    for (const [keyword, director] of Object.entries(mappings)) {
      if (titleLower.includes(keyword) || titleLower === keyword) {
        console.log('🎬 📋 Found director via mapping:', director, 'for keyword:', keyword)
        return director
      }
    }

    // 3. Pour les séries, essayer de deviner le type
    if (movie.Type === 'series') {
      console.log('🎬 ⚠️ Series without director info, using fallback')
      return "TV Series Creator"
    }

    console.log('🎬 ❌ No director found, using fallback')
    return "Director" // ✅ Éviter "Unknown Director"
  }

  /**
   * ✅ FONCTION SIMPLE POUR DÉTECTER LES JEUX VIDÉO
   */
  private isVideoGame(item: OMDBMovie): boolean {
    const title = (item.Title || '').toLowerCase()
    
    const gameList = [
      'assassin\'s creed origins',
      'assassin\'s creed odyssey', 
      'assassin\'s creed valhalla',
      'assassin\'s creed brotherhood',
      'assassin\'s creed revelations',
      'assassin\'s creed unity',
      'assassin\'s creed syndicate'
    ]
    
    for (let i = 0; i < gameList.length; i++) {
      if (title.includes(gameList[i])) {
        return true
      }
    }
    
    return false
  }

  /**
   * ✅ VALIDATION SIMPLE
   */
  private isValidMovieOrSeries(item: OMDBMovie): boolean {
    if (!item.Type) return false
    if (item.Type !== 'movie' && item.Type !== 'series') return false
    if (this.isVideoGame(item)) return false
    if (!item.Year || !item.Title) return false
    
    return true
  }

  /**
   * ✅ RECHERCHE SIMPLIFIÉE
   */
  private async performSearch(query: string, page: number = 1): Promise<OMDBMovie[]> {
    try {
      const url = `${this.baseURL}/?apikey=${this.apiKey}&s=${encodeURIComponent(query)}&page=${page}`
      
      const response = await fetch(url)
      if (!response.ok) return []
      
      const data: OMDBSearchResponse = await response.json()
      if (data.Response === 'False' || !data.Search) return []
      
      const filtered: OMDBMovie[] = []
      for (let i = 0; i < data.Search.length; i++) {
        const item = data.Search[i]
        if (this.isValidMovieOrSeries(item)) {
          filtered.push(item)
        }
      }
      
      return filtered
      
    } catch (error) {
      console.error('Search error:', error)
      return []
    }
  }

  /**
   * ✅ RECHERCHE PRINCIPALE
   */
  async searchMoviesAndSeries(query: string, page: number = 1): Promise<OMDBMovie[]> {
    try {
      if (!query) return []
      
      const results = await this.performSearch(query, page)
      
      results.sort((a, b) => {
        const yearA = parseInt(a.Year) || 0
        const yearB = parseInt(b.Year) || 0
        return yearB - yearA
      })
      
      return results.slice(0, 10)
      
    } catch (error) {
      console.error('Search movies and series error:', error)
      return []
    }
  }

  async searchMovies(query: string, page: number = 1): Promise<OMDBMovie[]> {
    try {
      const results = await this.searchMoviesAndSeries(query, page)
      const movies: OMDBMovie[] = []
      
      for (let i = 0; i < results.length; i++) {
        if (results[i].Type === 'movie') {
          movies.push(results[i])
        }
      }
      
      return movies
    } catch (error) {
      return []
    }
  }

  async searchSeries(query: string, page: number = 1): Promise<OMDBMovie[]> {
    try {
      const results = await this.searchMoviesAndSeries(query, page)
      const series: OMDBMovie[] = []
      
      for (let i = 0; i < results.length; i++) {
        if (results[i].Type === 'series') {
          series.push(results[i])
        }
      }
      
      return series
    } catch (error) {
      return []
    }
  }

  async getMovieDetails(imdbId: string): Promise<OMDBMovie | null> {
    try {
      if (!imdbId) return null
      
      const response = await fetch(`${this.baseURL}/?apikey=${this.apiKey}&i=${imdbId}&plot=full`)
      if (!response.ok) return null
      
      const movie: OMDBMovie = await response.json()
      if (movie.Response === 'False') return null
      
      return movie
    } catch (error) {
      return null
    }
  }

  async getPopularMovies(): Promise<OMDBMovie[]> {
    const ids = [
      'tt0111161', 'tt0068646', 'tt0468569', 'tt0071562',
      'tt0050083', 'tt0108052', 'tt0167260', 'tt0110912'
    ]

    const movies: OMDBMovie[] = []
    
    for (let i = 0; i < ids.length; i++) {
      try {
        const movie = await this.getMovieDetails(ids[i])
        if (movie) movies.push(movie)
      } catch (error) {
        console.warn(`Error fetching movie ${ids[i]}`)
      }
    }
    
    return movies
  }

  async getPopularSeries(): Promise<OMDBMovie[]> {
    const ids = [
      'tt0944947', 'tt0903747', 'tt2356777', 'tt1475582',
      'tt0141842', 'tt2395695', 'tt4574334', 'tt0386676'
    ]

    const series: OMDBMovie[] = []
    
    for (let i = 0; i < ids.length; i++) {
      try {
        const show = await this.getMovieDetails(ids[i])
        if (show) series.push(show)
      } catch (error) {
        console.warn(`Error fetching series ${ids[i]}`)
      }
    }
    
    return series
  }

  async getPopularMoviesAndSeries(): Promise<OMDBMovie[]> {
    try {
      const movies = await this.getPopularMovies()
      const series = await this.getPopularSeries()
      
      const combined: OMDBMovie[] = []
      combined.push(...movies.slice(0, 4))
      combined.push(...series.slice(0, 4))
      
      return this.shuffleArray(combined)
    } catch (error) {
      return []
    }
  }

  async getTopRatedMovies(): Promise<OMDBMovie[]> {
    return this.getPopularMovies()
  }

  async getRecentMovies(): Promise<OMDBMovie[]> {
    const ids = [
      'tt6751668', 'tt7286456', 'tt1950186', 'tt4154756',
      'tt4633694', 'tt4574334', 'tt2380307', 'tt8503618'
    ]

    const items: OMDBMovie[] = []
    
    for (let i = 0; i < ids.length; i++) {
      try {
        const item = await this.getMovieDetails(ids[i])
        if (item) items.push(item)
      } catch (error) {
        console.warn(`Error fetching recent item ${ids[i]}`)
      }
    }
    
    return items
  }

  async searchRecentContent(query: string): Promise<OMDBMovie[]> {
    const currentYear = new Date().getFullYear()
    const years = [currentYear, currentYear - 1, currentYear - 2]
    
    const allResults: OMDBMovie[] = []
    
    for (let i = 0; i < years.length; i++) {
      try {
        const yearResults = await this.performSearch(`${query} ${years[i]}`)
        allResults.push(...yearResults)
      } catch (error) {
        console.warn(`Error searching ${query} ${years[i]}`)
      }
    }
    
    const unique: OMDBMovie[] = []
    const seen: string[] = []
    
    for (let i = 0; i < allResults.length; i++) {
      const movie = allResults[i]
      if (!seen.includes(movie.imdbID)) {
        seen.push(movie.imdbID)
        unique.push(movie)
      }
    }
    
    return unique
  }

  /**
   * ✅ CONVERSION AU FORMAT APP AVEC DIRECTEUR CORRECT
   */
  convertToAppFormat(item: OMDBMovie): any {
    const isMovie = item.Type === 'movie'
    const isSeries = item.Type === 'series'
    const director = this.getCorrectDirector(item) // ✅ UTILISE LA FONCTION CORRIGÉE
    
    console.log('🎬 Converting movie/series:', item.Title, 'Director:', director)
    
    return {
      id: `movie-${item.imdbID}`,
      title: item.Title || 'Unknown Title',
      director: director,  // ✅ UTILISÉ directement
      author: director,    // ✅ UTILISÉ pour compatibilité
      year: parseInt(item.Year) || new Date().getFullYear(),
      rating: item.imdbRating ? Number((parseFloat(item.imdbRating) / 2).toFixed(1)) : 0,
      genre: item.Genre ? item.Genre.split(',')[0].trim() : 'Unknown',
      category: 'movies' as const,
      image: (item.Poster !== 'N/A') ? item.Poster : undefined,
      overview: item.Plot,
      runtime: item.Runtime,
      released: item.Released,
      actors: item.Actors,
      language: item.Language,
      country: item.Country,
      awards: item.Awards,
      type: item.Type,
      isMovie,
      isSeries,
      totalSeasons: item.totalSeasons ? parseInt(item.totalSeasons) : undefined,
      displayTitle: isSeries ? `${item.Title} (TV Series)` : item.Title
    }
  }

  /**
   * ✅ MÉLANGER ARRAY - VERSION ULTRA SIMPLE
   */
  private shuffleArray<T>(array: T[]): T[] {
    if (!array || array.length === 0) return []
    
    const result = [...array]
    
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = result[i]
      result[i] = result[j]
      result[j] = temp
    }
    
    return result
  }
}

export const omdbService = new OMDBService()

export const formatRuntime = (runtime: string): string => {
  if (!runtime || runtime === 'N/A') return 'N/A'
  return runtime
}

export const formatRating = (rating: string): number => {
  if (!rating || rating === 'N/A') return 0
  const num = parseFloat(rating)
  if (isNaN(num)) return 0
  return Number((num / 2).toFixed(1))
}

export const getContentTypeLabel = (type: string): string => {
  if (type === 'movie') return 'Film'
  if (type === 'series') return 'Série TV'
  return 'Contenu'
}
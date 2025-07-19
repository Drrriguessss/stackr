// Service pour l'API OMDB (films + séries) - VERSION COMPLÈTE AMÉLIORÉE
export interface OMDBMovie {
  imdbID: string
  Title: string
  Year: string
  Type: string // 'movie' ou 'series'
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
  // Champs spécifiques aux séries
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
  
  // Recherche privée avec gestion d'erreurs
  private async performSearch(query: string, page: number = 1, type?: 'movie' | 'series'): Promise<OMDBMovie[]> {
    try {
      let url = `${this.baseURL}/?apikey=${this.apiKey}&s=${encodeURIComponent(query)}&page=${page}`
      if (type) {
        url += `&type=${type}`
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`OMDB API Error: ${response.status}`)
      }
      
      const data: OMDBSearchResponse = await response.json()
      
      if (data.Response === 'False') {
        return [] // Retourner un array vide au lieu d'une erreur
      }
      
      return data.Search || []
    } catch (error) {
      console.warn(`OMDB search failed for "${query}":`, error)
      return []
    }
  }

  // Rechercher des films ET séries avec stratégies multiples
  async searchMoviesAndSeries(query: string, page: number = 1): Promise<OMDBMovie[]> {
    try {
      const allResults: OMDBMovie[] = []
      
      // Stratégie 1: Recherche normale (films + séries)
      const normalResults = await this.performSearch(query, page)
      allResults.push(...normalResults)
      
      // Stratégie 2: Si peu de résultats, essayer avec des années
      if (allResults.length < 5) {
        const currentYear = new Date().getFullYear()
        const nextYear = currentYear + 1
        const lastYear = currentYear - 1
        
        // Essayer avec l'année courante
        const currentYearResults = await this.performSearch(`${query} ${currentYear}`, page)
        allResults.push(...currentYearResults)
        
        // Essayer avec l'année suivante (films à venir)
        const nextYearResults = await this.performSearch(`${query} ${nextYear}`, page)
        allResults.push(...nextYearResults)
        
        // Essayer avec l'année précédente
        const lastYearResults = await this.performSearch(`${query} ${lastYear}`, page)
        allResults.push(...lastYearResults)
      }
      
      // Stratégie 3: Recherche avec variations du titre
      if (allResults.length < 3) {
        const variations = [
          `${query} movie`,
          `${query} film`,
          `${query} series`,
          query.replace(/\s+/g, '') // Sans espaces
        ]
        
        for (const variation of variations) {
          const variationResults = await this.performSearch(variation, page)
          allResults.push(...variationResults)
        }
      }
      
      // Enlever les doublons basés sur imdbID
      const uniqueResults = allResults.filter((movie, index, self) => 
        index === self.findIndex(m => m.imdbID === movie.imdbID)
      )
      
      // Trier par pertinence : titre exact en premier, puis par rating
      return uniqueResults.sort((a, b) => {
        const aExactMatch = a.Title.toLowerCase().includes(query.toLowerCase())
        const bExactMatch = b.Title.toLowerCase().includes(query.toLowerCase())
        
        if (aExactMatch && !bExactMatch) return -1
        if (!aExactMatch && bExactMatch) return 1
        
        // Trier par année (plus récent en premier)
        const aYear = parseInt(a.Year) || 0
        const bYear = parseInt(b.Year) || 0
        
        return bYear - aYear
      })
      
    } catch (error) {
      console.error('Error searching movies and series:', error)
      throw error
    }
  }

  // Rechercher seulement des films (garde l'ancienne méthode pour compatibilité)
  async searchMovies(query: string, page: number = 1): Promise<OMDBMovie[]> {
    return this.performSearch(query, page, 'movie')
  }

  // Rechercher seulement des séries
  async searchSeries(query: string, page: number = 1): Promise<OMDBMovie[]> {
    return this.performSearch(query, page, 'series')
  }

  // Obtenir les détails d'un film ou série
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
      console.error('Error fetching movie/series details:', error)
      return null
    }
  }

  // Obtenir des films populaires
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

  // Obtenir des séries populaires
  async getPopularSeries(): Promise<OMDBMovie[]> {
    const popularSeriesIds = [
      'tt0944947', // Game of Thrones
      'tt0903747', // Breaking Bad
      'tt2356777', // True Detective
      'tt1475582', // Sherlock
      'tt0141842', // The Sopranos
      'tt2395695', // Westworld
      'tt4574334', // Stranger Things
      'tt0386676'  // The Office
    ]

    try {
      const seriesPromises = popularSeriesIds.map(id => this.getMovieDetails(id))
      const series = await Promise.all(seriesPromises)
      return series.filter(series => series !== null) as OMDBMovie[]
    } catch (error) {
      console.error('Error fetching popular series:', error)
      return []
    }
  }

  // Obtenir films + séries populaires combinés
  async getPopularMoviesAndSeries(): Promise<OMDBMovie[]> {
    try {
      const [movies, series] = await Promise.all([
        this.getPopularMovies(),
        this.getPopularSeries()
      ])
      
      // Mélanger films et séries
      const combined = [...movies.slice(0, 4), ...series.slice(0, 4)]
      return this.shuffleArray(combined)
    } catch (error) {
      console.error('Error fetching popular movies and series:', error)
      return []
    }
  }

  // Obtenir les mieux notés (films + quelques séries)
  async getTopRatedMovies(): Promise<OMDBMovie[]> {
    const topRatedIds = [
      'tt0111161', // The Shawshank Redemption
      'tt0068646', // The Godfather
      'tt0071562', // The Godfather Part II
      'tt0468569', // The Dark Knight
      'tt0903747', // Breaking Bad (série)
      'tt0108052', // Schindler's List
      'tt0944947', // Game of Thrones (série)
      'tt0110912'  // Pulp Fiction
    ]

    try {
      const itemPromises = topRatedIds.map(id => this.getMovieDetails(id))
      const items = await Promise.all(itemPromises)
      return items.filter(item => item !== null) as OMDBMovie[]
    } catch (error) {
      console.error('Error fetching top rated content:', error)
      return []
    }
  }

  // Obtenir du contenu récent (plus large)
  async getRecentMovies(): Promise<OMDBMovie[]> {
    const recentIds = [
      'tt6751668', // Parasite
      'tt7286456', // Joker
      'tt1950186', // Ford v Ferrari
      'tt4154756', // Avengers: Endgame
      'tt4633694', // Spider-Man: Into the Spider-Verse
      'tt4574334', // Stranger Things (série récente)
      'tt2380307', // Coco
      'tt8503618'  // Hamilton
    ]

    try {
      const itemPromises = recentIds.map(id => this.getMovieDetails(id))
      const items = await Promise.all(itemPromises)
      return items.filter(item => item !== null) as OMDBMovie[]
    } catch (error) {
      console.error('Error fetching recent content:', error)
      return []
    }
  }

  // Recherche de films récents par terme (pour Superman 2025 par exemple)
  async searchRecentContent(query: string): Promise<OMDBMovie[]> {
    const currentYear = new Date().getFullYear()
    const years = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]
    
    const allResults: OMDBMovie[] = []
    
    for (const year of years) {
      const yearResults = await this.performSearch(`${query} ${year}`)
      allResults.push(...yearResults)
    }
    
    // Enlever doublons et trier par année
    const uniqueResults = allResults.filter((movie, index, self) => 
      index === self.findIndex(m => m.imdbID === movie.imdbID)
    )
    
    return uniqueResults.sort((a, b) => {
      const aYear = parseInt(a.Year) || 0
      const bYear = parseInt(b.Year) || 0
      return bYear - aYear // Plus récent en premier
    })
  }

  // ✅ CONVERTIR UN FILM/SÉRIE OMDB VERS LE FORMAT DE L'APP - CORRIGÉ
  convertToAppFormat(item: OMDBMovie): any {
    const isMovie = item.Type === 'movie'
    const isSeries = item.Type === 'series'
    const director = item.Director && item.Director !== 'N/A' ? item.Director : 'Unknown Director'
    
    return {
      id: `movie-${item.imdbID}`,
      title: item.Title,
      director: director,          // ✅ Propriété spécifique aux films
      author: director,            // ✅ Pour compatibilité avec getCreator
      year: parseInt(item.Year) || new Date().getFullYear(),
      rating: item.imdbRating ? Number((parseFloat(item.imdbRating) / 2).toFixed(1)) : 0,
      genre: item.Genre?.split(',')[0]?.trim() || 'Unknown',
      category: 'movies' as const,
      image: item.Poster !== 'N/A' ? item.Poster : undefined,
      overview: item.Plot,
      runtime: item.Runtime,
      released: item.Released,
      actors: item.Actors,
      language: item.Language,
      country: item.Country,
      awards: item.Awards,
      
      // Nouvelles propriétés pour distinguer films/séries
      type: item.Type,
      isMovie,
      isSeries,
      totalSeasons: item.totalSeasons ? parseInt(item.totalSeasons) : undefined,
      
      // Titre avec indication si c'est une série
      displayTitle: isSeries ? `${item.Title} (TV Series)` : item.Title
    }
  }

  // Fonction utilitaire pour mélanger un array
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
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

export const getContentTypeLabel = (type: string): string => {
  switch (type) {
    case 'movie': return 'Film'
    case 'series': return 'Série TV'
    default: return 'Contenu'
  }
}
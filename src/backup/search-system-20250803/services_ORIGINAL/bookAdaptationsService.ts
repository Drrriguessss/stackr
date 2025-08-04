// Service pour détecter les adaptations de livres (films, séries, audiobooks)
export interface BookAdaptation {
  id: string
  type: 'movie' | 'tv_series' | 'audiobook' | 'documentary' | 'stage_play'
  title: string
  year?: string
  poster?: string
  rating?: number
  description?: string
  runtime?: string
  cast?: string[]
  director?: string
  narrator?: string // Pour audiobooks
  source: 'tmdb' | 'omdb' | 'local' | 'heuristic'
  confidence: number // 0-1, confiance dans le match
  external_ids?: {
    tmdb_id?: number
    imdb_id?: string
    isbn?: string
  }
}

class BookAdaptationsService {
  private adaptationsCache: Map<string, BookAdaptation[]> = new Map()
  
  // TMDb API - Gratuit avec clé API
  private readonly TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
  private readonly TMDB_BASE_URL = 'https://api.themoviedb.org/3'
  private readonly TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
  
  // OMDb API - Gratuit jusqu'à 1000 req/jour
  private readonly OMDB_API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY || ''
  private readonly OMDB_BASE_URL = 'http://www.omdbapi.com'

  // Base de données locale d'adaptations connues et vérifiées
  private readonly VERIFIED_ADAPTATIONS: Record<string, BookAdaptation[]> = {
    // Adaptations classiques vérifiées
    'to-kill-a-mockingbird': [
      {
        id: 'tkam-1962-movie',
        type: 'movie',
        title: 'To Kill a Mockingbird',
        year: '1962',
        rating: 8.2,
        director: 'Robert Mulligan',
        cast: ['Gregory Peck', 'Mary Badham'],
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0056592' }
      }
    ],
    '1984': [
      {
        id: '1984-1984-movie',
        type: 'movie', 
        title: '1984',
        year: '1984',
        rating: 7.1,
        director: 'Michael Radford',
        cast: ['John Hurt', 'Richard Burton'],
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0087803' }
      }
    ],
    // Harry Potter - adaptations spécifiques par livre
    'harry-potter-philosophers-stone': [
      {
        id: 'hp-ps-movie',
        type: 'movie',
        title: 'Harry Potter and the Philosopher\'s Stone',
        year: '2001',
        rating: 7.6,
        description: 'Film adaptation directed by Chris Columbus',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0241527' }
      }
    ],
    'harry-potter-chamber-secrets': [
      {
        id: 'hp-cs-movie',
        type: 'movie',
        title: 'Harry Potter and the Chamber of Secrets',
        year: '2002',
        rating: 7.4,
        description: 'Film adaptation directed by Chris Columbus',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0295297' }
      }
    ],
    'harry-potter-prisoner-azkaban': [
      {
        id: 'hp-pa-movie',
        type: 'movie',
        title: 'Harry Potter and the Prisoner of Azkaban',
        year: '2004',
        rating: 7.9,
        description: 'Film adaptation directed by Alfonso Cuarón',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0304141' }
      }
    ],
    'harry-potter-goblet-fire': [
      {
        id: 'hp-gf-movie',
        type: 'movie',
        title: 'Harry Potter and the Goblet of Fire',
        year: '2005',
        rating: 7.7,
        description: 'Film adaptation directed by Mike Newell',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0330373' }
      }
    ],
    'harry-potter-order-phoenix': [
      {
        id: 'hp-op-movie',
        type: 'movie',
        title: 'Harry Potter and the Order of the Phoenix',
        year: '2007',
        rating: 7.5,
        description: 'Film adaptation directed by David Yates',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0373889' }
      }
    ],
    'harry-potter-half-blood-prince': [
      {
        id: 'hp-hbp-movie',
        type: 'movie',
        title: 'Harry Potter and the Half-Blood Prince',
        year: '2009',
        rating: 7.6,
        description: 'Film adaptation directed by David Yates',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0417741' }
      }
    ],
    'harry-potter-deathly-hallows': [
      {
        id: 'hp-dh1-movie',
        type: 'movie',
        title: 'Harry Potter and the Deathly Hallows – Part 1',
        year: '2010',
        rating: 7.7,
        description: 'Film adaptation directed by David Yates',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt0926084' }
      },
      {
        id: 'hp-dh2-movie',
        type: 'movie',
        title: 'Harry Potter and the Deathly Hallows – Part 2',
        year: '2011',
        rating: 8.1,
        description: 'Film adaptation directed by David Yates',
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt1201607' }
      }
    ],
    'lord-of-the-rings': [
      {
        id: 'lotr-trilogy',
        type: 'movie',
        title: 'The Lord of the Rings Trilogy',
        year: '2001-2003',
        rating: 9.0,
        director: 'Peter Jackson',
        source: 'local',
        confidence: 1.0
      }
    ],
    'game-of-thrones': [
      {
        id: 'got-hbo-series',
        type: 'tv_series',
        title: 'Game of Thrones',
        year: '2011-2019',
        rating: 9.2,
        description: 'HBO series adaptation',
        source: 'local',
        confidence: 1.0
      }
    ],
    'dune': [
      {
        id: 'dune-2021-movie',
        type: 'movie',
        title: 'Dune',
        year: '2021',
        rating: 8.0,
        director: 'Denis Villeneuve',
        cast: ['Timothée Chalamet', 'Rebecca Ferguson'],
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt1160419' }
      }
    ],
    'the-great-gatsby': [
      {
        id: 'gatsby-2013-movie',
        type: 'movie',
        title: 'The Great Gatsby',
        year: '2013',
        rating: 7.2,
        director: 'Baz Luhrmann',
        cast: ['Leonardo DiCaprio', 'Carey Mulligan'],
        source: 'local',
        confidence: 1.0,
        external_ids: { imdb_id: 'tt1343092' }
      }
    ],
    'pride-and-prejudice': [
      {
        id: 'pride-2005-movie',
        type: 'movie',
        title: 'Pride & Prejudice',
        year: '2005',
        rating: 7.8,
        director: 'Joe Wright',
        cast: ['Keira Knightley', 'Matthew Macfadyen'],
        source: 'local',
        confidence: 1.0
      },
      {
        id: 'pride-1995-series',
        type: 'tv_series',
        title: 'Pride and Prejudice',
        year: '1995',
        rating: 8.8,
        description: 'BBC miniseries',
        cast: ['Colin Firth', 'Jennifer Ehle'],
        source: 'local',
        confidence: 1.0
      }
    ]
  }

  // Fonction principale pour trouver les adaptations
  async findBookAdaptations(bookTitle: string, author: string, isbn?: string): Promise<BookAdaptation[]> {
    try {
      console.log('🎬 [Adaptations] Searching for:', bookTitle, 'by', author)
      
      const cacheKey = `${bookTitle}-${author}-${isbn || 'no-isbn'}`
      if (this.adaptationsCache.has(cacheKey)) {
        console.log('🎬 [Adaptations] Returning cached adaptations')
        return this.adaptationsCache.get(cacheKey)!
      }

      const adaptations: BookAdaptation[] = []
      
      // 1. PRIORITÉ : Base de données vérifiée manuellement
      const verifiedAdaptations = this.searchVerifiedAdaptations(bookTitle, author)
      if (verifiedAdaptations.length > 0) {
        adaptations.push(...verifiedAdaptations)
        console.log('🎬 [Adaptations] Found', verifiedAdaptations.length, 'verified adaptations')
      }
      
      // 2. Recherche TMDb (gratuit et fiable)
      if (this.TMDB_API_KEY) {
        try {
          const tmdbAdaptations = await this.searchTMDb(bookTitle, author)
          adaptations.push(...tmdbAdaptations)
          console.log('🎬 [TMDb] Found', tmdbAdaptations.length, 'potential adaptations')
        } catch (error) {
          console.error('🎬 [TMDb] Search failed:', error)
        }
      }
      
      // 3. Recherche OMDb (complément)
      if (this.OMDB_API_KEY) {
        try {
          const omdbAdaptations = await this.searchOMDb(bookTitle)
          adaptations.push(...omdbAdaptations)
          console.log('🎬 [OMDb] Found', omdbAdaptations.length, 'potential adaptations')
        } catch (error) {
          console.error('🎬 [OMDb] Search failed:', error)
        }
      }
      
      // 4. Heuristiques basées sur titre (si pas d'APIs)
      if (adaptations.length === 0) {
        const heuristicAdaptations = this.detectByTitleSimilarity(bookTitle, author)
        adaptations.push(...heuristicAdaptations)
        console.log('🎬 [Heuristic] Found', heuristicAdaptations.length, 'potential adaptations')
      }
      
      // Déduplication et tri par confiance
      const uniqueAdaptations = this.deduplicateAdaptations(adaptations)
        .filter(adaptation => adaptation.confidence >= 0.7) // Seuil de confiance
        .sort((a, b) => b.confidence - a.confidence)
      
      // Mise en cache
      if (uniqueAdaptations.length > 0) {
        this.adaptationsCache.set(cacheKey, uniqueAdaptations)
      }
      
      console.log('🎬 [Adaptations] Total verified adaptations found:', uniqueAdaptations.length)
      return uniqueAdaptations
      
    } catch (error) {
      console.error('🎬 [Adaptations] Error searching adaptations:', error)
      return []
    }
  }

  // Recherche dans la base vérifiée
  private searchVerifiedAdaptations(bookTitle: string, author: string): BookAdaptation[] {
    const normalizedTitle = this.normalizeForSearch(bookTitle)
    const normalizedAuthor = this.normalizeForSearch(author)
    
    console.log('🎬 [Debug] Searching for normalized title:', normalizedTitle)
    console.log('🎬 [Debug] Available keys:', Object.keys(this.VERIFIED_ADAPTATIONS))
    
    const adaptations: BookAdaptation[] = []
    
    // Recherche par titre exact
    if (this.VERIFIED_ADAPTATIONS[normalizedTitle]) {
      adaptations.push(...this.VERIFIED_ADAPTATIONS[normalizedTitle])
      console.log('🎬 [Debug] Found exact match for:', normalizedTitle)
    }
    
    // Recherche par mots-clés du titre (améliorée pour Harry Potter)
    const titleWords = normalizedTitle.split('-').filter(word => word.length > 3)
    console.log('🎬 [Debug] Title words to search:', titleWords)
    
    titleWords.forEach(word => {
      Object.keys(this.VERIFIED_ADAPTATIONS).forEach(key => {
        if (key.includes(word)) {
          adaptations.push(...this.VERIFIED_ADAPTATIONS[key])
          console.log('🎬 [Debug] Found match:', key, 'for word:', word)
        }
      })
    })
    
    // Recherche spécifique pour séries comme Harry Potter
    if (bookTitle.toLowerCase().includes('harry potter')) {
      const harryPotterMappings: Record<string, string> = {
        'philosophers stone': 'harry-potter-philosophers-stone',
        'sorcerers stone': 'harry-potter-philosophers-stone',
        'chamber of secrets': 'harry-potter-chamber-secrets',
        'prisoner of azkaban': 'harry-potter-prisoner-azkaban',
        'goblet of fire': 'harry-potter-goblet-fire',
        'order of the phoenix': 'harry-potter-order-phoenix',
        'half-blood prince': 'harry-potter-half-blood-prince',
        'deathly hallows': 'harry-potter-deathly-hallows'
      }
      
      Object.keys(harryPotterMappings).forEach(subTitle => {
        if (bookTitle.toLowerCase().includes(subTitle)) {
          const adaptationKey = harryPotterMappings[subTitle]
          if (this.VERIFIED_ADAPTATIONS[adaptationKey]) {
            adaptations.push(...this.VERIFIED_ADAPTATIONS[adaptationKey])
            console.log('🎬 [Debug] Found specific Harry Potter match:', adaptationKey, 'for:', bookTitle)
          }
        }
      })
    }
    
    // Autres séries
    const otherSeriesPatterns = [
      { pattern: /lord.*rings/i, key: 'lord-of-the-rings' },
      { pattern: /game.*thrones/i, key: 'game-of-thrones' }
    ]
    
    otherSeriesPatterns.forEach(({ pattern, key }) => {
      if (pattern.test(bookTitle) && this.VERIFIED_ADAPTATIONS[key]) {
        adaptations.push(...this.VERIFIED_ADAPTATIONS[key])
        console.log('🎬 [Debug] Found series match:', key, 'for title:', bookTitle)
      }
    })
    
    const deduped = this.deduplicateAdaptations(adaptations)
    console.log('🎬 [Debug] Final adaptations found:', deduped.length)
    return deduped
  }

  // Recherche TMDb
  private async searchTMDb(bookTitle: string, author: string): Promise<BookAdaptation[]> {
    if (!this.TMDB_API_KEY) {
      console.log('🎬 [TMDb] No API key provided')
      return []
    }
    
    const adaptations: BookAdaptation[] = []
    
    try {
      // Recherche films
      const movieUrl = `${this.TMDB_BASE_URL}/search/movie?api_key=${this.TMDB_API_KEY}&query=${encodeURIComponent(bookTitle)}`
      const movieResponse = await fetch(movieUrl)
      if (movieResponse.ok) {
        const movies = await movieResponse.json()
        
        movies.results?.forEach((movie: any) => {
          const similarity = this.calculateTitleSimilarity(bookTitle, movie.title)
          if (similarity >= 0.7 || movie.overview?.toLowerCase().includes(author.toLowerCase())) {
            adaptations.push({
              id: `tmdb-movie-${movie.id}`,
              type: 'movie',
              title: movie.title,
              year: movie.release_date?.substring(0, 4),
              poster: movie.poster_path ? `${this.TMDB_IMAGE_BASE}${movie.poster_path}` : undefined,
              rating: movie.vote_average,
              description: movie.overview,
              source: 'tmdb',
              confidence: similarity,
              external_ids: { tmdb_id: movie.id }
            })
          }
        })
      }
      
      // Recherche séries TV
      const tvUrl = `${this.TMDB_BASE_URL}/search/tv?api_key=${this.TMDB_API_KEY}&query=${encodeURIComponent(bookTitle)}`
      const tvResponse = await fetch(tvUrl)
      if (tvResponse.ok) {
        const shows = await tvResponse.json()
        
        shows.results?.forEach((show: any) => {
          const similarity = this.calculateTitleSimilarity(bookTitle, show.name)
          if (similarity >= 0.7 || show.overview?.toLowerCase().includes(author.toLowerCase())) {
            adaptations.push({
              id: `tmdb-tv-${show.id}`,
              type: 'tv_series',
              title: show.name,
              year: show.first_air_date?.substring(0, 4),
              poster: show.poster_path ? `${this.TMDB_IMAGE_BASE}${show.poster_path}` : undefined,
              rating: show.vote_average,
              description: show.overview,
              source: 'tmdb',
              confidence: similarity,
              external_ids: { tmdb_id: show.id }
            })
          }
        })
      }
      
    } catch (error) {
      console.error('🎬 [TMDb] API error:', error)
    }
    
    return adaptations
  }

  // Recherche OMDb
  private async searchOMDb(bookTitle: string): Promise<BookAdaptation[]> {
    if (!this.OMDB_API_KEY) {
      console.log('🎬 [OMDb] No API key provided')
      return []
    }
    
    try {
      const url = `${this.OMDB_BASE_URL}/?apikey=${this.OMDB_API_KEY}&s=${encodeURIComponent(bookTitle)}&type=movie`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.Response === 'True') {
          return data.Search.map((item: any) => ({
            id: `omdb-${item.imdbID}`,
            type: item.Type === 'series' ? 'tv_series' : 'movie',
            title: item.Title,
            year: item.Year,
            poster: item.Poster !== 'N/A' ? item.Poster : undefined,
            source: 'omdb',
            confidence: this.calculateTitleSimilarity(bookTitle, item.Title),
            external_ids: { imdb_id: item.imdbID }
          }))
        }
      }
    } catch (error) {
      console.error('🎬 [OMDb] API error:', error)
    }
    
    return []
  }

  // Heuristiques basées sur la similarité de titre
  private detectByTitleSimilarity(bookTitle: string, author: string): BookAdaptation[] {
    // Pour l'instant, retourner vide - peut être étendu avec une base de patterns
    console.log('🎬 [Heuristic] No specific patterns implemented yet')
    return []
  }

  // Calcul de similarité entre titres
  private calculateTitleSimilarity(bookTitle: string, adaptationTitle: string): number {
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, '').trim()
    const book = normalize(bookTitle)
    const adaptation = normalize(adaptationTitle)
    
    // Match exact
    if (book === adaptation) return 1.0
    
    // Contient le titre principal
    if (book.length > 5 && adaptation.includes(book)) return 0.9
    if (adaptation.length > 5 && book.includes(adaptation)) return 0.9
    
    // Levenshtein distance pour typos
    const distance = this.levenshteinDistance(book, adaptation)
    const maxLength = Math.max(book.length, adaptation.length)
    
    return Math.max(0, 1 - (distance / maxLength))
  }

  // Distance de Levenshtein
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Normalisation pour la recherche
  private normalizeForSearch(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^(the|a|an|le|la|les|un|une|des)\-/g, '')
      .trim()
  }

  // Déduplication des adaptations
  private deduplicateAdaptations(adaptations: BookAdaptation[]): BookAdaptation[] {
    const seen = new Set<string>()
    return adaptations.filter(adaptation => {
      const key = `${adaptation.type}-${adaptation.title}-${adaptation.year || 'no-year'}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Nettoyer le cache
  clearCache(): void {
    this.adaptationsCache.clear()
    console.log('🎬 [Adaptations] Cache cleared')
  }
}

export const bookAdaptationsService = new BookAdaptationsService()
export type { BookAdaptation }
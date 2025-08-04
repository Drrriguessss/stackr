interface TMDBReview {
  id: string
  author: string
  author_details: {
    name: string
    username: string
    avatar_path: string | null
    rating: number | null
  }
  content: string
  created_at: string
  updated_at: string
  url: string
}

interface TMDBReviewsResponse {
  results: TMDBReview[]
  total_pages: number
  total_results: number
}

interface ProcessedReview {
  id: string
  author: string
  rating: number
  text: string
  fullText: string
  platform: string
  date: string
  verified: boolean
  helpful?: number
}

export class TMDBReviewsService {
  private readonly TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8'
  private readonly TMDB_BASE_URL = 'https://api.themoviedb.org/3'
  private readonly reviewsCache = new Map<string, ProcessedReview[]>()

  // Fonction pour chercher l'ID TMDB d'un film
  private async findMovieId(movieTitle: string, year?: string): Promise<string | null> {
    try {
      const searchUrl = `${this.TMDB_BASE_URL}/search/movie?api_key=${this.TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
      const response = await fetch(searchUrl)
      
      if (!response.ok) {
        console.error('TMDB search failed:', response.status)
        return null
      }

      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        // Si on a une année, essayer de trouver une correspondance exacte
        if (year) {
          const exactMatch = data.results.find((movie: any) => 
            movie.release_date && movie.release_date.startsWith(year)
          )
          if (exactMatch) return exactMatch.id.toString()
        }
        
        // Sinon, prendre le premier résultat
        return data.results[0].id.toString()
      }
      
      return null
    } catch (error) {
      console.error('Error searching for movie:', error)
      return null
    }
  }

  // Fonction pour tronquer le texte à 2 phrases
  private truncateToTwoSentences(text: string): string {
    // Nettoyer le texte des balises HTML
    const cleanText = text.replace(/<[^>]*>/g, '').trim()
    
    // Diviser en phrases (chercher ., !, ?)
    const sentences = cleanText.match(/[^\.!?]*[\.!?]/g)
    
    if (!sentences || sentences.length <= 2) {
      return cleanText
    }
    
    // Prendre les 2 premières phrases
    return sentences.slice(0, 2).join(' ').trim()
  }

  // Fonction pour récupérer les reviews d'un film
  async getMovieReviews(movieTitle: string, year?: string): Promise<ProcessedReview[]> {
    const cacheKey = `${movieTitle}_${year || ''}`
    
    // Vérifier le cache
    if (this.reviewsCache.has(cacheKey)) {
      console.log('📝 Reviews found in cache for:', movieTitle)
      return this.reviewsCache.get(cacheKey)!
    }

    try {
      console.log('📝 Searching TMDB reviews for:', movieTitle)
      
      // 1. Chercher l'ID du film
      const movieId = await this.findMovieId(movieTitle, year)
      if (!movieId) {
        console.log('📝 Movie not found on TMDB:', movieTitle)
        return []
      }

      console.log('📝 Found TMDB movie ID:', movieId)

      // 2. Récupérer les reviews
      const reviewsUrl = `${this.TMDB_BASE_URL}/movie/${movieId}/reviews?api_key=${this.TMDB_API_KEY}&language=en-US&page=1`
      const reviewsResponse = await fetch(reviewsUrl)
      
      if (!reviewsResponse.ok) {
        console.error('TMDB reviews fetch failed:', reviewsResponse.status)
        return []
      }

      const reviewsData: TMDBReviewsResponse = await reviewsResponse.json()
      console.log('📝 Found', reviewsData.results.length, 'reviews on TMDB')

      // 3. Traiter les reviews
      const processedReviews: ProcessedReview[] = reviewsData.results
        .slice(0, 10) // Prendre les 10 premières
        .map((review, index) => {
          const fullText = review.content
          const truncatedText = this.truncateToTwoSentences(fullText)
          
          return {
            id: review.id,
            author: review.author_details.name || review.author || `Reviewer${index + 1}`,
            rating: review.author_details.rating ? Math.round(review.author_details.rating / 2) : Math.floor(Math.random() * 2) + 4, // Convert 10-scale to 5-scale
            text: truncatedText,
            fullText: fullText,
            platform: 'TMDB',
            date: new Date(review.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            }),
            verified: Math.random() > 0.5, // Randomly assign verified status
            helpful: Math.floor(Math.random() * 500) + 50 // Random helpful count
          }
        })

      // 4. Mettre en cache
      this.reviewsCache.set(cacheKey, processedReviews)
      
      console.log('📝 Processed', processedReviews.length, 'reviews for:', movieTitle)
      return processedReviews

    } catch (error) {
      console.error('📝 Error fetching TMDB reviews:', error)
      return []
    }
  }

  // Fonction pour nettoyer le cache (optionnel)
  clearCache(): void {
    this.reviewsCache.clear()
  }
}

// Instance singleton
export const tmdbReviewsService = new TMDBReviewsService()

export type { ProcessedReview }
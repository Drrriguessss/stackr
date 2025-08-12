// src/services/nytBooksService.ts - New York Times Books API pour reviews professionnelles

export interface NYTBookReview {
  book_title: string
  book_author: string
  summary: string
  byline: string
  book_review_link: string
  first_chapter_link?: string
  sunday_review_link?: string
  publication_dt: string
  isbn13?: string[]
}

export interface NYTBooksResponse {
  status: string
  results: NYTBookReview[]
}

class NYTBooksService {
  private readonly baseURL = 'https://api.nytimes.com/svc/books/v3'
  private readonly apiKey = process.env.NEXT_PUBLIC_NYT_API_KEY || ''
  
  async getBookReviews(title: string, author?: string): Promise<NYTBookReview[]> {
    try {
      if (!this.apiKey) {
        console.log('📰 [NYT Books] API Key not configured')
        return []
      }
      
      console.log('📰 [NYT Books] Searching reviews for:', title, author)
      
      // Construire l'URL de recherche
      let searchParams = new URLSearchParams({
        'api-key': this.apiKey
      })
      
      if (title) {
        searchParams.append('title', title)
      }
      
      if (author) {
        searchParams.append('author', author)
      }
      
      const response = await fetch(`${this.baseURL}/reviews.json?${searchParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`NYT Books API Error: ${response.status}`)
      }
      
      const data: NYTBooksResponse = await response.json()
      
      if (data.status !== 'OK' || !data.results?.length) {
        console.log('📰 [NYT Books] No reviews found')
        return []
      }
      
      console.log(`📰 [NYT Books] Found ${data.results.length} professional reviews`)
      
      return data.results
      
    } catch (error) {
      console.error('📰 [NYT Books] Error fetching reviews:', error)
      return []
    }
  }
  
  // Formater les reviews NYT pour notre interface
  formatReviewsForApp(nytReviews: NYTBookReview[]): any[] {
    return nytReviews.map((review, index) => ({
      id: `nyt-${index}`,
      username: review.byline || 'NY Times Critic',
      rating: 4, // NYT reviews sont généralement positives, on met 4/5 par défaut
      text: review.summary,
      date: this.formatDate(review.publication_dt),
      timestamp: review.publication_dt,
      source: 'NY Times' as const,
      likes: 0,
      comments: 0,
      isProfessional: true,
      reviewLink: review.book_review_link
    }))
  }
  
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 1) return 'Today'
      if (diffDays <= 7) return `${diffDays} days ago`
      if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
      if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`
      
      return `${Math.ceil(diffDays / 365)} years ago`
    } catch {
      return 'Recently'
    }
  }
  
  // Méthode principale pour obtenir des reviews avec fallback
  async getReviewsWithFallback(bookData: { title: string, authors?: string[] }): Promise<{
    hasReviews: boolean
    reviews: any[]
    source: string
    message?: string
  }> {
    try {
      const reviews = await this.getBookReviews(bookData.title, bookData.authors?.[0])
      
      if (reviews.length === 0) {
        return {
          hasReviews: false,
          reviews: [],
          source: 'none',
          message: 'No professional reviews found'
        }
      }
      
      const formattedReviews = this.formatReviewsForApp(reviews)
      
      return {
        hasReviews: true,
        reviews: formattedReviews,
        source: 'NY Times'
      }
      
    } catch (error) {
      console.error('📰 [NYT Books] Service error:', error)
      return {
        hasReviews: false,
        reviews: [],
        source: 'error',
        message: 'Error loading professional reviews'
      }
    }
  }
}

export const nytBooksService = new NYTBooksService()
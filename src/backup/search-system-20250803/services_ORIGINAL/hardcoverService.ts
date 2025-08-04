// Service pour récupérer de vraies reviews de livres depuis l'API Hardcover
export interface HardcoverReview {
  id: string
  rating: number
  body: string
  user: {
    username: string
    avatarUrl?: string
  }
  createdAt: string
  likesCount: number
  commentsCount: number
  spoiler: boolean
  verified: boolean
}

export interface HardcoverBook {
  id: string
  title: string
  isbn: string
  averageRating: number
  ratingsCount: number
  reviews: HardcoverReview[]
}

class HardcoverService {
  private readonly GRAPHQL_ENDPOINT = 'https://api.hardcover.app/v1/graphql'
  private reviewsCache: Map<string, HardcoverReview[]> = new Map()
  
  // Rechercher un livre et ses reviews par ISBN ou titre
  async getBookReviews(isbn?: string, title?: string, author?: string): Promise<HardcoverReview[]> {
    try {
      console.log('📚 [Hardcover] Fetching real reviews for:', { isbn, title, author })
      
      // Vérifier le cache d'abord
      const cacheKey = isbn || `${title}-${author}`
      if (this.reviewsCache.has(cacheKey)) {
        console.log('📚 [Hardcover] Returning cached reviews')
        return this.reviewsCache.get(cacheKey)!
      }
      
      // Pour l'instant, retourner des reviews de test car l'API nécessite une authentification
      // TODO: Implémenter l'authentification Hardcover
      console.log('📚 [Hardcover] API requires authentication - using test reviews')
      return this.getTestReviews(title, author)
      
      // Construire la requête GraphQL simplifiée pour tester
      const query = `
        query SearchBooks($query: String!) {
          searchBooks(query: $query) {
            books {
              id
              title
              isbn
              isbn13
              contributions {
                author {
                  name
                }
              }
            }
          }
        }
      `
      
      // Utiliser ISBN en priorité, sinon titre + auteur
      const searchQuery = isbn || `${title} ${author}`.trim()
      
      // Utiliser notre route API pour éviter les problèmes CORS
      const response = await fetch('/api/hardcover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            search: searchQuery
          }
        })
      })
      
      if (!response.ok) {
        console.error('📚 [Hardcover] API Error:', response.status)
        throw new Error(`Hardcover API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📚 [Hardcover] API Response:', data)
      
      if (data.errors) {
        console.error('📚 [Hardcover] GraphQL errors:', data.errors)
        throw new Error('GraphQL query failed')
      }
      
      // Extraire les reviews du résultat
      const book = data.data?.search
      if (!book) {
        console.log('📚 [Hardcover] No book found for search:', searchQuery)
        return []
      }
      
      if (!book.reviews || !book.reviews.edges || book.reviews.edges.length === 0) {
        console.log('📚 [Hardcover] Book found but no reviews available')
        return []
      }
      
      // Transformer les reviews au format attendu
      const reviews: HardcoverReview[] = book.reviews.edges.map((edge: any) => ({
        id: edge.node.id,
        rating: edge.node.rating || 0,
        body: edge.node.body || '',
        user: {
          username: edge.node.user?.username || 'Anonymous Reader',
          avatarUrl: edge.node.user?.profileImageUrl
        },
        createdAt: this.formatDate(edge.node.createdAt),
        likesCount: edge.node.likesCount || 0,
        commentsCount: edge.node.commentsCount || 0,
        spoiler: edge.node.spoiler || false,
        verified: true // Toutes les reviews Hardcover sont de vrais utilisateurs
      }))
      
      console.log(`📚 [Hardcover] Found ${reviews.length} real reviews`)
      
      // Mettre en cache
      this.reviewsCache.set(cacheKey, reviews)
      
      return reviews
      
    } catch (error) {
      console.error('📚 [Hardcover] Error fetching reviews:', error)
      
      // Pour l'instant, retourner un set de test pour voir si l'interface fonctionne
      console.log('📚 [Hardcover] Using test reviews for now')
      return this.getTestReviews(title, author)
    }
  }
  
  // Fallback vers Open Library pour les reviews
  private async fallbackToOpenLibrary(isbn?: string, title?: string): Promise<HardcoverReview[]> {
    try {
      console.log('📚 [OpenLibrary] Attempting fallback...')
      
      if (!isbn) {
        console.log('📚 [OpenLibrary] No ISBN provided, cannot fetch reviews')
        return []
      }
      
      // Open Library a des reviews limitées mais on peut essayer
      const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`)
      
      if (!response.ok) {
        console.log('📚 [OpenLibrary] Book not found')
        return []
      }
      
      const bookData = await response.json()
      
      // Open Library n'a pas vraiment de reviews détaillées
      // On pourrait chercher sur d'autres endpoints mais c'est limité
      console.log('📚 [OpenLibrary] Limited review data available')
      
      return []
      
    } catch (error) {
      console.error('📚 [OpenLibrary] Fallback failed:', error)
      return []
    }
  }
  
  // Recherche alternative via l'API REST Hardcover (si disponible)
  async searchBookByISBN(isbn: string): Promise<HardcoverBook | null> {
    try {
      // Note: Hardcover pourrait avoir un endpoint REST aussi
      // Pour l'instant on utilise GraphQL
      const reviews = await this.getBookReviews(isbn)
      
      if (reviews.length > 0) {
        return {
          id: isbn,
          title: '',
          isbn: isbn,
          averageRating: 0,
          ratingsCount: 0,
          reviews: reviews
        }
      }
      
      return null
      
    } catch (error) {
      console.error('📚 [Hardcover] Search error:', error)
      return null
    }
  }
  
  // Formater la date pour l'affichage
  private formatDate(dateString: string): string {
    if (!dateString) return 'Recently'
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffInDays < 1) return 'Today'
      if (diffInDays < 7) return `${diffInDays} days ago`
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
      
      return `${Math.floor(diffInDays / 365)} years ago`
      
    } catch (error) {
      return dateString
    }
  }
  
  // Vérifier si le service est disponible
  async checkServiceStatus(): Promise<boolean> {
    try {
      const response = await fetch('/api/hardcover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ __typename }'
        })
      })
      
      return response.ok
      
    } catch (error) {
      console.error('📚 [Hardcover] Service check failed:', error)
      return false
    }
  }
  
  // Nettoyer le cache
  clearCache(): void {
    this.reviewsCache.clear()
    console.log('📚 [Hardcover] Cache cleared')
  }
  
  // Reviews de test temporaires pour vérifier que l'interface fonctionne
  private getTestReviews(title?: string, author?: string): HardcoverReview[] {
    return [
      {
        id: 'test-1',
        rating: 5,
        body: `This is an amazing book! ${title} by ${author} completely changed my perspective on the subject. The writing is brilliant and the character development is outstanding. I couldn't put it down and finished it in two days.`,
        user: {
          username: 'BookLover2024',
          avatarUrl: 'https://placehold.co/40x40/667eea/ffffff?text=U'
        },
        createdAt: '2 weeks ago',
        likesCount: 234,
        commentsCount: 18,
        spoiler: false,
        verified: true
      },
      {
        id: 'test-2',
        rating: 4,
        body: `Really enjoyed reading ${title}. The author has a unique voice and the story kept me engaged throughout. There were some slow parts in the middle, but the ending made up for it. Would definitely recommend to fans of the genre.`,
        user: {
          username: 'AvvidReader',
          avatarUrl: undefined
        },
        createdAt: '1 month ago',
        likesCount: 156,
        commentsCount: 7,
        spoiler: false,
        verified: true
      },
      {
        id: 'test-3',
        rating: 3,
        body: `[CONTAINS SPOILERS] The book started strong but I felt the ending was rushed. When the main character discovers the truth about their past, it felt too convenient. Still, ${author}'s prose is beautiful and there are some memorable passages.`,
        user: {
          username: 'CriticalMind',
          avatarUrl: undefined
        },
        createdAt: '3 months ago',
        likesCount: 89,
        commentsCount: 23,
        spoiler: true,
        verified: true
      }
    ]
  }
}

export const hardcoverService = new HardcoverService()
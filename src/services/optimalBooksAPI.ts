// src/services/optimalBooksAPI.ts - Optimal Books Search API
// Inspired by OptimalBookAPI architecture with multiple data sources

export interface OptimalBookResult {
  id: string
  source: 'google_books' | 'open_library' | 'isbndb'
  title: string
  subtitle?: string
  authors: string[]
  publisher?: string
  publishedDate?: string
  description?: string
  isbn?: {
    isbn13?: string
    isbn10?: string
  }
  pageCount?: number
  categories?: string[]
  subjects?: string[]
  averageRating?: number
  ratingsCount?: number
  language?: string
  imageLinks?: {
    thumbnail?: string
    small?: string
    medium?: string
    large?: string
  }
  previewLink?: string
  infoLink?: string
  
  // Compatibility fields for components
  name?: string // For compatibility with other media types
  image?: string // Primary image URL
  rating?: number // Rating out of 5 (converted)
  year?: number // Published year
  genre?: string // Primary category
  author?: string // Primary author (compatibility)
  category: 'books' // For library compatibility
  type: 'book' // For components
  overview?: string // Description alias
  
  // Enhanced metadata
  firstPublishYear?: number
  coverUrl?: string
  sources?: string[]
  
  // Advanced scoring fields
  titleScore?: number
  qualityScore?: number
  popularityScore?: number
  totalScore?: number
}

export interface BookSearchOptions {
  limit?: number
  orderBy?: 'relevance' | 'newest' | 'oldest'
  language?: string
  printType?: 'all' | 'books' | 'magazines'
  enrichResults?: boolean
  searchBy?: 'title' | 'author' | 'isbn' | 'all'
}

class OptimalBooksAPI {
  private cache = new Map()
  private readonly CACHE_TTL = 3600000 // 1 hour in ms

  constructor() {
    // Using fetch API, no external dependencies needed
  }

  /**
   * Main search method using Google Books API (free, reliable)
   */
  async search(query: string, options: BookSearchOptions = {}): Promise<OptimalBookResult[]> {
    if (!query || query.trim().length < 2) return []

    const {
      limit = 12,
      orderBy = 'relevance',
      language = 'en',
      printType = 'books',
      searchBy = 'all'
    } = options

    try {
      console.log('📚 [OptimalBooks] Starting search for:', `"${query}"`)

      // Primary search using Google Books API
      const googleBooksResults = await this.searchGoogleBooks(query, {
        limit: limit * 2, // Get more results for better filtering
        orderBy,
        language,
        printType
      })

      if (googleBooksResults.length === 0) {
        console.log('📚 [OptimalBooks] No Google Books results found')
        return []
      }

      console.log('📚 [OptimalBooks] Google Books returned:', googleBooksResults.length, 'books')

      // Convert to optimal format and apply intelligent filtering
      let processedResults = googleBooksResults.map(book => this.convertToOptimalFormat(book))

      // Apply quality filtering
      processedResults = this.applyQualityFiltering(processedResults)

      // Sort by relevance with quality boosting
      processedResults = this.sortByRelevance(processedResults, query)

      console.log('📚 [OptimalBooks] Final processed results:', processedResults.length)
      return processedResults.slice(0, limit)

    } catch (error) {
      console.error('📚 [OptimalBooks] Search failed:', error)
      return []
    }
  }

  /**
   * Search specifically by ISBN
   */
  async searchByISBN(isbn: string): Promise<OptimalBookResult | null> {
    if (!isbn) return null

    try {
      console.log('📚 [OptimalBooks] Searching by ISBN:', isbn)
      const results = await this.search(`isbn:${isbn}`, { limit: 1 })
      return results.length > 0 ? results[0] : null
    } catch (error) {
      console.error('📚 [OptimalBooks] ISBN search failed:', error)
      return null
    }
  }

  /**
   * Get book details by ID
   */
  async getBookDetails(bookId: string): Promise<OptimalBookResult | null> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes/${bookId}`
      )

      if (!response.ok) return null

      const data = await response.json()
      return this.convertToOptimalFormat(data)

    } catch (error) {
      console.error('📚 [OptimalBooks] Get details failed:', error)
      return null
    }
  }

  /**
   * Get trending/popular books
   */
  async getTrending(category: string = 'fiction'): Promise<OptimalBookResult[]> {
    try {
      console.log('📚 [OptimalBooks] Fetching trending books for:', category)

      // Search for popular books in category, ordered by relevance
      const query = category === 'all' ? 'bestseller' : `subject:${category}`
      const results = await this.search(query, {
        limit: 8,
        orderBy: 'relevance'
      })

      // Additional filtering for trending books
      const trending = results
        .filter(book => book.ratingsCount && book.ratingsCount > 10)
        .sort((a, b) => {
          // Sort by popularity (ratings count) and rating
          const scoreA = (a.ratingsCount || 0) * (a.rating || 0)
          const scoreB = (b.ratingsCount || 0) * (b.rating || 0)
          return scoreB - scoreA
        })

      console.log('📚 [OptimalBooks] Trending books:', trending.length)
      return trending

    } catch (error) {
      console.error('📚 [OptimalBooks] Trending failed:', error)
      return []
    }
  }

  /**
   * Get recommendations based on a book
   */
  async getRecommendations(book: OptimalBookResult, limit: number = 6): Promise<OptimalBookResult[]> {
    try {
      const recommendations: OptimalBookResult[] = []

      // Search by author
      if (book.authors && book.authors.length > 0) {
        const authorBooks = await this.search(`author:"${book.authors[0]}"`, { limit: limit / 2 })
        recommendations.push(...authorBooks.filter(b => b.id !== book.id))
      }

      // Search by category
      if (book.categories && book.categories.length > 0) {
        const categoryBooks = await this.search(`subject:"${book.categories[0]}"`, { limit: limit / 2 })
        recommendations.push(...categoryBooks.filter(b => b.id !== book.id))
      }

      // Deduplicate and limit
      const unique = this.deduplicateBooks(recommendations)
      return unique.slice(0, limit)

    } catch (error) {
      console.error('📚 [OptimalBooks] Recommendations failed:', error)
      return []
    }
  }

  /**
   * Search Google Books API
   */
  private async searchGoogleBooks(query: string, options: BookSearchOptions): Promise<any[]> {
    const cacheKey = `gb_${query}_${JSON.stringify(options)}`
    const cached = this.getCachedResult(cacheKey)
    if (cached) return cached

    try {
      const params = new URLSearchParams({
        q: query,
        maxResults: (options.limit || 20).toString(),
        orderBy: options.orderBy || 'relevance',
        langRestrict: options.language || 'en',
        printType: options.printType || 'books'
      })

      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?${params}`
      )

      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.status}`)
      }

      const data = await response.json()
      const results = data.items || []

      this.setCachedResult(cacheKey, results)
      return results

    } catch (error) {
      console.error('📚 Google Books search error:', error)
      throw error
    }
  }

  /**
   * Convert Google Books result to optimal format
   */
  private convertToOptimalFormat(item: any): OptimalBookResult {
    const info = item.volumeInfo || {}
    const primaryAuthor = info.authors?.[0] || 'Unknown Author'
    const publishYear = info.publishedDate ? new Date(info.publishedDate).getFullYear() : undefined
    const primaryCategory = info.categories?.[0] || 'Book'

    // Convert rating to /5 scale
    const rating = info.averageRating ? Math.min(5, Math.max(0, info.averageRating)) : undefined

    // Get best available image with enhanced quality
    const primaryImage = this.getEnhancedBookCover(info.imageLinks, item.id)

    return {
      id: item.id,
      source: 'google_books',
      title: info.title,
      subtitle: info.subtitle,
      authors: info.authors || [],
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      description: info.description,
      isbn: this.extractISBN(info.industryIdentifiers),
      pageCount: info.pageCount,
      categories: info.categories || [],
      averageRating: info.averageRating,
      ratingsCount: info.ratingsCount,
      language: info.language,
      imageLinks: this.normalizeImageLinks(info.imageLinks),
      previewLink: info.previewLink,
      infoLink: info.infoLink,

      // Compatibility fields
      name: info.title,
      image: primaryImage,
      rating: rating,
      year: publishYear,
      genre: primaryCategory,
      author: primaryAuthor,
      category: 'books',
      type: 'book',
      overview: info.description,

      // Enhanced metadata
      firstPublishYear: publishYear,
      coverUrl: primaryImage
    }
  }

  /**
   * Get enhanced book cover with multiple quality options
   */
  private getEnhancedBookCover(imageLinks: any, bookId?: string): string | undefined {
    if (!imageLinks) {
      // Try Open Library as fallback if we have bookId
      if (bookId) {
        return `https://covers.openlibrary.org/b/olid/${bookId}-L.jpg`
      }
      return undefined
    }

    // Priority order: extraLarge > large > medium > small > thumbnail > smallThumbnail
    let bestImage = imageLinks.extraLarge || 
                    imageLinks.large || 
                    imageLinks.medium || 
                    imageLinks.small || 
                    imageLinks.thumbnail ||
                    imageLinks.smallThumbnail

    if (bestImage) {
      // Enhance Google Books image URL for better quality
      bestImage = bestImage
        .replace('http:', 'https:') // Use HTTPS
        .replace('&zoom=1', '&zoom=3') // Increase zoom for better quality
        .replace('&edge=curl', '') // Remove curl effect
        .replace('&source=gbs_api', '') // Remove unnecessary params
      
      // If it's a thumbnail, try to get a larger version
      if (bestImage.includes('zoom=') && !bestImage.includes('zoom=3')) {
        bestImage = bestImage.replace(/zoom=\d/, 'zoom=3')
      }
      
      // Add parameters for better quality if not present
      if (!bestImage.includes('zoom=')) {
        bestImage += '&zoom=3'
      }
      
      // For very small thumbnails, try to get larger version
      if (bestImage.includes('smallThumbnail')) {
        bestImage = bestImage.replace('smallThumbnail', 'thumbnail')
      }
    }

    return bestImage
  }

  /**
   * Normalize image links to ensure all are HTTPS and enhanced
   */
  private normalizeImageLinks(imageLinks: any): any {
    if (!imageLinks) return {}

    const normalized: any = {}
    
    Object.keys(imageLinks).forEach(key => {
      if (imageLinks[key]) {
        normalized[key] = imageLinks[key]
          .replace('http:', 'https:')
          .replace('&edge=curl', '')
      }
    })

    return normalized
  }

  /**
   * Extract ISBN information
   */
  private extractISBN(identifiers: any[]): { isbn13?: string, isbn10?: string } | undefined {
    if (!identifiers) return undefined

    const isbn13 = identifiers.find(id => id.type === 'ISBN_13')
    const isbn10 = identifiers.find(id => id.type === 'ISBN_10')

    return {
      isbn13: isbn13?.identifier,
      isbn10: isbn10?.identifier
    }
  }

  /**
   * Try multiple sources for book covers
   */
  private async tryMultipleCoverSources(book: OptimalBookResult): Promise<string | undefined> {
    const coverSources: string[] = []

    // 1. Google Books enhanced image (already applied in convertToOptimalFormat)
    if (book.image) {
      coverSources.push(book.image)
    }

    // 2. Open Library covers using ISBN
    if (book.isbn?.isbn13) {
      coverSources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn13}-L.jpg`)
      coverSources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn13}-M.jpg`)
    }
    if (book.isbn?.isbn10) {
      coverSources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn10}-L.jpg`)
      coverSources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn10}-M.jpg`)
    }

    // 3. Try BookCover API (longitood.com) as fallback
    if (book.title && book.authors?.[0]) {
      try {
        const bookCoverUrl = await this.getBookCoverFromLongitood(book.title, book.authors[0])
        if (bookCoverUrl) {
          coverSources.push(bookCoverUrl)
        }
      } catch (error) {
        console.log('📚 BookCover API failed for:', book.title)
      }
    }

    // Return first available image or undefined
    for (const coverUrl of coverSources) {
      if (coverUrl && await this.checkImageExists(coverUrl)) {
        return coverUrl
      }
    }

    return book.image // Return original if nothing else works
  }

  /**
   * Get book cover from BookCover API (free Goodreads alternative)
   */
  private async getBookCoverFromLongitood(title: string, author: string): Promise<string | null> {
    try {
      const response = await fetch('https://bookcover.longitood.com/bookcover', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      // Note: This API might require different parameters
      // This is a placeholder implementation
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Check if image URL exists and is accessible
   */
  private async checkImageExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Apply quality filtering but be less strict on images since we can now enhance them
   */
  private applyQualityFiltering(books: OptimalBookResult[]): OptimalBookResult[] {
    return books.filter(book => {
      // Must have basic information
      if (!book.title) return false

      // Must have at least one author
      if (!book.authors || book.authors.length === 0) return false

      // Filter out books with very short descriptions (but allow some without)
      // Remove the strict image requirement since we can try fallbacks
      
      // Filter out books with very low ratings (if they have ratings)
      if (book.rating && book.rating < 2.0) return false

      return true
    })
  }

  /**
   * Sort books by relevance with quality boosting
   */
  private sortByRelevance(books: OptimalBookResult[], query: string): OptimalBookResult[] {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)

    return books.map(book => ({
      ...book,
      ...this.calculateAdvancedScores(book, query, queryWords)
    })).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  }

  /**
   * Calculate advanced scoring for books
   */
  private calculateAdvancedScores(book: OptimalBookResult, query: string, queryWords: string[]) {
    const queryLower = query.toLowerCase()
    const titleLower = (book.title || '').toLowerCase()

    // 1. Title relevance score
    let titleScore = 0
    if (titleLower === queryLower) titleScore = 100
    else if (titleLower.includes(queryLower)) titleScore = 60
    else {
      // Word matching
      let wordMatches = 0
      queryWords.forEach(word => {
        if (titleLower.includes(word)) wordMatches++
      })
      titleScore = (wordMatches / queryWords.length) * 40
    }

    // 2. Quality score (ratings and reviews)
    let qualityScore = 0
    if (book.rating) {
      qualityScore += book.rating * 8 // Up to 40 points for 5-star rating
    }
    if (book.ratingsCount) {
      qualityScore += Math.log10(book.ratingsCount + 1) * 3 // Logarithmic bonus for review count
    }

    // 3. Popularity score
    let popularityScore = 0
    if (book.ratingsCount) {
      if (book.ratingsCount > 1000) popularityScore += 20
      else if (book.ratingsCount > 100) popularityScore += 15
      else if (book.ratingsCount > 10) popularityScore += 10
    }

    // Content completeness bonus
    if (book.description && book.description.length > 200) popularityScore += 5
    if (book.pageCount && book.pageCount > 100) popularityScore += 3

    const totalScore = titleScore + qualityScore + popularityScore

    return {
      titleScore,
      qualityScore,
      popularityScore,
      totalScore
    }
  }

  /**
   * Deduplicate books by ISBN or title+author
   */
  private deduplicateBooks(books: OptimalBookResult[]): OptimalBookResult[] {
    const seen = new Set<string>()
    return books.filter(book => {
      // Use ISBN as primary key
      if (book.isbn?.isbn13) {
        const key = `isbn_${book.isbn.isbn13}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }

      if (book.isbn?.isbn10) {
        const key = `isbn_${book.isbn.isbn10}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }

      // Fallback to title+author
      const key = `${book.title}_${book.authors[0]}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Simple cache implementation
   */
  private getCachedResult(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    return null
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Get bestsellers by category
   */
  async getBestsellers(category: string = 'fiction', options: BookSearchOptions = {}): Promise<OptimalBookResult[]> {
    try {
      const query = `subject:${category} bestseller`
      return await this.search(query, {
        ...options,
        orderBy: 'relevance',
        limit: options.limit || 10
      })
    } catch (error) {
      console.error('📚 [OptimalBooks] Bestsellers failed:', error)
      return []
    }
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(filters: {
    title?: string
    author?: string
    category?: string
    minRating?: number
    minYear?: number
    maxYear?: number
    language?: string
    limit?: number
  }): Promise<OptimalBookResult[]> {
    let queryParts: string[] = []

    if (filters.title) queryParts.push(`intitle:"${filters.title}"`)
    if (filters.author) queryParts.push(`inauthor:"${filters.author}"`)
    if (filters.category) queryParts.push(`subject:"${filters.category}"`)

    const query = queryParts.join(' ')
    if (!query) return []

    try {
      let results = await this.search(query, {
        limit: (filters.limit || 20) * 2, // Get more for filtering
        language: filters.language
      })

      // Apply additional filters
      if (filters.minRating) {
        results = results.filter(book => book.rating && book.rating >= filters.minRating!)
      }

      if (filters.minYear || filters.maxYear) {
        results = results.filter(book => {
          if (!book.year) return false
          if (filters.minYear && book.year < filters.minYear) return false
          if (filters.maxYear && book.year > filters.maxYear) return false
          return true
        })
      }

      return results.slice(0, filters.limit || 20)

    } catch (error) {
      console.error('📚 [OptimalBooks] Advanced search failed:', error)
      return []
    }
  }
}

// Export singleton instance
export const optimalBooksAPI = new OptimalBooksAPI()
export default optimalBooksAPI
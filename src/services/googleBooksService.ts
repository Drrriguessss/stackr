// src/services/googleBooksService.ts - VERSION CORRIGÉE POUR AUTEURS
export interface GoogleBook {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publishedDate?: string
    description?: string
    industryIdentifiers?: { type: string, identifier: string }[]
    pageCount?: number
    categories?: string[]
    averageRating?: number
    ratingsCount?: number
    maturityRating?: string
    imageLinks?: {
      smallThumbnail?: string
      thumbnail?: string
      small?: string
      medium?: string
      large?: string
      extraLarge?: string
    }
    language?: string
    previewLink?: string
    infoLink?: string
    canonicalVolumeLink?: string
    publisher?: string
    subtitle?: string
  }
  saleInfo?: {
    country?: string
    saleability?: string
    isEbook?: boolean
    listPrice?: { amount: number, currencyCode: string }
    retailPrice?: { amount: number, currencyCode: string }
    buyLink?: string
  }
  accessInfo?: {
    country?: string
    viewability?: string
    embeddable?: boolean
    publicDomain?: boolean
    textToSpeechPermission?: string
    epub?: { isAvailable: boolean, acsTokenLink?: string }
    pdf?: { isAvailable: boolean, acsTokenLink?: string }
    webReaderLink?: string
    accessViewStatus?: string
    quoteSharingAllowed?: boolean
  }
}

export interface GoogleBooksSearchResponse {
  kind: string
  totalItems: number
  items?: GoogleBook[]
}

class GoogleBooksService {
  private readonly baseURL = 'https://www.googleapis.com/books/v1/volumes'
  
  /**
   * ✅ FONCTION CORRIGÉE : Obtenir le vrai auteur
   */
  private getCorrectAuthor(book: GoogleBook): string {
    console.log('📚 Getting author for:', book.volumeInfo.title)
    console.log('📚 Raw authors:', book.volumeInfo.authors)

    // 1. Auteur principal de l'API
    if (book.volumeInfo.authors && book.volumeInfo.authors.length > 0) {
      const mainAuthor = book.volumeInfo.authors[0]
      if (mainAuthor && mainAuthor.trim() !== '' && mainAuthor !== 'Unknown') {
        console.log('📚 ✅ Found author from API:', mainAuthor)
        return mainAuthor
      }
    }

    // 2. Mapping manuel pour les livres/auteurs populaires
    const titleLower = book.volumeInfo.title.toLowerCase()
    const mappings: { [key: string]: string } = {
      // Fiction populaire
      "harry potter and the philosopher's stone": "J.K. Rowling",
      "harry potter and the sorcerer's stone": "J.K. Rowling",
      "harry potter": "J.K. Rowling",
      "the hobbit": "J.R.R. Tolkien",
      "the lord of the rings": "J.R.R. Tolkien",
      "a song of ice and fire": "George R.R. Martin",
      "game of thrones": "George R.R. Martin",
      "1984": "George Orwell",
      "animal farm": "George Orwell",
      "pride and prejudice": "Jane Austen",
      "to kill a mockingbird": "Harper Lee",
      "the great gatsby": "F. Scott Fitzgerald",
      "the catcher in the rye": "J.D. Salinger",
      "dune": "Frank Herbert",
      
      // Non-fiction / Business / Développement personnel
      "atomic habits": "James Clear",
      "the 7 habits of highly effective people": "Stephen R. Covey",
      "thinking fast and slow": "Daniel Kahneman",
      "sapiens": "Yuval Noah Harari",
      "homo deus": "Yuval Noah Harari",
      "21 lessons for the 21st century": "Yuval Noah Harari",
      "the lean startup": "Eric Ries",
      "zero to one": "Peter Thiel",
      "good to great": "Jim Collins",
      "the art of war": "Sun Tzu",
      "the power of now": "Eckhart Tolle",
      
      // Science et technologie
      "a brief history of time": "Stephen Hawking",
      "the universe in a nutshell": "Stephen Hawking",
      "the code book": "Simon Singh",
      "freakonomics": "Steven D. Levitt",
      "the tipping point": "Malcolm Gladwell",
      "outliers": "Malcolm Gladwell",
      "blink": "Malcolm Gladwell",
      
      // Romans récents populaires
      "where the crawdads sing": "Delia Owens",
      "the silent patient": "Alex Michaelides",
      "it starts with us": "Colleen Hoover",
      "it ends with us": "Colleen Hoover",
      "the love hypothesis": "Ali Hazelwood",
      "project hail mary": "Andy Weir",
      "the martian": "Andy Weir",
      "ready player one": "Ernest Cline",
      "the midnight library": "Matt Haig",
      
      // Classiques de la littérature
      "to the lighthouse": "Virginia Woolf",
      "ulysses": "James Joyce",
      "one hundred years of solitude": "Gabriel García Márquez",
      "the brothers karamazov": "Fyodor Dostoevsky",
      "crime and punishment": "Fyodor Dostoevsky",
      "war and peace": "Leo Tolstoy",
      "anna karenina": "Leo Tolstoy"
    }

    // Chercher correspondances exactes puis partielles
    for (const [keyword, author] of Object.entries(mappings)) {
      if (titleLower.includes(keyword) || titleLower === keyword) {
        console.log('📚 📋 Found author via mapping:', author, 'for keyword:', keyword)
        return author
      }
    }

    console.log('📚 ❌ No author found, using fallback')
    return "Author" // ✅ Éviter "Unknown Author"
  }

  async searchBooks(query: string, maxResults: number = 20): Promise<GoogleBook[]> {
    try {
      const response = await fetch(
        `${this.baseURL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&printType=books&orderBy=relevance`
      )
      
      if (!response.ok) {
        throw new Error(`Google Books API Error: ${response.status}`)
      }
      
      const data: GoogleBooksSearchResponse = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Error searching books:', error)
      throw error
    }
  }

  async getBookDetails(bookId: string): Promise<GoogleBook | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/${bookId}`
      )
      
      if (!response.ok) {
        throw new Error(`Google Books API Error: ${response.status}`)
      }
      
      const book: GoogleBook = await response.json()
      return book
    } catch (error) {
      console.error('Error fetching book details:', error)
      return null
    }
  }

  async getBooksByCategory(category: string, maxResults: number = 20): Promise<GoogleBook[]> {
    try {
      const response = await fetch(
        `${this.baseURL}?q=subject:${encodeURIComponent(category)}&maxResults=${maxResults}&printType=books&orderBy=relevance`
      )
      
      if (!response.ok) {
        throw new Error(`Google Books API Error: ${response.status}`)
      }
      
      const data: GoogleBooksSearchResponse = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Error fetching books by category:', error)
      return []
    }
  }

  async getBestsellerBooks(): Promise<GoogleBook[]> {
    try {
      const response = await fetch(
        `${this.baseURL}?q=bestseller&maxResults=20&printType=books&orderBy=relevance`
      )
      
      if (!response.ok) {
        throw new Error(`Google Books API Error: ${response.status}`)
      }
      
      const data: GoogleBooksSearchResponse = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Error fetching bestseller books:', error)
      return []
    }
  }

  async getFictionBooks(): Promise<GoogleBook[]> {
    return this.getBooksByCategory('fiction')
  }

  async getNonFictionBooks(): Promise<GoogleBook[]> {
    return this.getBooksByCategory('biography')
  }

  async getNewReleases(): Promise<GoogleBook[]> {
    try {
      const currentYear = new Date().getFullYear()
      const response = await fetch(
        `${this.baseURL}?q=publishedDate:${currentYear}&maxResults=20&printType=books&orderBy=newest`
      )
      
      if (!response.ok) {
        throw new Error(`Google Books API Error: ${response.status}`)
      }
      
      const data: GoogleBooksSearchResponse = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return []
    }
  }

  getBestImageURL(book: GoogleBook, preferredSize: 'small' | 'medium' | 'large' = 'medium'): string | null {
    const imageLinks = book.volumeInfo.imageLinks
    if (!imageLinks) return null

    const sizePreferences = {
      small: ['thumbnail', 'smallThumbnail', 'small', 'medium'],
      medium: ['small', 'medium', 'thumbnail', 'large'],
      large: ['large', 'extraLarge', 'medium', 'small', 'thumbnail']
    }

    const preferences = sizePreferences[preferredSize]
    
    for (const size of preferences) {
      const url = imageLinks[size as keyof typeof imageLinks]
      if (url) {
        return url.replace('http://', 'https://').replace('&edge=curl', '')
      }
    }

    return null
  }

  getISBN(book: GoogleBook): string | null {
    const identifiers = book.volumeInfo.industryIdentifiers
    if (!identifiers) return null

    const isbn13 = identifiers.find(id => id.type === 'ISBN_13')
    if (isbn13) return isbn13.identifier

    const isbn10 = identifiers.find(id => id.type === 'ISBN_10')
    if (isbn10) return isbn10.identifier

    return null
  }

  getPublicationYear(book: GoogleBook): number {
    const publishedDate = book.volumeInfo.publishedDate
    if (!publishedDate) return new Date().getFullYear()

    const year = parseInt(publishedDate.split('-')[0])
    return isNaN(year) ? new Date().getFullYear() : year
  }

  cleanDescription(description: string): string {
    if (!description) return ''
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
  }

  /**
   * ✅ CONVERSION AU FORMAT APP AVEC AUTEUR CORRECT
   */
  convertToAppFormat(book: GoogleBook): any {
    const author = this.getCorrectAuthor(book) // ✅ UTILISE LA FONCTION CORRIGÉE
    
    console.log('📚 Converting book:', book.volumeInfo.title, 'Author:', author)
    
    return {
      id: `book-${book.id}`,
      title: book.volumeInfo.title || 'Unknown Title',
      author: author, // ✅ UTILISÉ directement
      year: this.getPublicationYear(book),
      rating: book.volumeInfo.averageRating ? Number(book.volumeInfo.averageRating.toFixed(1)) : 0,
      genre: book.volumeInfo.categories?.[0]?.split(' / ')[0] || 'Unknown',
      category: 'books' as const,
      image: this.getBestImageURL(book, 'medium'),
      
      // Données spécifiques aux livres
      subtitle: book.volumeInfo.subtitle,
      description: this.cleanDescription(book.volumeInfo.description || ''),
      publisher: book.volumeInfo.publisher,
      publishedDate: book.volumeInfo.publishedDate,
      pageCount: book.volumeInfo.pageCount,
      isbn: this.getISBN(book),
      language: book.volumeInfo.language,
      ratingsCount: book.volumeInfo.ratingsCount,
      previewLink: book.volumeInfo.previewLink,
      infoLink: book.volumeInfo.infoLink,
      canonicalVolumeLink: book.volumeInfo.canonicalVolumeLink,
      
      // Informations de vente
      isEbook: book.saleInfo?.isEbook || false,
      buyLink: book.saleInfo?.buyLink,
      price: book.saleInfo?.listPrice ? 
        `${book.saleInfo.listPrice.amount} ${book.saleInfo.listPrice.currencyCode}` : null,
      
      // Informations d'accès
      webReaderLink: book.accessInfo?.webReaderLink,
      epubAvailable: book.accessInfo?.epub?.isAvailable || false,
      pdfAvailable: book.accessInfo?.pdf?.isAvailable || false
    }
  }

  async getBooksByAuthor(author: string, maxResults: number = 10): Promise<GoogleBook[]> {
    try {
      const response = await fetch(
        `${this.baseURL}?q=inauthor:"${encodeURIComponent(author)}"&maxResults=${maxResults}&printType=books&orderBy=relevance`
      )
      
      if (!response.ok) {
        throw new Error(`Google Books API Error: ${response.status}`)
      }
      
      const data: GoogleBooksSearchResponse = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Error fetching books by author:', error)
      return []
    }
  }

  async getSimilarBooks(book: GoogleBook, maxResults: number = 6): Promise<GoogleBook[]> {
    try {
      const category = book.volumeInfo.categories?.[0] || 'fiction'
      const books = await this.getBooksByCategory(category, maxResults + 5)
      
      return books
        .filter(b => b.id !== book.id)
        .slice(0, maxResults)
    } catch (error) {
      console.error('Error fetching similar books:', error)
      return []
    }
  }
}

export const googleBooksService = new GoogleBooksService()

export const formatPageCount = (pageCount: number): string => {
  if (!pageCount) return 'Unknown'
  return `${pageCount} pages`
}

export const formatPublisher = (publisher: string, publishedDate: string): string => {
  if (!publisher && !publishedDate) return 'Unknown Publisher'
  if (!publisher) return publishedDate
  if (!publishedDate) return publisher
  
  const year = publishedDate.split('-')[0]
  return `${publisher} (${year})`
}

export const getReadingTime = (pageCount: number): string => {
  if (!pageCount) return 'Unknown'
  
  const wordsPerPage = 250
  const wordsPerMinute = 200
  const totalWords = pageCount * wordsPerPage
  const minutes = Math.round(totalWords / wordsPerMinute)
  
  if (minutes < 60) return `~${minutes} min read`
  
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `~${hours}h read`
  
  const days = Math.round(hours / 24)
  return `~${days} days read`
}
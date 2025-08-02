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
  
  // 📚 4 Livres quotidiens pour Hero Carousel
  async getDailyHeroBooks(): Promise<any[]> {
    try {
      console.log('📚 [GoogleBooks] Fetching daily hero books (4 per day rotation)... v2')
      
      const currentYear = new Date().getFullYear()
      
      // Combiner plusieurs sources pour diversité
      const [recentBooks, bestSellers, classicBooks] = await Promise.all([
        // Livres récents bien notés (2022+)
        this.searchBooks(`publishedDate:${currentYear-2}..${currentYear}&orderBy=relevance&maxResults=20`),
        // Best-sellers actuels
        this.searchBooks('subject:bestseller&orderBy=relevance&maxResults=15'),
        // Classiques intemporels bien notés
        this.searchBooks('subject:classic literature&orderBy=relevance&maxResults=15')
      ])
      
      // Combiner toutes les sources
      const allBooks = [
        ...(Array.isArray(recentBooks) ? recentBooks : []),
        ...(Array.isArray(bestSellers) ? bestSellers : []),
        ...(Array.isArray(classicBooks) ? classicBooks : [])
      ]
      
      const qualityBooks = allBooks
        .filter(book => {
          const publishYear = this.extractYear(book.volumeInfo.publishedDate)
          const rating = book.volumeInfo.averageRating || 0
          const ratingsCount = book.volumeInfo.ratingsCount || 0
          
          // Livres récents (2022+) OU classiques excellents
          const isRecentOrClassic = (publishYear >= 2022) || (rating >= 4.0 && publishYear <= 2021)
          
          // Score décent et popularité minimum
          const hasDecentScore = rating >= 3.8 || ratingsCount >= 50
          
          // Doit avoir une image et des auteurs
          const hasImage = book.volumeInfo.imageLinks?.thumbnail
          const hasAuthors = book.volumeInfo.authors && book.volumeInfo.authors.length > 0
          
          return isRecentOrClassic && hasDecentScore && hasImage && hasAuthors
        })
        .map(book => this.convertToAppFormat(book))
      
      // Déduplication par titre
      const uniqueBooks = this.deduplicateBooks(qualityBooks)
      
      // Sélection quotidienne déterministe
      const dailySelection = this.selectDailyBooks(uniqueBooks, 4)
      
      console.log(`📚 [GoogleBooks] Selected daily hero books:`, dailySelection.map(b => `${b.title} by ${b.author} (${b.year})`))
      
      return dailySelection.length >= 4 ? dailySelection : this.getFallbackHeroBooks()
      
    } catch (error) {
      console.error('📚 [GoogleBooks] Error fetching daily hero books:', error)
      return this.getFallbackHeroBooks()
    }
  }

  // Sélection quotidienne déterministe basée sur la date
  private selectDailyBooks(books: any[], count: number): any[] {
    if (books.length < count) return books
    
    // Utiliser la date comme seed pour avoir les mêmes livres toute la journée
    const today = new Date()
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    const seed = this.hashString(dateString)
    
    // Mélanger de façon déterministe
    const shuffled = [...books]
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

  // Déduplication des livres par titre similaire
  private deduplicateBooks(books: any[]): any[] {
    const seen = new Set<string>()
    return books.filter(book => {
      const cleanTitle = book.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seen.has(cleanTitle)) {
        return false
      }
      seen.add(cleanTitle)
      return true
    })
  }

  // Fallback : 4 livres premium sélectionnés avec vraies images Google Books
  private getFallbackHeroBooks(): any[] {
    const fallbackBooks = [
      {
        id: 'book-gb-hero-1',
        title: 'Fourth Wing',
        author: 'Rebecca Yarros',
        year: 2023,
        image: 'https://books.google.com/books/content?id=qbGsEAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
        category: 'books' as const,
        rating: 4.5,
        genre: 'Fantasy Romance',
        description: 'A thrilling fantasy romance that took the world by storm.'
      },
      {
        id: 'book-gb-hero-2',
        title: 'Tomorrow, and Tomorrow, and Tomorrow',
        author: 'Gabrielle Zevin',
        year: 2022,
        image: 'https://books.google.com/books/content?id=3_E5EAAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api',
        category: 'books' as const,
        rating: 4.3,
        genre: 'Literary Fiction',
        description: 'A novel about friendship, art, and the world of video game design.'
      },
      {
        id: 'book-gb-hero-3',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        year: 1960,
        image: 'https://books.google.com/books/content?id=PGR2AwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api',
        category: 'books' as const,
        rating: 4.8,
        genre: 'Classic Literature',
        description: 'A timeless classic exploring themes of justice and morality in the American South.'
      },
      {
        id: 'book-gb-hero-4',
        title: '1984',
        author: 'George Orwell',
        year: 1949,
        image: 'https://books.google.com/books/content?id=kotPYEqx7kMC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api',
        category: 'books' as const,
        rating: 4.7,
        genre: 'Dystopian Fiction',
        description: 'A dystopian masterpiece that remains more relevant than ever.'
      }
    ]

    // Appliquer la même logique de sélection quotidienne
    return this.selectDailyBooks(fallbackBooks, 4)
  }
  
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
    const titleLower = (book.volumeInfo.title || '').toLowerCase()
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
    if (!imageLinks) {
      console.log('📚 ❌ No imageLinks found for book:', book.volumeInfo.title)
      return null
    }

    const sizePreferences = {
      small: ['thumbnail', 'smallThumbnail', 'small', 'medium'],
      medium: ['small', 'medium', 'thumbnail', 'large'],
      large: ['large', 'extraLarge', 'medium', 'small', 'thumbnail']
    }

    const preferences = sizePreferences[preferredSize]
    
    for (const size of preferences) {
      const url = imageLinks[size as keyof typeof imageLinks]
      if (url) {
        console.log(`📚 ✅ Found ${size} image for:`, book.volumeInfo.title, url)
        
        // Améliorer la qualité de l'image Google Books
        let improvedUrl = url
          .replace('http://', 'https://')
          .replace('&edge=curl', '')
          .replace('zoom=5', 'zoom=1') // Meilleure qualité
          .replace('zoom=0', 'zoom=1')
        
        // Si c'est une URL Google Books, essayer d'obtenir une version plus grande
        if (improvedUrl.includes('books.google.com/books/content')) {
          improvedUrl = improvedUrl.replace(/zoom=\d/, 'zoom=2') // Zoom maximum
        }
        
        // Forcer une taille minimale de 300px
        if (improvedUrl.includes('books.googleusercontent.com')) {
          improvedUrl = improvedUrl.replace(/&w=\d+/, '&w=400').replace(/&h=\d+/, '&h=600')
        }
        
        console.log('📚 ✅ Final improved URL:', improvedUrl)
        return improvedUrl
      }
    }

    console.log('📚 ❌ No valid image URL found for book:', book.volumeInfo.title)
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
      // Remove all HTML tags (including self-closing and nested)
      .replace(/<[^>]*>/g, '')
      // Clean HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&ndash;/g, '-')
      .replace(/&mdash;/g, '-')
      .replace(/&hellip;/g, '...')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      // Clean up extra whitespace and line breaks
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
  }

  /**
   * ✅ CONVERSION AU FORMAT APP AVEC AUTEUR CORRECT
   */
  convertToAppFormat(book: GoogleBook): any {
    const author = this.getCorrectAuthor(book) // ✅ UTILISE LA FONCTION CORRIGÉE
    const imageUrl = this.getBestImageURL(book, 'large') // Utiliser 'large' pour meilleure qualité
    
    console.log('📚 Converting book:', book.volumeInfo.title, 'Author:', author, 'Image:', imageUrl ? 'YES' : 'NO')
    
    return {
      id: `book-${book.id}`,
      title: book.volumeInfo.title || 'Unknown Title',
      author: author, // ✅ UTILISÉ directement
      year: this.getPublicationYear(book),
      rating: book.volumeInfo.averageRating ? Number(book.volumeInfo.averageRating.toFixed(1)) : 0,
      genre: book.volumeInfo.categories?.[0]?.split(' / ')[0] || 'Unknown',
      category: 'books' as const,
      image: imageUrl,
      
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
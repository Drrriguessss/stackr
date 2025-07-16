// Service pour l'API Google Books
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
  
  // Rechercher des livres
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

  // Obtenir les détails d'un livre
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

  // Obtenir des livres populaires par catégorie
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

  // Obtenir des bestsellers (simulation avec des livres populaires)
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

  // Obtenir des livres de fiction populaires
  async getFictionBooks(): Promise<GoogleBook[]> {
    return this.getBooksByCategory('fiction')
  }

  // Obtenir des livres de non-fiction populaires
  async getNonFictionBooks(): Promise<GoogleBook[]> {
    return this.getBooksByCategory('biography')
  }

  // Obtenir des nouveautés
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

  // Obtenir la meilleure image disponible
  getBestImageURL(book: GoogleBook, preferredSize: 'small' | 'medium' | 'large' = 'medium'): string | null {
    const imageLinks = book.volumeInfo.imageLinks
    if (!imageLinks) return null

    // Ordre de préférence pour chaque taille
    const sizePreferences = {
      small: ['thumbnail', 'smallThumbnail', 'small', 'medium'],
      medium: ['small', 'medium', 'thumbnail', 'large'],
      large: ['large', 'extraLarge', 'medium', 'small', 'thumbnail']
    }

    const preferences = sizePreferences[preferredSize]
    
    for (const size of preferences) {
      const url = imageLinks[size as keyof typeof imageLinks]
      if (url) {
        // Convertir en HTTPS et augmenter la qualité si possible
        return url.replace('http://', 'https://').replace('&edge=curl', '')
      }
    }

    return null
  }

  // Extraire l'ISBN d'un livre
  getISBN(book: GoogleBook): string | null {
    const identifiers = book.volumeInfo.industryIdentifiers
    if (!identifiers) return null

    // Préférer ISBN_13, puis ISBN_10
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13')
    if (isbn13) return isbn13.identifier

    const isbn10 = identifiers.find(id => id.type === 'ISBN_10')
    if (isbn10) return isbn10.identifier

    return null
  }

  // Extraire l'année de publication
  getPublicationYear(book: GoogleBook): number {
    const publishedDate = book.volumeInfo.publishedDate
    if (!publishedDate) return new Date().getFullYear()

    // publishedDate peut être "YYYY", "YYYY-MM", ou "YYYY-MM-DD"
    const year = parseInt(publishedDate.split('-')[0])
    return isNaN(year) ? new Date().getFullYear() : year
  }

  // Nettoyer la description (enlever les balises HTML)
  cleanDescription(description: string): string {
    if (!description) return ''
    return description
      .replace(/<[^>]*>/g, '') // Enlever les balises HTML
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
  }

  // Convertir un livre Google Books vers le format de l'app
  convertToAppFormat(book: GoogleBook): any {
    const volumeInfo = book.volumeInfo
    
    return {
      id: `book-${book.id}`,
      title: volumeInfo.title || 'Unknown Title',
      author: volumeInfo.authors?.[0] || 'Unknown Author',
      year: this.getPublicationYear(book),
      rating: volumeInfo.averageRating ? Number(volumeInfo.averageRating.toFixed(1)) : 0,
      genre: volumeInfo.categories?.[0]?.split(' / ')[0] || 'Unknown',
      category: 'books' as const,
      image: this.getBestImageURL(book, 'medium'),
      
      // Données spécifiques aux livres
      subtitle: volumeInfo.subtitle,
      description: this.cleanDescription(volumeInfo.description || ''),
      publisher: volumeInfo.publisher,
      publishedDate: volumeInfo.publishedDate,
      pageCount: volumeInfo.pageCount,
      isbn: this.getISBN(book),
      language: volumeInfo.language,
      ratingsCount: volumeInfo.ratingsCount,
      previewLink: volumeInfo.previewLink,
      infoLink: volumeInfo.infoLink,
      canonicalVolumeLink: volumeInfo.canonicalVolumeLink,
      
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

  // Obtenir des livres recommandés basés sur un auteur
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

  // Obtenir des livres similaires basés sur la catégorie
  async getSimilarBooks(book: GoogleBook, maxResults: number = 6): Promise<GoogleBook[]> {
    try {
      const category = book.volumeInfo.categories?.[0] || 'fiction'
      const books = await this.getBooksByCategory(category, maxResults + 5)
      
      // Filtrer le livre actuel et retourner les autres
      return books
        .filter(b => b.id !== book.id)
        .slice(0, maxResults)
    } catch (error) {
      console.error('Error fetching similar books:', error)
      return []
    }
  }
}

// Instance singleton
export const googleBooksService = new GoogleBooksService()

// Fonctions utilitaires
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
  
  // Estimation : 250 mots par page, 200 mots par minute
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
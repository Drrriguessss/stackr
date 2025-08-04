// Service pour extraire les citations de livres depuis plusieurs sources
export interface BookQuote {
  id: string
  text: string
  book?: string
  author?: string
  page?: number
  chapter?: string
  source: 'recite' | 'quotable' | 'google_books' | 'goodreads' | 'local'
  length: number
  words: number
  tags?: string[]
  likes?: number
  confidence: number // 0-1, confiance dans l'authenticité
}

class BookQuotesService {
  private quotesCache: Map<string, BookQuote[]> = new Map()
  
  // Combinaison de plusieurs APIs de citations + scraping éthique
  async getBookQuotes(bookTitle: string, author: string, isbn?: string): Promise<BookQuote[]> {
    try {
      console.log('📖 [Quotes] Searching quotes for:', bookTitle, 'by', author)
      
      const cacheKey = `${bookTitle}-${author}-${isbn || 'no-isbn'}`
      if (this.quotesCache.has(cacheKey)) {
        console.log('📖 [Quotes] Returning cached quotes')
        return this.quotesCache.get(cacheKey)!
      }

      const quotes: BookQuote[] = []
      
      // 1. API Recite (spécialisée livres) - GRATUIT
      try {
        const reciteQuotes = await this.searchReciteAPI(bookTitle, author)
        quotes.push(...reciteQuotes)
        console.log('📖 [Recite] Found', reciteQuotes.length, 'quotes')
      } catch (error) {
        console.log('📖 [Recite] API failed:', error)
      }
      
      // 2. API Quotable (généraliste mais inclut auteurs) - GRATUIT
      try {
        const quotableQuotes = await this.searchQuotableAPI(author)
        quotes.push(...quotableQuotes)
        console.log('📖 [Quotable] Found', quotableQuotes.length, 'quotes')
      } catch (error) {
        console.log('📖 [Quotable] API failed:', error)
      }
      
      // 3. Citations depuis Google Books preview
      if (isbn) {
        try {
          const previewQuotes = await this.extractFromGoogleBooksPreview(isbn, bookTitle, author)
          quotes.push(...previewQuotes)
          console.log('📖 [Google Books] Found', previewQuotes.length, 'quotes')
        } catch (error) {
          console.log('📖 [Google Books] preview extraction failed:', error)
        }
      }
      
      // 4. Base de données locale pour livres populaires
      const localQuotes = this.getLocalQuotes(bookTitle, author)
      if (localQuotes.length > 0) {
        quotes.push(...localQuotes)
        console.log('📖 [Local DB] Found', localQuotes.length, 'verified quotes')
      }
      
      // Déduplication et tri par confiance
      const uniqueQuotes = this.deduplicateQuotes(quotes)
        .filter(quote => quote.confidence >= 0.6) // Seuil de confiance
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8) // Maximum 8 citations
      
      // Mise en cache
      if (uniqueQuotes.length > 0) {
        this.quotesCache.set(cacheKey, uniqueQuotes)
      }
      
      console.log('📖 [Quotes] Total quotes found:', uniqueQuotes.length)
      return uniqueQuotes
      
    } catch (error) {
      console.error('📖 [Quotes] Error searching quotes:', error)
      return []
    }
  }

  // API Recite - spécialisée citations de livres
  private async searchReciteAPI(bookTitle: string, author: string): Promise<BookQuote[]> {
    try {
      // Recherche par livre
      let response = await fetch(`https://recite-api.vercel.app/api/quotes?book=${encodeURIComponent(bookTitle)}`)
      let data = await response.json()
      
      let quotes: BookQuote[] = []
      if (data.success && data.quotes) {
        quotes = data.quotes.map((quote: any, index: number) => ({
          id: `recite-book-${index}`,
          text: quote.quote,
          book: quote.book,
          author: quote.author,
          source: 'recite' as const,
          length: quote.length || quote.quote.length,
          words: quote.words || quote.quote.split(' ').length,
          confidence: 0.9
        }))
      }
      
      // Si pas de résultats par livre, essayer par auteur
      if (quotes.length === 0) {
        response = await fetch(`https://recite-api.vercel.app/api/quotes?author=${encodeURIComponent(author)}`)
        data = await response.json()
        
        if (data.success && data.quotes) {
          quotes = data.quotes.map((quote: any, index: number) => ({
            id: `recite-author-${index}`,
            text: quote.quote,
            book: quote.book,
            author: quote.author,
            source: 'recite' as const,
            length: quote.length || quote.quote.length,
            words: quote.words || quote.quote.split(' ').length,
            confidence: 0.8
          }))
        }
      }
      
      return quotes.slice(0, 5) // Limiter à 5 citations
    } catch (error) {
      console.log('📖 [Recite] API error:', error)
      return []
    }
  }

  // API Quotable - citations générales par auteur
  private async searchQuotableAPI(author: string): Promise<BookQuote[]> {
    try {
      const response = await fetch(`https://api.quotable.io/quotes?author=${encodeURIComponent(author)}&limit=5`)
      const data = await response.json()
      
      return data.results?.map((quote: any, index: number) => ({
        id: `quotable-${index}`,
        text: quote.content,
        author: quote.author,
        tags: quote.tags,
        source: 'quotable' as const,
        length: quote.length,
        words: quote.content.split(' ').length,
        confidence: 0.7
      })) || []
    } catch (error) {
      console.log('📖 [Quotable] API error:', error)
      return []
    }
  }

  // Extraction depuis Google Books preview
  private async extractFromGoogleBooksPreview(isbn: string, bookTitle: string, author: string): Promise<BookQuote[]> {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
      const data = await response.json()
      
      if (data.items && data.items[0]) {
        const book = data.items[0].volumeInfo
        const quotes: BookQuote[] = []
        
        // Extraire citations depuis description
        if (book.description) {
          const extractedQuotes = this.extractQuotesFromText(book.description)
          quotes.push(...extractedQuotes.map((quote, index) => ({
            id: `google-books-${index}`,
            text: quote,
            book: bookTitle,
            author: author,
            source: 'google_books' as const,
            length: quote.length,
            words: quote.split(' ').length,
            confidence: 0.6
          })))
        }
        
        return quotes
      }
    } catch (error) {
      console.log('📖 [Google Books] preview error:', error)
    }
    
    return []
  }

  // Fonction utilitaire pour extraire citations du texte
  private extractQuotesFromText(text: string): string[] {
    const quotes: string[] = []
    
    // Regex pour détecter citations entre guillemets
    const quotePatterns = [
      /"([^"]{30,200})"/g,  // Citations entre guillemets doubles
      /'([^']{30,200})'/g,  // Citations entre guillemets simples
      /«([^»]{30,200})»/g,  // Citations françaises
      /["""]([^"""]{30,200})["""]/g,  // Citations typographiques
    ]
    
    quotePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const quote = match[1].trim()
        if (quote.length >= 30 && quote.length <= 200) {
          quotes.push(quote)
        }
      }
    })
    
    return quotes
  }

  // Base de données locale pour livres populaires avec citations vérifiées
  private getLocalQuotes(bookTitle: string, author: string): BookQuote[] {
    const normalizedTitle = this.normalizeForSearch(bookTitle)
    const normalizedAuthor = this.normalizeForSearch(author)
    
    // Base de données de citations vérifiées pour livres populaires
    const VERIFIED_QUOTES: Record<string, BookQuote[]> = {
      'harry-potter': [
        {
          id: 'hp-local-1',
          text: "It does not do to dwell on dreams and forget to live.",
          book: "Harry Potter and the Philosopher's Stone",
          author: "J.K. Rowling",
          source: 'local',
          length: 48,
          words: 10,
          confidence: 1.0
        },
        {
          id: 'hp-local-2',
          text: "Happiness can be found, even in the darkest of times, if one only remembers to turn on the light.",
          book: "Harry Potter and the Prisoner of Azkaban",
          author: "J.K. Rowling",
          source: 'local',
          length: 95,
          words: 18,
          confidence: 1.0
        }
      ],
      'to-kill-mockingbird': [
        {
          id: 'tkam-local-1',
          text: "You never really understand a person until you consider things from his point of view... Until you climb inside of his skin and walk around in it.",
          book: "To Kill a Mockingbird",
          author: "Harper Lee",
          source: 'local',
          length: 147,
          words: 26,
          confidence: 1.0
        }
      ],
      '1984': [
        {
          id: '1984-local-1',
          text: "Big Brother is watching you.",
          book: "1984",
          author: "George Orwell",
          source: 'local',
          length: 26,
          words: 5,
          confidence: 1.0
        },
        {
          id: '1984-local-2',
          text: "War is peace. Freedom is slavery. Ignorance is strength.",
          book: "1984",
          author: "George Orwell",
          source: 'local',
          length: 56,
          words: 8,
          confidence: 1.0
        }
      ],
      'pride-prejudice': [
        {
          id: 'pp-local-1',
          text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
          book: "Pride and Prejudice",
          author: "Jane Austen",
          source: 'local',
          length: 114,
          words: 21,
          confidence: 1.0
        }
      ]
    }
    
    // Recherche par titre et auteur
    const quotes: BookQuote[] = []
    
    // Recherche exacte par titre
    if (VERIFIED_QUOTES[normalizedTitle]) {
      quotes.push(...VERIFIED_QUOTES[normalizedTitle])
    }
    
    // Recherche partielle pour séries (comme Harry Potter)
    const titleWords = normalizedTitle.split('-').filter(word => word.length > 3)
    titleWords.forEach(word => {
      Object.keys(VERIFIED_QUOTES).forEach(key => {
        if (key.includes(word)) {
          quotes.push(...VERIFIED_QUOTES[key])
        }
      })
    })
    
    return this.deduplicateQuotes(quotes)
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

  // Déduplication des citations
  private deduplicateQuotes(quotes: BookQuote[]): BookQuote[] {
    const seen = new Set<string>()
    return quotes.filter(quote => {
      const key = quote.text.toLowerCase().replace(/[^\w]/g, '')
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Nettoyer le cache
  clearCache(): void {
    this.quotesCache.clear()
    console.log('📖 [Quotes] Cache cleared')
  }
}

export const bookQuotesService = new BookQuotesService()
export type { BookQuote }
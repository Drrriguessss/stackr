// Service simplifié pour les citations de livres - utilise uniquement la base locale
export interface BookQuote {
  id: string
  text: string
  book?: string
  author?: string
  page?: number
  chapter?: string
  source: 'local'
  length: number
  words: number
  confidence: number
}

class BookQuotesServiceSimple {
  private quotesCache: Map<string, BookQuote[]> = new Map()

  async getBookQuotes(bookTitle: string, author: string, isbn?: string): Promise<BookQuote[]> {
    try {
      console.log('📖 [Quotes] Searching quotes for:', bookTitle, 'by', author)
      
      const cacheKey = `${bookTitle}-${author}-${isbn || 'no-isbn'}`
      if (this.quotesCache.has(cacheKey)) {
        console.log('📖 [Quotes] Returning cached quotes')
        return this.quotesCache.get(cacheKey)!
      }

      const quotes: BookQuote[] = []
      
      // Base de données locale pour livres populaires avec citations vérifiées
      const localQuotes = this.getLocalQuotes(bookTitle, author)
      if (localQuotes.length > 0) {
        quotes.push(...localQuotes)
        console.log('📖 [Local DB] Found', localQuotes.length, 'verified quotes')
      }
      
      // Déduplication et tri par confiance
      const uniqueQuotes = this.deduplicateQuotes(quotes)
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

  // Base de données locale pour livres populaires avec citations vérifiées
  private getLocalQuotes(bookTitle: string, author: string): BookQuote[] {
    const normalizedTitle = this.normalizeForSearch(bookTitle)
    const normalizedAuthor = this.normalizeForSearch(author)
    
    // Base de données de citations vérifiées pour livres spécifiques
    const VERIFIED_QUOTES: Record<string, BookQuote[]> = {
      // Harry Potter - citations spécifiques par livre
      'harry-potter-philosophers-stone': [
        {
          id: 'hp-ps-1',
          text: "It does not do to dwell on dreams and forget to live.",
          book: "Harry Potter and the Philosopher's Stone",
          author: "J.K. Rowling",
          chapter: "Chapter 12",
          source: 'local',
          length: 48,
          words: 10,
          confidence: 1.0
        }
      ],
      'harry-potter-chamber-secrets': [
        {
          id: 'hp-cs-1',
          text: "It is our choices, Harry, that show what we truly are, far more than our abilities.",
          book: "Harry Potter and the Chamber of Secrets",
          author: "J.K. Rowling",
          chapter: "Chapter 18",
          source: 'local',
          length: 82,
          words: 16,
          confidence: 1.0
        }
      ],
      'harry-potter-prisoner-azkaban': [
        {
          id: 'hp-pa-1',
          text: "Happiness can be found, even in the darkest of times, if one only remembers to turn on the light.",
          book: "Harry Potter and the Prisoner of Azkaban",
          author: "J.K. Rowling",
          chapter: "Chapter 15",
          source: 'local',
          length: 95,
          words: 18,
          confidence: 1.0
        }
      ],
      'harry-potter-goblet-fire': [
        {
          id: 'hp-gf-1',
          text: "Remember, if the time should come when you have to make a choice between what is right and what is easy, remember what happened to a boy who was good, and kind, and brave.",
          book: "Harry Potter and the Goblet of Fire",
          author: "J.K. Rowling",
          chapter: "Chapter 37",
          source: 'local',
          length: 167,
          words: 32,
          confidence: 1.0
        }
      ],
      'harry-potter-order-phoenix': [
        {
          id: 'hp-op-1',
          text: "We've all got both light and dark inside us. What matters is the part we choose to act on. That's who we really are.",
          book: "Harry Potter and the Order of the Phoenix",
          author: "J.K. Rowling",
          chapter: "Chapter 36",
          source: 'local',
          length: 118,
          words: 22,
          confidence: 1.0
        }
      ],
      'harry-potter-half-blood-prince': [
        {
          id: 'hp-hbp-1',
          text: "It is the unknown we fear when we look upon death and darkness, nothing more.",
          book: "Harry Potter and the Half-Blood Prince",
          author: "J.K. Rowling",
          chapter: "Chapter 26",
          source: 'local',
          length: 77,
          words: 15,
          confidence: 1.0
        },
        {
          id: 'hp-hbp-2',
          text: "Age is foolish and forgetful when it underestimates youth.",
          book: "Harry Potter and the Half-Blood Prince",
          author: "J.K. Rowling",
          chapter: "Chapter 10",
          source: 'local',
          length: 57,
          words: 9,
          confidence: 1.0
        }
      ],
      'harry-potter-deathly-hallows': [
        {
          id: 'hp-dh-1',
          text: "Of course it is happening inside your head, Harry, but why on earth should that mean that it is not real?",
          book: "Harry Potter and the Deathly Hallows",
          author: "J.K. Rowling",
          chapter: "Chapter 35",
          source: 'local',
          length: 104,
          words: 19,
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
        },
        {
          id: 'tkam-local-2',
          text: "People generally see what they look for, and hear what they listen for.",
          book: "To Kill a Mockingbird",
          author: "Harper Lee",
          source: 'local',
          length: 71,
          words: 13,
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
        },
        {
          id: '1984-local-3',
          text: "The best books... are those that tell you what you know already.",
          book: "1984",
          author: "George Orwell",
          source: 'local',
          length: 63,
          words: 12,
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
        },
        {
          id: 'pp-local-2',
          text: "I declare after all there is no enjoyment like reading! How much sooner one tires of any thing than of a book!",
          book: "Pride and Prejudice",
          author: "Jane Austen",
          source: 'local',
          length: 109,
          words: 20,
          confidence: 1.0
        }
      ]
    }
    
    // Recherche par titre exact d'abord
    const quotes: BookQuote[] = []
    
    console.log('📖 [Quotes] Searching for normalized title:', normalizedTitle)
    console.log('📖 [Quotes] Available keys:', Object.keys(VERIFIED_QUOTES))
    
    // 1. Recherche exacte par titre complet
    if (VERIFIED_QUOTES[normalizedTitle]) {
      quotes.push(...VERIFIED_QUOTES[normalizedTitle])
      console.log('📖 [Quotes] Found exact match for:', normalizedTitle)
    }
    
    // 2. Recherche spécifique pour Harry Potter (mapping des titres)
    const harryPotterMappings: Record<string, string> = {
      'harry-potter-philosophers-stone': 'harry-potter-philosophers-stone',
      'harry-potter-sorcerers-stone': 'harry-potter-philosophers-stone',
      'harry-potter-chamber-secrets': 'harry-potter-chamber-secrets',
      'harry-potter-prisoner-azkaban': 'harry-potter-prisoner-azkaban',
      'harry-potter-goblet-fire': 'harry-potter-goblet-fire',
      'harry-potter-order-phoenix': 'harry-potter-order-phoenix',
      'harry-potter-half-blood-prince': 'harry-potter-half-blood-prince',
      'harry-potter-deathly-hallows': 'harry-potter-deathly-hallows'
    }
    
    // Chercher dans les mappings Harry Potter
    Object.keys(harryPotterMappings).forEach(key => {
      if (normalizedTitle.includes(key.replace('harry-potter-', '')) && normalizedTitle.includes('harry')) {
        const mappedKey = harryPotterMappings[key]
        if (VERIFIED_QUOTES[mappedKey]) {
          quotes.push(...VERIFIED_QUOTES[mappedKey])
          console.log('📖 [Quotes] Found Harry Potter match:', mappedKey, 'for title:', normalizedTitle)
        }
      }
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

export const bookQuotesService = new BookQuotesServiceSimple()
export type { BookQuote }
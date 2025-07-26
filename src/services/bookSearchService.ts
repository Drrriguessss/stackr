// src/services/bookSearchService.ts - Service pour mapper les noms de livres vers Google Books
import { fetchWithCache } from '@/utils/apiCache'
import { googleBooksService } from './googleBooksService'

interface GoogleBook {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publishedDate?: string
    averageRating?: number
    ratingsCount?: number
    imageLinks?: {
      thumbnail?: string
      small?: string
      medium?: string
    }
  }
}

class BookSearchService {
  
  // 🔍 Rechercher un livre Google Books par nom et retourner l'ID
  async searchBookByName(bookTitle: string, author?: string): Promise<string | null> {
    try {
      console.log('🔍 [BookSearch] Searching Google Books for:', bookTitle, author ? `by ${author}` : '')
      
      // Construire la requête de recherche
      let searchQuery = this.prepareSearchQuery(bookTitle)
      if (author) {
        searchQuery += ` inauthor:"${author}"`
      }
      
      // Utiliser le service Google Books existant
      const results = await googleBooksService.searchBooks(searchQuery, 10)
      
      if (!results || results.length === 0) {
        console.log('❌ [BookSearch] No results found for:', bookTitle)
        return null
      }

      // Trouver la meilleure correspondance
      const bestMatch = this.findBestMatch(bookTitle, author, results)
      
      if (bestMatch && bestMatch.id) {
        console.log('✅ [BookSearch] Found match:', bestMatch.volumeInfo.title, '→ ID:', bestMatch.id)
        return bestMatch.id
      }

      console.log('❌ [BookSearch] No good match found for:', bookTitle)
      return null
      
    } catch (error) {
      console.error('❌ [BookSearch] Error searching book:', error)
      return null
    }
  }
  
  // Préparer la requête de recherche (nettoyer le titre)
  private prepareSearchQuery(title: string): string {
    return title
      .replace(/™|®|©/g, '') // Supprimer symboles de marque
      .replace(/\s*-\s*(Book \d+|Volume \d+|Part \d+).*$/i, '') // Supprimer numéros de série
      .replace(/\s*\(.*\)$/g, '') // Supprimer contenu entre parenthèses
      .replace(/[:\-–—]/g, ' ') // Remplacer ponctuation par espaces
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
  }
  
  // Trouver la meilleure correspondance parmi les résultats
  private findBestMatch(originalTitle: string, originalAuthor: string | undefined, results: GoogleBook[]): GoogleBook | null {
    if (results.length === 0) return null
    
    const cleanOriginalTitle = originalTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    const cleanOriginalAuthor = originalAuthor?.toLowerCase().replace(/[^a-z0-9\s]/g, '') || ''
    
    let bestMatch: GoogleBook | null = null
    let bestScore = 0
    
    for (const book of results) {
      const score = this.calculateMatchScore(cleanOriginalTitle, cleanOriginalAuthor, book)
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = book
      }
    }
    
    // Seuil minimum de correspondance
    if (bestScore >= 0.6) {
      return bestMatch
    }
    
    console.log('❌ [BookSearch] Best score too low:', bestScore, 'for', originalTitle)
    return null
  }
  
  // Calculer un score de correspondance (0-1)
  private calculateMatchScore(originalTitle: string, originalAuthor: string, book: GoogleBook): number {
    const bookTitle = book.volumeInfo.title.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    const bookAuthors = book.volumeInfo.authors?.map(a => a.toLowerCase().replace(/[^a-z0-9\s]/g, '')) || []
    
    let score = 0
    
    // 1. Correspondance du titre (facteur principal)
    if (originalTitle === bookTitle) {
      score += 0.6 // Correspondance exacte
    } else {
      // Correspondance par mots-clés
      const originalWords = originalTitle.split(' ').filter(w => w.length > 2)
      const bookWords = bookTitle.split(' ')
      
      if (originalWords.length > 0) {
        let matchingWords = 0
        for (const word of originalWords) {
          if (bookWords.some(bw => bw.includes(word) || word.includes(bw))) {
            matchingWords++
          }
        }
        score += (matchingWords / originalWords.length) * 0.5
      }
    }
    
    // 2. Correspondance de l'auteur (bonus important)
    if (originalAuthor && bookAuthors.length > 0) {
      const authorMatch = bookAuthors.some(author => 
        author.includes(originalAuthor) || originalAuthor.includes(author)
      )
      if (authorMatch) {
        score += 0.3
      }
    }
    
    // 3. Bonus pour les livres avec bonnes notes
    const rating = book.volumeInfo.averageRating || 0
    const ratingsCount = book.volumeInfo.ratingsCount || 0
    
    if (rating >= 4.0 && ratingsCount >= 100) {
      score += 0.05
    }
    
    // 4. Bonus pour les livres avec images
    if (book.volumeInfo.imageLinks?.thumbnail) {
      score += 0.05
    }
    
    return Math.min(1.0, score)
  }
}

// Export singleton
export const bookSearchService = new BookSearchService()
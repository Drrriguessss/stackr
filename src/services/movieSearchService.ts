// src/services/movieSearchService.ts - Service pour mapper les noms de films vers OMDB
import { fetchWithCache } from '@/utils/apiCache'
import { omdbService } from './omdbService'

interface OMDBMovie {
  imdbID: string
  Title: string
  Year: string
  Type: string
  Poster: string
}

class MovieSearchService {
  
  // 🔍 Rechercher un film OMDB par nom et retourner l'ID IMDB
  async searchMovieByName(movieTitle: string): Promise<string | null> {
    try {
      console.log('🔍 [MovieSearch] Searching OMDB for:', movieTitle)
      
      // Nettoyer le titre pour la recherche
      const cleanTitle = this.prepareSearchQuery(movieTitle)
      
      // Utiliser le service OMDB existant
      const results = await omdbService.searchMovies(cleanTitle)
      
      if (!results || results.length === 0) {
        console.log('❌ [MovieSearch] No results found for:', movieTitle)
        return null
      }

      // Trouver la meilleure correspondance
      const bestMatch = this.findBestMatch(movieTitle, results)
      
      if (bestMatch && bestMatch.imdbID) {
        // ✅ GARDER le préfixe 'tt' car OMDB en a besoin !
        console.log('✅ [MovieSearch] Found match:', bestMatch.Title, '→ ID:', bestMatch.imdbID)
        return bestMatch.imdbID
      }

      console.log('❌ [MovieSearch] No good match found for:', movieTitle)
      return null
      
    } catch (error) {
      console.error('❌ [MovieSearch] Error searching movie:', error)
      return null
    }
  }
  
  // Préparer la requête de recherche (nettoyer le titre)
  private prepareSearchQuery(title: string): string {
    return title
      .replace(/™|®|©/g, '') // Supprimer symboles de marque
      .replace(/\s*-\s*(Extended|Director's Cut|Special Edition|Uncut|Redux).*$/i, '') // Supprimer éditions spéciales
      .replace(/\s*\(.*\)$/g, '') // Supprimer contenu entre parenthèses
      .replace(/[:\-–—]/g, ' ') // Remplacer ponctuation par espaces
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
  }
  
  // Trouver la meilleure correspondance parmi les résultats
  private findBestMatch(originalTitle: string, results: OMDBMovie[]): OMDBMovie | null {
    if (results.length === 0) return null
    
    const cleanOriginal = originalTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    let bestMatch: OMDBMovie | null = null
    let bestScore = 0
    
    for (const movie of results) {
      const score = this.calculateMatchScore(cleanOriginal, movie)
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = movie
      }
    }
    
    // Seuil minimum de correspondance
    if (bestScore >= 0.6) {
      return bestMatch
    }
    
    console.log('❌ [MovieSearch] Best score too low:', bestScore, 'for', originalTitle)
    return null
  }
  
  // Calculer un score de correspondance (0-1)
  private calculateMatchScore(originalTitle: string, movie: OMDBMovie): number {
    const movieTitle = movie.Title.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    
    // Correspondance exacte
    if (originalTitle === movieTitle) {
      return 1.0
    }
    
    // Correspondance par mots-clés
    const originalWords = originalTitle.split(' ').filter(w => w.length > 2)
    const movieWords = movieTitle.split(' ')
    
    if (originalWords.length === 0) return 0
    
    let matchingWords = 0
    for (const word of originalWords) {
      if (movieWords.some(mw => mw.includes(word) || word.includes(mw))) {
        matchingWords++
      }
    }
    
    const wordScore = matchingWords / originalWords.length
    
    // Bonus pour les films (vs séries)
    const typeBonus = movie.Type === 'movie' ? 0.1 : 0
    
    // Bonus pour année récente (éviter les très vieux films homonymes)
    const year = parseInt(movie.Year) || 0
    const yearBonus = year >= 1990 ? 0.05 : 0
    
    return Math.min(1.0, wordScore + typeBonus + yearBonus)
  }
}

// Export singleton
export const movieSearchService = new MovieSearchService()
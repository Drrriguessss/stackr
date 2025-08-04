// src/services/movieCorrelationService.ts - Service pour corréler TMDB et OMDB
import { omdbService } from './omdbService'

export interface CorrelationResult {
  omdbId: string | null
  title: string
  year: number
  confidence: number
}

class MovieCorrelationService {
  // 🎬 Corréler un film TMDB vers OMDB
  async correlateTMDBtoOMDB(tmdbMovie: any): Promise<CorrelationResult> {
    try {
      console.log('🔗 [Correlation] Correlating TMDB movie:', tmdbMovie.title, tmdbMovie.year)
      
      // Nettoyer le titre pour la recherche
      const cleanTitle = this.cleanTitleForSearch(tmdbMovie.title)
      const movieYear = tmdbMovie.year || new Date(tmdbMovie.release_date).getFullYear()
      
      console.log('🔍 [Correlation] Searching OMDB for:', cleanTitle, movieYear)
      
      // Rechercher dans OMDB par titre
      const omdbResults = await omdbService.searchMovies(cleanTitle)
      
      if (!omdbResults || omdbResults.length === 0) {
        console.log('❌ [Correlation] No OMDB results found for:', cleanTitle)
        return {
          omdbId: null,
          title: tmdbMovie.title,
          year: movieYear,
          confidence: 0
        }
      }
      
      // Trouver la meilleure correspondance
      const bestMatch = this.findBestMatch(tmdbMovie, omdbResults, movieYear)
      
      if (bestMatch) {
        console.log('✅ [Correlation] Found match:', bestMatch.Title, '→ OMDB ID:', bestMatch.imdbID)
        return {
          omdbId: bestMatch.imdbID,
          title: bestMatch.Title,
          year: parseInt(bestMatch.Year),
          confidence: this.calculateConfidence(tmdbMovie, bestMatch)
        }
      }
      
      console.log('❌ [Correlation] No good match found for:', tmdbMovie.title)
      return {
        omdbId: null,
        title: tmdbMovie.title,
        year: movieYear,
        confidence: 0
      }
      
    } catch (error) {
      console.error('❌ [Correlation] Error correlating movie:', error)
      return {
        omdbId: null,
        title: tmdbMovie.title,
        year: tmdbMovie.year || 2024,
        confidence: 0
      }
    }
  }

  // Nettoyer le titre pour la recherche
  private cleanTitleForSearch(title: string): string {
    return title
      .replace(/[:\-–—]/g, ' ') // Remplacer ponctuation par espaces
      .replace(/\s*\(.*\)$/g, '') // Supprimer parenthèses en fin
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
  }

  // Trouver la meilleure correspondance parmi les résultats OMDB
  private findBestMatch(tmdbMovie: any, omdbResults: any[], targetYear: number): any | null {
    let bestMatch: any = null
    let bestScore = 0
    
    for (const omdbMovie of omdbResults) {
      const score = this.calculateMatchScore(tmdbMovie, omdbMovie, targetYear)
      
      if (score > bestScore && score > 0.6) { // Seuil de confiance minimum
        bestScore = score
        bestMatch = omdbMovie
      }
    }
    
    return bestMatch
  }

  // Calculer un score de correspondance entre un film TMDB et OMDB
  private calculateMatchScore(tmdbMovie: any, omdbMovie: any, targetYear: number): number {
    let score = 0
    
    // 1. Correspondance du titre (facteur le plus important)
    const tmdbTitle = this.cleanTitleForSearch(tmdbMovie.title).toLowerCase()
    const omdbTitle = this.cleanTitleForSearch(omdbMovie.Title).toLowerCase()
    
    if (tmdbTitle === omdbTitle) {
      score += 0.5 // Correspondance exacte
    } else {
      // Correspondance partielle par mots-clés
      const tmdbWords = tmdbTitle.split(' ').filter(w => w.length > 2)
      const omdbWords = omdbTitle.split(' ')
      let matchingWords = 0
      
      for (const word of tmdbWords) {
        if (omdbWords.some(w => w.includes(word) || word.includes(w))) {
          matchingWords++
        }
      }
      
      if (tmdbWords.length > 0) {
        score += (matchingWords / tmdbWords.length) * 0.4
      }
    }
    
    // 2. Correspondance de l'année (important)
    const omdbYear = parseInt(omdbMovie.Year)
    const yearDiff = Math.abs(targetYear - omdbYear)
    
    if (yearDiff === 0) {
      score += 0.3 // Année exacte
    } else if (yearDiff === 1) {
      score += 0.2 // Différence d'1 an
    } else if (yearDiff <= 2) {
      score += 0.1 // Différence de 2 ans max
    }
    
    // 3. Type de contenu (doit être un film)
    if (omdbMovie.Type === 'movie') {
      score += 0.2
    }
    
    return score
  }

  // Calculer un score de confiance final
  private calculateConfidence(tmdbMovie: any, omdbMovie: any): number {
    const tmdbTitle = this.cleanTitleForSearch(tmdbMovie.title).toLowerCase()
    const omdbTitle = this.cleanTitleForSearch(omdbMovie.Title).toLowerCase()
    
    // Confiance basée sur la similarité du titre et l'année
    let confidence = 0.5 // Base
    
    if (tmdbTitle === omdbTitle) {
      confidence += 0.4
    }
    
    const yearDiff = Math.abs((tmdbMovie.year || 2024) - parseInt(omdbMovie.Year))
    if (yearDiff === 0) {
      confidence += 0.1
    }
    
    return Math.min(1.0, confidence)
  }

  // 🎯 Corréler et obtenir les détails OMDB pour un film TMDB
  async getOMDBDetailsForTMDB(tmdbMovie: any): Promise<any | null> {
    try {
      const correlation = await this.correlateTMDBtoOMDB(tmdbMovie)
      
      if (!correlation.omdbId || correlation.confidence < 0.6) {
        console.log('🚫 [Correlation] Low confidence or no OMDB ID found')
        return null
      }
      
      // Récupérer les détails complets depuis OMDB
      const omdbDetails = await omdbService.getMovieDetails(correlation.omdbId)
      
      if (omdbDetails) {
        console.log('✅ [Correlation] Retrieved OMDB details for:', omdbDetails.Title)
        return omdbDetails
      }
      
      return null
      
    } catch (error) {
      console.error('❌ [Correlation] Error getting OMDB details:', error)
      return null
    }
  }
}

// Export singleton
export const movieCorrelationService = new MovieCorrelationService()
export type { CorrelationResult }
// src/services/gameSearchService.ts - Service pour mapper les noms de jeux vers RAWG
import { fetchWithCache } from '@/utils/apiCache'

interface RAWGSearchResult {
  id: number
  name: string
  background_image: string
  rating: number
  released: string
  platforms: Array<{ platform: { name: string } }>
}

interface RAWGSearchResponse {
  results: RAWGSearchResult[]
}

class GameSearchService {
  private readonly RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  private readonly baseUrl = 'https://api.rawg.io/api'
  
  // 🔍 Rechercher un jeu RAWG par nom et retourner l'ID
  async searchGameByName(gameName: string): Promise<string | null> {
    try {
      if (!this.RAWG_API_KEY) {
        console.warn('🚨 RAWG API key not configured')
        return null
      }

      console.log('🔍 [GameSearch] Searching RAWG for:', gameName)
      
      // Nettoyer le nom pour la recherche
      const cleanName = this.prepareSearchQuery(gameName)
      const searchUrl = `${this.baseUrl}/games?key=${this.RAWG_API_KEY}&search=${encodeURIComponent(cleanName)}&page_size=5`
      
      const response: RAWGSearchResponse = await fetchWithCache(searchUrl, `rawg-search-${cleanName}`, 30) // Cache 30 min
      
      if (!response.results || response.results.length === 0) {
        console.log('❌ [GameSearch] No results found for:', gameName)
        return null
      }

      // Trouver la meilleure correspondance
      const bestMatch = this.findBestMatch(gameName, response.results)
      
      if (bestMatch) {
        console.log('✅ [GameSearch] Found match:', bestMatch.name, '→ ID:', bestMatch.id)
        return bestMatch.id.toString()
      }

      console.log('❌ [GameSearch] No good match found for:', gameName)
      return null
      
    } catch (error) {
      console.error('❌ [GameSearch] Error searching for game:', gameName, error)
      return null
    }
  }

  // 🎯 Préparer la requête de recherche
  private prepareSearchQuery(gameName: string): string {
    return gameName
      .replace(/™|®|©/g, '') // Supprimer les symboles de marque
      .replace(/\s*-\s*(Game of the Year|GOTY|Definitive|Enhanced|Special|Deluxe|Ultimate|Complete|Director's Cut|Remastered|HD|4K).*$/i, '')
      .replace(/\s*\(.*\)$/g, '') // Supprimer parenthèses
      .replace(/[:\-–—]/g, ' ') // Remplacer ponctuation par espaces
      .replace(/\s+/g, ' ') // Normaliser espaces
      .trim()
      .toLowerCase()
  }

  // 🎯 Trouver la meilleure correspondance parmi les résultats
  private findBestMatch(originalName: string, results: RAWGSearchResult[]): RAWGSearchResult | null {
    const cleanOriginal = this.prepareSearchQuery(originalName)
    
    // 1. Recherche exacte (après nettoyage)
    for (const result of results) {
      const cleanResult = this.prepareSearchQuery(result.name)
      if (cleanResult === cleanOriginal) {
        return result
      }
    }

    // 2. Recherche par correspondance de mots-clés
    const originalWords = cleanOriginal.split(' ').filter(word => word.length > 2)
    let bestScore = 0
    let bestMatch: RAWGSearchResult | null = null

    for (const result of results) {
      const cleanResult = this.prepareSearchQuery(result.name)
      const resultWords = cleanResult.split(' ')
      
      // Calculer le score de correspondance
      let score = 0
      for (const word of originalWords) {
        if (resultWords.some(rWord => rWord.includes(word) || word.includes(rWord))) {
          score += 1
        }
      }
      
      // Bonus pour les correspondances de début
      if (cleanResult.startsWith(cleanOriginal.substring(0, Math.min(10, cleanOriginal.length)))) {
        score += 2
      }
      
      // Ratio de correspondance
      const ratio = score / originalWords.length
      
      if (ratio > 0.5 && score > bestScore) {
        bestScore = score
        bestMatch = result
      }
    }

    // 3. Si pas de bonne correspondance, prendre le premier résultat si pertinent
    if (!bestMatch && results.length > 0) {
      const firstResult = results[0]
      const cleanFirst = this.prepareSearchQuery(firstResult.name)
      
      // Vérifier si au moins un mot-clé important correspond
      const hasKeywordMatch = originalWords.some(word => 
        word.length > 3 && cleanFirst.includes(word)
      )
      
      if (hasKeywordMatch) {
        bestMatch = firstResult
      }
    }

    return bestMatch
  }

  // 🔄 Mapper un jeu CheapShark vers un ID RAWG
  async mapCheapSharkToRAWG(cheapSharkGame: any): Promise<string | null> {
    try {
      // Essayer avec le titre original
      let rawgId = await this.searchGameByName(cheapSharkGame.originalTitle || cheapSharkGame.title)
      
      // Si pas trouvé, essayer avec le titre nettoyé
      if (!rawgId && cheapSharkGame.searchableTitle) {
        rawgId = await this.searchGameByName(cheapSharkGame.searchableTitle)
      }
      
      return rawgId
    } catch (error) {
      console.error('❌ [GameSearch] Error mapping CheapShark to RAWG:', error)
      return null
    }
  }

  // 📊 Récupérer des infos enrichies d'un jeu RAWG
  async getGameDetails(rawgId: string): Promise<any | null> {
    try {
      if (!this.RAWG_API_KEY) return null
      
      const detailUrl = `${this.baseUrl}/games/${rawgId}?key=${this.RAWG_API_KEY}`
      const details = await fetchWithCache(detailUrl, `rawg-details-${rawgId}`, 60) // Cache 1h
      
      return details
    } catch (error) {
      console.error('❌ [GameSearch] Error fetching game details:', error)
      return null
    }
  }
}

// Export singleton
export const gameSearchService = new GameSearchService()
export type { RAWGSearchResult, RAWGSearchResponse }
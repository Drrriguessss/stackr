// ✅ SERVICE RAWG AVANCÉ POUR RECHERCHE GAMING OPTIMISÉE
// Implémente toutes les techniques professionnelles pour des résultats de qualité

import { RAWGGame, RAWGSearchResponse } from './rawgService'
import type { SearchResult } from '@/types'

interface AdvancedSearchOptions {
  minMetacritic?: number
  excludeAdditions?: boolean
  excludeFanMade?: boolean
  maxResults?: number
  sortBy?: 'relevance' | 'quality' | 'popularity' | 'rating' | 'recent'
  gameType?: 'indie' | 'aaa' | 'retro' | 'mobile' | 'vr'
  genres?: string[]
  tags?: string[]
  platforms?: string[]
}

interface EnhancedRAWGGame extends RAWGGame {
  relevanceScore: number
  qualityScore: number
  added?: number
  ratings_count?: number
}

class AdvancedRAWGService {
  private readonly apiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  private readonly baseURL = 'https://api.rawg.io/api'
  private cache = new Map<string, any>()
  private requestCount = 0
  private lastReset = Date.now()
  private readonly maxRequestsPerHour = 20000

  // Mots-clés pour détection automatique du type de jeu
  private gameTypeKeywords = {
    indie: ['indie', 'independent', 'pixel', 'retro-style'],
    aaa: ['triple-a', 'AAA', 'blockbuster', 'ubisoft', 'ea games', 'activision'],
    retro: ['retro', 'classic', 'vintage', 'old-school', '8-bit', '16-bit'],
    mobile: ['mobile', 'android', 'ios', 'phone'],
    vr: ['vr', 'virtual reality', 'oculus', 'vive', 'psvr']
  }

  /**
   * 🚀 RECHERCHE OPTIMISÉE PRINCIPALE avec toutes les techniques avancées
   */
  async optimizedGameSearch(query: string, options: AdvancedSearchOptions = {}): Promise<SearchResult[]> {
    const {
      minMetacritic = 70,
      excludeAdditions = true,
      excludeFanMade = true,
      maxResults = 20,
      sortBy = 'relevance'
    } = options

    console.log('🎮 [AdvancedRAWG] === OPTIMIZED SEARCH ===')
    console.log('🎮 [AdvancedRAWG] Query:', `"${query}"`)
    console.log('🎮 [AdvancedRAWG] Options:', options)

    try {
      // 1. ✅ DÉTECTION AUTOMATIQUE DU TYPE DE JEU
      const detectedGameType = this.detectGameType(query)
      console.log('🎮 [AdvancedRAWG] Detected game type:', detectedGameType)

      // 2. ✅ CONSTRUCTION DES PARAMÈTRES OPTIMISÉS
      const params = this.buildOptimizedParams(query, {
        ...options,
        gameType: detectedGameType || options.gameType,
        minMetacritic,
        excludeAdditions,
        maxResults,
        sortBy
      })

      // 3. ✅ RECHERCHE AVEC CACHE
      const cacheKey = `advanced_search_${query}_${JSON.stringify(params)}`
      if (this.cache.has(cacheKey)) {
        console.log('🎮 [AdvancedRAWG] ⚡ Cache hit!')
        return this.cache.get(cacheKey)
      }

      // 4. ✅ REQUÊTE API AVEC RATE LIMITING
      const rawgData = await this.makeOptimizedRequest('games', params)
      
      // 5. ✅ POST-TRAITEMENT AVANCÉ
      const processedResults = this.processAdvancedResults(rawgData.results, query, options)
      
      // 6. ✅ CACHE ET RETOUR
      this.cache.set(cacheKey, processedResults)
      
      console.log('🎮 [AdvancedRAWG] Final results:', {
        query,
        totalFound: processedResults.length,
        topGames: processedResults.slice(0, 3).map(g => `"${g.title}" (${g.rating}/10)`)
      })

      return processedResults

    } catch (error) {
      console.error('🎮 [AdvancedRAWG] Search failed:', error)
      return []
    }
  }

  /**
   * 🧠 DÉTECTION AUTOMATIQUE DU TYPE DE JEU
   */
  private detectGameType(query: string): string | null {
    const queryLower = query.toLowerCase()
    
    for (const [type, keywords] of Object.entries(this.gameTypeKeywords)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return type
      }
    }
    return null
  }

  /**
   * ⚙️ CONSTRUCTION DES PARAMÈTRES OPTIMISÉS
   */
  private buildOptimizedParams(query: string, options: AdvancedSearchOptions): URLSearchParams {
    const params = new URLSearchParams({
      key: this.apiKey,
      search: query,
      page_size: (options.maxResults || 20).toString(),
      // ✅ RECHERCHE NORMALE - search_precise était trop restrictif
      // search_precise: 'true'  // DÉSACTIVÉ: Trop restrictif, empêche de trouver des jeux
    })

    // ✅ FILTRAGE PAR QUALITÉ - Metacritic minimum
    if (options.minMetacritic && options.minMetacritic > 0) {
      params.append('metacritic', `${options.minMetacritic},100`)
    }

    // ✅ EXCLUSIONS POUR ÉVITER LE CONTENU AMATEUR
    if (options.excludeAdditions) {
      params.append('exclude_additions', 'true')
      // params.append('exclude_parents', 'true')  // DÉSACTIVÉ: Trop restrictif
    }

    // ✅ TRI OPTIMISÉ SELON LE TYPE
    switch (options.sortBy) {
      case 'quality':
        params.append('ordering', '-metacritic')
        break
      case 'popularity':
        params.append('ordering', '-added')
        break
      case 'rating':
        params.append('ordering', '-rating')
        break
      case 'recent':
        params.append('ordering', '-released')
        break
      default:
        // Tri par pertinence (défaut intelligent)
        break
    }

    // ✅ FILTRES CONTEXTUELS SELON LE TYPE DE JEU DÉTECTÉ
    if (options.gameType) {
      this.applyGameTypeFilters(params, options.gameType)
    }

    // ✅ FILTRES PERSONNALISÉS
    if (options.genres && options.genres.length > 0) {
      params.append('genres', options.genres.join(','))
    }
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','))
    }
    if (options.platforms && options.platforms.length > 0) {
      params.append('platforms', options.platforms.join(','))
    }

    return params
  }

  /**
   * 🎯 APPLICATION DES FILTRES CONTEXTUELS INTELLIGENTS
   */
  private applyGameTypeFilters(params: URLSearchParams, gameType: string): void {
    console.log('🎮 [AdvancedRAWG] Applying contextual filters for:', gameType)

    switch (gameType) {
      case 'indie':
        params.append('tags', '31') // Tag indie officiel RAWG
        params.set('metacritic', '75,100') // Standards plus élevés pour indies
        break
      case 'aaa':
        // Studios AAA majeurs (IDs RAWG)
        params.append('developers', '109,3678,18893,7,405,421')
        params.set('metacritic', '80,100')
        break
      case 'retro':
        params.append('dates', '1970-01-01,1999-12-31')
        params.append('tags', '264') // Tag retro
        break
      case 'mobile':
        params.append('platforms', '21,19') // Android, iOS
        break
      case 'vr':
        params.append('tags', '360') // Tag VR officiel
        break
    }
  }

  /**
   * 🔥 POST-TRAITEMENT AVANCÉ DES RÉSULTATS
   */
  private processAdvancedResults(
    games: RAWGGame[], 
    originalQuery: string, 
    options: AdvancedSearchOptions
  ): SearchResult[] {
    console.log('🎮 [AdvancedRAWG] Processing', games.length, 'raw results')

    return games
      .map(game => this.enhanceGameWithScoring(game, originalQuery))
      .filter(game => this.passesQualityFilters(game, options))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults || 20)
      .map(game => this.convertToSearchResult(game))
  }

  /**
   * ⭐ SYSTÈME DE SCORING AVANCÉ POUR LA PERTINENCE
   */
  private enhanceGameWithScoring(game: RAWGGame, query: string): EnhancedRAWGGame {
    const enhanced = game as EnhancedRAWGGame
    enhanced.relevanceScore = this.calculateAdvancedRelevanceScore(game, query)
    enhanced.qualityScore = this.calculateQualityScore(game)
    return enhanced
  }

  /**
   * 🧮 CALCUL DE SCORE DE PERTINENCE AVANCÉ
   */
  private calculateAdvancedRelevanceScore(game: RAWGGame, query: string): number {
    let score = 0
    const queryLower = query.toLowerCase().trim()
    const titleLower = game.name.toLowerCase().trim()

    console.log(`🎯 [Relevance] Scoring "${game.name}" for "${query}"`)

    // ✅ CORRESPONDANCE EXACTE = SCORE PARFAIT
    if (titleLower === queryLower) {
      console.log('🎯 Perfect match!')
      return 1000
    }

    // ✅ COMMENCE PAR LA REQUÊTE = PRIORITÉ ABSOLUE
    if (titleLower.startsWith(queryLower)) {
      score += 500
      console.log('🎯 Starts with query: +500')
    }

    // ✅ CONTIENT LA REQUÊTE COMPLÈTE
    if (titleLower.includes(queryLower)) {
      score += 300
      console.log('🎯 Contains full query: +300')
    }

    // ✅ CORRESPONDANCE DE MOTS INDIVIDUELS
    const queryWords = queryLower.split(/\s+/)
    const titleWords = titleLower.split(/\s+/)
    
    let wordMatches = 0
    queryWords.forEach(qWord => {
      if (qWord.length >= 2) {
        titleWords.forEach(tWord => {
          if (tWord.startsWith(qWord)) {
            wordMatches++
            score += 100
          } else if (tWord.includes(qWord)) {
            wordMatches++
            score += 50
          }
        })
      }
    })

    console.log(`🎯 Word matches: ${wordMatches}, added: ${wordMatches * 75}`)

    // ✅ BONUS QUALITÉ - Metacritic
    if (game.metacritic) {
      if (game.metacritic >= 90) score += 150
      else if (game.metacritic >= 80) score += 100
      else if (game.metacritic >= 70) score += 50
      console.log(`🎯 Metacritic bonus: ${game.metacritic}`)
    }

    // ✅ BONUS POPULARITÉ - Rating et counts
    if (game.rating >= 4.5) score += 75
    else if (game.rating >= 4.0) score += 50
    else if (game.rating >= 3.5) score += 25

    // ✅ BONUS POUR CONTENU RÉCENT
    if (game.released) {
      const releaseYear = new Date(game.released).getFullYear()
      const currentYear = new Date().getFullYear()
      const yearsOld = currentYear - releaseYear
      
      if (yearsOld <= 3) score += 50      // Très récent
      else if (yearsOld <= 7) score += 25 // Récent
      else if (releaseYear < 1990) score -= 100 // Possibles fan-made
    }

    // ✅ PÉNALITÉ POUR CONTENU SUSPECT
    const suspiciousTerms = ['mod', 'hack', 'cheat', 'trainer', 'demo', 'beta', 'alpha']
    if (suspiciousTerms.some(term => titleLower.includes(term))) {
      score -= 200
      console.log('🎯 Suspicious content penalty: -200')
    }

    const finalScore = Math.max(0, score)
    console.log(`🎯 Final relevance score: ${finalScore}`)
    return finalScore
  }

  /**
   * 🏆 CALCUL DU SCORE DE QUALITÉ ADAPTATIF
   */
  private calculateQualityScore(game: RAWGGame): number {
    let score = 0

    // ✅ METACRITIC: Important mais pas obligatoire (25% du score)
    if (game.metacritic) {
      score += (game.metacritic / 100) * 25
    } else {
      // ✅ BONUS: Score par défaut pour jeux sans Metacritic (jeux indies)
      score += 15  // Score neutre pour éviter de pénaliser les indies
    }

    // ✅ RATING: Plus important pour jeux sans Metacritic (40% du score)
    if (game.rating) {
      const ratingScore = (game.rating / 5) * 40
      score += ratingScore
    }

    // ✅ POPULARITÉ: Adaptatif selon le nombre de reviews (20% du score)
    if (game.rating_count) {
      // Plus indulgent pour les jeux avec moins de reviews
      const popularityScore = Math.min(game.rating_count / 5000, 1)  // Réduit de 10k à 5k
      score += popularityScore * 20
    }

    // ✅ COMPLÉTUDE: Essentiel pour tous les jeux (15% du score)
    let completeness = 0
    if (game.background_image) completeness += 3  // Plus important
    if (game.genres && game.genres.length > 0) completeness += 2
    if (game.developers && game.developers.length > 0) completeness += 2
    if (game.released) completeness += 2
    if (game.description_raw) completeness += 1
    
    score += (completeness / 10) * 15

    return Math.min(100, score)
  }

  /**
   * 🛡️ FILTRES DE QUALITÉ ADAPTATIFS
   */
  private passesQualityFilters(game: EnhancedRAWGGame, options: AdvancedSearchOptions): boolean {
    // ✅ FILTRES ADAPTATIFS selon si on a un Metacritic minimum ou pas
    const isStrictMode = (options.minMetacritic || 0) > 0
    
    // Rating minimum adaptatif
    const minRating = isStrictMode ? 3.0 : 2.0  // Plus permissif en mode fallback
    if (game.rating < minRating) {
      console.log(`🛡️ Quality filter: ${game.name} rejected (low rating: ${game.rating}, min: ${minRating})`)
      return false
    }

    // Minimum de reviews adaptatif
    const minReviews = isStrictMode ? 10 : 1  // Plus permissif pour jeux indies
    if (game.rating_count && game.rating_count < minReviews) {
      console.log(`🛡️ Quality filter: ${game.name} rejected (too few ratings: ${game.rating_count}, min: ${minReviews})`)
      return false
    }

    // Doit avoir une image (garde ce filtre essentiel)
    if (!game.background_image) {
      console.log(`🛡️ Quality filter: ${game.name} rejected (no image)`)
      return false
    }

    // ✅ GENRES: Plus permissif en mode fallback
    if (isStrictMode && (!game.genres || game.genres.length === 0)) {
      console.log(`🛡️ Quality filter: ${game.name} rejected (no genres)`)
      return false
    }

    // ✅ SCORE DE QUALITÉ: Plus permissif en mode fallback
    const minQualityScore = isStrictMode ? 30 : 10
    if (game.qualityScore < minQualityScore) {
      console.log(`🛡️ Quality filter: ${game.name} rejected (low quality score: ${game.qualityScore}, min: ${minQualityScore})`)
      return false
    }

    return true
  }

  /**
   * 🔄 CONVERSION VERS FORMAT SEARCHRESULT
   */
  private convertToSearchResult(game: EnhancedRAWGGame): SearchResult {
    return {
      id: game.id.toString(),
      title: game.name,
      description: game.description_raw || `${game.genres?.map(g => g.name).join(', ') || 'Game'} released in ${game.released ? new Date(game.released).getFullYear() : 'Unknown'}`,
      image: game.background_image,
      year: game.released ? new Date(game.released).getFullYear() : undefined,
      rating: game.rating ? Math.min(10, game.rating * 2) : undefined, // Convert to /10 scale
      category: 'games',
      externalUrl: `https://rawg.io/games/${game.id}`,
      metadata: {
        metacritic: game.metacritic,
        platforms: game.platforms?.map(p => p.platform.name).slice(0, 3),
        developers: game.developers?.map(d => d.name),
        genres: game.genres?.map(g => g.name),
        relevanceScore: game.relevanceScore,
        qualityScore: game.qualityScore
      }
    }
  }

  /**
   * 🌐 REQUÊTE API OPTIMISÉE AVEC RATE LIMITING
   */
  private async makeOptimizedRequest(endpoint: string, params: URLSearchParams): Promise<RAWGSearchResponse> {
    // Vérification des limites de requêtes
    if (this.requestCount >= this.maxRequestsPerHour) {
      const timeToReset = 3600000 - (Date.now() - this.lastReset)
      if (timeToReset > 0) {
        throw new Error(`Rate limit reached. Retry in ${Math.ceil(timeToReset / 60000)} minutes.`)
      } else {
        this.requestCount = 0
        this.lastReset = Date.now()
      }
    }

    this.requestCount++
    const url = `${this.baseURL}/${endpoint}?${params.toString()}`
    
    console.log('🌐 [AdvancedRAWG] API Request:', url.replace(this.apiKey, 'API_KEY'))

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * 🧹 NETTOYAGE DU CACHE
   */
  clearCache(): void {
    this.cache.clear()
    console.log('🧹 [AdvancedRAWG] Cache cleared')
  }

  /**
   * 📊 STATISTIQUES DE PERFORMANCE
   */
  getStats(): any {
    return {
      cacheSize: this.cache.size,
      requestCount: this.requestCount,
      cacheHitRate: this.cache.size > 0 ? (this.cache.size / this.requestCount) : 0
    }
  }
}

// Export singleton
export const advancedRAWGService = new AdvancedRAWGService()
export default AdvancedRAWGService
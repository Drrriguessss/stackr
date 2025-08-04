// 🎯 SYSTÈME DE RECHERCHE UNIFIÉE OPTIMISÉ
// Movies, Books, Games, Music dans une seule barre avec ranking unifié

import { omdbService } from './omdbService'
import { googleBooksService } from './googleBooksService'
import { musicServiceV2 } from './musicServiceV2'
import { rawgService } from './rawgService'
import type { SearchResult, MediaCategory } from '@/types'

// Configuration optimisée basée sur les recommandations
const SEARCH_CONFIG = {
  // Debouncing adaptatif selon longueur de query
  debouncing: {
    shortQuery: 500,  // 1-2 chars
    mediumQuery: 300, // 3-4 chars  
    longQuery: 200    // 5+ chars (optimal selon research)
  },
  
  // Timeouts par API (basé sur performance observée)
  apiTimeouts: {
    movies: 2000,     // TMDB/OMDB
    books: 2500,      // Google Books (plus lent)
    games: 2000,      // RAWG/IGDB 
    music: 1500       // iTunes (plus rapide)
  },
  
  // Cache intelligent
  cache: {
    ttl: 600000,      // 10 minutes TTL
    maxSize: 1000,    // 1000 entrées max
    cleanupInterval: 300000 // Nettoyage toutes les 5min
  },
  
  // Poids pour scoring unifié
  scoring: {
    textRelevance: 0.4,   // 40% pertinence textuelle
    popularity: 0.3,      // 30% popularité/rating
    categoryBoost: 0.2,   // 20% boost par catégorie
    userPrefs: 0.1        // 10% préférences utilisateur
  },
  
  // Diversité des résultats
  diversity: {
    topResults: 12,       // Top 12 avec diversité forcée
    maxPerCategory: 3,    // Max 3 par catégorie dans top 12
    totalDisplay: 50      // 50 résultats total affichés
  }
}

// 🔄 Cache intelligent avec TTL et éviction LRU
class IntelligentCache {
  private cache = new Map<string, CacheEntry>()
  private config = SEARCH_CONFIG.cache

  constructor() {
    this.startCleanupInterval()
  }
  
  get(key: string): any {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // Vérifier TTL
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key)
      return null
    }
    
    // Mettre à jour dernière utilisation (LRU)
    entry.lastUsed = Date.now()
    return entry.data
  }
  
  set(key: string, data: any): void {
    // Éviction LRU si cache plein
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed()
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastUsed: Date.now()
    })
  }
  
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
  
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.config.ttl) {
          this.cache.delete(key)
        }
      }
    }, this.config.cleanupInterval)
  }
}

interface CacheEntry {
  data: any
  timestamp: number
  lastUsed: number
}

// 🏆 Algorithme de ranking unifié BM25-inspired
class UnifiedRankingAlgorithm {
  static calculateRelevanceScore(query: string, item: SearchResult): number {
    // Defensive checks for undefined values
    if (!item || !item.title) {
      console.warn('🔥 [UnifiedSearch] Item or title is undefined:', item)
      return 0
    }
    
    const queryLower = query.toLowerCase().trim()
    const titleLower = item.title.toLowerCase().trim()
    
    // Exact match = score parfait
    if (titleLower === queryLower) return 10
    
    let score = 0
    
    // 1. Starts with query (boost important pour UX)
    if (titleLower.startsWith(queryLower)) score += 8
    
    // 2. Contains query complet
    if (titleLower.includes(queryLower)) score += 6
    
    // 3. Word-level matching (BM25-inspired)
    const queryWords = queryLower.split(' ')
    const titleWords = titleLower.split(' ')
    const wordMatchRatio = this.calculateWordMatchRatio(queryWords, titleWords)
    score += wordMatchRatio * 4
    
    // 4. Fuzzy matching pour gérer les typos
    const fuzzyScore = this.calculateFuzzyMatch(queryLower, titleLower)
    score += fuzzyScore * 2
    
    // 5. Bonus pour mots clés partiels
    let partialMatches = 0
    queryWords.forEach(qWord => {
      if (qWord.length >= 3) { // Ignore mots trop courts
        titleWords.forEach(tWord => {
          if (tWord.includes(qWord) || qWord.includes(tWord)) {
            partialMatches++
          }
        })
      }
    })
    score += (partialMatches / Math.max(queryWords.length, 1)) * 1
    
    return Math.min(10, Math.max(0, score))
  }
  
  private static calculateWordMatchRatio(queryWords: string[], titleWords: string[]): number {
    let matches = 0
    
    queryWords.forEach(qWord => {
      titleWords.forEach(tWord => {
        if (tWord.includes(qWord) || qWord.includes(tWord)) {
          matches++
        }
      })
    })
    
    return matches / Math.max(queryWords.length, 1)
  }
  
  private static calculateFuzzyMatch(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 1
    return 1 - (distance / maxLength)
  }
  
  private static levenshteinDistance(str1: string, str2: string): number {
    if (str1.length === 0) return str2.length
    if (str2.length === 0) return str1.length
    
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1]
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // substitution
            matrix[j][i - 1] + 1,     // insertion
            matrix[j - 1][i] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }
}

// 📊 Métriques de performance
class SearchMetrics {
  private metrics = {
    searches: 0,
    totalResponseTime: 0,
    avgResponseTime: 0,
    apiFailures: new Map<string, number>(),
    cacheHits: 0,
    cacheMisses: 0,
    popularQueries: new Map<string, number>()
  }
  
  recordSearch(query: string, responseTime: number, cacheHit = false): void {
    this.metrics.searches++
    this.metrics.totalResponseTime += responseTime
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.searches
    
    if (cacheHit) {
      this.metrics.cacheHits++
    } else {
      this.metrics.cacheMisses++
    }
    
    // Track popular queries
    const queryCount = this.metrics.popularQueries.get(query) || 0
    this.metrics.popularQueries.set(query, queryCount + 1)
  }
  
  recordApiFailure(apiName: string): void {
    const failures = this.metrics.apiFailures.get(apiName) || 0
    this.metrics.apiFailures.set(apiName, failures + 1)
  }
  
  getMetrics() {
    const cacheTotal = this.metrics.cacheHits + this.metrics.cacheMisses
    const cacheHitRate = cacheTotal > 0 ? (this.metrics.cacheHits / cacheTotal) : 0
    
    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      popularQueries: Array.from(this.metrics.popularQueries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10) // Top 10 queries
    }
  }
}

// 🎯 CLASSE PRINCIPALE DU SYSTÈME UNIFIÉ
export class UnifiedSearchService {
  private cache = new IntelligentCache()
  private metrics = new SearchMetrics()
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  
  // Préférences utilisateur (à implémenter plus tard)
  private userPreferences = {
    movies: 1.0,
    books: 1.0,
    games: 1.0,
    music: 1.0
  }
  
  /**
   * 🚀 MÉTHODE PRINCIPALE DE RECHERCHE UNIFIÉE
   */
  async search(query: string, options: SearchOptions = {}): Promise<UnifiedSearchResult> {
    const searchId = `search_${Date.now()}`
    const startTime = Date.now()
    
    try {
      // 1. Validation et nettoyage de la query
      const cleanQuery = query.trim()
      if (cleanQuery.length < 2) {
        return { results: [], totalCount: 0, responseTime: 0, fromCache: false }
      }
      
      // 2. Vérifier le cache
      const cacheKey = this.generateCacheKey(cleanQuery, options)
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        const responseTime = Date.now() - startTime
        this.metrics.recordSearch(cleanQuery, responseTime, true)
        return { ...cachedResult, fromCache: true }
      }
      
      // 3. Debouncing intelligent
      await this.performIntelligentDebouncing(cleanQuery, searchId)
      
      // 4. Recherche parallèle sur toutes les APIs
      const parallelResults = await this.performParallelSearch(cleanQuery, options)
      
      // 5. Scoring et ranking unifié
      const rankedResults = this.applyUnifiedRanking(parallelResults, cleanQuery)
      
      // 6. Cache du résultat
      const finalResult = {
        results: rankedResults,
        totalCount: rankedResults.length,
        responseTime: Date.now() - startTime,
        fromCache: false
      }
      
      this.cache.set(cacheKey, finalResult)
      this.metrics.recordSearch(cleanQuery, finalResult.responseTime, false)
      
      return finalResult
      
    } catch (error) {
      console.error('🔥 [UnifiedSearch] Search failed:', error)
      this.metrics.recordSearch(query, Date.now() - startTime, false)
      
      // Fallback gracieux
      return { results: [], totalCount: 0, responseTime: Date.now() - startTime, fromCache: false }
    }
  }
  
  /**
   * ⚡ Debouncing adaptatif selon longueur de query
   */
  private async performIntelligentDebouncing(query: string, searchId: string): Promise<void> {
    const debounceTime = this.calculateDebounceTime(query)
    
    return new Promise((resolve) => {
      // Clear timer précédent pour cette query
      const existingTimer = this.debounceTimers.get(query)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }
      
      const timer = setTimeout(() => {
        this.debounceTimers.delete(query)
        resolve()
      }, debounceTime)
      
      this.debounceTimers.set(query, timer)
    })
  }
  
  private calculateDebounceTime(query: string): number {
    if (query.length <= 2) return SEARCH_CONFIG.debouncing.shortQuery
    if (query.length <= 4) return SEARCH_CONFIG.debouncing.mediumQuery
    return SEARCH_CONFIG.debouncing.longQuery
  }
  
  /**
   * 🔄 Recherche parallèle sur toutes les APIs avec timeout
   */
  private async performParallelSearch(query: string, options: SearchOptions): Promise<CategorySearchResult[]> {
    const categories = options.categories || ['movies', 'books', 'games', 'music']
    
    const searchPromises = categories.map(async (category) => {
      const timeoutMs = SEARCH_CONFIG.apiTimeouts[category as keyof typeof SEARCH_CONFIG.apiTimeouts] || 2000
      
      try {
        const results = await this.withTimeout(
          this.searchCategory(category as MediaCategory, query),
          timeoutMs
        )
        
        return {
          category: category as MediaCategory,
          results,
          success: true,
          error: null
        }
      } catch (error) {
        console.warn(`🔥 [UnifiedSearch] ${category} search failed:`, error)
        this.metrics.recordApiFailure(category)
        
        return {
          category: category as MediaCategory,
          results: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
    
    const results = await Promise.allSettled(searchPromises)
    
    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { category: 'movies', results: [], success: false, error: 'Promise rejected' }
    )
  }
  
  /**
   * ⏱️ Wrapper timeout pour les APIs
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
    
    return Promise.race([promise, timeout])
  }
  
  /**
   * 🎯 Recherche par catégorie (déléguer aux services existants)
   */
  private async searchCategory(category: MediaCategory, query: string): Promise<SearchResult[]> {
    switch (category) {
      case 'movies':
        const omdbMovies = await omdbService.searchMoviesAndSeries(query, 1)
        // Convert OMDB movies to app format with proper title field
        return omdbMovies
          .map(movie => omdbService.convertToAppFormat(movie))
          .filter(movie => movie !== null && movie.title)
      case 'books':
        const googleBooks = await googleBooksService.searchBooks(query, 12)
        // Convert Google Books to app format with proper title field
        return googleBooks
          .map(book => googleBooksService.convertToAppFormat(book))
          .filter(book => book !== null && book.title)
      case 'games':
        const rawgGames = await rawgService.searchGames(query)
        // Convert RAWG games to app format and filter out any null results
        return rawgGames
          .map(game => rawgService.convertToAppFormat(game))
          .filter(game => game !== null && game.title)
      case 'music':
        const musicItems = await musicServiceV2.searchMusic(query)
        // Music service already returns the correct format, just filter for safety
        return musicItems.filter(item => item !== null && item.title)
      default:
        return []
    }
  }
  
  /**
   * 🏆 Application du ranking unifié avec diversité
   */
  private applyUnifiedRanking(categoryResults: CategorySearchResult[], query: string): SearchResult[] {
    const allResults: EnhancedSearchResult[] = []
    
    // 1. Combiner tous les résultats avec scoring
    categoryResults.forEach(categoryResult => {
      if (categoryResult.success && categoryResult.results.length > 0) {
        categoryResult.results.forEach(item => {
          const finalScore = this.calculateFinalScore(item, query)
          allResults.push({
            ...item,
            finalScore,
            originalCategory: categoryResult.category
          })
        })
      }
    })
    
    // 2. Trier par score final
    allResults.sort((a, b) => b.finalScore - a.finalScore)
    
    // 3. Appliquer diversité dans le top 12
    return this.applyDiversityRanking(allResults)
  }
  
  /**
   * 🎯 Calcul du score final unifié
   */
  private calculateFinalScore(item: SearchResult, query: string): number {
    let score = 0
    const config = SEARCH_CONFIG.scoring
    
    // 1. Relevance textuelle (40%)
    const textRelevance = UnifiedRankingAlgorithm.calculateRelevanceScore(query, item)
    score += textRelevance * config.textRelevance
    
    // 2. Popularité/Rating normalisé (30%)
    const popularityScore = this.normalizePopularity(item)
    score += popularityScore * config.popularity
    
    // 3. Boost par catégorie (20%) - préférences utilisateur
    const categoryBoost = this.userPreferences[item.category] || 1.0
    score += categoryBoost * config.categoryBoost
    
    // 4. Bonus pour contenu récent (10%)
    const recencyBonus = this.calculateRecencyBonus(item)
    score += recencyBonus * config.userPrefs
    
    return Math.max(0, Math.min(10, score))
  }
  
  private normalizePopularity(item: SearchResult): number {
    // Normaliser rating selon la catégorie
    if (item.rating && item.rating > 0) {
      // La plupart des APIs utilisent 0-10 ou 0-5
      return Math.min(10, item.rating <= 5 ? item.rating * 2 : item.rating)
    }
    return 5 // Score neutre par défaut
  }
  
  private calculateRecencyBonus(item: SearchResult): number {
    if (!item.year) return 0
    
    const currentYear = new Date().getFullYear()
    const yearsOld = currentYear - item.year
    
    // Bonus décroissant pour les 5 dernières années
    if (yearsOld <= 2) return 1.0      // 2 dernières années = bonus max
    if (yearsOld <= 5) return 0.5      // 3-5 ans = bonus moyen
    return 0                           // Plus vieux = pas de bonus
  }
  
  /**
   * 🌈 Application de la diversité dans les résultats
   */
  private applyDiversityRanking(sortedResults: EnhancedSearchResult[]): SearchResult[] {
    const diverseResults: SearchResult[] = []
    const categoryCount = { movies: 0, books: 0, games: 0, music: 0 }
    const maxPerCategory = SEARCH_CONFIG.diversity.maxPerCategory
    
    // Phase 1: Assurer diversité dans top 12
    for (const result of sortedResults) {
      if (diverseResults.length >= SEARCH_CONFIG.diversity.topResults) break
      
      const category = result.category
      if (categoryCount[category] < maxPerCategory) {
        diverseResults.push(result)
        categoryCount[category]++
      }
    }
    
    // Phase 2: Ajouter le reste par score
    for (const result of sortedResults) {
      if (diverseResults.length >= SEARCH_CONFIG.diversity.totalDisplay) break
      
      if (!diverseResults.find(r => r.id === result.id)) {
        diverseResults.push(result)
      }
    }
    
    return diverseResults
  }
  
  /**
   * 🗄️ Génération de clé de cache
   */
  private generateCacheKey(query: string, options: SearchOptions): string {
    const optionsHash = JSON.stringify(options)
    return `unified_search_${query.toLowerCase()}_${optionsHash}`
  }
  
  /**
   * 📊 Accès aux métriques
   */
  getMetrics() {
    return this.metrics.getMetrics()
  }
  
  /**
   * 🧹 Nettoyage des ressources
   */
  cleanup(): void {
    // Clear tous les timers de debouncing
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }
}

// Types pour le nouveau système
export interface SearchOptions {
  categories?: string[]
  limit?: number
  includeAdult?: boolean
}

export interface UnifiedSearchResult {
  results: SearchResult[]
  totalCount: number
  responseTime: number
  fromCache: boolean
}

interface CategorySearchResult {
  category: MediaCategory
  results: SearchResult[]
  success: boolean
  error: string | null
}

interface EnhancedSearchResult extends SearchResult {
  finalScore: number
  originalCategory: MediaCategory
}

// Instance singleton pour utilisation dans l'app
export const unifiedSearchService = new UnifiedSearchService()
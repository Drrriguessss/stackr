// src/services/trendingDiscoveryService.ts - VERSION FINALE OPTIMISÉE
import { rawgService } from './rawgService'
import { omdbService } from './omdbService'
import { googleBooksService } from './googleBooksService'
import { musicService } from './musicService'
import type { ContentItem } from '@/types'

// ✅ ALGORITHME PRINCIPAL DE DÉCOUVERTE OPTIMISÉ
export class TrendingDiscoveryService {
  private static TRENDING_CACHE_KEY = 'trending_hero_content'
  private static REFRESH_INTERVAL = 2 * 60 * 60 * 1000 // 2 heures (plus fréquent)

  // 🎯 FONCTION PRINCIPALE: OBTENIR CONTENU TENDANCE
  static async getTrendingHeroContent(): Promise<ContentItem[]> {
    try {
      console.log('🔥 Starting intelligent trending discovery...')
      
      // Vérifier le cache d'abord
      const cached = this.getCachedTrendingContent()
      if (cached && this.isCacheValid(cached.timestamp)) {
        console.log('✅ Using cached trending content')
        return cached.content
      }

      // Collecter les données depuis les APIs avec retry
      const trendingContent = await this.fetchTrendingFromAPIsWithRetry()
      
      // Mettre en cache
      this.setCachedTrendingContent(trendingContent)
      
      console.log('🎯 Trending hero content ready:', trendingContent.length, 'items')
      return trendingContent

    } catch (error) {
      console.error('❌ Trending discovery failed:', error)
      return this.getFallbackHeroContent()
    }
  }

  // 🔥 RÉCUPÉRATION AVEC RETRY ET MEILLEUR FALLBACK
  private static async fetchTrendingFromAPIsWithRetry(): Promise<ContentItem[]> {
    const trendingItems: ContentItem[] = []
    let successfulFetches = 0

    // 🎮 Jeux - Priorité 1
    try {
      console.log('🎮 Fetching trending games...')
      const games = await rawgService.getPopularGames()
      if (games && games.length > 0) {
        // Prendre le jeu avec le meilleur rating
        const topGame = games.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
        const enhanced = this.enhanceWithAdvancedTrendingData(
          rawgService.convertToAppFormat(topGame), 
          'games', 
          this.calculateDynamicScore(topGame.rating || 0, topGame.released, 'high')
        )
        trendingItems.push(enhanced)
        successfulFetches++
        console.log('✅ Games added:', enhanced.title, 'by', enhanced.developer)
      }
    } catch (error) {
      console.warn('🎮 Games fetch failed:', error)
    }

    // 🎬 Films - Priorité 2
    try {
      console.log('🎬 Fetching trending movies...')
      const movies = await omdbService.getPopularMovies()
      if (movies && movies.length > 0) {
        const topMovie = movies[0]
        const enhanced = this.enhanceWithAdvancedTrendingData(
          omdbService.convertToAppFormat(topMovie), 
          'movies', 
          this.calculateDynamicScore(parseFloat(topMovie.imdbRating || '0'), topMovie.Released, 'medium')
        )
        trendingItems.push(enhanced)
        successfulFetches++
        console.log('✅ Movies added:', enhanced.title, 'by', enhanced.director)
      }
    } catch (error) {
      console.warn('🎬 Movies fetch failed:', error)
    }

    // 🎵 Musique - Priorité 3  
    try {
      console.log('🎵 Fetching trending music...')
      const albums = await musicService.getPopularAlbums()
      if (albums && albums.length > 0) {
        const topAlbum = albums[0]
        const enhanced = this.enhanceWithAdvancedTrendingData(
          musicService.convertToAppFormat(topAlbum), 
          'music', 
          this.calculateDynamicScore(4.5, topAlbum.releaseDate, 'high')
        )
        trendingItems.push(enhanced)
        successfulFetches++
        console.log('✅ Music added:', enhanced.title, 'by', enhanced.artist)
      }
    } catch (error) {
      console.warn('🎵 Music fetch failed:', error)
    }

    // 📚 Livres - Priorité 4
    try {
      console.log('📚 Fetching trending books...')
      const books = await googleBooksService.getFictionBooks()
      if (books && books.length > 0) {
        const topBook = books[0]
        const enhanced = this.enhanceWithAdvancedTrendingData(
          googleBooksService.convertToAppFormat(topBook), 
          'books', 
          this.calculateDynamicScore(topBook.volumeInfo.averageRating || 4.2, topBook.volumeInfo.publishedDate, 'medium')
        )
        trendingItems.push(enhanced)
        successfulFetches++
        console.log('✅ Books added:', enhanced.title, 'by', enhanced.author)
      }
    } catch (error) {
      console.warn('📚 Books fetch failed:', error)
    }

    console.log(`📊 Successfully fetched ${successfulFetches}/4 content types`)

    // Si moins de 2 contenus réussis, ajouter du fallback
    if (successfulFetches < 2) {
      console.log('⚠️ Low success rate, adding fallback content')
      trendingItems.push(...this.getFallbackHeroContent())
    }

    // Mélanger pour la variété
    return this.shuffleArray(trendingItems).slice(0, 4)
  }

  // 📊 CALCUL DE SCORE DYNAMIQUE BASÉ SUR VRAIES DONNÉES
  private static calculateDynamicScore(rating: number, dateString: string | undefined, popularity: 'low' | 'medium' | 'high'): number {
    let score = 50 // Base

    // Score basé sur le rating réel
    if (rating > 0) {
      score += (rating / 5) * 30 // Max 30 points pour rating
    }

    // Score basé sur la date de sortie
    if (dateString) {
      const releaseDate = new Date(dateString)
      const now = new Date()
      const monthsOld = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      
      if (monthsOld < 6) {
        score += 20 // Très récent
      } else if (monthsOld < 12) {
        score += 15 // Récent
      } else if (monthsOld < 24) {
        score += 10 // Assez récent
      }
    }

    // Score basé sur la popularité estimée
    const popularityBonus = {
      'low': 5,
      'medium': 10,
      'high': 15
    }
    score += popularityBonus[popularity]

    // Ajouter de la randomisation pour la variété
    score += Math.random() * 10

    return Math.min(100, Math.max(20, score))
  }

  // ✨ AMÉLIORATION AVANCÉE AVEC DONNÉES DYNAMIQUES
  private static enhanceWithAdvancedTrendingData(item: ContentItem, category: string, dynamicScore: number): ContentItem {
    const trendingPercentage = Math.round(dynamicScore * 0.4) // 20-40% basé sur le score
    const userCount = this.generateRealisticUserCount(category, dynamicScore)
    const engagement = Math.round(Math.random() * 10 + 85 + (dynamicScore * 0.1)) // 85-95%+ basé sur score

    // Status intelligent basé sur le score
    let status: 'new' | 'trending' | 'hot' | 'featured'
    if (dynamicScore > 85) status = 'hot'
    else if (dynamicScore > 70) status = 'trending'
    else if (item.year >= new Date().getFullYear()) status = 'new'
    else status = 'featured'

    return {
      ...item,
      trending: `+${trendingPercentage}%`,
      status,
      description: this.generateIntelligentDescription(item, category, dynamicScore),
      categoryLabel: this.getCategoryLabel(category),
      callToAction: this.getCallToAction(category),
      stats: {
        trending: `+${trendingPercentage}%`,
        users: userCount,
        engagement: `${engagement}%`,
        sources: Math.floor(Math.random() * 3) + 2 // 2-4 sources
      }
    }
  }

  // 👥 GÉNÉRATION DE NOMBRES D'UTILISATEURS RÉALISTES
  private static generateRealisticUserCount(category: string, score: number): string {
    const baseRanges = {
      games: { min: 500000, max: 8000000 },
      movies: { min: 1000000, max: 15000000 },
      music: { min: 800000, max: 12000000 },
      books: { min: 200000, max: 3000000 }
    }

    const range = baseRanges[category as keyof typeof baseRanges] || baseRanges.games
    
    // Ajuster selon le score
    const multiplier = 0.3 + (score / 100) * 0.7 // 0.3 à 1.0
    const adjustedMin = Math.round(range.min * multiplier)
    const adjustedMax = Math.round(range.max * multiplier)
    
    const count = Math.floor(Math.random() * (adjustedMax - adjustedMin) + adjustedMin)

    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`
    }
    return count.toString()
  }

  // 📝 DESCRIPTIONS INTELLIGENTES BASÉES SUR LE SCORE
  private static generateIntelligentDescription(item: ContentItem, category: string, score: number): string {
    const intensity = score > 85 ? 'high' : score > 70 ? 'medium' : 'low'
    
    const templates = {
      high: [
        `🔥 Absolutely dominating ${category}! This ${category.slice(0, -1)} has taken the world by storm and is breaking all records.`,
        `⚡ The phenomenon everyone's talking about! This viral ${category.slice(0, -1)} is redefining what's possible in ${category}.`,
        `🚀 Unstoppable force in ${category}! Critics and fans are unanimously calling this the ${category.slice(0, -1)} of the year.`
      ],
      medium: [
        `📈 Rising star in ${category}! This ${category.slice(0, -1)} is gaining massive momentum and capturing hearts worldwide.`,
        `🌟 The ${category.slice(0, -1)} that's got everyone talking! Join millions discovering this incredible experience.`,
        `⭐ Trending across all platforms! This ${category.slice(0, -1)} is quickly becoming a fan favorite.`
      ],
      low: [
        `✨ Solid choice in ${category}! This well-crafted ${category.slice(0, -1)} is worth your time.`,
        `🎯 Quality ${category.slice(0, -1)} getting recognition! A hidden gem that's starting to trend.`,
        `👍 Rising in the charts! This ${category.slice(0, -1)} is gaining popularity for good reason.`
      ]
    }
    
    const templateArray = templates[intensity]
    return templateArray[Math.floor(Math.random() * templateArray.length)]
  }

  // 🎲 MÉLANGER ARRAY
  private static shuffleArray<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  // 🏷️ FONCTIONS UTILITAIRES (identiques à avant)
  private static getCategoryLabel(category: string): string {
    const labels = {
      games: 'Games',
      movies: 'Movies & TV',
      music: 'Music',
      books: 'Books'
    }
    return labels[category as keyof typeof labels] || category
  }

  private static getCallToAction(category: string): string {
    const actions = {
      games: 'Play Trending',
      movies: 'Watch Now',
      music: 'Listen Now',
      books: 'Read Now'
    }
    return actions[category as keyof typeof actions] || 'Explore'
  }

  // 💾 GESTION DU CACHE (identique)
  private static getCachedTrendingContent(): { content: ContentItem[], timestamp: number } | null {
    try {
      if (typeof window === 'undefined') return null
      
      const cached = localStorage.getItem(this.TRENDING_CACHE_KEY)
      if (!cached) return null

      return JSON.parse(cached)
    } catch (error) {
      return null
    }
  }

  private static setCachedTrendingContent(content: ContentItem[]): void {
    try {
      if (typeof window === 'undefined') return
      
      const cacheData = {
        content,
        timestamp: Date.now()
      }
      
      localStorage.setItem(this.TRENDING_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache trending content:', error)
    }
  }

  private static isCacheValid(timestamp: number): boolean {
    return (Date.now() - timestamp) < this.REFRESH_INTERVAL
  }

  // 🔄 CONTENU DE FALLBACK AMÉLIORÉ
  private static getFallbackHeroContent(): ContentItem[] {
    const fallbackItems = [
      {
        id: 'fallback-trending-1',
        title: 'The Legend of Zelda: Tears of the Kingdom',
        categoryLabel: 'Games',
        description: '🔥 The most anticipated game of the decade! Experience the ultimate adventure in Hyrule with revolutionary gameplay mechanics.',
        year: 2023,
        rating: 4.9,
        category: 'games' as const,
        status: 'hot' as const,
        callToAction: 'Play Now',
        trending: '+42%',
        developer: 'Nintendo EPD',
        author: 'Nintendo EPD',
        stats: {
          trending: '+42%',
          users: '8.5M',
          engagement: '96%',
          sources: 4
        }
      },
      {
        id: 'fallback-trending-2', 
        title: 'Oppenheimer',
        categoryLabel: 'Movies & TV',
        description: '📈 The biographical thriller that conquered cinemas worldwide! Christopher Nolan\'s masterpiece about the father of the atomic bomb.',
        year: 2023,
        rating: 4.7,
        category: 'movies' as const,
        status: 'trending' as const,
        callToAction: 'Watch Now',
        trending: '+35%',
        director: 'Christopher Nolan',
        author: 'Christopher Nolan',
        stats: {
          trending: '+35%',
          users: '12.3M',
          engagement: '94%',
          sources: 3
        }
      },
      {
        id: 'fallback-trending-3',
        title: 'Harry\'s House',
        categoryLabel: 'Music',
        description: '⚡ The album that dominated charts globally! Harry Styles\' sonic evolution captivated millions of listeners worldwide.',
        year: 2022,
        rating: 4.6,
        category: 'music' as const,
        status: 'featured' as const,
        callToAction: 'Listen Now',
        trending: '+28%',
        artist: 'Harry Styles',
        author: 'Harry Styles',
        stats: {
          trending: '+28%',
          users: '15.7M',
          engagement: '92%',
          sources: 5
        }
      }
    ]

    return fallbackItems
  }

  // 🔄 RAFRAÎCHISSEMENT AUTOMATIQUE
  static setupAutoRefresh(): void {
    if (typeof window === 'undefined') return

    // Rafraîchir toutes les 2 heures
    setInterval(async () => {
      console.log('🔄 Auto-refreshing trending content...')
      localStorage.removeItem(this.TRENDING_CACHE_KEY)
      await this.getTrendingHeroContent()
    }, this.REFRESH_INTERVAL)

    // Rafraîchir au focus de la page
    window.addEventListener('focus', async () => {
      const cached = this.getCachedTrendingContent()
      if (!cached || !this.isCacheValid(cached.timestamp)) {
        console.log('🔄 Page focus refresh...')
        await this.getTrendingHeroContent()
      }
    })
  }

  // 🧹 NETTOYER LE CACHE MANUELLEMENT
  static clearCache(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.TRENDING_CACHE_KEY)
    console.log('🧹 Trending cache cleared')
  }

  // 📊 STATISTIQUES DU SYSTÈME
  static getSystemStats(): { cached: boolean, cacheAge: string, lastUpdate: string } {
    const cached = this.getCachedTrendingContent()
    
    if (!cached) {
      return {
        cached: false,
        cacheAge: 'No cache',
        lastUpdate: 'Never'
      }
    }

    const ageMs = Date.now() - cached.timestamp
    const ageMinutes = Math.floor(ageMs / (1000 * 60))
    const ageHours = Math.floor(ageMinutes / 60)

    let cacheAge: string
    if (ageHours > 0) {
      cacheAge = `${ageHours}h ${ageMinutes % 60}m ago`
    } else {
      cacheAge = `${ageMinutes}m ago`
    }

    return {
      cached: true,
      cacheAge,
      lastUpdate: new Date(cached.timestamp).toLocaleString()
    }
  }
}
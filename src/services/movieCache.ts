/**
 * Cache service pour les données de films
 * Permet d'éviter les appels API redondants et d'améliorer les performances
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expires: number
}

interface MovieCacheData {
  movieDetail?: any
  media?: { images: string[], trailer: any }
  directorMovies?: any[]
  reviews?: any[]
  userReviews?: any[]
}

class MovieCacheService {
  private cache = new Map<string, CacheEntry<MovieCacheData>>()
  
  // Durées de cache (en millisecondes)
  private readonly CACHE_DURATION = {
    MOVIE_DETAIL: 10 * 60 * 1000,      // 10 minutes - données de base
    MEDIA: 30 * 60 * 1000,             // 30 minutes - images/trailers
    DIRECTOR_MOVIES: 60 * 60 * 1000,   // 1 heure - films du réalisateur
    REVIEWS: 15 * 60 * 1000,           // 15 minutes - reviews
    USER_REVIEWS: 5 * 60 * 1000        // 5 minutes - reviews utilisateur
  }

  /**
   * Obtient les données en cache pour un film
   */
  get(movieId: string): MovieCacheData | null {
    const entry = this.cache.get(movieId)
    if (!entry) return null
    
    // Vérifier si le cache n'est pas expiré
    if (Date.now() > entry.expires) {
      this.cache.delete(movieId)
      return null
    }
    
    return entry.data
  }

  /**
   * Met à jour une partie des données en cache
   */
  set(movieId: string, data: Partial<MovieCacheData>, type: keyof typeof this.CACHE_DURATION): void {
    const existing = this.get(movieId) || {}
    const duration = this.CACHE_DURATION[type]
    
    const cacheEntry: CacheEntry<MovieCacheData> = {
      data: { ...existing, ...data },
      timestamp: Date.now(),
      expires: Date.now() + duration
    }
    
    this.cache.set(movieId, cacheEntry)
    
    console.log(`📦 [MovieCache] Cached ${type} for movie ${movieId} (expires in ${duration/1000}s)`)
  }

  /**
   * Vérifie si une partie des données est en cache et valide
   */
  has(movieId: string, field: keyof MovieCacheData): boolean {
    const data = this.get(movieId)
    return !!(data && data[field])
  }

  /**
   * Supprime les données en cache pour un film
   */
  delete(movieId: string): void {
    this.cache.delete(movieId)
    console.log(`🗑️ [MovieCache] Cleared cache for movie ${movieId}`)
  }

  /**
   * Nettoie le cache expiré
   */
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [MovieCache] Cleaned ${cleaned} expired entries`)
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): { size: number, entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

// Instance singleton
export const movieCache = new MovieCacheService()

// Nettoie automatiquement le cache toutes les 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    movieCache.cleanup()
  }, 5 * 60 * 1000)
}
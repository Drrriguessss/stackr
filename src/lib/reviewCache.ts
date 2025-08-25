// Cache système pour les résumés de reviews
interface CachedReviewSummary {
  summary: any
  cachedAt: number
  expiresAt: number
}

class ReviewCache {
  private cache: Map<string, CachedReviewSummary> = new Map()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures

  private getCacheKey(movieTitle: string, year?: string): string {
    return `${movieTitle.toLowerCase().trim()}${year ? `_${year}` : ''}`
  }

  get(movieTitle: string, year?: string): any | null {
    const key = this.getCacheKey(movieTitle, year)
    const cached = this.cache.get(key)
    
    if (!cached) {
      console.log('🗄️ [ReviewCache] MISS for:', movieTitle)
      return null
    }

    // Vérifier si le cache a expiré
    if (Date.now() > cached.expiresAt) {
      console.log('🗄️ [ReviewCache] EXPIRED for:', movieTitle)
      this.cache.delete(key)
      return null
    }

    console.log('🗄️ [ReviewCache] HIT for:', movieTitle, '(cached', Math.round((Date.now() - cached.cachedAt) / 1000 / 60), 'min ago)')
    return cached.summary
  }

  set(movieTitle: string, summary: any, year?: string): void {
    const key = this.getCacheKey(movieTitle, year)
    const now = Date.now()
    
    this.cache.set(key, {
      summary,
      cachedAt: now,
      expiresAt: now + this.CACHE_DURATION
    })
    
    console.log('🗄️ [ReviewCache] CACHED:', movieTitle, '(expires in 24h)')
  }

  // Nettoyage automatique des entrées expirées
  cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log('🗄️ [ReviewCache] Cleaned', cleaned, 'expired entries')
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Instance globale
export const reviewCache = new ReviewCache()

// Nettoyage automatique toutes les heures
if (typeof window !== 'undefined') {
  setInterval(() => {
    reviewCache.cleanup()
  }, 60 * 60 * 1000) // 1 heure
}
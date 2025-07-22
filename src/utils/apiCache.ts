// Système de cache intelligent pour les appels API RAWG
interface CacheEntry {
  data: any
  timestamp: number
  key: string
}

class APICache {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_ENTRIES = 100 // Limite mémoire
  private apiCallCount = 0

  // Récupérer une entrée du cache
  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Vérifier l'expiration
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }

    console.log(`📋 [CACHE HIT] ${key}`)
    return entry.data
  }

  // Stocker une entrée dans le cache
  set(key: string, data: any): void {
    // Nettoyer le cache si trop d'entrées
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    })

    console.log(`💾 [CACHE SET] ${key}`)
  }

  // Nettoyer les entrées expirées
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        expiredKeys.push(key)
      }
    })

    // Supprimer les entrées expirées
    expiredKeys.forEach(key => this.cache.delete(key))

    // Si encore trop d'entrées, supprimer les plus anciennes
    if (this.cache.size >= this.MAX_ENTRIES) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toDelete = entries.slice(0, Math.floor(this.MAX_ENTRIES / 2))
      toDelete.forEach(([key]) => this.cache.delete(key))
    }

    console.log(`🧹 [CACHE CLEANUP] Removed ${expiredKeys.length} expired entries`)
  }

  // Surveiller les appels API
  trackAPICall(endpoint: string): void {
    this.apiCallCount++
    const now = new Date().toLocaleTimeString()
    console.log(`📊 [API CALL #${this.apiCallCount}] ${now} - ${endpoint}`)
    
    // Alerte si trop d'appels
    if (this.apiCallCount > 100) {
      console.warn(`⚠️ [HIGH API USAGE] ${this.apiCallCount} calls made!`)
    }
  }

  // Obtenir les stats du cache
  getStats(): { size: number; apiCalls: number } {
    return {
      size: this.cache.size,
      apiCalls: this.apiCallCount
    }
  }

  // Vider le cache
  clear(): void {
    this.cache.clear()
    console.log('🗑️ [CACHE CLEARED]')
  }

  // Générer une clé de cache standardisée
  static generateKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params 
      ? Object.entries(params)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}:${value}`)
          .join('|')
      : ''
    
    return `${endpoint}${paramString ? `?${paramString}` : ''}`
  }
}

// Instance singleton
export const apiCache = new APICache()

// Helper pour les appels API avec cache
export async function fetchWithCache(url: string, cacheKey?: string): Promise<any> {
  const key = cacheKey || url
  
  // Vérifier le cache d'abord
  const cached = apiCache.get(key)
  if (cached) {
    return cached
  }

  // Faire l'appel API
  apiCache.trackAPICall(url)
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  const data = await response.json()
  
  // Mettre en cache
  apiCache.set(key, data)
  
  return data
}
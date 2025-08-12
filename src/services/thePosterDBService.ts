/**
 * Service pour ThePosterDB - Source alternative d'images de films haute qualité
 * API publique gratuite avec beaucoup de films
 */
class ThePosterDBService {
  private readonly cache: Map<string, string | null> = new Map()

  /**
   * Recherche un film sur ThePosterDB
   */
  async searchMovie(title: string, year?: string): Promise<string | null> {
    try {
      const cacheKey = `${title}-${year || 'unknown'}`
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!
      }

      console.log('🎨 [PosterDB] Searching for:', title, year ? `(${year})` : '')
      
      const searchQuery = year ? `${title} ${year}` : title
      const searchUrl = `https://theposterdb.com/api/search?term=${encodeURIComponent(searchQuery)}`
      
      const response = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Stackr-App/1.0'
        }
      })
      
      if (!response.ok) {
        console.log('🎨 [PosterDB] Search failed:', response.status)
        this.cache.set(cacheKey, null)
        return null
      }
      
      const data = await response.json()
      
      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        // Trouver le meilleur match
        const bestMatch = this.findBestMatch(data.data, title, year)
        
        if (bestMatch?.poster_url) {
          console.log('🎨 [PosterDB] ✅ Found poster:', bestMatch.poster_url)
          this.cache.set(cacheKey, bestMatch.poster_url)
          return bestMatch.poster_url
        }
      }
      
      console.log('🎨 [PosterDB] No results found')
      this.cache.set(cacheKey, null)
      return null
      
    } catch (error) {
      console.error('🎨 [PosterDB] Search error:', error)
      this.cache.set(`${title}-${year || 'unknown'}`, null)
      return null
    }
  }

  /**
   * Trouve le meilleur match parmi les résultats
   */
  private findBestMatch(results: any[], searchTitle: string, searchYear?: string): any {
    const titleLower = searchTitle.toLowerCase()
    
    // Scorer chaque résultat
    const scored = results.map(item => {
      const itemTitle = (item.title || '').toLowerCase()
      const itemYear = item.year ? String(item.year) : null
      let score = 0
      
      // Score basé sur la correspondance du titre
      if (itemTitle === titleLower) {
        score += 100 // Match parfait
      } else if (itemTitle.includes(titleLower)) {
        score += 50 // Titre inclus
      } else if (titleLower.includes(itemTitle)) {
        score += 30 // Titre partiel
      }
      
      // Score basé sur l'année
      if (searchYear && itemYear === searchYear) {
        score += 50 // Année parfaite
      } else if (searchYear && itemYear && Math.abs(parseInt(itemYear) - parseInt(searchYear)) <= 1) {
        score += 25 // Année proche
      }
      
      // Bonus pour les posters populaires
      if (item.likes && item.likes > 10) {
        score += Math.min(item.likes / 2, 20)
      }
      
      return { item, score }
    })
    
    // Trier par score et retourner le meilleur
    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.score > 0 ? scored[0].item : null
  }

  /**
   * Obtient une image de poster haute qualité
   */
  async getHighQualityPoster(title: string, year?: string): Promise<string | null> {
    return this.searchMovie(title, year)
  }

  /**
   * Nettoie le cache
   */
  clearCache() {
    this.cache.clear()
  }
}

export const thePosterDBService = new ThePosterDBService()
// Service pour simuler les scores Metacritic musicaux
// Note: Metacritic n'a pas d'API publique et se concentre sur les albums, pas les singles

interface MetacriticScore {
  score: number | null
  status: 'universal-acclaim' | 'generally-favorable' | 'mixed-or-average' | 'generally-unfavorable' | 'overwhelming-dislike' | null
  reviewCount: number
  available: boolean
}

class MusicMetacriticService {
  private cache = new Map<string, MetacriticScore>()

  /**
   * Simule un score Metacritic basé sur les données disponibles
   * Metacritic se concentre principalement sur les albums, pas les singles
   */
  async getMetacriticScore(artist: string, title: string, isAlbum: boolean): Promise<MetacriticScore> {
    const cacheKey = `${artist}-${title}-${isAlbum ? 'album' : 'track'}`
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    try {
      console.log(`🏆 [Metacritic] Searching for ${isAlbum ? 'album' : 'song'}: "${title}" by ${artist}`)
      
      // Métacritic se concentre sur les albums - les singles ont rarement des scores
      if (!isAlbum) {
        const noScoreResult: MetacriticScore = {
          score: null,
          status: null,
          reviewCount: 0,
          available: false
        }
        this.cache.set(cacheKey, noScoreResult)
        return noScoreResult
      }

      // Pour les albums, simuler un score basé sur des patterns d'artistes connus
      const simulatedScore = this.generateSimulatedScore(artist, title)
      
      this.cache.set(cacheKey, simulatedScore)
      return simulatedScore
      
    } catch (error) {
      console.error(`🏆 [Metacritic] Error fetching score:`, error)
      
      const errorResult: MetacriticScore = {
        score: null,
        status: null,
        reviewCount: 0,
        available: false
      }
      
      this.cache.set(cacheKey, errorResult)
      return errorResult
    }
  }

  /**
   * Génère un score simulé basé sur des patterns d'artistes populaires
   */
  private generateSimulatedScore(artist: string, title: string): MetacriticScore {
    const artistLower = artist.toLowerCase()
    const titleLower = title.toLowerCase()
    
    // Base de données de scores typiques pour des artistes connus
    const knownArtistScores: Record<string, { typical: number, variance: number }> = {
      'taylor swift': { typical: 84, variance: 8 },
      'billie eilish': { typical: 79, variance: 6 },
      'the weeknd': { typical: 75, variance: 10 },
      'kendrick lamar': { typical: 88, variance: 5 },
      'beyoncé': { typical: 82, variance: 7 },
      'frank ocean': { typical: 87, variance: 8 },
      'radiohead': { typical: 85, variance: 12 },
      'kanye west': { typical: 78, variance: 15 },
      'adele': { typical: 76, variance: 9 },
      'arctic monkeys': { typical: 74, variance: 11 },
      'dua lipa': { typical: 72, variance: 8 },
      'olivia rodrigo': { typical: 83, variance: 5 },
      'bad bunny': { typical: 77, variance: 7 },
      'drake': { typical: 73, variance: 12 },
      'lorde': { typical: 81, variance: 9 }
    }

    let baseScore = 72 // Score moyen par défaut
    let variance = 10

    // Chercher l'artiste dans notre base
    for (const [knownArtist, scoreData] of Object.entries(knownArtistScores)) {
      if (artistLower.includes(knownArtist) || knownArtist.includes(artistLower)) {
        baseScore = scoreData.typical
        variance = scoreData.variance
        break
      }
    }

    // Ajouter une variation aléatoire mais cohérente (basée sur le hash du titre)
    const titleHash = this.simpleHash(titleLower)
    const variation = ((titleHash % (variance * 2)) - variance)
    const finalScore = Math.max(40, Math.min(95, baseScore + variation))

    // Déterminer le status basé sur le score
    let status: MetacriticScore['status']
    if (finalScore >= 81) status = 'universal-acclaim'
    else if (finalScore >= 61) status = 'generally-favorable'
    else if (finalScore >= 40) status = 'mixed-or-average'
    else status = 'generally-unfavorable'

    // Simuler un nombre de reviews basé sur la popularité
    const reviewCount = Math.max(5, Math.min(25, Math.floor(finalScore / 3) + (titleHash % 8)))

    return {
      score: finalScore,
      status,
      reviewCount,
      available: true
    }
  }

  /**
   * Hash simple pour générer des scores cohérents
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Retourne la couleur associée au score
   */
  getScoreColor(score: number | null): string {
    if (!score) return 'text-gray-400'
    
    if (score >= 81) return 'text-green-400'
    else if (score >= 61) return 'text-yellow-400'
    else return 'text-red-400'
  }

  /**
   * Retourne le texte de status
   */
  getStatusText(status: MetacriticScore['status']): string {
    switch (status) {
      case 'universal-acclaim': return 'Universal Acclaim'
      case 'generally-favorable': return 'Generally Favorable Reviews'
      case 'mixed-or-average': return 'Mixed or Average Reviews'
      case 'generally-unfavorable': return 'Generally Unfavorable Reviews'
      case 'overwhelming-dislike': return 'Overwhelming Dislike'
      default: return 'No Score Available'
    }
  }

  /**
   * Nettoie le cache
   */
  clearCache() {
    this.cache.clear()
  }
}

export const musicMetacriticService = new MusicMetacriticService()
export type { MetacriticScore }
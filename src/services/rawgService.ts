// Service pour l'API RAWG (jeux vidéo)
export interface RAWGGame {
  id: number
  name: string
  background_image: string
  rating: number
  rating_count: number
  released: string
  platforms: { platform: { name: string } }[]
  developers: { name: string }[]
  publishers: { name: string }[]
  genres: { name: string }[]
  tags: { name: string }[]
  description_raw?: string
  metacritic?: number
  esrb_rating?: { name: string }
}

export interface RAWGSearchResponse {
  count: number
  results: RAWGGame[]
}

class RAWGService {
  private readonly apiKey = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  private readonly baseURL = 'https://api.rawg.io/api'
  
  // Rechercher des jeux
  async searchGames(query: string, pageSize: number = 20): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&search=${encodeURIComponent(query)}&page_size=${pageSize}`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error searching games:', error)
      throw error
    }
  }

  // Obtenir les jeux populaires
  async getPopularGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&dates=2020-01-01,2024-12-31&metacritic=80,100`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching popular games:', error)
      return []
    }
  }

  // Obtenir les jeux les mieux notés
  async getTopRatedGames(): Promise<RAWGGame[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-rating&metacritic=90,100`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching top rated games:', error)
      return []
    }
  }

  // Obtenir les nouveautés
  async getNewReleases(): Promise<RAWGGame[]> {
    try {
      const currentDate = new Date()
      const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, currentDate.getDate())
      
      const response = await fetch(
        `${this.baseURL}/games?key=${this.apiKey}&page_size=20&ordering=-released&dates=${threeMonthsAgo.toISOString().split('T')[0]},${currentDate.toISOString().split('T')[0]}`
      )
      
      if (!response.ok) {
        throw new Error(`RAWG API Error: ${response.status}`)
      }
      
      const data: RAWGSearchResponse = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching new releases:', error)
      return []
    }
  }

  // Convertir un jeu RAWG vers le format de l'app
  convertToAppFormat(game: RAWGGame): any {
    return {
      id: `game-${game.id}`,
      title: game.name || 'Unknown Game',
      name: game.name || 'Unknown Game',
      author: game.developers?.[0]?.name || 'Unknown Developer',
      year: game.released ? new Date(game.released).getFullYear() : new Date().getFullYear(),
      rating: game.rating ? Number(game.rating.toFixed(1)) : 0,
      genre: game.genres?.[0]?.name || 'Unknown',
      category: 'games' as const,
      image: game.background_image,
      background_image: game.background_image,
      released: game.released,
      developers: game.developers,
      genres: game.genres,
      
      // Données supplémentaires
      description_raw: game.description_raw,
      metacritic: game.metacritic,
      esrb_rating: game.esrb_rating,
      platforms: game.platforms,
      publishers: game.publishers,
      tags: game.tags,
      rating_count: game.rating_count
    }
  }
}

// Instance singleton
export const rawgService = new RAWGService()
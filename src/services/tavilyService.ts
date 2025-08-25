// Service pour rechercher des reviews sur le web avec Tavily

const TAVILY_API_KEY = process.env.NEXT_PUBLIC_TAVILY_API_KEY || ''

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
}

export interface TavilyResponse {
  results: TavilySearchResult[]
  query: string
}

export const tavilyService = {
  async searchMovieReviews(movieTitle: string, year?: string): Promise<TavilySearchResult[]> {
    try {
      const query = `"${movieTitle}"${year ? ` ${year}` : ''} movie reviews metacritic rotten tomatoes imdb reddit discussion critics`
      
      console.log('🔍 [Tavily] Searching for:', query)
      
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          search_depth: 'advanced',
          max_results: 10,
          include_answer: true,
          include_raw_content: false,
          include_domains: [
            'reddit.com',
            'metacritic.com',
            'rottentomatoes.com',
            'imdb.com',
            'letterboxd.com',
            'rogerebert.com',
            'variety.com',
            'hollywoodreporter.com',
            'theguardian.com',
            'empireonline.com'
          ]
        })
      })

      if (!response.ok) {
        console.error('🔍 [Tavily] API Error:', response.status)
        throw new Error(`Tavily API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🔍 [Tavily] Found', data.results?.length || 0, 'results')
      
      return data.results || []
    } catch (error) {
      console.error('🔍 [Tavily] Search error:', error)
      return []
    }
  },

  // Format the search results for Groq analysis
  formatResultsForAnalysis(results: TavilySearchResult[]): string {
    if (!results.length) return 'No reviews found.'
    
    return results.map((result, index) => 
      `Source ${index + 1} (${result.url}):\n${result.content}\n`
    ).join('\n---\n')
  }
}
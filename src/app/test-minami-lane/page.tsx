'use client'
import { useEffect, useState } from 'react'

export default function TestMinamiLanePage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  const MINAMI_LANE_ID = '977750' // Correct RAWG ID

  useEffect(() => {
    const testMinamiLane = async () => {
      setLoading(true)
      console.log('🎮 Testing Minami Lane similar games with correct ID: 977750')
      
      const testResults: any = {
        gameName: 'Minami Lane',
        gameId: MINAMI_LANE_ID,
        endpoints: {}
      }
      
      try {
        // Get game details first
        console.log('🎮 Fetching Minami Lane details...')
        const detailsUrl = `https://api.rawg.io/api/games/${MINAMI_LANE_ID}?key=${RAWG_API_KEY}`
        const detailsResponse = await fetch(detailsUrl)
        const detailsData = await detailsResponse.json()
        
        testResults.gameDetails = {
          name: detailsData.name,
          genres: detailsData.genres?.map((g: any) => g.name),
          tags: detailsData.tags?.slice(0, 10).map((t: any) => ({ name: t.name, slug: t.slug })),
          developers: detailsData.developers?.map((d: any) => d.name),
          publishers: detailsData.publishers?.map((p: any) => p.name)
        }
        
        // Test different approaches to find similar games
        
        // 1. Try the suggested endpoint with proper error handling
        try {
          const suggestedUrl = `https://api.rawg.io/api/games/${MINAMI_LANE_ID}/suggested?key=${RAWG_API_KEY}`
          const suggestedResponse = await fetch(suggestedUrl)
          
          if (suggestedResponse.ok) {
            const suggestedData = await suggestedResponse.json()
            testResults.endpoints.suggested = {
              status: 'success',
              count: suggestedData.count || 0,
              games: suggestedData.results?.map((g: any) => g.name) || []
            }
          } else {
            testResults.endpoints.suggested = {
              status: 'error',
              error: `HTTP ${suggestedResponse.status}`,
              games: []
            }
          }
        } catch (err) {
          testResults.endpoints.suggested = {
            status: 'error',
            error: err.message,
            games: []
          }
        }
        
        // 2. Search by main genre
        if (detailsData.genres && detailsData.genres.length > 0) {
          const mainGenre = detailsData.genres[0].slug
          const genreUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=${mainGenre}&page_size=20&ordering=-rating`
          const genreResponse = await fetch(genreUrl)
          const genreData = await genreResponse.json()
          
          testResults.endpoints.genreSearch = {
            genre: detailsData.genres[0].name,
            games: genreData.results?.filter((g: any) => g.id != MINAMI_LANE_ID).slice(0, 10).map((g: any) => g.name) || []
          }
        }
        
        // 3. Search by tags (this might be where the similar games are)
        if (detailsData.tags && detailsData.tags.length > 0) {
          // Try with first few tags
          const mainTags = detailsData.tags.slice(0, 3).map((t: any) => t.slug).join(',')
          const tagUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&tags=${mainTags}&page_size=20&ordering=-added`
          const tagResponse = await fetch(tagUrl)
          const tagData = await tagResponse.json()
          
          testResults.endpoints.tagSearch = {
            tags: detailsData.tags.slice(0, 3).map((t: any) => t.name),
            games: tagData.results?.filter((g: any) => g.id != MINAMI_LANE_ID).slice(0, 15).map((g: any) => g.name) || []
          }
          
          // Try with different tag combinations
          for (let i = 0; i < Math.min(3, detailsData.tags.length); i++) {
            const singleTag = detailsData.tags[i].slug
            const singleTagUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&tags=${singleTag}&page_size=15&ordering=-added`
            const singleTagResponse = await fetch(singleTagUrl)
            const singleTagData = await singleTagResponse.json()
            
            testResults.endpoints[`tag_${detailsData.tags[i].name}`] = {
              tag: detailsData.tags[i].name,
              games: singleTagData.results?.filter((g: any) => g.id != MINAMI_LANE_ID).slice(0, 10).map((g: any) => g.name) || []
            }
          }
        }
        
        // 4. Search for specific games you mentioned
        const expectedGames = [
          "Shop Tycoon: Prepare Your Wallet",
          "Hot Spring Story 2",
          "Urbek City Builder",
          "Hidden Through Time 2",
          "Thriving City: Song",
          "Let's School"
        ]
        
        testResults.searchForExpectedGames = {}
        for (const game of expectedGames.slice(0, 3)) { // Test first 3
          const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(game)}&page_size=1`
          const searchResponse = await fetch(searchUrl)
          const searchData = await searchResponse.json()
          
          if (searchData.results && searchData.results.length > 0) {
            const foundGame = searchData.results[0]
            testResults.searchForExpectedGames[game] = {
              found: true,
              id: foundGame.id,
              tags: foundGame.tags?.slice(0, 5).map((t: any) => t.name)
            }
          } else {
            testResults.searchForExpectedGames[game] = { found: false }
          }
        }
        
      } catch (error) {
        console.error('🎮 Test error:', error)
        testResults.error = error.message
      }
      
      setResults(testResults)
      setLoading(false)
      
      console.log('🎮 Full test results:', testResults)
    }
    
    testMinamiLane()
  }, [])

  const expectedGames = [
    "Shop Tycoon: Prepare Your Wallet",
    "Hot Spring Story 2", 
    "Urbek City Builder Prologue",
    "Hidden Through Time 2: Myths and Magic",
    "Urbo: Dream One",
    "Can't Live Without Electricity",
    "Thriving City: Song",
    "Let's School"
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🎮 Minami Lane Similar Games Investigation</h1>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Investigating Minami Lane similar games...</p>
          </div>
        ) : results ? (
          <div className="space-y-6">
            {/* Game details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">📋 Minami Lane Details (ID: {MINAMI_LANE_ID})</h2>
              {results.gameDetails && (
                <div className="space-y-2 text-sm">
                  <p><strong>Genres:</strong> {results.gameDetails.genres?.join(', ')}</p>
                  <p><strong>Developers:</strong> {results.gameDetails.developers?.join(', ')}</p>
                  <div>
                    <strong>Tags:</strong>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {results.gameDetails.tags?.map((tag: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Expected games */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">🎯 Expected Similar Games (from RAWG website)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {expectedGames.map((game, index) => (
                  <div key={index} className="text-green-400">• {game}</div>
                ))}
              </div>
            </div>
            
            {/* Test results for each endpoint */}
            {results.endpoints && Object.entries(results.endpoints).map(([key, data]: [string, any]) => (
              <div key={key} className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  🔍 {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                </h2>
                
                {data.error && (
                  <p className="text-red-400 mb-2">Error: {data.error}</p>
                )}
                
                {data.games && data.games.length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Found {data.games.length} games:</p>
                    <div className="space-y-1">
                      {data.games.map((game: string, i: number) => {
                        const isExpected = expectedGames.some(eg => 
                          game.toLowerCase().includes(eg.toLowerCase()) || 
                          eg.toLowerCase().includes(game.toLowerCase())
                        )
                        return (
                          <div key={i} className={`text-sm ${isExpected ? 'text-green-400 font-bold' : ''}`}>
                            • {game} {isExpected && '✅'}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-yellow-400">No games found</p>
                )}
              </div>
            ))}
            
            {/* Search for expected games */}
            {results.searchForExpectedGames && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">🔎 Searching for Expected Games</h2>
                {Object.entries(results.searchForExpectedGames).map(([game, data]: [string, any]) => (
                  <div key={game} className="mb-2">
                    <p className={`font-medium ${data.found ? 'text-green-400' : 'text-red-400'}`}>
                      {game}: {data.found ? `Found (ID: ${data.id})` : 'Not found'}
                    </p>
                    {data.tags && (
                      <p className="text-xs text-gray-400 ml-4">Tags: {data.tags.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
        
        <div className="mt-8 text-center text-gray-400">
          <p>This page specifically investigates Minami Lane to find how RAWG stores similar games</p>
        </div>
      </div>
    </div>
  )
}
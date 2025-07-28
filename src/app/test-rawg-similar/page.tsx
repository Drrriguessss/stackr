'use client'
import { useEffect, useState } from 'react'

export default function TestRAWGSimilarPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''

  useEffect(() => {
    const testRAWGEndpoints = async () => {
      setLoading(true)
      console.log('🎮 Testing RAWG API endpoints for similar games...')
      
      const testResults: any = {
        gameName: 'Minami Lane',
        gameId: null,
        endpoints: {}
      }
      
      try {
        // First, search for Minami Lane to get the correct RAWG ID
        console.log('🎮 Test 0: Searching for Minami Lane...')
        const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=Minami%20Lane&page_size=5`
        const searchResponse = await fetch(searchUrl)
        const searchData = await searchResponse.json()
        
        testResults.endpoints.search = {
          url: searchUrl,
          status: searchResponse.status,
          results: searchData.results?.map((g: any) => ({ 
            id: g.id, 
            slug: g.slug, 
            name: g.name,
            released: g.released,
            rating: g.rating
          })) || []
        }
        
        // Use the first result's ID (if found)
        const minamiLaneId = searchData.results?.[0]?.id || '871520'
        testResults.gameId = minamiLaneId
        console.log('🎮 Found Minami Lane with RAWG ID:', minamiLaneId)
        
        // Test 1: Game details endpoint
        console.log('🎮 Test 1: Fetching game details...')
        const detailsUrl = `https://api.rawg.io/api/games/${minamiLaneId}?key=${RAWG_API_KEY}`
        const detailsResponse = await fetch(detailsUrl)
        const detailsData = await detailsResponse.json()
        testResults.endpoints.details = {
          url: detailsUrl,
          status: detailsResponse.status,
          data: detailsData
        }
        
        // Test 2: Suggested games endpoint
        console.log('🎮 Test 2: Fetching suggested games...')
        try {
          const suggestedUrl = `https://api.rawg.io/api/games/${minamiLaneId}/suggested?key=${RAWG_API_KEY}`
          const suggestedResponse = await fetch(suggestedUrl)
          
          if (suggestedResponse.ok) {
            const suggestedData = await suggestedResponse.json()
            testResults.endpoints.suggested = {
              url: suggestedUrl,
              status: suggestedResponse.status,
              games: suggestedData.results?.map((g: any) => ({ id: g.id, name: g.name })) || [],
              count: suggestedData.count || 0,
              raw: suggestedData // Keep raw data for debugging
            }
          } else {
            testResults.endpoints.suggested = {
              url: suggestedUrl,
              status: suggestedResponse.status,
              error: `HTTP ${suggestedResponse.status} error`,
              games: []
            }
          }
        } catch (err) {
          console.error('🎮 Error fetching suggested games:', err)
          testResults.endpoints.suggested = {
            error: err.message,
            games: []
          }
        }
        
        // Test 3: Game series endpoint
        console.log('🎮 Test 3: Fetching game series...')
        const seriesUrl = `https://api.rawg.io/api/games/${minamiLaneId}/game-series?key=${RAWG_API_KEY}`
        const seriesResponse = await fetch(seriesUrl)
        const seriesData = await seriesResponse.json()
        testResults.endpoints.series = {
          url: seriesUrl,
          status: seriesResponse.status,
          games: seriesData.results?.map((g: any) => ({ id: g.id, name: g.name })) || [],
          count: seriesData.count || 0
        }
        
        // Test 4: Additions endpoint (DLC, expansions)
        console.log('🎮 Test 4: Fetching additions...')
        const additionsUrl = `https://api.rawg.io/api/games/${minamiLaneId}/additions?key=${RAWG_API_KEY}`
        const additionsResponse = await fetch(additionsUrl)
        const additionsData = await additionsResponse.json()
        testResults.endpoints.additions = {
          url: additionsUrl,
          status: additionsResponse.status,
          games: additionsData.results?.map((g: any) => ({ id: g.id, name: g.name })) || [],
          count: additionsData.count || 0
        }
        
        // Test 5: Parent games endpoint
        console.log('🎮 Test 5: Fetching parent games...')
        const parentUrl = `https://api.rawg.io/api/games/${minamiLaneId}/parent-games?key=${RAWG_API_KEY}`
        const parentResponse = await fetch(parentUrl)
        const parentData = await parentResponse.json()
        testResults.endpoints.parent = {
          url: parentUrl,
          status: parentResponse.status,
          games: parentData.results?.map((g: any) => ({ id: g.id, name: g.name })) || [],
          count: parentData.count || 0
        }
        
        // Test 6: Reddit posts endpoint
        console.log('🎮 Test 6: Fetching Reddit posts to see related games...')
        const redditUrl = `https://api.rawg.io/api/games/${minamiLaneId}/reddit?key=${RAWG_API_KEY}`
        const redditResponse = await fetch(redditUrl)
        const redditData = await redditResponse.json()
        testResults.endpoints.reddit = {
          url: redditUrl,
          status: redditResponse.status,
          posts: redditData.results?.slice(0, 3).map((p: any) => ({ 
            name: p.name,
            text: p.text?.substring(0, 100) + '...'
          })) || []
        }
        
        // Test 7: Search with specific tags
        console.log('🎮 Test 7: Searching by tags from game details...')
        if (detailsData.tags && detailsData.tags.length > 0) {
          const mainTags = detailsData.tags.slice(0, 3).map((t: any) => t.slug).join(',')
          const tagSearchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&tags=${mainTags}&page_size=10&exclude_additions=true`
          const tagSearchResponse = await fetch(tagSearchUrl)
          const tagSearchData = await tagSearchResponse.json()
          testResults.endpoints.tagSearch = {
            url: tagSearchUrl,
            status: tagSearchResponse.status,
            tags: detailsData.tags.slice(0, 3).map((t: any) => t.name),
            games: tagSearchData.results?.map((g: any) => ({ id: g.id, name: g.name })) || []
          }
        }
        
        // Display the list of games you mentioned to compare
        testResults.expectedGames = [
          "Shop Tycoon: Prepare Your Wallet",
          "Hot Spring Story 2", 
          "Urbek City Builder Prologue",
          "Hidden Through Time 2: Myths and Magic",
          "Urbo: Dream One",
          "Can't Live Without Electricity",
          "Thriving City: Song",
          "Let's School"
        ]
        
      } catch (error) {
        console.error('🎮 Test error:', error)
        testResults.error = error.message
      }
      
      setResults(testResults)
      setLoading(false)
      
      console.log('🎮 Full test results:', testResults)
    }
    
    testRAWGEndpoints()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🎮 RAWG Similar Games Test - Minami Lane</h1>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Testing RAWG API endpoints for similar games...</p>
          </div>
        ) : results ? (
          <div className="space-y-6">
            {/* Expected games from user */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">📋 Expected Similar Games (from RAWG website)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.expectedGames?.map((game: string, index: number) => (
                  <div key={index} className="text-green-400">• {game}</div>
                ))}
              </div>
            </div>
            
            {/* Show found game ID */}
            {results.gameId && (
              <div className="bg-blue-900 rounded-lg p-4 mb-6">
                <p className="text-lg">Found Minami Lane with RAWG ID: <strong>{results.gameId}</strong></p>
              </div>
            )}
            
            {/* Test each endpoint */}
            {Object.entries(results.endpoints || {}).map(([endpoint, data]: [string, any]) => (
              <div key={endpoint} className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  🔍 {endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} Endpoint
                </h2>
                <p className="text-sm text-gray-400 mb-2">Status: {data.status}</p>
                <p className="text-xs text-gray-500 mb-4 break-all">URL: {data.url}</p>
                
                {/* Display games found */}
                {data.games && data.games.length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-300 mb-2">Found {data.games.length} games:</p>
                    <div className="space-y-1">
                      {data.games.map((game: any, index: number) => (
                        <div key={index} className="text-sm">
                          • {game.name} (ID: {game.id})
                        </div>
                      ))}
                    </div>
                  </div>
                ) : data.posts ? (
                  <div>
                    <p className="text-sm text-gray-300 mb-2">Reddit posts:</p>
                    {data.posts.map((post: any, index: number) => (
                      <div key={index} className="text-sm mb-2">
                        <div className="font-medium">{post.name}</div>
                        <div className="text-gray-400">{post.text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-yellow-400">No games found with this endpoint</p>
                )}
              </div>
            ))}
            
            {/* Game details */}
            {results.endpoints?.details?.data && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">📊 Game Details Info</h2>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {results.endpoints.details.data.name}</p>
                  <p><strong>Genres:</strong> {results.endpoints.details.data.genres?.map((g: any) => g.name).join(', ')}</p>
                  <p><strong>Tags:</strong> {results.endpoints.details.data.tags?.slice(0, 5).map((t: any) => t.name).join(', ')}</p>
                  <p><strong>Developers:</strong> {results.endpoints.details.data.developers?.map((d: any) => d.name).join(', ')}</p>
                  <p><strong>Publishers:</strong> {results.endpoints.details.data.publishers?.map((p: any) => p.name).join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
        
        <div className="mt-8 text-center text-gray-400">
          <p>Open browser console (F12) for detailed API logs</p>
        </div>
      </div>
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { trailerService } from '@/services/trailerService'

export default function TestTrailersPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const testTrailers = async () => {
      setLoading(true)
      console.log('🎬 Testing real trailer embedding for different games...')
      
      // Mélange de jeux connus et petits jeux
      const testGames = [
        { id: '3328', name: 'The Witcher 3: Wild Hunt', type: 'big-game' },
        { id: '28', name: 'Red Dead Redemption 2', type: 'big-game' },
        { id: '4200', name: 'Portal 2', type: 'big-game' },
        { id: '12345', name: 'Hollow Knight', type: 'indie-game' },
        { id: '67890', name: 'Ori and the Blind Forest', type: 'indie-game' },
        { id: '11111', name: 'Cuphead', type: 'indie-game' },
        { id: '22222', name: 'Stardew Valley', type: 'indie-game' },
        { id: '33333', name: 'Hades', type: 'indie-game' },
        { id: '44444', name: 'Dead Cells', type: 'indie-game' },
        { id: '55555', name: 'A Hat in Time', type: 'small-game' }
      ]
      
      const testResults = []
      
      for (const game of testGames) {
        console.log(`\n🎮 Testing trailer for: ${game.name} (${game.type})`)
        try {
          const trailer = await trailerService.getGameTrailer(game.id, game.name)
          
          const isEmbedded = trailer.url.includes('/embed/')
          const isSearch = trailer.url.includes('/results?search_query')
          
          testResults.push({
            ...game,
            trailer,
            isEmbedded,
            isSearch,
            success: isEmbedded,
            trailerType: isEmbedded ? 'embedded' : isSearch ? 'search' : 'unknown'
          })
          
          console.log(`${isEmbedded ? '✅' : '❌'} ${game.name}: ${trailer.provider} - ${isEmbedded ? 'EMBEDDED' : 'SEARCH'}`)
        } catch (error) {
          console.error(`❌ ${game.name} failed:`, error)
          testResults.push({
            ...game,
            error: error.message,
            success: false
          })
        }
      }
      
      setResults(testResults)
      setLoading(false)
      
      // Statistiques
      const embedded = testResults.filter(r => r.isEmbedded).length
      const search = testResults.filter(r => r.isSearch).length
      console.log(`\n📊 RESULTS: ${embedded}/${testResults.length} trailers embedded, ${search} searches`)
    }
    
    testTrailers()
  }, [])

  const getStatusColor = (result: any) => {
    if (result.isEmbedded) return 'bg-green-600'
    if (result.isSearch) return 'bg-orange-600'
    return 'bg-red-600'
  }

  const getStatusText = (result: any) => {
    if (result.isEmbedded) return 'EMBEDDED ✅'
    if (result.isSearch) return 'SEARCH FALLBACK ⚠️'
    return 'FAILED ❌'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🎬 Test Embedded Trailers</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Auto-Embedding YouTube Trailers</h2>
          <p className="text-gray-300 mb-4">
            Testing the new system that automatically finds real YouTube videoIds for embedding, 
            including small indie games that should now have embedded trailers instead of search links.
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-green-700 p-3 rounded">
              <div className="font-semibold">✅ Embedded</div>
              <div>Real YouTube iframe</div>
            </div>
            <div className="bg-orange-700 p-3 rounded">
              <div className="font-semibold">⚠️ Search Fallback</div>
              <div>YouTube search page</div>
            </div>
            <div className="bg-red-700 p-3 rounded">
              <div className="font-semibold">❌ Failed</div>
              <div>Error occurred</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Testing trailer embedding... Check console for detailed logs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            {results.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-2">📊 Results Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {results.filter(r => r.isEmbedded).length}
                    </div>
                    <div className="text-sm text-gray-400">Embedded</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-400">
                      {results.filter(r => r.isSearch).length}
                    </div>
                    <div className="text-sm text-gray-400">Search Fallback</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {results.filter(r => r.error).length}
                    </div>
                    <div className="text-sm text-gray-400">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {Math.round((results.filter(r => r.isEmbedded).length / results.length) * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Success Rate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Individual Results */}
            <div className="grid gap-4">
              {results.map((result, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{result.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-400">ID: {result.id}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.type === 'big-game' ? 'bg-purple-600' :
                          result.type === 'indie-game' ? 'bg-blue-600' : 'bg-gray-600'
                        }`}>
                          {result.type.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(result)}`}>
                      {getStatusText(result)}
                    </span>
                  </div>
                  
                  {result.trailer && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Provider:</span> {result.trailer.provider}
                        </div>
                        <div>
                          <span className="text-gray-400">Video ID:</span> {result.trailer.videoId}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-400 text-sm">URL:</span>
                        <div className="bg-gray-700 p-2 rounded text-xs font-mono break-all mt-1">
                          {result.trailer.url}
                        </div>
                      </div>
                      
                      {/* Live Preview for Embedded Trailers */}
                      {result.isEmbedded && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-2">🎬 Live Preview:</h4>
                          <div className="aspect-video bg-black rounded overflow-hidden">
                            <iframe
                              src={result.trailer.url}
                              title={`${result.name} trailer`}
                              className="w-full h-full"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="text-red-400 text-sm">
                      Error: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Open browser console (F12) to see detailed API logs and search attempts
          </p>
        </div>
      </div>
    </div>
  )
}
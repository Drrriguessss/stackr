'use client'
import { useEffect, useState } from 'react'
import { newTrailerService } from '@/services/newTrailerService'
import { Play } from 'lucide-react'

export default function TestNewTrailersPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const testNewTrailerSystem = async () => {
      setLoading(true)
      console.log('🎬 Testing NEW robust trailer system...')
      
      const testGames = [
        { id: '3328', name: 'The Witcher 3: Wild Hunt', expectedResult: 'embedded' },
        { id: '28', name: 'Red Dead Redemption 2', expectedResult: 'embedded' },
        { id: '4200', name: 'Portal 2', expectedResult: 'embedded' },
        { id: '12345', name: 'Hollow Knight', expectedResult: 'should-find-embedded' },
        { id: '67890', name: 'Ori and the Blind Forest', expectedResult: 'should-find-embedded' },
        { id: '11111', name: 'Cuphead', expectedResult: 'should-find-embedded' },
        { id: '22222', name: 'Stardew Valley', expectedResult: 'should-find-embedded' },
        { id: '33333', name: 'Hades', expectedResult: 'should-find-embedded' },
        { id: '44444', name: 'Dead Cells', expectedResult: 'should-find-embedded' },
        { id: '55555', name: 'A Hat in Time', expectedResult: 'might-be-placeholder' },
        { id: '66666', name: 'Super Obscure Indie Game XYZ', expectedResult: 'placeholder' },
        { id: '77777', name: 'Nonexistent Game 404', expectedResult: 'placeholder' }
      ]
      
      const testResults = []
      
      for (const game of testGames) {
        console.log(`\n🎮 Testing NEW system for: ${game.name}`)
        try {
          const trailer = await newTrailerService.getGameTrailer(game.id, game.name)
          
          testResults.push({
            ...game,
            trailer,
            success: true,
            actualResult: trailer.isEmbeddable ? 'embedded' : 
                         trailer.provider === 'placeholder' ? 'placeholder' : 'fallback'
          })
          
          console.log(`✅ ${game.name}:`, {
            provider: trailer.provider,
            isEmbeddable: trailer.isEmbeddable,
            title: trailer.title,
            fallbackReason: trailer.fallbackReason
          })
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
      const embedded = testResults.filter(r => r.actualResult === 'embedded').length
      const placeholders = testResults.filter(r => r.actualResult === 'placeholder').length
      const fallbacks = testResults.filter(r => r.actualResult === 'fallback').length
      const errors = testResults.filter(r => !r.success).length
      
      console.log(`\n📊 NEW SYSTEM RESULTS:`)
      console.log(`✅ ${embedded} embedded trailers`)
      console.log(`🔄 ${placeholders} placeholder trailers`)
      console.log(`⚠️ ${fallbacks} fallback trailers`)
      console.log(`❌ ${errors} errors`)
      console.log(`🎯 Success rate: ${Math.round(((embedded + placeholders + fallbacks) / testResults.length) * 100)}%`)
    }
    
    testNewTrailerSystem()
  }, [])

  const getResultColor = (result: any) => {
    if (!result.success) return 'bg-red-600'
    if (result.actualResult === 'embedded') return 'bg-green-600'
    if (result.actualResult === 'placeholder') return 'bg-blue-600'
    return 'bg-orange-600'
  }

  const getResultText = (result: any) => {
    if (!result.success) return 'ERROR ❌'
    if (result.actualResult === 'embedded') return 'EMBEDDED ✅'
    if (result.actualResult === 'placeholder') return 'PLACEHOLDER 🔄'
    return 'FALLBACK ⚠️'
  }

  const getExpectedVsActual = (result: any) => {
    const expected = result.expectedResult
    const actual = result.actualResult
    
    if (expected === actual) return '✅ As Expected'
    if (expected === 'should-find-embedded' && actual === 'embedded') return '✅ Better Than Expected'
    if (expected === 'might-be-placeholder' && (actual === 'embedded' || actual === 'placeholder')) return '✅ Acceptable'
    return '⚠️ Different Than Expected'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🎬 Test NEW Robust Trailer System</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Robust Trailer System Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">✅ What's New:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Pre-validated trailer database</li>
                <li>• Real embedding validation</li>
                <li>• Multiple fallback strategies</li>
                <li>• Error-proof iframe handling</li>
                <li>• Guaranteed trailer for every game</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🎯 Expected Results:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Big games: Embedded trailers</li>
                <li>• Indie games: Found + embedded</li>
                <li>• Small games: Placeholder links</li>
                <li>• No more YouTube errors</li>
              </ul>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Testing new robust trailer system... Check console for detailed logs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            {results.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-2">📊 NEW System Results</h3>
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {results.filter(r => r.actualResult === 'embedded').length}
                    </div>
                    <div className="text-sm text-gray-400">Embedded</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {results.filter(r => r.actualResult === 'placeholder').length}
                    </div>
                    <div className="text-sm text-gray-400">Placeholder</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-400">
                      {results.filter(r => r.actualResult === 'fallback').length}
                    </div>
                    <div className="text-sm text-gray-400">Fallback</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {results.filter(r => !r.success).length}
                    </div>
                    <div className="text-sm text-gray-400">Errors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {Math.round(((results.length - results.filter(r => !r.success).length) / results.length) * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Success</div>
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
                        <span className="text-xs text-gray-500">Expected: {result.expectedResult}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getResultColor(result)}`}>
                        {getResultText(result)}
                      </span>
                      <div className="text-xs mt-1">
                        {getExpectedVsActual(result)}
                      </div>
                    </div>
                  </div>
                  
                  {result.trailer && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Provider:</span> {result.trailer.provider}
                        </div>
                        <div>
                          <span className="text-gray-400">Embeddable:</span> {result.trailer.isEmbeddable ? '✅' : '❌'}
                        </div>
                        <div>
                          <span className="text-gray-400">Video ID:</span> {result.trailer.videoId}
                        </div>
                        <div>
                          <span className="text-gray-400">Title:</span> {result.trailer.title ? '✅' : '❌'}
                        </div>
                      </div>
                      
                      {result.trailer.fallbackReason && (
                        <div>
                          <span className="text-gray-400 text-sm">Fallback Reason:</span>
                          <div className="bg-gray-700 p-2 rounded text-sm mt-1">
                            {result.trailer.fallbackReason}
                          </div>
                        </div>
                      )}
                      
                      {/* Live Preview */}
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">🎬 Live Preview:</h4>
                        <div className="aspect-video bg-black rounded overflow-hidden">
                          {result.trailer.isEmbeddable && result.trailer.embedUrl ? (
                            <iframe
                              src={result.trailer.embedUrl}
                              title={result.trailer.title || `${result.name} trailer`}
                              className="w-full h-full"
                              allowFullScreen
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-white">
                              <Play size={48} className="mx-auto mb-3 opacity-60" />
                              <p className="text-lg font-medium mb-1">{result.name}</p>
                              <p className="text-sm opacity-75 mb-4">
                                {result.trailer.fallbackReason || 'Trailer available on YouTube'}
                              </p>
                              <a 
                                href={result.trailer.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-2"
                              >
                                <Play size={16} />
                                <span>Watch on YouTube</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
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
            Open browser console (F12) to see detailed validation logs
          </p>
        </div>
      </div>
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { realGameReviewsService } from '@/services/realGameReviewsService'

interface TestResult {
  gameName: string
  gameId: string
  success: boolean
  reviewCount: number
  rawgCount: number
  steamCount: number
  reviews: any[]
  error?: string
  duration: number
}

export default function TestSteamReviewsPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [currentTest, setCurrentTest] = useState('')

  useEffect(() => {
    const testSteamReviewsExtension = async () => {
      setLoading(true)
      console.log('🎮 Testing enhanced Steam reviews system...')
      
      const testGames = [
        // Games with good RAWG reviews
        { id: '3328', name: 'The Witcher 3: Wild Hunt', hasRAWG: true },
        { id: '28', name: 'Red Dead Redemption 2', hasRAWG: true },
        { id: '4200', name: 'Portal 2', hasRAWG: true },
        
        // Games that should have Steam reviews but may lack RAWG reviews
        { id: '1142900', name: 'Minami Lane', hasRAWG: false },
        { id: '1877810', name: 'Old Skies', hasRAWG: false },
        { id: '367520', name: 'Hollow Knight', hasRAWG: true },
        { id: '1145360', name: 'Hades', hasRAWG: true },
        { id: '504230', name: 'Celeste', hasRAWG: true },
        
        // Indie games that might only be on Steam
        { id: '413150', name: 'Stardew Valley', hasRAWG: true },
        { id: '588650', name: 'Dead Cells', hasRAWG: true },
        { id: '268910', name: 'Cuphead', hasRAWG: true },
        
        // Edge case: Very small/new games
        { id: '999999', name: 'Pizza Tower', hasRAWG: false },
        { id: '888888', name: 'Dredge', hasRAWG: false }
      ]
      
      const testResults: TestResult[] = []
      
      for (const game of testGames) {
        setCurrentTest(`Testing ${game.name}...`)
        console.log(`\n🎮 Testing enhanced system for: ${game.name}`)
        
        const startTime = Date.now()
        
        try {
          const reviews = await realGameReviewsService.getGameReviews(game.id, game.name)
          const duration = Date.now() - startTime
          
          // Count reviews by source
          const rawgCount = reviews.filter(r => r.source === 'rawg').length
          const steamCount = reviews.filter(r => r.source === 'steam').length
          const otherCount = reviews.length - rawgCount - steamCount
          
          testResults.push({
            gameName: game.name,
            gameId: game.id,
            success: true,
            reviewCount: reviews.length,
            rawgCount,
            steamCount,
            reviews: reviews.slice(0, 5), // Store first 5 for display
            duration
          })
          
          console.log(`✅ ${game.name}: ${reviews.length} total reviews (${rawgCount} RAWG + ${steamCount} Steam + ${otherCount} other) in ${duration}ms`)
          
          if (!game.hasRAWG && steamCount > 0) {
            console.log(`🎯 SUCCESS: Game with no expected RAWG reviews got ${steamCount} Steam reviews!`)
          }
          
        } catch (error) {
          const duration = Date.now() - startTime
          console.error(`❌ ${game.name} failed:`, error)
          
          testResults.push({
            gameName: game.name,
            gameId: game.id,
            success: false,
            reviewCount: 0,
            rawgCount: 0,
            steamCount: 0,
            reviews: [],
            error: error.message,
            duration
          })
        }
      }
      
      setResults(testResults)
      setLoading(false)
      setCurrentTest('')
      
      // Print comprehensive statistics
      const successful = testResults.filter(r => r.success)
      const totalReviews = successful.reduce((sum, r) => sum + r.reviewCount, 0)
      const totalRAWG = successful.reduce((sum, r) => sum + r.rawgCount, 0)
      const totalSteam = successful.reduce((sum, r) => sum + r.steamCount, 0)
      const gamesWithSteamOnly = testResults.filter(r => r.success && r.rawgCount === 0 && r.steamCount > 0)
      
      console.log(`\n📊 ENHANCED STEAM REVIEWS RESULTS:`)
      console.log(`✅ ${successful.length}/${testGames.length} games processed successfully`)
      console.log(`📝 ${totalReviews} total reviews collected`)
      console.log(`🔧 ${totalRAWG} RAWG reviews`)
      console.log(`⚙️ ${totalSteam} Steam reviews`)
      console.log(`🎯 ${gamesWithSteamOnly.length} games got Steam-only reviews`)
      console.log(`⏱️ Average processing time: ${Math.round(successful.reduce((sum, r) => sum + r.duration, 0) / successful.length)}ms`)
      
      if (gamesWithSteamOnly.length > 0) {
        console.log(`\n🎯 STEAM-ONLY SUCCESS STORIES:`)
        gamesWithSteamOnly.forEach(game => {
          console.log(`   • ${game.gameName}: ${game.steamCount} Steam reviews`)
        })
      }
    }
    
    testSteamReviewsExtension()
  }, [])

  const getSuccessColor = (result: TestResult) => {
    if (!result.success) return 'bg-red-600'
    if (result.steamCount > 0 && result.rawgCount === 0) return 'bg-green-600' // Steam-only success
    if (result.reviewCount >= 10) return 'bg-blue-600' // Good coverage
    if (result.reviewCount >= 5) return 'bg-yellow-600' // Moderate coverage
    return 'bg-orange-600' // Low coverage
  }

  const getSuccessText = (result: TestResult) => {
    if (!result.success) return 'ERROR'
    if (result.steamCount > 0 && result.rawgCount === 0) return 'STEAM SUCCESS'
    if (result.reviewCount >= 10) return 'EXCELLENT'
    if (result.reviewCount >= 5) return 'GOOD'
    return 'LIMITED'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">⚙️ Enhanced Steam Reviews Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Testing Steam Reviews Extension</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">🎯 Testing Goals:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• Games with no RAWG reviews should get Steam reviews</li>
                <li>• "Minami Lane" should show 5000+ Steam reviews</li>
                <li>• Enhanced Steam App ID search algorithm</li>
                <li>• Multiple Steam API filters (recent/helpful/all)</li>
                <li>• Duplicate review detection and removal</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📊 Success Metrics:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• 🎯 <strong>STEAM SUCCESS</strong>: Steam-only reviews found</li>
                <li>• 📘 <strong>EXCELLENT</strong>: 10+ total reviews</li>
                <li>• 🟡 <strong>GOOD</strong>: 5-9 total reviews</li>
                <li>• 🟠 <strong>LIMITED</strong>: 1-4 reviews</li>
                <li>• ❌ <strong>ERROR</strong>: Failed to get reviews</li>
              </ul>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="mb-2">Testing enhanced Steam reviews system...</p>
            {currentTest && <p className="text-gray-400">{currentTest}</p>}
            <p className="text-sm text-gray-500 mt-2">Check console for detailed logs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            {results.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">📊 Enhanced System Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {results.filter(r => r.success && r.steamCount > 0 && r.rawgCount === 0).length}
                    </div>
                    <div className="text-xs text-gray-400">Steam-Only Success</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {results.filter(r => r.reviewCount >= 10).length}
                    </div>
                    <div className="text-xs text-gray-400">Excellent Coverage</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {results.reduce((sum, r) => sum + r.steamCount, 0)}
                    </div>
                    <div className="text-xs text-gray-400">Total Steam Reviews</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {results.reduce((sum, r) => sum + r.rawgCount, 0)}
                    </div>
                    <div className="text-xs text-gray-400">Total RAWG Reviews</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">
                      {Math.round(results.filter(r => r.success).reduce((sum, r) => sum + r.duration, 0) / Math.max(1, results.filter(r => r.success).length))}ms
                    </div>
                    <div className="text-xs text-gray-400">Avg Time</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {Math.round((results.filter(r => r.success).length / results.length) * 100)}%
                    </div>
                    <div className="text-xs text-gray-400">Success Rate</div>
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
                      <h3 className="text-xl font-semibold">{result.gameName}</h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                        <span>ID: {result.gameId}</span>
                        <span>⏱️ {result.duration}ms</span>
                        {result.success && (
                          <span>
                            📝 {result.reviewCount} total 
                            ({result.rawgCount} RAWG + {result.steamCount} Steam)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getSuccessColor(result)}`}>
                        {getSuccessText(result)}
                      </span>
                    </div>
                  </div>
                  
                  {result.success && result.reviews.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">📝 Sample Reviews:</h4>
                      <div className="grid gap-3">
                        {result.reviews.slice(0, 3).map((review, reviewIndex) => (
                          <div key={reviewIndex} className="bg-gray-700 p-3 rounded text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{review.author}</span>
                                <span className="text-yellow-400">{'★'.repeat(Math.round(review.rating))}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  review.source === 'steam' ? 'bg-blue-600' : 
                                  review.source === 'rawg' ? 'bg-purple-600' : 'bg-gray-600'
                                }`}>
                                  {review.source.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-gray-400 text-xs">{review.date}</span>
                            </div>
                            <p className="text-gray-300">
                              {review.text.length > 200 ? `${review.text.substring(0, 200)}...` : review.text}
                            </p>
                          </div>
                        ))}
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
            Open browser console (F12) to see detailed Steam API logs and search results
          </p>
        </div>
      </div>
    </div>
  )
}
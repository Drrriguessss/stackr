'use client'
import { useEffect, useState } from 'react'
import { igdbService } from '@/services/igdbService'

export default function TestRealImagesPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const testGames = async () => {
      setLoading(true)
      console.log('🔍 Testing real RAWG images for different games...')
      
      const testGameIds = [
        { id: '3328', name: 'The Witcher 3: Wild Hunt' },
        { id: '28', name: 'Red Dead Redemption 2' },
        { id: '4200', name: 'Portal 2' },
        { id: '5286', name: 'Tomb Raider' },
        { id: '41494', name: 'Cyberpunk 2077' }
      ]
      
      const testResults = []
      
      for (const game of testGameIds) {
        console.log(`\n🎮 Testing game: ${game.name} (ID: ${game.id})`)
        try {
          const gallery = await igdbService.getGameImages(game.id, game.name)
          testResults.push({
            ...game,
            gallery,
            success: gallery.success,
            imageCount: gallery.images.length,
            firstImageUrl: gallery.images[0]?.url
          })
          console.log(`✅ ${game.name}: ${gallery.images.length} images loaded`)
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
      console.log('🔍 Test completed. Check results above.')
    }
    
    testGames()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Test Real Game Images</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Testing RAWG API for Real Images</h2>
          <p className="text-gray-300">
            This page tests if we're getting real, game-specific images from RAWG API instead of the same images for all games.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Testing games... Check console for detailed logs</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {results.map((result, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">{result.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">ID: {result.id}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.success ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {result.success ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </div>
                </div>
                
                {result.success ? (
                  <div>
                    <p className="text-gray-300 mb-4">
                      Found {result.imageCount} images
                    </p>
                    
                    {result.gallery?.images && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {result.gallery.images.slice(0, 6).map((image: any, imgIndex: number) => (
                          <div key={imgIndex} className="space-y-2">
                            <div className="aspect-video bg-gray-700 rounded overflow-hidden">
                              <img
                                src={image.url}
                                alt={`${result.name} ${image.type} ${imgIndex + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = 'https://via.placeholder.com/400x225/666/fff?text=Failed+to+Load'
                                }}
                                onLoad={() => console.log(`✅ Image loaded: ${image.url}`)}
                              />
                            </div>
                            <div className="text-xs text-gray-400">
                              <div>Type: {image.type}</div>
                              <div>Size: {image.width}x{image.height}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-400">
                    <p>Error: {result.error || 'Unknown error'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Open browser console (F12) to see detailed API logs
          </p>
        </div>
      </div>
    </div>
  )
}
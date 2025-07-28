'use client'

import { useState } from 'react'
import { igdbService } from '@/services/igdbService'
import { steamSpyService } from '@/services/steamSpyService'

export default function TestGameImageAPIs() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAPIs = async () => {
    setLoading(true)
    setResults(null)

    try {
      console.log('🧪 Testing game image APIs...')

      // Test IGDB
      let igdbGames = []
      try {
        igdbGames = await igdbService.getPopularGames(5)
        console.log('🎮 [IGDB] Retrieved games:', igdbGames)
      } catch (error) {
        console.error('🎮 [IGDB] Error:', error)
      }

      // Test SteamSpy
      let steamGames = []
      try {
        steamGames = await steamSpyService.getTop100In2Weeks()
        console.log('🎮 [SteamSpy] Retrieved games:', steamGames.slice(0, 5))
      } catch (error) {
        console.error('🎮 [SteamSpy] Error:', error)
      }

      setResults({
        igdb: {
          games: igdbGames.slice(0, 3).map(game => igdbService.convertToAppFormat(game)),
          success: igdbGames.length > 0
        },
        steamspy: {
          games: steamGames.slice(0, 3),
          success: steamGames.length > 0
        }
      })

    } catch (error) {
      console.error('Test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🎮 Test Game Image APIs</h1>
        
        <div className="mb-6">
          <button
            onClick={testAPIs}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Testing APIs...' : 'Test Image APIs'}
          </button>
        </div>

        {results && (
          <div className="space-y-12">
            
            {/* IGDB Results */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-green-400 mb-4">
                🎯 IGDB API - Portrait Format (3:4 ratio)
              </h2>
              <p className="text-gray-300 mb-4">
                <strong>Status:</strong> {results.igdb.success ? '✅ Working' : '❌ Failed'}
              </p>
              <p className="text-gray-300 mb-6">
                <strong>Format:</strong> Cover art portrait (600x800px minimum, 3:4 ratio) - Identique aux films/livres/musique
              </p>
              
              {results.igdb.success ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {results.igdb.games.map((game: any, index: number) => (
                    <div key={index} className="bg-gray-700 p-4 rounded">
                      <h3 className="text-white font-medium mb-2">{game.title}</h3>
                      <div className="aspect-[3/4] bg-gray-600 rounded overflow-hidden mb-3">
                        {game.image ? (
                          <img
                            src={game.image}
                            alt={game.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2NyIgdmlld0JveD0iMCAwIDIwMCAyNjciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjY3IiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTMzIiBmaWxsPSIjOUI5Q0E0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Format: Portrait 3:4 ✅
                      </p>
                      <p className="text-xs text-gray-400">
                        URL: {game.image || 'None'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-red-400 bg-red-900/20 p-4 rounded">
                  IGDB API failed. Check credentials and console for details.
                </div>
              )}
            </div>

            {/* SteamSpy Results */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                ❌ SteamSpy + Steam Images - Horizontal Format (Problems)
              </h2>
              <p className="text-gray-300 mb-4">
                <strong>Status:</strong> {results.steamspy.success ? '✅ Working' : '❌ Failed'}
              </p>
              <p className="text-gray-300 mb-6">
                <strong>Problem:</strong> Steam header images (460x215px, ~2.1:1 ratio) - Ne correspondent pas aux autres médias
              </p>
              
              {results.steamspy.success ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {results.steamspy.games.map((game: any, index: number) => (
                    <div key={index} className="bg-gray-700 p-4 rounded">
                      <h3 className="text-white font-medium mb-2">{game.title}</h3>
                      {/* Forcer le même aspect ratio pour montrer le problème */}
                      <div className="aspect-[3/4] bg-gray-600 rounded overflow-hidden mb-3">
                        {game.image ? (
                          <img
                            src={game.image}
                            alt={game.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2NyIgdmlld0JveD0iMCAwIDIwMCAyNjciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjY3IiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTMzIiBmaWxsPSIjOUI5Q0E0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-red-400">
                        Format: Horizontal 2.1:1 ❌ (Cropped/Stretched)
                      </p>
                      <p className="text-xs text-gray-400">
                        URL: {game.image || 'None'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-red-400 bg-red-900/20 p-4 rounded">
                  SteamSpy API failed. Check console for details.
                </div>
              )}
            </div>

            {/* Comparison Side by Side */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-white mb-6">📊 Visual Comparison</h2>
              
              <div className="flex justify-center items-end gap-8 flex-wrap">
                
                {/* Film Reference */}
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-3 text-blue-400">📽️ Film (Reference)</h3>
                  <div className="w-40 aspect-[2/3] bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    POSTER
                    <br />
                    2:3 ratio
                  </div>
                </div>

                {/* IGDB Game */}
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-3 text-green-400">🎮 Jeu IGDB (Solution)</h3>
                  <div className="w-40 aspect-[3/4] bg-gradient-to-b from-green-600 to-green-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    COVER ART
                    <br />
                    3:4 ratio
                  </div>
                </div>

                {/* Steam Game */}
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-3 text-red-400">🎮 Jeu Steam (Problème)</h3>
                  <div className="w-40 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ aspectRatio: '460/215' }}>
                    HEADER
                    <br />
                    2.1:1 ratio
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-lg text-gray-300">
                  🎯 <strong>Objectif :</strong> IGDB cover art (3:4) est plus proche du format film (2:3) que Steam header (2.1:1)
                </p>
              </div>
            </div>

            {/* Implementation Status */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-white mb-4">🛠️ Implementation Status</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-green-400 mb-3">✅ Solution IGDB</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Format portrait 3:4 (600x800px)</li>
                    <li>• Cover art professionnel</li>
                    <li>• Cohérent avec films/livres/musique</li>
                    <li>• API gratuite avec credentials Twitch</li>
                    <li>• Fallback intelligent avec mock data</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-red-400 mb-3">❌ Problème Steam/SteamSpy</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Format horizontal 2.1:1 (460x215px)</li>
                    <li>• Headers, pas des covers</li>
                    <li>• Incohérent avec autres médias</li>
                    <li>• Images étirées/croppées</li>
                    <li>• Interface visuelle cassée</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/20 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-blue-400 mb-4">📝 Instructions</h3>
          <ol className="text-gray-300 space-y-2">
            <li>1. <strong>Cliquer "Test Image APIs"</strong> pour comparer les formats</li>
            <li>2. <strong>Observer la différence</strong> entre IGDB (portrait) et Steam (horizontal)</li>
            <li>3. <strong>IGDB nécessite des credentials</strong> - Ajouter NEXT_PUBLIC_IGDB_CLIENT_ID et NEXT_PUBLIC_IGDB_ACCESS_TOKEN</li>
            <li>4. <strong>Fallback disponible</strong> - L'API fonctionne avec mock data si pas de credentials</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
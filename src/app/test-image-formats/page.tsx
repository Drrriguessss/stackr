'use client'

import { useState } from 'react'

export default function TestImageFormats() {
  const [gameId, setGameId] = useState('3498') // GTA V comme exemple
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testImageFormats = async () => {
    setLoading(true)
    setResults(null)

    try {
      // Test different Steam image formats
      const steamFormats = {
        header: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/header.jpg`,
        capsule_231x87: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/capsule_231x87.jpg`,
        capsule_616x353: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/capsule_616x353.jpg`,
        library_600x900: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`,
        library_hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/library_hero.jpg`,
        portrait: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/portrait.png`,
        logo: `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/logo.png`
      }

      // Test RAWG API
      const rawgUrl = `https://api.rawg.io/api/games/${gameId}?key=${process.env.NEXT_PUBLIC_RAWG_API_KEY}`
      
      const results: any = {
        steamFormats,
        rawgData: null,
        errors: []
      }

      // Test RAWG
      try {
        const rawgResponse = await fetch(rawgUrl)
        if (rawgResponse.ok) {
          const rawgData = await rawgResponse.json()
          results.rawgData = {
            background_image: rawgData.background_image,
            background_image_additional: rawgData.background_image_additional,
            short_screenshots: rawgData.short_screenshots?.slice(0, 3)
          }
        }
      } catch (error) {
        results.errors.push(`RAWG error: ${error}`)
      }

      setResults(results)
    } catch (error) {
      console.error('Test error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🎮 Test Image Formats</h1>
        
        <div className="mb-6">
          <label className="block text-white mb-2">
            Game ID (Steam App ID):
          </label>
          <input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="px-4 py-2 rounded bg-gray-800 text-white border border-gray-600"
            placeholder="Ex: 3498 (GTA V)"
          />
          <button
            onClick={testImageFormats}
            disabled={loading}
            className="ml-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Formats'}
          </button>
        </div>

        {results && (
          <div className="space-y-8">
            
            {/* Steam Formats */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Steam Image Formats</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(results.steamFormats).map(([format, url]) => (
                  <div key={format} className="bg-gray-800 p-4 rounded">
                    <h3 className="text-white text-sm font-medium mb-2">{format}</h3>
                    <img
                      src={url as string}
                      alt={format}
                      className="w-full h-auto rounded border border-gray-600"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const errorDiv = document.createElement('div')
                          errorDiv.className = 'text-red-400 text-xs p-2'
                          errorDiv.textContent = '❌ Not available'
                          parent.appendChild(errorDiv)
                        }
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1 break-all">{url}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RAWG Data */}
            {results.rawgData && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">RAWG API Images</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  
                  {results.rawgData.background_image && (
                    <div className="bg-gray-800 p-4 rounded">
                      <h3 className="text-white text-sm font-medium mb-2">background_image</h3>
                      <img
                        src={results.rawgData.background_image}
                        alt="background"
                        className="w-full h-auto rounded border border-gray-600"
                      />
                    </div>
                  )}

                  {results.rawgData.background_image_additional && (
                    <div className="bg-gray-800 p-4 rounded">
                      <h3 className="text-white text-sm font-medium mb-2">background_image_additional</h3>
                      <img
                        src={results.rawgData.background_image_additional}
                        alt="background additional"
                        className="w-full h-auto rounded border border-gray-600"
                      />
                    </div>
                  )}

                  {results.rawgData.short_screenshots?.map((screenshot: any, index: number) => (
                    <div key={index} className="bg-gray-800 p-4 rounded">
                      <h3 className="text-white text-sm font-medium mb-2">screenshot_{index + 1}</h3>
                      <img
                        src={screenshot.image}
                        alt={`screenshot ${index + 1}`}
                        className="w-full h-auto rounded border border-gray-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {results.errors.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-red-400 mb-4">Errors</h2>
                <ul className="space-y-2">
                  {results.errors.map((error: string, index: number) => (
                    <li key={index} className="text-red-300 bg-red-900/20 p-2 rounded">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-gray-400">
          <h3 className="font-bold mb-2">Test IDs populaires :</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'GTA V', id: '271590' },
              { name: 'Cyberpunk 2077', id: '1091500' },
              { name: 'Elden Ring', id: '1245620' },
              { name: 'Baldur\'s Gate 3', id: '1086940' },
              { name: 'Counter-Strike 2', id: '730' }
            ].map(game => (
              <button
                key={game.id}
                onClick={() => setGameId(game.id)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
              >
                {game.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
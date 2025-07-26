'use client'
import { useState, useEffect } from 'react'
import { cheapSharkGameService } from '@/services/cheapSharkService'
import { tmdbService } from '@/services/tmdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'

export default function TestAPIsPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testAllAPIs = async () => {
    setLoading(true)
    console.clear()
    console.log('🧪 [TEST] Starting API tests...')
    
    try {
      const [games, movies, books, music] = await Promise.all([
        cheapSharkGameService.getTrendingGames().then(g => g.slice(0, 2)),
        tmdbService.getDailyHeroMovies().then(m => m.slice(0, 2)),
        googleBooksService.getDailyHeroBooks().then(b => b.slice(0, 2)),
        musicService.getDailyHeroMusic().then(m => m.slice(0, 2))
      ])

      setResults({ games, movies, books, music })
      console.log('🧪 [TEST] All API tests completed!')
    } catch (error) {
      console.error('🧪 [TEST] Error:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    testAllAPIs()
  }, [])

  const renderItems = (items: any[], category: string) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 capitalize">{category}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, index) => (
          <div key={index} className="border p-4 rounded-lg">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-gray-600">
              {item.author || item.artist || item.director || item.developer || 'N/A'}
            </p>
            <p className="text-sm">Year: {item.year}</p>
            <p className="text-sm">Rating: {item.rating}</p>
            <div className="mt-2">
              <p className="text-sm font-medium">Image URL:</p>
              <p className="text-xs text-blue-600 break-all">{item.image || 'NO IMAGE'}</p>
            </div>
            {item.image && (
              <div className="mt-2">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-24 h-32 object-cover border"
                  onError={(e) => {
                    console.error(`❌ Image failed for ${item.title}:`, item.image)
                    e.currentTarget.style.display = 'none'
                  }}
                  onLoad={() => console.log(`✅ Image loaded for ${item.title}`)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">🧪 API Image Test Page</h1>
      
      <button 
        onClick={testAllAPIs}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test All APIs'}
      </button>

      <div className="text-sm text-gray-600 mb-6">
        Open browser console to see detailed logs
      </div>

      {results.games && renderItems(results.games, 'games')}
      {results.movies && renderItems(results.movies, 'movies')}
      {results.books && renderItems(results.books, 'books')}
      {results.music && renderItems(results.music, 'music')}
    </div>
  )
}
'use client'
import { useState } from 'react'
import MoviesTVSectionV2 from '@/components/MoviesTVSectionV2'
import type { MediaStatus, LibraryItem } from '@/types'

export default function MovieGoodTest() {
  const [library, setLibrary] = useState<LibraryItem[]>([])

  const handleAddToLibrary = (item: any, status: MediaStatus) => {
    console.log('🎬 [Movie GOOD Test] Adding to library:', item.title, status)
    
    // Simulate adding to library
    const newItem: LibraryItem = {
      id: item.id,
      title: item.title,
      category: 'movies',
      status,
      rating: 0,
      progress: 0,
      notes: '',
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setLibrary(prev => [...prev, newItem])
  }

  const handleOpenDetail = (item: any) => {
    console.log('🎬 [Movie GOOD Test] Opening detail for:', item.title)
    alert(`Detail modal for: ${item.title}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🎬 Movie GOOD - Separate Test Page
          </h1>
          <p className="text-gray-600">
            This is the EXACT same interface as /test-movies-tv-v2 but on a separate page
          </p>
          <p className="text-sm text-gray-500 mt-2">
            URL: http://localhost:3004/movie-good-test
          </p>
        </div>

        <MoviesTVSectionV2
          onAddToLibrary={handleAddToLibrary}
          onOpenDetail={handleOpenDetail}
          library={library}
        />

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-white rounded-xl border">
          <h3 className="font-semibold mb-2">Debug - Library Items:</h3>
          <pre className="text-sm text-gray-700 overflow-auto">
            {JSON.stringify(library, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
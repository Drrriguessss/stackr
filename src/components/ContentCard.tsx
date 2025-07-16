'use client'
import { useState } from 'react'
import { idsMatch } from '@/utils/idNormalizer'
import type { ContentItem, LibraryItem, MediaCategory, MediaStatus } from '@/types'

interface ContentCardProps {
  item: ContentItem
  category: MediaCategory
  onAddToLibrary: (item: ContentItem, status: MediaStatus) => void
  library: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
}

export default function ContentCard({
  item,
  category,
  onAddToLibrary,
  library = [],
  onOpenGameDetail
}: ContentCardProps) {
  const [showActions, setShowActions] = useState(false)

  // ✅ SÉCURITÉ : Vérifier que library existe et utiliser normalisation d'ID
  const safeLibrary = Array.isArray(library) ? library : []
  const isInLibrary = safeLibrary.some((libItem: LibraryItem) => idsMatch(libItem.id, item.id))

  const handleAdd = (status: MediaStatus) => {
    onAddToLibrary(item, status)
    setShowActions(false)
  }

  const handleCardClick = () => {
    if (category === 'games' && onOpenGameDetail) {
      onOpenGameDetail(item.id)
    }
  }

  return (
    <div className="group cursor-pointer">
      <div 
        className="relative w-full h-40 bg-gray-900 rounded-lg overflow-hidden"
        onClick={handleCardClick}
      >
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-white text-2xl">
              {category === 'games' && '🎮'}
              {category === 'movies' && '🎬'}
              {category === 'music' && '🎵'}
              {category === 'books' && '📚'}
            </span>
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          {isInLibrary ? (
            <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              ✓
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="w-7 h-7 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors"
              >
                +
              </button>
              {showActions && (
                <div className="absolute top-8 right-0 bg-gray-800/95 backdrop-blur-sm rounded-lg p-2 z-20 min-w-32 border border-gray-700">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdd('want-to-play')
                    }} 
                    className="block text-white text-xs p-2 hover:bg-gray-700 w-full text-left rounded transition-colors"
                  >
                    Want to {category === 'games' ? 'Play' : category === 'movies' ? 'Watch' : category === 'music' ? 'Listen' : 'Read'}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdd('currently-playing')
                    }} 
                    className="block text-white text-xs p-2 hover:bg-gray-700 w-full text-left rounded transition-colors"
                  >
                    {category === 'games' ? 'Playing' : category === 'movies' ? 'Watching' : category === 'music' ? 'Listening' : 'Reading'}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdd('completed')
                    }} 
                    className="block text-white text-xs p-2 hover:bg-gray-700 w-full text-left rounded transition-colors"
                  >
                    Completed
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2">
        <h3 className="text-white text-sm font-semibold truncate">{item.title}</h3>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{item.year}</span>
          {item.rating && item.rating > 0 && (
            <span className="flex items-center">
              <span className="text-yellow-400 mr-1">★</span>
              {item.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  )
}
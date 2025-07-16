'use client'
import { useState } from 'react'
import { Plus, Check, Star } from 'lucide-react'
import { idsMatch } from '@/utils/idNormalizer'
import type { ContentItem, LibraryItem, MediaCategory, MediaStatus } from '@/types'

interface ContentCardProps {
  item: ContentItem
  category: MediaCategory
  onAddToLibrary: (item: ContentItem, status: MediaStatus) => void
  library: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
}

export default function ContentCard({
  item,
  category,
  onAddToLibrary,
  library = [],
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail
}: ContentCardProps) {
  const [showActions, setShowActions] = useState(false)

  // Sécurité : Vérifier que library existe et utiliser normalisation d'ID
  const safeLibrary = Array.isArray(library) ? library : []
  const isInLibrary = safeLibrary.some((libItem: LibraryItem) => idsMatch(libItem.id, item.id))

  const handleAdd = (status: MediaStatus) => {
    onAddToLibrary(item, status)
    setShowActions(false)
  }

  const handleCardClick = () => {
    if (category === 'games' && onOpenGameDetail) {
      onOpenGameDetail(item.id)
    } else if (category === 'movies' && onOpenMovieDetail) {
      onOpenMovieDetail(item.id)
    } else if (category === 'books' && onOpenBookDetail) {
      onOpenBookDetail(item.id)
    } else if (category === 'music' && onOpenMusicDetail) {
      onOpenMusicDetail(item.id)
    }
  }

  const getCategoryGradient = (category: MediaCategory) => {
    switch (category) {
      case 'games': return 'from-green-400 to-blue-500'
      case 'movies': return 'from-purple-400 to-pink-500'
      case 'music': return 'from-orange-400 to-red-500'
      case 'books': return 'from-blue-400 to-purple-500'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  const getCategoryEmoji = (category: MediaCategory) => {
    switch (category) {
      case 'games': return '🎮'
      case 'movies': return '🎬'
      case 'music': return '🎵'
      case 'books': return '📚'
      default: return '📄'
    }
  }

  const getActionLabel = (status: MediaStatus, category: MediaCategory) => {
    switch (status) {
      case 'want-to-play':
        switch (category) {
          case 'games': return 'Want to Play'
          case 'movies': return 'Want to Watch'
          case 'music': return 'Want to Listen'
          case 'books': return 'Want to Read'
          default: return 'Want to Play'
        }
      case 'currently-playing':
        switch (category) {
          case 'games': return 'Playing'
          case 'movies': return 'Watching'
          case 'music': return 'Listening'
          case 'books': return 'Reading'
          default: return 'Playing'
        }
      case 'completed': return 'Completed'
      default: return 'Add'
    }
  }

  return (
    <div className="group cursor-pointer">
      <div 
        className="relative w-full h-40 bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
        onClick={handleCardClick}
      >
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(category)} flex items-center justify-center`}>
            <span className="text-white text-2xl">
              {getCategoryEmoji(category)}
            </span>
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          {isInLibrary ? (
            <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-xs shadow-md">
              <Check size={14} />
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="w-7 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg"
              >
                <Plus size={14} />
              </button>
              {showActions && (
                <div className="absolute top-8 right-0 bg-white/95 backdrop-blur-sm rounded-lg p-2 z-20 min-w-32 border border-gray-200 shadow-lg">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdd('want-to-play')
                    }} 
                    className="block text-gray-700 text-xs p-2 hover:bg-gray-100 w-full text-left rounded transition-colors font-medium"
                  >
                    {getActionLabel('want-to-play', category)}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdd('currently-playing')
                    }} 
                    className="block text-gray-700 text-xs p-2 hover:bg-gray-100 w-full text-left rounded transition-colors font-medium"
                  >
                    {getActionLabel('currently-playing', category)}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdd('completed')
                    }} 
                    className="block text-gray-700 text-xs p-2 hover:bg-gray-100 w-full text-left rounded transition-colors font-medium"
                  >
                    Completed
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 px-1">
        <h3 className="text-gray-900 text-sm font-semibold truncate leading-tight">{item.title}</h3>
        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
          <span>{item.year}</span>
          {item.rating && item.rating > 0 && (
            <span className="flex items-center">
              <Star size={10} className="text-yellow-500 mr-1 fill-current" />
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
'use client'
import { useState } from 'react'
import { Plus, Check, Star, Edit } from 'lucide-react'
import { idsMatch } from '@/utils/idNormalizer'
import type { ContentItem, LibraryItem, MediaCategory, MediaStatus } from '@/types'

interface ContentCardProps {
  item: ContentItem | LibraryItem
  category: MediaCategory
  onAddToLibrary: (item: ContentItem | LibraryItem, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void // ✅ NOUVELLE PROP pour retirer
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
  onDeleteItem,
  library = [],
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail
}: ContentCardProps) {
  const [showActions, setShowActions] = useState(false)

  // ✅ NOUVELLE LOGIQUE : Récupérer l'item exact de la bibliothèque
  const safeLibrary = Array.isArray(library) ? library : []
  const libraryItem = safeLibrary.find((libItem: LibraryItem) => idsMatch(libItem.id, item.id))
  const isInLibrary = !!libraryItem
  const currentStatus = libraryItem?.status

  const handleAdd = (status: MediaStatus) => {
    onAddToLibrary(item, status)
    setShowActions(false)
  }

  // ✅ NOUVELLE FONCTION : Gérer le clic sur le statut actuel
  const handleStatusClick = () => {
    if (isInLibrary && onDeleteItem) {
      // Si déjà dans la bibliothèque, proposer de retirer ou changer
      setShowActions(true)
    } else {
      // Sinon, ouvrir les options d'ajout
      setShowActions(true)
    }
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

  // ✅ NOUVELLE FONCTION : Couleur du statut
  const getStatusColor = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'bg-orange-500'
      case 'currently-playing': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      case 'paused': return 'bg-yellow-500'
      case 'dropped': return 'bg-red-500'
      default: return 'bg-gray-500'
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
            // ✅ NOUVEAU : Affichage du statut actuel avec possibilité de modifier
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatusClick()
                }}
                className={`w-auto px-2 h-7 ${getStatusColor(currentStatus!)} text-white rounded-full flex items-center justify-center text-xs font-medium shadow-md hover:shadow-lg transition-all`}
              >
                <Check size={12} className="mr-1" />
                <span>{getActionLabel(currentStatus!, category).split(' ')[0]}</span>
              </button>

              {showActions && (
                <div className="absolute top-8 right-0 bg-white/95 backdrop-blur-sm rounded-lg p-2 z-20 min-w-44 border border-gray-200 shadow-lg">
                  {/* Options de changement de statut */}
                  {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
                    <button 
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (status === currentStatus) {
                          // Si même statut, retirer de la bibliothèque
                          if (onDeleteItem) {
                            onDeleteItem(item.id)
                          }
                        } else {
                          // Sinon, changer le statut
                          handleAdd(status)
                        }
                        setShowActions(false)
                      }} 
                      className={`block text-gray-700 text-xs p-2 hover:bg-gray-100 w-full text-left rounded transition-colors font-medium flex items-center justify-between ${
                        status === currentStatus ? 'bg-red-50 text-red-700 hover:bg-red-100' : ''
                      }`}
                    >
                      <span>
                        {status === currentStatus ? `Remove from ${getActionLabel(status, category)}` : getActionLabel(status, category)}
                      </span>
                      {status === currentStatus && <span className="text-red-500">×</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Bouton d'ajout classique
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
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-gray-900 text-sm font-semibold truncate leading-tight flex-1">
            {item.title}
          </h3>
          {/* Indicateur série TV */}
          {item.isSeries && (
            <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium flex-shrink-0">
              TV
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{item.year}</span>
          {item.rating && item.rating > 0 && (
            <span className="flex items-center">
              <Star size={10} className="text-yellow-500 mr-1 fill-current" />
              {item.rating.toFixed(1)}
            </span>
          )}
        </div>
        
        {/* ✅ NOUVEAU : Affichage du statut sous la carte */}
        {isInLibrary && (
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              currentStatus === 'want-to-play' ? 'bg-orange-100 text-orange-700' :
              currentStatus === 'currently-playing' ? 'bg-green-100 text-green-700' :
              currentStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {getActionLabel(currentStatus!, category)}
            </span>
          </div>
        )}
        
        {/* Afficher le nombre de saisons pour les séries */}
        {item.isSeries && item.totalSeasons && (
          <div className="text-xs text-gray-500 mt-1">
            {item.totalSeasons} season{item.totalSeasons > 1 ? 's' : ''}
          </div>
        )}
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
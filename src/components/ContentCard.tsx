'use client'
import { useState } from 'react'
import { Plus, Play, Check } from 'lucide-react'

interface ContentCardProps {
  item: {
    id: string
    title: string
    image: string
    year: number
    rating: number
    category?: string
  }
  category: string
  onAddToLibrary: (item: any, status: string) => void
  library: any[]
  onOpenGameDetail?: (gameId: string) => void
}

export default function ContentCard({ item, category, onAddToLibrary, library, onOpenGameDetail }: ContentCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  
  // ✅ CORRECTION : Vérifier avec ID normalisé pour sync bidirectionnelle
  const getLibraryItem = () => {
    if (!library || !Array.isArray(library)) return undefined
    
    // Normaliser l'ID de l'item (supprimer préfixes si présents)
    const normalizedItemId = item.id.toString().replace(/^(game-|movie-|music-|book-)/, '')
    
    return library.find((libItem: any) => {
      // Normaliser aussi l'ID de la library
      const normalizedLibId = libItem.id.toString().replace(/^(game-|movie-|music-|book-)/, '')
      return normalizedLibId === normalizedItemId
    })
  }

  const libraryItem = getLibraryItem()
  const isInLibrary = !!libraryItem

  // Get status options based on category
  const getStatusOptions = (category: string) => {
    switch (category) {
      case 'games':
        return [
          { value: 'want-to-play', label: 'Want to Play' },
          { value: 'currently-playing', label: 'Playing' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'movies':
        return [
          { value: 'want-to-play', label: 'Want to Watch' },
          { value: 'currently-playing', label: 'Watching' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'music':
        return [
          { value: 'want-to-play', label: 'Want to Listen' },
          { value: 'currently-playing', label: 'Listening' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'books':
        return [
          { value: 'want-to-play', label: 'Want to Read' },
          { value: 'currently-playing', label: 'Reading' },
          { value: 'completed', label: 'Completed' }
        ]
      default:
        return [
          { value: 'want-to-play', label: 'Want to Play' },
          { value: 'currently-playing', label: 'Playing' },
          { value: 'completed', label: 'Completed' }
        ]
    }
  }

  const getStatusDisplayLabel = (status: string, category: string) => {
    const options = getStatusOptions(category)
    const option = options.find(opt => opt.value === status)
    return option ? option.label : 'Added'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'want-to-play': return 'text-blue-400'
      case 'currently-playing': return 'text-green-400'
      case 'completed': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  // ✅ CORRECTION : Handle status selection avec feedback visuel
  const handleStatusSelect = (status: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setAddingItem(true)
    
    // Appeler la fonction parent avec l'item complet
    onAddToLibrary(item, status)
    
    // Fermer le popup et reset l'état
    setTimeout(() => {
      setShowActions(false)
      setAddingItem(false)
    }, 600)
  }

  const handleCardClick = () => {
    if (onOpenGameDetail) {
      // Passer l'ID sans préfixe pour GameDetailModal
      const gameId = item.id.toString().replace(/^(game-|movie-|music-|book-)/, '')
      onOpenGameDetail(gameId)
    }
  }

  const truncateTitle = (title: string, maxLength: number = 15) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
  }

  return (
    <div className="group cursor-pointer">
      {/* Image Container - Responsive selon le contexte */}
      <div 
        className="relative w-full h-40 bg-gray-900 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
        onClick={handleCardClick}
      >
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play size={16} className="text-white ml-0.5" />
          </div>
        </div>

        {/* ✅ CORRECTION : Action Button avec feedback synchronisé */}
        <div className="absolute top-2 right-2">
          {isInLibrary && !addingItem ? (
            // Badge de statut si dans la library
            <div className="flex items-center space-x-1 bg-green-600/20 border border-green-500/50 text-green-400 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm">
              <Check size={12} />
              <span className="hidden sm:inline">{getStatusDisplayLabel(libraryItem?.status, category)}</span>
            </div>
          ) : addingItem ? (
            // Animation de chargement pendant l'ajout
            <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg">
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            // Bouton Add avec popup
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="w-7 h-7 bg-blue-600/90 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm shadow-lg"
              >
                <Plus size={12} />
              </button>

              {/* ✅ CORRECTION : Status popup harmonisé avec SearchModal */}
              {showActions && (
                <>
                  {/* Overlay pour fermer le popup */}
                  <div 
                    className="fixed inset-0 z-[99998]"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowActions(false)
                    }}
                  />
                  
                  {/* Popup content */}
                  <div 
                    className="absolute top-full right-0 mt-2 bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-600/50 py-2 min-w-44 z-[99999] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getStatusOptions(category).map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => handleStatusSelect(option.value, e)}
                        className="w-full text-left px-4 py-2.5 text-sm transition-all duration-200 hover:bg-gray-700/50 group border-l-2 border-transparent hover:border-blue-500 flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                          {option.label}
                        </span>
                        <Check className="opacity-0 group-hover:opacity-100 transition-opacity text-green-400" size={14} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info sous l'image - Plus compact */}
      <div className="mt-2">
        <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-blue-300 transition-colors line-clamp-2" title={item.title}>
          {truncateTitle(item.title, 18)}
        </h3>
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-gray-400">{item.year}</span>
          <div className="flex items-center space-x-1">
            <span className="text-yellow-400">★</span>
            <span className="text-gray-300">{item.rating.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Status sous l'image si en bibliothèque */}
        {isInLibrary && !addingItem && (
          <div className="flex items-center space-x-1 mt-1">
            <span className={`text-xs font-medium ${getStatusColor(libraryItem?.status)}`}>
              {getStatusDisplayLabel(libraryItem?.status, category)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
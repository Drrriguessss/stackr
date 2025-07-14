'use client'
import { useState } from 'react'
import { Plus, Play, Check, ChevronDown } from 'lucide-react'

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
  onOpenGameDetail?: (gameId: string) => void // ✅ Rendre optionnel
}

export default function ContentCard({ item, category, onAddToLibrary, library, onOpenGameDetail }: ContentCardProps) {
  const [showActions, setShowActions] = useState(false)
  
  const isInLibrary = library.some((libItem: any) => libItem.id === item.id)
  const libraryItem = library.find((libItem: any) => libItem.id === item.id)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'want-to-play': return 'text-blue-400'
      case 'currently-playing': return 'text-green-400'
      case 'completed': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'want-to-play': return '📋'
      case 'currently-playing': return '🎮'
      case 'completed': return '✅'
      default: return '+'
    }
  }

  const handleStatusSelect = (status: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToLibrary(item, status)
    setShowActions(false)
  }

  const handleCardClick = () => {
    if (onOpenGameDetail) {
      onOpenGameDetail(item.id)
    }
  }

  const truncateTitle = (title: string, maxLength: number = 20) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
  }

  return (
    <div 
      className="group relative bg-gray-900/60 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-gray-800/70 transition-all duration-300 cursor-pointer border border-gray-700/50 hover:border-gray-600/50"
      onClick={handleCardClick}
    >
      {/* Image Container - Aspect ratio fixe */}
      <div className="aspect-[4/5] relative overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Gradient overlay pour le texte */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play size={20} className="text-white ml-1" />
          </div>
        </div>
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {/* Title and Info */}
        <div className="mb-2">
          <h3 className="text-white font-semibold text-sm leading-tight mb-1" title={item.title}>
            {truncateTitle(item.title, 25)}
          </h3>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">{item.year}</span>
            <div className="flex items-center space-x-1">
              <span className="text-yellow-400">★</span>
              <span className="text-gray-300">{item.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          {isInLibrary ? (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-lg">{getStatusIcon(libraryItem?.status)}</span>
              <span className={`font-medium ${getStatusColor(libraryItem?.status)}`}>
                {libraryItem?.status === 'want-to-play' ? 'Want to Play' : 
                 libraryItem?.status === 'currently-playing' ? 'Playing' : 'Completed'}
              </span>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="flex items-center space-x-1 bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm"
              >
                <Plus size={14} />
                <span>Add</span>
                <ChevronDown size={12} className={`transition-transform ${showActions ? 'rotate-180' : ''}`} />
              </button>

              {showActions && (
                <div className="absolute bottom-full left-0 mb-1 bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden shadow-xl z-10">
                  {[
                    { status: 'want-to-play', label: 'Want to Play', icon: '📋' },
                    { status: 'currently-playing', label: 'Playing', icon: '🎮' },
                    { status: 'completed', label: 'Completed', icon: '✅' }
                  ].map(({ status, label, icon }) => (
                    <button
                      key={status}
                      onClick={(e) => handleStatusSelect(status, e)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors whitespace-nowrap"
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click overlay to close actions */}
      {showActions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={(e) => {
            e.stopPropagation()
            setShowActions(false)
          }}
        />
      )}
    </div>
  )
}
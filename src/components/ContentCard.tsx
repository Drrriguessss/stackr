'use client'
import { useState } from 'react'
import { Plus, Play, ChevronDown } from 'lucide-react'

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

  const truncateTitle = (title: string, maxLength: number = 15) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
  }

  return (
    <div className="group cursor-pointer">
      {/* ✅ Image Container - Responsive selon le contexte */}
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

        {/* ✅ Action Button - TOUJOURS VISIBLE maintenant */}
        <div className="absolute top-2 right-2">
          {isInLibrary ? (
            <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
              ✓
            </div>
          ) : (
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

              {showActions && (
                <div className="absolute top-full right-0 mt-1 bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden shadow-xl z-30 whitespace-nowrap">
                  {[
                    { status: 'want-to-play', label: 'Want to Play', icon: '📋' },
                    { status: 'currently-playing', label: 'Playing', icon: '🎮' },
                    { status: 'completed', label: 'Completed', icon: '✅' }
                  ].map(({ status, label, icon }) => (
                    <button
                      key={status}
                      onClick={(e) => handleStatusSelect(status, e)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors"
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ✅ Info sous l'image - Plus compact */}
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
        {isInLibrary && (
          <div className="flex items-center space-x-1 mt-1">
            <span className="text-xs">{getStatusIcon(libraryItem?.status)}</span>
            <span className={`text-xs font-medium ${getStatusColor(libraryItem?.status)}`}>
              {libraryItem?.status === 'want-to-play' ? 'Want to Play' : 
               libraryItem?.status === 'currently-playing' ? 'Playing' : 'Completed'}
            </span>
          </div>
        )}
      </div>

      {/* Click overlay to close actions */}
      {showActions && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={(e) => {
            e.stopPropagation()
            setShowActions(false)
          }}
        />
      )}
    </div>
  )
}
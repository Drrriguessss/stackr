'use client'
import { Star, Plus, Play, Check } from 'lucide-react'

interface GameCardHorizontalProps {
  game: {
    id: string
    title: string
    image: string
    year: number
    rating: number
    genre?: string
    status?: string
  }
  onCardClick: (gameId: string) => void
  onAddToLibrary?: (gameId: string, status: string) => void
  library?: any[]
}

export default function GameCardHorizontal({ 
  game, 
  onCardClick, 
  onAddToLibrary = () => {},
  library = [] 
}: GameCardHorizontalProps) {
  const libraryItem = library.find(item => item.id === game.id)
  const currentStatus = libraryItem?.status

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'want-to-play': return <Plus size={14} />
      case 'currently-playing': return <Play size={14} />
      case 'completed': return <Check size={14} />
      default: return <Plus size={14} />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'want-to-play': return 'Want to Play'
      case 'currently-playing': return 'Playing'
      case 'completed': return 'Completed'
      default: return 'Want to Play'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'want-to-play': return 'bg-blue-600 hover:bg-blue-500'
      case 'currently-playing': return 'bg-green-600 hover:bg-green-500'
      case 'completed': return 'bg-purple-600 hover:bg-purple-500'
      default: return 'bg-blue-600 hover:bg-blue-500'
    }
  }

  return (
    <div className="group flex bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl overflow-hidden hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg">
      {/* Image cliquable */}
      <div 
        className="relative w-32 h-24 bg-gray-700 flex-shrink-0 cursor-pointer"
        onClick={() => onCardClick(game.id)}
      >
        {game.image ? (
          <img
            src={game.image}
            alt={game.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <span className="text-white text-lg">🎮</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 
            className="text-white font-semibold text-base truncate cursor-pointer group-hover:text-blue-300 transition-colors"
            onClick={() => onCardClick(game.id)}
          >
            {game.title}
          </h3>
          
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-gray-400 text-sm">
              {game.year}
            </span>
            <div className="flex items-center space-x-1">
              <Star size={12} className="text-yellow-400 fill-current" />
              <span className="text-gray-300 text-sm">
                {game.rating.toFixed(1)}
              </span>
            </div>
          </div>

          {game.genre && (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 text-xs font-medium mt-2">
              {game.genre}
            </span>
          )}
        </div>

        {/* Boutons d'action */}
        {onAddToLibrary && (
          <div className="flex space-x-2 ml-4">
            {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
              <button
                key={status}
                onClick={(e) => {
                  e.stopPropagation()
                  onAddToLibrary(game.id, status)
                }}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors ${
                  currentStatus === status
                    ? getStatusColor(status).replace('hover:', '')
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={getStatusLabel(status)}
              >
                {getStatusIcon(status)}
                <span className="hidden sm:inline">
                  {getStatusLabel(status).split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
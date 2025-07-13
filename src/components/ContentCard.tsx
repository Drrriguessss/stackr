'use client'
import { Star, Plus, Play, Check, Eye, Headphones } from 'lucide-react'

interface ContentItem {
  id: number
  title: string
  author?: string
  artist?: string
  director?: string
  year: number
  rating: number
  genre: string
  category?: 'games' | 'movies' | 'music' | 'books'
  type?: 'movie' | 'series'
}

interface ContentCardProps {
  item: ContentItem
  onAddToLibrary: (item: ContentItem, status: string) => void
  category: string
}

export default function ContentCard({ item, onAddToLibrary, category }: ContentCardProps) {
  const creator = item.author || item.artist || item.director || 'Unknown'
  
  // Détecter automatiquement si c'est une série ou un film
  const detectType = (title: string, genre: string) => {
    const seriesKeywords = ['season', 'série', 'series', 'saison', 'episode', 'ep.', 'tome', 'volume']
    const titleLower = title.toLowerCase()
    const genreLower = genre.toLowerCase()
    
    const isSeries = seriesKeywords.some(keyword => 
      titleLower.includes(keyword) || genreLower.includes(keyword)
    )
    
    return isSeries ? 'series' : 'movie'
  }

  // Obtenir les boutons d'action selon la catégorie
  const getActionButtons = () => {
    switch (category) {
      case 'games':
        return [
          { status: 'want', label: 'Want to Play', shortLabel: 'Want', icon: Plus, color: 'bg-gray-700/80 hover:bg-gray-600' },
          { status: 'current', label: 'Currently Playing', shortLabel: 'Playing', icon: Play, color: 'bg-blue-600/80 hover:bg-blue-500' },
          { status: 'completed', label: 'Completed', shortLabel: 'Done', icon: Check, color: 'bg-green-600/80 hover:bg-green-500' }
        ]
      
      case 'movies':
        const contentType = item.type || detectType(item.title, item.genre)
        if (contentType === 'series') {
          return [
            { status: 'want', label: 'Want to Watch', shortLabel: 'Want', icon: Plus, color: 'bg-gray-700/80 hover:bg-gray-600' },
            { status: 'current', label: 'Currently Watching', shortLabel: 'Watching', icon: Eye, color: 'bg-blue-600/80 hover:bg-blue-500' },
            { status: 'completed', label: 'Watched', shortLabel: 'Done', icon: Check, color: 'bg-green-600/80 hover:bg-green-500' }
          ]
        } else {
          return [
            { status: 'want', label: 'Want to Watch', shortLabel: 'Want', icon: Plus, color: 'bg-gray-700/80 hover:bg-gray-600' },
            { status: 'completed', label: 'Watched', shortLabel: 'Done', icon: Check, color: 'bg-green-600/80 hover:bg-green-500' }
          ]
        }
      
      case 'music':
        return [
          { status: 'want', label: 'Want to Listen', shortLabel: 'Want', icon: Plus, color: 'bg-gray-700/80 hover:bg-gray-600' },
          { status: 'completed', label: 'Listened to', shortLabel: 'Done', icon: Headphones, color: 'bg-green-600/80 hover:bg-green-500' }
        ]
      
      case 'books':
        return [
          { status: 'want', label: 'Want to Read', shortLabel: 'Want', icon: Plus, color: 'bg-gray-700/80 hover:bg-gray-600' },
          { status: 'current', label: 'Currently Reading', shortLabel: 'Reading', icon: Play, color: 'bg-blue-600/80 hover:bg-blue-500' },
          { status: 'completed', label: 'Read', shortLabel: 'Done', icon: Check, color: 'bg-green-600/80 hover:bg-green-500' }
        ]
      
      default:
        return [
          { status: 'want', label: 'Want', shortLabel: 'Want', icon: Plus, color: 'bg-gray-700/80 hover:bg-gray-600' },
          { status: 'completed', label: 'Done', shortLabel: 'Done', icon: Check, color: 'bg-green-600/80 hover:bg-green-500' }
        ]
    }
  }

  const actionButtons = getActionButtons()
  
  // Générer un gradient unique basé sur le titre
  const getGradient = (title: string) => {
    const gradients = [
      'from-purple-500 to-blue-600',
      'from-blue-500 to-cyan-600', 
      'from-green-500 to-teal-600',
      'from-yellow-500 to-orange-600',
      'from-red-500 to-pink-600',
      'from-indigo-500 to-purple-600',
      'from-cyan-500 to-blue-500',
      'from-pink-500 to-rose-600',
    ]
    const index = title.length % gradients.length
    return gradients[index]
  }

  return (
    <div className="group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:scale-105">
      
      {/* Cover Image */}
      <div className={`aspect-[3/4] bg-gradient-to-br ${getGradient(item.title)} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-end p-4">
          <div className="text-white font-bold text-sm leading-tight line-clamp-3">
            {item.title}
          </div>
        </div>
        
        {/* Hover overlay avec boutons d'action adaptatifs - CENTRÉ */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
          <div className={`grid gap-2 w-full max-w-[140px] ${
            actionButtons.length === 2 
              ? 'grid-cols-2' 
              : 'grid-cols-1 sm:grid-cols-3'
          }`}>
            {actionButtons.map((button) => {
              const IconComponent = button.icon
              return (
                <button
                  key={button.status}
                  onClick={() => onAddToLibrary(item, button.status)}
                  className={`${button.color} text-white p-2 rounded-lg backdrop-blur-sm transition-colors flex flex-col items-center justify-center min-h-[44px]`}
                  title={button.label}
                >
                  <IconComponent size={16} />
                  <span className="text-xs mt-1 text-center leading-tight">
                    {button.shortLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1 line-clamp-2 text-sm leading-tight">
          {item.title}
        </h3>
        <p className="text-gray-400 text-xs mb-3 truncate">
          {creator}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-white text-sm font-medium">{item.rating}</span>
          </div>
          <span className="text-gray-500 text-xs">{item.year}</span>
        </div>

        {/* Boutons d'action permanents - TOUJOURS VISIBLES */}
        <div className={`grid gap-1 ${
          actionButtons.length === 2 
            ? 'grid-cols-2' 
            : 'grid-cols-3'
        }`}>
          {actionButtons.map((button) => {
            const IconComponent = button.icon
            return (
              <button
                key={`permanent-${button.status}`}
                onClick={() => onAddToLibrary(item, button.status)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-lg transition-colors flex items-center justify-center space-x-1 text-xs"
                title={button.label}
              >
                <IconComponent size={12} />
                <span className="truncate">{button.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
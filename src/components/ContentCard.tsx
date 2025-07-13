'use client'
import { useState } from 'react'
import { Play, Check, Plus, Eye, EyeOff, Headphones, BookOpen } from 'lucide-react'

interface ContentItem {
  id: number
  title: string
  author?: string
  artist?: string
  director?: string
  year: number
  rating: number
  genre: string
}

interface ContentCardProps {
  item: ContentItem
  onAddToLibrary: (item: ContentItem, status: string) => void
  category: string
}

export default function ContentCard({ item, onAddToLibrary, category }: ContentCardProps) {
  const [showButtons, setShowButtons] = useState(false)

  // Configuration des boutons selon la catégorie avec icônes
  const getActionButtons = () => {
    switch (category) {
      case 'games':
        return [
          { status: 'want-to-play', label: 'Want to Play', shortLabel: 'Want', icon: Plus },
          { status: 'playing', label: 'Currently Playing', shortLabel: 'Playing', icon: Play },
          { status: 'completed', label: 'Completed', shortLabel: 'Done', icon: Check }
        ]
      case 'movies':
        const isMovie = !item.title.toLowerCase().includes('season') && 
                       !item.title.toLowerCase().includes('series') &&
                       !item.title.toLowerCase().includes('show')
        return isMovie 
          ? [
              { status: 'want-to-watch', label: 'Want to Watch', shortLabel: 'Want', icon: Plus },
              { status: 'watched', label: 'Watched', shortLabel: 'Watched', icon: Check }
            ]
          : [
              { status: 'want-to-watch', label: 'Want to Watch', shortLabel: 'Want', icon: Plus },
              { status: 'watching', label: 'Currently Watching', shortLabel: 'Watching', icon: Eye },
              { status: 'watched', label: 'Watched', shortLabel: 'Done', icon: Check }
            ]
      case 'music':
        return [
          { status: 'want-to-listen', label: 'Want to Listen', shortLabel: 'Want', icon: Plus },
          { status: 'listened', label: 'Listened to', shortLabel: 'Heard', icon: Headphones }
        ]
      case 'books':
        return [
          { status: 'want-to-read', label: 'Want to Read', shortLabel: 'Want', icon: Plus },
          { status: 'reading', label: 'Currently Reading', shortLabel: 'Reading', icon: BookOpen },
          { status: 'read', label: 'Read', shortLabel: 'Done', icon: Check }
        ]
      default:
        return []
    }
  }

  const actionButtons = getActionButtons()

  // Obtenir l'auteur/artiste/réalisateur selon le type
  const getCreator = () => {
    return item.author || item.artist || item.director || 'Unknown'
  }

  return (
    <div 
      className="relative group cursor-pointer"
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {/* Carte principale */}
      <div className={`relative h-48 sm:h-64 rounded-xl p-4 sm:p-6 text-white overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
        // Gradient basé sur la catégorie
        category === 'games' ? 'bg-gradient-to-br from-green-500 to-emerald-700' :
        category === 'movies' ? 'bg-gradient-to-br from-blue-500 to-indigo-700' :
        category === 'music' ? 'bg-gradient-to-br from-purple-500 to-pink-700' :
        'bg-gradient-to-br from-orange-500 to-red-700'
      }`}>
        
        {/* Contenu de la carte */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 line-clamp-2">{item.title}</h3>
            <p className="text-sm sm:text-base text-white/80 mb-2 sm:mb-4">{getCreator()}</p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="text-yellow-300 text-lg sm:text-xl">⭐</span>
              <span className="text-sm sm:text-base font-semibold">{item.rating}</span>
            </div>
            <span className="text-xs sm:text-sm text-white/70">{item.year}</span>
          </div>
        </div>

        {/* Boutons au hover sur desktop */}
        <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 hidden sm:flex items-center justify-center ${
          showButtons ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className={`grid gap-2 ${
            actionButtons.length === 2 
              ? 'grid-cols-2' 
              : 'grid-cols-3'
          }`}>
            {actionButtons.map((button) => {
              const IconComponent = button.icon
              return (
                <button
                  key={button.status}
                  onClick={() => onAddToLibrary(item, button.status)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-lg font-medium transition-all duration-200 text-center text-sm"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <IconComponent size={16} />
                    <span className="text-xs">{button.shortLabel}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Boutons permanents en bas sur mobile */}
      <div className="sm:hidden mt-2">
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
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-lg font-medium transition-all duration-200 text-center"
                title={button.label}
              >
                <div className="flex flex-col items-center space-y-1">
                  <IconComponent size={14} />
                  <span className="text-xs truncate">{button.shortLabel}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
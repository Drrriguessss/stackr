'use client'
import { useState, useEffect } from 'react'
import { Play, Check, Plus, Eye, Headphones, BookOpen } from 'lucide-react'

interface ContentCardProps {
  item: any
  onAddToLibrary: (item: any, status: string) => void
  category: string
  library?: any[] // Nouvelle prop pour connaître l'état de la bibliothèque
  onOpenGameDetail?: (gameId: string) => void // Nouvelle prop pour ouvrir la fiche produit
}

export default function ContentCard({ item, onAddToLibrary, category, library = [], onOpenGameDetail }: ContentCardProps) {
  const [showButtons, setShowButtons] = useState(false)
  const [clickedButton, setClickedButton] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)

  // Vérifier si l'item est déjà dans la bibliothèque au chargement
  useEffect(() => {
    const libraryItem = library.find((libItem: any) => libItem.id === item.id)
    if (libraryItem) {
      setCurrentStatus(libraryItem.status)
    } else {
      setCurrentStatus(null)
    }
  }, [library, item.id])

  // Configuration des boutons selon la catégorie avec icônes
  const getActionButtons = () => {
    // Utiliser item.category en priorité (pour items de recherche et library)
    // Sinon utiliser category prop (pour items de discover)
    const itemCategory = item.category || category
    
    switch (itemCategory) {
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

  const handleButtonClick = (status: string) => {
    setClickedButton(status)
    setCurrentStatus(status)
    onAddToLibrary(item, status)
    
    // Feedback visuel temporaire
    setTimeout(() => setClickedButton(null), 1000)
  }

  // ✅ NOUVELLE FONCTION - Gérer le clic sur la carte principale
  const handleCardClick = () => {
    // Ouvrir la fiche produit seulement pour les jeux pour l'instant
    const itemCategory = item.category || category
    if (itemCategory === 'games' && onOpenGameDetail) {
      // ✅ PASSER LE TITRE DU JEU POUR LA RECHERCHE API
      onOpenGameDetail(item.title)
    }
  }

  // Déterminer le style d'un bouton
  const getButtonStyle = (buttonStatus: string) => {
    const isCurrentStatus = currentStatus === buttonStatus
    const isClicked = clickedButton === buttonStatus

    if (isClicked) {
      return 'bg-green-600 text-white scale-95 shadow-lg ring-2 ring-green-400'
    }
    
    if (isCurrentStatus) {
      return 'bg-blue-600 text-white shadow-md' // Bleu pour status persistant
    }

    return 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white hover:scale-105'
  }

  return (
    <div 
      className="relative group cursor-pointer"
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {/* Carte principale - ✅ AJOUT DU CLIC */}
      <div 
        className={`relative h-48 sm:h-64 rounded-xl p-4 sm:p-6 text-white overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
          // Gradient basé sur la vraie catégorie
          (item.category || category) === 'games' ? 'bg-gradient-to-br from-green-500 to-emerald-700' :
          (item.category || category) === 'movies' ? 'bg-gradient-to-br from-blue-500 to-indigo-700' :
          (item.category || category) === 'music' ? 'bg-gradient-to-br from-purple-500 to-pink-700' :
          'bg-gradient-to-br from-orange-500 to-red-700'
        }`}
        onClick={handleCardClick} // ✅ CLIC SUR LA CARTE
      >
        
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
        <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-200 flex items-center justify-center ${
          showButtons ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} style={{ zIndex: 20 }}>
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
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation() // ✅ EMPÊCHER PROPAGATION VERS handleCardClick
                    handleButtonClick(button.status)
                  }}
                  className={`p-3 rounded-lg font-medium transition-all duration-200 text-center text-sm transform ${getButtonStyle(button.status)}`}
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

      {/* Boutons permanents en bas sur mobile ET desktop */}
      <div className="mt-3">
        <div className={`grid gap-2 ${
          actionButtons.length === 2 
            ? 'grid-cols-2' 
            : 'grid-cols-3'
        }`}>
          {actionButtons.map((button) => {
            const IconComponent = button.icon
            
            return (
              <button
                key={`permanent-${button.status}`}
                onClick={(e) => {
                  e.stopPropagation() // ✅ EMPÊCHER PROPAGATION
                  handleButtonClick(button.status)
                }}
                className={`p-2 sm:p-3 rounded-lg font-medium transition-all duration-200 text-center transform ${getButtonStyle(button.status)}`}
                title={button.label}
              >
                <div className="flex flex-col items-center space-y-1">
                  <IconComponent size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs truncate">{button.shortLabel}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Badge de statut persistant */}
      {currentStatus && !clickedButton && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
          In Library
        </div>
      )}

      {/* Feedback visuel temporaire */}
      {clickedButton && (
        <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse">
          Added!
        </div>
      )}

      {/* ✅ INDICATEUR VISUEL pour les jeux cliquables */}
      {(item.category || category) === 'games' && (
        <div className="absolute top-2 left-2 bg-black/30 text-white text-xs px-2 py-1 rounded-full font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Click for details
        </div>
      )}
    </div>
  )
}
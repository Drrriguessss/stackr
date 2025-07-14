'use client'
import { useState } from 'react'
import { Search, Camera, Bell } from 'lucide-react'
import SearchModal from './SearchModal'
import GameDetailModal from './GameDetailModal'

interface HeaderProps {
  onAddToLibrary: (item: any, status: string) => void
  library: any[]
}

export default function Header({ onAddToLibrary, library }: HeaderProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  const handleOpenGameDetail = (gameId: string) => {
    setSelectedGameId(gameId)
    setIsSearchModalOpen(false) // Fermer la recherche
  }

  return (
    <>
      <header className="flex items-center justify-between p-6 bg-gray-900">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white">Stackr</h1>
        </div>

        {/* Barre de recherche cliquable */}
        <div className="flex-1 max-w-md mx-8">
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsSearchModalOpen(true)}
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <div className="w-full pl-10 pr-4 py-3 bg-gray-800 rounded-xl text-gray-400 hover:bg-gray-700 transition-colors">
              Search games, movies, music, books...
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <Camera className="text-gray-400 hover:text-white" size={24} />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <Bell className="text-gray-400 hover:text-white" size={24} />
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Se connecter
          </button>
        </div>
      </header>

      {/* Modal de recherche */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAddToLibrary={onAddToLibrary}
        onOpenGameDetail={handleOpenGameDetail}
      />

      {/* Modal de détail jeu */}
      <GameDetailModal
        isOpen={!!selectedGameId}
        onClose={() => setSelectedGameId(null)}
        gameId={selectedGameId || ''}
        onAddToLibrary={onAddToLibrary}
        library={library}
      />
    </>
  )
}
'use client'
import { useState } from 'react'
import { Search, Camera, Bell, User } from 'lucide-react'
import SearchModal from './SearchModal'
import type { LibraryItem, MediaStatus } from '@/types'

interface HeaderProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  library: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
}

export default function Header({ onAddToLibrary, library, onOpenGameDetail }: HeaderProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  
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
              <span className="hidden md:inline">Search games, movies, music, books...</span>
              <span className="md:hidden">Search...</span>
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
          {/* ✅ ICÔNE UTILISATEUR AU LIEU DU BOUTON */}
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <User className="text-gray-400 hover:text-white" size={24} />
          </button>
        </div>
      </header>
      
      {/* Modal de recherche - ✅ AJOUT DE LA PROP LIBRARY */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAddToLibrary={onAddToLibrary}
        onOpenGameDetail={(gameId) => {
          setIsSearchModalOpen(false)
          onOpenGameDetail?.(gameId)
        }}
        library={library}
      />
    </>
  )
}
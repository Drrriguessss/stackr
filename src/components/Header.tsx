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
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">Stackr</h1>
        </div>
        
        {/* Barre de recherche cliquable */}
        <div className="flex-1 max-w-md mx-8">
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsSearchModalOpen(true)}
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <div className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors border border-gray-200">
              <span className="hidden md:inline text-sm">Search games, movies, music, books...</span>
              <span className="md:hidden text-sm">Search...</span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Camera className="text-gray-500 hover:text-gray-700" size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="text-gray-500 hover:text-gray-700" size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <User className="text-gray-500 hover:text-gray-700" size={20} />
          </button>
        </div>
      </header>
      
      {/* Modal de recherche */}
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
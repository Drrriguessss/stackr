'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'
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
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
        </div>
        
        {/* Barre de recherche cliquable - plus subtile */}
        <div className="flex-1 max-w-md mx-8">
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsSearchModalOpen(true)}
          >
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <div className="w-full pl-4 pr-10 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors text-sm">
              <span className="hidden md:inline">Search...</span>
              <span className="md:hidden">Search...</span>
            </div>
          </div>
        </div>
        
        {/* Profile - minimaliste */}
        <div className="flex items-center">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm font-medium">👤</span>
            </div>
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
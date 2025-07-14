'use client'
import { useState } from 'react'
import { Filter, Grid, List } from 'lucide-react'
import ContentCard from './ContentCard'

interface LibrarySectionProps {
  library: any[]
  onAddToLibrary: (item: any, status: string) => void
  onOpenGameDetail?: (gameId: string) => void // ✅ Optionnel
}

export default function LibrarySection({ library, onAddToLibrary, onOpenGameDetail }: LibrarySectionProps) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Filtrer la bibliothèque par statut
  const filteredLibrary = library.filter(item => {
    if (activeFilter === 'all') return true
    return item.status === activeFilter
  })

  // Obtenir les stats par statut
  const getStatusCount = (status: string) => {
    if (status === 'all') return library.length
    return library.filter(item => item.status === status).length
  }

  if (library.length === 0) {
    return (
      <section className="mt-12 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Your Library</h2>
        </div>
        
        <div className="text-center py-12 bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-700">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-white mb-2">Your library is empty</h3>
          <p className="text-gray-400 mb-6">Start adding games, movies, music, and books to track your collection!</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            Explore Content
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-12 mb-8">
      {/* Header avec titre et contrôles */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          Your Library
          <span className="text-lg font-normal text-gray-400 ml-2">
            ({library.length} items)
          </span>
        </h2>
        
        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All', icon: '📚' },
          { key: 'want-to-play', label: 'Want to Play', icon: '📋' },
          { key: 'currently-playing', label: 'Playing', icon: '🎮' },
          { key: 'completed', label: 'Completed', icon: '✅' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            <span className="text-xs opacity-75">
              ({getStatusCount(key)})
            </span>
          </button>
        ))}
      </div>

      {/* Contenu de la bibliothèque */}
      {filteredLibrary.length === 0 ? (
        <div className="text-center py-8 bg-gray-900/30 rounded-xl">
          <div className="text-4xl mb-3">🤷‍♂️</div>
          <p className="text-gray-400">
            No items found for "{activeFilter === 'all' ? 'all' : activeFilter.replace('-', ' ')}" filter
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            : "space-y-3"
        }>
          {filteredLibrary.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              category={item.category}
              onAddToLibrary={onAddToLibrary}
              library={library}
              onOpenGameDetail={onOpenGameDetail}
            />
          ))}
        </div>
      )}

      {/* Stats rapides */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{getStatusCount('want-to-play')}</div>
          <div className="text-sm text-gray-400">Want to Play</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{getStatusCount('currently-playing')}</div>
          <div className="text-sm text-gray-400">Playing</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{getStatusCount('completed')}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{library.length}</div>
          <div className="text-sm text-gray-400">Total Items</div>
        </div>
      </div>
    </section>
  )
}
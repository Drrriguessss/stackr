'use client'
import { useState } from 'react'
import ContentCard from './ContentCard'

interface LibrarySectionProps {
  library: any[]
  onAddToLibrary: (item: any, status: string) => void
  onOpenGameDetail?: (gameId: string) => void // ✅ AJOUTER CETTE PROP
}

export default function LibrarySection({ library, onAddToLibrary, onOpenGameDetail }: LibrarySectionProps) {
  const [activeFilter, setActiveFilter] = useState('all')

  // Calculer les compteurs par catégorie
  const getCounts = () => {
    return {
      all: library.length,
      games: library.filter(item => item.category === 'games').length,
      movies: library.filter(item => item.category === 'movies').length,
      music: library.filter(item => item.category === 'music').length,
      books: library.filter(item => item.category === 'books').length
    }
  }

  // Filtrer les items selon le filtre actif
  const getFilteredItems = () => {
    if (activeFilter === 'all') return library
    return library.filter(item => item.category === activeFilter)
  }

  const counts = getCounts()
  const filteredItems = getFilteredItems()

  // Ne pas afficher la section si la library est vide
  if (library.length === 0) return null

  return (
    <section className="mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-0">Your Library</h2>
        
        {/* Filtres avec compteurs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'games', label: 'Games', count: counts.games },
            { key: 'movies', label: 'Movies', count: counts.movies },
            { key: 'music', label: 'Music', count: counts.music },
            { key: 'books', label: 'Books', count: counts.books }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              disabled={filter.count === 0}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Grille des items */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
          {filteredItems.map((item) => (
            <ContentCard
              key={`library-${item.id}`}
              item={item}
              onAddToLibrary={onAddToLibrary}
              category={item.category}
              library={library}
              onOpenGameDetail={onOpenGameDetail} // ✅ PASSER LA FONCTION
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>No {activeFilter === 'all' ? 'items' : activeFilter} in your library yet.</p>
          <p className="text-sm mt-2">Start adding content to see it here!</p>
        </div>
      )}
    </section>
  )
}
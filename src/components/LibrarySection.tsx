'use client'
import { useState } from 'react'
import ContentSection from './ContentSection'

interface LibrarySectionProps {
  library: any[]
  onAddToLibrary: (item: any, status: string) => void
}

export default function LibrarySection({ library, onAddToLibrary }: LibrarySectionProps) {
  const [libraryFilter, setLibraryFilter] = useState('all')

  // Filtrer la bibliothèque selon le filtre sélectionné
  const getFilteredLibrary = () => {
    if (libraryFilter === 'all') {
      return library
    }
    return library.filter((item: any) => item.category === libraryFilter)
  }

  const filteredLibrary = getFilteredLibrary()

  if (library.length === 0) return null

  return (
    <div className="mt-8 sm:mt-12">
      {/* Header avec filtres */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Your Library</h2>
        
        {/* Filtres de catégorie */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', name: 'All', count: library.length },
            { id: 'games', name: 'Games', count: library.filter(item => item.category === 'games').length },
            { id: 'movies', name: 'Movies', count: library.filter(item => item.category === 'movies').length },
            { id: 'music', name: 'Music', count: library.filter(item => item.category === 'music').length },
            { id: 'books', name: 'Books', count: library.filter(item => item.category === 'books').length }
          ].map((filter) => (
            filter.count > 0 && (
              <button
                key={filter.id}
                onClick={() => setLibraryFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  libraryFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {filter.name} ({filter.count})
              </button>
            )
          ))}
        </div>
      </div>

      {/* Contenu de la bibliothèque */}
      {filteredLibrary.length > 0 ? (
        <ContentSection
          title="" // Pas de titre car on a déjà "Your Library" au-dessus
          items={filteredLibrary}
          category={libraryFilter === 'all' ? 'mixed' : libraryFilter}
          onAddToLibrary={onAddToLibrary}
          library={library}
        />
      ) : (
        <div className="text-center py-8 text-gray-400">
          No {libraryFilter === 'all' ? 'items' : libraryFilter} in your library yet.
        </div>
      )}
    </div>
  )
}
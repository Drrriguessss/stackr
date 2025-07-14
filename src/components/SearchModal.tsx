'use client'
import { useState, useEffect } from 'react'
import { X, Search, Star } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  author?: string
  artist?: string
  director?: string
  year: number
  rating?: number
  genre?: string
  category: 'games' | 'movies' | 'music' | 'books'
  image?: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: string) => void
}

export default function SearchModal({ isOpen, onClose, onAddToLibrary }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // API Keys
  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  const OMDB_API_KEY = '649f9a63'

  // Recherche avec debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query)
    }, 500)

    return () => clearTimeout(searchTimeout)
  }, [query, activeCategory])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
    const allResults: SearchResult[] = []

    try {
      const searchPromises = []

      // 1. RAWG API - Jeux vidéo
      if (activeCategory === 'all' || activeCategory === 'games') {
        searchPromises.push(searchGames(searchQuery))
      }

      // 2. OMDb API - Films/Séries  
      if (activeCategory === 'all' || activeCategory === 'movies') {
        searchPromises.push(searchMovies(searchQuery))
      }

      // 3. iTunes API - Musique
      if (activeCategory === 'all' || activeCategory === 'music') {
        searchPromises.push(searchMusic(searchQuery))
      }

      // 4. Google Books API - Livres
      if (activeCategory === 'all' || activeCategory === 'books') {
        searchPromises.push(searchBooks(searchQuery))
      }

      const results = await Promise.all(searchPromises)
      results.forEach(categoryResults => {
        allResults.push(...categoryResults)
      })

      setResults(allResults)
    } catch (error) {
      console.error('Erreur de recherche:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recherche jeux - RAWG API
  const searchGames = async (query: string): Promise<SearchResult[]> => {
    try {
      const response = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=5`
      )
      const data = await response.json()
      
      return data.results?.map((game: any) => ({
        id: `game-${game.id}`,
        title: game.name,
        author: game.developers?.[0]?.name || 'Unknown',
        year: game.released ? new Date(game.released).getFullYear() : 2024,
        rating: game.rating || 0,
        genre: game.genres?.[0]?.name || 'Unknown',
        category: 'games' as const,
        image: game.background_image
      })) || []
    } catch (error) {
      console.error('Erreur RAWG API:', error)
      return []
    }
  }

  // Recherche films/séries - OMDb API
  const searchMovies = async (query: string): Promise<SearchResult[]> => {
    try {
      const response = await fetch(
        `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=movie`
      )
      const data = await response.json()
      
      if (data.Response === 'False') return []
      
      return data.Search?.slice(0, 5).map((movie: any) => ({
        id: `movie-${movie.imdbID}`,
        title: movie.Title,
        director: 'Unknown',
        year: parseInt(movie.Year) || 2024,
        rating: 0,
        genre: movie.Genre || 'Unknown',
        category: 'movies' as const,
        image: movie.Poster !== 'N/A' ? movie.Poster : undefined
      })) || []
    } catch (error) {
      console.error('Erreur OMDb API:', error)
      return []
    }
  }

  // Recherche musique - iTunes API
  const searchMusic = async (query: string): Promise<SearchResult[]> => {
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=5`
      )
      const data = await response.json()
      
      return data.results?.map((album: any) => ({
        id: `music-${album.collectionId}`,
        title: album.collectionName,
        artist: album.artistName,
        year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : 2024,
        rating: 0,
        genre: album.primaryGenreName || 'Unknown',
        category: 'music' as const,
        image: album.artworkUrl100
      })) || []
    } catch (error) {
      console.error('Erreur iTunes API:', error)
      return []
    }
  }

  // Recherche livres - Google Books API
  const searchBooks = async (query: string): Promise<SearchResult[]> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
      )
      const data = await response.json()
      
      return data.items?.map((book: any) => ({
        id: `book-${book.id}`,
        title: book.volumeInfo.title,
        author: book.volumeInfo.authors?.[0] || 'Unknown',
        year: book.volumeInfo.publishedDate ? parseInt(book.volumeInfo.publishedDate) : 2024,
        rating: book.volumeInfo.averageRating || 0,
        genre: book.volumeInfo.categories?.[0] || 'Unknown',
        category: 'books' as const,
        image: book.volumeInfo.imageLinks?.thumbnail
      })) || []
    } catch (error) {
      console.error('Erreur Google Books API:', error)
      return []
    }
  }

  const getCreator = (result: SearchResult) => {
    return result.author || result.artist || result.director || 'Unknown'
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'games': return 'bg-green-500'
      case 'movies': return 'bg-blue-500'
      case 'music': return 'bg-purple-500'
      case 'books': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-700">
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            type="text"
            placeholder="Search games, movies, music, books..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white ml-3"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filtres de catégorie */}
        <div className="flex space-x-2 p-4 border-b border-gray-700">
          {['all', 'games', 'movies', 'music', 'books'].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Résultats */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No results found for "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2 p-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {/* Image */}
                  <div className="w-12 h-12 rounded-lg bg-gray-700 flex-shrink-0 overflow-hidden">
                    {result.image ? (
                      <img
                        src={result.image}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        ?
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-medium truncate">{result.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getCategoryColor(result.category)}`}>
                        {result.category}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">{getCreator(result)}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{result.year}</span>
                      {result.rating && result.rating > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex items-center">
                            <Star size={12} className="text-yellow-400 mr-1" />
                            <span>{result.rating.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bouton d'ajout */}
                  <button
                    onClick={() => {
                      onAddToLibrary(result, 'want-to-watch')
                      onClose()
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
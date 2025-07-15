'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Star, Loader2, Wifi, WifiOff, Check } from 'lucide-react'

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
  onOpenGameDetail?: (gameId: string) => void
  library?: any[]
}

export default function SearchModal({ isOpen, onClose, onAddToLibrary, onOpenGameDetail, library = [] }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [searchCache] = useState<Map<string, SearchResult[]>>(new Map())
  const [showStatusPopup, setShowStatusPopup] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [fadeOutPopup, setFadeOutPopup] = useState<string | null>(null)
  
  // State local pour tracker les items ajoutés dans cette session
  const [localLibrary, setLocalLibrary] = useState<{[key: string]: {status: string, category: string}}>({})
  
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // API Keys
  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
  const OMDB_API_KEY = '649f9a63'

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowStatusPopup(null)
    if (showStatusPopup) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showStatusPopup])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(-1)
      setError(null)
      setShowStatusPopup(null)
      setAddingItem(null)
      setFadeOutPopup(null)
    }
  }, [isOpen])

  // Get status options based on category - VERSION COMPACTE
  const getStatusOptions = (category: string) => {
    switch (category) {
      case 'games':
        return [
          { value: 'want-to-play', label: 'Want to Play' },
          { value: 'currently-playing', label: 'Playing' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'movies':
        return [
          { value: 'want-to-play', label: 'Want to Watch' },
          { value: 'currently-playing', label: 'Watching' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'music':
        return [
          { value: 'want-to-play', label: 'Want to Listen' },
          { value: 'currently-playing', label: 'Listening' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'books':
        return [
          { value: 'want-to-play', label: 'Want to Read' },
          { value: 'currently-playing', label: 'Reading' },
          { value: 'completed', label: 'Completed' }
        ]
      default:
        return [
          { value: 'want-to-play', label: 'Want to Play' },
          { value: 'currently-playing', label: 'Playing' },
          { value: 'completed', label: 'Completed' }
        ]
    }
  }

  // Check if item is in library (local + global)
  const getLibraryItem = (resultId: string, category: string) => {
    // Vérifier d'abord dans le state local (ajouts de cette session)
    if (localLibrary[resultId]) {
      return { status: localLibrary[resultId].status }
    }
    
    // Puis vérifier dans la library globale
    return library.find((libItem: any) => libItem.id === resultId)
  }

  // Get status display label
  const getStatusDisplayLabel = (status: string, category: string) => {
    const options = getStatusOptions(category)
    const option = options.find(opt => opt.value === status)
    return option ? option.label : 'Added'
  }

  // Fetch with timeout utility
  const fetchWithTimeout = async (url: string, timeout = 8000): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw error
    }
  }

  // Debounced search with caching
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, category: string) => {
      performSearch(searchQuery, category)
    }, 500),
    []
  )

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      setSelectedIndex(-1)
      setError(null)
      return
    }

    // Check cache first
    const cacheKey = `${activeCategory}-${query.toLowerCase()}`
    if (searchCache.has(cacheKey)) {
      const cachedResults = searchCache.get(cacheKey)!
      setResults(cachedResults)
      setSelectedIndex(-1)
      return
    }

    debouncedSearch(query, activeCategory)
  }, [query, activeCategory, debouncedSearch, searchCache])

  const performSearch = async (searchQuery: string, category: string) => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError(null)
    setSelectedIndex(-1)
    
    const allResults: SearchResult[] = []
    const errors: string[] = []

    try {
      const searchPromises: Promise<SearchResult[]>[] = []

      // Add search promises based on category
      if (category === 'all' || category === 'games') {
        searchPromises.push(searchGames(searchQuery).catch(err => {
          errors.push(`Games: ${err.message}`)
          return []
        }))
      }

      if (category === 'all' || category === 'movies') {
        searchPromises.push(searchMovies(searchQuery).catch(err => {
          errors.push(`Movies: ${err.message}`)
          return []
        }))
      }

      if (category === 'all' || category === 'music') {
        searchPromises.push(searchMusic(searchQuery).catch(err => {
          errors.push(`Music: ${err.message}`)
          return []
        }))
      }

      if (category === 'all' || category === 'books') {
        searchPromises.push(searchBooks(searchQuery).catch(err => {
          errors.push(`Books: ${err.message}`)
          return []
        }))
      }

      const results = await Promise.all(searchPromises)
      results.forEach(categoryResults => {
        allResults.push(...categoryResults)
      })

      // Sort results by relevance (title match first, then by rating)
      allResults.sort((a, b) => {
        const aTitleMatch = a.title.toLowerCase().includes(searchQuery.toLowerCase())
        const bTitleMatch = b.title.toLowerCase().includes(searchQuery.toLowerCase())
        
        if (aTitleMatch && !bTitleMatch) return -1
        if (!aTitleMatch && bTitleMatch) return 1
        
        return (b.rating || 0) - (a.rating || 0)
      })

      // Cache results
      const cacheKey = `${category}-${searchQuery.toLowerCase()}`
      searchCache.set(cacheKey, allResults)

      setResults(allResults)

      if (errors.length > 0 && allResults.length === 0) {
        setError(`Search failed: ${errors.join(', ')}`)
      }

    } catch (error) {
      console.error('Search error:', error)
      setError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // API Search functions with better error handling
  const searchGames = async (query: string): Promise<SearchResult[]> => {
    const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=8`
    const response = await fetchWithTimeout(url)
    const data = await response.json()
    
    if (!data.results) {
      throw new Error('No games data received')
    }
    
    return data.results.map((game: any) => ({
      id: `game-${game.id}`,
      title: game.name || 'Unknown Game',
      author: game.developers?.[0]?.name || 'Unknown Developer',
      year: game.released ? new Date(game.released).getFullYear() : new Date().getFullYear(),
      rating: game.rating ? Number(game.rating.toFixed(1)) : 0,
      genre: game.genres?.[0]?.name || 'Unknown',
      category: 'games' as const,
      image: game.background_image,
      artist: undefined,
      director: undefined
    }))
  }

  const searchMovies = async (query: string): Promise<SearchResult[]> => {
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=movie&page=1`
    const response = await fetchWithTimeout(url)
    const data = await response.json()
    
    if (data.Response === 'False') {
      throw new Error(data.Error || 'No movies found')
    }
    
    return data.Search?.slice(0, 8).map((movie: any) => ({
      id: `movie-${movie.imdbID}`,
      title: movie.Title || 'Unknown Movie',
      director: 'Unknown Director',
      year: parseInt(movie.Year) || new Date().getFullYear(),
      rating: 0,
      genre: movie.Genre || 'Unknown',
      category: 'movies' as const,
      image: movie.Poster !== 'N/A' ? movie.Poster : undefined,
      author: undefined,
      artist: undefined
    })) || []
  }

  const searchMusic = async (query: string): Promise<SearchResult[]> => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=8`
    const response = await fetchWithTimeout(url)
    const data = await response.json()
    
    if (!data.results) {
      throw new Error('No music data received')
    }
    
    return data.results.map((album: any) => ({
      id: `music-${album.collectionId}`,
      title: album.collectionName || 'Unknown Album',
      artist: album.artistName || 'Unknown Artist',
      year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : new Date().getFullYear(),
      rating: 0,
      genre: album.primaryGenreName || 'Unknown',
      category: 'music' as const,
      image: album.artworkUrl100,
      author: undefined,
      director: undefined
    }))
  }

  const searchBooks = async (query: string): Promise<SearchResult[]> => {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&printType=books`
    const response = await fetchWithTimeout(url)
    const data = await response.json()
    
    if (!data.items) {
      throw new Error('No books found')
    }
    
    return data.items.map((book: any) => ({
      id: `book-${book.id}`,
      title: book.volumeInfo.title || 'Unknown Book',
      author: book.volumeInfo.authors?.[0] || 'Unknown Author',
      year: book.volumeInfo.publishedDate ? parseInt(book.volumeInfo.publishedDate) : new Date().getFullYear(),
      rating: book.volumeInfo.averageRating ? Number(book.volumeInfo.averageRating.toFixed(1)) : 0,
      genre: book.volumeInfo.categories?.[0] || 'Unknown',
      category: 'books' as const,
      image: book.volumeInfo.imageLinks?.thumbnail,
      artist: undefined,
      director: undefined
    }))
  }

  // Handle status selection with feedback - VERSION CORRIGÉE
  const handleStatusSelect = async (result: SearchResult, status: string) => {
    setAddingItem(result.id)
    setFadeOutPopup(result.id)
    
    // Ajouter immédiatement dans le state local pour feedback instantané
    setLocalLibrary(prev => ({
      ...prev,
      [result.id]: { status, category: result.category }
    }))
    
    // Appeler la fonction parent pour ajouter à la vraie library
    onAddToLibrary(result, status)
    
    // Fermer le popup après animation
    setTimeout(() => {
      setShowStatusPopup(null)
      setFadeOutPopup(null)
    }, 600)
    
    // Reset adding state
    setTimeout(() => {
      setAddingItem(null)
    }, 800)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectResult(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleSelectResult = (result: SearchResult) => {
    if (result.category === 'games' && onOpenGameDetail) {
      onOpenGameDetail(result.id.replace('game-', ''))
      onClose()
    } else {
      onAddToLibrary(result, 'want-to-play')
      onClose()
    }
  }

  const getCreator = (result: SearchResult) => {
    return result.author || result.artist || result.director || 'Unknown'
  }

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'games': return { color: 'bg-green-500', icon: '🎮' }
      case 'movies': return { color: 'bg-blue-500', icon: '🎬' }
      case 'music': return { color: 'bg-purple-500', icon: '🎵' }
      case 'books': return { color: 'bg-orange-500', icon: '📚' }
      default: return { color: 'bg-gray-500', icon: '📄' }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-700">
          <Search className="text-gray-400 mr-3 flex-shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search games, movies, music, books..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
          />
          {loading && <Loader2 className="animate-spin text-gray-400 mr-3" size={16} />}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white ml-3 p-1 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Category filters */}
        <div className="flex space-x-2 p-4 border-b border-gray-700 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'games', label: 'Games' },
            { key: 'movies', label: 'Movies' },
            { key: 'music', label: 'Music' },
            { key: 'books', label: 'Books' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeCategory === key
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
          {/* Error state */}
          {error && (
            <div className="flex items-center justify-center py-8 px-4">
              <div className="text-center">
                <WifiOff className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => performSearch(query, activeCategory)}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-400">
                <Loader2 className="animate-spin" size={20} />
                <span>Searching...</span>
              </div>
            </div>
          )}

          {/* No results */}
          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Search className="mx-auto mb-2" size={24} />
              <p>No results found for "<span className="text-white">{query}</span>"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          )}

          {/* Results list */}
          {!loading && !error && results.length > 0 && (
            <div className="p-4 space-y-2">
              {results.map((result, index) => {
                const categoryInfo = getCategoryInfo(result.category)
                const isSelected = index === selectedIndex
                const libraryItem = getLibraryItem(result.id, result.category)
                const isInLibrary = !!libraryItem
                const isAdding = addingItem === result.id
                
                return (
                  <div
                    key={result.id}
                    className={`flex items-center space-x-4 p-3 rounded-lg transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/20 border border-blue-500/50' 
                        : 'hover:bg-gray-800 border border-transparent'
                    }`}
                    onClick={() => handleSelectResult(result)}
                  >
                    {/* Image */}
                    <div className="w-12 h-12 rounded-lg bg-gray-700 flex-shrink-0 overflow-hidden">
                      {result.image ? (
                        <img
                          src={result.image}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-lg ${result.image ? 'hidden' : ''}`}>
                        {categoryInfo.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-white font-medium truncate">{result.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${categoryInfo.color} flex-shrink-0`}>
                          {result.category}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm truncate">{getCreator(result)}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span>{result.year}</span>
                        {result.genre && (
                          <>
                            <span>•</span>
                            <span className="truncate">{result.genre}</span>
                          </>
                        )}
                        {result.rating && result.rating > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center">
                              <Star size={12} className="text-yellow-400 mr-1" />
                              <span>{result.rating}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Button avec feedback visuel CORRIGÉ */}
                    <div className="relative">
                      {isInLibrary && !isAdding ? (
                        // Affichage du statut si dans la library
                        <div className="flex items-center space-x-2 bg-green-600/20 border border-green-500/50 text-green-400 px-3 py-2 rounded-lg text-sm font-medium">
                          <Check size={14} />
                          <span>{getStatusDisplayLabel(libraryItem.status, result.category)}</span>
                        </div>
                      ) : isAdding ? (
                        // Animation de chargement pendant l'ajout
                        <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
                          <Loader2 className="animate-spin" size={14} />
                          <span>Adding...</span>
                        </div>
                      ) : (
                        // Bouton Add normal
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowStatusPopup(result.id)
                            }}
                            className="bg-blue-600/90 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 shadow-lg hover:shadow-xl"
                          >
                            Add
                          </button>

                          {/* Status selection popup avec feedback */}
                          {showStatusPopup === result.id && (
                            <>
                              {/* Overlay pour fermer le popup */}
                              <div 
                                className="fixed inset-0 z-[99998]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowStatusPopup(null)
                                }}
                              />
                              
                              {/* Popup content avec animation de fade */}
                              <div 
                                className={`absolute right-0 top-full mt-2 bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-600/50 py-2 min-w-44 z-[99999] overflow-hidden transition-all duration-300 ${
                                  fadeOutPopup === result.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Options de statut avec marqueur visuel */}
                                {getStatusOptions(result.category).map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusSelect(result, option.value)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm transition-all duration-200 hover:bg-gray-700/50 group border-l-2 border-transparent hover:border-blue-500 flex items-center justify-between"
                                  >
                                    <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                                      {option.label}
                                    </span>
                                    <Check className="opacity-0 group-hover:opacity-100 transition-opacity text-green-400" size={14} />
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
            <span>Use ↑↓ to navigate, Enter to select</span>
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
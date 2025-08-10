'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Star, Check, Plus, Film, Gamepad2, BookOpen, Music, Dice6, ChevronDown } from 'lucide-react'
import { optimalMovieAPI, type OptimalMovieResult } from '@/services/optimalMovieAPI'
import { optimalGamingAPIV2, type OptimalGamingV2Result } from '@/services/optimalGamingAPIV2'
import { optimalBooksAPI, type OptimalBookResult } from '@/services/optimalBooksAPI'
import { optimalMusicAPI, type OptimalMusicResult } from '@/services/optimalMusicAPI'
import { optimalBoardGameAPI, type OptimalBoardGameResult } from '@/services/optimalBoardGameAPI'
import type { LibraryItem, MediaStatus } from '@/types'

interface UnifiedSearchBarProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  onOpenBoardGameDetail?: (gameId: string) => void
  library: LibraryItem[]
}

type FilterType = 'movies' | 'games' | 'books' | 'music' | 'boardgames'
type SearchResult = OptimalMovieResult | OptimalGamingV2Result | OptimalBookResult | OptimalMusicResult | OptimalBoardGameResult

export default function UnifiedSearchBar({
  onAddToLibrary,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  onOpenBoardGameDetail,
  library
}: UnifiedSearchBarProps) {
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('movies')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showDropdownForItem, setShowDropdownForItem] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<{[itemId: string]: MediaStatus}>({})
  const [dropdownPosition, setDropdownPosition] = useState<'above' | 'below'>('below')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Status options for each media type
  const statusOptions = {
    movies: [
      { key: 'want-to-watch' as MediaStatus, label: 'Want to watch' },
      { key: 'watching' as MediaStatus, label: 'Watching' },
      { key: 'watched' as MediaStatus, label: 'Watched' }
    ],
    music: [
      { key: 'want-to-listen' as MediaStatus, label: 'Want to listen' },
      { key: 'listened' as MediaStatus, label: 'Listened' }
    ],
    games: [
      { key: 'want-to-play' as MediaStatus, label: 'Want to play' },
      { key: 'playing' as MediaStatus, label: 'Playing' },
      { key: 'completed' as MediaStatus, label: 'Completed' },
      { key: 'dropped' as MediaStatus, label: 'Dropped' }
    ],
    books: [
      { key: 'want-to-read' as MediaStatus, label: 'Want to read' },
      { key: 'reading' as MediaStatus, label: 'Reading' },
      { key: 'read' as MediaStatus, label: 'Read' },
      { key: 'paused' as MediaStatus, label: 'Paused' },
      { key: 'dropped' as MediaStatus, label: 'Dropped' }
    ],
    boardgames: [
      { key: 'want-to-play' as MediaStatus, label: 'Want to play' },
      { key: 'played' as MediaStatus, label: 'Played' }
    ]
  }

  const filterOptions = [
    { 
      key: 'movies' as const, 
      label: 'Movies/TV', 
      icon: Film,
      gradient: 'from-[#ff6b6b] to-[#c92a2a]' 
    },
    { 
      key: 'games' as const, 
      label: 'Games', 
      icon: Gamepad2,
      gradient: 'from-[#00f260] to-[#0575e6]' 
    },
    { 
      key: 'books' as const, 
      label: 'Books', 
      icon: BookOpen,
      gradient: 'from-[#4facfe] to-[#00f2fe]' 
    },
    { 
      key: 'music' as const, 
      label: 'Music', 
      icon: Music,
      gradient: 'from-[#43e97b] to-[#38f9d7]' 
    },
    { 
      key: 'boardgames' as const, 
      label: 'Boardgames', 
      icon: Dice6,
      gradient: 'from-[#667eea] to-[#764ba2]' 
    }
  ]

  // Search functions using the EXACT same logic as existing buttons
  const searchMovies = async (query: string): Promise<OptimalMovieResult[]> => {
    return await optimalMovieAPI.search(query, 12)
  }

  const searchGames = async (query: string): Promise<OptimalGamingV2Result[]> => {
    return await optimalGamingAPIV2.search(query, { limit: 12 })
  }

  const searchBooks = async (query: string): Promise<OptimalBookResult[]> => {
    return await optimalBooksAPI.search(query, {
      limit: 12,
      orderBy: 'relevance',
      language: 'en',
      searchBy: 'all'
    })
  }

  const searchMusic = async (query: string): Promise<OptimalMusicResult[]> => {
    return await optimalMusicAPI.search(query, {
      limit: 12,
      type: 'track',
      includeExplicit: true,
      searchBy: 'all',
      sortBy: 'mixed',
      minYear: 2000
    })
  }

  const searchBoardGames = async (query: string): Promise<OptimalBoardGameResult[]> => {
    return await optimalBoardGameAPI.search(query, {
      limit: 12,
      minPlayers: 1,
      maxPlayers: 8,
      sortBy: 'relevance',
      includeExpansions: false
    })
  }

  // Main search function
  const performSearch = async (searchQuery: string, filter: FilterType) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    setLoading(true)
    setShowResults(true)

    try {
      let searchResults: SearchResult[] = []

      switch (filter) {
        case 'movies':
          searchResults = await searchMovies(searchQuery)
          break
        case 'games':
          searchResults = await searchGames(searchQuery)
          break
        case 'books':
          searchResults = await searchBooks(searchQuery)
          break
        case 'music':
          searchResults = await searchMusic(searchQuery)
          break
        case 'boardgames':
          searchResults = await searchBoardGames(searchQuery)
          break
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, selectedFilter)
    }, 500)

    return () => clearTimeout(timer)
  }, [query, selectedFilter])

  // Hide results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!query.trim()) {
        setShowResults(false)
      }
      
      // Close dropdown if clicking outside
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdownForItem(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [query])

  // Sync selected status with library changes
  useEffect(() => {
    // Update selectedStatus with items from library to maintain consistency
    const libraryStatusMap: {[itemId: string]: MediaStatus} = {}
    library.forEach(item => {
      libraryStatusMap[item.id] = item.status
    })
    
    // Merge library status with current selected status, prioritizing library
    setSelectedStatus(prev => ({
      ...prev,
      ...libraryStatusMap
    }))
  }, [library])

  // Calculate optimal dropdown position
  const calculateDropdownPosition = (buttonElement: HTMLElement): 'above' | 'below' => {
    const rect = buttonElement.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const spaceBelow = windowHeight - rect.bottom
    const spaceAbove = rect.top
    
    // Menu height approximation (5 items * 40px + padding)
    const estimatedMenuHeight = statusOptions[selectedFilter].length * 40 + 20
    
    // If there's not enough space below, show above
    if (spaceBelow < estimatedMenuHeight && spaceAbove > estimatedMenuHeight) {
      return 'above'
    }
    
    return 'below'
  }

  // Handle dropdown toggle with position calculation
  const handleDropdownToggle = (itemId: string, buttonElement: HTMLButtonElement) => {
    if (showDropdownForItem === itemId) {
      setShowDropdownForItem(null)
    } else {
      const position = calculateDropdownPosition(buttonElement)
      setDropdownPosition(position)
      setShowDropdownForItem(itemId)
    }
  }

  // Handle status selection
  const handleStatusSelect = (itemId: string, status: MediaStatus, result: SearchResult) => {
    // Immediately update the selected status to show in UI
    setSelectedStatus(prev => ({ ...prev, [itemId]: status }))
    
    // Close the dropdown
    setShowDropdownForItem(null)
    
    // Add to library with the selected status (this will trigger library refresh)
    onAddToLibrary(result, status)
  }

  // Get current status for an item
  const getCurrentStatus = (itemId: string): MediaStatus | null => {
    return selectedStatus[itemId] || null
  }

  // Check if item is in library
  const isInLibrary = (itemId: string) => {
    return library.some(item => item.id === itemId)
  }

  // Get the current status from library or selected status
  const getLibraryItemStatus = (itemId: string): MediaStatus | null => {
    const libraryItem = library.find(item => item.id === itemId)
    return libraryItem?.status || getCurrentStatus(itemId)
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    switch (selectedFilter) {
      case 'games':
        if (onOpenGameDetail && 'id' in result) {
          onOpenGameDetail(result.id.toString())
        }
        break
      case 'movies':
        if (onOpenMovieDetail && 'id' in result) {
          onOpenMovieDetail(result.id.toString())
        }
        break
      case 'books':
        if (onOpenBookDetail && 'id' in result) {
          onOpenBookDetail(result.id.toString())
        }
        break
      case 'music':
        if (onOpenMusicDetail && 'id' in result) {
          onOpenMusicDetail(result.id.toString())
        }
        break
      case 'boardgames':
        if (onOpenBoardGameDetail && 'id' in result) {
          onOpenBoardGameDetail(result.id.toString())
        }
        break
    }
  }

  // Get display info for different result types
  const getResultInfo = (result: SearchResult) => {
    const baseInfo = {
      id: '',
      title: '',
      subtitle: '',
      image: '',
      year: '',
      rating: 0,
      category: selectedFilter
    }

    switch (selectedFilter) {
      case 'movies':
        const movieResult = result as OptimalMovieResult
        return {
          ...baseInfo,
          id: movieResult.id?.toString() || '',
          title: movieResult.title || '',
          subtitle: movieResult.media_type === 'tv' ? 'TV Series' : 'Movie',
          image: movieResult.image || '',
          year: movieResult.year?.toString() || '',
          rating: movieResult.rating || 0
        }
      
      case 'games':
        const gameResult = result as OptimalGamingV2Result
        return {
          ...baseInfo,
          id: gameResult.id?.toString() || '',
          title: gameResult.name || '',
          subtitle: gameResult.developer || '',
          image: gameResult.image || '',
          year: gameResult.year?.toString() || '',
          rating: gameResult.rating || 0
        }
      
      case 'books':
        const bookResult = result as OptimalBookResult
        return {
          ...baseInfo,
          id: bookResult.id || '',
          title: bookResult.title || '',
          subtitle: bookResult.authors?.[0] || 'Unknown Author',
          image: bookResult.image || '',
          year: bookResult.year?.toString() || '',
          rating: bookResult.rating || 0
        }
      
      case 'music':
        const musicResult = result as OptimalMusicResult
        return {
          ...baseInfo,
          id: musicResult.id?.toString() || '',
          title: musicResult.name || '',
          subtitle: musicResult.artist || '',
          image: musicResult.image || '',
          year: musicResult.year?.toString() || '',
          rating: 0
        }
      
      case 'boardgames':
        const bgResult = result as OptimalBoardGameResult
        return {
          ...baseInfo,
          id: bgResult.id?.toString() || '',
          title: bgResult.name || '',
          subtitle: `${bgResult.minPlayers}-${bgResult.maxPlayers} players`,
          image: bgResult.image || '',
          year: bgResult.yearPublished?.toString() || '',
          rating: bgResult.rating || 0
        }
      
      default:
        return baseInfo
    }
  }

  return (
    <div className="w-full space-y-4" onClick={(e) => e.stopPropagation()}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <Search className="text-gray-400 ml-4 mr-3 flex-shrink-0" size={20} />
          <input
            type="text"
            placeholder={`Search ${selectedFilter}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0 && query.trim()) {
                setShowResults(true)
              }
            }}
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 outline-none py-4 text-base"
          />
          {loading && <Loader2 className="animate-spin text-gray-400 mr-4" size={16} />}
        </div>
      </div>

      {/* Category Selection Label */}
      <div className="text-center mb-3">
        <p className="text-white/70 text-sm font-medium">Select a category</p>
      </div>

      {/* Filter Buttons - Matching Large Cards Design */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        {filterOptions.map(({ key, label, icon: IconComponent, gradient }) => (
          <button
            key={key}
            onClick={() => setSelectedFilter(key)}
            className={`group relative flex items-center px-3 py-2 rounded-xl transition-all duration-300 border-2 ${
              selectedFilter === key
                ? 'scale-105 shadow-lg border-white/80 bg-white/10'
                : 'hover:scale-105 hover:shadow-md hover:-translate-y-0.5 border-transparent hover:border-white/30'
            }`}
          >
            {/* Icon with gradient background matching large cards */}
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mr-2 transition-transform duration-300 ${
              selectedFilter === key ? 'scale-110' : 'group-hover:scale-110'
            }`}>
              <IconComponent className="w-4 h-4 text-white" />
            </div>
            
            {/* Text - responsive */}
            <span className="text-sm font-medium text-white hidden sm:inline">
              {label}
            </span>
            <span className="text-xs font-medium text-white sm:hidden">
              {key === 'movies' ? 'Movies' : key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
          </button>
        ))}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="relative">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Searching {selectedFilter}...</span>
                </div>
              </div>
            )}

            {/* No results */}
            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                <Search className="mx-auto mb-2" size={24} />
                <p>No {selectedFilter} found for "<span className="text-gray-900 font-medium">{query}</span>"</p>
              </div>
            )}

            {/* Results list */}
            {!loading && results.length > 0 && (
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {results.map((result) => {
                    const info = getResultInfo(result)
                    const inLibrary = isInLibrary(info.id)
                    
                    return (
                      <div
                        key={info.id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                        onClick={() => handleResultClick(result)}
                      >
                        {/* Image */}
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                          {info.image ? (
                            <img
                              src={info.image}
                              alt={info.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          
                          <div 
                            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300"
                            style={{ display: info.image ? 'none' : 'flex' }}
                          >
                            <div className="text-lg">
                              {(() => {
                                const IconComponent = filterOptions.find(f => f.key === selectedFilter)?.icon
                                return IconComponent ? <IconComponent size={16} className="text-gray-600" /> : null
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-gray-900 font-semibold text-sm leading-tight line-clamp-1">
                                {info.title}
                                {getLibraryItemStatus(info.id) && (
                                  <span className="ml-2 text-green-600 font-medium text-xs">
                                    - {statusOptions[selectedFilter].find(s => s.key === getLibraryItemStatus(info.id))?.label}
                                  </span>
                                )}
                              </h3>
                              
                              {info.subtitle && (
                                <p className="text-gray-600 text-xs leading-tight mt-0.5">
                                  {info.subtitle}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-700">
                                  {selectedFilter}
                                </span>
                                
                                {info.year && (
                                  <span className="text-xs text-gray-500">{info.year}</span>
                                )}
                                
                                {info.rating > 0 && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Star size={10} className="text-yellow-500 mr-0.5" />
                                    <span>{info.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="ml-3 flex-shrink-0 relative">
                              {inLibrary || getLibraryItemStatus(info.id) ? (
                                <div className="flex items-center space-x-1 bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                  <Check size={12} />
                                  <span>{inLibrary ? 'In Library' : 'Added'}</span>
                                  {getLibraryItemStatus(info.id) && (
                                    <span className="ml-1 text-green-600 font-medium">
                                      - {statusOptions[selectedFilter].find(s => s.key === getLibraryItemStatus(info.id))?.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="relative" ref={showDropdownForItem === info.id ? dropdownRef : undefined}>
                                  <button
                                    ref={showDropdownForItem === info.id ? buttonRef : undefined}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDropdownToggle(info.id, e.currentTarget)
                                    }}
                                    className="bg-blue-600/90 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1"
                                  >
                                    <Plus size={12} />
                                    <span>Add</span>
                                    <ChevronDown size={10} className="ml-1" />
                                  </button>

                                  {/* Status Dropdown Menu */}
                                  {showDropdownForItem === info.id && (
                                    <div 
                                      className={`absolute right-0 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[140px] ${
                                        dropdownPosition === 'above' 
                                          ? 'bottom-full mb-1' 
                                          : 'top-full mt-1'
                                      }`}
                                      style={{
                                        zIndex: 99999, // Très élevé pour passer au-dessus de tout
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                                      }}
                                    >
                                      {statusOptions[selectedFilter].map((status) => (
                                        <button
                                          key={status.key}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleStatusSelect(info.id, status.key, result)
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                        >
                                          {status.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <span>Click to view details</span>
                <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
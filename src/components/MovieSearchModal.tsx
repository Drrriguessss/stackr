'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Calendar, Loader2, Film, Clock, ChevronDown, Plus, Tv } from 'lucide-react'
import { omdbService } from '@/services/omdbService'
import type { SearchResult, MediaStatus, LibraryItem } from '@/types'

interface MovieSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: SearchResult, status: MediaStatus) => void
  onOpenDetail: (item: SearchResult) => void
  onBackToSelection: () => void
  library: LibraryItem[]
}

export default function MovieSearchModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail,
  onBackToSelection,
  library
}: MovieSearchModalProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Status options for movies/TV shows
  const statusOptions: { value: MediaStatus; label: string; icon: string }[] = [
    { value: 'want-to-play', label: 'Want to Watch', icon: '📝' },
    { value: 'currently-playing', label: 'Currently Watching', icon: '🎬' },
    { value: 'completed', label: 'Watched', icon: '✅' },
    { value: 'paused', label: 'Paused', icon: '⏸️' },
    { value: 'dropped', label: 'Dropped', icon: '❌' }
  ]
  
  // Get status option by value
  const getStatusOption = (status: MediaStatus) => {
    return statusOptions.find(option => option.value === status)
  }

  // Focus input when modal opens and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll on mobile
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  // Restore working movie search logic from SearchModal
  const performMovieSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const startTime = Date.now()
    
    try {
      console.log('🎬 [MovieSearch] Starting movies/series search for:', `"${searchQuery}"`)
      
      // Use the same logic as SearchModal that worked
      const movies = await omdbService.searchMoviesAndSeries(searchQuery, 1)
      console.log('🎬 [MovieSearch] OMDB returned', movies.length, 'movies/series')
      
      if (!movies || movies.length === 0) {
        setSearchResults([])
        setSearchTime(Date.now() - startTime)
        return
      }

      // Get detailed information for top results (like SearchModal did)
      const detailedMovies = await Promise.all(
        movies.slice(0, 12).map(async movie => {
          try {
            const movieDetails = await omdbService.getMovieDetails(movie.imdbID)
            
            if (movieDetails) {
              const converted = omdbService.convertToAppFormat(movieDetails)
              console.log('🎬 [MovieSearch] Movie with details:', converted.title, '- Director:', converted.director)
              return converted
            } else {
              const converted = omdbService.convertToAppFormat(movie)
              return converted
            }
          } catch (error) {
            console.warn('🎬 [MovieSearch] Failed details for:', movie.Title, error)
            return omdbService.convertToAppFormat(movie)
          }
        })
      )

      // Filter out null results and ensure all have required fields
      const validResults = detailedMovies
        .filter(movie => movie !== null && movie.title)
        .filter(movie => {
          // Filter out low quality content (same logic as SearchModal)
          const titleLower = movie.title.toLowerCase()
          const badTerms = ['cam', 'camrip', 'screener', 'dvdscr', 'webrip', 'bootleg', 'pirate', 'fake']
          return !badTerms.some(term => titleLower.includes(term))
        })

      setSearchResults(validResults)
      setSearchTime(Date.now() - startTime)
      
      console.log('🎬 [MovieSearch] Final results:', {
        query: searchQuery,
        totalResults: validResults.length,
        responseTime: Date.now() - startTime,
        topMovies: validResults.slice(0, 5).map(m => `"${m.title}" (${m.year || 'N/A'})`),
      })
      
    } catch (error) {
      console.error('🎬 [MovieSearch] Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Check if movie/show is in library and get its status
  const getMovieLibraryStatus = (movieId: string): MediaStatus | null => {
    const libraryItem = library.find(item => 
      item.id === movieId || 
      item.id === `movie-${movieId}` ||
      item.id.replace('movie-', '') === movieId
    )
    return libraryItem ? libraryItem.status : null
  }
  
  // Handle adding to library with status
  const handleAddToLibraryWithStatus = (item: SearchResult, status: MediaStatus) => {
    onAddToLibrary(item, status)
    setOpenDropdownId(null) // Close dropdown after adding
  }

  // Handle input changes with cinema-optimized debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (newQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    
    // Cinema-optimized debouncing (balanced for movie titles)
    const debounceTime = newQuery.length <= 3 ? 400 : 200

    searchTimeoutRef.current = setTimeout(() => {
      performMovieSearch(newQuery)
    }, debounceTime)
  }, [performMovieSearch])

  const handleClose = () => {
    setQuery('')
    setSearchResults([])
    setIsSearching(false)
    setOpenDropdownId(null)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    onClose()
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.status-dropdown')) {
        setOpenDropdownId(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdownId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        
        <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden z-[10000]" style={{ zIndex: 10000 }}>
          {/* Header with Cinema Theme */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={onBackToSelection}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Film size={24} />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70" size={20} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder="Search for movies & TV shows... (e.g., Inception, Breaking Bad)"
                    className="w-full pl-12 pr-12 py-3 text-lg bg-white/10 border border-white/20 rounded-xl 
                             text-white placeholder-white/70 focus:bg-white/20 focus:border-white/40 
                             focus:outline-none transition-all"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="animate-spin text-white/70" size={20} />
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search Stats */}
            {searchResults.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-white/80">
                <div className="flex items-center gap-1">
                  <Film size={14} />
                  <span>{searchResults.length} movies/shows found</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{searchTime}ms</span>
                </div>
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                  🎬 Cinema Optimized
                </span>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
            {query.length < 2 ? (
              <div className="p-8 text-center">
                <Film size={48} className="mx-auto mb-4 text-blue-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🎬 Movies & TV Search
                </h3>
                <p className="text-gray-500 mb-4">
                  Specialized search for movies and TV shows with quality filtering
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    Movies
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    TV Series
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    Documentaries
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    Classics
                  </span>
                </div>
              </div>
            ) : isSearching ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
                <p className="text-gray-500">Searching cinema database...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center">
                <Search size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No movies found</h3>
                <p className="text-gray-500">Try a different movie title or show name</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid gap-3">
                  {searchResults.map((movie, index) => (
                    <div
                      key={`movie-${movie.id}-${index}`}
                      className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-xl border border-gray-100 
                               hover:border-blue-200 transition-all cursor-pointer group"
                      onClick={() => {
                        onOpenDetail(movie)
                        handleClose() // Close search modal when opening detail
                      }}
                    >
                      {/* Movie Poster */}
                      <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {movie.image ? (
                          <img
                            src={movie.image}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🎬
                          </div>
                        )}
                      </div>

                      {/* Movie Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {movie.title}
                            </h3>

                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {/* Type Badge */}
                              {movie.metadata?.type && (
                                <span className={`px-2 py-1 text-xs rounded-full border font-medium ${
                                  movie.metadata.type.toLowerCase() === 'movie' 
                                    ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                    : 'bg-green-100 text-green-700 border-green-200'
                                }`}>
                                  {movie.metadata.type.toLowerCase() === 'movie' ? (
                                    <>
                                      <Film size={10} className="inline mr-1" />
                                      Movie
                                    </>
                                  ) : (
                                    <>
                                      <Tv size={10} className="inline mr-1" />
                                      TV Show
                                    </>
                                  )}
                                </span>
                              )}

                              {/* Year */}
                              {movie.year && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar size={12} />
                                  {movie.year}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Add to Library Dropdown */}
                          <div className="relative status-dropdown flex-shrink-0">
                            {(() => {
                              const currentStatus = getMovieLibraryStatus(movie.id)
                              const currentStatusOption = currentStatus ? getStatusOption(currentStatus) : null
                              const isInLibrary = currentStatus !== null

                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenDropdownId(openDropdownId === movie.id ? null : movie.id)
                                  }}
                                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                                    isInLibrary 
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                                  }`}
                                >
                                  {isInLibrary ? (
                                    <>
                                      <span className="text-base">{currentStatusOption?.icon}</span>
                                      {currentStatusOption?.label}
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={16} />
                                      Add to Library
                                    </>
                                  )}
                                  <ChevronDown size={14} className={`transition-transform ${
                                    openDropdownId === movie.id ? 'rotate-180' : ''
                                  }`} />
                                </button>
                              )
                            })()}
                            
                            {/* Dropdown Menu */}
                            {openDropdownId === movie.id && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                                <div className="py-2">
                                  {statusOptions.map((option) => {
                                    const currentStatus = getMovieLibraryStatus(movie.id)
                                    const isCurrentStatus = currentStatus === option.value
                                    
                                    return (
                                      <button
                                        key={option.value}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleAddToLibraryWithStatus(movie, option.value)
                                        }}
                                        className={`w-full text-left px-4 py-2 transition-colors flex items-center gap-3 text-sm ${
                                          isCurrentStatus 
                                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                                            : 'hover:bg-purple-50 text-gray-700'
                                        }`}
                                      >
                                        <span className="text-lg">{option.icon}</span>
                                        <span className={isCurrentStatus ? 'font-medium' : ''}>
                                          {option.label}
                                          {isCurrentStatus && <span className="text-xs ml-2">(Current)</span>}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Star, Calendar, ExternalLink, Loader2, Film, Clock, TrendingUp } from 'lucide-react'
import { omdbService } from '@/services/omdbService'
import type { SearchResult } from '@/types'

interface MovieSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: SearchResult) => void
  onOpenDetail: (item: SearchResult) => void
  onBackToSelection: () => void
}

export default function MovieSearchModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail,
  onBackToSelection
}: MovieSearchModalProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Specialized movie search with cinema-specific optimizations
  const performMovieSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const startTime = Date.now()
    
    try {
      console.log('🎬 [MovieSearch] === SPECIALIZED MOVIE SEARCH ===')
      console.log('🎬 [MovieSearch] Query:', `"${searchQuery}"`)
      
      // Use OMDB service directly with movie-specific parameters
      const omdbMovies = await omdbService.searchMoviesAndSeries(searchQuery, 1)
      
      // Convert and filter results with cinema-specific logic
      const movieResults = omdbMovies
        .map(movie => omdbService.convertToAppFormat(movie))
        .filter(movie => movie !== null && movie.title)
        .filter(movie => !isLowQualityContent(movie))
        .sort((a, b) => {
          // Cinema-specific sorting
          const scoreA = calculateMovieRelevance(searchQuery, a)
          const scoreB = calculateMovieRelevance(searchQuery, b)
          return scoreB - scoreA
        })
        .slice(0, 20) // Limit to top 20 most relevant movies

      setSearchResults(movieResults)
      setSearchTime(Date.now() - startTime)
      
      console.log('🎬 [MovieSearch] Results:', {
        query: searchQuery,
        totalResults: movieResults.length,
        responseTime: Date.now() - startTime,
        topMovies: movieResults.slice(0, 5).map(m => `"${m.title}" (${m.year || 'N/A'})`),
      })
      
    } catch (error) {
      console.error('🎬 [MovieSearch] Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Cinema-specific quality filter
  const isLowQualityContent = (movie: SearchResult): boolean => {
    const titleLower = movie.title.toLowerCase()
    
    // Cinema-specific filters - more strict for movies
    const rejectTerms = [
      'cam', 'camrip', 'screener', 'dvdscr', 'webrip',
      'discount', 'bootleg', 'pirate', 'fake',
      'behind the scenes', 'making of', 'deleted scenes',
      'bloopers', 'outtakes', 'gag reel',
      'fan edit', 'fan made', 'amateur',
      'trailer', 'teaser', 'clip', 'scene',
      'xxx', 'adult', 'porn', 'erotic'
    ]
    
    return rejectTerms.some(term => titleLower.includes(term))
  }

  // Cinema-specific relevance scoring
  const calculateMovieRelevance = (query: string, movie: SearchResult): number => {
    const queryLower = query.toLowerCase().trim()
    const titleLower = movie.title.toLowerCase().trim()
    
    let score = 0
    
    // Exact match
    if (titleLower === queryLower) return 10
    
    // Starts with query
    if (titleLower.startsWith(queryLower)) score += 8
    
    // Contains full query
    if (titleLower.includes(queryLower)) score += 6
    
    // Word matches
    const queryWords = queryLower.split(/\s+/)
    const titleWords = titleLower.split(/\s+/)
    
    queryWords.forEach(qWord => {
      if (titleWords.some(tWord => tWord.startsWith(qWord))) {
        score += 3
      }
    })
    
    // Boost for recent movies
    if (movie.year && movie.year >= 2015) score += 1
    
    // Boost for highly rated movies
    if (movie.rating && movie.rating >= 7) score += 2
    
    // Boost for classic movies (before 2000 but high rated)
    if (movie.year && movie.year < 2000 && movie.rating && movie.rating >= 8) {
      score += 1.5
    }
    
    return score
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
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        
        <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
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
                  <TrendingUp size={14} />
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
                      onClick={() => onOpenDetail(movie)}
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
                            
                            {movie.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {movie.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2">
                              {/* Year */}
                              {movie.year && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar size={12} />
                                  {movie.year}
                                </div>
                              )}

                              {/* Rating */}
                              {movie.rating && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Star size={12} className="text-yellow-400 fill-current" />
                                  {movie.rating}/10
                                </div>
                              )}

                              {/* External Link */}
                              {movie.externalUrl && (
                                <a
                                  href={movie.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink size={12} />
                                  IMDB
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Add to Library Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddToLibrary(movie)
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                                     transition-colors text-sm font-medium flex-shrink-0"
                          >
                            Add to Library
                          </button>
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
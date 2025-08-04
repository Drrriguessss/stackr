'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Star, Calendar, ExternalLink, Loader2, Zap, Clock, TrendingUp } from 'lucide-react'
import { unifiedSearchService, type UnifiedSearchResult, type SearchOptions } from '@/services/unifiedSearchService'
import type { SearchResult, MediaCategory } from '@/types'

interface SearchModalV2Props {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: SearchResult) => void
  onOpenDetail: (item: SearchResult) => void
}

export default function SearchModalV2({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail
}: SearchModalV2Props) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchMetrics, setSearchMetrics] = useState<any>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      unifiedSearchService.cleanup()
    }
  }, [])

  // Debounced search with unified service
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    
    try {
      const results = await unifiedSearchService.search(searchQuery, {
        categories: ['movies', 'books', 'games', 'music'],
        limit: 50
      })
      
      setSearchResults(results)
      
      // Update metrics for display
      const metrics = unifiedSearchService.getMetrics()
      setSearchMetrics(metrics)
      
      console.log('🚀 [UnifiedSearch] Results:', {
        query: searchQuery,
        totalResults: results.totalCount,
        responseTime: results.responseTime,
        fromCache: results.fromCache,
        metrics: {
          avgResponseTime: metrics.avgResponseTime,
          cacheHitRate: metrics.cacheHitRate,
          totalSearches: metrics.searches
        }
      })
      
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults({ results: [], totalCount: 0, responseTime: 0, fromCache: false })
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Handle input changes with intelligent debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Don't search for very short queries
    if (newQuery.trim().length < 2) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    // Set loading state immediately for better UX
    setIsSearching(true)

    // Intelligent debouncing - shorter delay for longer queries
    const debounceTime = newQuery.length <= 2 ? 500 : newQuery.length <= 4 ? 300 : 200

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(newQuery)
    }, debounceTime)
  }, [performSearch])

  const handleClose = () => {
    setQuery('')
    setSearchResults(null)
    setIsSearching(false)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    onClose()
  }

  const getCategoryIcon = (category: MediaCategory) => {
    switch (category) {
      case 'games': return '🎮'
      case 'movies': return '🎬'
      case 'books': return '📚'  
      case 'music': return '🎵'
      default: return '⭐'
    }
  }

  const getCategoryColor = (category: MediaCategory) => {
    switch (category) {
      case 'games': return 'bg-green-50 text-green-700 border-green-200'
      case 'movies': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'books': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'music': return 'bg-purple-50 text-purple-700 border-purple-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        
        <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  placeholder="Search games, movies, music, books with unified AI ranking..."
                  className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                  </div>
                )}
              </div>
              
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Search Metrics */}
            {searchResults && (
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  <span>{searchResults.totalCount} results</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{formatResponseTime(searchResults.responseTime)}</span>
                </div>
                {searchResults.fromCache && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Zap size={14} />
                    <span>Cached</span>
                  </div>
                )}
                {searchMetrics && (
                  <div className="flex items-center gap-1">
                    <span>Avg: {formatResponseTime(searchMetrics.avgResponseTime)}</span>
                    <span>•</span>
                    <span>Cache: {Math.round(searchMetrics.cacheHitRate * 100)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
            {query.length < 2 ? (
              <div className="p-8 text-center">
                <Search size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🚀 Unified Search V2.0
                </h3>
                <p className="text-gray-500 mb-4">
                  Search across all media with AI-powered ranking, parallel API calls, and intelligent caching
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    🎮 Games
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    🎬 Movies
                  </span>
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                    📚 Books
                  </span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                    🎵 Music
                  </span>
                </div>
              </div>
            ) : isSearching ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
                <p className="text-gray-500">Searching across all APIs in parallel...</p>
              </div>
            ) : searchResults?.results.length === 0 ? (
              <div className="p-8 text-center">
                <Search size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500">Try a different search term</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid gap-3">
                  {searchResults?.results.map((item, index) => (
                    <div
                      key={`${item.category}-${item.id}-${index}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all cursor-pointer group"
                      onClick={() => onOpenDetail(item)}
                    >
                      {/* Media Cover */}
                      <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {getCategoryIcon(item.category)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h3>
                            
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2">
                              {/* Category Badge */}
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                                {getCategoryIcon(item.category)}
                                {item.category}
                              </span>

                              {/* Year */}
                              {item.year && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar size={12} />
                                  {item.year}
                                </div>
                              )}

                              {/* Rating */}
                              {item.rating && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Star size={12} className="text-yellow-400 fill-current" />
                                  {item.rating}/10
                                </div>
                              )}

                              {/* External Link */}
                              {item.externalUrl && (
                                <a
                                  href={item.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink size={12} />
                                  View
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Add to Library Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddToLibrary(item)
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex-shrink-0"
                          >
                            Add to Library
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Indicator */}
                {searchResults && searchResults.totalCount > searchResults.results.length && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    Showing {searchResults.results.length} of {searchResults.totalCount} results
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with Performance Stats */}
          {searchMetrics && searchResults && (
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span>🚀 Unified Search V2.0</span>
                  <span>Total searches: {searchMetrics.searches}</span>
                  <span>Cache hit rate: {Math.round(searchMetrics.cacheHitRate * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Powered by parallel APIs + BM25 ranking</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
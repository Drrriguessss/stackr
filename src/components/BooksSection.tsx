'use client'
import React, { useState, useEffect } from 'react'
import { BookOpen, Search, Loader2, Star, Calendar, Plus, Users, FileText, Award } from 'lucide-react'
import { optimalBooksAPI, type OptimalBookResult } from '@/services/optimalBooksAPI'
import type { MediaStatus, LibraryItem } from '@/types'

interface BooksSectionProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

export default function BooksSection({
  onAddToLibrary,
  onOpenDetail,
  library
}: BooksSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OptimalBookResult[]>([])
  const [trendingContent, setTrendingContent] = useState<OptimalBookResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  
  // Advanced filter states for books
  const [filters, setFilters] = useState({
    orderBy: 'relevance' as 'relevance' | 'newest' | 'oldest',
    category: 'all',
    minRating: 0,
    language: 'en',
    showAdvancedFilters: false,
    searchBy: 'all' as 'title' | 'author' | 'isbn' | 'all'
  })

  // Load trending content on mount
  useEffect(() => {
    loadTrendingContent()
  }, [])

  const loadTrendingContent = async () => {
    setIsLoadingTrending(true)
    try {
      const trending = await optimalBooksAPI.getTrending('fiction')
      setTrendingContent(trending)
      console.log('📚 [BooksSection] Loaded trending:', trending.length, 'books')
    } catch (error) {
      console.error('📚 [BooksSection] Failed to load trending:', error)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  const handleSearch = async (query: string, currentFilters = filters) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await optimalBooksAPI.search(query, {
        limit: 12,
        orderBy: currentFilters.orderBy,
        language: currentFilters.language,
        searchBy: currentFilters.searchBy
      })
      
      // Apply client-side filtering
      let filteredResults = results
      
      if (currentFilters.minRating > 0) {
        filteredResults = filteredResults.filter(book => 
          book.rating && book.rating >= currentFilters.minRating
        )
      }
      
      if (currentFilters.category !== 'all') {
        filteredResults = filteredResults.filter(book =>
          book.categories?.some(cat => 
            cat.toLowerCase().includes(currentFilters.category.toLowerCase())
          ) ||
          book.subjects?.some(sub => 
            sub.toLowerCase().includes(currentFilters.category.toLowerCase())
          )
        )
      }

      setSearchResults(filteredResults)
      console.log('📚 [BooksSection] Enhanced search results:', filteredResults.length, 'books')
    } catch (error) {
      console.error('📚 [BooksSection] Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle filter changes
  const handleFilterChange = (filterName: string, value: any) => {
    const newFilters = {
      ...filters,
      [filterName]: value
    }
    setFilters(newFilters)
    
    // Trigger search with new filters
    if (searchQuery) {
      handleSearch(searchQuery, newFilters)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filters])

  const isInLibrary = (itemId: string) => {
    return library.some(item => item.id === itemId)
  }

  const renderBookCard = (book: OptimalBookResult) => (
    <div
      key={book.id}
      className="bg-white rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onOpenDetail(book)}
    >
      {/* Book Cover */}
      <div className="aspect-[2/3] bg-gray-100 rounded-t-xl overflow-hidden">
        {book.image ? (
          <img
            src={book.image}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              console.log('🖼️ Book cover failed to load:', book.image)
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        
        {/* Fallback placeholder */}
        {!book.image && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <BookOpen size={48} className="text-gray-400" />
          </div>
        )}

        {/* Quality Score Badge */}
        {book.totalScore && book.totalScore > 50 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Award size={10} />
            {Math.round(book.totalScore)}
          </div>
        )}

        {/* Bestseller Badge */}
        {book.ratingsCount && book.ratingsCount > 1000 && book.rating && book.rating >= 4.0 && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            📚 Bestseller
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-amber-600 transition-colors">
            {book.title}
          </h3>
          
          {!isInLibrary(book.id) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToLibrary(book, 'want-to-play') // Using want-to-play as default status
              }}
              className="flex-shrink-0 p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              title="Add to Library"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Author */}
        {book.authors && book.authors.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <Users size={10} />
            <span>{book.authors.slice(0, 2).join(', ')}</span>
            {book.authors.length > 2 && <span>+{book.authors.length - 2} more</span>}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          {/* Publisher & Year */}
          {book.publisher && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {book.publisher}
            </span>
          )}

          {book.year && (
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              {book.year}
            </div>
          )}
        </div>

        {/* Rating and Reviews */}
        <div className="flex items-center gap-3 mb-2">
          {book.rating && book.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Star size={10} className="fill-current" />
              <span>{book.rating.toFixed(1)}/5</span>
            </div>
          )}

          {book.ratingsCount && book.ratingsCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={10} />
              <span>{book.ratingsCount.toLocaleString()} reviews</span>
            </div>
          )}
        </div>

        {/* Page Count */}
        {book.pageCount && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <FileText size={10} />
            <span>{book.pageCount} pages</span>
          </div>
        )}

        {/* Categories */}
        {book.categories && book.categories.length > 0 && (
          <div className="text-xs text-gray-500 mb-2">
            {book.categories.slice(0, 2).join(', ')}
            {book.categories.length > 2 && '...'}
          </div>
        )}

        {/* Description Preview */}
        {book.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mt-2">
            {book.description}
          </p>
        )}

        {/* Debug Scores (development only) */}
        {process.env.NODE_ENV === 'development' && book.totalScore && (
          <div className="text-xs bg-gray-100 p-2 rounded mt-2 font-mono">
            <div>Total: {Math.round(book.totalScore)}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span>Title: {Math.round(book.titleScore || 0)}</span>
              <span>Quality: {Math.round(book.qualityScore || 0)}</span>
              <span>Pop: {Math.round(book.popularityScore || 0)}</span>
              <span>Source: {book.source}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const displayContent = searchQuery.trim() ? searchResults : trendingContent
  const isLoading = searchQuery.trim() ? isSearching : isLoadingTrending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Books</h2>
            <p className="text-sm text-gray-600">Powered by Google Books • Comprehensive library search</p>
          </div>
        </div>
      </div>

      {/* Search Bar with Advanced Controls */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books... (e.g., Harry Potter, Stephen King, programming)"
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            )}
          </div>
          
          {/* Quick Category Filters */}
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          >
            <option value="all">All Categories</option>
            <option value="fiction">Fiction</option>
            <option value="non-fiction">Non-Fiction</option>
            <option value="romance">Romance</option>
            <option value="mystery">Mystery</option>
            <option value="science">Science</option>
            <option value="history">History</option>
            <option value="biography">Biography</option>
          </select>

          <button
            onClick={() => handleFilterChange('showAdvancedFilters', !filters.showAdvancedFilters)}
            className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filters.showAdvancedFilters 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Advanced
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {filters.showAdvancedFilters && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Search Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by
                </label>
                <select 
                  value={filters.searchBy} 
                  onChange={(e) => handleFilterChange('searchBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">🔍 Everything</option>
                  <option value="title">📖 Title Only</option>
                  <option value="author">👤 Author Only</option>
                  <option value="isbn">🏷️ ISBN</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <select 
                  value={filters.orderBy} 
                  onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="relevance">🎯 Relevance</option>
                  <option value="newest">📅 Newest First</option>
                  <option value="oldest">📜 Oldest First</option>
                </select>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Rating
                </label>
                <select 
                  value={filters.minRating} 
                  onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value={0}>Any Rating</option>
                  <option value={3.0}>3+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                  <option value={4.0}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select 
                  value={filters.language} 
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="fr">🇫🇷 French</option>
                  <option value="es">🇪🇸 Spanish</option>
                  <option value="de">🇩🇪 German</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div>
        {/* Section Title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {searchQuery.trim() 
                ? `Search Results (${searchResults.length})` 
                : 'Trending Fiction'
              }
            </h3>
            
            {/* Active filters indicator */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>Sort: {
                  filters.orderBy === 'relevance' ? '🎯 Relevance' :
                  filters.orderBy === 'newest' ? '📅 Newest' :
                  '📜 Oldest'
                }</span>
                
                {filters.category !== 'all' && (
                  <span>• Category: {filters.category}</span>
                )}
                
                {filters.minRating > 0 && (
                  <span>• Min Rating: {filters.minRating}+</span>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right">
            {(searchQuery.trim()) && (
              <span className="text-sm text-gray-500">
                Powered by Google Books
              </span>
            )}
            
            {displayContent.length > 0 && (
              <div className="text-xs text-gray-400 mt-1">
                Enhanced with intelligent ranking
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-4 text-amber-500" size={32} />
              <p className="text-gray-500">
                {searchQuery.trim() ? 'Searching books...' : 'Loading trending books...'}
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayContent.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No books found</h3>
            <p className="text-gray-500">Try a different title, author, or genre</p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && displayContent.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayContent.map(renderBookCard)}
          </div>
        )}
      </div>
    </div>
  )
}
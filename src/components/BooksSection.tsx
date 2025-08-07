'use client'
import React, { useState, useEffect, useMemo } from 'react'
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

  // Load trending content on mount - DISABLED
  // useEffect(() => {
  //   loadTrendingContent()
  // }, [])

  // const loadTrendingContent = async () => {
  //   setIsLoadingTrending(true)
  //   try {
  //     const trending = await optimalBooksAPI.getTrending('fiction')
  //     setTrendingContent(trending)
  //     console.log('📚 [BooksSection] Loaded trending:', trending.length, 'books')
  //   } catch (error) {
  //     console.error('📚 [BooksSection] Failed to load trending:', error)
  //   } finally {
  //     setIsLoadingTrending(false)
  //   }
  // }

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
      <div className="aspect-[2/3] bg-gray-100 rounded-t-xl overflow-hidden relative">
        <BookCoverImage book={book} />

        {/* Quality Score Badge */}
        {book.totalScore && book.totalScore > 50 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
            <Award size={10} />
            {Math.round(book.totalScore)}
          </div>
        )}

        {/* Bestseller Badge */}
        {book.ratingsCount && book.ratingsCount > 1000 && book.rating && book.rating >= 4.0 && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
            📚 Bestseller
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-amber-600 transition-colors" 
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
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
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1.5">
            <Users size={10} />
            <span>{book.authors.slice(0, 2).join(', ')}</span>
            {book.authors.length > 2 && <span>+{book.authors.length - 2} more</span>}
          </div>
        )}

        {/* Publisher & Year */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1.5 flex-wrap">
          {book.publisher && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {book.publisher}
            </span>
          )}

          {book.year && (
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              <span>{book.year}</span>
            </div>
          )}
        </div>

        {/* Rating and Reviews */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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

        {/* Page Count & Categories */}
        <div className="space-y-1">
          {book.pageCount && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <FileText size={10} />
              <span>{book.pageCount} pages</span>
            </div>
          )}

          {book.categories && book.categories.length > 0 && (
            <div className="text-xs text-gray-500">
              {book.categories.slice(0, 2).join(', ')}
              {book.categories.length > 2 && '...'}
            </div>
          )}
        </div>

        {/* Description Preview */}
        {book.description && (
          <p className="text-xs text-gray-600 mt-2 leading-relaxed"
             style={{
               display: '-webkit-box',
               WebkitLineClamp: 2,
               WebkitBoxOrient: 'vertical',
               overflow: 'hidden'
             }}>
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

  const displayContent = searchResults
  const isLoading = isSearching

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Book Discovery</h2>
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
              placeholder="Search books..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div>
        {/* Section Title */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results ({searchResults.length})
              </h3>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-4 text-amber-500" size={32} />
              <p className="text-gray-500">Searching books...</p>
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

        {/* Results Grid - only show when searching */}
        {!isLoading && searchQuery.trim() && displayContent.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayContent.map(renderBookCard)}
          </div>
        )}
        
        {/* Welcome message when not searching */}
        {!searchQuery.trim() && !isLoading && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start your book discovery</h3>
            <p className="text-gray-500">Enter a book title, author name, or keyword to search millions of books</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Separate component for handling book cover images with multiple fallbacks
function BookCoverImage({ book }: { book: OptimalBookResult }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isError, setIsError] = useState(false)

  // Build array of possible image sources
  const imageSources = useMemo(() => {
    const sources: string[] = []
    
    // 1. Primary Google Books image
    if (book.image) {
      sources.push(book.image)
    }
    
    // 2. Other Google Books sizes
    if (book.imageLinks) {
      if (book.imageLinks.large && book.imageLinks.large !== book.image) {
        sources.push(book.imageLinks.large)
      }
      if (book.imageLinks.medium && book.imageLinks.medium !== book.image) {
        sources.push(book.imageLinks.medium)
      }
      if (book.imageLinks.small && book.imageLinks.small !== book.image) {
        sources.push(book.imageLinks.small)
      }
    }
    
    // 3. Open Library covers using ISBN
    if (book.isbn?.isbn13) {
      sources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn13}-L.jpg`)
      sources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn13}-M.jpg`)
    }
    if (book.isbn?.isbn10) {
      sources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn10}-L.jpg`)
      sources.push(`https://covers.openlibrary.org/b/isbn/${book.isbn.isbn10}-M.jpg`)
    }

    return sources.filter(Boolean)
  }, [book])

  const handleImageError = () => {
    console.log('🖼️ Book cover failed to load:', imageSources[currentImageIndex])
    
    // Try next image source
    if (currentImageIndex < imageSources.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    } else {
      // All images failed, show placeholder
      setIsError(true)
    }
  }

  const handleImageLoad = () => {
    console.log('📚 Book cover loaded successfully:', imageSources[currentImageIndex])
    setIsError(false)
  }

  if (isError || imageSources.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200">
        <div className="text-center">
          <BookOpen size={48} className="text-amber-500 mx-auto mb-2" />
          <div className="text-xs text-amber-600 font-medium px-2">
            {book.title.length > 20 ? book.title.substring(0, 20) + '...' : book.title}
          </div>
          <div className="text-xs text-amber-500 mt-1">
            {book.authors?.[0] || 'Unknown Author'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={imageSources[currentImageIndex]}
      alt={book.title}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
    />
  )
}
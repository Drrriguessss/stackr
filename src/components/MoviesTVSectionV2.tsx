'use client'
import React, { useState, useEffect } from 'react'
import { Film, Tv, Search, Loader2, Star, Calendar, Plus } from 'lucide-react'
import { optimalMovieAPI, type OptimalMovieResult } from '@/services/optimalMovieAPI'
import { idsMatch } from '@/utils/idNormalizer'
import type { MediaStatus, LibraryItem } from '@/types'

interface MoviesTVSectionV2Props {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

export default function MoviesTVSectionV2({
  onAddToLibrary,
  onOpenDetail,
  library
}: MoviesTVSectionV2Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OptimalMovieResult[]>([])
  const [trendingContent, setTrendingContent] = useState<OptimalMovieResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)

  // Load trending content on mount
  useEffect(() => {
    loadTrendingContent()
  }, [])

  const loadTrendingContent = async () => {
    setIsLoadingTrending(true)
    try {
      const trending = await optimalMovieAPI.getTrending()
      setTrendingContent(trending)
      console.log('🎬 [MoviesTVV2] Loaded trending:', trending.length, 'items')
    } catch (error) {
      console.error('🎬 [MoviesTVV2] Failed to load trending:', error)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await optimalMovieAPI.search(query, 12)
      setSearchResults(results)
      console.log('🎬 [MoviesTVV2] Search results:', results.length, 'items')
    } catch (error) {
      console.error('🎬 [MoviesTVV2] Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const isInLibrary = (itemId: string) => {
    return library.some(item => idsMatch(item.id, itemId))
  }

  const renderMovieCard = (item: OptimalMovieResult) => (
    <div
      key={item.id}
      className="bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onOpenDetail(item)}
    >
      {/* Movie Poster */}
      <div className="aspect-[2/3] bg-gray-100 rounded-t-xl overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              console.log('🖼️ Image failed to load:', item.image)
              // Show fallback
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        
        {/* Fallback placeholder */}
        {!item.image && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            {item.media_type === 'movie' ? (
              <Film size={48} className="text-gray-400" />
            ) : (
              <Tv size={48} className="text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
            {item.title}
          </h3>
          
          {!isInLibrary(item.id) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToLibrary(item, 'want-to-play')
              }}
              className="flex-shrink-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Add to Library"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          {/* Type Badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.type === 'movie' 
              ? 'bg-purple-100 text-purple-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {item.type === 'movie' ? (
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

          {/* Year */}
          {item.year && (
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              {item.year}
            </div>
          )}
        </div>

        {/* Rating */}
        {item.rating && item.rating > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Star size={10} className="fill-current" />
            <span>{item.rating}/5</span>
          </div>
        )}

        {/* Overview */}
        {item.overview && (
          <p className="text-xs text-gray-600 line-clamp-2 mt-2">
            {item.overview}
          </p>
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
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl">
            <Film size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Movies & TV V2</h2>
            <p className="text-sm text-gray-600">Powered by TMDB • High-quality content</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search movies and TV shows... (e.g., Inception, Breaking Bad)"
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <Loader2 className="animate-spin text-gray-400" size={20} />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div>
        {/* Section Title */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {searchQuery.trim() 
              ? `Search Results (${searchResults.length})` 
              : 'Trending Now'
            }
          </h3>
          
          {searchQuery.trim() && (
            <span className="text-sm text-gray-500">
              Powered by TMDB
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={32} />
              <p className="text-gray-500">
                {searchQuery.trim() ? 'Searching...' : 'Loading trending content...'}
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayContent.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">Try a different movie or TV show title</p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && displayContent.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayContent.map(renderMovieCard)}
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import React, { useState, useEffect } from 'react'
import { Film, Tv, Search, Loader2, Star, Calendar, Plus } from 'lucide-react'
import { tmdbService } from '@/services/tmdbService'
import type { MediaStatus, LibraryItem } from '@/types'

interface MoviesTVSectionProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

export default function MoviesTVSection({
  onAddToLibrary,
  onOpenDetail,
  library
}: MoviesTVSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [trendingContent, setTrendingContent] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)

  // Load trending content on mount
  useEffect(() => {
    loadTrendingContent()
  }, [])

  const loadTrendingContent = async () => {
    setIsLoadingTrending(true)
    try {
      const trending = await tmdbService.getTrendingMovies()
      setTrendingContent(trending.slice(0, 12))
      console.log('🎬 [MoviesTVSection] Loaded trending:', trending.length, 'items')
    } catch (error) {
      console.error('🎬 [MoviesTVSection] Failed to load trending:', error)
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
      const [movies, tvShows] = await Promise.all([
        tmdbService.searchMovies(query),
        tmdbService.searchTVShows(query)
      ])

      // Convert TMDB format to app format
      const movieResults = movies.slice(0, 6).map(movie => ({
        id: `tmdb-movie-${movie.id}`,
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
        type: 'movie',
        image: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
        overview: movie.overview,
        rating: movie.vote_average ? Number((movie.vote_average / 2).toFixed(1)) : undefined,
        category: 'movies',
        metadata: { tmdb_id: movie.id, type: 'movie' }
      }))

      const tvResults = tvShows.slice(0, 6).map(tv => ({
        id: `tmdb-tv-${tv.id}`,
        title: tv.name,
        year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : undefined,
        type: 'tv',
        image: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined,
        overview: tv.overview,
        rating: tv.vote_average ? Number((tv.vote_average / 2).toFixed(1)) : undefined,
        category: 'movies',
        metadata: { tmdb_id: tv.id, type: 'tv' }
      }))

      const allResults = [...movieResults, ...tvResults]
        .filter(item => item.image) // Only items with images
        .sort((a, b) => (b.rating || 0) - (a.rating || 0)) // Sort by rating

      setSearchResults(allResults)
      console.log('🎬 [MoviesTVSection] Search results:', allResults.length, 'items')
    } catch (error) {
      console.error('🎬 [MoviesTVSection] Search failed:', error)
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
    return library.some(item => item.id === itemId)
  }

  const renderMovieCard = (item: any) => (
    <div
      key={item.id}
      className="bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onOpenDetail(item)}
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-gray-100 rounded-t-xl overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-poster.jpg'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.type === 'movie' ? (
              <Film size={48} className="text-gray-400" />
            ) : (
              <Tv size={48} className="text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
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
                TV
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
            <h2 className="text-xl font-bold text-gray-900">Movies & TV</h2>
            <p className="text-sm text-gray-600">Powered by TMDB</p>
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
          placeholder="Search movies and TV shows..."
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {searchQuery.trim() 
              ? `Search Results (${searchResults.length})` 
              : 'Trending Now'
            }
          </h3>
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
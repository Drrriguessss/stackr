'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { Music, Search, Loader2, Star, Calendar, Plus, Users, Clock, Award, Play } from 'lucide-react'
import { optimalMusicAPI, type OptimalMusicResult } from '@/services/optimalMusicAPI'
import type { MediaStatus, LibraryItem } from '@/types'

interface MusicSectionProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

export default function MusicSection({
  onAddToLibrary,
  onOpenDetail,
  library
}: MusicSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OptimalMusicResult[]>([])
  const [trendingContent, setTrendingContent] = useState<OptimalMusicResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  
  // Advanced filter states for music
  const [filters, setFilters] = useState({
    sortBy: 'mixed' as 'relevance' | 'popularity' | 'date' | 'mixed',
    genre: 'all',
    minYear: 2000,
    includeExplicit: true,
    showAdvancedFilters: false,
    searchBy: 'all' as 'track' | 'artist' | 'album' | 'all',
    type: 'track' as 'track' | 'artist' | 'album' | 'all'
  })

  // Load trending content on mount
  useEffect(() => {
    loadTrendingContent()
  }, [])

  const loadTrendingContent = async () => {
    setIsLoadingTrending(true)
    try {
      const trending = await optimalMusicAPI.getTrending('all')
      setTrendingContent(trending)
      console.log('🎵 [MusicSection] Loaded trending:', trending.length, 'tracks')
    } catch (error) {
      console.error('🎵 [MusicSection] Failed to load trending:', error)
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
      const results = await optimalMusicAPI.search(query, {
        limit: 12,
        type: currentFilters.type,
        includeExplicit: currentFilters.includeExplicit,
        searchBy: currentFilters.searchBy,
        sortBy: currentFilters.sortBy,
        minYear: currentFilters.minYear,
        genre: currentFilters.genre !== 'all' ? currentFilters.genre : undefined
      })
      
      setSearchResults(results)
      console.log('🎵 [MusicSection] Enhanced search results:', results.length, 'tracks')
    } catch (error) {
      console.error('🎵 [MusicSection] Search failed:', error)
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

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const renderMusicCard = (track: OptimalMusicResult) => (
    <div
      key={track.id}
      className="bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onOpenDetail(track)}
    >
      {/* Album Art */}
      <div className="aspect-square bg-gray-100 rounded-t-xl overflow-hidden relative">
        <MusicArtworkImage track={track} />

        {/* Quality Score Badge */}
        {track.totalScore && track.totalScore > 50 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
            <Award size={10} />
            {Math.round(track.totalScore)}
          </div>
        )}

        {/* Popular Badge */}
        {track.popularity && track.popularity > 80 && (
          <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
            🔥 Hot
          </div>
        )}

        {/* Preview Available Badge */}
        {track.preview_url && (
          <div className="absolute bottom-2 right-2 bg-green-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Play size={12} />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">
            {track.name}
          </h3>
          
          {!isInLibrary(track.id) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToLibrary(track, 'want-to-play') // Using want-to-play as default status
              }}
              className="flex-shrink-0 p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              title="Add to Library"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Artist */}
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
          <Users size={10} />
          <span>{track.artist}</span>
        </div>

        {/* Album and Year */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          {track.album && (
            <div className="flex items-center gap-1">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium truncate max-w-[120px]">
                {track.album}
              </span>
              {track.albumType && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                  track.albumType === 'album' ? 'bg-green-100 text-green-700' :
                  track.albumType === 'single' ? 'bg-orange-100 text-orange-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {track.albumType}
                </span>
              )}
            </div>
          )}

          {track.year && (
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              {track.year}
            </div>
          )}
        </div>

        {/* Duration and Track Info */}
        <div className="flex items-center gap-3 mb-2">
          {track.duration && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={10} />
              <span>{formatDuration(track.duration)}</span>
            </div>
          )}

          {track.trackNumber && (
            <div className="text-xs text-gray-500">
              Track #{track.trackNumber}
            </div>
          )}
        </div>

        {/* Popularity and Rating */}
        <div className="flex items-center gap-3 mb-2">
          {track.popularity && track.popularity > 0 && (
            <div className="flex items-center gap-1 text-xs text-purple-600">
              <Star size={10} className="fill-current" />
              <span>{track.popularity}%</span>
            </div>
          )}

          {track.rating && track.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Star size={10} className="fill-current" />
              <span>{track.rating.toFixed(1)}/5</span>
            </div>
          )}
        </div>

        {/* Genre */}
        {track.genre && (
          <div className="text-xs text-gray-500 mb-2">
            {track.genre}
          </div>
        )}

        {/* Explicit Content Warning */}
        {track.explicit && (
          <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full inline-block mb-2">
            🚨 Explicit
          </div>
        )}

        {/* Debug Scores (development only) */}
        {process.env.NODE_ENV === 'development' && track.totalScore && (
          <div className="text-xs bg-gray-100 p-2 rounded mt-2 font-mono">
            <div>Total: {Math.round(track.totalScore)}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span>Title: {Math.round(track.titleScore || 0)}</span>
              <span>Artist: {Math.round(track.artistScore || 0)}</span>
              <span>Pop: {Math.round(track.popularityScore || 0)}</span>
              <span>Source: {track.source}</span>
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
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl">
            <Music size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Music</h2>
            <p className="text-sm text-gray-600">Powered by iTunes • Comprehensive music search</p>
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
              placeholder="Search music... (e.g., Billie Eilish, The Beatles, jazz)"
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            )}
          </div>
          
          {/* Quick Genre Filters */}
          <select
            value={filters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          >
            <option value="all">All Genres</option>
            <option value="pop">Pop</option>
            <option value="rock">Rock</option>
            <option value="hip hop">Hip Hop</option>
            <option value="jazz">Jazz</option>
            <option value="classical">Classical</option>
            <option value="electronic">Electronic</option>
            <option value="country">Country</option>
            <option value="r&b">R&B</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">🔍 Everything</option>
                  <option value="track">🎵 Track Only</option>
                  <option value="artist">👤 Artist Only</option>
                  <option value="album">💿 Album Only</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <select 
                  value={filters.sortBy} 
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="mixed">🎯 Balanced</option>
                  <option value="relevance">🔍 Relevance</option>
                  <option value="popularity">🔥 Popularity</option>
                  <option value="date">📅 Release Date</option>
                </select>
              </div>

              {/* Minimum Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Year
                </label>
                <select 
                  value={filters.minYear} 
                  onChange={(e) => handleFilterChange('minYear', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={2020}>2020+</option>
                  <option value={2015}>2015+</option>
                  <option value={2010}>2010+</option>
                  <option value={2000}>2000+</option>
                  <option value={1990}>1990+</option>
                  <option value={1980}>1980+</option>
                </select>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type
                </label>
                <select 
                  value={filters.type} 
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="track">🎵 Tracks</option>
                  <option value="artist">👤 Artists</option>
                  <option value="album">💿 Albums</option>
                  <option value="all">🔍 All Types</option>
                </select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="mt-4 flex items-center gap-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.includeExplicit}
                  onChange={(e) => handleFilterChange('includeExplicit', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Include explicit content</span>
              </label>
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
                : 'Trending Music'
              }
            </h3>
            
            {/* Active filters indicator */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>Sort: {
                  filters.sortBy === 'mixed' ? '🎯 Balanced' :
                  filters.sortBy === 'popularity' ? '🔥 Popularity' :
                  filters.sortBy === 'date' ? '📅 Date' :
                  '🔍 Relevance'
                }</span>
                
                {filters.genre !== 'all' && (
                  <span>• Genre: {filters.genre}</span>
                )}
                
                {filters.minYear > 2000 && (
                  <span>• Year: {filters.minYear}+</span>
                )}

                {!filters.includeExplicit && (
                  <span>• Clean only</span>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right">
            {(searchQuery.trim()) && (
              <span className="text-sm text-gray-500">
                Powered by iTunes
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
              <Loader2 className="animate-spin mx-auto mb-4 text-purple-500" size={32} />
              <p className="text-gray-500">
                {searchQuery.trim() ? 'Searching music...' : 'Loading trending music...'}
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayContent.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No music found</h3>
            <p className="text-gray-500">Try a different artist, song, or genre</p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && displayContent.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayContent.map(renderMusicCard)}
          </div>
        )}
      </div>
    </div>
  )
}

// Separate component for handling music artwork with fallback
function MusicArtworkImage({ track }: { track: OptimalMusicResult }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isError, setIsError] = useState(false)

  // Build array of possible image sources
  const imageSources = useMemo(() => {
    const sources: string[] = []
    
    // 1. Primary image
    if (track.image) {
      sources.push(track.image)
    }
    
    // 2. Other sizes from images array
    if (track.images) {
      track.images
        .sort((a, b) => (b.height * b.width) - (a.height * a.width)) // Largest first
        .forEach(img => {
          if (img.url && img.url !== track.image) {
            sources.push(img.url)
          }
        })
    }

    return sources.filter(Boolean)
  }, [track])

  const handleImageError = () => {
    console.log('🖼️ Music artwork failed to load:', imageSources[currentImageIndex])
    
    // Try next image source
    if (currentImageIndex < imageSources.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    } else {
      // All images failed, show placeholder
      setIsError(true)
    }
  }

  const handleImageLoad = () => {
    console.log('🎵 Music artwork loaded successfully:', imageSources[currentImageIndex])
    setIsError(false)
  }

  if (isError || imageSources.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-200">
        <div className="text-center">
          <Music size={48} className="text-purple-500 mx-auto mb-2" />
          <div className="text-xs text-purple-600 font-medium px-2">
            {track.name.length > 20 ? track.name.substring(0, 20) + '...' : track.name}
          </div>
          <div className="text-xs text-purple-500 mt-1">
            {track.artist || 'Unknown Artist'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={imageSources[currentImageIndex]}
      alt={`${track.name} by ${track.artist}`}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
    />
  )
}
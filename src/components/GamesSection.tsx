'use client'
import React, { useState, useEffect } from 'react'
import { Gamepad2, Search, Loader2, Star, Calendar, Plus, Zap, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { optimalGamingAPI, type OptimalGamingResult } from '@/services/optimalGamingAPI'
import type { MediaStatus, LibraryItem } from '@/types'

interface GamesSectionProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

export default function GamesSection({
  onAddToLibrary,
  onOpenDetail,
  library
}: GamesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OptimalGamingResult[]>([])
  const [trendingContent, setTrendingContent] = useState<OptimalGamingResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  
  // Advanced filter states
  const [filters, setFilters] = useState({
    excludeNSFW: true,
    prioritizeRecent: true,
    sortBy: 'mixed' as 'relevance' | 'date' | 'rating' | 'mixed',
    boostRecentGames: true,
    showOnly2025: false,
    minYear: 2000,
    showAdvancedFilters: false
  })

  // Load trending content on mount
  useEffect(() => {
    loadTrendingContent()
  }, [])

  const loadTrendingContent = async () => {
    setIsLoadingTrending(true)
    try {
      const trending = await optimalGamingAPI.getTrending()
      setTrendingContent(trending)
      console.log('🎮 [GamesSection] Loaded trending:', trending.length, 'games')
    } catch (error) {
      console.error('🎮 [GamesSection] Failed to load trending:', error)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  const handleSearch = async (query: string, currentFilters = filters) => {
    if (query.length < 2 && !currentFilters.showOnly2025) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await optimalGamingAPI.search(query, {
        limit: 12,
        excludeNSFW: currentFilters.excludeNSFW,
        prioritizeRecent: currentFilters.prioritizeRecent,
        sortBy: currentFilters.sortBy,
        boostRecentGames: currentFilters.boostRecentGames,
        showOnly2025: currentFilters.showOnly2025,
        minYear: currentFilters.minYear
      })
      setSearchResults(results)
      console.log('🎮 [GamesSection] Enhanced search results:', results.length, 'games')
    } catch (error) {
      console.error('🎮 [GamesSection] Search failed:', error)
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
    if (searchQuery || newFilters.showOnly2025) {
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

  const renderGameCard = (game: OptimalGamingResult) => (
    <div
      key={game.id}
      className="bg-white rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onOpenDetail(game)}
    >
      {/* Game Image */}
      <div className="aspect-[16/9] bg-gray-100 rounded-t-xl overflow-hidden">
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              console.log('🖼️ Game image failed to load:', game.image)
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        
        {/* Fallback placeholder */}
        {!game.image && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <Gamepad2 size={48} className="text-gray-400" />
          </div>
        )}

        {/* Advanced Score Badge (for debugging) */}
        {(game.totalScore || game.relevanceScore) && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Zap size={10} />
            {Math.round(game.totalScore || game.relevanceScore || 0)}
          </div>
        )}

        {/* 2025 Game Badge */}
        {game.year === 2025 && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            🆕 2025
          </div>
        )}

        {/* Source Type Badge (recent vs relevant) */}
        {game.sourceType && (
          <div className={`absolute bottom-2 right-2 text-xs px-2 py-1 rounded-full font-medium ${
            game.sourceType === 'recent' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {game.sourceType === 'recent' ? '🔥 Recent' : '⭐ Quality'}
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-green-600 transition-colors">
            {game.name}
          </h3>
          
          {!isInLibrary(game.id) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToLibrary(game, 'want-to-play')
              }}
              className="flex-shrink-0 p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Add to Library"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          {/* Developer */}
          {game.developer && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {game.developer}
            </span>
          )}

          {/* Year */}
          {game.year && (
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              {game.year}
            </div>
          )}
        </div>

        {/* Rating and Metacritic */}
        <div className="flex items-center gap-3 mb-2">
          {/* Community Rating */}
          {game.rating && game.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Star size={10} className="fill-current" />
              <span>{game.rating}/5</span>
            </div>
          )}

          {/* Metacritic Score */}
          {game.metacritic && game.metacritic > 0 && (
            <div className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              game.metacritic >= 75 
                ? 'bg-green-100 text-green-700'
                : game.metacritic >= 50
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-red-100 text-red-700'
            }`}>
              {game.metacritic}
            </div>
          )}
        </div>

        {/* Genre */}
        {game.genre && (
          <div className="text-xs text-gray-500 mb-2">
            {game.genre}
          </div>
        )}

        {/* Platforms */}
        {game.platforms && game.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {game.platforms.slice(0, 3).map((platform, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {platform.platform.name}
              </span>
            ))}
            {game.platforms.length > 3 && (
              <span className="text-xs text-gray-400">
                +{game.platforms.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Debug Scores (development only) */}
        {process.env.NODE_ENV === 'development' && game.totalScore && (
          <div className="text-xs bg-gray-100 p-2 rounded mt-2 font-mono">
            <div>Total: {Math.round(game.totalScore)}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span>Title: {Math.round(game.titleScore || 0)}</span>
              <span>Quality: {Math.round(game.qualityScore || 0)}</span>
              <span>Recent: {Math.round(game.recencyScore || 0)}</span>
              <span>Pop: {Math.round(game.popularityScore || 0)}</span>
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
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Games</h2>
            <p className="text-sm text-gray-600">Powered by RAWG • Intelligent gaming search</p>
          </div>
        </div>
      </div>

      {/* Search Bar with Quick Actions */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={filters.showOnly2025 ? "Search in 2025 releases..." : "Search games... (e.g., Elden Ring, Cyberpunk, Baldur's Gate)"}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <button
            onClick={() => handleFilterChange('showOnly2025', !filters.showOnly2025)}
            className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filters.showOnly2025 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Show only 2025 games"
          >
            🆕 2025
          </button>
          
          <button
            onClick={() => handleFilterChange('showAdvancedFilters', !filters.showAdvancedFilters)}
            className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filters.showAdvancedFilters 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Advanced filters"
          >
            <Settings size={18} />
            {filters.showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {filters.showAdvancedFilters && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <select 
                  value={filters.sortBy} 
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="mixed">🎯 Balanced</option>
                  <option value="date">📅 Release Date</option>
                  <option value="rating">⭐ Quality/Rating</option>
                  <option value="relevance">🔍 Relevance</option>
                </select>
              </div>

              {/* Min Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Year
                </label>
                <select 
                  value={filters.minYear} 
                  onChange={(e) => handleFilterChange('minYear', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value={2020}>2020+</option>
                  <option value={2015}>2015+</option>
                  <option value={2010}>2010+</option>
                  <option value={2000}>2000+</option>
                  <option value={1990}>1990+</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.excludeNSFW}
                    onChange={(e) => handleFilterChange('excludeNSFW', e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Exclude NSFW content</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.prioritizeRecent}
                    onChange={(e) => handleFilterChange('prioritizeRecent', e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Prioritize recent games</span>
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.boostRecentGames}
                    onChange={(e) => handleFilterChange('boostRecentGames', e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Boost 2025 releases</span>
                </label>
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
              {filters.showOnly2025 
                ? `🆕 2025 Games (${displayContent.length})`
                : searchQuery.trim() 
                  ? `Search Results (${searchResults.length})` 
                  : 'Trending Games'
              }
            </h3>
            
            {/* Active filters indicator */}
            {(searchQuery.trim() || filters.showOnly2025) && (
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>Sort: {
                  filters.sortBy === 'mixed' ? '🎯 Balanced' :
                  filters.sortBy === 'date' ? '📅 Date' :
                  filters.sortBy === 'rating' ? '⭐ Rating' :
                  '🔍 Relevance'
                }</span>
                
                {filters.minYear > 2000 && (
                  <span>• Year: {filters.minYear}+</span>
                )}
                
                {!filters.excludeNSFW && (
                  <span>• ⚠️ NSFW included</span>
                )}
                
                {filters.boostRecentGames && (
                  <span>• 🚀 2025 boost</span>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right">
            {(searchQuery.trim() || filters.showOnly2025) && (
              <span className="text-sm text-gray-500">
                Powered by RAWG
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
              <Loader2 className="animate-spin mx-auto mb-4 text-green-500" size={32} />
              <p className="text-gray-500">
                {searchQuery.trim() ? 'Searching games...' : 'Loading trending games...'}
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayContent.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No games found</h3>
            <p className="text-gray-500">Try a different game title or genre</p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && displayContent.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayContent.map(renderGameCard)}
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { Gamepad2, Search, Loader2, Star, Calendar, Plus, Users, Clock, Award, Trophy, Zap } from 'lucide-react'
import { optimalBoardGameAPI, type OptimalBoardGameResult } from '@/services/optimalBoardGameAPI'
import type { MediaStatus, LibraryItem } from '@/types'

interface BoardGamesSectionProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

export default function BoardGamesSection({
  onAddToLibrary,
  onOpenDetail,
  library
}: BoardGamesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OptimalBoardGameResult[]>([])
  const [trendingContent, setTrendingContent] = useState<OptimalBoardGameResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  
  // Advanced filter states for board games
  const [filters, setFilters] = useState({
    sortBy: 'relevance' as 'relevance' | 'rating' | 'year' | 'rank' | 'complexity',
    minPlayers: 1,
    maxPlayers: 8,
    minPlayTime: 0,
    maxPlayTime: 300,
    complexity: 'all' as 'light' | 'medium' | 'heavy' | 'all',
    minRating: 0,
    minYear: 1990,
    showAdvancedFilters: false,
    includeExpansions: false
  })

  // Load trending content on mount
  useEffect(() => {
    loadTrendingContent()
  }, [])

  const loadTrendingContent = async () => {
    setIsLoadingTrending(true)
    try {
      const trending = await optimalBoardGameAPI.getTrending({ limit: 8 })
      setTrendingContent(trending)
      console.log('🎲 [BoardGamesSection] Loaded trending:', trending.length, 'games')
    } catch (error) {
      console.error('🎲 [BoardGamesSection] Failed to load trending:', error)
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
      const results = await optimalBoardGameAPI.search(query, {
        limit: 12,
        minPlayers: currentFilters.minPlayers,
        maxPlayers: currentFilters.maxPlayers,
        minPlayTime: currentFilters.minPlayTime > 0 ? currentFilters.minPlayTime : undefined,
        maxPlayTime: currentFilters.maxPlayTime < 300 ? currentFilters.maxPlayTime : undefined,
        complexity: currentFilters.complexity !== 'all' ? currentFilters.complexity : undefined,
        minRating: currentFilters.minRating > 0 ? currentFilters.minRating : undefined,
        minYear: currentFilters.minYear > 1990 ? currentFilters.minYear : undefined,
        sortBy: currentFilters.sortBy,
        includeExpansions: currentFilters.includeExpansions
      })
      
      setSearchResults(results)
      console.log('🎲 [BoardGamesSection] Enhanced search results:', results.length, 'games')
    } catch (error) {
      console.error('🎲 [BoardGamesSection] Search failed:', error)
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
    }, 500) // Longer delay for BGG API

    return () => clearTimeout(timer)
  }, [searchQuery, filters])

  const isInLibrary = (itemId: string) => {
    return library.some(item => item.id === itemId)
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Light': return 'bg-green-100 text-green-700'
      case 'Medium-Light': return 'bg-blue-100 text-blue-700'
      case 'Medium': return 'bg-yellow-100 text-yellow-700'
      case 'Medium-Heavy': return 'bg-orange-100 text-orange-700'
      case 'Heavy': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const renderBoardGameCard = (game: OptimalBoardGameResult) => (
    <div
      key={game.id}
      className="bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onOpenDetail(game)}
    >
      {/* Game Image */}
      <div className="aspect-square bg-gray-100 rounded-t-xl overflow-hidden relative">
        <BoardGameImage game={game} />

        {/* BGG Rank Badge */}
        {game.rank && game.rank <= 1000 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
            <Trophy size={10} />
            #{game.rank}
          </div>
        )}

        {/* Hot Game Badge */}
        {game.rank && game.rank <= 100 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
            🔥 Hot
          </div>
        )}

        {/* Complexity Badge */}
        {game.complexity && (
          <div className={`absolute bottom-2 right-2 text-xs px-2 py-1 rounded-full font-medium ${getComplexityColor(game.complexity)}`}>
            {game.complexity}
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {game.name}
          </h3>
          
          {!isInLibrary(game.id) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToLibrary(game, 'want-to-play')
              }}
              className="flex-shrink-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              title="Add to Library"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Designer */}
        {game.designers && game.designers.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
            <Users size={10} />
            <span>{game.designers.slice(0, 2).map(d => d.name).join(', ')}</span>
            {game.designers.length > 2 && <span>+{game.designers.length - 2} more</span>}
          </div>
        )}

        {/* Year and Publisher */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          {game.yearPublished && (
            <div className="flex items-center gap-1">
              <Calendar size={10} />
              {game.yearPublished}
            </div>
          )}

          {game.publishers && game.publishers.length > 0 && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium truncate max-w-[120px]">
              {game.publishers[0].name}
            </span>
          )}
        </div>

        {/* Player Count and Play Time */}
        <div className="flex items-center gap-3 mb-2">
          {game.playerCountText && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={10} />
              <span>{game.playerCountText}</span>
            </div>
          )}

          {game.playTimeText && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={10} />
              <span>{game.playTimeText}</span>
            </div>
          )}
        </div>

        {/* Rating and Stats */}
        <div className="flex items-center gap-3 mb-2">
          {game.rating && game.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Star size={10} className="fill-current" />
              <span>{game.rating.toFixed(1)}/5</span>
            </div>
          )}

          {game.bggRating && game.bggRating > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Award size={10} />
              <span>{game.bggRating.toFixed(1)}/10</span>
            </div>
          )}

          {game.ratingsCount && game.ratingsCount > 0 && (
            <div className="text-xs text-gray-500">
              {game.ratingsCount.toLocaleString()} ratings
            </div>
          )}
        </div>

        {/* Categories */}
        {game.categories && game.categories.length > 0 && (
          <div className="text-xs text-gray-500 mb-2">
            {game.categories.slice(0, 2).map(c => c.name).join(', ')}
            {game.categories.length > 2 && '...'}
          </div>
        )}

        {/* Mechanics */}
        {game.mechanics && game.mechanics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {game.mechanics.slice(0, 2).map((mechanic, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded truncate max-w-[100px]"
              >
                {mechanic.name}
              </span>
            ))}
            {game.mechanics.length > 2 && (
              <span className="text-xs text-gray-400">
                +{game.mechanics.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Age Rating */}
        {game.ageText && (
          <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full inline-block">
            Ages {game.ageText}
          </div>
        )}

        {/* Debug Scores (development only) */}
        {process.env.NODE_ENV === 'development' && game.totalScore && (
          <div className="text-xs bg-gray-100 p-2 rounded mt-2 font-mono">
            <div>Total: {Math.round(game.totalScore)}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span>Title: {Math.round(game.titleScore || 0)}</span>
              <span>Quality: {Math.round(game.qualityScore || 0)}</span>
              <span>Popular: {Math.round(game.popularityScore || 0)}</span>
              <span>BGG Rank: {game.rank || 'N/A'}</span>
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
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Board Games</h2>
            <p className="text-sm text-gray-600">Powered by BoardGameGeek • Comprehensive board game database</p>
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
              placeholder="Search board games... (e.g., Wingspan, Gloomhaven, Catan)"
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-gray-400" size={20} />
              </div>
            )}
          </div>
          
          {/* Quick Sort Options */}
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="relevance">Relevance</option>
            <option value="rating">Rating</option>
            <option value="rank">BGG Rank</option>
            <option value="year">Year</option>
            <option value="complexity">Complexity</option>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Player Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Player Count
                </label>
                <div className="flex gap-2">
                  <select 
                    value={filters.minPlayers} 
                    onChange={(e) => handleFilterChange('minPlayers', parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n}+</option>
                    ))}
                  </select>
                  <span className="self-center text-gray-500">to</span>
                  <select 
                    value={filters.maxPlayers} 
                    onChange={(e) => handleFilterChange('maxPlayers', parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {[2,3,4,5,6,7,8,10,12].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Play Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Play Time (minutes)
                </label>
                <div className="flex gap-2">
                  <select 
                    value={filters.minPlayTime} 
                    onChange={(e) => handleFilterChange('minPlayTime', parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>Any</option>
                    <option value={15}>15+</option>
                    <option value={30}>30+</option>
                    <option value={60}>60+</option>
                    <option value={90}>90+</option>
                    <option value={120}>120+</option>
                  </select>
                  <span className="self-center text-gray-500">to</span>
                  <select 
                    value={filters.maxPlayTime} 
                    onChange={(e) => handleFilterChange('maxPlayTime', parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={300}>Any</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                    <option value={120}>120</option>
                    <option value={180}>180</option>
                  </select>
                </div>
              </div>

              {/* Complexity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complexity
                </label>
                <select 
                  value={filters.complexity} 
                  onChange={(e) => handleFilterChange('complexity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Levels</option>
                  <option value="light">Light (1-2)</option>
                  <option value="medium">Medium (2-4)</option>
                  <option value="heavy">Heavy (4+)</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>Any Rating</option>
                  <option value={3.0}>3+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                  <option value={4.0}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1990}>Any Year</option>
                  <option value={2020}>2020+</option>
                  <option value={2015}>2015+</option>
                  <option value={2010}>2010+</option>
                  <option value={2000}>2000+</option>
                </select>
              </div>

              {/* Include Expansions */}
              <div className="flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.includeExpansions}
                    onChange={(e) => handleFilterChange('includeExpansions', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Include expansions</span>
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
              {searchQuery.trim() 
                ? `Search Results (${searchResults.length})` 
                : 'Trending Board Games'
              }
            </h3>
            
            {/* Active filters indicator */}
            {searchQuery.trim() && (
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>Sort: {
                  filters.sortBy === 'relevance' ? '🎯 Relevance' :
                  filters.sortBy === 'rating' ? '⭐ Rating' :
                  filters.sortBy === 'rank' ? '🏆 Rank' :
                  filters.sortBy === 'year' ? '📅 Year' :
                  '🧩 Complexity'
                }</span>
                
                {(filters.minPlayers > 1 || filters.maxPlayers < 8) && (
                  <span>• Players: {filters.minPlayers}-{filters.maxPlayers}</span>
                )}
                
                {filters.complexity !== 'all' && (
                  <span>• {filters.complexity} complexity</span>
                )}
                
                {filters.minRating > 0 && (
                  <span>• {filters.minRating}+ rating</span>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right">
            {(searchQuery.trim()) && (
              <span className="text-sm text-gray-500">
                Powered by BoardGameGeek
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
              <Loader2 className="animate-spin mx-auto mb-4 text-indigo-500" size={32} />
              <p className="text-gray-500">
                {searchQuery.trim() ? 'Searching board games...' : 'Loading trending games...'}
              </p>
              {searchQuery.trim() && (
                <p className="text-xs text-gray-400 mt-1">
                  This may take a few seconds due to BGG rate limits
                </p>
              )}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayContent.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No board games found</h3>
            <p className="text-gray-500">Try a different game title, designer, or category</p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && displayContent.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayContent.map(renderBoardGameCard)}
          </div>
        )}
      </div>
    </div>
  )
}

// Separate component for handling board game images with fallback
function BoardGameImage({ game }: { game: OptimalBoardGameResult }) {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    console.log('🖼️ Board game image failed to load:', game.image)
    setImageError(true)
  }

  const handleImageLoad = () => {
    console.log('🎲 Board game image loaded successfully:', game.image)
    setImageError(false)
  }

  if (imageError || !game.image) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-200">
        <div className="text-center p-4">
          <Gamepad2 size={48} className="text-indigo-500 mx-auto mb-2" />
          <div className="text-xs text-indigo-600 font-medium">
            {game.name.length > 25 ? game.name.substring(0, 25) + '...' : game.name}
          </div>
          <div className="text-xs text-indigo-500 mt-1">
            {game.yearPublished || 'Board Game'}
          </div>
          {game.designers && game.designers.length > 0 && (
            <div className="text-xs text-indigo-400 mt-1">
              by {game.designers[0].name}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <img
      src={game.image}
      alt={`${game.name} board game`}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
    />
  )
}
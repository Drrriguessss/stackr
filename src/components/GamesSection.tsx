'use client'
import React, { useState, useEffect } from 'react'
import { Gamepad2, Search, Loader2, Star, Calendar, Plus, Zap } from 'lucide-react'
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

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await optimalGamingAPI.search(query, { limit: 12 })
      setSearchResults(results)
      console.log('🎮 [GamesSection] Search results:', results.length, 'games')
    } catch (error) {
      console.error('🎮 [GamesSection] Search failed:', error)
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

        {/* Relevance Score Badge (for debugging) */}
        {game.relevanceScore && game.relevanceScore > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Zap size={10} />
            {Math.round(game.relevanceScore)}
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
          <div className="flex flex-wrap gap-1">
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search games... (e.g., Elden Ring, Cyberpunk, Baldur's Gate)"
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
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
              : 'Trending Games'
            }
          </h3>
          
          {searchQuery.trim() && (
            <span className="text-sm text-gray-500">
              Powered by RAWG
            </span>
          )}
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
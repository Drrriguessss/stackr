'use client'
import React, { useState, useEffect } from 'react'
import { Gamepad2, Search, Loader2, Star, Calendar, Plus, Zap, RefreshCw } from 'lucide-react'
import { optimalGamingAPIV2, type OptimalGamingV2Result } from '@/services/optimalGamingAPIV2'
import type { MediaStatus, LibraryItem } from '@/types'

interface GamesV2SectionProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

export default function GamesV2Section({
  onAddToLibrary,
  onOpenDetail,
  library
}: GamesV2SectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OptimalGamingV2Result[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [trendingGames, setTrendingGames] = useState<OptimalGamingV2Result[]>([])
  const [loadingTrending, setLoadingTrending] = useState(false)
  const [apiCalls, setApiCalls] = useState(0)

  // Load trending on mount
  useEffect(() => {
    loadTrendingGames()
  }, [])

  const loadTrendingGames = async () => {
    setLoadingTrending(true)
    try {
      const trending = await optimalGamingAPIV2.getTrending(8)
      setTrendingGames(trending)
      setApiCalls(prev => prev + 1) // Track API calls
      console.log('🎮 [V2] Loaded trending with 1 API call')
    } catch (error) {
      console.error('🎮 [V2] Failed to load trending:', error)
    } finally {
      setLoadingTrending(false)
    }
  }

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await optimalGamingAPIV2.search(query, { limit: 12 })
      setSearchResults(results)
      setApiCalls(prev => prev + 1) // Track API calls
      console.log('🎮 [V2] Search completed with 1 API call')
    } catch (error) {
      console.error('🎮 [V2] Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search with longer delay to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 800) // Increased from 300ms to 800ms

    return () => clearTimeout(timer)
  }, [searchQuery])

  const isInLibrary = (itemId: string) => {
    return library.some(item => item.id === itemId)
  }

  const clearCache = () => {
    optimalGamingAPIV2.clearCache()
    setApiCalls(0)
    console.log('🎮 [V2] Cache cleared')
  }

  const displayContent = searchQuery.trim() ? searchResults : trendingGames
  const isLoading = searchQuery.trim() ? isSearching : loadingTrending

  const renderGameCard = (game: OptimalGamingV2Result) => (
    <div
      key={game.id}
      className="bg-white rounded-xl border border-gray-100 hover:border-pink-200 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onOpenDetail(game)}
    >
      {/* Game Image */}
      <div className="aspect-[16/9] bg-gray-100 rounded-t-xl overflow-hidden">
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-200">
            <Gamepad2 size={48} className="text-pink-500" />
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-pink-600 transition-colors">
            {game.name}
          </h3>
          
          {!isInLibrary(game.id) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToLibrary(game, 'want-to-play')
              }}
              className="flex-shrink-0 p-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
              title="Add to Library"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Developer */}
        {game.developer && (
          <p className="text-xs text-gray-500 mb-2">{game.developer}</p>
        )}

        {/* Year and Rating */}
        <div className="flex items-center gap-3">
          {game.released && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={10} />
              {new Date(game.released).getFullYear()}
            </div>
          )}

          {game.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-500">
              <Star size={10} className="fill-current" />
              {game.rating.toFixed(1)}
            </div>
          )}

          {game.metacritic && (
            <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              {game.metacritic}
            </div>
          )}
        </div>

        {/* Relevance Score (dev mode only) */}
        {process.env.NODE_ENV === 'development' && game.relevanceScore && (
          <div className="text-xs text-gray-400 mt-1">
            Score: {game.relevanceScore}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full">
      {/* Header with Pink Gradient matching Games button */}
      <div 
        className="text-white p-6 rounded-t-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, rgba(240, 147, 251, 0.4), rgba(245, 87, 108, 0.3), rgba(219, 39, 119, 0.2), rgba(15, 14, 23, 0.7))'
        }}
      >
        {/* Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3C/defs%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Gamepad2 size={32} />
              <div>
                <h2 className="text-2xl font-bold">Games V2</h2>
                <p className="text-pink-100 text-sm">Optimized API - 1 request per search</p>
              </div>
            </div>
            
            {/* API Call Counter */}
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                API Calls: {apiCalls}
              </div>
              <button
                onClick={clearCache}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Clear Cache"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-600" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games with V2 optimized API..."
              className="w-full pl-12 pr-12 py-3 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-white focus:outline-none"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-pink-600" size={20} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 p-6 rounded-b-xl">
        {!searchQuery.trim() && (
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Trending Games (Cached for 15 min)
          </h3>
        )}

        {searchQuery.trim() && !isLoading && (
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Search Results ({searchResults.length})
          </h3>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-4 text-pink-500" size={32} />
              <p className="text-gray-500">Loading games...</p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && displayContent.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayContent.map(renderGameCard)}
          </div>
        )}

        {/* No Results */}
        {!isLoading && searchQuery.trim() && displayContent.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No games found</h3>
            <p className="text-gray-500">Try a different search term</p>
          </div>
        )}

        {/* Cache Info */}
        <div className="mt-8 p-4 bg-pink-50 rounded-lg">
          <div className="flex items-center gap-2 text-pink-700">
            <Zap size={16} />
            <span className="text-sm font-medium">Performance Info</span>
          </div>
          <ul className="mt-2 text-xs text-pink-600 space-y-1">
            <li>• Each search uses only 1 RAWG API request</li>
            <li>• Results are cached for 15 minutes</li>
            <li>• Trending games cached separately</li>
            <li>• Total API calls this session: {apiCalls}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Star, Calendar, ExternalLink, Loader2, Gamepad2, Clock, TrendingUp, Award, Users } from 'lucide-react'
import { advancedRAWGService } from '@/services/advancedRAWGService'
import type { SearchResult } from '@/types'

interface GameSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: SearchResult) => void
  onOpenDetail: (item: SearchResult) => void
  onBackToSelection: () => void
}

export default function GameSearchModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail,
  onBackToSelection
}: GameSearchModalProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // ✅ RECHERCHE GAMING AVANCÉE avec toutes les optimisations professionnelles
  const performGameSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const startTime = Date.now()
    
    try {
      console.log('🎮 [AdvancedGameSearch] === PROFESSIONAL GAMING SEARCH ===')
      console.log('🎮 [AdvancedGameSearch] Query:', `"${searchQuery}"`)
      
      // ✅ RECHERCHE ADAPTIVE - Essaye d'abord optimisé, puis fallback
      let advancedResults = await advancedRAWGService.optimizedGameSearch(searchQuery, {
        minMetacritic: 50,          // ✅ RÉDUIT: 50 au lieu de 60 pour inclure plus de jeux indies
        excludeAdditions: true,     // Exclure DLC et add-ons
        excludeFanMade: true,       // Exclure contenu amateur
        maxResults: 20,             // Top 20 résultats
        sortBy: 'relevance'         // Tri par pertinence intelligente
      })
      
      // ✅ FALLBACK: Si aucun résultat, essaie sans filtres Metacritic
      if (advancedResults.length === 0) {
        console.log('🎮 [GameSearch] No results with Metacritic filter, trying fallback...')
        advancedResults = await advancedRAWGService.optimizedGameSearch(searchQuery, {
          minMetacritic: 0,         // ✅ SANS FILTRE Metacritic pour trouver les jeux indies
          excludeAdditions: true,   
          excludeFanMade: false,    // ✅ Plus permissif pour contenu amateur
          maxResults: 20,
          sortBy: 'relevance'
        })
      }

      setSearchResults(advancedResults)
      setSearchTime(Date.now() - startTime)
      
      console.log('🎮 [AdvancedGameSearch] Professional results:', {
        query: searchQuery,
        totalResults: advancedResults.length,
        responseTime: Date.now() - startTime,
        topGames: advancedResults.slice(0, 5).map(g => `"${g.title}" (${g.rating}/10 | ${g.year || 'N/A'})`),
        qualityMetrics: {
          avgRating: advancedResults.length > 0 
            ? (advancedResults.reduce((sum, g) => sum + (g.rating || 0), 0) / advancedResults.length).toFixed(1)
            : 'N/A',
          withMetacritic: advancedResults.filter(g => g.metadata?.metacritic).length,
          recentGames: advancedResults.filter(g => g.year && g.year >= 2020).length
        }
      })
      
    } catch (error) {
      console.error('🎮 [AdvancedGameSearch] Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // ✅ NOTE: Filtres de qualité maintenant gérés par advancedRAWGService
  // Le service avancé inclut déjà tous les filtres professionnels

  // ✅ DEBOUNCING GAMING-OPTIMIZED - Plus rapide pour l'expérience gaming
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setQuery(newQuery)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (newQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    
    // ✅ DEBOUNCING ULTRA-OPTIMISÉ POUR GAMING (plus rapide que cinéma)
    const debounceTime = newQuery.length <= 2 ? 250 : newQuery.length <= 4 ? 150 : 100

    searchTimeoutRef.current = setTimeout(() => {
      performGameSearch(newQuery)
    }, debounceTime)
  }, [performGameSearch])

  const handleClose = () => {
    setQuery('')
    setSearchResults([])
    setIsSearching(false)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        
        <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Gaming Theme */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={onBackToSelection}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Gamepad2 size={24} />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70" size={20} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder="Search for games... (e.g., Cyberpunk, Zelda, Minecraft)"
                    className="w-full pl-12 pr-12 py-3 text-lg bg-white/10 border border-white/20 rounded-xl 
                             text-white placeholder-white/70 focus:bg-white/20 focus:border-white/40 
                             focus:outline-none transition-all"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="animate-spin text-white/70" size={20} />
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search Stats */}
            {searchResults.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-white/80">
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  <span>{searchResults.length} games found</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{searchTime}ms</span>
                </div>
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                  🎮 Gaming Optimized
                </span>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
            {query.length < 2 ? (
              <div className="p-8 text-center">
                <Gamepad2 size={48} className="mx-auto mb-4 text-green-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🎮 Game Search
                </h3>
                <p className="text-gray-500 mb-4">
                  Specialized search for video games with enhanced filtering and relevance
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    PC Games
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    Console Games
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    Indie Games
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    AAA Titles
                  </span>
                </div>
              </div>
            ) : isSearching ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-4 text-green-500" size={48} />
                <p className="text-gray-500">Searching games database...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center">
                <Search size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No games found</h3>
                <p className="text-gray-500">Try a different game title or keyword</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid gap-3">
                  {searchResults.map((game, index) => (
                    <div
                      key={`game-${game.id}-${index}`}
                      className="flex items-center gap-4 p-4 hover:bg-green-50 rounded-xl border border-gray-100 
                               hover:border-green-200 transition-all cursor-pointer group"
                      onClick={() => onOpenDetail(game)}
                    >
                      {/* Game Cover */}
                      <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {game.image ? (
                          <img
                            src={game.image}
                            alt={game.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🎮
                          </div>
                        )}
                      </div>

                      {/* Game Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-green-600 transition-colors">
                              {game.title}
                            </h3>
                            
                            {game.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {game.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {/* Year */}
                              {game.year && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar size={12} />
                                  {game.year}
                                </div>
                              )}

                              {/* Rating */}
                              {game.rating && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Star size={12} className="text-yellow-400 fill-current" />
                                  {game.rating}/10
                                </div>
                              )}

                              {/* ✅ NOUVEAU: Metacritic Score */}
                              {game.metadata?.metacritic && (
                                <div className="flex items-center gap-1 text-sm text-orange-600">
                                  <Award size={12} />
                                  {game.metadata.metacritic}
                                </div>
                              )}

                              {/* ✅ NOUVEAU: Platforms */}
                              {game.metadata?.platforms && game.metadata.platforms.length > 0 && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Users size={12} />
                                  {game.metadata.platforms.slice(0, 2).join(', ')}
                                  {game.metadata.platforms.length > 2 && ` +${game.metadata.platforms.length - 2}`}
                                </div>
                              )}

                              {/* External Link */}
                              {game.externalUrl && (
                                <a
                                  href={game.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                                >
                                  <ExternalLink size={12} />
                                  RAWG
                                </a>
                              )}
                            </div>

                            {/* ✅ NOUVEAU: Quality Indicators */}
                            {(game.metadata?.qualityScore || game.metadata?.relevanceScore) && (
                              <div className="flex items-center gap-2 mt-1">
                                {game.metadata.qualityScore && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    Quality: {Math.round(game.metadata.qualityScore)}%
                                  </span>
                                )}
                                {game.metadata.relevanceScore && game.metadata.relevanceScore > 500 && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    ⭐ Top Match
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Add to Library Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddToLibrary(game)
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                                     transition-colors text-sm font-medium flex-shrink-0"
                          >
                            Add to Library
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
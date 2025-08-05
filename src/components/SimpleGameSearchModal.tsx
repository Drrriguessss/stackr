'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Calendar, Loader2, Gamepad2, Clock } from 'lucide-react'
import { rawgService } from '@/services/rawgService'
import type { SearchResult } from '@/types'

interface SimpleGameSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: SearchResult) => void
  onOpenDetail: (item: SearchResult) => void
}

export default function SimpleGameSearchModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail
}: SimpleGameSearchModalProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Focus input when modal opens and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll on mobile
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      
      if (inputRef.current) {
        // Small delay to ensure modal is rendered
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  // Simple game search - just use RAWG service directly
  const performGameSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const startTime = Date.now()
    
    try {
      console.log('🎮 [SimpleGameSearch] Searching for:', `"${searchQuery}"`)
      
      // Use RAWG service directly with high limit for franchise searches
      const queryLower = searchQuery.toLowerCase().trim()
      
      // Detect major franchise searches
      const isFranchiseSearch = (
        (queryLower.includes('assassin') && queryLower.includes('creed')) ||
        (queryLower.includes('call of duty') || queryLower.includes('call') && queryLower.includes('duty')) ||
        (queryLower.includes('spider') && queryLower.includes('man')) ||
        (queryLower.includes('elder') && queryLower.includes('scrolls')) ||
        (queryLower.includes('grand theft') || queryLower.includes('gta')) ||
        (queryLower.includes('final fantasy')) ||
        (queryLower.includes('mortal kombat')) ||
        (queryLower.includes('street fighter')) ||
        (queryLower.includes('resident evil')) ||
        (queryLower.includes('tomb raider')) ||
        (queryLower.includes('far cry')) ||
        (queryLower.includes('watch dogs')) ||
        (queryLower.includes('need for speed')) ||
        (queryLower.includes('battlefield')) ||
        (queryLower.includes('fifa')) ||
        (queryLower.includes('the witcher')) ||
        (queryLower.includes('fallout')) ||
        (queryLower.includes('elder scrolls')) ||
        (queryLower.includes('doom')) ||
        (queryLower.includes('halo')) ||
        (queryLower.includes('god of war')) ||
        (queryLower.includes('uncharted')) ||
        (queryLower.includes('the last of us'))
      )
      
      const searchLimit = isFranchiseSearch ? 40 : 20
      
      const rawgGames = await rawgService.searchGames(searchQuery, searchLimit)
      
      // Convert to SearchResult format
      let gameResults = rawgGames
        .filter(game => game && game.name && game.background_image)
        .map(game => ({
          id: game.id.toString(),
          title: game.name,
          description: '',
          image: game.background_image,
          year: game.released ? new Date(game.released).getFullYear() : undefined,
          rating: game.rating ? Math.min(10, game.rating * 2) : undefined,
          category: 'games' as const,
          externalUrl: `https://rawg.io/games/${game.id}`,
          metadata: {
            metacritic: game.metacritic,
            platforms: game.platforms?.map(p => p.platform.name).slice(0, 3),
            developers: game.developers?.map(d => d.name),
            genres: game.genres?.map(g => g.name)
          }
        }))

      // Special sorting for franchise searches: base game first, then newest first
      if (isFranchiseSearch) {
        gameResults = gameResults.sort((a, b) => {
          const titleA = a.title.toLowerCase()
          const titleB = b.title.toLowerCase()
          
          // Helper function to check if a title is the "base" franchise game
          const isBaseGame = (title: string, query: string) => {
            const cleanQuery = query.replace(/['']/g, "'")
            const cleanTitle = title.replace(/['']/g, "'")
            
            // Exact matches or very close matches
            if (cleanTitle === cleanQuery) return true
            
            // Special cases for different franchises
            if (queryLower.includes('call') && queryLower.includes('duty')) {
              return title === 'call of duty' || title === "call of duty®" || 
                     (title.includes('call of duty') && !title.includes(':') && 
                      !title.includes('modern warfare') && !title.includes('black ops') && 
                      !title.includes('advanced warfare') && !title.includes('infinite warfare') &&
                      !title.includes('wwii') && !title.includes('vanguard'))
            }
            
            if (queryLower.includes('spider')) {
              return title === 'spider-man' || title === 'marvel\'s spider-man' ||
                     (title.includes('spider-man') && !title.includes(':') && 
                      !title.includes('miles morales') && !title.includes('web of'))
            }
            
            if (queryLower.includes('assassin')) {
              return title === "assassin's creed" || 
                     (title.includes("assassin's creed") && !title.includes(':') &&
                      !title.includes('origins') && !title.includes('odyssey') && 
                      !title.includes('valhalla') && !title.includes('unity') &&
                      !title.includes('syndicate') && !title.includes('mirage'))
            }
            
            if (queryLower.includes('elder scrolls')) {
              return title === 'the elder scrolls' || title.includes('elder scrolls online')
            }
            
            if (queryLower.includes('grand theft') || queryLower.includes('gta')) {
              return title === 'grand theft auto' || title.includes('gta online')
            }
            
            // Generic franchise detection
            return cleanTitle === cleanQuery || 
                   (cleanTitle.includes(cleanQuery) && !cleanTitle.includes(':') && 
                    cleanTitle.split(' ').length <= cleanQuery.split(' ').length + 1)
          }
          
          const aIsBase = isBaseGame(titleA, queryLower)
          const bIsBase = isBaseGame(titleB, queryLower)
          
          // Base games always come first
          if (aIsBase && !bIsBase) return -1
          if (bIsBase && !aIsBase) return 1
          
          // For non-base games, sort by year descending (newest first)
          const yearA = a.year || 0
          const yearB = b.year || 0
          
          if (yearA !== yearB) {
            return yearB - yearA
          }
          
          // If same year, alphabetical
          return a.title.localeCompare(b.title)
        })
        
        console.log('🎮 [Franchise Search] Sorted results:', gameResults.slice(0, 5).map(g => `${g.title} (${g.year})`).join(', '))
      }

      setSearchResults(gameResults)
      setSearchTime(Date.now() - startTime)
      
      console.log('🎮 [SimpleGameSearch] Found', gameResults.length, 'games')
      console.log('🎮 [SimpleGameSearch] Top 5:', gameResults.slice(0, 5).map(g => g.title))
      
    } catch (error) {
      console.error('🎮 [SimpleGameSearch] Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Handle input changes with debouncing
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
    
    // Simple debouncing
    searchTimeoutRef.current = setTimeout(() => {
      performGameSearch(newQuery)
    }, 300)
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        
        <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden z-[10000]" style={{ zIndex: 10000 }}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
            <div className="flex items-center gap-4 mb-3">
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
                    placeholder="Search for games... (e.g., Spider-Man, Minami Lane, Cyberpunk)"
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
                  <Gamepad2 size={14} />
                  <span>{searchResults.length} games found</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{searchTime}ms</span>
                </div>
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                  🎮 Simple Search
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
                  🎮 Simple Game Search
                </h3>
                <p className="text-gray-500 mb-4">
                  Direct search without complex filters - find any game easily
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    All Games
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    Indie & AAA
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    Any Platform
                  </span>
                </div>
              </div>
            ) : isSearching ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin mx-auto mb-4 text-green-500" size={48} />
                <p className="text-gray-500">Searching games...</p>
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
                      onClick={() => {
                        onOpenDetail(game)
                        handleClose() // Close search modal when opening game detail
                      }}
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

                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {/* DLC/Expansion Badge */}
                              {(() => {
                                const title = game.title.toLowerCase()
                                const isDLC = title.includes('dlc') || 
                                             title.includes('expansion') ||
                                             title.includes('season pass') ||
                                             (title.includes(': ') && (
                                               title.includes('claws of') ||
                                               title.includes('legacy of') ||
                                               title.includes('the fate of') ||
                                               title.includes('curse of') ||
                                               title.includes('dawn of') ||
                                               title.includes('wrath of')
                                             ))
                                
                                return isDLC && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200 font-medium">
                                    DLC
                                  </span>
                                )
                              })()}
                              
                              {/* Genres - displayed as first sentence */}
                              {game.metadata?.genres && game.metadata.genres.length > 0 && (
                                <div className="text-sm text-gray-600">
                                  {game.metadata.genres.slice(0, 3).join(', ')}
                                </div>
                              )}

                              {/* Year */}
                              {game.year && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar size={12} />
                                  {game.year}
                                </div>
                              )}
                            </div>
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
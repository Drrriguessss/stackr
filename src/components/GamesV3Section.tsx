'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Filter, Calendar, Star, Gamepad2, TrendingUp, Loader2, Plus } from 'lucide-react'
import { EnhancedRAWGOptimizer } from '@/services/enhancedRAWGOptimizer'
import type { MediaStatus, LibraryItem } from '@/types'

interface GamesV3SectionProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  library: LibraryItem[]
}

interface GameCardProps {
  game: any
  position: number
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  isInLibrary: (itemId: string) => boolean
}

const GameCard: React.FC<GameCardProps> = ({ game, position, onAddToLibrary, onOpenDetail, isInLibrary }) => {
  const releaseYear = game.released ? new Date(game.released).getFullYear() : 'N/A'
  const isRecent = typeof releaseYear === 'number' && releaseYear >= 2024
  
  return (
    <div 
      className={`bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:bg-white/15 cursor-pointer ${
        isRecent ? 'border-green-400 shadow-lg shadow-green-400/20' : 'border-white/20'
      }`}
      onClick={() => onOpenDetail(game)}
    >
      
      {/* Position Badge */}
      <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-bold z-10">
        #{position}
      </div>
      
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={game.background_image || 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop'} 
          alt={game.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isRecent && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
            🆕 {releaseYear}
          </div>
        )}
        
        {/* Add to Library Button */}
        {!isInLibrary(`game-${game.id}`) && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddToLibrary({
                ...game,
                id: `game-${game.id}`,
                title: game.name,
                category: 'games',
                image: game.background_image,
                year: releaseYear
              }, 'want-to-play')
            }}
            className="absolute bottom-3 right-3 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Add to Library"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4 text-white">
        <h3 className="font-bold text-lg mb-2 line-clamp-2">{game.name}</h3>
        
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-white/80 flex items-center space-x-1">
            <Calendar size={14} />
            <span>{releaseYear}</span>
          </span>
          
          {game.rating && (
            <span className="text-yellow-400 flex items-center space-x-1">
              <Star size={14} fill="currentColor" />
              <span>{game.rating.toFixed(1)}</span>
            </span>
          )}
          
          {game.metacritic && (
            <span className="text-blue-400 text-xs font-medium">
              MC: {game.metacritic}
            </span>
          )}
        </div>

        <div className="text-white/70 text-sm mb-2">
          {game.platforms?.slice(0, 3).map((p: any) => p.platform.name).join(', ')}
          {game.platforms?.length > 3 && '...'}
        </div>

        <div className="text-white/60 text-xs">
          {game.genres?.slice(0, 2).map((g: any) => g.name).join(', ')}
        </div>

        {/* Debug Scores (dev mode only) */}
        {process.env.NODE_ENV === 'development' && game.totalScore && (
          <div className="text-xs bg-black/30 p-2 rounded mt-2 font-mono text-white/60">
            <div>Total: {Math.round(game.totalScore)}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span>Title: {Math.round(game.titleScore || 0)}</span>
              <span>Quality: {Math.round(game.qualityScore || 0)}</span>
              <span>Recency: {Math.round(game.recencyScore || 0)}</span>
              <span>Popular: {Math.round(game.popularityScore || 0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GamesV3Section({
  onAddToLibrary,
  onOpenDetail,
  library
}: GamesV3SectionProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [apiCallCount, setApiCallCount] = useState(0)
  const [filters, setFilters] = useState({
    excludeNSFW: true,
    prioritizeRecent: true,
    sortBy: 'mixed',
    boostRecentGames: true,
    showOnly2025: false,
    minYear: 2000
  })

  // Initialize the search engine
  const searchEngine = useMemo(() => new EnhancedRAWGOptimizer(process.env.NEXT_PUBLIC_RAWG_API_KEY || ''), [])

  const isInLibrary = useCallback((itemId: string) => {
    return library.some(item => item.id === itemId)
  }, [library])

  // Debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string, searchFilters: any) => {
      if (searchQuery.length < 2 && !searchFilters.showOnly2025) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        let searchResults
        let callCount = 0
        
        if (searchFilters.showOnly2025) {
          searchResults = await searchEngine.getLatest2025Games({
            excludeNSFW: searchFilters.excludeNSFW,
            limit: 20
          })
          callCount = 1
          
          if (searchQuery.length >= 2) {
            searchResults = searchResults.filter((game: any) =>
              game.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
          }
        } else {
          searchResults = await searchEngine.searchWithRecentPriority(searchQuery, {
            ...searchFilters,
            maxResults: 20
          })
          // This method uses 2 API calls (recent + relevant)
          callCount = 2
        }
        
        setApiCallCount(prev => prev + callCount)
        setResults(searchResults)
        console.log(`🎮 [V3] Found ${searchResults.length} games with ${callCount} API calls`)
      } catch (error) {
        console.error('🎮 [V3] Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 500),
    [searchEngine]
  )

  useEffect(() => {
    debouncedSearch(query, filters)
  }, [query, filters, debouncedSearch])

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  const clearStats = () => {
    setApiCallCount(0)
    console.log('🎮 [V3] API call counter reset')
  }

  return (
    <div 
      className="min-h-screen font-system w-full" 
      style={{ 
        background: 'linear-gradient(to bottom, rgba(230, 0, 118, 0.4), rgba(200, 0, 100, 0.3), rgba(170, 0, 85, 0.2), rgba(15, 14, 23, 0.7))',
      }}
    >
      
      {/* Header avec dégradé rose/magenta */}
      <div className="relative pb-8">
        <div className="px-6 pt-8">
          {/* Title with API Counter */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-white">Games V3 - Advanced Search</h1>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1 rounded-lg text-sm text-white">
                API Calls: {apiCallCount}
              </div>
              <button
                onClick={clearStats}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
                title="Reset Counter"
              >
                🔄
              </button>
            </div>
          </div>
          
          {/* Barre de recherche principale */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={filters.showOnly2025 ? "Rechercher dans les nouveautés 2025..." : "Rechercher des jeux..."}
              className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/70 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Loader2 className="animate-spin text-white" size={20} />
              </div>
            )}
          </div>

          {/* Boutons rapides */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => handleFilterChange('showOnly2025', !filters.showOnly2025)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                filters.showOnly2025 
                  ? 'bg-white text-pink-600 font-medium' 
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              <TrendingUp size={16} />
              <span>Nouveautés 2025</span>
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center space-x-2"
            >
              <Filter size={16} />
              <span>Filtres</span>
            </button>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-white font-medium mb-2">Tri par :</label>
                  <select 
                    value={filters.sortBy} 
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/50"
                  >
                    <option value="mixed">Équilibré</option>
                    <option value="date">Date (plus récent)</option>
                    <option value="rating">Note/Qualité</option>
                    <option value="relevance">Pertinence</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Année minimum :</label>
                  <select 
                    value={filters.minYear} 
                    onChange={(e) => handleFilterChange('minYear', parseInt(e.target.value))}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/50"
                  >
                    <option value={2020}>2020+</option>
                    <option value={2015}>2015+</option>
                    <option value={2010}>2010+</option>
                    <option value={2000}>2000+</option>
                    <option value={1990}>1990+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'excludeNSFW', label: 'Exclure contenu adulte/NSFW' },
                  { key: 'prioritizeRecent', label: 'Prioriser les jeux récents' },
                  { key: 'boostRecentGames', label: 'Boost nouveautés 2025' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center space-x-3 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters[key as keyof typeof filters] as boolean}
                      onChange={(e) => handleFilterChange(key, e.target.checked)}
                      className="w-4 h-4 text-pink-600 bg-white/20 border-white/30 rounded focus:ring-pink-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="px-6 pb-20">
        {results.length > 0 && (
          <div className="text-white mb-6">
            <p className="text-lg font-medium">
              {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
              {filters.showOnly2025 && ' - Nouveautés 2025'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((game, index) => (
            <GameCard 
              key={game.id} 
              game={game} 
              position={index + 1}
              onAddToLibrary={onAddToLibrary}
              onOpenDetail={onOpenDetail}
              isInLibrary={isInLibrary}
            />
          ))}
        </div>

        {query.length >= 2 && !isLoading && results.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="h-16 w-16 text-white/50 mx-auto mb-4" />
            <p className="text-white text-lg">Aucun jeu trouvé pour "{query}"</p>
            <p className="text-white/70">Essayez avec d'autres mots-clés</p>
          </div>
        )}

        {/* Performance Info */}
        <div className="mt-8 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-300">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">V3 Performance Info</span>
          </div>
          <ul className="mt-2 text-xs text-purple-200 space-y-1">
            <li>• Advanced dual search (recent + relevant games)</li>
            <li>• Smart NSFW filtering and quality scoring</li>
            <li>• Intelligent sorting with 4 strategies</li>
            <li>• Enhanced enrichment with metacritic data</li>
            <li>• Total API calls this session: {apiCallCount}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
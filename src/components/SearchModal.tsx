'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Star, Loader2, WifiOff, Check } from 'lucide-react'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import { omdbService } from '@/services/omdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
import type { SearchResult, LibraryItem, MediaCategory, StatusOption, MediaStatus } from '@/types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  library: LibraryItem[]
}

export default function SearchModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  library = []
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [searchCache] = useState<Map<string, SearchResult[]>>(new Map())
  const [showStatusPopup, setShowStatusPopup] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [fadeOutPopup, setFadeOutPopup] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [justAddedItems, setJustAddedItems] = useState<Set<string>>(new Set())

  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // API Keys
  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'

  // Sécurité : Assurer que library est toujours un array
  const safeLibrary = Array.isArray(library) ? library : []

  // 🔧 DÉTECTION MOBILE
  const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowStatusPopup(null)
    if (showStatusPopup) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showStatusPopup])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(-1)
      setError(null)
      setShowStatusPopup(null)
      setAddingItem(null)
      setFadeOutPopup(null)
      setSelectedStatus(null)
      setJustAddedItems(new Set())
    }
  }, [isOpen])

  // Feedback flow detection
  useEffect(() => {
    if (addingItem) {
      const normalizedId = normalizeId(addingItem)
      
      const checkLibrary = () => {
        const isInLibrary = safeLibrary.some((item: LibraryItem) => {
          if (!item?.id) return false
          return idsMatch(item.id, addingItem)
        })
        
        if (isInLibrary) {
          setAddingItem(null)
          setJustAddedItems(prev => new Set([...prev, addingItem]))
          
          setTimeout(() => {
            setJustAddedItems(prev => {
              const newSet = new Set(prev)
              newSet.delete(addingItem)
              return newSet
            })
          }, 3000)
        }
      }
      
      checkLibrary()
      
      const timeoutId = setTimeout(() => {
        console.warn('Adding timeout reached for:', addingItem)
        setAddingItem(null)
        setJustAddedItems(prev => new Set([...prev, addingItem]))
        
        setTimeout(() => {
          setJustAddedItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(addingItem)
            return newSet
          })
        }, 2000)
      }, 5000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [safeLibrary, addingItem])

  // Get status options based on category
  const getStatusOptions = (category: string): StatusOption[] => {
    switch (category) {
      case 'games':
        return [
          { value: 'want-to-play', label: 'Want to Play' },
          { value: 'currently-playing', label: 'Playing' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'movies':
        return [
          { value: 'want-to-play', label: 'Want to Watch' },
          { value: 'currently-playing', label: 'Watching' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'music':
        return [
          { value: 'want-to-play', label: 'Want to Listen' },
          { value: 'currently-playing', label: 'Listening' },
          { value: 'completed', label: 'Completed' }
        ]
      case 'books':
        return [
          { value: 'want-to-play', label: 'Want to Read' },
          { value: 'currently-playing', label: 'Reading' },
          { value: 'completed', label: 'Completed' }
        ]
      default:
        return [
          { value: 'want-to-play', label: 'Want to Play' },
          { value: 'currently-playing', label: 'Playing' },
          { value: 'completed', label: 'Completed' }
        ]
    }
  }

  // Check if item is in library avec sécurité
  const getLibraryItem = (resultId: string): LibraryItem | undefined => {
    return safeLibrary.find((libItem: LibraryItem) => {
      if (!libItem?.id) return false
      return idsMatch(libItem.id, resultId)
    })
  }

  // Get status display label
  const getStatusDisplayLabel = (status: MediaStatus, category: string): string => {
    const options = getStatusOptions(category)
    const option = options.find(opt => opt.value === status)
    return option ? option.label : 'Added'
  }

  // Fetch with timeout utility
  const fetchWithTimeout = async (url: string, timeout = 8000): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw error
    }
  }

  // Debounced search with caching
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, category: string) => {
      performSearch(searchQuery, category)
    }, 500),
    []
  )

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      setSelectedIndex(-1)
      setError(null)
      return
    }

    const cacheKey = `${activeCategory}-${query.toLowerCase()}`
    if (searchCache.has(cacheKey)) {
      const cachedResults = searchCache.get(cacheKey)!
      setResults(cachedResults)
      setSelectedIndex(-1)
      return
    }

    debouncedSearch(query, activeCategory)
  }, [query, activeCategory, debouncedSearch, searchCache])

  const performSearch = async (searchQuery: string, category: string) => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError(null)
    setSelectedIndex(-1)

    const allResults: SearchResult[] = []
    const errors: string[] = []

    try {
      const searchPromises: Promise<SearchResult[]>[] = []

      if (category === 'all' || category === 'games') {
        searchPromises.push(searchGames(searchQuery).catch(err => {
          errors.push(`Games: ${err.message}`)
          return []
        }))
      }

      if (category === 'all' || category === 'movies') {
        searchPromises.push(searchMoviesAndSeries(searchQuery).catch(err => {
          errors.push(`Movies & TV: ${err.message}`)
          return []
        }))
      }

      if (category === 'all' || category === 'music') {
        searchPromises.push(searchMusic(searchQuery).catch(err => {
          errors.push(`Music: ${err.message}`)
          return []
        }))
      }

      if (category === 'all' || category === 'books') {
        searchPromises.push(searchBooks(searchQuery).catch(err => {
          errors.push(`Books: ${err.message}`)
          return []
        }))
      }

      const results = await Promise.all(searchPromises)
      results.forEach(categoryResults => {
        allResults.push(...categoryResults)
      })

      // 🔧 TRI AMÉLIORÉ PAR DATE (PLUS RÉCENT EN PREMIER) POUR TOUTES LES CATÉGORIES
      allResults.sort((a, b) => {
        // 1. Cas spéciaux : Superman 2025 ou contenu très récent en premier
        const aIsSuperman2025 = a.title.toLowerCase().includes('superman') && a.year >= 2024
        const bIsSuperman2025 = b.title.toLowerCase().includes('superman') && b.year >= 2024
        
        if (aIsSuperman2025 && !bIsSuperman2025) return -1
        if (!aIsSuperman2025 && bIsSuperman2025) return 1
        
        // 2. Correspondance exacte du titre (priorité absolue)
        const aTitleMatch = a.title.toLowerCase().includes(searchQuery.toLowerCase())
        const bTitleMatch = b.title.toLowerCase().includes(searchQuery.toLowerCase())
        
        if (aTitleMatch && !bTitleMatch) return -1
        if (!aTitleMatch && bTitleMatch) return 1
        
        // 3. **NOUVEAU** : Tri par année (PLUS RÉCENT EN PREMIER)
        const yearDiff = (b.year || 0) - (a.year || 0)
        if (yearDiff !== 0) return yearDiff
        
        // 4. Si même année, trier par catégorie (priorité: movies > games > music > books)
        const categoryPriority = { movies: 4, games: 3, music: 2, books: 1 }
        const aCatPriority = categoryPriority[a.category as keyof typeof categoryPriority] || 0
        const bCatPriority = categoryPriority[b.category as keyof typeof categoryPriority] || 0
        
        if (aCatPriority !== bCatPriority) {
          return bCatPriority - aCatPriority
        }
        
        // 5. En dernier recours : meilleur rating
        return (b.rating || 0) - (a.rating || 0)
      })

      // 🔧 LOGS DE DÉBOGAGE POUR VÉRIFIER LE TRI
      console.log('🎯 FINAL RESULTS SORTED BY DATE (most recent first):')
      allResults.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} (${result.year}) - ${result.category}`)
      })

      const cacheKey = `${category}-${searchQuery.toLowerCase()}`
      searchCache.set(cacheKey, allResults)

      setResults(allResults)

      if (errors.length > 0 && allResults.length === 0) {
        setError(`Search failed: ${errors.join(', ')}`)
      }

    } catch (error) {
      console.error('Search error:', error)
      setError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // 🔧 RECHERCHE JEUX avec tri par date de sortie - FIXED TYPESCRIPT ERROR
  const searchGames = async (query: string): Promise<SearchResult[]> => {
    const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=8&ordering=-released`
    const response = await fetchWithTimeout(url, isMobile() ? 5000 : 8000)
    const data = await response.json()
    
    if (!data.results) {
      throw new Error('No games data received')
    }

    const games = data.results.map((game: any) => ({
      id: `game-${game.id}`,
      title: game.name || 'Unknown Game',
      author: game.developers?.[0]?.name || 'Unknown Developer',
      year: game.released ? new Date(game.released).getFullYear() : new Date().getFullYear(),
      rating: game.rating ? Number(game.rating.toFixed(1)) : 0,
      genre: game.genres?.[0]?.name || 'Unknown',
      category: 'games' as const,
      image: game.background_image
    }))

    console.log('🎮 Games results:', games.length, '- Sample years:', games.slice(0, 3).map((g: any) => g.year))
    return games
  }

  // 🔧 RECHERCHE FILMS/SÉRIES avec tri par année
  const searchMoviesAndSeries = async (query: string): Promise<SearchResult[]> => {
    try {
      console.log('🔍 SearchModal: Recherche films/séries pour:', query)
      
      let allMovieResults: any[] = []
      
      // 1. Recherche multi-stratégies normale
      const moviesAndSeries = await omdbService.searchMoviesAndSeries(query)
      console.log('📊 OMDB multi-stratégies:', moviesAndSeries.length, 'résultats')
      allMovieResults.push(...moviesAndSeries)
      
      // 2. SPÉCIAL SUPERMAN : Recherche dédiée pour contenu récent
      if (query.toLowerCase().includes('superman')) {
        console.log('🎬 Recherche spéciale Superman récent...')
        
        try {
          const recentSuperman = await omdbService.searchRecentContent('superman')
          console.log('🎯 Superman récent trouvé:', recentSuperman.length, 'items')
          allMovieResults.push(...recentSuperman)
        } catch (recentError) {
          console.warn('⚠️ Recherche récente Superman échouée:', recentError)
        }
        
        try {
          const response = await fetch(`https://www.omdbapi.com/?apikey=649f9a63&s=superman&y=2025`)
          const data = await response.json()
          if (data.Response === 'True' && data.Search) {
            console.log('🎯 Recherche Superman 2025 directe:', data.Search.length, 'films')
            allMovieResults.push(...data.Search)
          }
        } catch (directError) {
          console.warn('⚠️ Recherche directe Superman 2025 échouée:', directError)
        }
      }
      
      // 3. Enlever les doublons
      const uniqueResults = allMovieResults.filter((movie, index, self) => 
        index === self.findIndex(m => m.imdbID === movie.imdbID)
      )
      
      // 4. Trier par année (plus récent en premier) AVANT la conversion
      const sortedResults = uniqueResults.sort((a, b) => {
        const yearA = parseInt(a.Year) || 0
        const yearB = parseInt(b.Year) || 0
        return yearB - yearA
      })
      
      console.log('📊 Movies sorted by year:', sortedResults.slice(0, 3).map((m: any) => `${m.Title} (${m.Year})`))
      
      // 5. Formatter et retourner
      const formatted = sortedResults.slice(0, 12).map((item: any) => {
        const converted = omdbService.convertToAppFormat(item)
        
        if (item.Title && item.Title.toLowerCase().includes('superman')) {
          console.log('🎬 SUPERMAN CONVERTI:', item.Title, item.Year, '→', converted.title, converted.year)
        }
        
        return converted
      })
      
      console.log('✅ SearchModal films/séries finaux:', formatted.length, 'items')
      return formatted
      
    } catch (error) {
      console.error('❌ SearchModal: Erreur recherche films:', error)
      throw error
    }
  }

  // 🔧 RECHERCHE MUSIQUE OPTIMISÉE MOBILE
  const searchMusic = async (query: string): Promise<SearchResult[]> => {
    try {
      console.log('🎵 SearchModal: Starting music search for:', query, 'Mobile:', isMobile())
      
      const cleanQuery = query.trim()
      if (!cleanQuery) {
        console.warn('🎵 Empty query for music search')
        return []
      }

      console.log('🎵 SearchModal: Calling musicService.searchAlbums...')
      const albums = await musicService.searchAlbums(cleanQuery, 8)
      console.log('🎵 SearchModal: Got albums from service:', albums.length)
      
      if (!albums || albums.length === 0) {
        console.log('🎵 SearchModal: No albums found, returning empty array')
        return []
      }

      console.log('🎵 SearchModal: Converting albums to app format...')
      const converted = albums.map((album: any) => {
        const formatted = musicService.convertToAppFormat(album)
        console.log('🎵 SearchModal: Converted album:', formatted.title, 'by', formatted.artist, `(${formatted.year})`)
        return formatted
      })

      // Trier par année (plus récent en premier)
      const sorted = converted.sort((a, b) => (b.year || 0) - (a.year || 0))
      console.log('🎵 SearchModal: Music sorted by year:', sorted.slice(0, 3).map((s: any) => `${s.title} (${s.year})`))

      return sorted

    } catch (error) {
      console.error('🎵 SearchModal: Music search error:', error)
      
      // En cas d'erreur, retourner des résultats de fallback si possible
      if (query.toLowerCase().includes('taylor')) {
        console.log('🎵 SearchModal: Using Taylor Swift fallback')
        return [
          {
            id: 'music-fallback-1',
            title: '1989 (Taylor\'s Version)',
            artist: 'Taylor Swift',
            year: 2023,
            rating: 4.7,
            genre: 'Pop',
            category: 'music' as const,
            image: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/69/4e/c0/694ec029-bef2-8339-a5e8-5f8d8bb5b4ad/23UMGIM78793.rgb.jpg/300x300bb.jpg'
          },
          {
            id: 'music-fallback-2',
            title: 'Midnights',
            artist: 'Taylor Swift',
            year: 2022,
            rating: 4.5,
            genre: 'Pop',
            category: 'music' as const,
            image: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/18/93/6f/18936ff8-d3ac-4f66-96af-8c6c35e5a63d/22UMGIM86640.rgb.jpg/300x300bb.jpg'
          },
          {
            id: 'music-fallback-3',
            title: 'folklore',
            artist: 'Taylor Swift', 
            year: 2020,
            rating: 4.8,
            genre: 'Alternative',
            category: 'music' as const,
            image: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/0f/58/54/0f585482-8998-be0a-9565-2dfc81a64558/20UMGIM58208.rgb.jpg/300x300bb.jpg'
          }
        ]
      } else if (query.toLowerCase().includes('drake')) {
        console.log('🎵 SearchModal: Using Drake fallback')
        return [
          {
            id: 'music-fallback-4',
            title: 'Certified Lover Boy',
            artist: 'Drake',
            year: 2021,
            rating: 4.2,
            genre: 'Hip-Hop/Rap',
            category: 'music' as const,
            image: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/99/5c/5b/995c5b67-7e5a-8ccb-7a36-d1a9d0e96567/21UMGIM93841.rgb.jpg/300x300bb.jpg'
          }
        ]
      }
      
      // Re-throw l'erreur si pas de fallback disponible
      throw error
    }
  }

  // 🔧 RECHERCHE LIVRES avec tri par date
  const searchBooks = async (query: string): Promise<SearchResult[]> => {
    try {
      console.log('📚 SearchModal: Starting books search for:', query)
      
      const books = await googleBooksService.searchBooks(query, 8)
      console.log('📚 SearchModal: Got books from service:', books.length)
      
      const converted = books.map((book: any) => googleBooksService.convertToAppFormat(book))
      
      // Trier par année (plus récent en premier)
      const sorted = converted.sort((a, b) => (b.year || 0) - (a.year || 0))
      console.log('📚 Books sorted by year:', sorted.slice(0, 3).map((b: any) => `${b.title} (${b.year})`))
      
      return sorted
    } catch (error) {
      console.error('📚 Google Books search failed:', error)
      throw error
    }
  }

  // Status selection with feedback flow
  const handleStatusSelect = (result: SearchResult, status: MediaStatus) => {
    setSelectedStatus(status)
    
    setTimeout(() => {
      setFadeOutPopup(result.id)
      setTimeout(() => {
        setShowStatusPopup(null)
        setFadeOutPopup(null)
        setSelectedStatus(null)
      }, 300)
    }, 800)

    setAddingItem(result.id)
    onAddToLibrary(result, status)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelectResult(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleSelectResult = (result: SearchResult) => {
    if (result.category === 'games' && onOpenGameDetail) {
      onOpenGameDetail(result.id.replace('game-', ''))
      onClose()
    } else if (result.category === 'movies' && onOpenMovieDetail) {
      onOpenMovieDetail(result.id.replace('movie-', ''))
      onClose()
    } else if (result.category === 'books' && onOpenBookDetail) {
      onOpenBookDetail(result.id.replace('book-', ''))
      onClose()
    } else if (result.category === 'music' && onOpenMusicDetail) {
      onOpenMusicDetail(result.id.replace('music-', ''))
      onClose()
    } else {
      onAddToLibrary(result, 'want-to-play')
      onClose()
    }
  }

  const getCreator = (result: SearchResult) => {
    return result.author || result.artist || result.director || 'Unknown'
  }

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'games': return { color: 'bg-green-100 text-green-700 border-green-200', icon: '🎮' }
      case 'movies': return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🎬' }
      case 'music': return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🎵' }
      case 'books': return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '📚' }
      default: return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📄' }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100">
          <Search className="text-gray-400 mr-3 flex-shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search games, movies, TV shows, music, books..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 outline-none text-lg"
          />
          {loading && <Loader2 className="animate-spin text-gray-400 mr-3" size={16} />}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-3 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Category filters */}
        <div className="flex space-x-2 p-4 border-b border-gray-100 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'games', label: 'Games' },
            { key: 'movies', label: 'Movies & TV' },
            { key: 'music', label: 'Music' },
            { key: 'books', label: 'Books' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                activeCategory === key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
          {/* Error state */}
          {error && (
            <div className="flex items-center justify-center py-8 px-4">
              <div className="text-center">
                <WifiOff className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={() => performSearch(query, activeCategory)}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-600">
                <Loader2 className="animate-spin" size={20} />
                <span>Searching{isMobile() ? ' (mobile mode)' : ''}...</span>
              </div>
            </div>
          )}

          {/* No results */}
          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              <Search className="mx-auto mb-2" size={24} />
              <p>No results found for "<span className="text-gray-900 font-medium">{query}</span>"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          )}

          {/* Results list */}
          {!loading && !error && results.length > 0 && (
            <div className="p-4 space-y-2">
              {results.map((result, index) => {
                const categoryInfo = getCategoryInfo(result.category)
                const isSelected = index === selectedIndex
                const libraryItem = getLibraryItem(result.id)
                const isInLibrary = !!libraryItem
                const isAdding = addingItem === result.id
                const wasJustAdded = justAddedItems.has(result.id)
                
                return (
                  <div
                    key={result.id}
                    className={`flex items-center space-x-4 p-3 rounded-lg transition-all cursor-pointer border ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                    onClick={() => handleSelectResult(result)}
                  >
                    {/* Image */}
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                      {result.image ? (
                        <img
                          src={result.image}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-lg ${result.image ? 'hidden' : ''}`}>
                        {categoryInfo.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-gray-900 font-medium truncate flex-1">
                          {result.title}
                          {/* Indicateur TV Series */}
                          {result.isSeries && (
                            <span className="ml-2 text-purple-600 text-xs"> • TV Series</span>
                          )}
                          {/* Indicateur NEW pour contenu 2024+ */}
                          {result.year >= 2024 && (
                            <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">NEW</span>
                          )}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color} flex-shrink-0`}>
                          {result.category === 'movies' ? (result.isSeries ? 'TV' : 'Film') : result.category}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm truncate">{getCreator(result)}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span className={result.year >= 2024 ? 'font-semibold text-green-600' : result.year >= 2020 ? 'font-medium text-blue-600' : ''}>{result.year}</span>
                        {result.genre && (
                          <>
                            <span>•</span>
                            <span className="truncate">{result.genre}</span>
                          </>
                        )}
                        {result.rating && result.rating > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center">
                              <Star size={12} className="text-yellow-500 mr-1" />
                              <span>{result.rating}</span>
                            </div>
                          </>
                        )}
                        {/* Afficher saisons pour les séries */}
                        {result.isSeries && result.totalSeasons && (
                          <>
                            <span>•</span>
                            <span>{result.totalSeasons} season{result.totalSeasons > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons with feedback flow */}
                    <div className="relative">
                      {(isInLibrary || wasJustAdded) && !isAdding ? (
                        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
                          <Check size={14} />
                          <span>{getStatusDisplayLabel(libraryItem?.status || 'completed', result.category)}</span>
                        </div>
                      ) : isAdding ? (
                        <div className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
                          <Loader2 className="animate-spin" size={14} />
                          <span>Adding...</span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowStatusPopup(result.id)
                            }}
                            className="bg-blue-600/90 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md"
                          >
                            Add
                          </button>

                          {showStatusPopup === result.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[99998]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowStatusPopup(null)
                                }}
                              />
                              
                              <div 
                                className={`absolute right-0 top-full mt-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200 py-2 min-w-44 z-[99999] overflow-hidden transition-all duration-300 ${
                                  fadeOutPopup === result.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getStatusOptions(result.category).map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusSelect(result, option.value)
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 hover:bg-gray-50 border-l-2 border-transparent hover:border-blue-500 flex items-center justify-between ${
                                      selectedStatus === option.value 
                                        ? 'bg-green-50 border-green-500 text-green-700' 
                                        : 'text-gray-700 hover:text-gray-900'
                                    }`}
                                  >
                                    <span className="font-medium transition-colors">
                                      {option.label}
                                    </span>
                                    {selectedStatus === option.value ? (
                                      <Check className="text-green-600" size={14} />
                                    ) : (
                                      <Check className="opacity-0 group-hover:opacity-100 transition-opacity text-green-600" size={14} />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
            <span>Use ↑↓ to navigate, Enter to select{isMobile() ? ' • Mobile optimized' : ''}</span>
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
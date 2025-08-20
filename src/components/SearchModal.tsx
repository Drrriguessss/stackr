// src/components/SearchModal.tsx - VERSION APPLE MUSIC REDESIGN
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Star, Loader2, WifiOff, Check, Mic, ChevronRight, Film, Gamepad2, Book, Music, Dice6 } from 'lucide-react'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import { omdbService } from '@/services/omdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicServiceV2 } from '@/services/musicServiceV2'
import { rawgService } from '@/services/rawgService'
import type { SearchResult, LibraryItem, MediaCategory, StatusOption, MediaStatus } from '@/types'
import { fetchWithCache, apiCache } from '@/utils/apiCache'

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

// Interface pour les recherches récentes
interface RecentSearch {
  id: string
  title: string
  category: string
  type?: string
  image?: string
  timestamp: number
  result: SearchResult
}

// Debounce utility function
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
  // États principaux
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('movies')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  
  // États pour les recherches récentes
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  
  // États pour l'interface
  const [showStatusPopup, setShowStatusPopup] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [fadeOutPopup, setFadeOutPopup] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [justAddedItems, setJustAddedItems] = useState<Set<string>>(new Set())

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Cache de recherche
  const [searchCache] = useState<Map<string, SearchResult[]>>(new Map())

  // Sécurité : Assurer que library est toujours un array
  const safeLibrary = Array.isArray(library) ? library : []

  // Charger les recherches récentes au montage
  useEffect(() => {
    const loadRecentSearches = () => {
      const stored = localStorage.getItem('stackr_recent_searches')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setRecentSearches(parsed.slice(0, 10)) // Limiter à 10 éléments
        } catch (e) {
          console.error('Failed to load recent searches:', e)
        }
      }
    }
    
    if (isOpen) {
      loadRecentSearches()
    }
  }, [isOpen])

  // Sauvegarder une recherche récente
  const saveToRecentSearches = (result: SearchResult) => {
    const recent: RecentSearch = {
      id: result.id,
      title: result.title,
      category: result.category,
      type: result.category === 'movies' && result.isSeries ? 'TV Series' : 
            result.category === 'music' && (result as any).type ? (result as any).type : 
            result.category.charAt(0).toUpperCase() + result.category.slice(1),
      image: result.image,
      timestamp: Date.now(),
      result
    }

    setRecentSearches(prev => {
      // Éviter les doublons
      const filtered = prev.filter(item => item.id !== result.id)
      const updated = [recent, ...filtered].slice(0, 10)
      
      // Sauvegarder dans localStorage
      localStorage.setItem('stackr_recent_searches', JSON.stringify(updated))
      
      return updated
    })
  }

  // Effacer les recherches récentes
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('stackr_recent_searches')
  }

  // Gérer le clic sur une recherche récente
  const handleRecentSearchClick = (item: RecentSearch) => {
    handleSelectResult(item.result)
  }

  // Générer des suggestions basées sur la saisie
  useEffect(() => {
    if (query.length > 0) {
      // Suggestions simples basées sur le query
      const suggestions = [
        `${query} movies`,
        `${query} games`,
        `${query} albums`,
        `${query} books`,
        `${query} soundtrack`
      ].filter(s => s.toLowerCase() !== query.toLowerCase())
      
      setSearchSuggestions(suggestions.slice(0, 5))
    } else {
      setSearchSuggestions([])
    }
  }, [query])

  // Gérer le clic sur une suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
  }

  // 🔧 DÉTECTION MOBILE
  const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // ✅ FONCTION getCreator COMPLÈTEMENT RÉÉCRITE ET CORRIGÉE
  const getCreator = (result: SearchResult): string => {
    let creator = ''

    switch (result.category) {
      case 'games':
        if (result.developer && result.developer !== 'Unknown Developer') {
          creator = result.developer
        } else {
          creator = 'Unknown Developer'
        }
        break

      case 'movies':
        if (result.director && result.director !== 'Unknown Director' && result.director !== 'N/A' && result.director !== 'Unknown') {
          creator = result.director
        } else if (result.author && result.author !== 'Unknown Director' && result.author !== 'N/A' && result.author !== 'Unknown') {
          creator = result.author
        } else {
          creator = 'Director'
        }
        break

      case 'music':
        if (result.artist && result.artist !== 'Unknown Artist' && result.artist !== 'Unknown') {
          creator = result.artist
        } else if (result.author && result.author !== 'Unknown Artist' && result.author !== 'Unknown') {
          creator = result.author
        } else {
          creator = 'Artist'
        }
        break

      case 'books':
        if (result.author && result.author !== 'Unknown Author' && result.author !== 'Unknown') {
          creator = result.author
        } else {
          creator = 'Author'
        }
        break

      default:
        creator = result.author || result.artist || result.director || result.developer || 'Creator'
        break
    }

    return creator
  }

  // ✅ COMPLETELY REWRITTEN GAME SEARCH WITH DEVELOPER FETCHING
  const searchGames = async (query: string): Promise<SearchResult[]> => {
    const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
    const currentYear = new Date().getFullYear()
    
    try {
      const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=8&dates=2000-01-01,${currentYear + 1}-12-31`
      
      const cacheKey = `games-search-${encodeURIComponent(query)}`
      
      let data
      try {
        data = await fetchWithCache(searchUrl, cacheKey)
      } catch (error) {
        const response = await fetch(searchUrl)
        if (!response.ok) {
          throw new Error(`Direct fetch failed: ${response.status}`)
        }
        data = await response.json()
      }
      
      if (data.error && data.error.includes('API limit')) {
        throw new Error('API_LIMIT_REACHED')
      }
      
      if (!data.results || data.results.length === 0) {
        return []
      }

      const topResults = data.results.slice(0, 3)
      const remainingResults = data.results.slice(3)
      
      const detailedTopGames = await Promise.all(
        topResults.map(async (game: any) => {
          try {
            const detailUrl = `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`
            const cacheKey = `game-detail-${game.id}`
            const detailData = await fetchWithCache(detailUrl, cacheKey)
            return detailData
          } catch (error) {
            console.warn(`Failed to get details for ${game.name}:`, error)
          }
          return game
        })
      )
      
      const detailedGames = [...detailedTopGames, ...remainingResults]

      const convertedGames: SearchResult[] = detailedGames.map((game: any) => {
        let developerName = 'Unknown Developer'
        if (game.developers && game.developers.length > 0) {
          developerName = game.developers[0].name
        } else if (game.publishers && game.publishers.length > 0) {
          developerName = game.publishers[0].name
        }
        
        const converted: SearchResult = {
          id: `game-${game.id}`,
          title: game.name,
          name: game.name,
          category: 'games' as const,
          year: game.released ? new Date(game.released).getFullYear() : currentYear,
          rating: game.rating || 0,
          genre: game.genres?.[0]?.name || 'Game',
          image: game.background_image,
          developer: developerName,
          author: developerName,
          developers: game.developers || [],
          publishers: game.publishers || [],
          genres: game.genres || [],
          released: game.released,
          platforms: game.platforms || [],
          metacritic: game.metacritic,
          rating_count: game.rating_count || 0,
        }
        
        return converted
      })

      return convertedGames

    } catch (error) {
      console.error('Game search failed:', error)
      throw error
    }
  }

  // 🎬 RECHERCHE FILMS/SÉRIES
  const searchMoviesAndSeries = async (query: string): Promise<SearchResult[]> => {
    try {
      const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      if (tmdbApiKey) {
        try {
          const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`
          
          const response = await fetch(tmdbUrl)
          if (response.ok) {
            const data = await response.json()
            const results = data.results || []
            
            const filteredResults = results
              .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
              .slice(0, 8)
            
            if (filteredResults.length > 0) {
              const convertedResults: SearchResult[] = filteredResults.map((item: any) => {
                const isMovie = item.media_type === 'movie'
                
                let imageUrl: string | undefined
                if (item.poster_path) {
                  imageUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`
                } else if (item.backdrop_path) {
                  imageUrl = `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
                }
                
                const releaseDate = isMovie ? item.release_date : item.first_air_date
                const rating = item.vote_average ? Number((item.vote_average / 2).toFixed(1)) : 0
                const year = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear()
                
                const genreMap: { [key: number]: string } = {
                  28: 'Action', 35: 'Comedy', 18: 'Drama', 27: 'Horror',
                  10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 16: 'Animation',
                  12: 'Adventure', 14: 'Fantasy', 36: 'History', 10752: 'War',
                  80: 'Crime', 99: 'Documentary', 10751: 'Family', 9648: 'Mystery'
                }
                
                const genreName = item.genre_ids && item.genre_ids.length > 0 
                  ? genreMap[item.genre_ids[0]] || 'Entertainment'
                  : 'Entertainment'
                
                return {
                  id: `movie-${item.id}`,
                  title: isMovie ? item.title : item.name,
                  name: isMovie ? item.title : item.name,
                  category: 'movies' as const,
                  year,
                  rating,
                  image: imageUrl,
                  director: 'Director',
                  author: 'Director',
                  genre: genreName,
                  isSeries: !isMovie,
                  overview: item.overview,
                  popularity: item.popularity || 0,
                  vote_count: item.vote_count || 0,
                  poster_path: item.poster_path,
                  backdrop_path: item.backdrop_path
                }
              })
              
              const sortedResults = convertedResults.sort((a, b) => {
                const popA = a.popularity || 0
                const popB = b.popularity || 0
                return popB - popA
              })
              
              return sortedResults
            }
          }
        } catch (tmdbError) {
          console.warn('TMDb search failed:', tmdbError)
        }
      }
      
      const movies = await omdbService.searchMoviesAndSeries(query, 1)
      
      if (!movies || movies.length === 0) {
        return []
      }

      const detailedMovies = await Promise.all(
        movies.slice(0, 8).map(async movie => {
          try {
            const movieDetails = await omdbService.getMovieDetails(movie.imdbID)
            
            if (movieDetails) {
              const converted = omdbService.convertToAppFormat(movieDetails)
              return converted
            } else {
              const converted = omdbService.convertToAppFormat(movie)
              return converted
            }
          } catch (error) {
            return omdbService.convertToAppFormat(movie)
          }
        })
      )

      return detailedMovies

    } catch (error) {
      console.error('Movies search failed:', error)
      throw error
    }
  }

  // 📚 RECHERCHE LIVRES
  const searchBooks = async (query: string): Promise<SearchResult[]> => {
    try {
      const books = await googleBooksService.searchBooks(query, 15)
      
      if (!books || books.length === 0) {
        return []
      }

      const convertedBooks = books.map(book => {
        const converted = googleBooksService.convertToAppFormat(book)
        return converted
      })

      return convertedBooks

    } catch (error) {
      console.error('Books search failed:', error)
      throw error
    }
  }

  // 🎵 RECHERCHE MUSIQUE
  const searchMusicWithCategory = async (query: string): Promise<SearchResult[]> => {
    try {
      const musicItems = await musicServiceV2.searchMusic(query, 20)
      
      if (!musicItems || musicItems.length === 0) {
        return []
      }

      return musicItems

    } catch (error) {
      console.error('Music search failed:', error)
      throw error
    }
  }

  // ✅ RECHERCHE PRINCIPALE RÉÉCRITE
  const performSearch = async (searchQuery: string, category: string) => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError(null)
    setSelectedIndex(-1)

    const allResults: SearchResult[] = []
    const errors: string[] = []

    try {
      const searchPromises: Promise<{ category: string, results: SearchResult[] }>[] = []

      // ✅ RECHERCHE JEUX
      if (category === 'games') {
        searchPromises.push(
          searchGames(searchQuery)
            .then(results => ({ category: 'games', results }))
            .catch(err => {
              if (err.message.includes('API_LIMIT_REACHED') || err.message.includes('API limit')) {
                const { sampleContent } = require('@/data/sampleContent')
                const filteredGames = sampleContent.games.filter((game: any) => 
                  game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  game.author?.toLowerCase().includes(searchQuery.toLowerCase())
                ).slice(0, 5)
                
                return { category: 'games', results: filteredGames }
              }
              
              errors.push(`Games: ${err.message}`)
              return { category: 'games', results: [] }
            })
        )
      }

      // 🎬 RECHERCHE FILMS/SÉRIES
      if (category === 'movies') {
        searchPromises.push(
          searchMoviesAndSeries(searchQuery)
            .then(results => ({ category: 'movies', results }))
            .catch(err => {
              errors.push(`Movies & TV: ${err.message}`)
              return { category: 'movies', results: [] }
            })
        )
      }

      // 🎵 RECHERCHE MUSIQUE
      if (category === 'music') {
        searchPromises.push(
          searchMusicWithCategory(searchQuery)
            .then(results => ({ category: 'music', results }))
            .catch(err => {
              errors.push(`Music: ${err.message}`)
              return { category: 'music', results: [] }
            })
        )
      }

      // 📚 RECHERCHE LIVRES
      if (category === 'books') {
        searchPromises.push(
          searchBooks(searchQuery)
            .then(results => ({ category: 'books', results }))
            .catch(err => {
              errors.push(`Books: ${err.message}`)
              return { category: 'books', results: [] }
            })
        )
      }

      // Board games - just return empty for now
      if (category === 'boardgames') {
        searchPromises.push(
          Promise.resolve({ category: 'boardgames', results: [] })
        )
      }

      const results = await Promise.all(searchPromises)
      
      // ✅ AGRÉGATION ET VÉRIFICATION DES RÉSULTATS
      results.forEach(({ category: searchCategory, results: categoryResults }) => {
        allResults.push(...categoryResults)
      })

      // 🔧 TRI INTELLIGENT
      allResults.sort((a, b) => {
        const queryLower = searchQuery.toLowerCase()
        
        const aExactTitle = a.title.toLowerCase() === queryLower
        const bExactTitle = b.title.toLowerCase() === queryLower
        
        if (aExactTitle && !bExactTitle) return -1
        if (!aExactTitle && bExactTitle) return 1
        
        const aTitleContains = a.title.toLowerCase().includes(queryLower)
        const bTitleContains = b.title.toLowerCase().includes(queryLower)
        
        if (aTitleContains && !bTitleContains) return -1
        if (!aTitleContains && bTitleContains) return 1
        
        if (aTitleContains && bTitleContains) {
          const currentYear = new Date().getFullYear()
          const aIsRecent = a.year >= currentYear
          const bIsRecent = b.year >= currentYear
          
          if (aIsRecent && !bIsRecent) return -1
          if (!aIsRecent && bIsRecent) return 1
          
          if (a.year !== b.year) return (b.year || 0) - (a.year || 0)
        }
        
        const aCreator = getCreator(a).toLowerCase()
        const bCreator = getCreator(b).toLowerCase()
        const aCreatorMatch = aCreator.includes(queryLower)
        const bCreatorMatch = bCreator.includes(queryLower)
        
        if (aCreatorMatch && !bCreatorMatch) return -1
        if (!aCreatorMatch && bCreatorMatch) return 1
        
        return (b.rating || 0) - (a.rating || 0)
      })

      const cacheKey = `${category}-${searchQuery.toLowerCase()}`
      searchCache.set(cacheKey, allResults)

      setResults(allResults)

      if (errors.length > 0 && allResults.length === 0) {
        setError(`Search failed: ${errors.join(', ')}`)
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, category: string) => {
      performSearch(searchQuery, category)
    }, 1000),
    []
  )

  // ✅ EFFET POUR DÉCLENCHER LA RECHERCHE
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      setSelectedIndex(-1)
      setError(null)
      return
    }

    const cacheKey = `${selectedCategory}-${query.toLowerCase()}`
    if (selectedCategory !== 'movies' && searchCache.has(cacheKey)) {
      const cachedResults = searchCache.get(cacheKey)!
      setResults(cachedResults)
      setSelectedIndex(-1)
      return
    }

    debouncedSearch(query, selectedCategory)
  }, [query, selectedCategory, debouncedSearch, searchCache])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

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
      searchCache.clear()
    }
  }, [isOpen, searchCache])

  // ✅ GESTION DES OPTIONS DE STATUT
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

  // Vérifier si un item est dans la bibliothèque
  const getLibraryItem = (resultId: string): LibraryItem | undefined => {
    return safeLibrary.find((libItem: LibraryItem) => {
      if (!libItem?.id) return false
      return idsMatch(libItem.id, resultId)
    })
  }

  // Obtenir le label d'affichage du statut
  const getStatusDisplayLabel = (status: MediaStatus, category: string): string => {
    const options = getStatusOptions(category)
    const option = options.find(opt => opt.value === status)
    return option ? option.label : 'Added'
  }

  // Sélection de statut avec feedback
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
    saveToRecentSearches(result)
  }

  // Navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length && !searchSuggestions.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (searchSuggestions.length > 0 && !results.length) {
          setSelectedIndex(prev => Math.min(prev + 1, searchSuggestions.length - 1))
        } else {
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          if (searchSuggestions.length > 0 && !results.length) {
            handleSuggestionClick(searchSuggestions[selectedIndex])
          } else if (results.length > 0) {
            handleSelectResult(results[selectedIndex])
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  // Défilement de l'élément sélectionné
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Sélection d'un résultat
  const handleSelectResult = (result: SearchResult) => {
    saveToRecentSearches(result)
    
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
      onOpenMusicDetail(result.id)
      onClose()
    } else {
      onAddToLibrary(result, 'want-to-play')
      onClose()
    }
  }

  // Informations de catégorie
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'games': return { color: 'bg-green-100 text-green-700 border-green-200', icon: '🎮' }
      case 'movies': return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🎬' }
      case 'music': return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '🎵' }
      case 'books': return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '📚' }
      default: return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📄' }
    }
  }

  // Gestion du feedback d'ajout
  useEffect(() => {
    if (addingItem) {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 flex flex-col bg-black text-white overflow-hidden">
        {/* Barre de recherche Apple Music Style */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Artists, Songs, Movies and More..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-12 bg-gray-800 text-white placeholder-gray-400 rounded-lg px-4 py-3 pl-12 pr-20 text-base focus:outline-none focus:ring-2 focus:ring-gray-600"
            />
            
            {/* Icône loupe */}
            <Search 
              size={20} 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
            />
            
            {/* Icône micro */}
            <Mic 
              size={18} 
              className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-300" 
            />
            
            {/* Bouton X */}
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
              >
                <X size={18} className="text-gray-400 hover:text-gray-300" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Filtres style Apple Music */}
        <div className="px-4 py-2">
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            {[
              { key: 'movies', label: 'Movies', icon: Film },
              { key: 'games', label: 'Games', icon: Gamepad2 },
              { key: 'books', label: 'Books', icon: Book },
              { key: 'music', label: 'Music', icon: Music },
              { key: 'boardgames', label: 'Board', icon: Dice6 }
            ].map((filter, index) => (
              <button
                key={filter.key}
                onClick={() => setSelectedCategory(filter.key)}
                className={`flex-1 py-2.5 px-3 text-sm font-medium transition-all duration-200 ${
                  index === 0 ? 'rounded-l-md' : ''
                } ${
                  index === 4 ? 'rounded-r-md' : ''
                } ${
                  selectedCategory === filter.key
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto" ref={resultsRef}>
          {/* Recently Searched - visible par défaut */}
          {!query && recentSearches.length > 0 && (
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-xl font-semibold">Recently Searched</h2>
                <button 
                  onClick={clearRecentSearches}
                  className="text-red-500 text-sm font-medium hover:text-red-400"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-0">
                {recentSearches.map((item, index) => (
                  <div 
                    key={index}
                    onClick={() => handleRecentSearchClick(item)}
                    className="flex items-center space-x-4 py-3 hover:bg-gray-800/30 rounded-lg cursor-pointer transition-colors"
                  >
                    {/* Image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <span className="text-white text-lg font-bold">
                            {item.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Texte */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-base truncate">{item.title}</p>
                      <p className="text-gray-400 text-sm truncate">
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)} • {item.type || 'Result'}
                      </p>
                    </div>
                    
                    {/* Flèche */}
                    <ChevronRight size={20} className="text-gray-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions pendant la saisie */}
          {query && searchSuggestions.length > 0 && !loading && results.length === 0 && (
            <div className="px-4">
              <div className="space-y-0">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full flex items-center space-x-3 py-3 hover:bg-gray-800/30 rounded-lg transition-colors ${
                      selectedIndex === index ? 'bg-gray-800/50' : ''
                    }`}
                  >
                    <Search size={16} className="text-gray-500 ml-2" />
                    <span className="text-white text-left flex-1 text-base">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* État d'erreur */}
          {error && (
            <div className="flex items-center justify-center py-8 px-4">
              <div className="text-center">
                <WifiOff className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                  onClick={() => performSearch(query, selectedCategory)}
                  className="mt-2 text-gray-400 hover:text-gray-300 text-sm underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* État de chargement */}
          {loading && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-400">
                <Loader2 className="animate-spin" size={20} />
                <span>Searching...</span>
              </div>
            </div>
          )}

          {/* Aucun résultat */}
          {!loading && !error && query.length >= 2 && results.length === 0 && !searchSuggestions.length && (
            <div className="text-center py-8 text-gray-400">
              <Search className="mx-auto mb-2" size={24} />
              <p>No results found for "<span className="text-white font-medium">{query}</span>"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          )}

          {/* Résultats de recherche */}
          {!loading && !error && results.length > 0 && (
            <div className="px-4 py-4">
              <div className="space-y-3">
                {results.map((result, index) => {
                  const categoryInfo = getCategoryInfo(result.category)
                  const isSelected = index === selectedIndex
                  const libraryItem = getLibraryItem(result.id)
                  const isInLibrary = !!libraryItem
                  const isAdding = addingItem === result.id
                  const wasJustAdded = justAddedItems.has(result.id)
                  const creator = getCreator(result)
                  const isRecent = result.year >= new Date().getFullYear()
                  
                  return (
                    <div
                      key={result.id}
                      className={`flex items-start space-x-3 p-3 rounded-xl transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-gray-800/50' 
                          : 'hover:bg-gray-800/30'
                      }`}
                      onClick={() => handleSelectResult(result)}
                    >
                      {/* Image */}
                      <div className="w-16 h-16 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden">
                        {result.image ? (
                          <img
                            src={result.image}
                            alt={result.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) {
                                fallback.style.display = 'flex'
                              }
                            }}
                          />
                        ) : null}
                        
                        <div 
                          className="w-full h-full flex items-center justify-center bg-gray-800"
                          style={{ display: result.image ? 'none' : 'flex' }}
                        >
                          <div className="text-xl">
                            {categoryInfo.icon}
                          </div>
                        </div>
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-base leading-tight">
                          {result.title}
                          {isRecent && (
                            <span className="ml-2 text-green-500 text-xs">NEW</span>
                          )}
                        </h3>
                        
                        <p className="text-gray-400 text-sm mt-1">
                          {creator} • {result.year}
                          {result.rating && result.rating > 0 && (
                            <>
                              {' • '}
                              <Star size={10} className="inline text-yellow-500 mr-1" />
                              <span>{result.rating}</span>
                            </>
                          )}
                        </p>

                        {/* Bouton d'action supprimé - fonctionnalité retirée */}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
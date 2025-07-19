// src/components/SearchModal.tsx - ENTIÈREMENT RÉÉCRIT
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Star, Loader2, WifiOff, Check } from 'lucide-react'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import { omdbService } from '@/services/omdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
import { rawgService } from '@/services/rawgService'
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
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  
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

  // 🔧 DÉTECTION MOBILE
  const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // ✅ FONCTION getCreator ENTIÈREMENT RÉÉCRITE
  const getCreator = (result: SearchResult) => {
    console.log('🔍 [SearchModal] Getting creator for:', result.title)
    console.log('🔍 [SearchModal] Category:', result.category)
    console.log('🔍 [SearchModal] Available data:', {
      author: result.author,
      director: result.director,
      developer: result.developer,
      artist: result.artist,
      developers: result.developers ? result.developers.map(d => d.name) : null,
      publishers: result.publishers ? result.publishers.map(p => p.name) : null
    })

    let creator = 'Unknown Creator'

    switch (result.category) {
      case 'games':
        // ✅ LOGIQUE AMÉLIORÉE POUR LES JEUX
        if (result.developer && result.developer !== 'Unknown Developer') {
          creator = result.developer
          console.log('🎮 [SearchModal] Using developer field:', creator)
        }
        else if (result.developers && result.developers.length > 0) {
          creator = result.developers[0].name
          console.log('🎮 [SearchModal] Using first developer from array:', creator)
        }
        else if (result.author && result.author !== 'Unknown Developer') {
          creator = result.author
          console.log('🎮 [SearchModal] Using author as fallback:', creator)
        }
        else if (result.publishers && result.publishers.length > 0) {
          creator = `${result.publishers[0].name} (Publisher)`
          console.log('🎮 [SearchModal] Using publisher as last resort:', creator)
        }
        else {
          creator = 'Unknown Developer'
          console.log('🎮 [SearchModal] No developer info found')
        }
        break

      case 'movies':
        creator = result.director || result.author || 'Unknown Director'
        console.log('🎬 [SearchModal] Movie creator:', creator)
        break

      case 'music':
        creator = result.artist || result.author || 'Unknown Artist'
        console.log('🎵 [SearchModal] Music creator:', creator)
        break

      case 'books':
        creator = result.author || 'Unknown Author'
        console.log('📚 [SearchModal] Book creator:', creator)
        break

      default:
        creator = result.author || result.artist || result.director || result.developer || 'Unknown Creator'
        console.log('❓ [SearchModal] Default creator:', creator)
        break
    }

    console.log('✅ [SearchModal] Final creator for', result.title, ':', creator)
    return creator
  }

  // ✅ RECHERCHE JEUX AVEC DÉVELOPPEURS ASSURÉS
  const searchGames = async (query: string): Promise<SearchResult[]> => {
    console.log('🎮 [SearchModal] Starting games search for:', query)
    
    try {
      const games = await rawgService.searchGames(query, 12)
      console.log('🎮 [SearchModal] RAWG returned', games.length, 'games')
      
      if (!games || games.length === 0) {
        console.log('🎮 [SearchModal] No games found')
        return []
      }

      // ✅ CONVERSION AVEC VÉRIFICATION STRICTE DES DÉVELOPPEURS
      const convertedGames = games.map(game => {
        const converted = rawgService.convertToAppFormat(game)
        
        console.log('🎮 [SearchModal] Converted game:', {
          title: converted.title,
          developer: converted.developer,
          author: converted.author,
          originalGame: {
            name: game.name,
            developers: game.developers?.map(d => d.name) || [],
            publishers: game.publishers?.map(p => p.name) || []
          }
        })
        
        return converted
      })

      console.log('✅ [SearchModal] Games conversion complete:', convertedGames.length, 'results')
      return convertedGames

    } catch (error) {
      console.error('❌ [SearchModal] Games search failed:', error)
      throw error
    }
  }

  // 🎬 RECHERCHE FILMS/SÉRIES
  const searchMoviesAndSeries = async (query: string): Promise<SearchResult[]> => {
    console.log('🎬 [SearchModal] Starting movies/series search for:', query)
    
    try {
      const movies = await omdbService.searchMoviesAndSeries(query, 1)
      console.log('🎬 [SearchModal] OMDB returned', movies.length, 'movies/series')
      
      if (!movies || movies.length === 0) {
        return []
      }

      const detailedMovies = await Promise.all(
        movies.slice(0, 8).map(async movie => {
          try {
            const movieDetails = await omdbService.getMovieDetails(movie.imdbID)
            
            if (movieDetails) {
              const converted = omdbService.convertToAppFormat(movieDetails)
              console.log('🎬 [SearchModal] Movie with details:', converted.title, '- Director:', converted.director)
              return converted
            } else {
              const converted = omdbService.convertToAppFormat(movie)
              return converted
            }
          } catch (error) {
            console.warn('🎬 [SearchModal] Failed details for:', movie.Title, error)
            return omdbService.convertToAppFormat(movie)
          }
        })
      )

      console.log('✅ [SearchModal] Movies conversion complete:', detailedMovies.length, 'results')
      return detailedMovies

    } catch (error) {
      console.error('❌ [SearchModal] Movies search failed:', error)
      throw error
    }
  }

  // 🎵 RECHERCHE MUSIQUE
  const searchMusic = async (query: string): Promise<SearchResult[]> => {
    console.log('🎵 [SearchModal] Starting music search for:', query)
    
    try {
      const albums = await musicService.searchAlbums(query, 20)
      console.log('🎵 [SearchModal] Music service returned:', albums.length, 'albums')
      
      if (!albums || albums.length === 0) {
        return []
      }

      const convertedAlbums = albums.map(album => {
        const converted = musicService.convertToAppFormat(album)
        console.log('🎵 [SearchModal] Converted album:', converted.title, 'by', converted.artist)
        return converted
      })

      console.log('✅ [SearchModal] Music conversion complete:', convertedAlbums.length, 'results')
      return convertedAlbums

    } catch (error) {
      console.error('❌ [SearchModal] Music search failed:', error)
      throw error
    }
  }

  // 📚 RECHERCHE LIVRES
  const searchBooks = async (query: string): Promise<SearchResult[]> => {
    console.log('📚 [SearchModal] Starting books search for:', query)
    
    try {
      const books = await googleBooksService.searchBooks(query, 15)
      console.log('📚 [SearchModal] Google Books returned:', books.length, 'books')
      
      if (!books || books.length === 0) {
        return []
      }

      const convertedBooks = books.map(book => {
        const converted = googleBooksService.convertToAppFormat(book)
        console.log('📚 [SearchModal] Converted book:', converted.title, 'by', converted.author)
        return converted
      })

      console.log('✅ [SearchModal] Books conversion complete:', convertedBooks.length, 'results')
      return convertedBooks

    } catch (error) {
      console.error('❌ [SearchModal] Books search failed:', error)
      throw error
    }
  }

  // ✅ RECHERCHE PRINCIPALE RÉÉCRITE
  const performSearch = async (searchQuery: string, category: string) => {
    if (!searchQuery.trim()) return
    
    console.log('🔍 [SearchModal] Starting comprehensive search for:', searchQuery, 'Category:', category)
    
    setLoading(true)
    setError(null)
    setSelectedIndex(-1)

    const allResults: SearchResult[] = []
    const errors: string[] = []

    try {
      const searchPromises: Promise<{ category: string, results: SearchResult[] }>[] = []

      // ✅ RECHERCHE JEUX AVEC DÉVELOPPEURS
      if (category === 'all' || category === 'games') {
        searchPromises.push(
          searchGames(searchQuery)
            .then(results => ({ category: 'games', results }))
            .catch(err => {
              console.error('❌ [SearchModal] Games search failed:', err)
              errors.push(`Games: ${err.message}`)
              return { category: 'games', results: [] }
            })
        )
      }

      // 🎬 RECHERCHE FILMS/SÉRIES
      if (category === 'all' || category === 'movies') {
        searchPromises.push(
          searchMoviesAndSeries(searchQuery)
            .then(results => ({ category: 'movies', results }))
            .catch(err => {
              console.error('❌ [SearchModal] Movies search failed:', err)
              errors.push(`Movies & TV: ${err.message}`)
              return { category: 'movies', results: [] }
            })
        )
      }

      // 🎵 RECHERCHE MUSIQUE
      if (category === 'all' || category === 'music') {
        searchPromises.push(
          searchMusic(searchQuery)
            .then(results => ({ category: 'music', results }))
            .catch(err => {
              console.error('❌ [SearchModal] Music search failed:', err)
              errors.push(`Music: ${err.message}`)
              return { category: 'music', results: [] }
            })
        )
      }

      // 📚 RECHERCHE LIVRES
      if (category === 'all' || category === 'books') {
        searchPromises.push(
          searchBooks(searchQuery)
            .then(results => ({ category: 'books', results }))
            .catch(err => {
              console.error('❌ [SearchModal] Books search failed:', err)
              errors.push(`Books: ${err.message}`)
              return { category: 'books', results: [] }
            })
        )
      }

      const results = await Promise.all(searchPromises)
      
      // ✅ AGRÉGATION ET VÉRIFICATION DES RÉSULTATS
      results.forEach(({ category: searchCategory, results: categoryResults }) => {
        console.log(`📊 [SearchModal] ${searchCategory.toUpperCase()} results:`, categoryResults.length)
        
                              categoryResults.forEach((result, index) => {
                        if (index < 3) { // Log seulement les 3 premiers pour éviter le spam
                          const creator = getCreator(result)
                          console.log(`  ${index + 1}. ${result.title} (${result.year}) by ${creator}`)
                        }
                      })
        
        allResults.push(...categoryResults)
      })

      // 🔧 TRI INTELLIGENT PAR PERTINENCE
      allResults.sort((a, b) => {
        const queryLower = searchQuery.toLowerCase()
        
        // 1. Correspondance exacte du titre
        const aTitleMatch = a.title.toLowerCase().includes(queryLower)
        const bTitleMatch = b.title.toLowerCase().includes(queryLower)
        
        if (aTitleMatch && !bTitleMatch) return -1
        if (!aTitleMatch && bTitleMatch) return 1
        
        // 2. Correspondance exacte du créateur
        const aCreator = getCreator(a).toLowerCase()
        const bCreator = getCreator(b).toLowerCase()
        const aCreatorMatch = aCreator.includes(queryLower)
        const bCreatorMatch = bCreator.includes(queryLower)
        
        if (aCreatorMatch && !bCreatorMatch) return -1
        if (!aCreatorMatch && bCreatorMatch) return 1
        
        // 3. Année (plus récent en premier)
        const yearDiff = (b.year || 0) - (a.year || 0)
        if (yearDiff !== 0) return yearDiff
        
        // 4. Rating
        return (b.rating || 0) - (a.rating || 0)
      })

      console.log('🎯 [SearchModal] FINAL RESULTS:', allResults.length, 'total')
              allResults.slice(0, 10).forEach((result, index) => {
                const creator = getCreator(result)
                console.log(`${index + 1}. ${result.title} (${result.year}) by ${creator} - ${result.category.toUpperCase()}`)
              })

      // Cache des résultats
      const cacheKey = `${category}-${searchQuery.toLowerCase()}`
      searchCache.set(cacheKey, allResults)

      setResults(allResults)

      if (errors.length > 0 && allResults.length === 0) {
        setError(`Search failed: ${errors.join(', ')}`)
      }

    } catch (error) {
      console.error('❌ [SearchModal] Global search error:', error)
      setError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, category: string) => {
      performSearch(searchQuery, category)
    }, 500),
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

    const cacheKey = `${activeCategory}-${query.toLowerCase()}`
    if (searchCache.has(cacheKey)) {
      const cachedResults = searchCache.get(cacheKey)!
      setResults(cachedResults)
      setSelectedIndex(-1)
      return
    }

    debouncedSearch(query, activeCategory)
  }, [query, activeCategory, debouncedSearch, searchCache])

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
    }
  }, [isOpen])

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
    console.log('✅ [SearchModal] Adding to library:', result.title, 'with status:', status)
    
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

  // Navigation au clavier
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
    console.log('🎯 [SearchModal] Opening detail for:', result.title, 'Category:', result.category)
    
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

  // Informations de catégorie
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'games': return { color: 'bg-green-100 text-green-700 border-green-200', icon: '🎮' }
      case 'movies': return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🎬' }
      case 'music': return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🎵' }
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

        {/* Filtres de catégorie */}
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

        {/* Résultats */}
        <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
          {/* État d'erreur */}
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

          {/* État de chargement */}
          {loading && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-600">
                <Loader2 className="animate-spin" size={20} />
                <span>Searching{isMobile() ? ' (mobile optimized)' : ''}...</span>
              </div>
            </div>
          )}

          {/* Aucun résultat */}
          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              <Search className="mx-auto mb-2" size={24} />
              <p>No results found for "<span className="text-gray-900 font-medium">{query}</span>"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          )}

          {/* Liste des résultats */}
          {!loading && !error && results.length > 0 && (
            <div className="p-4 space-y-2">
              {results.map((result, index) => {
                const categoryInfo = getCategoryInfo(result.category)
                const isSelected = index === selectedIndex
                const libraryItem = getLibraryItem(result.id)
                const isInLibrary = !!libraryItem
                const isAdding = addingItem === result.id
                const wasJustAdded = justAddedItems.has(result.id)
                const creator = getCreator(result)
                
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

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-gray-900 font-medium truncate flex-1">
                          {result.title}
                          {result.isSeries && (
                            <span className="ml-2 text-purple-600 text-xs"> • TV Series</span>
                          )}
                          {result.year >= 2024 && (
                            <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">NEW</span>
                          )}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color} flex-shrink-0`}>
                          {result.category === 'movies' ? (result.isSeries ? 'TV' : 'Film') : result.category}
                        </span>
                      </div>
                      
                      {/* ✅ AFFICHAGE DU CRÉATEUR AMÉLIORÉ */}
                      <p className="text-gray-600 text-sm truncate font-medium" title={creator}>
                        {creator}
                      </p>
                      
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
                        {result.isSeries && result.totalSeasons && (
                          <>
                            <span>•</span>
                            <span>{result.totalSeasons} season{result.totalSeasons > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Boutons d'action avec feedback */}
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
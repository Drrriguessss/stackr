// src/components/SearchModal.tsx - VERSION COMPLÈTE CORRIGÉE
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Star, Loader2, WifiOff, Check } from 'lucide-react'
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

  // ✅ FONCTION getCreator COMPLÈTEMENT RÉÉCRITE ET CORRIGÉE
  const getCreator = (result: SearchResult): string => {
    console.log('🔍 [SearchModal] Getting creator for:', result.title, 'Category:', result.category)
    console.log('🔍 [SearchModal] Available fields:', {
      author: result.author,
      artist: result.artist, 
      director: result.director,
      developer: result.developer,
      developers: result.developers,
      publishers: result.publishers
    })

    let creator = ''

    switch (result.category) {
      case 'games':
        // SIMPLIFIED: Since we now fetch full details, developer should always be set
        if (result.developer && result.developer !== 'Unknown Developer') {
          creator = result.developer
          console.log('🎮 ✅ Found developer:', creator)
        } else {
          creator = 'Unknown Developer'
          console.log('🎮 ❌ No developer found for:', result.title)
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

    console.log('✅ [SearchModal] Final creator for', result.title, ':', creator)
    return creator
  }

  // ✅ COMPLETELY REWRITTEN GAME SEARCH WITH DEVELOPER FETCHING
  const searchGames = async (query: string): Promise<SearchResult[]> => {
    console.log('🎮 [SearchModal] Starting complete game search for:', query)
    
    const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
    const currentYear = new Date().getFullYear()
    
    try {
      // Search for games including recent ones (up to next year for upcoming games)
      // 🚀 OPTIMISATION: Réduit à 8 résultats pour économiser l'API
      const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=8&dates=2000-01-01,${currentYear + 1}-12-31`
      
      console.log('🎮 [SearchModal] Searching with URL:', searchUrl)
      const cacheKey = `games-search-${encodeURIComponent(query)}`
      
      let data
      try {
        data = await fetchWithCache(searchUrl, cacheKey)
        console.log('🎮 [SearchModal] API Response:', data)
      } catch (error) {
        console.error('🎮 [SearchModal] Cache fetch failed, trying direct:', error)
        // Fallback: essayer fetch direct si le cache échoue
        const response = await fetch(searchUrl)
        if (!response.ok) {
          throw new Error(`Direct fetch failed: ${response.status}`)
        }
        data = await response.json()
      }
      
      // Vérifier si l'API retourne une erreur de limite
      if (data.error && data.error.includes('API limit')) {
        console.error('🎮 [SearchModal] API limit reached, using fallback')
        throw new Error('API_LIMIT_REACHED')
      }
      
      if (!data.results || data.results.length === 0) {
        return []
      }

      // 🚀 OPTIMISATION: Ne récupérer les détails que pour les 3 premiers résultats
      const topResults = data.results.slice(0, 3)
      const remainingResults = data.results.slice(3)
      
      // Fetch detailed information only for top 3 games to save API calls
      const detailedTopGames = await Promise.all(
        topResults.map(async (game: any) => {
          try {
            // Fetch full game details to get developer information
            const detailUrl = `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`
            const cacheKey = `game-detail-${game.id}`
            const detailData = await fetchWithCache(detailUrl, cacheKey)
              console.log(`🎮 [SearchModal] Got details for ${game.name}:`, {
                developers: detailData.developers,
                publishers: detailData.publishers
              })
              
              // Use detailed data which includes developers
              return detailData
          } catch (error) {
            console.warn(`🎮 [SearchModal] Failed to get details for ${game.name}:`, error)
          }
          
          // Fallback to basic game data if detail fetch fails
          return game
        })
      )
      
      // Combiner les résultats détaillés + les résultats basiques
      const detailedGames = [...detailedTopGames, ...remainingResults]

      // Convert to our app format with proper developer information
      const convertedGames: SearchResult[] = detailedGames.map((game: any) => {
        // Extract developer name from developers array
        let developerName = 'Unknown Developer'
        if (game.developers && game.developers.length > 0) {
          developerName = game.developers[0].name
        } else if (game.publishers && game.publishers.length > 0) {
          // Fallback to publisher if no developer
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
          
          // Set all developer fields to ensure it's displayed
          developer: developerName,
          author: developerName, // For compatibility
          
          // Preserve the full arrays too
          developers: game.developers || [],
          publishers: game.publishers || [],
          genres: game.genres || [],
          
          // Additional game data
          released: game.released,
          platforms: game.platforms || [],
          metacritic: game.metacritic,
          rating_count: game.rating_count || 0,
        }
        
        console.log(`🎮 [SearchModal] Converted: ${converted.title} by ${converted.developer} (${converted.year})`)
        return converted
      })

      return convertedGames

    } catch (error) {
      console.error('❌ [SearchModal] Game search completely failed:', error)
      throw error
    }
  }

  // 🎬 RECHERCHE FILMS/SÉRIES - Updated to use optimalMovieAPI logic
  const searchMoviesAndSeries = async (query: string): Promise<SearchResult[]> => {
    console.log('🎬 [SearchModal] Starting movies/series search for:', query)
    
    try {
      // Use the same hybrid approach as optimalMovieAPI.ts
      
      // Primary: TMDb search (same logic as optimalMovieAPI.ts line 118-137)
      const tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      if (tmdbApiKey) {
        try {
          const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`
          
          const response = await fetch(tmdbUrl)
          if (response.ok) {
            const data = await response.json()
            const results = data.results || []
            
            // Filter out people and limit results (same as optimalMovieAPI)
            const filteredResults = results
              .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
              .slice(0, 8) // Limit to 8 results
            
            if (filteredResults.length > 0) {
              console.log('🎬 [SearchModal] TMDb results found:', filteredResults.length)
              
              // Convert TMDb results to SearchResult format
              const convertedResults: SearchResult[] = filteredResults.map((item: any) => {
                const isMovie = item.media_type === 'movie'
                
                // Try poster first, then backdrop as fallback for image
                let imageUrl: string | undefined
                if (item.poster_path) {
                  imageUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`
                } else if (item.backdrop_path) {
                  imageUrl = `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
                }
                
                const releaseDate = isMovie ? item.release_date : item.first_air_date
                
                // Convert rating from /10 to /5
                const rating = item.vote_average ? Number((item.vote_average / 2).toFixed(1)) : 0
                
                // Extract year
                const year = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear()
                
                // Map genre IDs to names (basic mapping for common genres)
                const genreMap: { [key: number]: string } = {
                  28: 'Action', 35: 'Comedy', 18: 'Drama', 27: 'Horror',
                  10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 16: 'Animation',
                  12: 'Adventure', 14: 'Fantasy', 36: 'History', 10752: 'War',
                  80: 'Crime', 99: 'Documentary', 10751: 'Family', 9648: 'Mystery'
                }
                
                const genreName = item.genre_ids && item.genre_ids.length > 0 
                  ? genreMap[item.genre_ids[0]] || 'Entertainment'
                  : 'Entertainment'
                
                console.log(`🎬 [SearchModal] TMDb result: ${item.title || item.name}`, {
                  poster_path: item.poster_path,
                  backdrop_path: item.backdrop_path,
                  imageUrl: imageUrl
                })
                
                return {
                  id: `movie-${item.id}`,
                  title: isMovie ? item.title : item.name,
                  name: isMovie ? item.title : item.name,
                  category: 'movies' as const,
                  year,
                  rating,
                  image: imageUrl,
                  director: 'Director', // Will be enriched later if needed
                  author: 'Director',
                  genre: genreName,
                  isSeries: !isMovie,
                  // Additional TMDb data
                  overview: item.overview,
                  popularity: item.popularity || 0,
                  vote_count: item.vote_count || 0,
                  poster_path: item.poster_path,
                  backdrop_path: item.backdrop_path
                }
              })
              
              // Sort by popularity (same as optimalMovieAPI.ts line 99-103)
              const sortedResults = convertedResults.sort((a, b) => {
                const popA = a.popularity || 0
                const popB = b.popularity || 0
                return popB - popA
              })
              
              console.log('✅ [SearchModal] TMDb conversion complete:', sortedResults.length, 'results')
              return sortedResults
            }
          }
        } catch (tmdbError) {
          console.warn('🎬 [SearchModal] TMDb search failed, falling back to OMDb:', tmdbError)
        }
      }
      
      // Fallback: OMDb search (same as optimalMovieAPI.ts line 109-110)
      console.log('🎬 [SearchModal] Falling back to OMDb')
      const movies = await omdbService.searchMoviesAndSeries(query, 1)
      console.log('🎬 [SearchModal] OMDb returned', movies.length, 'movies/series')
      
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

      console.log('✅ [SearchModal] OMDb conversion complete:', detailedMovies.length, 'results')
      return detailedMovies

    } catch (error) {
      console.error('❌ [SearchModal] Movies search failed:', error)
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

  // 🎵 RECHERCHE MUSIQUE
  const searchMusicWithCategory = async (query: string): Promise<SearchResult[]> => {
    console.log('🎵 [SearchModal] Starting music search for:', query)
    
    try {
      const musicItems = await musicServiceV2.searchMusic(query, 20)
      console.log('🎵 [SearchModal] Music service returned:', musicItems.length, 'items')
      
      if (!musicItems || musicItems.length === 0) {
        return []
      }

      console.log('✅ [SearchModal] Music conversion complete:', musicItems.length, 'results')
      return musicItems

    } catch (error) {
      console.error('❌ [SearchModal] Music search failed:', error)
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

      // ✅ RECHERCHE JEUX AVEC DÉVELOPPEURS ET JEUX RÉCENTS
      if (category === 'all' || category === 'games') {
        searchPromises.push(
          searchGames(searchQuery)
            .then(results => ({ category: 'games', results }))
            .catch(err => {
              console.error('❌ [SearchModal] Games search failed:', err)
              
              // Fallback vers les données statiques si l'API échoue
              if (err.message.includes('API_LIMIT_REACHED') || err.message.includes('API limit')) {
                console.log('🎮 [SearchModal] Using fallback sample data for games')
                // Importer les données statiques
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
          searchMusicWithCategory(searchQuery)
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

      // 🔧 TRI INTELLIGENT: PERTINENCE AVANT DATE
      allResults.sort((a, b) => {
        const queryLower = searchQuery.toLowerCase()
        
        // 1. PRIORITÉ ABSOLUE: Correspondance exacte du titre
        const aExactTitle = a.title.toLowerCase() === queryLower
        const bExactTitle = b.title.toLowerCase() === queryLower
        
        if (aExactTitle && !bExactTitle) return -1
        if (!aExactTitle && bExactTitle) return 1
        
        // 2. Correspondance partielle forte du titre (contient le mot-clé)
        const aTitleContains = a.title.toLowerCase().includes(queryLower)
        const bTitleContains = b.title.toLowerCase().includes(queryLower)
        
        if (aTitleContains && !bTitleContains) return -1
        if (!aTitleContains && bTitleContains) return 1
        
        // 3. Pour les résultats qui matchent le titre, prioriser les récents
        if (aTitleContains && bTitleContains) {
          const currentYear = new Date().getFullYear()
          const aIsRecent = a.year >= currentYear
          const bIsRecent = b.year >= currentYear
          
          if (aIsRecent && !bIsRecent) return -1
          if (!aIsRecent && bIsRecent) return 1
          
          // Année (plus récent en premier) pour les titres pertinents
          if (a.year !== b.year) return (b.year || 0) - (a.year || 0)
        }
        
        // 4. Correspondance créateur (développeur, auteur, etc.)
        const aCreator = getCreator(a).toLowerCase()
        const bCreator = getCreator(b).toLowerCase()
        const aCreatorMatch = aCreator.includes(queryLower)
        const bCreatorMatch = bCreator.includes(queryLower)
        
        if (aCreatorMatch && !bCreatorMatch) return -1
        if (!aCreatorMatch && bCreatorMatch) return 1
        
        // 5. Rating final
        return (b.rating || 0) - (a.rating || 0)
      })

      console.log('🎯 [SearchModal] FINAL RESULTS:', allResults.length, 'total')
      allResults.slice(0, 10).forEach((result, index) => {
        const creator = getCreator(result)
        const isRecent = result.year >= new Date().getFullYear() ? '🔥' : ''
        console.log(`${index + 1}. ${result.title} (${result.year}) ${isRecent} by ${creator} - ${result.category.toUpperCase()}`)
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
    }, 1000), // Augmenté à 1000ms pour réduire les appels
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
      // Pass the full ID with prefix (album-123456 or track-123456)
      console.log('🎵 [SearchModal] Opening music detail for:', result.title, 'ID:', result.id)
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center sm:items-start justify-center sm:pt-16 px-4">
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

        {/* Filtres de catégorie - masqués pour la recherche de livres */}
        {activeCategory !== 'books' && (
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
        )}

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

          {/* Liste des résultats OPTIMISÉE MOBILE */}
          {!loading && !error && results.length > 0 && (
            <div className="p-4 space-y-3">
              {results.map((result, index) => {
                const categoryInfo = getCategoryInfo(result.category)
                const isSelected = index === selectedIndex
                const libraryItem = getLibraryItem(result.id)
                const isInLibrary = !!libraryItem
                const isAdding = addingItem === result.id
                const wasJustAdded = justAddedItems.has(result.id)
                const creator = getCreator(result) // ✅ UTILISATION DE LA FONCTION CORRIGÉE
                const isRecent = result.year >= new Date().getFullYear()
                
                return (
                  <div
                    key={result.id}
                    className={`flex items-start space-x-3 p-4 rounded-xl transition-all cursor-pointer border ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                    onClick={() => handleSelectResult(result)}
                  >
                    {/* Image plus grande pour mobile */}
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 shadow-sm relative">
                      {result.image ? (
                        <>
                          <img
                            src={result.image}
                            alt={result.title}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            loading="lazy"
                            onError={(e) => {
                              console.warn(`🖼️ [SearchModal] Image failed to load for ${result.title}:`, result.image)
                              const imgElement = e.target as HTMLImageElement
                              // Hide the broken image
                              imgElement.style.display = 'none'
                              // Show the fallback icon
                              const fallbackElement = imgElement.nextElementSibling as HTMLElement
                              if (fallbackElement) {
                                fallbackElement.classList.remove('hidden')
                              }
                            }}
                          />
                          <div className="w-full h-full flex items-center justify-center text-xl hidden absolute inset-0 bg-gray-100">
                            {categoryInfo.icon}
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          {categoryInfo.icon}
                        </div>
                      )}
                    </div>

                    {/* Contenu avec titres complets */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Titre complet sans truncate */}
                      <div className="space-y-1">
                        <h3 className="text-gray-900 font-semibold text-base leading-tight">
                          {result.title}
                          {result.isSeries && (
                            <span className="ml-2 text-purple-600 text-sm"> • TV Series</span>
                          )}
                          {isRecent && (
                            <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">🔥 NEW</span>
                          )}
                        </h3>
                        
                        {/* ✅ CRÉATEUR AFFICHÉ CORRECTEMENT */}
                        <p className="text-gray-600 text-sm font-medium leading-tight" title={creator}>
                          by {creator}
                        </p>
                      </div>
                      
                      {/* Meta informations sur une ligne */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color} flex-shrink-0`}>
                            {result.category === 'movies' ? (result.isSeries ? 'TV' : 'Film') : result.category}
                          </span>
                          
                          <span className={isRecent ? 'font-semibold text-green-600' : result.year >= 2020 ? 'font-medium text-blue-600' : ''}>
                            {result.year}
                          </span>
                          
                          {result.genre && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-20">{result.genre}</span>
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

                      {/* Boutons d'action repositionnés */}
                      <div className="flex justify-end">
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
                          <div className="relative">
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
                          </div>
                        )}
                      </div>
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
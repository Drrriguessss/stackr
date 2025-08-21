import React, { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, Star, Edit3, Calendar, TrendingUp, Hash, User, Clock, X, Plus, Download, Grid3X3, List, Gamepad2, Film, Music, BookOpen, Dice6 } from 'lucide-react'
import type { MediaCategory, MediaStatus, LibraryItem } from '@/types'

// Local types
type SortOption = 'date_added' | 'date_updated' | 'title' | 'creator' | 'average_rating' | 'number_of_ratings' | 'release_year'

// Props interface for LibrarySection
interface LibrarySectionProps {
  library?: LibraryItem[]
  onAddToLibrary?: (item: any, status: MediaStatus) => void
  onUpdateItem?: (id: string, updates: Partial<LibraryItem>) => void
  onDeleteItem?: (id: string) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenBoardGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  onOpenSearch?: () => void
}

// ✅ FETCH DEVELOPER INFO FROM API FOR GAMES
const fetchDeveloperInfo = async (gameId: string, gameName: string): Promise<string> => {
  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  
  try {
    // Extract numeric ID from game ID
    let rawgId = gameId
    if (gameId.startsWith('game-')) {
      rawgId = gameId.replace('game-', '')
    }
    
    // If ID is not numeric, search by name
    if (isNaN(Number(rawgId))) {
      console.log(`🎮 [LibrarySection] Searching for game: ${gameName}`)
      const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(gameName)}&page_size=1`
      const searchResponse = await fetch(searchUrl)
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.results && searchData.results.length > 0) {
          rawgId = searchData.results[0].id.toString()
        } else {
          throw new Error('Game not found in search')
        }
      }
    }
    
    // Fetch game details
    console.log(`🎮 [LibrarySection] Fetching details for game ID: ${rawgId}`)
    const detailUrl = `https://api.rawg.io/api/games/${rawgId}?key=${RAWG_API_KEY}`
    const detailResponse = await fetch(detailUrl)
    
    if (detailResponse.ok) {
      const gameData = await detailResponse.json()
      console.log(`🎮 [LibrarySection] Game details for ${gameName}:`, {
        developers: gameData.developers,
        publishers: gameData.publishers
      })
      
      // Extract developer name
      if (gameData.developers && gameData.developers.length > 0) {
        const developerName = gameData.developers[0].name
        console.log(`🎮 [LibrarySection] Found developer: ${developerName}`)
        return developerName
      } else if (gameData.publishers && gameData.publishers.length > 0) {
        const publisherName = gameData.publishers[0].name
        console.log(`🎮 [LibrarySection] Using publisher as developer: ${publisherName}`)
        return publisherName
      }
    }
  } catch (error) {
    console.error(`🎮 [LibrarySection] Failed to fetch developer for ${gameName}:`, error)
  }
  
  return 'Unknown Developer'
}

// ✅ FETCH DIRECTOR INFO FROM API FOR MOVIES
const fetchDirectorInfo = async (movieId: string, movieTitle: string): Promise<string> => {
  const OMDB_API_KEY = '649f9a63'
  
  try {
    // Extract IMDB ID from movie ID
    let imdbId = movieId
    if (movieId.startsWith('movie-')) {
      imdbId = movieId.replace('movie-', '')
    }
    
    // If not a valid IMDB ID, search by title
    if (!imdbId.startsWith('tt')) {
      console.log(`🎬 [LibrarySection] Searching for movie: ${movieTitle}`)
      const searchUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(movieTitle)}&type=movie`
      const searchResponse = await fetch(searchUrl)
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.Search && searchData.Search.length > 0) {
          imdbId = searchData.Search[0].imdbID
        } else {
          throw new Error('Movie not found in search')
        }
      }
    }
    
    // Fetch movie details
    console.log(`🎬 [LibrarySection] Fetching details for movie ID: ${imdbId}`)
    const detailUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`
    const detailResponse = await fetch(detailUrl)
    
    if (detailResponse.ok) {
      const movieData = await detailResponse.json()
      console.log(`🎬 [LibrarySection] Movie details for ${movieTitle}:`, {
        Director: movieData.Director,
        Title: movieData.Title
      })
      
      // Extract director name
      if (movieData.Director && movieData.Director !== 'N/A' && movieData.Director.trim() !== '') {
        const directorName = movieData.Director
        console.log(`🎬 [LibrarySection] Found director: ${directorName}`)
        return directorName
      }
    }
  } catch (error) {
    console.error(`🎬 [LibrarySection] Failed to fetch director for ${movieTitle}:`, error)
  }
  
  return 'Unknown Director'
}

// ✅ SIMPLE getCreator FOR SORTING (no API calls)
const getCreator = (item: LibraryItem): string => {
  switch (item.category) {
    case 'games':
      if (item.developer && item.developer !== 'Unknown Developer' && item.developer !== 'Game Studio') {
        return item.developer
      } else if (item.developers && item.developers.length > 0) {
        const mainDev = item.developers[0].name
        if (mainDev && mainDev.trim() !== '' && mainDev !== 'Unknown' && mainDev !== 'Developer' && mainDev !== 'Game Studio') {
          return mainDev
        }
      } else if (item.author && item.author !== 'Unknown Developer' && item.author !== 'Developer' && item.author !== 'Unknown' && item.author !== 'Game Studio') {
        return item.author
      }
      return 'Unknown Developer'
    case 'movies':
      return item.director || 'Unknown Director'
    case 'music':
      return item.artist || 'Unknown Artist'
    case 'books':
      return item.author || 'Unknown Author'
    default:
      return item.author || item.artist || item.director || item.developer || 'Unknown Creator'
  }
}

// ✅ ENHANCED getCreator WITH CACHING AND STATE MANAGEMENT FOR GAMES AND MOVIES
const getCreatorForItem = (
  item: LibraryItem, 
  fetchAndUpdateDeveloper: (item: LibraryItem) => void, 
  fetchAndUpdateDirector: (item: LibraryItem) => void,
  developerCache: Record<string, string>, 
  directorCache: Record<string, string>,
  fetchingDevelopers: Set<string>,
  fetchingDirectors: Set<string>
): string => {
  let creator = ''

  switch (item.category) {
    case 'games':
      // First check cache
      if (developerCache[item.id]) {
        creator = developerCache[item.id]
        console.log('🎮 ✅ Found cached developer:', creator)
      }
      // Then check existing item data
      else if (item.developer && item.developer !== 'Unknown Developer' && item.developer !== 'Game Studio') {
        creator = item.developer
        console.log('🎮 ✅ Found existing developer:', creator)
      } else if (item.developers && item.developers.length > 0) {
        const mainDev = item.developers[0].name
        if (mainDev && mainDev.trim() !== '' && mainDev !== 'Unknown' && mainDev !== 'Developer' && mainDev !== 'Game Studio') {
          creator = mainDev
          console.log('🎮 ✅ Found developer from array:', creator)
        }
      } else if (item.author && item.author !== 'Unknown Developer' && item.author !== 'Developer' && item.author !== 'Unknown' && item.author !== 'Game Studio') {
        creator = item.author
        console.log('🎮 ✅ Found developer from author:', creator)
      }
      
      // If no valid developer found, trigger fetch
      if (!creator || creator === 'Unknown Developer' || creator === 'Game Studio') {
        if (fetchingDevelopers.has(item.id)) {
          creator = 'Loading...'
        } else {
          // ❌ CRITIQUE: NE JAMAIS DÉCLENCHER DE FETCH PENDANT LE RENDER!
          // Cela cause une boucle infinie de re-renders
          // console.log(`🎮 [LibrarySection] No developer info found for ${item.title}`)
          // fetchAndUpdateDeveloper(item) // DÉSACTIVÉ - causait 1000+ requêtes
          creator = item.developer || 'Unknown Developer'
        }
      }
      break

    case 'movies':
      // First check cache
      if (directorCache[item.id]) {
        creator = directorCache[item.id]
        console.log('🎬 ✅ Found cached director:', creator)
      }
      // Then check existing item data
      else if (item.director && item.director !== 'Unknown Director' && item.director !== 'N/A' && item.director !== 'Unknown') {
        creator = item.director
        console.log('🎬 ✅ Found existing director:', creator)
      } else if (item.author && item.author !== 'Unknown Director' && item.author !== 'Director' && item.author !== 'Unknown' && item.author !== 'N/A') {
        creator = item.author
        console.log('🎬 ✅ Found director from author:', creator)
      }
      
      // If no valid director found, trigger fetch
      if (!creator || creator === 'Unknown Director' || creator === 'N/A') {
        if (fetchingDirectors.has(item.id)) {
          creator = 'Loading...'
        } else {
          // ❌ CRITIQUE: NE JAMAIS DÉCLENCHER DE FETCH PENDANT LE RENDER!
          // console.log(`🎬 [LibrarySection] No director info found for ${item.title}`)
          // fetchAndUpdateDirector(item) // DÉSACTIVÉ - causait des requêtes infinies
          creator = item.director || 'Unknown Director'
        }
      }
      break

    case 'music':
      creator = item.artist || 'Unknown Artist'
      break

    case 'books':
      creator = item.author || 'Unknown Author'
      break

    case 'boardgames':
      creator = item.designer || item.developer || 'Unknown Designer'
      break

    default:
      creator = item.author || item.artist || item.director || item.developer || item.designer || 'Unknown Creator'
      break
  }

  return creator
}

// Sample data
const sampleLibrary: LibraryItem[] = [
  {
    id: '1',
    title: 'Big Data: A Revolution That Will Transform How We Live, Work, and Think',
    author: 'Viktor Mayer-Schönberger',
    year: 2013,
    rating: 4.2,
    userRating: 4,
    genre: 'Technology',
    category: 'books',
    status: 'want-to-play',
    addedAt: '2025-01-15T10:00:00Z',
    dateUpdated: '2025-01-15T10:00:00Z',
    numberOfRatings: 3656,
    image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1374478376i/15815598.jpg'
  },
  {
    id: '2', 
    title: 'The Buddha and the Badass: The Secret Spiritual Art of Succeeding at Work',
    author: 'Vishen Lakhiani',
    year: 2020,
    rating: 3.9,
    userRating: 3,
    genre: 'Business',
    category: 'books',
    status: 'want-to-play',
    addedAt: '2025-01-14T15:30:00Z',
    dateUpdated: '2025-01-14T15:30:00Z',
    numberOfRatings: 1981,
    image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1576509232i/48855821.jpg'
  },
  {
    id: '3',
    title: 'Ori and the Will of the Wisps',
    developer: 'Moon Studios',
    author: 'Moon Studios',
    year: 2020,
    rating: 4.8,
    userRating: 5,
    genre: 'Platformer',
    category: 'games',
    status: 'completed',
    addedAt: '2025-01-10T12:00:00Z',
    dateUpdated: '2025-01-12T18:00:00Z',
    dateCompleted: '2025-01-12T18:00:00Z',
    numberOfRatings: 12500,
    image: 'https://media.rawg.io/media/games/718/71891291067b8bb23ad6ed6806b83881.jpg',
    // ✅ DONNÉES COMPLÈTES DE L'API
    developers: [{ name: 'Moon Studios' }],
    publishers: [{ name: 'Xbox Game Studios' }],
    additionalInfo: {
      platform: 'Xbox Game Pass',
      gamePass: true,
      freeToPlay: false,
      purchasePrice: 'Game Pass'
    }
  },
  {
    id: '4',
    title: 'The Last of Us Part II',
    developer: 'Naughty Dog',
    author: 'Naughty Dog',
    year: 2020,
    rating: 4.6,
    userRating: 4,
    genre: 'Action-Adventure',
    category: 'games',
    status: 'completed',
    addedAt: '2025-01-08T09:00:00Z',
    dateUpdated: '2025-01-11T20:30:00Z',
    dateCompleted: '2025-01-11T20:30:00Z',
    numberOfRatings: 89000,
    image: 'https://media.rawg.io/media/games/d82/d82990b9c67ba0d2d09d4e6fa88885a7.jpg',
    // ✅ DONNÉES COMPLÈTES DE L'API
    developers: [{ name: 'Naughty Dog' }],
    publishers: [{ name: 'Sony Interactive Entertainment' }],
    additionalInfo: {
      platform: 'PlayStation 5',
      gamePass: false,
      freeToPlay: false,
      purchasePrice: '€69.99'
    }
  }
]

const LibrarySection: React.FC<LibrarySectionProps> = ({
  library: propLibrary = [],
  onAddToLibrary,
  onUpdateItem,
  onDeleteItem,
  onOpenGameDetail,
  onOpenBoardGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  onOpenSearch
}) => {
  // ✅ STATE FOR TRACKING DEVELOPER AND DIRECTOR FETCHING
  const [developerCache, setDeveloperCache] = useState<Record<string, string>>({})
  const [directorCache, setDirectorCache] = useState<Record<string, string>>({})
  const [fetchingDevelopers, setFetchingDevelopers] = useState<Set<string>>(new Set())
  const [fetchingDirectors, setFetchingDirectors] = useState<Set<string>>(new Set())
  const fetchTimeouts = useRef<Record<string, NodeJS.Timeout>>({})
  
  // ✅ FUNCTION TO FETCH AND UPDATE DEVELOPER INFO
  const fetchAndUpdateDeveloper = async (item: LibraryItem) => {
    const itemId = item.id
    
    // Check if already fetching or cached
    if (fetchingDevelopers.has(itemId) || developerCache[itemId]) {
      return
    }
    
    // Mark as fetching
    setFetchingDevelopers(prev => new Set([...prev, itemId]))
    
    try {
      const developer = await fetchDeveloperInfo(itemId, item.title)
      
      if (developer && developer !== 'Unknown Developer') {
        // Cache the result
        setDeveloperCache(prev => ({
          ...prev,
          [itemId]: developer
        }))
        
        // Update the library item if update function is available
        if (onUpdateItem) {
          onUpdateItem(itemId, { developer })
        }
      }
    } catch (error) {
      console.error(`Failed to fetch developer for ${item.title}:`, error)
    } finally {
      // Remove from fetching set
      setFetchingDevelopers(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  // ✅ FUNCTION TO FETCH AND UPDATE DIRECTOR INFO
  const fetchAndUpdateDirector = async (item: LibraryItem) => {
    const itemId = item.id
    
    // Check if already fetching or cached
    if (fetchingDirectors.has(itemId) || directorCache[itemId]) {
      return
    }
    
    // Mark as fetching
    setFetchingDirectors(prev => new Set([...prev, itemId]))
    
    try {
      const director = await fetchDirectorInfo(itemId, item.title)
      
      if (director && director !== 'Unknown Director') {
        // Cache the result
        setDirectorCache(prev => ({
          ...prev,
          [itemId]: director
        }))
        
        // Update the library item if update function is available
        if (onUpdateItem) {
          onUpdateItem(itemId, { director })
        }
      }
    } catch (error) {
      console.error(`Failed to fetch director for ${item.title}:`, error)
    } finally {
      // Remove from fetching set
      setFetchingDirectors(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  // ✅ FONCTION POUR RÉCUPÉRER MANUELLEMENT LES INFOS MANQUANTES
  const handleFetchMissingInfo = async () => {
    if (fetchingMissingInfo) return

    setFetchingMissingInfo(true)
    
    try {
      // Identifier les items avec des informations manquantes
      const itemsNeedingInfo = library.filter(item => {
        if (item.category === 'games') {
          return !item.developer || 
                 item.developer === 'Unknown Developer' || 
                 item.developer === 'Game Studio' ||
                 !developerCache[item.id]
        }
        if (item.category === 'movies') {
          return !item.director || 
                 item.director === 'Unknown Director' || 
                 item.director === 'N/A' ||
                 !directorCache[item.id]
        }
        return false
      })

      console.log(`🔄 [Manual Fetch] Found ${itemsNeedingInfo.length} items needing info`)

      // Traiter les items par lots pour éviter la surcharge
      const batchSize = 3
      const batches = []
      for (let i = 0; i < itemsNeedingInfo.length; i += batchSize) {
        batches.push(itemsNeedingInfo.slice(i, i + batchSize))
      }

      for (const batch of batches) {
        const promises = batch.map(item => {
          if (item.category === 'games') {
            return fetchAndUpdateDeveloper(item)
          } else if (item.category === 'movies') {
            return fetchAndUpdateDirector(item)
          }
          return Promise.resolve()
        })

        // Attendre que le lot soit terminé avant de passer au suivant
        await Promise.all(promises)
        
        // Pause entre les lots pour respecter les limites d'API
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      console.log('✅ [Manual Fetch] All missing info fetched successfully')
    } catch (error) {
      console.error('❌ [Manual Fetch] Error fetching missing info:', error)
    } finally {
      setFetchingMissingInfo(false)
    }
  }
  
  // ✅ UTILISER UNIQUEMENT LES PROPS - PAS D'ÉTAT LOCAL POUR LA BIBLIOTHÈQUE
  const library = propLibrary.length > 0 ? propLibrary : sampleLibrary
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date_added')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showAddInfoModal, setShowAddInfoModal] = useState<string | null>(null)
  const [showGameSheet, setShowGameSheet] = useState<string | null>(null)
  const [gameSheetData, setGameSheetData] = useState({
    datePlayed: '',
    platform: '',
    accessMethod: '',
    purchasePrice: '',
    customTags: [] as string[],
    friendsPlayed: [] as any[],
    personalRating: 0,
    personalReview: ''
  })
  const [showMusicSheet, setShowMusicSheet] = useState<string | null>(null)
  const [musicSheetData, setMusicSheetData] = useState({
    dateListened: '',
    platform: '',
    format: '',
    purchasePrice: '',
    personalRating: 0,
    personalReview: '',
    favoriteTrack: ''
  })
  const [showBookSheet, setShowBookSheet] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [bookSheetData, setBookSheetData] = useState({
    dateRead: '',
    location: '',
    mood: '',
    format: 'physical',
    friendsRead: [] as number[],
    personalRating: 0,
    personalReview: ''
  })
  const [showLocalSearchModal, setShowLocalSearchModal] = useState(false)
  const [fetchingMissingInfo, setFetchingMissingInfo] = useState(false)
  const [viewType, setViewType] = useState<'list' | 'grid'>('list')

  // Load existing sheet data when opening modals
  useEffect(() => {
    if (showGameSheet) {
      console.log('🔍 Loading game sheet for item:', showGameSheet)
      const item = library.find(item => item.id === showGameSheet)
      console.log('🔍 Found library item:', item)
      console.log('🔍 Additional info:', item?.additionalInfo)
      console.log('🔍 Game sheet data:', item?.additionalInfo?.gameSheet)
      
      if (item?.additionalInfo?.gameSheet) {
        console.log('✅ Loading existing game sheet data')
        setGameSheetData(item.additionalInfo.gameSheet)
      } else {
        console.log('➕ No existing data, using defaults')
        // Reset to default values
        setGameSheetData({
          datePlayed: '',
          platform: '',
          accessMethod: '',
          purchasePrice: '',
          customTags: [],
          friendsPlayed: [],
          personalRating: 0,
          personalReview: ''
        })
      }
    }
  }, [showGameSheet, library])

  useEffect(() => {
    if (showMusicSheet) {
      const item = library.find(item => item.id === showMusicSheet)
      if (item?.additionalInfo?.musicSheet) {
        setMusicSheetData(item.additionalInfo.musicSheet)
      } else {
        // Reset to default values
        setMusicSheetData({
          dateListened: '',
          platform: '',
          format: '',
          purchasePrice: '',
          personalRating: 0,
          personalReview: '',
          favoriteTrack: ''
        })
      }
    }
  }, [showMusicSheet, library])

  useEffect(() => {
    if (showBookSheet) {
      const item = library.find(item => item.id === showBookSheet)
      if (item?.additionalInfo?.bookSheet) {
        setBookSheetData(item.additionalInfo.bookSheet)
      } else {
        // Reset to default values
        setBookSheetData({
          dateRead: '',
          location: '',
          mood: '',
          format: 'physical',
          friendsRead: [],
          personalRating: 0,
          personalReview: ''
        })
      }
    }
  }, [showBookSheet, library])

  // Reset calendar states when modal closes
  useEffect(() => {
    if (!showBookSheet) {
      setShowDatePicker(false)
      setShowMonthPicker(false)
      setShowYearPicker(false)
    }
  }, [showBookSheet])

  // ✅ FETCH DEVELOPER INFO FOR GAMES MISSING IT
  // ❌ TEMPORAIREMENT DÉSACTIVÉ - causait des milliers d'appels API
  // useEffect(() => {
  //   const gamesNeedingDeveloperInfo = library.filter(item => 
  //     item.category === 'games' && 
  //     (!item.developer || item.developer === 'Unknown Developer' || item.developer === 'Game Studio') &&
  //     !fetchingDevelopers.has(item.id) &&
  //     !developerCache[item.id]
  //   )

  //   // Fetch developer info for games that need it (limit to avoid API rate limits)
  //   gamesNeedingDeveloperInfo.slice(0, 3).forEach(game => {
  //     console.log(`🎮 [LibrarySection] Auto-fetching developer for: ${game.title}`)
  //     fetchAndUpdateDeveloper(game)
  //   })
  // }, [library, fetchingDevelopers, developerCache])

  // ❌ TEMPORAIREMENT DÉSACTIVÉ - causait des milliers d'appels API  
  // useEffect(() => {
  //   const moviesNeedingDirectorInfo = library.filter(item => 
  //     item.category === 'movies' && 
  //     (!item.director || item.director === 'Unknown Director' || item.director === 'N/A') &&
  //     !fetchingDirectors.has(item.id) &&
  //     !directorCache[item.id]
  //   )

  //   // Fetch director info for movies that need it (limit to avoid API rate limits)
  //   moviesNeedingDirectorInfo.slice(0, 3).forEach(movie => {
  //     console.log(`🎬 [LibrarySection] Auto-fetching director for: ${movie.title}`)
  //     fetchAndUpdateDirector(movie)
  //   })
  // }, [library, fetchingDirectors, directorCache])

  // Filter and sort logic
  const filteredAndSortedLibrary = React.useMemo(() => {
    let filtered = library.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchable = [
          item.title,
          item.author,
          item.artist,
          item.director,
          item.developer,
          item.genre
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchable.includes(query)) return false
      }
      
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) return false
      
      // Status filter - harmonized across all categories
      if (activeStatus !== 'all') {
        const statusMatches = () => {
          switch (activeStatus) {
            case 'wishlist':
              // All "want to" statuses
              return ['want-to-play', 'want-to-watch', 'want-to-read', 'want-to-listen'].includes(item.status)
            case 'in-progress':
              // All "in progress" statuses
              return ['playing', 'watching', 'reading', 'currently-playing'].includes(item.status)
            case 'completed':
              // All completion statuses
              return ['completed', 'watched', 'read', 'listened', 'played'].includes(item.status)
            case 'paused':
              return item.status === 'paused'
            case 'dropped':
              return item.status === 'dropped'
            default:
              return item.status === activeStatus
          }
        }
        
        if (!statusMatches()) return false
      }
      
      return true
    })
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        case 'date_updated':
          return new Date(b.dateUpdated || b.addedAt).getTime() - new Date(a.dateUpdated || a.addedAt).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'creator':
          // ✅ UTILISE LA FONCTION getCreator UNIFIÉE ET CORRIGÉE
          const aCreator = getCreator(a)
          const bCreator = getCreator(b)
          return aCreator.localeCompare(bCreator)
        case 'average_rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'number_of_ratings':
          return (b.numberOfRatings || 0) - (a.numberOfRatings || 0)
        case 'release_year':
          return (b.year || 0) - (a.year || 0)
        default:
          return 0
      }
    })
    
    return filtered
  }, [library, searchQuery, activeCategory, activeStatus, sortBy])

  // Grouper les items par catégorie
  const groupedLibrary = React.useMemo(() => {
    const groups: { [key: string]: LibraryItem[] } = {}
    
    filteredAndSortedLibrary.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })
    
    return groups
  }, [filteredAndSortedLibrary])

  // Helper functions améliorées
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'games': return '🎮'
      case 'movies': return '🎬'
      case 'music': return '🎵'
      case 'books': return '📚'
      case 'boardgames': return '🎲'
      default: return '📚'
    }
  }

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'games': return 'Games'
      case 'movies': return 'Movies'
      case 'music': return 'Music'
      case 'books': return 'Books'
      case 'boardgames': return 'Boardgames'
      default: return category
    }
  }

  const getStatusLabel = (status: MediaStatus | string) => {
    switch (status) {
      // Harmonized status labels
      case 'wishlist': return 'Wishlist'
      case 'in-progress': return 'In Progress'
      case 'completed': return 'Completed'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      case 'all': return 'All'
      
      // Legacy individual statuses (for display in items)
      case 'want-to-play': return 'Wishlist'
      case 'playing': return 'Playing'
      case 'currently-playing': return 'In Progress'
      case 'played': return 'Played'
      case 'want-to-watch': return 'Want to watch'
      case 'watching': return 'Watching'
      case 'watched': return 'Watched'
      case 'want-to-listen': return 'Want to listen'
      case 'listened': return 'Listened'
      case 'want-to-read': return 'Want to read'
      case 'reading': return 'Reading'
      case 'read': return 'Read'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus) => {
    // Tous les badges ont maintenant le même style : texte gris sur fond blanc
    return 'bg-white text-gray-600'
  }

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'date_added': return 'Date Added'
      case 'date_updated': return 'Date Updated'
      case 'title': return 'Title'
      case 'creator': return 'Creator'
      case 'average_rating': return 'Average Rating'
      case 'number_of_ratings': return 'Number of Ratings'
      case 'release_year': return 'Release Year'
      default: return 'Date Added'
    }
  }

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case 'date_added': return <Calendar size={14} />
      case 'date_updated': return <Clock size={14} />
      case 'title': return <Hash size={14} />
      case 'creator': return <User size={14} />
      case 'average_rating': return <Star size={14} />
      case 'number_of_ratings': return <TrendingUp size={14} />
      case 'release_year': return <Calendar size={14} />
      default: return <Calendar size={14} />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // ✅ FONCTIONS DE NAVIGATION VERS LES FICHES PRODUITS
  const handleItemClick = (item: LibraryItem) => {
    // Nettoyer l'ID pour retirer les préfixes
    const cleanId = item.id?.replace(/^(game-|movie-|music-|book-|boardgame-)/, '') || ''
    
    switch (item.category) {
      case 'games':
        if (onOpenGameDetail) {
          onOpenGameDetail(cleanId)
        }
        break
      case 'boardgames':
        if (onOpenBoardGameDetail) {
          onOpenBoardGameDetail(cleanId)
        }
        break
      case 'movies':
        if (onOpenMovieDetail) {
          onOpenMovieDetail(cleanId)
        }
        break
      case 'music':
        if (onOpenMusicDetail) {
          onOpenMusicDetail(item.id || '')
        }
        break
      case 'books':
        if (onOpenBookDetail) {
          onOpenBookDetail(cleanId)
        }
        break
    }
  }

  // Fonction pour rendre la vue mosaïque (grid d'images uniquement)
  const renderGridView = (items: LibraryItem[]) => (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
      {items.map((item) => (
        <div 
          key={item.id}
          className="group cursor-pointer"
          onClick={() => handleItemClick(item)}
          title={item.title}
        >
          <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden border border-gray-700 group-hover:border-gray-600 group-hover:shadow-md transition-all">
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-gray-300">
                {getCategoryIcon(item.category)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  // Modal Components
  const LocalSearchModal = () => {
    if (!showLocalSearchModal) return null
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 shadow-lg">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Search className="text-gray-300" size={20} />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
                autoFocus
              />
              <button
                onClick={() => setShowLocalSearchModal(false)}
                className="text-gray-300 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-gray-300 text-center py-8">
              {searchQuery ? `Searching for "${searchQuery}" in your library...` : 'Type to search in your library'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const AddInfoModal = ({ item }: { item: LibraryItem }) => {
    const [formData, setFormData] = useState(item.additionalInfo || {})

    if (item.category !== 'games') {
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-lg">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Additional Info - {item.title}</h3>
            </div>
            <div className="p-4">
              <p className="text-gray-300">Feature coming soon for {item.category}!</p>
            </div>
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => setShowAddInfoModal(null)}
                className="w-full bg-gray-700 hover:bg-gray-700 text-gray-300 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-lg">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-medium">Game Info - {item.title}</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2 font-medium">Platform</label>
              <select
                value={formData.platform || ''}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Platform</option>
                <option value="PlayStation 5">PlayStation 5</option>
                <option value="Xbox Series X/S">Xbox Series X/S</option>
                <option value="Nintendo Switch">Nintendo Switch</option>
                <option value="PC (Steam)">PC (Steam)</option>
                <option value="PC (Epic Games)">PC (Epic Games)</option>
                <option value="Xbox Game Pass">Xbox Game Pass</option>
                <option value="PlayStation Plus">PlayStation Plus</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2 font-medium">Purchase Details</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.gamePass || false}
                    onChange={(e) => setFormData({...formData, gamePass: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Game Pass / Subscription</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.freeToPlay || false}
                    onChange={(e) => setFormData({...formData, freeToPlay: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Free to Play</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2 font-medium">Purchase Price</label>
              <input
                type="text"
                placeholder="e.g. €59.99, Free, Game Pass"
                value={formData.purchasePrice || ''}
                onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-700 flex space-x-2">
            <button
              onClick={() => setShowAddInfoModal(null)}
              className="flex-1 bg-gray-700 hover:bg-gray-700 text-gray-300 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onUpdateItem) {
                  onUpdateItem(item.id, { additionalInfo: formData })
                }
                setShowAddInfoModal(null)
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0f0e17] min-h-screen">
      {/* Header sticky avec titre et icônes */}
      <div className="sticky top-0 z-50 bg-[#0f0e17] shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          {/* Titre avec nombre d'items et icônes */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
              <h1 className="text-2xl font-bold text-white">Your Library</h1>
              <span className="text-xs sm:text-lg text-gray-300">
                ({filteredAndSortedLibrary.length} item{filteredAndSortedLibrary.length !== 1 ? 's' : ''})
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Icône recherche locale */}
              <button
                onClick={() => setShowLocalSearchModal(true)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                title="Search in your library"
              >
                <Search size={20} className="text-gray-300" />
              </button>

              {/* Bouton basculer vue liste/mosaïque */}
              <button
                onClick={() => setViewType(viewType === 'list' ? 'grid' : 'list')}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                title={`Switch to ${viewType === 'list' ? 'grid' : 'list'} view`}
              >
                {viewType === 'list' ? (
                  <Grid3X3 size={20} className="text-gray-300" />
                ) : (
                  <List size={20} className="text-gray-300" />
                )}
              </button>
              
              {/* Icône ajout global */}
              <button
                onClick={() => {
                  if (onOpenSearch) {
                    onOpenSearch()
                  }
                }}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                title="Add new items to your library"
              >
                <Plus size={20} className="text-gray-300" />
              </button>
            </div>
          </div>

          {/* Filtres de catégories uniquement */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'All', icon: null },
              { key: 'games', label: 'Games', icon: Gamepad2 },
              { key: 'movies', label: 'Movies', icon: Film },
              { key: 'music', label: 'Music', icon: Music },
              { key: 'books', label: 'Books', icon: BookOpen },
              { key: 'boardgames', label: 'Boardgames', icon: Dice6 }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center ${
                  activeCategory === key
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                title={label}
              >
                {key === 'all' ? (
                  label
                ) : (
                  Icon && <Icon size={18} className={activeCategory === key ? 'text-white' : 'text-gray-300'} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-[#0f0e17]">
        {/* Filtres de tri et statut */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-700">
          <div className="flex items-center justify-end space-x-3">
            {/* Menu déroulant de statut */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-600 rounded-lg hover:border-gray-400 transition-colors text-sm text-white"
              >
                <span className="text-white">{getStatusLabel(activeStatus)}</span>
                <ChevronDown size={14} />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-36">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'wishlist', label: 'Wishlist' },
                    { key: 'in-progress', label: 'In Progress' },
                    { key: 'completed', label: 'Completed' },
                    { key: 'paused', label: 'Paused' },
                    { key: 'dropped', label: 'Dropped' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveStatus(key)
                        setShowStatusDropdown(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton "Sorted by" */}
            <div className="relative inline-block">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-600 rounded-lg hover:border-gray-400 transition-colors text-sm font-medium text-white"
              >
                {getSortIcon(sortBy)}
                <span className="text-white">Sorted by {getSortLabel(sortBy)}</span>
                <ChevronDown size={14} />
              </button>
              
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
                  {[
                    { key: 'date_added', label: 'Date Added', icon: <Calendar size={14} /> },
                    { key: 'date_updated', label: 'Date Updated', icon: <Clock size={14} /> },
                    { key: 'title', label: 'Title', icon: <Hash size={14} /> },
                    { key: 'creator', label: 'Creator', icon: <User size={14} /> },
                    { key: 'average_rating', label: 'Average Rating', icon: <Star size={14} /> },
                    { key: 'number_of_ratings', label: 'Number of Ratings', icon: <TrendingUp size={14} /> },
                    { key: 'release_year', label: 'Release Year', icon: <Calendar size={14} /> }
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSortBy(key as SortOption)
                        setShowSortDropdown(false)
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors text-left"
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Liste des items groupés par catégorie */}
        <div className="px-4 sm:px-6 py-4 pb-24">
          {filteredAndSortedLibrary.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <p>No items found.</p>
            </div>
          ) : activeCategory === 'all' ? (
            // Vue "All" - groupée par catégories
            <div className="space-y-8">
              {Object.entries(groupedLibrary).map(([category, items]) => (
                <div key={category}>
                  {/* Titre de catégorie */}
                  <div className="flex items-center space-x-2 mb-4">
                    <h2 className="text-xl font-semibold text-white">
                      {getCategoryDisplayName(category)}
                    </h2>
                    <span className="text-gray-300 text-sm">
                      ({items.length})
                    </span>
                  </div>
                  
                  {/* Items de cette catégorie */}
                  {viewType === 'grid' ? (
                    renderGridView(items)
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors overflow-hidden cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="flex items-start space-x-3 p-4">
                          {/* Image */}
                          <div className="w-14 h-18 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-base">
                                {getCategoryIcon(item.category)}
                              </div>
                            )}
                          </div>

                          {/* Contenu principal */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Titre et Add Info */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold text-sm leading-tight">
                                  {item.title}
                                </h3>
                                <p className="text-gray-300 text-xs mt-1">
                                  by {getCreatorForItem(item, fetchAndUpdateDeveloper, fetchAndUpdateDirector, developerCache, directorCache, fetchingDevelopers, fetchingDirectors)}
                                </p>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (item.category === 'games') {
                                    setShowGameSheet(item.id)
                                  } else if (item.category === 'music') {
                                    setShowMusicSheet(item.id)
                                  } else if (item.category === 'books') {
                                    setShowBookSheet(item.id)
                                  } else {
                                    setShowAddInfoModal(item.id)
                                  }
                                }}
                                className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-300 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors ml-2 flex-shrink-0"
                              >
                                <Edit3 size={10} />
                                <span className="hidden sm:inline">Add Info</span>
                              </button>
                            </div>
                            
                            {/* Rating */}
                            {item.userRating && (
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={10}
                                    className={`${
                                      star <= item.userRating! ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                {item.rating && (
                                  <span className="text-xs text-gray-300 ml-2">
                                    avg {item.rating}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Status et year sur une ligne */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {getStatusLabel(item.status)}
                                </span>
                                <span className="text-xs text-gray-300">{item.year}</span>
                              </div>
                              <span className="text-xs text-gray-300">
                                {formatDate(item.addedAt).replace(/,.*/, '')}
                              </span>
                            </div>

                            {/* Infos additionnelles sur une ligne séparée */}
                            {item.category === 'games' && item.additionalInfo && (
                              <div className="flex items-center space-x-2 flex-wrap">
                                {item.additionalInfo.platform && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                    {item.additionalInfo.platform}
                                  </span>
                                )}
                                {item.additionalInfo.gamePass && (
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                    Game Pass
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Vue catégorie spécifique
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {getCategoryDisplayName(activeCategory)}
                </h2>
                <span className="text-gray-300 text-lg">
                  ({filteredAndSortedLibrary.length})
                </span>
              </div>
              
              {viewType === 'grid' ? (
                renderGridView(filteredAndSortedLibrary)
              ) : (
                <div className="space-y-3">
                  {filteredAndSortedLibrary.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors overflow-hidden cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-start space-x-3 p-4">
                      {/* Image */}
                      <div className="w-14 h-18 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base">
                            {getCategoryIcon(item.category)}
                          </div>
                        )}
                      </div>

                      {/* Contenu principal */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Titre et Add Info */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-sm leading-tight">
                              {item.title}
                            </h3>
                            <p className="text-gray-300 text-xs mt-1">
                              by {getCreatorForItem(item, fetchAndUpdateDeveloper, fetchAndUpdateDirector, developerCache, directorCache, fetchingDevelopers, fetchingDirectors)}
                            </p>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (item.category === 'games') {
                                setShowGameSheet(item.id)
                              } else if (item.category === 'music') {
                                setShowMusicSheet(item.id)
                              } else if (item.category === 'books') {
                                setShowBookSheet(item.id)
                              } else {
                                setShowAddInfoModal(item.id)
                              }
                            }}
                            className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-300 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors ml-2 flex-shrink-0"
                          >
                            <Edit3 size={10} />
                            <span className="hidden sm:inline">Add Info</span>
                          </button>
                        </div>
                        
                        {/* Rating */}
                        {item.userRating && (
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={10}
                                className={`${
                                  star <= item.userRating! ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            {item.rating && (
                              <span className="text-xs text-gray-300 ml-2">
                                avg {item.rating}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Status et year sur une ligne */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                            <span className="text-xs text-gray-300">{item.year}</span>
                          </div>
                          <span className="text-xs text-gray-300">
                            {formatDate(item.addedAt).replace(/,.*/, '')}
                          </span>
                        </div>

                        {/* Infos additionnelles sur une ligne séparée */}
                        {item.category === 'games' && item.additionalInfo && (
                          <div className="flex items-center space-x-2 flex-wrap">
                            {item.additionalInfo.platform && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                {item.additionalInfo.platform}
                              </span>
                            )}
                            {item.additionalInfo.gamePass && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                Game Pass
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <LocalSearchModal />
      
      {showAddInfoModal && (
        <AddInfoModal item={library.find(item => item.id === showAddInfoModal)!} />
      )}

      {/* Fermeture des dropdowns en cliquant à l'extérieur */}
      {(showSortDropdown || showStatusDropdown) && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowSortDropdown(false)
            setShowStatusDropdown(false)
          }}
        />
      )}

      {/* Game Sheet Modal */}
      {showGameSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Game Sheet</h3>
            
            {/* Date Played */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Date Played</label>
              <input
                type="date"
                value={gameSheetData.datePlayed}
                onChange={(e) => setGameSheetData({...gameSheetData, datePlayed: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Platform */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Platform</label>
              <select
                value={gameSheetData.platform}
                onChange={(e) => setGameSheetData({...gameSheetData, platform: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Platform</option>
                <option value="PlayStation 5">PlayStation 5</option>
                <option value="Xbox Series X/S">Xbox Series X/S</option>
                <option value="Nintendo Switch">Nintendo Switch</option>
                <option value="PC">PC</option>
                <option value="Steam Deck">Steam Deck</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            {/* Access Method */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Access Method</label>
              <select
                value={gameSheetData.accessMethod}
                onChange={(e) => setGameSheetData({...gameSheetData, accessMethod: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Access Method</option>
                <option value="Purchased">Purchased</option>
                <option value="Game Pass">Game Pass</option>
                <option value="PlayStation Plus">PlayStation Plus</option>
                <option value="Free to Play">Free to Play</option>
                <option value="Gift">Gift</option>
              </select>
            </div>

            {/* Purchase Price */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Purchase Price</label>
              <input
                type="text"
                placeholder="$59.99"
                value={gameSheetData.purchasePrice}
                onChange={(e) => setGameSheetData({...gameSheetData, purchasePrice: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowGameSheet(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save game sheet data to library item
                  if (onUpdateItem && showGameSheet) {
                    console.log('🎮 Saving game sheet data:', gameSheetData)
                    console.log('🎮 For item ID:', showGameSheet)
                    const existingItem = library.find(item => item.id === showGameSheet)
                    console.log('🎮 Existing item found:', existingItem)
                    
                    onUpdateItem(showGameSheet, { 
                      additionalInfo: {
                        ...existingItem?.additionalInfo,
                        gameSheet: gameSheetData
                      }
                    })
                  }
                  setShowGameSheet(null)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Sheet Modal */}
      {showMusicSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Music Sheet</h3>
            
            {/* Date Listened */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Date Listened</label>
              <input
                type="date"
                value={musicSheetData.dateListened}
                onChange={(e) => setMusicSheetData({...musicSheetData, dateListened: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Platform */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Platform</label>
              <select
                value={musicSheetData.platform}
                onChange={(e) => setMusicSheetData({...musicSheetData, platform: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Platform</option>
                <option value="Spotify">Spotify</option>
                <option value="Apple Music">Apple Music</option>
                <option value="YouTube Music">YouTube Music</option>
                <option value="Amazon Music">Amazon Music</option>
                <option value="Tidal">Tidal</option>
                <option value="SoundCloud">SoundCloud</option>
                <option value="Physical CD">Physical CD</option>
                <option value="Vinyl">Vinyl</option>
              </select>
            </div>

            {/* Format */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Format</label>
              <select
                value={musicSheetData.format}
                onChange={(e) => setMusicSheetData({...musicSheetData, format: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Format</option>
                <option value="Streaming">Streaming</option>
                <option value="Digital Purchase">Digital Purchase</option>
                <option value="CD">CD</option>
                <option value="Vinyl">Vinyl</option>
                <option value="Cassette">Cassette</option>
                <option value="Free">Free</option>
              </select>
            </div>

            {/* Purchase Price */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Purchase Price</label>
              <input
                type="text"
                placeholder="$9.99"
                value={musicSheetData.purchasePrice}
                onChange={(e) => setMusicSheetData({...musicSheetData, purchasePrice: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Favorite Track */}
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">Favorite Track</label>
              <input
                type="text"
                placeholder="Track name"
                value={musicSheetData.favoriteTrack}
                onChange={(e) => setMusicSheetData({...musicSheetData, favoriteTrack: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMusicSheet(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save music sheet data to library item
                  if (onUpdateItem && showMusicSheet) {
                    onUpdateItem(showMusicSheet, { 
                      additionalInfo: {
                        ...library.find(item => item.id === showMusicSheet)?.additionalInfo,
                        musicSheet: musicSheetData
                      }
                    })
                  }
                  setShowMusicSheet(null)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Sheet Modal */}
      {showBookSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Customize book sheet</h3>
              <button
                onClick={() => setShowBookSheet(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-gray-400 text-sm mb-1">Date of reading</label>
                <div
                  onClick={() => setShowDatePicker(true)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600 hover:border-gray-500 cursor-pointer flex items-center justify-between"
                >
                  <span className={bookSheetData.dateRead ? 'text-white' : 'text-gray-400'}>
                    {bookSheetData.dateRead 
                      ? new Date(bookSheetData.dateRead).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Select date'
                    }
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Modern Calendar Picker - EXACTEMENT COMME MOVIE MODAL */}
                {showDatePicker && (
                  <div className={`absolute top-0 left-0 z-10 bg-white border border-gray-300 rounded-lg shadow-2xl overflow-hidden ${
                    showMonthPicker ? 'w-80 h-48' : showYearPicker ? 'w-80 h-96' : 'w-80 h-auto'
                  }`}>
                    {/* Calendar Header */}
                    <div className="bg-gray-50 border-b border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => {
                            const newDate = new Date(calendarDate)
                            newDate.setMonth(newDate.getMonth() - 1)
                            setCalendarDate(newDate)
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            className="px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded"
                          >
                            {calendarDate.toLocaleDateString('en-US', { month: 'long' })}
                          </button>
                          <button
                            onClick={() => setShowYearPicker(!showYearPicker)}
                            className="px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded"
                          >
                            {calendarDate.getFullYear()}
                          </button>
                        </div>
                        
                        <button
                          onClick={() => {
                            const newDate = new Date(calendarDate)
                            newDate.setMonth(newDate.getMonth() + 1)
                            setCalendarDate(newDate)
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="w-full px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Close Calendar
                      </button>
                    </div>

                    {/* Month Picker Overlay */}
                    {showMonthPicker && (
                      <div className="absolute inset-0 bg-white z-20 p-4">
                        <div className="grid grid-cols-4 gap-3">
                          {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((month, index) => (
                            <button
                              key={month}
                              onClick={() => {
                                const newDate = new Date(calendarDate)
                                newDate.setMonth(index)
                                setCalendarDate(newDate)
                                setShowMonthPicker(false)
                              }}
                              className={`py-3 px-2 rounded-lg text-sm font-bold transition-colors ${
                                calendarDate.getMonth() === index
                                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                                  : 'hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Year Picker Overlay */}
                    {showYearPicker && (
                      <div className="absolute inset-0 bg-white z-20 p-4 overflow-y-auto">
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 50 }, (_, i) => {
                            const year = new Date().getFullYear() - i
                            return (
                              <button
                                key={year}
                                onClick={() => {
                                  const newDate = new Date(calendarDate)
                                  newDate.setFullYear(year)
                                  setCalendarDate(newDate)
                                  setShowYearPicker(false)
                                }}
                                className={`py-2 px-1 rounded text-xs font-bold transition-colors ${
                                  calendarDate.getFullYear() === year
                                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                                    : 'hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                {year}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Main Calendar */}
                    {!showMonthPicker && !showYearPicker && (
                      <div className="p-3">
                        {/* Days of week header */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar days grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const year = calendarDate.getFullYear()
                            const month = calendarDate.getMonth()
                            const firstDay = new Date(year, month, 1)
                            const lastDay = new Date(year, month + 1, 0)
                            const startDate = new Date(firstDay)
                            startDate.setDate(startDate.getDate() - firstDay.getDay())
                            
                            const days = []
                            const today = new Date()
                            const selectedDate = bookSheetData.dateRead ? new Date(bookSheetData.dateRead) : null
                            
                            for (let i = 0; i < 42; i++) {
                              const currentDate = new Date(startDate)
                              currentDate.setDate(startDate.getDate() + i)
                              
                              const isCurrentMonth = currentDate.getMonth() === month
                              const isToday = currentDate.toDateString() === today.toDateString()
                              const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString()
                              const isFuture = currentDate > today
                              
                              days.push(
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (!isFuture) {
                                      setBookSheetData({
                                        ...bookSheetData, 
                                        dateRead: currentDate.toISOString().split('T')[0]
                                      })
                                      setShowDatePicker(false)
                                    }
                                  }}
                                  disabled={isFuture}
                                  className={`p-2 text-sm font-medium rounded transition-colors ${
                                    isFuture
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-blue-500 text-white'
                                      : isToday
                                      ? 'bg-blue-100 text-blue-600 font-bold'
                                      : isCurrentMonth
                                      ? 'text-gray-900 hover:bg-gray-100'
                                      : 'text-gray-400 hover:bg-gray-50'
                                  }`}
                                >
                                  {currentDate.getDate()}
                                </button>
                              )
                            }
                            
                            return days
                          })()}
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              const today = new Date()
                              setBookSheetData({...bookSheetData, dateRead: today.toISOString().split('T')[0]})
                              setCalendarDate(today)
                            }}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Today
                          </button>
                          <button
                            onClick={() => {
                              setBookSheetData({...bookSheetData, dateRead: ''})
                              setShowDatePicker(false)
                            }}
                            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Location</label>
                <input
                  type="text"
                  value={bookSheetData.location}
                  onChange={(e) => setBookSheetData({...bookSheetData, location: e.target.value})}
                  placeholder="Where did you read this?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Mood</label>
                <input
                  type="text"
                  value={bookSheetData.mood}
                  onChange={(e) => setBookSheetData({...bookSheetData, mood: e.target.value})}
                  placeholder="What was your mood?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Format</label>
                <select
                  value={bookSheetData.format}
                  onChange={(e) => setBookSheetData({...bookSheetData, format: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="physical">Physical book</option>
                  <option value="ebook">E-book</option>
                  <option value="audiobook">Audiobook</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Private Rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={`cursor-pointer transition-colors ${
                        star <= bookSheetData.personalRating 
                          ? 'text-yellow-500 fill-current' 
                          : 'text-gray-300 hover:text-yellow-400'
                      }`}
                      onClick={() => setBookSheetData({...bookSheetData, personalRating: star})}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Private Review</label>
                <textarea
                  value={bookSheetData.personalReview}
                  onChange={(e) => setBookSheetData({...bookSheetData, personalReview: e.target.value})}
                  placeholder="Write your private review..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBookSheet(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save book sheet data to library item
                  if (onUpdateItem && showBookSheet) {
                    const existingItem = library.find(item => item.id === showBookSheet)
                    onUpdateItem(showBookSheet, { 
                      additionalInfo: {
                        ...existingItem?.additionalInfo,
                        bookSheet: bookSheetData
                      }
                    })
                  }
                  setShowBookSheet(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LibrarySection
'use client'
import { useState, useEffect } from 'react'
import { Search, Film, Gamepad2, BookOpen, Music, Dice6 } from 'lucide-react'
import CategoryTabs from '@/components/CategoryTabs'
import ContentSection from '@/components/ContentSection'
import LibrarySection from '@/components/LibrarySection'
import GameDetailDarkV2 from '@/components/GameDetailDarkV2'
import MovieDetailModalV3 from '@/components/MovieDetailModalV3'
import BookDetailModalV3 from '@/components/BookDetailModalV3'
import MusicDetailModalV4 from '@/components/MusicDetailModalV4'
import SearchModal from '@/components/SearchModal'
import SearchModalV2 from '@/components/SearchModalV2'
// All search modals removed - using unified SearchModal only
import MoviesTVModalV2 from '@/components/MoviesTVModalV2'
import GamesModal from '@/components/GamesModal'
import BooksModal from '@/components/BooksModal'
import MusicModal from '@/components/MusicModal'
import BoardGamesModal from '@/components/BoardGamesModal'
import MovieGoodModal from '@/components/MovieGoodModal'
import BottomNavigation from '@/components/BottomNavigation'
import RoadmapPage from '@/components/RoadmapPage'
import DiscoverPageV2 from '@/components/DiscoverPageV2'
import FeedPage from '@/components/FeedPage'
import UserProfileSetup from '@/components/UserProfileSetup'
import ProfilePage from '@/components/ProfilePage'
import FriendsPage from '@/components/FriendsPage'
import GroupsPage from '@/components/GroupsPage'
import ListsPage from '@/components/ListsPage'
import MoviesTVSectionV2 from '@/components/MoviesTVSectionV2'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { sampleContent } from '@/data/sampleContent'
import { omdbService } from '@/services/omdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicServiceV2 } from '@/services/musicServiceV2'
import { rawgService } from '@/services/rawgService'
import LibraryService from '@/services/libraryService'
import { AuthService } from '@/services/authService'
import { socialService } from '@/services/socialService'
import { supabase } from '@/lib/supabase'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import type { LibraryItem, Review, MediaCategory, MediaStatus, ContentItem } from '@/types'

export default function Home() {
  const [activeTab, setActiveTab] = useState<MediaCategory>('games')
  const [activeMainTab, setActiveMainTab] = useState('feed')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [useUnifiedSearch, setUseUnifiedSearch] = useState(true) // Toggle between old and new search
  
  // Simplified search - using only SearchModal
  const [isMoviesTVV2Open, setIsMoviesTVV2Open] = useState(false)
  const [isMovieGoodOpen, setIsMovieGoodOpen] = useState(false)
  const [isGamesOpen, setIsGamesOpen] = useState(false)
  const [isBooksOpen, setIsBooksOpen] = useState(false)
  const [isMusicOpen, setIsMusicOpen] = useState(false)
  const [isBoardGamesOpen, setIsBoardGamesOpen] = useState(false)
  
  // Library state
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  
  // State pour le contenu dynamique des jeux
  const [gameContent, setGameContent] = useState<{
    popular: ContentItem[]
    topRated: ContentItem[]
    newReleases: ContentItem[]
  }>({
    popular: [],
    topRated: [],
    newReleases: []
  })
  const [gamesLoading, setGamesLoading] = useState(false)
  
  // State pour le contenu dynamique des films
  const [movieContent, setMovieContent] = useState<{
    popular: ContentItem[]
    topRated: ContentItem[]
    recent: ContentItem[]
  }>({
    popular: [],
    topRated: [],
    recent: []
  })
  const [moviesLoading, setMoviesLoading] = useState(false)

  // State pour le contenu dynamique des livres
  const [bookContent, setBookContent] = useState<{
    fiction: ContentItem[]
    nonFiction: ContentItem[]
    newReleases: ContentItem[]
  }>({
    fiction: [],
    nonFiction: [],
    newReleases: []
  })
  const [booksLoading, setBooksLoading] = useState(false)

  // State pour le contenu dynamique de la musique
  const [musicContent, setMusicContent] = useState<{
    popular: ContentItem[]
    topRated: ContentItem[]
    newReleases: ContentItem[]
  }>({
    popular: [],
    topRated: [],
    newReleases: []
  })
  const [musicLoading, setMusicLoading] = useState(false)

  // User reviews state
  const [userReviews, setUserReviews] = useState<{[itemId: string]: Review[]}>({})
  
  // User profile state
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  // Check user profile on mount
  useEffect(() => {
    const checkUserProfile = async () => {
      const user = await AuthService.getCurrentUser()
      if (user) {
        setCurrentUser(user)
        // Check if user has a profile
        const profile = await socialService.getUserProfile(user.id)
        if (!profile) {
          setShowProfileSetup(true)
        }
      }
    }
    checkUserProfile()
  }, [])

  // Load library on component mount
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        setLibraryLoading(true)
        const items = await LibraryService.getLibrary()
        setLibrary(items)
      } catch (error) {
        console.error('Error loading library:', error)
      } finally {
        setLibraryLoading(false)
      }
    }
    
    loadLibrary()
  }, [])

  // Listen for profile navigation events
  useEffect(() => {
    const handleNavigateToProfile = () => {
      setProfileUserId(null) // Reset to current user's profile
      setActiveMainTab('profile')
    }

    const handleOpenUserProfile = (event: any) => {
      const { userId } = event.detail
      setProfileUserId(userId)
      setActiveMainTab('profile')
    }

    const handleOpenGlobalSearch = () => {
      setIsSearchOpen(true)
    }

    window.addEventListener('navigateToProfile', handleNavigateToProfile)
    window.addEventListener('openUserProfile', handleOpenUserProfile)
    window.addEventListener('openGlobalSearch', handleOpenGlobalSearch)
    
    return () => {
      window.removeEventListener('navigateToProfile', handleNavigateToProfile)
      window.removeEventListener('openUserProfile', handleOpenUserProfile)
      window.removeEventListener('openGlobalSearch', handleOpenGlobalSearch)
    }
  }, [])

  // Real-time synchronization system
  useEffect(() => {
    let mounted = true
    
    // Helper function to refresh library
    const refreshLibrary = async () => {
      if (!mounted) return
      try {
        console.log('🔄 Refreshing library from Supabase...')
        const freshLibrary = await LibraryService.getLibraryFresh()
        if (mounted) {
          setLibrary(freshLibrary)
          console.log('✅ Library refreshed:', freshLibrary.length, 'items')
        }
      } catch (error) {
        console.error('❌ Error refreshing library:', error)
      }
    }

    // 1. Supabase Real-time subscription for cross-device sync
    const channel = supabase
      .channel('library_realtime_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'library_items'
      }, (payload) => {
        console.log('📡 Real-time database change detected:', payload.eventType, payload.new?.title || payload.old?.title)
        refreshLibrary()
      })
      .subscribe()

    // 2. Custom event listener for same-device changes
    const handleLibraryChange = (event: any) => {
      console.log('🔔 Custom library event received:', event.detail.action, event.detail.item?.title)
      refreshLibrary()
    }
    window.addEventListener('library-changed', handleLibraryChange)

    // 3. Page focus refresh for when user switches back to app
    const handlePageFocus = () => {
      if (document.hidden === false) {
        console.log('👁️ Page focused, refreshing library...')
        refreshLibrary()
      }
    }
    window.addEventListener('focus', handlePageFocus)
    document.addEventListener('visibilitychange', handlePageFocus)

    // ❌ TEMPORAIREMENT DÉSACTIVÉ - causait 21 000 requêtes API/heure
    // 4. Periodic background sync (every 30 seconds)
    // const syncInterval = setInterval(() => {
    //   if (document.hasFocus() && !document.hidden) {
    //     console.log('⏰ Periodic sync triggered')
    //     refreshLibrary()
    //   }
    // }, 30000)

    console.log('🔧 Real-time synchronization system initialized')

    // Cleanup function
    return () => {
      mounted = false
      supabase.removeChannel(channel)
      window.removeEventListener('library-changed', handleLibraryChange)
      window.removeEventListener('focus', handlePageFocus)
      document.removeEventListener('visibilitychange', handlePageFocus)
      // clearInterval(syncInterval) // ❌ DÉSACTIVÉ temporairement
      console.log('🧹 Real-time synchronization system cleaned up')
    }
  }, [])

  // TEMPORAIREMENT DÉSACTIVÉ pour économiser les API calls
  // useEffect(() => {
  //   if (activeTab === 'games') {
  //     loadGameContent()
  //   } else if (activeTab === 'movies') {
  //     loadMovieContent()
  //   } else if (activeTab === 'books') {
  //     loadBookContent()
  //   } else if (activeTab === 'music') {
  //     loadMusicContent()
  //   }
  // }, [activeTab])

  // Utiliser les données de fallback immédiatement
  useEffect(() => {
    console.log('🔧 Utilisation du mode économie API - contenu statique')
    setGameContent({
      popular: sampleContent.games.slice(0, 4),
      topRated: sampleContent.games.slice(4, 8),
      newReleases: sampleContent.games.slice(0, 4)
    })
    setMovieContent({
      popular: sampleContent.movies.slice(0, 4),
      topRated: sampleContent.movies.slice(4, 8),
      newReleases: sampleContent.movies.slice(0, 4)
    })
    setBookContent({
      fiction: sampleContent.books.slice(0, 4),
      nonFiction: sampleContent.books.slice(4, 8),
      newReleases: sampleContent.books.slice(0, 4)
    })
    setMusicContent({
      popular: sampleContent.music.slice(0, 4),
      topRated: sampleContent.music.slice(4, 8),
      newReleases: sampleContent.music.slice(0, 4)
    })
    setGamesLoading(false)
    setMoviesLoading(false)
    setBooksLoading(false)
    setMusicLoading(false)
  }, [])

  const loadGameContent = async () => {
    try {
      setGamesLoading(true)

      const [popularGames, topRatedGames, newReleaseGames] = await Promise.all([
        rawgService.getPopularGames().then(games => 
          games.slice(0, 8).map(game => rawgService.convertToAppFormat(game))
        ),
        rawgService.getTopRatedGames().then(games => 
          games.slice(0, 8).map(game => rawgService.convertToAppFormat(game))
        ),
        rawgService.getNewReleases().then(games => 
          games.slice(0, 8).map(game => rawgService.convertToAppFormat(game))
        )
      ])

      // Vérifier si l'API a retourné des données valides
      if (popularGames.length === 0 && topRatedGames.length === 0 && newReleaseGames.length === 0) {
        console.warn('🎮 API RAWG: Aucune donnée reçue, utilisation du fallback')
        throw new Error('API_EMPTY_RESPONSE')
      }

      setGameContent({
        popular: popularGames,
        topRated: topRatedGames,
        newReleases: newReleaseGames
      })
    } catch (error) {
      console.error('Error loading game content:', error)
      
      // Fallback vers les données statiques
      setGameContent({
        popular: sampleContent.games.slice(0, 4),
        topRated: sampleContent.games.slice(4, 8),
        newReleases: sampleContent.games.slice(0, 4)
      })
    } finally {
      setGamesLoading(false)
    }
  }

  const loadMovieContent = async () => {
    try {
      setMoviesLoading(true)

      const [popularMovies, topRatedMovies, recentMovies] = await Promise.all([
        omdbService.getPopularMovies().then(movies => 
          movies.slice(0, 8).map(movie => omdbService.convertToAppFormat(movie))
        ),
        omdbService.getTopRatedMovies().then(movies => 
          movies.slice(0, 8).map(movie => omdbService.convertToAppFormat(movie))
        ),
        omdbService.getRecentMovies().then(movies => 
          movies.slice(0, 8).map(movie => omdbService.convertToAppFormat(movie))
        )
      ])

      setMovieContent({
        popular: popularMovies,
        topRated: topRatedMovies,
        recent: recentMovies
      })
    } catch (error) {
      console.error('Error loading movie content:', error)
      
      // Fallback vers les données statiques
      setMovieContent({
        popular: sampleContent.movies.slice(0, 4),
        topRated: sampleContent.movies.slice(4, 8),
        recent: sampleContent.movies.slice(0, 4)
      })
    } finally {
      setMoviesLoading(false)
    }
  }

  const loadBookContent = async () => {
    try {
      setBooksLoading(true)

      const [fictionBooks, nonFictionBooks, newReleaseBooks] = await Promise.all([
        googleBooksService.getFictionBooks().then(books => 
          books.slice(0, 8).map(book => googleBooksService.convertToAppFormat(book))
        ),
        googleBooksService.getNonFictionBooks().then(books => 
          books.slice(0, 8).map(book => googleBooksService.convertToAppFormat(book))
        ),
        googleBooksService.getNewReleases().then(books => 
          books.slice(0, 8).map(book => googleBooksService.convertToAppFormat(book))
        )
      ])

      setBookContent({
        fiction: fictionBooks,
        nonFiction: nonFictionBooks,
        newReleases: newReleaseBooks
      })
    } catch (error) {
      console.error('Error loading book content:', error)
      
      // Fallback vers les données statiques
      setBookContent({
        fiction: sampleContent.books.slice(0, 4),
        nonFiction: sampleContent.books.slice(4, 8),
        newReleases: sampleContent.books.slice(0, 4)
      })
    } finally {
      setBooksLoading(false)
    }
  }

  const loadMusicContent = async () => {
    try {
      setMusicLoading(true)

      // Utiliser le nouveau service V2 avec recherches mixtes
      const [popularMusic, topRatedMusic, newReleaseMusic] = await Promise.all([
        musicServiceV2.searchMusic('popular hits 2024', 8),
        musicServiceV2.searchMusic('top rated albums', 8),
        musicServiceV2.searchMusic('new releases 2024', 8)
      ])

      setMusicContent({
        popular: popularMusic,
        topRated: topRatedMusic,
        newReleases: newReleaseMusic
      })
    } catch (error) {
      console.error('Error loading music content:', error)
      
      // Fallback vers les données statiques
      setMusicContent({
        popular: sampleContent.music.slice(0, 4),
        topRated: sampleContent.music.slice(4, 8),
        newReleases: sampleContent.music.slice(0, 4)
      })
    } finally {
      setMusicLoading(false)
    }
  }

  const handleAddToLibrary = async (item: any, status: MediaStatus) => {
    const normalizedId = normalizeId(item.id)
    
    const itemToAdd = {
      ...item,
      id: normalizedId,
      category: item.category || activeTab
    }

    try {
      await LibraryService.addToLibrary(itemToAdd, status)
      const updatedLibrary = await LibraryService.getLibrary()
      setLibrary(updatedLibrary)
    } catch (error) {
      console.error('Error adding to library:', error)
    }
  }

  // Legacy wrapper for modals that don't support status selection yet
  const handleAddToLibraryLegacy = async (item: any) => {
    await handleAddToLibrary(item, 'want-to-play') // Default status for legacy modals
  }

  const handleUpdateItem = async (id: string, updates: Partial<LibraryItem>) => {
    try {
      await LibraryService.updateLibraryItem(id, updates)
      const updatedLibrary = await LibraryService.getLibrary()
      setLibrary(updatedLibrary)
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await LibraryService.removeFromLibrary(id)
      const updatedLibrary = await LibraryService.getLibrary()
      setLibrary(updatedLibrary)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleOpenGameDetail = (gameId: string) => {
    const normalizedGameId = normalizeId(gameId)
    setSelectedGameId(normalizedGameId)
  }

  const handleOpenMovieDetail = (movieId: string) => {
    const normalizedMovieId = normalizeId(movieId)
    setSelectedMovieId(normalizedMovieId)
  }

  const handleOpenBookDetail = (bookId: string) => {
    const normalizedBookId = normalizeId(bookId)
    setSelectedBookId(normalizedBookId)
  }

  const handleOpenMusicDetail = (musicId: string) => {
    const normalizedMusicId = normalizeId(musicId)
    setSelectedMusicId(normalizedMusicId)
  }

  // Unified handler for SearchModalV2
  const handleOpenDetail = (item: any) => {
    const itemId = normalizeId(item.id?.toString() || '1')
    
    // Close search modal when opening detail
    setIsSearchOpen(false)
    
    switch (item.category) {
      case 'games':
        setSelectedGameId(itemId)
        break
      case 'movies':
        setSelectedMovieId(itemId)
        break
      case 'books':
        setSelectedBookId(itemId)
        break
      case 'music':
        setSelectedMusicId(itemId)
        break
      default:
        console.warn('Unknown media category:', item.category)
    }
  }

  const handleOpenSearch = () => {
    // Use the legacy SearchModal that works
    setIsSearchOpen(true)
  }

  const handleReviewSubmit = (reviewData: any) => {
    const currentItemId = selectedGameId || selectedMovieId || selectedBookId || selectedMusicId
    if (!currentItemId) return

    const newReview: Review = {
      id: Date.now(),
      username: "CurrentUser",
      rating: reviewData.rating,
      review: reviewData.review,
      date: new Date().toISOString().split('T')[0]
    }

    setUserReviews(prev => ({
      ...prev,
      [currentItemId]: [...(prev[currentItemId] || []), newReview]
    }))
  }

  // Générer des reviews pour différentes plateformes
  const generateSteamReviews = (gameId: number): Review[] => {
    const reviewTemplates = [
      { rating: 5, text: "Absolutely incredible! Best game I've played this year. The graphics and gameplay are top-notch.", author: "SteamMaster", helpful: 124 },
      { rating: 4, text: "Great storyline and graphics. Minor bugs but overall excellent experience.", author: "GameReviewer", helpful: 89 },
      { rating: 5, text: "Perfect RPG experience. Hours of entertainment guaranteed. Highly recommended!", author: "RPGLover", helpful: 156 },
      { rating: 3, text: "Good but could use more content. Worth it on sale, not at full price.", author: "CasualGamer", helpful: 45 },
      { rating: 4, text: "Solid experience overall. Great value for money. Some performance issues on older hardware.", author: "ValueHunter", helpful: 78 }
    ]

    const seed = gameId
    const selectedReviews = []
    const numReviews = 5

    for (let i = 0; i < numReviews; i++) {
      const index = (seed * 17 + i * 23 + gameId * 7) % reviewTemplates.length
      const template = reviewTemplates[index]
      
      const gameSpecificVariations = {
        helpful: Math.max(1, template.helpful + (seed * i % 50) - 25),
        daysAgo: (seed * i * 3) % 180 + 1,
      }
      
      selectedReviews.push({
        id: `steam_${gameId}_${i}`,
        username: template.author,
        rating: template.rating,
        text: template.text,
        helpful: gameSpecificVariations.helpful,
        date: new Date(Date.now() - gameSpecificVariations.daysAgo * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        platform: 'Steam'
      })
    }

    return selectedReviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
  }

  const generateGoodreadsReviews = (bookId: string): Review[] => {
    const reviewTemplates = [
      { rating: 5, text: "Absolutely loved this book! Couldn't put it down. The characters were so well developed and the plot was engaging throughout.", author: "BookLover", helpful: 156 },
      { rating: 4, text: "Really enjoyed this read. Great writing style and interesting themes. A few slow parts but overall fantastic.", author: "AvidReader", helpful: 89 },
      { rating: 5, text: "One of my favorite books this year! Beautiful prose and such an emotional journey. Highly recommend!", author: "BookwormLife", helpful: 234 },
      { rating: 3, text: "Good book but not amazing. The story was decent but felt a bit predictable at times.", author: "CasualReader", helpful: 45 },
      { rating: 4, text: "Solid storytelling and great character development. Would definitely read more from this author.", author: "LitCritic", helpful: 112 }
    ]

    const seed = bookId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const selectedReviews = []
    
    for (let i = 0; i < 5; i++) {
      const index = (seed * 11 + i * 17) % reviewTemplates.length
      const template = reviewTemplates[index]
      
      const bookSpecificVariations = {
        helpful: Math.max(1, template.helpful + (seed * i % 50) - 25),
        daysAgo: (seed * i * 4) % 90 + 1,
      }
      
      selectedReviews.push({
        id: `goodreads_${bookId}_${i}`,
        username: template.author,
        rating: template.rating,
        text: template.text,
        helpful: bookSpecificVariations.helpful,
        date: new Date(Date.now() - bookSpecificVariations.daysAgo * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        platform: 'Goodreads'
      })
    }

    return selectedReviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
  }

  const generateIMDBReviews = (movieId: string): Review[] => {
    const reviewTemplates = [
      { rating: 5, text: "A masterpiece! Brilliant acting and cinematography. This film will be remembered for years.", author: "CinemaLover", helpful: 89 },
      { rating: 4, text: "Excellent storytelling and character development. Minor pacing issues but overall fantastic.", author: "FilmCritic", helpful: 156 },
      { rating: 5, text: "One of the best films I've seen. Perfect blend of drama and emotion. Highly recommended!", author: "MovieBuff", helpful: 234 },
      { rating: 3, text: "Good but not great. Some brilliant moments but overall feels uneven.", author: "CasualViewer", helpful: 45 },
      { rating: 4, text: "Strong performances and great direction. A solid addition to the genre.", author: "FilmStudent", helpful: 78 }
    ]

    const seed = movieId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const selectedReviews = []
    
    for (let i = 0; i < 5; i++) {
      const index = (seed * 13 + i * 19) % reviewTemplates.length
      const template = reviewTemplates[index]
      
      const movieSpecificVariations = {
        helpful: Math.max(1, template.helpful + (seed * i % 40) - 20),
        daysAgo: (seed * i * 2) % 120 + 1,
      }
      
      selectedReviews.push({
        id: `imdb_${movieId}_${i}`,
        username: template.author,
        rating: template.rating,
        text: template.text,
        helpful: movieSpecificVariations.helpful,
        date: new Date(Date.now() - movieSpecificVariations.daysAgo * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        platform: 'IMDb'
      })
    }

    return selectedReviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
  }

  const generateSpotifyReviews = (musicId: string): Review[] => {
    const reviewTemplates = [
      { rating: 5, text: "This album is absolutely phenomenal! Every track is a masterpiece. Can't stop listening!", author: "MusicLover99", helpful: 201 },
      { rating: 4, text: "Really solid album with great production. A few tracks could be stronger but overall fantastic.", author: "IndieHead", helpful: 134 },
      { rating: 5, text: "Pure genius! The way they blend genres is incredible. This will be on repeat for months.", author: "VinylCollector", helpful: 187 },
      { rating: 3, text: "Good but not groundbreaking. Some nice moments but doesn't live up to the hype.", author: "CasualListener", helpful: 67 },
      { rating: 4, text: "Excellent songwriting and vocals. The production quality is top-notch throughout.", author: "AudioPhile", helpful: 145 }
    ]

    const seed = musicId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const selectedReviews = []
    
    for (let i = 0; i < 5; i++) {
      const index = (seed * 7 + i * 11) % reviewTemplates.length
      const template = reviewTemplates[index]
      
      const musicSpecificVariations = {
        helpful: Math.max(1, template.helpful + (seed * i % 60) - 30),
        daysAgo: (seed * i * 5) % 200 + 1,
      }
      
      selectedReviews.push({
        id: `spotify_${musicId}_${i}`,
        username: template.author,
        rating: template.rating,
        text: template.text,
        helpful: musicSpecificVariations.helpful,
        date: new Date(Date.now() - musicSpecificVariations.daysAgo * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        platform: 'Music Community'
      })
    }

    return selectedReviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0))
  }

  const getSections = () => {
    if (activeTab === 'games') {
      return [
        { title: 'Popular this week', items: gameContent.popular },
        { title: 'Top rated of all time', items: gameContent.topRated },
        { title: 'New releases', items: gameContent.newReleases }
      ]
    }
    
    if (activeTab === 'movies') {
      return [
        { title: 'Popular classics', items: movieContent.popular },
        { title: 'Top rated of all time', items: movieContent.topRated },
        { title: 'Recent favorites', items: movieContent.recent }
      ]
    }
    
    if (activeTab === 'books') {
      return [
        { title: 'Fiction favorites', items: bookContent.fiction },
        { title: 'Non-fiction highlights', items: bookContent.nonFiction },
        { title: 'New releases', items: bookContent.newReleases }
      ]
    }

    if (activeTab === 'music') {
      return [
        { title: 'Popular albums', items: musicContent.popular },
        { title: 'Classic masterpieces', items: musicContent.topRated },
        { title: 'Latest releases', items: musicContent.newReleases }
      ]
    }
    
    const allContent = getCurrentContent()
    const popularItems = allContent.slice(0, 4)
    const topRatedItems = allContent.slice(4, 8) 
    const editorPicksItems = allContent.slice(0, 4)

    const sectionConfig = {
      games: [
        { title: 'Popular this week', items: popularItems },
        { title: 'Top rated of all time', items: topRatedItems },
        { title: "Editor's Choice", items: editorPicksItems }
      ],
      music: [
        { title: 'Popular this week', items: popularItems },
        { title: 'Top albums', items: topRatedItems },
        { title: 'Hidden gems', items: editorPicksItems }
      ],
      books: [
        { title: 'Popular this week', items: popularItems },
        { title: 'Bestsellers', items: topRatedItems },
        { title: 'Must reads', items: editorPicksItems }
      ]
    }

    return sectionConfig[activeTab] || sectionConfig.games
  }

  const getCurrentContent = (): ContentItem[] => {
    switch (activeTab) {
      case 'games': return sampleContent.games
      case 'movies': return sampleContent.movies
      case 'music': return sampleContent.music
      case 'books': return sampleContent.books
      default: return sampleContent.games
    }
  }

  // Rendu selon l'onglet principal actif
  const renderMainContent = () => {
    switch (activeMainTab) {
      case 'feed':
        return (
          <FeedPage 
            library={library}
            onOpenGameDetail={(gameId) => setSelectedGameId(gameId)}
            onOpenMovieDetail={(movieId) => setSelectedMovieId(movieId)}
            onOpenBookDetail={(bookId) => setSelectedBookId(bookId)}
            onOpenMusicDetail={(musicId) => setSelectedMusicId(musicId)}
          />
        )
      case 'home':
        return renderHomeContent()
      case 'library':
        return renderLibraryContent()
      case 'discover':
        return renderDiscoverContent()
      case 'search':
        return (
          <div className="bg-white min-h-screen">
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Search</h1>
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-6 pb-24">
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Unified Search</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Click the button below to search across all media types
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="-ml-1 mr-2 h-4 w-4" />
                    Open Search
                  </button>
                  
                  <div className="text-center space-y-3">
                    <p className="text-xs text-gray-400 mb-2">or</p>
                    <button
                      onClick={() => setIsMoviesTVV2Open(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Film className="-ml-1 mr-2 h-4 w-4" />
                      Find a movie or a TV show
                    </button>
                    
                    <button
                      onClick={() => setIsGamesOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Gamepad2 className="-ml-1 mr-2 h-4 w-4" />
                      Find a game
                    </button>
                    
                    <button
                      onClick={() => setIsBooksOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
                    >
                      <BookOpen className="-ml-1 mr-2 h-4 w-4" />
                      Find a book
                    </button>
                    
                    <button
                      onClick={() => setIsMusicOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Music className="-ml-1 mr-2 h-4 w-4" />
                      Find music
                    </button>
                    
                    <button
                      onClick={() => setIsBoardGamesOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Dice6 className="-ml-1 mr-2 h-4 w-4" />
                      Find board games
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'roadmap':
        return <RoadmapPage onBack={() => setActiveMainTab('feed')} />
      case 'profile':
        return (
          <ProfilePage 
            onBack={() => setActiveMainTab('feed')} 
            userId={profileUserId || undefined}
            library={library} 
          />
        )
      case 'friends':
        return (
          <FriendsPage 
            onBack={() => setActiveMainTab('feed')} 
            onOpenProfile={(userId) => {
              setProfileUserId(userId)
              setActiveMainTab('profile')
            }}
          />
        )
      case 'groups':
        return (
          <GroupsPage 
            onBack={() => setActiveMainTab('feed')} 
          />
        )
      case 'lists':
        return (
          <ListsPage 
            onBack={() => setActiveMainTab('feed')} 
            onOpenGameDetail={handleOpenGameDetail}
            onOpenMovieDetail={handleOpenMovieDetail}
            onOpenBookDetail={handleOpenBookDetail}
            onOpenMusicDetail={handleOpenMusicDetail}
          />
        )
      default:
        return (
          <FeedPage 
            library={library}
            onOpenGameDetail={(gameId) => setSelectedGameId(gameId)}
            onOpenMovieDetail={(movieId) => setSelectedMovieId(movieId)}
            onOpenBookDetail={(bookId) => setSelectedBookId(bookId)}
            onOpenMusicDetail={(musicId) => setSelectedMusicId(musicId)}
          />
        )
    }
  }

  const renderHomeContent = () => {
    const sections = getSections()
    
    return (
      <div className="bg-white">
        {/* Header fixe avec arrière-plan gris */}
        <div className="sticky top-0 z-50 bg-gray-50 border-b border-gray-200">
          {/* Barre de recherche étendue */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex-1 max-w-2xl mx-auto">
              <div 
                className="relative cursor-pointer"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <div className="w-full pl-4 pr-10 py-3 bg-white hover:bg-gray-50 rounded-lg text-gray-500 transition-colors text-sm border border-gray-200 shadow-sm">
                  <span>Search...</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center ml-4 space-x-2">
              {/* Search Version Toggle */}
              <button
                onClick={() => setUseUnifiedSearch(!useUnifiedSearch)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  useUnifiedSearch 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
                title="Toggle search version"
              >
                {useUnifiedSearch ? '🚀 V2' : '📂 V1'}
              </button>
              
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">👤</span>
                </div>
              </button>
            </div>
          </div>

          {/* Onglets de catégories */}
          <div className="px-4 sm:px-6">
            <CategoryTabs 
              activeTab={activeTab} 
              onTabChange={(tab) => setActiveTab(tab as MediaCategory)} 
            />
          </div>
        </div>
        
        {/* Contenu scrollable avec loading state */}
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
          {(gamesLoading && activeTab === 'games') || 
           (moviesLoading && activeTab === 'movies') || 
           (booksLoading && activeTab === 'books') || 
           (musicLoading && activeTab === 'music') ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-8">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                  <div className="flex space-x-4 overflow-x-auto pb-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex-shrink-0 w-32">
                        <div className="w-32 h-40 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {sections.map((section, index) => (
                <ContentSection
                  key={`${activeTab}-${index}`}
                  title={section.title}
                  items={section.items}
                  category={activeTab}
                  onAddToLibrary={handleAddToLibrary}
                  onDeleteItem={handleDeleteItem}
                  library={library}
                  onOpenGameDetail={handleOpenGameDetail}
                  onOpenMovieDetail={handleOpenMovieDetail}
                  onOpenBookDetail={handleOpenBookDetail}
                  onOpenMusicDetail={handleOpenMusicDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderLibraryContent = () => (
    <LibrarySection 
      library={library}
      onAddToLibrary={handleAddToLibrary}
      onUpdateItem={handleUpdateItem}
      onDeleteItem={handleDeleteItem}
      onOpenGameDetail={handleOpenGameDetail}
      onOpenMovieDetail={handleOpenMovieDetail}
      onOpenBookDetail={handleOpenBookDetail}
      onOpenMusicDetail={handleOpenMusicDetail}
      onOpenSearch={handleOpenSearch}
    />
  )

  const renderDiscoverContent = () => (
    <DiscoverPageV2
      onAddToLibrary={handleAddToLibrary}
      onDeleteItem={handleDeleteItem}
      onOpenGameDetail={handleOpenGameDetail}
      onOpenMovieDetail={handleOpenMovieDetail}
      onOpenBookDetail={handleOpenBookDetail}
      onOpenMusicDetail={handleOpenMusicDetail}
      library={library}
    />
  )

  // renderSearchContent removed - using inline JSX in switch statement

  return (
    <div className="min-h-screen bg-white">
      <ServiceWorkerRegistration />
      <PWAInstallPrompt />
      {renderMainContent()}

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeMainTab} 
        onTabChange={setActiveMainTab} 
      />

      {/* Detail Modals */}
      <GameDetailDarkV2
        isOpen={!!selectedGameId}
        onClose={() => setSelectedGameId(null)}
        gameId={selectedGameId || ''}
        onAddToLibrary={handleAddToLibrary}
        onDeleteItem={handleDeleteItem}
        library={library}
        userReviews={selectedGameId ? userReviews[selectedGameId] || [] : []}
        googleReviews={selectedGameId ? generateSteamReviews(parseInt(selectedGameId)) : []}
        onReviewSubmit={handleReviewSubmit}
      />

      <MovieDetailModalV3
        isOpen={!!selectedMovieId}
        onClose={() => setSelectedMovieId(null)}
        movieId={selectedMovieId || ''}
        onAddToLibrary={handleAddToLibrary}
        onDeleteItem={handleDeleteItem}
        library={library}
        onMovieSelect={(movieId) => setSelectedMovieId(movieId)}
      />

      <BookDetailModalV3
        isOpen={!!selectedBookId}
        onClose={() => setSelectedBookId(null)}
        bookId={selectedBookId || ''}
        onAddToLibrary={handleAddToLibrary}
        onDeleteItem={handleDeleteItem}
        library={library}
        onBookSelect={(bookId) => setSelectedBookId(bookId)}
        onOpenMovieDetail={(movieId) => setSelectedMovieId(movieId)}
      />

      <MusicDetailModalV4
        isOpen={!!selectedMusicId}
        onClose={() => setSelectedMusicId(null)}
        musicId={selectedMusicId || ''}
        onAddToLibrary={handleAddToLibrary}
        onDeleteItem={handleDeleteItem}
        library={library}
        onMusicSelect={setSelectedMusicId}
      />

      {/* LEGACY SEARCH MODAL - Simple search bar for all media */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenGameDetail={handleOpenGameDetail}
        onOpenMovieDetail={handleOpenMovieDetail}
        onOpenBookDetail={handleOpenBookDetail}
        onOpenMusicDetail={handleOpenMusicDetail}
        library={library}
      />

      {/* Old separate modals removed - using unified SearchModal only */}

      <MoviesTVModalV2
        isOpen={isMoviesTVV2Open}
        onClose={() => setIsMoviesTVV2Open(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenDetail={handleOpenDetail}
        onBackToSelection={() => {
          setIsMoviesTVV2Open(false)
          setIsMediaSelectionOpen(true)
        }}
        library={library}
      />

      <GamesModal
        isOpen={isGamesOpen}
        onClose={() => setIsGamesOpen(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenDetail={handleOpenDetail}
        onBackToSelection={() => {
          setIsGamesOpen(false)
          setIsMediaSelectionOpen(true)
        }}
        library={library}
      />

      <BooksModal
        isOpen={isBooksOpen}
        onClose={() => setIsBooksOpen(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenDetail={handleOpenDetail}
        onBackToSelection={() => {
          setIsBooksOpen(false)
          setIsMediaSelectionOpen(true)
        }}
        library={library}
      />

      <MusicModal
        isOpen={isMusicOpen}
        onClose={() => setIsMusicOpen(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenDetail={handleOpenDetail}
        onBackToSelection={() => {
          setIsMusicOpen(false)
          setIsMediaSelectionOpen(true)
        }}
        library={library}
      />

      <BoardGamesModal
        isOpen={isBoardGamesOpen}
        onClose={() => setIsBoardGamesOpen(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenDetail={handleOpenDetail}
        onBackToSelection={() => {
          setIsBoardGamesOpen(false)
          setIsMediaSelectionOpen(true)
        }}
        library={library}
      />

      <MovieGoodModal
        isOpen={isMovieGoodOpen}
        onClose={() => setIsMovieGoodOpen(false)}
        onBackToSelection={() => {
          setIsMovieGoodOpen(false)
          setIsMediaSelectionOpen(true)
        }}
      />

      {/* Legacy Search Modal */}
      {useUnifiedSearch ? (
        <SearchModalV2
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onAddToLibrary={handleAddToLibraryLegacy}
          onOpenDetail={handleOpenDetail}
        />
      ) : (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onAddToLibrary={handleAddToLibrary}
          onOpenGameDetail={handleOpenGameDetail}
          onOpenMovieDetail={handleOpenMovieDetail}
          onOpenBookDetail={handleOpenBookDetail}
          onOpenMusicDetail={handleOpenMusicDetail}
          library={library}
        />
      )}

      {/* User Profile Setup Modal */}
      <UserProfileSetup
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
        onComplete={() => {
          setShowProfileSetup(false)
          // Optionally reload user data or show success message
        }}
      />
    </div>
  )
}
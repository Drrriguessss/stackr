'use client'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import CategoryTabs from '@/components/CategoryTabs'
import ContentSection from '@/components/ContentSection'
import LibrarySection from '@/components/LibrarySection'
import GameDetailPageV2 from '@/components/GameDetailPageV2'
import MovieDetailModal from '@/components/MovieDetailModal'
import BookDetailModal from '@/components/BookDetailModal'
import MusicDetailModal from '@/components/MusicDetailModal'
import SearchModal from '@/components/SearchModal'
import BottomNavigation from '@/components/BottomNavigation'
import RoadmapPage from '@/components/RoadmapPage'
import DiscoverPage from '@/components/DiscoverPage'
import { sampleContent } from '@/data/sampleContent'
import { omdbService } from '@/services/omdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
import { rawgService } from '@/services/rawgService'
import LibraryService from '@/services/libraryService'
import { supabase } from '@/lib/supabase'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import type { LibraryItem, Review, MediaCategory, MediaStatus, ContentItem } from '@/types'

export default function Home() {
  const [activeTab, setActiveTab] = useState<MediaCategory>('games')
  const [activeMainTab, setActiveMainTab] = useState('home')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
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

    // 4. Periodic background sync (every 30 seconds)
    const syncInterval = setInterval(() => {
      if (document.hasFocus() && !document.hidden) {
        console.log('⏰ Periodic sync triggered')
        refreshLibrary()
      }
    }, 30000)

    console.log('🔧 Real-time synchronization system initialized')

    // Cleanup function
    return () => {
      mounted = false
      supabase.removeChannel(channel)
      window.removeEventListener('library-changed', handleLibraryChange)
      window.removeEventListener('focus', handlePageFocus)
      document.removeEventListener('visibilitychange', handlePageFocus)
      clearInterval(syncInterval)
      console.log('🧹 Real-time synchronization system cleaned up')
    }
  }, [])

  // Charger le contenu selon la catégorie active
  useEffect(() => {
    if (activeTab === 'games') {
      loadGameContent()
    } else if (activeTab === 'movies') {
      loadMovieContent()
    } else if (activeTab === 'books') {
      loadBookContent()
    } else if (activeTab === 'music') {
      loadMusicContent()
    }
  }, [activeTab])

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

      const [popularAlbums, topRatedAlbums, newReleaseAlbums] = await Promise.all([
        musicService.getPopularAlbums().then(albums => 
          albums.slice(0, 8).map(album => musicService.convertToAppFormat(album))
        ),
        musicService.getTopRatedAlbums().then(albums => 
          albums.slice(0, 8).map(album => musicService.convertToAppFormat(album))
        ),
        musicService.getNewReleases().then(albums => 
          albums.slice(0, 8).map(album => musicService.convertToAppFormat(album))
        )
      ])

      setMusicContent({
        popular: popularAlbums,
        topRated: topRatedAlbums,
        newReleases: newReleaseAlbums
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

  const handleOpenSearch = () => {
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
      case 'home':
        return renderHomeContent()
      case 'library':
        return renderLibraryContent()
      case 'discover':
        return renderDiscoverContent()
      case 'search':
        return renderSearchContent()
      case 'roadmap':
        return <RoadmapPage onBack={() => setActiveMainTab('home')} />
      default:
        return renderHomeContent()
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
            
            <div className="flex items-center ml-4">
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
    <DiscoverPage
      onAddToLibrary={handleAddToLibrary}
      onDeleteItem={handleDeleteItem}
      onOpenGameDetail={handleOpenGameDetail}
      onOpenMovieDetail={handleOpenMovieDetail}
      onOpenBookDetail={handleOpenBookDetail}
      onOpenMusicDetail={handleOpenMusicDetail}
      library={library}
    />
  )

  const renderSearchContent = () => (
    <div className="bg-white min-h-screen">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
      </div>
      <div className="container mx-auto px-4 sm:px-6 py-6 pb-24">
        <div 
          className="bg-gray-50 rounded-xl p-4 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setIsSearchOpen(true)}
        >
          <div className="flex items-center space-x-3">
            <Search className="text-gray-400" size={20} />
            <span className="text-gray-500">Search games, movies, music, books...</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {renderMainContent()}

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeMainTab} 
        onTabChange={setActiveMainTab} 
      />

      {/* Detail Modals */}
      <GameDetailPageV2
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

      <MovieDetailModal
        isOpen={!!selectedMovieId}
        onClose={() => setSelectedMovieId(null)}
        movieId={selectedMovieId || ''}
        onAddToLibrary={handleAddToLibrary}
        onDeleteItem={handleDeleteItem}
        library={library}
        userReviews={selectedMovieId ? userReviews[selectedMovieId] || [] : []}
        imdbReviews={selectedMovieId ? generateIMDBReviews(selectedMovieId) : []}
        onReviewSubmit={handleReviewSubmit}
      />

      <BookDetailModal
        isOpen={!!selectedBookId}
        onClose={() => setSelectedBookId(null)}
        bookId={selectedBookId || ''}
        onAddToLibrary={handleAddToLibrary}
        onDeleteItem={handleDeleteItem}
        library={library}
        userReviews={selectedBookId ? userReviews[selectedBookId] || [] : []}
        goodreadsReviews={selectedBookId ? generateGoodreadsReviews(selectedBookId) : []}
        onReviewSubmit={handleReviewSubmit}
      />

      <MusicDetailModal
        isOpen={!!selectedMusicId}
        onClose={() => setSelectedMusicId(null)}
        albumId={selectedMusicId || ''}
        onAddToLibrary={handleAddToLibrary}
        onDeleteItem={handleDeleteItem}
        library={library}
        userReviews={selectedMusicId ? userReviews[selectedMusicId] || [] : []}
        spotifyReviews={selectedMusicId ? generateSpotifyReviews(selectedMusicId) : []}
        onReviewSubmit={handleReviewSubmit}
      />

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
    </div>
  )
}
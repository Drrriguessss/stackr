// src/components/DiscoverPage.tsx - VERSION AVEC TRENDING INTELLIGENCE
'use client'
import React, { useState, useEffect } from 'react'
import { Star, Plus, TrendingUp, Play, Book, Headphones, Film, Check, Loader2, Sparkles, Zap } from 'lucide-react'
import { steamSpyService } from '@/services/steamSpyService'
import { omdbService } from '@/services/omdbService'
import { tmdbService } from '@/services/tmdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
import { TrendingDiscoveryService } from '@/services/trendingDiscoveryService' // ✅ NOUVEAU IMPORT
import type { ContentItem, LibraryItem, MediaStatus } from '@/types'

// Constants
const MIN_LIBRARY_ITEMS = 10

interface CategorySection {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  color: string
  items: ContentItem[]
  loading: boolean
}

interface ForYouSection {
  items: ContentItem[]
  reasoning: string
  loading: boolean
}

interface DiscoverPageProps {
  onAddToLibrary?: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  library?: LibraryItem[]
}

type CategoryFilter = 'games' | 'movies' | 'music' | 'books'

export default function DiscoverPage({
  onAddToLibrary,
  onDeleteItem,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  library = []
}: DiscoverPageProps) {
  // ✅ NOUVEAUX ÉTATS POUR LE TRENDING
  const [trendingContent, setTrendingContent] = useState<ContentItem[]>([])
  const [currentTrendingIndex, setCurrentTrendingIndex] = useState(0)
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [isAutoplay, setIsAutoplay] = useState(true)

  // ✅ ÉTATS POUR LES SECTIONS DE CONTENU
  const [gamesLoading, setGamesLoading] = useState(false)
  const [moviesLoading, setMoviesLoading] = useState(false)
  const [booksLoading, setBooksLoading] = useState(false)
  const [musicLoading, setMusicLoading] = useState(false)

  // États existants
  const [selectedFilters, setSelectedFilters] = useState<CategoryFilter[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('discover-filters')
      return saved ? JSON.parse(saved) : ['games', 'movies', 'music', 'books']
    }
    return ['games', 'movies', 'music', 'books']
  })

  const [forYouSection, setForYouSection] = useState<ForYouSection>({
    items: [],
    reasoning: '',
    loading: false
  })

  const [categorySections, setCategorySections] = useState<CategorySection[]>([
    {
      id: 'trending-games',
      title: 'Trending Games',
      subtitle: 'Most played this week',
      icon: <Play size={20} />,
      color: 'green',
      items: [],
      loading: true
    },
    {
      id: 'popular-movies',
      title: 'Popular Movies',
      subtitle: 'Blockbusters & award winners',
      icon: <Film size={20} />,
      color: 'blue',
      items: [],
      loading: true
    },
    {
      id: 'new-books',
      title: 'New Releases',
      subtitle: 'Latest literary hits',
      icon: <Book size={20} />,
      color: 'orange',
      items: [],
      loading: true
    },
    {
      id: 'hot-albums',
      title: 'Hot Albums',
      subtitle: 'Music trending now',
      icon: <Headphones size={20} />,
      color: 'purple',
      items: [],
      loading: true
    }
  ])

  const [showStatusPopup, setShowStatusPopup] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null)

  // ✅ RÉACTIVÉ pour tester TMDB API
  useEffect(() => {
    console.log('🔥 DiscoverPage - Loading content from APIs...')
    loadTrendingContent()
    loadAllContent()
    if (library.length >= MIN_LIBRARY_ITEMS) {
      loadForYouRecommendations()
    }
  }, [library.length])

  // ❌ TEMPORAIREMENT DÉSACTIVÉ pour économiser les API calls
  // useEffect(() => {
  //   TrendingDiscoveryService.setupAutoRefresh()
  // }, [])

  // ✅ AUTO-ROTATION DU TRENDING HERO
  useEffect(() => {
    if (!isAutoplay || trendingContent.length === 0) return
    
    const interval = setInterval(() => {
      setCurrentTrendingIndex((prev) => (prev + 1) % trendingContent.length)
    }, 8000) // 8 secondes par item

    return () => clearInterval(interval)
  }, [isAutoplay, trendingContent.length])

  // Sauvegarder les filtres
  useEffect(() => {
    localStorage.setItem('discover-filters', JSON.stringify(selectedFilters))
  }, [selectedFilters])

  // ✅ FONCTION PRINCIPALE: CHARGER LE CONTENU TRENDING
  const loadTrendingContent = async () => {
    try {
      setTrendingLoading(true)
      console.log('🔥 Loading intelligent trending content...')
      
      const trendingItems = await TrendingDiscoveryService.getTrendingHeroContent()
      
      // Filtrer selon les catégories sélectionnées
      const filteredTrending = trendingItems.filter(item => 
        selectedFilters.includes(item.category as CategoryFilter)
      )
      
      setTrendingContent(filteredTrending.length > 0 ? filteredTrending : trendingItems)
      setCurrentTrendingIndex(0)
      
      console.log('✅ Trending content loaded:', filteredTrending.length, 'items')
      
    } catch (error) {
      console.error('❌ Failed to load trending content:', error)
      // Fallback vers le contenu normal si le trending échoue
      loadRegularHeroContent()
    } finally {
      setTrendingLoading(false)
    }
  }

  // Fallback vers le contenu hero normal
  const loadRegularHeroContent = async () => {
    try {
      const promises: Promise<any[]>[] = []
      
      if (selectedFilters.includes('games')) {
        promises.push(steamSpyService.getPopularGames().catch(() => []))
      }
      if (selectedFilters.includes('movies')) {
        promises.push(tmdbService.getTrendingMovies('day').catch(() => []))
      }
      if (selectedFilters.includes('books')) {
        promises.push(googleBooksService.getFictionBooks().catch(() => []))
      }
      if (selectedFilters.includes('music')) {
        promises.push(musicService.getPopularAlbums().catch(() => []))
      }

      const results = await Promise.all(promises)
      
      const heroItems: ContentItem[] = []
      let resultIndex = 0

      if (selectedFilters.includes('games') && results[resultIndex]?.[0]) {
        heroItems.push({ 
          ...results[resultIndex][0], // SteamSpy retourne déjà le bon format
          description: 'An epic gaming experience that redefines entertainment.',
          callToAction: 'Play Now',
          categoryLabel: 'Games'
        })
        resultIndex++
      }
      
      if (selectedFilters.includes('movies') && results[resultIndex]?.[0]) {
        heroItems.push({ 
          ...results[resultIndex][0], // TMDB retourne déjà le bon format
          description: results[resultIndex][0].overview || 'A cinematic masterpiece that captivates audiences worldwide.',
          callToAction: 'Watch Now',
          categoryLabel: 'Movies'
        })
        resultIndex++
      }
      
      if (selectedFilters.includes('books') && results[resultIndex]?.[0]) {
        heroItems.push({ 
          ...googleBooksService.convertToAppFormat(results[resultIndex][0]), 
          description: 'A literary work that has captured readers worldwide.',
          callToAction: 'Read Now',
          categoryLabel: 'Books'
        })
        resultIndex++
      }
      
      if (selectedFilters.includes('music') && results[resultIndex]?.[0]) {
        heroItems.push({ 
          ...musicService.convertToAppFormat(results[resultIndex][0]), 
          description: 'An album that showcases artistic brilliance.',
          callToAction: 'Listen Now',
          categoryLabel: 'Music'
        })
        resultIndex++
      }

      setTrendingContent(heroItems)
    } catch (error) {
      console.error('Error loading regular hero content:', error)
    }
  }

  // ✅ COMPOSANT HERO INTELLIGENT AMÉLIORÉ
  const renderIntelligentHero = () => {
    if (trendingLoading || !trendingContent[currentTrendingIndex]) {
      return (
        <div className="bg-gray-100 rounded-2xl h-64 animate-pulse flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading trending content...</p>
          </div>
        </div>
      )
    }

    const currentItem = trendingContent[currentTrendingIndex]
    const isNew = currentItem.year >= new Date().getFullYear()

    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative">
        {/* Badge de trending en haut */}
        <div className="absolute top-4 left-4 z-10">
          <div className="flex items-center space-x-2">
            {currentItem.status && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
                currentItem.status === 'trending' ? 'bg-red-500 text-white' :
                currentItem.status === 'hot' ? 'bg-orange-500 text-white' :
                currentItem.status === 'new' ? 'bg-green-500 text-white' :
                'bg-blue-500 text-white'
              }`}>
                {currentItem.status === 'trending' ? <TrendingUp size={12} /> : 
                 currentItem.status === 'hot' ? <Zap size={12} /> :
                 currentItem.status === 'new' ? <Sparkles size={12} /> : 
                 <Star size={12} />}
                <span>
                  {currentItem.status === 'trending' ? 'TRENDING NOW' :
                   currentItem.status === 'hot' ? 'HOT' :
                   currentItem.status === 'new' ? 'NEW RELEASE' : 'FEATURED'}
                </span>
              </span>
            )}
            
            {/* Badge de statistiques trending */}
            {currentItem.stats?.trending && (
              <span className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-bold">
                {currentItem.stats.trending} ↗️
              </span>
            )}
          </div>
        </div>

        {/* Header avec catégorie */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-gray-900">
              {currentItem.categoryLabel} Trending
            </h2>
            
            {/* Indicateur de fraîcheur */}
            <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          </div>
          
          {/* Stats en temps réel */}
          {currentItem.stats && (
            <div className="flex items-center space-x-4 text-sm">
              {currentItem.stats.users && (
                <div className="text-gray-600">
                  <span className="font-semibold text-blue-600">{currentItem.stats.users}</span> users
                </div>
              )}
              {currentItem.stats.engagement && (
                <div className="text-gray-600">
                  <span className="font-semibold text-purple-600">{currentItem.stats.engagement}</span> engagement
                </div>
              )}
            </div>
          )}
        </div>

        {/* Container principal */}
        <div className="flex">
          {/* Image */}
          <div className="w-1/3 relative">
            <div className="aspect-[4/3] relative overflow-hidden">
              <img
                src={currentItem.image || ''}
                alt={currentItem.title}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay avec rating */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20"></div>
              
              <div className="absolute top-3 right-3">
                <div className="flex items-center space-x-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      className={`${
                        star <= (currentItem.rating || 0) ? 'text-yellow-400 fill-current' : 'text-white/40'
                      }`}
                    />
                  ))}
                  <span className="text-white text-xs font-semibold ml-1">
                    {currentItem.rating || 0}/5
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="w-2/3 p-6 flex flex-col justify-center">
            <div className="space-y-3">
              {/* Titre et année */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1 leading-tight">
                  {currentItem.title}
                  {isNew && (
                    <span className="ml-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent font-extrabold">
                      NEW!
                    </span>
                  )}
                </h2>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <span className="font-medium">{currentItem.year}</span>
                  {currentItem.genre && (
                    <>
                      <span>•</span>
                      <span>{currentItem.genre}</span>
                    </>
                  )}
                  {/* Créateur */}
                  {(currentItem.author || currentItem.artist || currentItem.director || currentItem.developer) && (
                    <>
                      <span>•</span>
                      <span className="font-medium">
                        by {currentItem.author || currentItem.artist || currentItem.director || currentItem.developer}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Description trending intelligente */}
              <p className="text-gray-600 leading-relaxed text-sm">
                {currentItem.description || 
                 `This ${currentItem.category.slice(0, -1)} is trending everywhere right now. Join millions discovering this incredible experience.`}
              </p>

              {/* Stats détaillées */}
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1 bg-red-50 text-red-600 px-2 py-1 rounded-full">
                  <TrendingUp size={10} />
                  <span>Trending {currentItem.stats?.trending || '+15%'}</span>
                </div>
                
                {currentItem.stats?.engagement && (
                  <div className="flex items-center space-x-1 bg-purple-50 text-purple-600 px-2 py-1 rounded-full">
                    <span>👍</span>
                    <span>{currentItem.stats.engagement} liked</span>
                  </div>
                )}
                
                <div className="text-gray-500">
                  <span>Updated: {new Date().toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}</span>
                </div>
              </div>

              {/* Bouton d'action */}
              <div className="pt-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleHeroAction(currentItem)
                  }}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Play size={16} className="mr-2" />
                  {currentItem.callToAction || 'Explore Trending'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation dots */}
        {trendingContent.length > 1 && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {trendingContent.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentTrendingIndex(index)
                      setIsAutoplay(false)
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentTrendingIndex 
                        ? 'bg-blue-600 scale-125' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              
              {/* Bouton pause/play */}
              <button
                onClick={() => setIsAutoplay(!isAutoplay)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              >
                {isAutoplay ? '⏸️ Pause' : '▶️ Play'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Fonctions existantes (garder toutes tes fonctions existantes)
  const loadAllContent = async () => {
    try {
      await Promise.all([
        loadGamesContent(),
        loadMoviesContent(), 
        loadBooksContent(),
        loadMusicContent()
      ])
    } catch (error) {
      console.error('Error loading discover content:', error)
    }
  }

  const loadGamesContent = async () => {
    try {
      console.log('🎮 Loading games content from SteamSpy...')
      
      // Charger plusieurs catégories de jeux en parallèle depuis SteamSpy
      const [popularGames, topOwned, newReleases] = await Promise.all([
        steamSpyService.getTop100In2Weeks().catch(() => []),
        steamSpyService.getTop100Owned().catch(() => []),
        steamSpyService.getNewReleases().catch(() => [])
      ])

      setCategorySections(prev => prev.map(section => {
        if (section.id === 'trending-games') {
          // Utiliser les jeux populaires des 2 dernières semaines
          return { 
            ...section, 
            items: popularGames.slice(0, 8), // Top 8 popular
            loading: false,
            title: '🔥 Trending Games (2 weeks)',
            subtitle: 'Most active games on Steam right now'
          }
        }
        return section
      }))

      // Log des statistiques
      console.log('🎮 SteamSpy Games loaded:', {
        popular: popularGames.length,
        topOwned: topOwned.length,
        newReleases: newReleases.length
      })

    } catch (error) {
      console.error('Error loading games from SteamSpy:', error)
      setCategorySections(prev => prev.map(section => 
        section.id === 'trending-games' 
          ? { ...section, loading: false }
          : section
      ))
    }
  }

  const loadMoviesContent = async () => {
    try {
      console.log('🎬 Loading movies content from TMDB...')
      
      // Charger plusieurs catégories de films en parallèle
      const [trending, popular, topRated, nowPlaying] = await Promise.all([
        tmdbService.getTrendingMovies('week').catch(() => []),
        tmdbService.getPopularMovies().catch(() => []),
        tmdbService.getTopRatedMovies().catch(() => []),
        tmdbService.getNowPlayingMovies().catch(() => [])
      ])

      // Mettre à jour la section principale avec les films populaires
      setCategorySections(prev => prev.map(section => {
        if (section.id === 'popular-movies') {
          // Utiliser les films tendance pour la section principale
          return { 
            ...section, 
            items: trending.slice(0, 8), // Top 8 trending
            loading: false,
            title: '🔥 Trending Movies This Week',
            subtitle: 'What everyone is watching right now'
          }
        }
        return section
      }))

      // Si on veut ajouter d'autres sections de films (pour le futur)
      console.log('🎬 TMDB Movies loaded:', {
        trending: trending.length,
        popular: popular.length,
        topRated: topRated.length,
        nowPlaying: nowPlaying.length
      })

    } catch (error) {
      console.error('Error loading movies from TMDB:', error)
      setCategorySections(prev => prev.map(section => 
        section.id === 'popular-movies' 
          ? { ...section, loading: false }
          : section
      ))
    }
  }

  const loadBooksContent = async () => {
    try {
      const books = await googleBooksService.getFictionBooks()
      const convertedBooks = books.map(book => googleBooksService.convertToAppFormat(book))

      setCategorySections(prev => prev.map(section => 
        section.id === 'new-books' 
          ? { ...section, items: convertedBooks, loading: false }
          : section
      ))
    } catch (error) {
      console.error('Error loading books:', error)
      setCategorySections(prev => prev.map(section => 
        section.id === 'new-books' 
          ? { ...section, loading: false }
          : section
      ))
    }
  }

  const loadMusicContent = async () => {
    try {
      const albums = await musicService.getPopularAlbums()
      const convertedAlbums = albums.map(album => musicService.convertToAppFormat(album))

      setCategorySections(prev => prev.map(section => 
        section.id === 'hot-albums' 
          ? { ...section, items: convertedAlbums, loading: false }
          : section
      ))
    } catch (error) {
      console.error('Error loading music:', error)
      setCategorySections(prev => prev.map(section => 
        section.id === 'hot-albums' 
          ? { ...section, loading: false }
          : section
      ))
    }
  }

  // ✅ GARDER TOUTES TES AUTRES FONCTIONS EXISTANTES TELLES QUELLES
  // (analyzeLibraryPreferences, generateRecommendations, loadForYouRecommendations, etc.)

  const analyzeLibraryPreferences = (library: LibraryItem[]) => {
    const genreCounts: { [key: string]: number } = {}
    const creatorCounts: { [key: string]: number } = {}
    const categoryDistribution: { [key: string]: number } = {}
    const yearPreferences: number[] = []
    const highRatedItems: LibraryItem[] = []

    library.forEach(item => {
      if (item.genre) {
        genreCounts[item.genre] = (genreCounts[item.genre] || 0) + 1
      }

      const creator = item.author || item.artist || item.director
      if (creator) {
        creatorCounts[creator] = (creatorCounts[creator] || 0) + 1
      }

      if (item.category) {
        categoryDistribution[item.category] = (categoryDistribution[item.category] || 0) + 1
      }

      if (item.year) {
        yearPreferences.push(item.year)
      }

      if (item.userRating && item.userRating >= 4) {
        highRatedItems.push(item)
      }
    })

    const topGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre)

    const topCreators = Object.entries(creatorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([creator]) => creator)

    const dominantCategory = Object.entries(categoryDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0]

    const avgYear = yearPreferences.length > 0 
      ? Math.round(yearPreferences.reduce((a, b) => a + b, 0) / yearPreferences.length)
      : new Date().getFullYear()

    return {
      topGenres,
      topCreators,
      dominantCategory,
      avgYear,
      highRatedItems: highRatedItems.slice(0, 3),
      totalItems: library.length
    }
  }

  const generateRecommendations = async (preferences: any) => {
    const recommendations: ContentItem[] = []
    let reasoning = ''

    try {
      if (preferences.topCreators.length > 0) {
        const favoriteCreator = preferences.topCreators[0]
        reasoning = `Because you loved content by ${favoriteCreator}`
      }

      if (preferences.topGenres.length > 0) {
        const favoriteGenre = preferences.topGenres[0]
        
        const allContent = await Promise.all([
          steamSpyService.getPopularGames().catch(() => []),
          tmdbService.getPopularMovies().catch(() => []),
          googleBooksService.getFictionBooks().catch(() => []),
          musicService.getPopularAlbums().catch(() => [])
        ])

        const genreMatches: any[] = []
        
        allContent[0].forEach(game => {
          // SteamSpy utilise un champ 'genre' string au lieu d'un array 'genres'
          if (game.genre && game.genre.toLowerCase().includes(favoriteGenre.toLowerCase())) {
            if (!library.some(item => item.id === game.id)) {
              genreMatches.push(game) // SteamSpy retourne déjà le bon format
            }
          }
        })

        allContent[1].forEach(movie => {
          if (movie.genre && movie.genre.toLowerCase().includes(favoriteGenre.toLowerCase())) {
            // TMDB retourne déjà le bon format
            if (!library.some(item => item.id === movie.id)) {
              genreMatches.push(movie)
            }
          }
        })

        genreMatches.slice(0, 6).forEach(item => recommendations.push(item))

        if (!reasoning && genreMatches.length > 0) {
          reasoning = `Because you love ${favoriteGenre} content`
        }
      }

      return {
        items: recommendations.slice(0, 6),
        reasoning: reasoning || 'Personalized picks for you'
      }

    } catch (error) {
      console.error('Error generating recommendations:', error)
      return {
        items: [],
        reasoning: 'Unable to generate recommendations'
      }
    }
  }

  const loadForYouRecommendations = async () => {
    try {
      setForYouSection(prev => ({ ...prev, loading: true }))

      const preferences = analyzeLibraryPreferences(library)
      const recommendations = await generateRecommendations(preferences)

      setForYouSection({
        items: recommendations.items,
        reasoning: recommendations.reasoning,
        loading: false
      })

    } catch (error) {
      console.error('Error loading For You recommendations:', error)
      setForYouSection({
        items: [],
        reasoning: 'Unable to load recommendations',
        loading: false
      })
    }
  }

  const handleFilterToggle = (filter: CategoryFilter) => {
    setSelectedFilters(prev => {
      if (prev.includes(filter)) {
        if (prev.length === 1) return prev
        return prev.filter(f => f !== filter)
      } else {
        return [...prev, filter]
      }
    })
  }

  const getFilteredSections = () => {
    return categorySections.filter(section => {
      switch (section.id) {
        case 'trending-games': return selectedFilters.includes('games')
        case 'popular-movies': return selectedFilters.includes('movies')
        case 'new-books': return selectedFilters.includes('books')
        case 'hot-albums': return selectedFilters.includes('music')
        default: return true
      }
    })
  }

  const handleHeroAction = (item: ContentItem) => {
    handleItemClick(item)
  }

  const handleItemClick = (item: ContentItem) => {
    const itemIdWithoutPrefix = item.id.replace(/^(game-|movie-|music-|book-)/, '')
    
    switch (item.category) {
      case 'games':
        onOpenGameDetail?.(itemIdWithoutPrefix)
        break
      case 'movies':
        onOpenMovieDetail?.(itemIdWithoutPrefix)
        break
      case 'books':
        onOpenBookDetail?.(itemIdWithoutPrefix)
        break
      case 'music':
        onOpenMusicDetail?.(itemIdWithoutPrefix)
        break
    }
  }

  const handleAddToLibrary = (item: ContentItem, status: MediaStatus = 'want-to-play') => {
    if (!onAddToLibrary) return
    
    setAddingItem(item.id)
    
    const libraryItem = {
      id: item.id,
      title: item.title,
      image: item.image,
      category: item.category,
      year: item.year,
      rating: item.rating,
      genre: item.genre,
      author: item.category === 'books' ? item.author : undefined,
      artist: item.category === 'music' ? item.artist : undefined,
      director: item.category === 'movies' ? item.director : undefined
    }
    
    onAddToLibrary(libraryItem, status)
    
    setTimeout(() => {
      setAddingItem(null)
    }, 1500)
  }

  const handleRemoveFromLibrary = (item: ContentItem) => {
    if (!onDeleteItem) return
    onDeleteItem(item.id)
  }

  const isInLibrary = (itemId: string) => {
    return library.some(item => item.id === itemId || item.id === `${itemId.split('-')[0]}-${itemId.split('-')[1]}`)
  }

  const getStatusOptions = (category: string) => {
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
          { value: 'completed', label: 'Watched' }
        ]
      case 'books':
        return [
          { value: 'want-to-play', label: 'Want to Read' },
          { value: 'currently-playing', label: 'Reading' },
          { value: 'completed', label: 'Read' }
        ]
      case 'music':
        return [
          { value: 'want-to-play', label: 'Want to Listen' },
          { value: 'currently-playing', label: 'Listening' },
          { value: 'completed', label: 'Listened' }
        ]
      default:
        return [
          { value: 'want-to-play', label: 'Want to Play' },
          { value: 'currently-playing', label: 'Playing' },
          { value: 'completed', label: 'Completed' }
        ]
    }
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          accent: 'bg-green-500'
        }
      case 'blue':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          accent: 'bg-blue-500'
        }
      case 'orange':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700',
          accent: 'bg-orange-500'
        }
      case 'purple':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-700',
          accent: 'bg-purple-500'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          accent: 'bg-gray-500'
        }
    }
  }

  const currentHeroItem = trendingContent[currentTrendingIndex]
  const filteredSections = getFilteredSections()

  return (
    <div className="bg-white min-h-screen">
      {/* Header existant */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
            
            {/* Indicateur de mise à jour en temps réel */}
            <div className="text-xs text-gray-500 flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live trending data</span>
            </div>
          </div>

          {/* Filtres existants */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'All' },
              { key: 'games', label: 'Games' },
              { key: 'movies', label: 'Movies' },
              { key: 'music', label: 'Music' },
              { key: 'books', label: 'Books' }
            ].map(({ key, label }) => {
              const isSelected = key === 'all' 
                ? selectedFilters.length === 4 
                : selectedFilters.includes(key as CategoryFilter)
              
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'all') {
                      setSelectedFilters(['games', 'movies', 'music', 'books'])
                    } else {
                      handleFilterToggle(key as CategoryFilter)
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ✅ SECTION HERO INTELLIGENTE */}
      <div className="px-4 sm:px-6 py-4">
        {renderIntelligentHero()}
      </div>

      {/* For You Section avec minimum requirement */}
      {library.length >= MIN_LIBRARY_ITEMS ? (
        <div className="px-4 sm:px-6 pb-8">
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">For You</h2>
                <p className="text-sm text-gray-500">{forYouSection.reasoning}</p>
              </div>
            </div>
          </div>

          {forYouSection.loading ? (
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-32 bg-gray-100 rounded-2xl h-44 animate-pulse"></div>
              ))}
            </div>
          ) : forYouSection.items.length > 0 ? (
            <div className="flex space-x-4 overflow-x-auto pb-2 horizontal-scroll">
              {forYouSection.items.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-32 cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="relative bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group">
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={item.image || ''}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* Add button */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isInLibrary(item.id) ? (
                          <div className="relative">
                            <div className="bg-green-500 text-white p-2 rounded-full shadow-lg flex items-center justify-center">
                              <Check size={14} />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveFromLibrary(item)
                              }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
                              title="Remove from library"
                            >
                              ×
                            </button>
                          </div>
                        ) : addingItem === item.id ? (
                          <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg animate-pulse">
                            <Plus size={14} />
                          </div>
                        ) : (
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowStatusPopup(item.id)
                              }}
                              className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg backdrop-blur-sm transition-colors"
                            >
                              <Plus size={14} />
                            </button>

                            {showStatusPopup === item.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[998]"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowStatusPopup(null)
                                  }}
                                />
                                <div 
                                  className="absolute bottom-full right-0 mb-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200 py-2 min-w-36 z-[999]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getStatusOptions(item.category).map((option) => (
                                    <button
                                      key={option.value}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddToLibrary(item, option.value as MediaStatus)
                                        setShowStatusPopup(null)
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm transition-all duration-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium"
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">
                        {item.title}
                      </h3>

                      {/* Rating */}
                      <div className="flex items-center space-x-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={10}
                            className={`${
                              star <= (item.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-200'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">{item.rating || 0}/5</span>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate">{item.author || item.artist || item.director}</span>
                        <span>{item.year}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Add more items to your library for personalized recommendations!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 sm:px-6 pb-8">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Recommendations</h3>
              <p className="text-gray-600 mb-4">
                Please add 10 items to your library to see suggestions tailored to your profile.
              </p>
              <div className="text-sm text-purple-600 bg-purple-100 rounded-lg px-3 py-2 inline-block">
                {library.length}/10 items in your library
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Sections filtrées */}
      <div className="space-y-8 pb-24">
        {filteredSections.map((section) => {
          const colors = getColorClasses(section.color)
          
          return (
            <div key={section.id} className="px-4 sm:px-6">
              {/* Section Header avec style uniforme */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-500">{section.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Horizontal Carousel */}
              {section.loading ? (
                <div className="flex space-x-4 overflow-x-auto pb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-shrink-0 w-32 bg-gray-100 rounded-2xl h-44 animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="flex space-x-4 overflow-x-auto pb-2 horizontal-scroll">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-32 cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="relative bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group">
                        {/* Image */}
                        <div className="relative h-40 overflow-hidden">
                          <img
                            src={item.image || ''}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          
                          {/* Add button */}
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isInLibrary(item.id) ? (
                              <div className="relative">
                                <div className="bg-green-500 text-white p-2 rounded-full shadow-lg flex items-center justify-center">
                                  <Check size={14} />
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveFromLibrary(item)
                                  }}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
                                  title="Remove from library"
                                >
                                  ×
                                </button>
                              </div>
                            ) : addingItem === item.id ? (
                              <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg animate-pulse">
                                <Plus size={14} />
                              </div>
                            ) : (
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowStatusPopup(item.id)
                                  }}
                                  className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg backdrop-blur-sm transition-colors"
                                >
                                  <Plus size={14} />
                                </button>

                                {showStatusPopup === item.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-[998]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowStatusPopup(null)
                                      }}
                                    />
                                    <div 
                                      className="absolute bottom-full right-0 mb-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200 py-2 min-w-36 z-[999]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {getStatusOptions(item.category).map((option) => (
                                        <button
                                          key={option.value}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleAddToLibrary(item, option.value as MediaStatus)
                                            setShowStatusPopup(null)
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm transition-all duration-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium"
                                        >
                                          {option.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-3">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">
                            {item.title}
                          </h3>

                          {/* Rating */}
                          <div className="flex items-center space-x-1 mb-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={10}
                                className={`${
                                  star <= (item.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-200'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">{item.rating || 0}/5</span>
                          </div>

                          {/* Meta info */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="truncate">{item.author || item.artist || item.director}</span>
                            <span>{item.year}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .horizontal-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
        }
        
        .horizontal-scroll::-webkit-scrollbar {
          display: none;
          height: 0px;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
'use client'
import React, { useState, useEffect } from 'react'
import { Star, Plus, TrendingUp, Play, Book, Headphones, Film, Check, Loader2 } from 'lucide-react'
import { rawgService } from '@/services/rawgService'
import { omdbService } from '@/services/omdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
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

// Types pour les filtres
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
  // State pour les filtres persistants
  const [selectedFilters, setSelectedFilters] = useState<CategoryFilter[]>(() => {
    // Récupérer les filtres depuis localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('discover-filters')
      return saved ? JSON.parse(saved) : ['games', 'movies', 'music', 'books']
    }
    return ['games', 'movies', 'music', 'books']
  })

  // Hero content state
  const [heroContent, setHeroContent] = useState<ContentItem[]>([])
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0)
  const [heroLoading, setHeroLoading] = useState(true)
  const [isAutoplay, setIsAutoplay] = useState(true)

  // For You section state
  const [forYouSection, setForYouSection] = useState<ForYouSection>({
    items: [],
    reasoning: '',
    loading: false
  })

  // Category sections state
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

  // UI state
  const [showStatusPopup, setShowStatusPopup] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null)

  // Sauvegarder les filtres dans localStorage
  useEffect(() => {
    localStorage.setItem('discover-filters', JSON.stringify(selectedFilters))
  }, [selectedFilters])

  // Load data on mount
  useEffect(() => {
    loadAllContent()
    
    // Load For You section if user has enough library items
    if (library.length >= MIN_LIBRARY_ITEMS) {
      loadForYouRecommendations()
    }
  }, [library.length])

  // Hero auto-rotation
  useEffect(() => {
    if (!isAutoplay || heroContent.length === 0) return
    
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroContent.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isAutoplay, heroContent.length])

  // Gestion des filtres
  const handleFilterToggle = (filter: CategoryFilter) => {
    setSelectedFilters(prev => {
      if (prev.includes(filter)) {
        // Ne pas permettre de désélectionner tous les filtres
        if (prev.length === 1) return prev
        return prev.filter(f => f !== filter)
      } else {
        return [...prev, filter]
      }
    })
  }

  // Filtrer les sections selon les filtres sélectionnés
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

  // Recommendation algorithm
  const analyzeLibraryPreferences = (library: LibraryItem[]) => {
    const genreCounts: { [key: string]: number } = {}
    const creatorCounts: { [key: string]: number } = {}
    const categoryDistribution: { [key: string]: number } = {}
    const yearPreferences: number[] = []
    const highRatedItems: LibraryItem[] = []

    library.forEach(item => {
      // Count genres
      if (item.genre) {
        genreCounts[item.genre] = (genreCounts[item.genre] || 0) + 1
      }

      // Count creators (author, artist, director)
      const creator = item.author || item.artist || item.director
      if (creator) {
        creatorCounts[creator] = (creatorCounts[creator] || 0) + 1
      }

      // Count categories
      if (item.category) {
        categoryDistribution[item.category] = (categoryDistribution[item.category] || 0) + 1
      }

      // Collect years
      if (item.year) {
        yearPreferences.push(item.year)
      }

      // High rated items (4+ stars)
      if (item.userRating && item.userRating >= 4) {
        highRatedItems.push(item)
      }
    })

    // Get top preferences
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
      // Strategy 1: More from favorite creators
      if (preferences.topCreators.length > 0) {
        const favoriteCreator = preferences.topCreators[0]
        reasoning = `Because you loved content by ${favoriteCreator}`
      }

      // Strategy 2: Similar genres
      if (preferences.topGenres.length > 0) {
        const favoriteGenre = preferences.topGenres[0]
        
        // Get content in favorite genre
        const allContent = await Promise.all([
          rawgService.getPopularGames().catch(() => []),
          omdbService.getPopularMovies().catch(() => []),
          googleBooksService.getFictionBooks().catch(() => []),
          musicService.getPopularAlbums().catch(() => [])
        ])

        const genreMatches: any[] = []
        
        // Check games
        allContent[0].forEach(game => {
          if (game.genres?.some((g: any) => g.name.toLowerCase().includes(favoriteGenre.toLowerCase()))) {
            const converted = rawgService.convertToAppFormat(game)
            if (!library.some(item => item.id === converted.id)) {
              genreMatches.push(converted)
            }
          }
        })

        // Check movies
        allContent[1].forEach(movie => {
          if (movie.Genre && movie.Genre.toLowerCase().includes(favoriteGenre.toLowerCase())) {
            const converted = omdbService.convertToAppFormat(movie)
            if (!library.some(item => item.id === converted.id)) {
              genreMatches.push(converted)
            }
          }
        })

        // Add top matches
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

  // Load all content
  const loadAllContent = async () => {
    try {
      await Promise.all([
        loadHeroContent(),
        loadGamesContent(),
        loadMoviesContent(),
        loadBooksContent(),
        loadMusicContent()
      ])
    } catch (error) {
      console.error('Error loading discover content:', error)
    }
  }

  // Load hero content (top items from each category) avec 4 catégories
  const loadHeroContent = async () => {
    try {
      setHeroLoading(true)
      
      const [games, movies, books, music] = await Promise.all([
        rawgService.getPopularGames().catch(() => []),
        omdbService.getPopularMovies().catch(() => []),
        googleBooksService.getFictionBooks().catch(() => []),
        musicService.getPopularAlbums().catch(() => [])
      ])

      const heroItems = [
        games[0] ? { 
          ...rawgService.convertToAppFormat(games[0]), 
          description: getDescriptionForHero('games'),
          callToAction: getCallToActionForCategory('games'),
          categoryLabel: 'Games'
        } : null,
        movies[0] ? { 
          ...omdbService.convertToAppFormat(movies[0]), 
          description: getDescriptionForHero('movies'),
          callToAction: getCallToActionForCategory('movies'),
          categoryLabel: 'Movies'
        } : null,
        books[0] ? { 
          ...googleBooksService.convertToAppFormat(books[0]), 
          description: getDescriptionForHero('books'),
          callToAction: getCallToActionForCategory('books'),
          categoryLabel: 'Books'
        } : null,
        music[0] ? { 
          ...musicService.convertToAppFormat(music[0]), 
          description: getDescriptionForHero('music'),
          callToAction: getCallToActionForCategory('music'),
          categoryLabel: 'Music'
        } : null
      ].filter(Boolean)

      setHeroContent(heroItems)
    } catch (error) {
      console.error('Error loading hero content:', error)
    } finally {
      setHeroLoading(false)
    }
  }

  // Load games content
  const loadGamesContent = async () => {
    try {
      const games = await rawgService.getPopularGames()
      const convertedGames = games.map(game => rawgService.convertToAppFormat(game))

      setCategorySections(prev => prev.map(section => 
        section.id === 'trending-games' 
          ? { ...section, items: convertedGames, loading: false }
          : section
      ))
    } catch (error) {
      console.error('Error loading games:', error)
      setCategorySections(prev => prev.map(section => 
        section.id === 'trending-games' 
          ? { ...section, loading: false }
          : section
      ))
    }
  }

  // Load movies content
  const loadMoviesContent = async () => {
    try {
      const movies = await omdbService.getPopularMovies()
      const convertedMovies = movies.map(movie => omdbService.convertToAppFormat(movie))

      setCategorySections(prev => prev.map(section => 
        section.id === 'popular-movies' 
          ? { ...section, items: convertedMovies, loading: false }
          : section
      ))
    } catch (error) {
      console.error('Error loading movies:', error)
      setCategorySections(prev => prev.map(section => 
        section.id === 'popular-movies' 
          ? { ...section, loading: false }
          : section
      ))
    }
  }

  // Load books content
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

  // Load music content
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

  // Helper functions
  const getDescriptionForHero = (category: string) => {
    const descriptions = {
      games: 'An epic adventure that redefines the gaming experience with stunning visuals and immersive storytelling.',
      movies: 'A cinematic masterpiece that captivates audiences with breathtaking visuals and compelling narrative.',
      books: 'A literary work that has captured readers worldwide with its engaging story and memorable characters.',
      music: 'An album that showcases artistic brilliance and has topped charts around the world.'
    }
    return descriptions[category as keyof typeof descriptions] || 'A remarkable piece of entertainment.'
  }

  const getCallToActionForCategory = (category: string) => {
    switch (category) {
      case 'games': return 'Play Now'
      case 'movies': return 'Watch Now'
      case 'books': return 'Read Now'
      case 'music': return 'Listen Now'
      default: return 'Explore'
    }
  }

  // Event handlers
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

  const handleHeroAction = (item: ContentItem) => {
    handleItemClick(item)
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

  const currentHeroItem = heroContent[currentHeroIndex]
  const filteredSections = getFilteredSections()

  return (
    <div className="bg-white min-h-screen">
      {/* Header sticky avec titre et filtres */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Titre Discover */}
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
          </div>

          {/* Filtres élégants sans icônes */}
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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

      {/* Hero Section redesignée */}
      <div className="px-4 sm:px-6 py-6">
        {heroLoading || !currentHeroItem ? (
          <div className="bg-gray-100 rounded-2xl h-80 animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            {/* Catégorie en haut */}
            <div className="px-6 pt-4 pb-2">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {currentHeroItem.categoryLabel}
              </span>
            </div>

            {/* Container scrollable horizontal pour les images */}
            <div className="relative">
              <div 
                className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                style={{ scrollBehavior: 'smooth' }}
              >
                {heroContent.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-full snap-center relative"
                  >
                    {/* Image avec overlay */}
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={item.image || ''}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                      
                      {/* Informations sur l'image */}
                      <div className="absolute bottom-4 left-6 right-6 text-white">
                        <div className="flex items-center space-x-4 mb-2">
                          {/* Rating */}
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={16}
                                className={`${
                                  star <= (item.rating || 0) ? 'text-yellow-400 fill-current' : 'text-white/40'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-white font-semibold">
                              {item.rating || 0}/5
                            </span>
                          </div>
                          
                          <span className="text-white/90">{item.year}</span>
                          
                          {item.genre && (
                            <span className="text-white/90">{item.genre}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Points de navigation en bas de l'image */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {heroContent.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentHeroIndex(index)
                      setIsAutoplay(false)
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentHeroIndex 
                        ? 'bg-white scale-125' 
                        : 'bg-white/60 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Titre et description en dessous */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                {currentHeroItem.title}
              </h2>
              
              <p className="text-gray-600 mb-4 leading-relaxed">
                {currentHeroItem.description ? 
                  currentHeroItem.description.substring(0, 150) + (currentHeroItem.description.length > 150 ? '...' : '') :
                  'Discover this amazing content and add it to your library!'
                }
              </p>

              {/* Bouton d'action */}
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  handleHeroAction(currentHeroItem)
                }}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Play size={18} className="mr-2" />
                {currentHeroItem.callToAction || 'Explore'}
              </button>
            </div>
          </div>
        )}
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
              {/* Section Header */}
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
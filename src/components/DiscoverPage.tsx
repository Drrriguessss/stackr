'use client'
import React, { useState, useEffect } from 'react'
import { Star, Plus, TrendingUp, ChevronRight, Play, Book, Headphones, Film, Check, MoreHorizontal, Loader2 } from 'lucide-react'
import { rawgService } from '@/services/rawgService'
import { omdbService } from '@/services/omdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
import type { ContentItem, LibraryItem, MediaStatus } from '@/types'

// Constants
const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'
const OMDB_API_KEY = '649f9a63'
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
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  library?: LibraryItem[]
}

export default function DiscoverPage({
  onAddToLibrary,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  library = []
}: DiscoverPageProps) {
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [showStatusPopup, setShowStatusPopup] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null)

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
        
        // Search for more content from this creator
        if (preferences.dominantCategory === 'games') {
          const games = await rawgService.getPopularGames()
          const creatorGames = games.filter(game => 
            game.developers?.some(dev => dev.name.toLowerCase().includes(favoriteCreator.toLowerCase()))
          )
          
          creatorGames.slice(0, 2).forEach(game => {
            const converted = rawgService.convertToAppFormat(game)
            if (!library.some(item => item.id === converted.id)) {
              recommendations.push(converted)
            }
          })
        }
        
        reasoning = `Because you loved content by ${favoriteCreator}`
      }

      // Strategy 2: Similar genres
      if (preferences.topGenres.length > 0 && recommendations.length < 4) {
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
              genreMatches.push({
                ...converted,
                score: calculateRecommendationScore(converted, preferences)
              })
            }
          }
        })

        // Check movies
        allContent[1].forEach(movie => {
          if (movie.Genre && movie.Genre.toLowerCase().includes(favoriteGenre.toLowerCase())) {
            const converted = omdbService.convertToAppFormat(movie)
            if (!library.some(item => item.id === converted.id)) {
              genreMatches.push({
                ...converted,
                score: calculateRecommendationScore(converted, preferences)
              })
            }
          }
        })

        // Sort by score and add top matches
        genreMatches
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 4 - recommendations.length)
          .forEach(item => recommendations.push(item))

        if (!reasoning && genreMatches.length > 0) {
          reasoning = `Because you love ${favoriteGenre} content`
        }
      }

      // Strategy 3: Trending in favorite category
      if (recommendations.length < 4) {
        const category = preferences.dominantCategory
        let categoryContent: any[] = []

        switch (category) {
          case 'games':
            categoryContent = await rawgService.getPopularGames().catch(() => [])
            break
          case 'movies':
            categoryContent = await omdbService.getPopularMovies().catch(() => [])
            break
          case 'books':
            categoryContent = await googleBooksService.getFictionBooks().catch(() => [])
            break
          case 'music':
            categoryContent = await musicService.getPopularAlbums().catch(() => [])
            break
        }

        categoryContent.slice(0, 4 - recommendations.length).forEach(item => {
          let converted: ContentItem

          switch (category) {
            case 'games':
              converted = rawgService.convertToAppFormat(item)
              break
            case 'movies':
              converted = omdbService.convertToAppFormat(item)
              break
            case 'books':
              converted = googleBooksService.convertToAppFormat(item)
              break
            case 'music':
              converted = musicService.convertToAppFormat(item)
              break
            default:
              return
          }

          if (!library.some(libItem => libItem.id === converted.id)) {
            recommendations.push(converted)
          }
        })

        if (!reasoning && recommendations.length > 0) {
          reasoning = `Trending ${category} picks for you`
        }
      }

      // Strategy 4: Based on high-rated items
      if (recommendations.length < 4 && preferences.highRatedItems.length > 0) {
        const favoriteItem = preferences.highRatedItems[0]
        const itemName = favoriteItem.title
        
        if (!reasoning) {
          reasoning = `Because you gave ${itemName} 5 stars`
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

  const calculateRecommendationScore = (item: ContentItem, preferences: any): number => {
    let score = 0

    // Genre match (40% weight)
    if (preferences.topGenres.includes(item.genre)) {
      score += 0.4
    }

    // Creator match (30% weight)
    const creator = item.author || item.artist || item.director
    if (preferences.topCreators.includes(creator)) {
      score += 0.3
    }

    // Year similarity (20% weight)
    const yearDiff = Math.abs(item.year - preferences.avgYear)
    if (yearDiff <= 2) {
      score += 0.2
    } else if (yearDiff <= 5) {
      score += 0.1
    }

    // Rating weight (10% weight)
    if (item.rating && item.rating >= 4.0) {
      score += 0.1
    }

    return score
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

  // Load hero content (top items from each category)
  const loadHeroContent = async () => {
    try {
      setHeroLoading(true)
      
      const [games, movies, books] = await Promise.all([
        rawgService.getPopularGames().catch(() => []),
        omdbService.getPopularMovies().catch(() => []),
        googleBooksService.getFictionBooks().catch(() => [])
      ])

      const heroItems = [
        games[0] ? { 
          ...rawgService.convertToAppFormat(games[0]), 
          subtitle: 'Game of the Year',
          description: getDescriptionForHero('games'),
          callToAction: getCallToActionForCategory('games'),
          stats: {
            trending: '+' + Math.floor(Math.random() * 100 + 50) + '%',
            users: (Math.random() * 2 + 0.5).toFixed(1) + 'M',
            engagement: Math.floor(Math.random() * 10 + 90) + '%'
          }
        } : null,
        movies[0] ? { 
          ...omdbService.convertToAppFormat(movies[0]), 
          subtitle: 'Epic Masterpiece',
          description: getDescriptionForHero('movies'),
          callToAction: getCallToActionForCategory('movies'),
          stats: {
            trending: '+' + Math.floor(Math.random() * 100 + 50) + '%',
            users: (Math.random() * 2 + 0.5).toFixed(1) + 'M',
            engagement: Math.floor(Math.random() * 10 + 90) + '%'
          }
        } : null,
        books[0] ? { 
          ...googleBooksService.convertToAppFormat(books[0]), 
          subtitle: 'Literary Phenomenon',
          description: getDescriptionForHero('books'),
          callToAction: getCallToActionForCategory('books'),
          stats: {
            trending: '+' + Math.floor(Math.random() * 100 + 50) + '%',
            users: (Math.random() * 2 + 0.5).toFixed(1) + 'M',
            engagement: Math.floor(Math.random() * 10 + 90) + '%'
          }
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
      const convertedGames = games.map(game => {
        const converted = rawgService.convertToAppFormat(game)
        return {
          ...converted,
          trending: '+' + Math.floor(Math.random() * 100 + 20) + '%',
          status: getRandomStatus(),
          stats: {
            users: (Math.random() * 3 + 0.5).toFixed(1) + 'M',
            completion: Math.floor(Math.random() * 20 + 80) + '%'
          }
        } as ContentItem & { trending: string; status: string; stats: any }
      })

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
      const convertedMovies = movies.map(movie => {
        const converted = omdbService.convertToAppFormat(movie)
        return {
          ...converted,
          trending: '+' + Math.floor(Math.random() * 100 + 20) + '%',
          status: getRandomStatus()
        } as ContentItem & { trending: string; status: string }
      })

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
      const convertedBooks = books.map(book => {
        const converted = googleBooksService.convertToAppFormat(book)
        return {
          ...converted,
          trending: '+' + Math.floor(Math.random() * 100 + 20) + '%',
          status: getRandomStatus()
        } as ContentItem & { trending: string; status: string }
      })

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
      const convertedAlbums = albums.map(album => {
        const converted = musicService.convertToAppFormat(album)
        return {
          ...converted,
          trending: '+' + Math.floor(Math.random() * 100 + 20) + '%',
          status: getRandomStatus()
        } as ContentItem & { trending: string; status: string }
      })

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
  const getRandomStatus = (): 'new' | 'trending' | 'hot' => {
    const statuses: ('new' | 'trending' | 'hot')[] = ['new', 'trending', 'hot']
    return statuses[Math.floor(Math.random() * statuses.length)]
  }

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

  const getStatusBadge = (status?: 'new' | 'trending' | 'hot', trending?: string) => {
    if (status === 'hot') {
      return (
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center space-x-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
          <span>HOT</span>
        </div>
      )
    }
    if (status === 'new') {
      return (
        <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
          NEW
        </div>
      )
    }
    if (trending) {
      return (
        <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center space-x-1">
          <TrendingUp size={10} />
          <span>{trending}</span>
        </div>
      )
    }
    return null
  }

  const currentHeroItem = heroContent[currentHeroIndex]

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-6 h-6 text-gray-700" />
          </button>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">Discover</h1>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">👤</span>
            </div>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="px-6 pb-8">
        {heroLoading || !currentHeroItem ? (
          <div className="bg-gray-100 rounded-3xl h-80 animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <div className="relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            {/* Hero Image */}
            <div className="relative h-80 overflow-hidden">
              <img
                src={currentHeroItem.image || ''}
                alt={currentHeroItem.title}
                className="w-full h-full object-cover"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
              
              {/* Navigation dots */}
              <div className="absolute top-4 right-4 flex space-x-2">
                {heroContent.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentHeroIndex(index)
                      setIsAutoplay(false)
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentHeroIndex 
                        ? 'bg-white scale-125' 
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Hero Content */}
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {currentHeroItem.title}
                </h2>
                {currentHeroItem.subtitle && (
                  <p className="text-lg text-gray-600 mb-3">{currentHeroItem.subtitle}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        className={`${
                          star <= (currentHeroItem.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-200'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-gray-600 font-medium">{currentHeroItem.rating || 0}/5</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{currentHeroItem.year}</span>
                    <span>{currentHeroItem.genre || 'Unknown'}</span>
                    <span>{currentHeroItem.author || currentHeroItem.artist || currentHeroItem.director || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed mb-6 line-clamp-2">
                {currentHeroItem.description || 'Discover this amazing content and add it to your library!'}
              </p>

              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleHeroAction(currentHeroItem)}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-4 px-6 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Play size={18} />
                  <span>{currentHeroItem.callToAction || 'Explore'}</span>
                </button>
                
                <button 
                  onClick={() => handleAddToLibrary(currentHeroItem)}
                  className="p-4 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
                >
                  <Plus size={20} className="text-gray-700" />
                </button>
              </div>

              {currentHeroItem.stats && (
                <div className="flex items-center justify-center space-x-8 mt-6 pt-6 border-t border-gray-100">
                  {currentHeroItem.stats.users && (
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{currentHeroItem.stats.users}</div>
                      <div className="text-xs text-gray-500">Users</div>
                    </div>
                  )}
                  {currentHeroItem.stats.trending && (
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{currentHeroItem.stats.trending}</div>
                      <div className="text-xs text-gray-500">This week</div>
                    </div>
                  )}
                  {currentHeroItem.stats.engagement && (
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{currentHeroItem.stats.engagement}</div>
                      <div className="text-xs text-gray-500">Satisfaction</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* For You Section */}
      {library.length >= MIN_LIBRARY_ITEMS && (
        <div className="px-6 pb-8">
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                <div className="text-purple-700">
                  <Star size={20} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">For You</h2>
                <p className="text-sm text-gray-500">{forYouSection.reasoning}</p>
              </div>
            </div>
          </div>

          {forYouSection.loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-3xl h-48 animate-pulse"></div>
              ))}
            </div>
          ) : forYouSection.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {forYouSection.items.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-3xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  {/* Image */}
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={item.image || ''}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Add button */}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isInLibrary(item.id) ? (
                        <div className="bg-green-500 text-white p-2 rounded-full shadow-lg flex items-center justify-center">
                          <Check size={16} />
                        </div>
                      ) : addingItem === item.id ? (
                        <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg animate-pulse">
                          <Plus size={16} />
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
                            <Plus size={16} />
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
                                className="absolute bottom-full right-0 mb-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200 py-2 min-w-44 z-[999]"
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
                                    className="w-full text-left px-4 py-2.5 text-sm transition-all duration-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium"
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
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                        {item.title}
                      </h3>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center space-x-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className={`${
                            star <= (item.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{item.rating || 0}/5</span>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{item.author || item.artist || item.director}</span>
                      <span>{item.year}</span>
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
      )}

      {/* Category Sections */}
      <div className="space-y-8 pb-24">
        {categorySections.map((section) => {
          const colors = getColorClasses(section.color)
          const isExpanded = expandedSection === section.id
          const itemsToShow = isExpanded ? section.items : section.items.slice(0, 4)
          
          return (
            <div key={section.id} className="px-6">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-2xl ${colors.bg} ${colors.border} border`}>
                    <div className={colors.text}>
                      {section.icon}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-500">{section.subtitle}</p>
                  </div>
                </div>
                
                {!section.loading && section.items.length > 4 && (
                  <button 
                    onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <span>{isExpanded ? 'Show less' : 'See all'}</span>
                    <ChevronRight 
                      size={16} 
                      className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  </button>
                )}
              </div>

              {/* Content Grid */}
              {section.loading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-3xl h-48 animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {itemsToShow.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-white rounded-3xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      {/* Image */}
                      <div className="relative h-32 overflow-hidden">
                        <img
                          src={item.image || ''}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        
                        {getStatusBadge((item as any).status, (item as any).trending)}
                        
                        {/* Add button */}
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isInLibrary(item.id) ? (
                            <div className="bg-green-500 text-white p-2 rounded-full shadow-lg flex items-center justify-center">
                              <Check size={16} />
                            </div>
                          ) : addingItem === item.id ? (
                            <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg animate-pulse">
                              <Plus size={16} />
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
                                <Plus size={16} />
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
                                    className="absolute bottom-full right-0 mb-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200 py-2 min-w-44 z-[999]"
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
                                        className="w-full text-left px-4 py-2.5 text-sm transition-all duration-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium"
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
                      <div className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                            {item.title}
                          </h3>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center space-x-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={`${
                                star <= (item.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-200'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{item.rating || 0}/5</span>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{item.author || item.artist || item.director}</span>
                          <span>{item.year}</span>
                        </div>

                        {/* Stats if available */}
                        {(item as any).stats && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                            {(item as any).stats.users && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <span>{(item as any).stats.users}</span>
                              </div>
                            )}
                            {(item as any).stats.completion && (
                              <div className="text-xs text-green-600 font-medium">
                                {(item as any).stats.completion}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expansion indicator */}
              {isExpanded && section.items.length > 4 && (
                <div className="mt-4 animate-fade-in">
                  <div className="text-center text-sm text-gray-500">
                    {section.items.length} items total
                  </div>
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
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
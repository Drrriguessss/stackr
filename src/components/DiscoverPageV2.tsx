// src/components/DiscoverPageV2.tsx - Version complètement réécrite
'use client'
import React, { useState, useEffect } from 'react'
import { Star, Plus, Film, Book, Headphones, Play, Check, Loader2, TrendingUp } from 'lucide-react'
import { cheapSharkGameService } from '@/services/cheapSharkService'
import { tmdbService } from '@/services/tmdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
import type { ContentItem, LibraryItem, MediaStatus } from '@/types'

interface DiscoverPageProps {
  onAddToLibrary?: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  library?: LibraryItem[]
}

interface ContentSection {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  items: ContentItem[]
  loading: boolean
}

export default function DiscoverPageV2({
  onAddToLibrary,
  onDeleteItem,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  library = []
}: DiscoverPageProps) {
  
  // 🎯 États simplifiés
  const [sections, setSections] = useState<ContentSection[]>([
    {
      id: 'trending-games',
      title: '🔥 Trending Games',
      subtitle: 'Most popular games right now',
      icon: <Play size={20} />,
      items: [],
      loading: true
    },
    {
      id: 'popular-movies',
      title: '🎬 Popular Movies',
      subtitle: 'Top-rated movies this week',
      icon: <Film size={20} />,
      items: [],
      loading: true
    },
    {
      id: 'new-books',
      title: '📚 Bestselling Books',
      subtitle: 'Popular fiction and non-fiction',
      icon: <Book size={20} />,
      items: [],
      loading: true
    },
    {
      id: 'hot-music',
      title: '🎵 Hot Albums',
      subtitle: 'Trending music and albums',
      icon: <Headphones size={20} />,
      items: [],
      loading: true
    }
  ])

  const [showStatusPopup, setShowStatusPopup] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [heroItem, setHeroItem] = useState<ContentItem | null>(null)
  const [heroLoading, setHeroLoading] = useState(true)

  // 🚀 Charger tout le contenu au démarrage
  useEffect(() => {
    console.log('🔥 [DiscoverV2] Loading all content...')
    loadAllContent()
  }, [])

  // ✅ Fonction principale de chargement
  const loadAllContent = async () => {
    console.log('🔥 [DiscoverV2] Starting content loading...')
    
    try {
      // Charger en parallèle tous les types de contenu
      const [games, movies, books, music] = await Promise.all([
        loadGames(),
        loadMovies(), 
        loadBooks(),
        loadMusic()
      ])

      console.log('🔥 [DiscoverV2] All content loaded:', {
        games: games.length,
        movies: movies.length, 
        books: books.length,
        music: music.length
      })

      // Sélectionner un hero item des jeux
      if (games.length > 0) {
        setHeroItem(games[0])
      }
      setHeroLoading(false)

    } catch (error) {
      console.error('❌ [DiscoverV2] Error loading content:', error)
      setHeroLoading(false)
    }
  }

  // 🎮 Charger les jeux
  const loadGames = async (): Promise<ContentItem[]> => {
    try {
      console.log('🎮 [DiscoverV2] Loading games...')
      
      const games = await cheapSharkGameService.getTrendingGames()
      console.log(`🎮 [DiscoverV2] Loaded ${games.length} games`)

      // Mettre à jour la section jeux
      setSections(prev => prev.map(section => 
        section.id === 'trending-games' 
          ? { ...section, items: games, loading: false }
          : section
      ))

      return games
    } catch (error) {
      console.error('❌ [DiscoverV2] Error loading games:', error)
      setSections(prev => prev.map(section => 
        section.id === 'trending-games' 
          ? { ...section, loading: false }
          : section
      ))
      return []
    }
  }

  // 🎬 Charger les films
  const loadMovies = async (): Promise<ContentItem[]> => {
    try {
      console.log('🎬 [DiscoverV2] Loading movies...')
      
      const movies = await tmdbService.getTrendingMovies('week')
      console.log(`🎬 [DiscoverV2] Loaded ${movies.length} movies`)

      setSections(prev => prev.map(section => 
        section.id === 'popular-movies' 
          ? { ...section, items: movies.slice(0, 8), loading: false }
          : section
      ))

      return movies.slice(0, 8)
    } catch (error) {
      console.error('❌ [DiscoverV2] Error loading movies:', error)
      setSections(prev => prev.map(section => 
        section.id === 'popular-movies' 
          ? { ...section, loading: false }
          : section
      ))
      return []
    }
  }

  // 📚 Charger les livres
  const loadBooks = async (): Promise<ContentItem[]> => {
    try {
      console.log('📚 [DiscoverV2] Loading books...')
      
      const rawBooks = await googleBooksService.getFictionBooks()
      const books = rawBooks.map(book => googleBooksService.convertToAppFormat(book))
      console.log(`📚 [DiscoverV2] Loaded ${books.length} books`)

      setSections(prev => prev.map(section => 
        section.id === 'new-books' 
          ? { ...section, items: books.slice(0, 8), loading: false }
          : section
      ))

      return books.slice(0, 8)
    } catch (error) {
      console.error('❌ [DiscoverV2] Error loading books:', error)
      setSections(prev => prev.map(section => 
        section.id === 'new-books' 
          ? { ...section, loading: false }
          : section
      ))
      return []
    }
  }

  // 🎵 Charger la musique
  const loadMusic = async (): Promise<ContentItem[]> => {
    try {
      console.log('🎵 [DiscoverV2] Loading music...')
      
      const rawAlbums = await musicService.getPopularAlbums()
      const albums = rawAlbums.map(album => musicService.convertToAppFormat(album))
      console.log(`🎵 [DiscoverV2] Loaded ${albums.length} albums`)

      setSections(prev => prev.map(section => 
        section.id === 'hot-music' 
          ? { ...section, items: albums.slice(0, 8), loading: false }
          : section
      ))

      return albums.slice(0, 8)
    } catch (error) {
      console.error('❌ [DiscoverV2] Error loading music:', error)
      setSections(prev => prev.map(section => 
        section.id === 'hot-music' 
          ? { ...section, loading: false }
          : section
      ))
      return []
    }
  }

  // 🎯 Gestionnaires d'événements
  const handleItemClick = (item: ContentItem) => {
    console.log('🎯 [DiscoverV2] Item clicked:', item.id, item.category)
    
    // Nettoyer l'ID pour les callbacks
    const cleanId = item.id.replace(/^(game-cs-|game-|movie-|book-|music-)/, '')
    
    switch (item.category) {
      case 'games':
        onOpenGameDetail?.(cleanId)
        break
      case 'movies':
        onOpenMovieDetail?.(cleanId)
        break
      case 'books':
        onOpenBookDetail?.(cleanId)
        break
      case 'music':
        onOpenMusicDetail?.(cleanId)
        break
    }
  }

  const handleAddToLibrary = (item: ContentItem, status: MediaStatus = 'want-to-play') => {
    if (!onAddToLibrary) return
    
    console.log('➕ [DiscoverV2] Adding to library:', item.title, status)
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
      director: item.category === 'movies' ? item.director : undefined,
      developer: item.category === 'games' ? item.developer : undefined
    }
    
    onAddToLibrary(libraryItem, status)
    
    setTimeout(() => setAddingItem(null), 1500)
  }

  const handleRemoveFromLibrary = (item: ContentItem) => {
    if (!onDeleteItem) return
    console.log('➖ [DiscoverV2] Removing from library:', item.title)
    onDeleteItem(item.id)
  }

  const isInLibrary = (itemId: string): boolean => {
    return library.some(item => item.id === itemId)
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
        return [{ value: 'want-to-play', label: 'Add to Library' }]
    }
  }

  // 🎨 Composant Hero Section
  const renderHeroSection = () => {
    if (heroLoading || !heroItem) {
      return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl h-64 animate-pulse flex items-center justify-center mb-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading trending content...</p>
          </div>
        </div>
      )
    }

    return (
      <div 
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl overflow-hidden shadow-xl mb-8 cursor-pointer transform hover:scale-[1.02] transition-transform"
        onClick={() => handleItemClick(heroItem)}
      >
        <div className="flex items-center h-64">
          {/* Image */}
          <div className="w-1/3 h-full relative">
            <img
              src={heroItem.image || ''}
              alt={heroItem.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-600/20"></div>
          </div>
          
          {/* Contenu */}
          <div className="w-2/3 p-8 text-white">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp size={20} className="text-yellow-300" />
              <span className="bg-yellow-300 text-blue-900 px-3 py-1 rounded-full text-sm font-bold">
                TRENDING NOW
              </span>
            </div>
            
            <h1 className="text-3xl font-bold mb-3 leading-tight">
              {heroItem.title}
            </h1>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={`${
                      star <= (heroItem.rating || 0) ? 'text-yellow-300 fill-current' : 'text-white/40'
                    }`}
                  />
                ))}
                <span className="text-white/90 ml-2">{heroItem.rating}/5</span>
              </div>
              <span className="text-white/90">•</span>
              <span className="text-white/90">{heroItem.year}</span>
              <span className="text-white/90">•</span>
              <span className="text-white/90">{heroItem.genre}</span>
            </div>
            
            <p className="text-white/90 mb-6 leading-relaxed">
              {heroItem.description || `Experience the best of ${heroItem.category} with this trending title that's capturing everyone's attention.`}
            </p>
            
            <button 
              onClick={(e) => {
                e.stopPropagation()
                handleItemClick(heroItem)
              }}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            >
              <Play size={16} className="inline mr-2" />
              Explore Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 🎨 Composant Card Item
  const renderContentCard = (item: ContentItem) => (
    <div
      key={item.id}
      className="flex-shrink-0 w-32 cursor-pointer group"
      onClick={() => handleItemClick(item)}
    >
      <div className="relative bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
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
            <span className="truncate">{item.author || item.artist || item.director || item.developer || item.genre}</span>
            <span>{item.year}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-white min-h-screen">
      {/* Header simple */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
            <div className="text-xs text-gray-500 flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live trending data</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6">
        {/* Hero Section */}
        {renderHeroSection()}

        {/* Content Sections */}
        <div className="space-y-8 pb-24">
          {sections.map((section) => (
            <div key={section.id}>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-500">{section.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              {section.loading ? (
                <div className="flex space-x-4 overflow-x-auto pb-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex-shrink-0 w-32 bg-gray-100 rounded-2xl h-44 animate-pulse"></div>
                  ))}
                </div>
              ) : section.items.length > 0 ? (
                <div className="flex space-x-4 overflow-x-auto pb-2 horizontal-scroll">
                  {section.items.map(renderContentCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No content available at the moment.</p>
                </div>
              )}
            </div>
          ))}
        </div>
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
        }
        
        .horizontal-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
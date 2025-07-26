// src/components/DiscoverPageV2.tsx - Version complètement réécrite
'use client'
import React, { useState, useEffect } from 'react'
import { Star, Plus, Film, Book, Headphones, Play, Check, Loader2, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { cheapSharkGameService } from '@/services/cheapSharkService'
import { gameSearchService } from '@/services/gameSearchService'
import { tmdbService } from '@/services/tmdbService'
import { googleBooksService } from '@/services/googleBooksService'
import { musicService } from '@/services/musicService'
import { movieCorrelationService } from '@/services/movieCorrelationService'
import { omdbService } from '@/services/omdbService'
import { movieSearchService } from '@/services/movieSearchService'
import { bookSearchService } from '@/services/bookSearchService'
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
      title: 'Trending Games',
      subtitle: 'Most popular games right now',
      icon: <Play size={20} />,
      items: [],
      loading: true
    },
    {
      id: 'popular-movies',
      title: 'Popular Movies',
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
  const [heroItems, setHeroItems] = useState<ContentItem[]>([])
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0)
  const [heroLoading, setHeroLoading] = useState(true)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // 🚀 Charger tout le contenu au démarrage
  useEffect(() => {
    console.log('🔥 [DiscoverV2] Loading all content... VERSION 2 (Fixed URLs)')
    loadAllContent()
  }, [])

  // ✅ Fonction principale de chargement
  const loadAllContent = async () => {
    console.log('🔥 [DiscoverV2] Starting content loading...')
    
    try {
      // Charger 4 jeux trending + 4 films + 4 livres + 4 musiques quotidiens et le contenu en parallèle
      const [trendingGames, dailyHeroMovies, dailyHeroBooks, dailyHeroMusic, games, movies, books, music] = await Promise.all([
        cheapSharkGameService.getTrendingGames(),
        tmdbService.getDailyHeroMovies(),
        googleBooksService.getDailyHeroBooks(),
        musicService.getDailyHeroMusic(),
        loadGames(),
        loadMovies(), 
        loadBooks(),
        loadMusic()
      ])

      console.log('🔥 [DiscoverV2] All content loaded:', {
        trendingGames: trendingGames.length,
        heroMovies: dailyHeroMovies.length,
        heroBooks: dailyHeroBooks.length,
        heroMusic: dailyHeroMusic.length,
        games: games.length,
        movies: movies.length, 
        books: books.length,
        music: music.length
      })

      // Combiner 4 jeux + 4 films + 4 livres + 4 musiques pour Today's Picks (16 total)
      const heroGames = trendingGames.slice(0, 4) // Prendre 4 jeux de trending
      
      // Debug: vérifier les images de chaque catégorie
      console.log('🎮 Hero Games:', heroGames.map(g => ({ title: g.title, image: g.image, hasImage: !!g.image })))
      console.log('🎬 Hero Movies:', dailyHeroMovies.map(m => ({ title: m.title, image: m.image, hasImage: !!m.image })))
      console.log('📚 Hero Books:', dailyHeroBooks.map(b => ({ title: b.title, image: b.image, hasImage: !!b.image })))
      console.log('🎵 Hero Music:', dailyHeroMusic.map(m => ({ title: m.title, image: m.image, hasImage: !!m.image })))
      
      const combinedHeroItems = [...heroGames, ...dailyHeroMovies, ...dailyHeroBooks, ...dailyHeroMusic]
      if (combinedHeroItems.length > 0) {
        setHeroItems(combinedHeroItems)
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
  const handleItemClick = async (item: ContentItem) => {
    console.log('🎯 [DiscoverV2] Item clicked:', item.id, item.category)
    
    switch (item.category) {
      case 'games':
        // ✅ NOUVEAU: Pour les jeux CheapShark, rechercher sur RAWG
        if (item.id.startsWith('game-cs-')) {
          console.log('🔍 [DiscoverV2] CheapShark game clicked, searching RAWG for:', item.title)
          
          try {
            const rawgId = await gameSearchService.searchGameByName(item.title)
            if (rawgId) {
              console.log('✅ [DiscoverV2] Found RAWG ID:', rawgId, 'for', item.title)
              onOpenGameDetail?.(rawgId)
            } else {
              console.log('❌ [DiscoverV2] No RAWG match found for:', item.title)
              // Fallback vers ID CheapShark (utilisera les données mockées)
              const cleanId = item.id.replace('game-cs-', '')
              onOpenGameDetail?.(cleanId)
            }
          } catch (error) {
            console.error('❌ [DiscoverV2] Error searching RAWG:', error)
            // Fallback vers ID CheapShark
            const cleanId = item.id.replace('game-cs-', '')
            onOpenGameDetail?.(cleanId)
          }
        } else {
          // Jeux non-CheapShark (RAWG classique)
          const cleanId = item.id.replace(/^game-/, '')
          onOpenGameDetail?.(cleanId)
        }
        break
      case 'movies':
        // ✅ SIMILAIRE AUX JEUX: Pour tous les films, rechercher sur OMDB par titre
        console.log('🔍 [DiscoverV2] Movie clicked, searching OMDB for:', item.title)
        
        try {
          const omdbId = await movieSearchService.searchMovieByName(item.title)
          if (omdbId) {
            console.log('✅ [DiscoverV2] Found OMDB ID:', omdbId, 'for', item.title)
            onOpenMovieDetail?.(omdbId)
          } else {
            console.log('❌ [DiscoverV2] No OMDB match found for:', item.title)
            // Fallback vers ID basé sur le titre
            const fallbackId = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
            onOpenMovieDetail?.(fallbackId)
          }
        } catch (error) {
          console.error('❌ [DiscoverV2] Error searching OMDB:', error)
          // Fallback vers ID basé sur le titre
          const fallbackId = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
          onOpenMovieDetail?.(fallbackId)
        }
        break
      case 'books':
        // ✅ SIMILAIRE AUX FILMS: Pour tous les livres, rechercher sur Google Books par titre
        console.log('🔍 [DiscoverV2] Book clicked, searching Google Books for:', item.title)
        
        try {
          const author = (item as any).author // Les livres ont une propriété author
          const googleBookId = await bookSearchService.searchBookByName(item.title, author)
          if (googleBookId) {
            console.log('✅ [DiscoverV2] Found Google Books ID:', googleBookId, 'for', item.title)
            onOpenBookDetail?.(googleBookId)
          } else {
            console.log('❌ [DiscoverV2] No Google Books match found for:', item.title)
            // Fallback vers ID basé sur le titre
            const fallbackId = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
            onOpenBookDetail?.(fallbackId)
          }
        } catch (error) {
          console.error('❌ [DiscoverV2] Error searching Google Books:', error)
          // Fallback vers ID basé sur le titre
          const fallbackId = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
          onOpenBookDetail?.(fallbackId)
        }
        break
      case 'music':
        const cleanMusicId = item.id.replace(/^music-/, '')
        onOpenMusicDetail?.(cleanMusicId)
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

  // 🎨 Hero Carousel avec 4 jeux quotidiens
  const renderHeroSection = () => {
    if (heroLoading || heroItems.length === 0) {
      return (
        <div className="bg-black rounded-2xl h-64 animate-pulse flex items-center justify-center mb-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading daily games...</p>
          </div>
        </div>
      )
    }

    const currentHero = heroItems[currentHeroIndex]
    const nextSlide = () => setCurrentHeroIndex((prev) => (prev + 1) % heroItems.length)
    const prevSlide = () => setCurrentHeroIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length)

    // 👆 Gestionnaires de swipe tactile
    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null)
      setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return
      
      const distance = touchStart - touchEnd
      const isLeftSwipe = distance > minSwipeDistance
      const isRightSwipe = distance < -minSwipeDistance

      if (isLeftSwipe) {
        nextSlide() // Swipe gauche = slide suivant
      } else if (isRightSwipe) {
        prevSlide() // Swipe droite = slide précédent
      }
    }

    return (
      <div className="relative mb-8">
        {/* Header du carrousel */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Today's Picks <span className="text-xl font-semibold text-gray-900">({currentHeroIndex + 1}/{heroItems.length})</span>
            </h2>
            <p className="text-sm text-gray-500">Ideas to enlarge your library</p>
          </div>
          {/* Boutons navigation seulement sur desktop */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={prevSlide}
              className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={nextSlide}
              className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Carrousel principal */}
        <div 
          className="bg-white rounded-2xl overflow-hidden shadow-2xl cursor-pointer border-2 border-black"
          onClick={() => handleItemClick(currentHero)}
        >
          {/* Mobile Layout avec swipe */}
          <div 
            className="block sm:hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex h-56 bg-white">
              {/* Info à gauche (50%) */}
              <div className="w-1/2 p-3 bg-black text-white flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-white leading-tight">{currentHero.title}</h3>
                  
                  <div className="flex items-center gap-2 text-xs mb-2 text-gray-400">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={10}
                          className={`${
                            star <= (currentHero.rating || 0) ? 'text-white fill-current' : 'text-gray-700'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-white text-xs">{currentHero.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-xs text-gray-400 mb-3">
                    <span>{currentHero.year}</span>
                    <span>{currentHero.platform || 'PC'}</span>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleItemClick(currentHero)
                  }}
                  className="bg-white text-black px-3 py-2 rounded-lg text-xs font-medium w-full hover:bg-gray-100 transition-colors"
                >
                  View Details
                </button>
              </div>
              
              {/* Image à droite (50%) */}
              <div className="w-1/2 h-full bg-white p-2 flex items-center justify-center relative">
                {/* Category Sticker */}
                <div className={`absolute top-1 right-1 px-2 py-1 rounded-full text-xs font-medium text-white z-10 ${
                  currentHero.category === 'games' ? 'bg-blue-600' :
                  currentHero.category === 'movies' ? 'bg-red-600' :
                  currentHero.category === 'books' ? 'bg-green-600' :
                  'bg-purple-600'
                }`}>
                  {currentHero.category === 'games' ? 'GAME' :
                   currentHero.category === 'movies' ? 'MOVIE' :
                   currentHero.category === 'books' ? 'BOOK' :
                   'MUSIC'}
                </div>
                {currentHero.image ? (
                  <img
                    src={currentHero.image}
                    alt={currentHero.title}
                    className="max-w-full max-h-full object-contain border-2 border-gray-400 rounded-lg shadow-sm"
                  onError={(e) => {
                    console.error(`🖼️ Mobile hero image failed to load:`, {
                      title: currentHero.title,
                      category: currentHero.category,
                      originalSrc: currentHero.image,
                      error: 'Image load failed'
                    })
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMDAwMDAwIi8+CjxwYXRoIGQ9Ik0xNjAgMTYwSDI0MFYyNDBIMTYwVjE2MFoiIGZpbGw9IiMyMjIyMjIiLz4KPHBhdGggZD0iTTIwMCAyODBDMjI3LjYxNCAyODAgMjUwIDI1Ny42MTQgMjUwIDIzMEMyNTAgMjAyLjM4NiAyMjcuNjE0IDE4MCAyMDAgMTgwQzE3Mi4zODY IDE4MCAxNTAgMjAyLjM4NiAxNTAgMjMwQzE1MCAyNTcuNjE0IDE3Mi4zODYgMjgwIDIwMCAyODBaIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg=='
                  }}
                />
                ) : (
                  <div className="w-full h-full flex items-center justify-center border-2 border-gray-400 rounded-lg bg-gray-50">
                    <div className="text-center text-gray-600">
                      <svg className="w-12 h-12 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs">Image not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Instructions swipe en bas */}
            <div className="text-center py-2 bg-white border-t border-gray-200">
              <span className="text-xs text-gray-500">← Swipe →</span>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center h-64">
            <div className="w-2/5 lg:w-1/3 h-full relative bg-white p-3 flex items-center justify-center">
              {/* Category Sticker */}
              <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-medium text-white z-10 ${
                currentHero.category === 'games' ? 'bg-blue-600' :
                currentHero.category === 'movies' ? 'bg-red-600' :
                currentHero.category === 'books' ? 'bg-green-600' :
                'bg-purple-600'
              }`}>
                {currentHero.category === 'games' ? 'GAME' :
                 currentHero.category === 'movies' ? 'MOVIE' :
                 currentHero.category === 'books' ? 'BOOK' :
                 'MUSIC'}
              </div>
              {currentHero.image ? (
                <img
                  src={currentHero.image}
                  alt={currentHero.title}
                  className="max-w-full max-h-full object-contain border-2 border-gray-400 rounded-lg shadow-sm"
                  onError={(e) => {
                    console.error(`🖼️ Hero image failed to load:`, {
                      title: currentHero.title,
                      category: currentHero.category,
                      originalSrc: currentHero.image,
                      error: 'Image load failed'
                    })
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMDAwMDAwIi8+CjxwYXRoIGQ9Ik0xNjAgMTYwSDI0MFYyNDBIMTYwVjE2MFoiIGZpbGw9IiMyMjIyMjIiLz4KPHBhdGggZD0iTTIwMCAyODBDMjI3LjYxNCAyODAgMjUwIDI1Ny42MTQgMjUwIDIzMEMyNTAgMjAyLjM4NiAyMjcuNjE0IDE4MCAyMDAgMTgwQzE3Mi4zODYgMTgwIDE1MCAyMDIuMzg2IDE1MCAyMzBDMTUwIDI1Ny42MTQgMTcyLjM4NiAyODAgMjAwIDI4MFoiIGZpbGw9IiMzMzMzMzMiLz4KPHRleHQgeD0iMjAwIiB5PSIzMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2Ugbm90IGF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center border-2 border-gray-400 rounded-lg bg-gray-50">
                  <div className="text-center text-gray-600">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Image not available</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Instructions swipe desktop dans partie blanche */}
            <div className="text-center py-2 bg-white border-t border-gray-200">
              <span className="text-xs text-gray-500">← Swipe →</span>
            </div>
            
            <div className="w-3/5 lg:w-2/3 p-8 lg:p-12 text-white flex flex-col justify-center bg-black">
              <h1 className="text-3xl lg:text-4xl font-light mb-4 text-white">
                {currentHero.title}
              </h1>
              
              <div className="flex items-center space-x-6 mb-6 text-gray-400">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      className={`${
                        star <= (currentHero.rating || 0) ? 'text-white fill-current' : 'text-gray-700'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-white text-lg">{currentHero.rating}</span>
                </div>
                <span className="text-white">{currentHero.year}</span>
                <span className="text-white">{currentHero.platform || 'PC'}</span>
              </div>
              
              <p className="text-gray-400 mb-8 leading-relaxed max-w-2xl hidden lg:block">
                {currentHero.description || 'An exceptional gaming experience that redefines the genre.'}
              </p>
              
              <div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleItemClick(currentHero)
                  }}
                  className="bg-white text-black px-8 py-3 rounded-xl font-medium hover:bg-gray-100 transition-all duration-200 shadow-lg"
                >
                  View Details
                </button>
              </div>
            </div>
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
        <div className="relative h-40 overflow-hidden bg-gray-100">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-contain bg-gray-900 group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                console.error(`🖼️ Content card image failed to load:`, {
                  title: item.title,
                  category: item.category,
                  originalSrc: item.image,
                  error: 'Image load failed'
                })
                // Remplacer par placeholder si l'image ne charge pas
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xNjAgMTYwSDI0MFYyNDBIMTYwVjE2MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTIwMCAyODBDMjI3LjYxNCAyODAgMjUwIDI1Ny42MTQgMjUwIDIzMEMyNTAgMjAyLjM4NiAyMjcuNjE0IDE4MCAyMDAgMTgwQzE3Mi4zODYgMTgwIDE1MCAyMDyuMzg2IDE1MCAyMzBDMTUwIDI1Ny42MTQgMTcyLjM4NiAyODAgMjAwIDI4MFoiIGZpbGw9IiM2QjcyODAiLz4KPHRleHQgeD0iMjAwIiB5PSIzMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzRCNTU2MyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2Ugbm90IGF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <div className="text-center">
                <div className="text-gray-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 font-medium">Image not available</p>
              </div>
            </div>
          )}
          
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
            <span className="truncate">
              {item.category === 'games' 
                ? (item.genre !== 'PC Game' ? item.genre : '') 
                : (item.author || item.artist || item.director || '')}
            </span>
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
'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Play, ChevronLeft, ChevronRight, Share } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { omdbService } from '@/services/omdbService'
import { imageService } from '@/services/imageService'
import { trailerService } from '@/services/trailerService'
import { userReviewsService } from '@/services/userReviewsService'
import { tmdbReviewsService, type ProcessedReview } from '@/services/tmdbReviewsService'

interface MovieDetailModalV3Props {
  isOpen: boolean
  onClose: () => void
  movieId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onMovieSelect?: (movieId: string) => void
}

interface MovieDetail {
  imdbID: string
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Actors: string
  Plot: string
  Poster: string
  imdbRating: string
  Metascore: string
  Type: string
}

export default function MovieDetailModalV3({
  isOpen,
  onClose,
  movieId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onMovieSelect
}: MovieDetailModalV3Props) {
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [trailer, setTrailer] = useState<{ url: string; provider: string } | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [showFullPlot, setShowFullPlot] = useState(false)
  const [directorMovies, setDirectorMovies] = useState<any[]>([])
  const [movieReviews, setMovieReviews] = useState<ProcessedReview[]>([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [userPublicReviews, setUserPublicReviews] = useState<any[]>([])
  const [currentUserReview, setCurrentUserReview] = useState<any>(null)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<any[]>([])
  const [friendsSearch, setFriendsSearch] = useState('')
  const [showFriendsWhoWatched, setShowFriendsWhoWatched] = useState(false)
  const [showFriendProfile, setShowFriendProfile] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<any>(null)
  const [showRecommendModal, setShowRecommendModal] = useState(false)
  const [recommendMessage, setRecommendMessage] = useState('')
  const [selectedRecommendFriends, setSelectedRecommendFriends] = useState<any[]>([])
  const [recommendSearch, setRecommendSearch] = useState('')
  const [showMovieNightModal, setShowMovieNightModal] = useState(false)
  const [movieNightName, setMovieNightName] = useState('')
  const [movieNightDate, setMovieNightDate] = useState('')
  const [movieNightTime, setMovieNightTime] = useState('')
  const [selectedMovieNightFriends, setSelectedMovieNightFriends] = useState<any[]>([])
  const [movieNightSearch, setMovieNightSearch] = useState('')
  const [movieNightMovies, setMovieNightMovies] = useState<any[]>([])
  const [showAddMovieSearch, setShowAddMovieSearch] = useState(false)
  const [addMovieSearchQuery, setAddMovieSearchQuery] = useState('')
  const [addMovieSearchResults, setAddMovieSearchResults] = useState<any[]>([])
  const [isSearchingMovies, setIsSearchingMovies] = useState(false)
  
  const scrollableRef = useRef<HTMLDivElement>(null)

  // Mock friends data
  const mockFriends = [
    { id: 1, name: 'Axel', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Maite', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Darren', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Joshua', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'Jeremy', avatar: '/api/placeholder/32/32' },
    { id: 6, name: 'Ana', avatar: '/api/placeholder/32/32' },
    { id: 7, name: 'Susete', avatar: '/api/placeholder/32/32' }
  ]

  // Mock friends who watched this movie
  const friendsWhoWatched = [
    { id: 2, name: 'Maite', rating: 4, hasReview: true, reviewText: 'Amazing cinematography and storyline! Loved every minute of it.' },
    { id: 4, name: 'Joshua', rating: 5, hasReview: true, reviewText: 'One of the best films I\'ve seen this year. Absolutely brilliant.' },
    { id: 6, name: 'Ana', rating: 3, hasReview: false, reviewText: null },
    { id: 1, name: 'Axel', rating: 4, hasReview: true, reviewText: 'Great movie with excellent performances. Highly recommend!' }
  ]

  useEffect(() => {
    if (isOpen && movieId) {
      fetchMovieDetail()
    }
  }, [isOpen, movieId])

  useEffect(() => {
    const libraryItem = library.find(item => item.id === movieId)
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
    } else {
      setSelectedStatus(null)
    }
  }, [movieId, library])

  const fetchMovieDetail = async () => {
    if (!movieId) return
    
    setLoading(true)
    setImages([])
    setTrailer(null)
    
    try {
      let imdbId = movieId
      if (movieId.startsWith('movie-')) {
        imdbId = movieId.replace('movie-', '')
      }
      
      const data = await omdbService.getMovieDetails(imdbId)
      setMovieDetail(data as MovieDetail)
      
      // Load images and trailer
      if (data) {
        await loadMedia(imdbId, data.Title)
        await loadDirectorMovies(data.Director)
        await loadMovieReviews(data.Title, data.Year)
        await loadUserReviews(imdbId)
      }
    } catch (error) {
      console.error('Error loading movie:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMedia = async (movieId: string, movieTitle: string) => {
    try {
      // Get trailer
      const trailerData = await trailerService.getMovieTrailer(movieId, movieTitle)
      if (trailerData) {
        setTrailer(trailerData)
      }
      
      // Get images from TMDB
      const gallery = await imageService.getMovieGallery(movieId, movieTitle, trailerData)
      
      // Extract valid image URLs
      const validImages = gallery.images
        .filter(img => img.url && img.url.startsWith('http'))
        .map(img => img.url)
      
      setImages(validImages)
    } catch (error) {
      console.error('Error loading media:', error)
    }
  }

  const loadDirectorMovies = async (director: string) => {
    if (!director || director === 'N/A') return
    
    try {
      console.log('🎬 Loading movies for director:', director)
      const searchResults = await omdbService.searchMoviesByDirector(director, movieId)
      const directorFilms = searchResults.map(movie => omdbService.convertToAppFormat(movie))
      
      console.log('🎬 Found director films:', directorFilms.length)
      setDirectorMovies(directorFilms)
    } catch (error) {
      console.error('Error loading director movies:', error)
    }
  }

  const loadMovieReviews = async (movieTitle: string, year?: string) => {
    try {
      console.log('📝 Loading TMDB reviews for:', movieTitle)
      const tmdbReviews = await tmdbReviewsService.getMovieReviews(movieTitle, year)
      setMovieReviews(tmdbReviews)
      console.log('📝 Loaded', tmdbReviews.length, 'TMDB reviews')
    } catch (error) {
      console.error('Error loading reviews:', error)
      setMovieReviews([])
    }
  }

  const loadUserReviews = async (movieId: string) => {
    try {
      // Charger les reviews publiques de tous les utilisateurs
      const publicReviews = await userReviewsService.getPublicReviewsForMedia(movieId)
      setUserPublicReviews(publicReviews)
      console.log('📝 Loaded', publicReviews.length, 'user public reviews')
      
      // Charger la review de l'utilisateur actuel (si elle existe)
      const userReview = await userReviewsService.getUserReviewForMedia(movieId)
      setCurrentUserReview(userReview)
      
      if (userReview) {
        setUserRating(userReview.rating)
        setUserReview(userReview.review_text || '')
        setReviewPrivacy(userReview.is_public ? 'public' : 'private')
        console.log('📝 Found existing user review')
      } else {
        // Reset si pas de review existante
        setUserRating(0)
        setUserReview('')
        setReviewPrivacy('private')
      }
    } catch (error) {
      console.error('📝 Error loading user reviews:', error)
    }
  }

  const handleRatingClick = async (rating: number) => {
    setUserRating(rating)
    
    // Sauvegarder immédiatement le rating (avec ou sans review text)
    if (movieDetail) {
      try {
        const savedReview = await userReviewsService.submitReview({
          mediaId: movieId,
          mediaTitle: movieDetail.Title,
          mediaCategory: 'movies',
          rating: rating,
          reviewText: userReview.trim() || '',
          isPublic: reviewPrivacy === 'public'
        })
        
        if (savedReview) {
          console.log('✅ Rating saved successfully')
          setCurrentUserReview(savedReview)
          
          // Si c'est publique et qu'il y a du texte, recharger les reviews publiques
          if (reviewPrivacy === 'public' && userReview.trim()) {
            const updatedPublicReviews = await userReviewsService.getPublicReviewsForMedia(movieId)
            setUserPublicReviews(updatedPublicReviews)
          }
        }
      } catch (error) {
        console.error('❌ Error saving rating:', error)
      }
    }
    
    // Montrer la review box seulement pour un nouveau rating (pas pour une modification)
    if (!currentUserReview) {
      setShowReviewBox(true)
    }
  }

  const handleReviewSubmit = async () => {
    if (userRating > 0 && movieDetail) {
      try {
        // Sauvegarder la review dans le système
        const savedReview = await userReviewsService.submitReview({
          mediaId: movieId,
          mediaTitle: movieDetail.Title,
          mediaCategory: 'movies',
          rating: userRating,
          reviewText: userReview.trim(),
          isPublic: reviewPrivacy === 'public'
        })
        
        if (savedReview) {
          console.log('✅ Review saved successfully')
          
          // Mettre à jour l'état local
          setCurrentUserReview(savedReview)
          
          // Si c'est publique, recharger les reviews publiques
          if (reviewPrivacy === 'public') {
            const updatedPublicReviews = await userReviewsService.getPublicReviewsForMedia(movieId)
            setUserPublicReviews(updatedPublicReviews)
          }
          
          setShowReviewBox(false)
        }
      } catch (error) {
        console.error('❌ Error submitting review:', error)
        alert('Error submitting review. Please try again.')
      }
    }
  }

  const truncatePlot = (text: string, sentences: number = 3): string => {
    if (!text) return ''
    const sentenceEnds = text.match(/[.!?]+/g)
    if (!sentenceEnds || sentenceEnds.length <= sentences) return text
    
    let count = 0
    let index = 0
    for (let i = 0; i < text.length; i++) {
      if (['.', '!', '?'].includes(text[i])) {
        count++
        if (count === sentences) {
          index = i + 1
          break
        }
      }
    }
    return text.substring(0, index).trim()
  }

  const generateMockRatings = (imdbRating: string) => {
    const imdb = parseFloat(imdbRating) || 7.5
    
    // Générer des ratings réalistes basés sur IMDB
    const rottenTomatoes = Math.round((imdb - 2.5) * 20 + Math.random() * 10 - 5)
    const letterboxd = (imdb / 2).toFixed(1)
    
    return {
      imdb: imdbRating,
      rottenTomatoes: Math.max(10, Math.min(95, rottenTomatoes)),
      letterboxd: Math.max(1.0, Math.min(5.0, parseFloat(letterboxd)))
    }
  }

  const handleStatusSelect = (status: MediaStatus | 'remove') => {
    if (!movieDetail) return
    
    if (status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(movieId)
      }
      setSelectedStatus(null)
      setSelectedFriends([])
    } else {
      // Si c'est watching ou watched, proposer d'ajouter des amis
      if (status === 'currently-playing' || status === 'completed') {
        setShowFriendsModal(true)
      }
      
      const movieItem = {
        id: movieId,
        title: movieDetail.Title,
        image: movieDetail.Poster !== 'N/A' ? movieDetail.Poster : undefined,
        category: 'movies' as const,
        year: parseInt(movieDetail.Year) || new Date().getFullYear(),
        rating: movieDetail.imdbRating ? Number((parseFloat(movieDetail.imdbRating) / 2).toFixed(1)) : 0,
        director: movieDetail.Director
      }
      
      onAddToLibrary(movieItem, status)
      setSelectedStatus(status)
    }
    setShowStatusDropdown(false)
  }

  const getStatusLabel = (status: MediaStatus | null) => {
    if (!status) return 'Add to Library'
    switch (status) {
      case 'want-to-play': return 'Want to Watch'
      case 'currently-playing': return 'Watching'
      case 'completed': return 'Watched'
      default: return status
    }
  }

  const toggleFriend = (friend: any) => {
    setSelectedFriends(prev => {
      const isSelected = prev.find(f => f.id === friend.id)
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id)
      } else {
        return [...prev, friend]
      }
    })
  }

  const filteredFriends = mockFriends.filter(friend => 
    friend.name.toLowerCase().includes(friendsSearch.toLowerCase())
  )

  const handleFriendsConfirm = () => {
    setShowFriendsModal(false)
    setFriendsSearch('')
  }

  const handleFriendClick = (friend: any) => {
    setSelectedFriend(friend)
    setShowFriendProfile(true)
  }

  // Recommendation functions
  const toggleRecommendFriend = (friend: any) => {
    setSelectedRecommendFriends(prev => {
      const isSelected = prev.find(f => f.id === friend.id)
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id)
      } else {
        return [...prev, friend]
      }
    })
  }

  const filteredRecommendFriends = mockFriends.filter(friend => 
    friend.name.toLowerCase().includes(recommendSearch.toLowerCase())
  )

  const handleSendToFriends = () => {
    if (selectedRecommendFriends.length === 0) {
      alert('Please select at least one friend')
      return
    }
    
    // Simulate sending recommendation
    const friendNames = selectedRecommendFriends.map(f => f.name).join(', ')
    alert(`Recommendation sent to: ${friendNames}${recommendMessage ? `\nMessage: "${recommendMessage}"` : ''}`)
    
    // Reset state
    setSelectedRecommendFriends([])
    setRecommendMessage('')
    setShowRecommendModal(false)
  }

  const handleExternalShare = (platform: string) => {
    if (!movieDetail) return
    
    const movieUrl = `${window.location.origin}/movie/${movieDetail.imdbID}`
    const text = `Check out "${movieDetail.Title}" (${movieDetail.Year})${recommendMessage ? ` - ${recommendMessage}` : ''}`
    
    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(movieUrl).then(() => {
          alert('Link copied to clipboard!')
        })
        break
      
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${movieUrl}`)}`, '_blank')
        break
      
      case 'imessage':
        window.open(`sms:&body=${encodeURIComponent(`${text} ${movieUrl}`)}`, '_blank')
        break
      
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(`Movie Recommendation: ${movieDetail.Title}`)}&body=${encodeURIComponent(`${text}\n\n${movieUrl}`)}`, '_blank')
        break
      
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${movieUrl}`)}`, '_blank')
        break
      
      case 'native':
        if (navigator.share) {
          navigator.share({
            title: `Movie Recommendation: ${movieDetail.Title}`,
            text: text,
            url: movieUrl
          }).catch(console.error)
        } else {
          alert('Native sharing not supported on this device')
        }
        break
    }
  }

  // Movie Night functions
  const toggleMovieNightFriend = (friend: any) => {
    setSelectedMovieNightFriends(prev => {
      const isSelected = prev.find(f => f.id === friend.id)
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id)
      } else {
        return [...prev, friend]
      }
    })
  }

  const filteredMovieNightFriends = mockFriends.filter(friend => 
    friend.name.toLowerCase().includes(movieNightSearch.toLowerCase())
  )

  const handlePlanMovieNight = () => {
    setShowRecommendModal(false)
    setShowMovieNightModal(true)
    
    // Add current movie to the list
    if (movieDetail) {
      setMovieNightMovies([{
        id: movieDetail.imdbID,
        title: movieDetail.Title,
        poster: movieDetail.Poster !== 'N/A' ? movieDetail.Poster : null,
        year: movieDetail.Year
      }])
    }
    
    // Set default name
    if (movieDetail) {
      setMovieNightName(`${movieDetail.Title} Movie Night`)
    }
  }

  const searchMoviesForNight = async (query: string) => {
    if (!query.trim()) {
      setAddMovieSearchResults([])
      return
    }

    setIsSearchingMovies(true)
    try {
      const results = await omdbService.searchMovies(query)
      const formattedResults = results.map(movie => ({
        id: movie.imdbID,
        title: movie.Title,
        poster: movie.Poster !== 'N/A' ? movie.Poster : null,
        year: movie.Year
      }))
      setAddMovieSearchResults(formattedResults.slice(0, 5))
    } catch (error) {
      console.error('Error searching movies:', error)
      setAddMovieSearchResults([])
    }
    setIsSearchingMovies(false)
  }

  const addMovieToNight = (movie: any) => {
    const isAlreadyAdded = movieNightMovies.find(m => m.id === movie.id)
    if (!isAlreadyAdded) {
      setMovieNightMovies(prev => [...prev, movie])
    }
    setShowAddMovieSearch(false)
    setAddMovieSearchQuery('')
    setAddMovieSearchResults([])
  }

  const removeMovieFromNight = (movieId: string) => {
    setMovieNightMovies(prev => prev.filter(m => m.id !== movieId))
  }

  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  const handleCreateMovieNight = () => {
    if (!movieNightName.trim() || !movieNightDate || selectedMovieNightFriends.length === 0) {
      alert('Please fill in all required fields: name, date, and select at least one friend')
      return
    }

    // Simulate creating movie night
    const friendNames = selectedMovieNightFriends.map(f => f.name).join(', ')
    const movieTitles = movieNightMovies.map(m => m.title).join(', ')
    
    alert(`🎬 Movie Night Created!\n\nEvent: ${movieNightName}\nDate: ${movieNightDate}${movieNightTime ? ` at ${movieNightTime}` : ''}\nMovies: ${movieTitles}\nInvited: ${friendNames}\n\nNotifications sent to friends!`)
    
    // Reset and close
    setMovieNightName('')
    setMovieNightDate('')
    setMovieNightTime('')
    setSelectedMovieNightFriends([])
    setMovieNightSearch('')
    setMovieNightMovies([])
    setShowMovieNightModal(false)
  }

  const getStatusColor = (status: MediaStatus | null) => {
    // Test: Apply gradient to all states including initial "Add to Library"
    return 'bg-gradient-to-r from-[#FF6A00] to-[#FFB347] border-0'
  }

  const nextImage = () => {
    const totalItems = (trailer ? 1 : 0) + images.length
    if (totalItems > 0) {
      setActiveImageIndex((prev) => (prev + 1) % totalItems)
    }
  }

  const prevImage = () => {
    const totalItems = (trailer ? 1 : 0) + images.length
    if (totalItems > 0) {
      setActiveImageIndex((prev) => (prev - 1 + totalItems) % totalItems)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="bg-[#0B0B0B] w-full h-full md:max-w-4xl md:h-[95vh] md:rounded-2xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : movieDetail ? (
          <>
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h1 className="text-3xl font-bold text-white pr-12">{movieDetail.Title}</h1>
              <div className="flex items-center space-x-3 mt-2 text-gray-400">
                <span>{movieDetail.Year}</span>
                <span>•</span>
                <span>{movieDetail.Runtime}</span>
                <span>•</span>
                <span>{movieDetail.Rated}</span>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto px-6">
              {/* Media Section */}
              <div className="space-y-4 mb-6">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  {trailer && activeImageIndex === 0 ? (
                    <div className="w-full h-full">
                      {trailer.provider === 'youtube' && trailer.url.includes('embed') ? (
                        <iframe
                          src={trailer.url}
                          className="w-full h-full"
                          allowFullScreen
                          title="Movie Trailer"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <a
                            href={trailer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg text-white"
                          >
                            <Play size={20} />
                            Watch Trailer
                          </a>
                        </div>
                      )}
                    </div>
                  ) : images.length > 0 ? (
                    <img
                      src={images[trailer ? activeImageIndex - 1 : activeImageIndex]}
                      alt={`${movieDetail.Title} scene`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : movieDetail.Poster && movieDetail.Poster !== 'N/A' ? (
                    <img
                      src={movieDetail.Poster}
                      alt={movieDetail.Title}
                      className="w-full h-full object-contain bg-gray-900"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-500">
                        <div className="text-5xl mb-2">🎬</div>
                        <p>No media available</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation arrows */}
                  {(images.length > 0 || trailer) && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Navigation */}
                {(trailer || images.length > 0) && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {/* Trailer thumbnail */}
                    {trailer && (
                      <button
                        onClick={() => setActiveImageIndex(0)}
                        className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors relative ${
                          activeImageIndex === 0 ? 'border-white' : 'border-transparent'
                        }`}
                      >
                        {movieDetail.Poster && movieDetail.Poster !== 'N/A' ? (
                          <img
                            src={movieDetail.Poster}
                            alt="Trailer thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700"></div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play size={12} className="text-white" />
                        </div>
                      </button>
                    )}
                    
                    {/* Image thumbnails */}
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(trailer ? index + 1 : index)}
                        className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors ${
                          (trailer ? index + 1 : index) === activeImageIndex ? 'border-white' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-3 mb-6">
                {/* Add to Library Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`py-2 px-4 rounded-lg font-medium text-white ${selectedStatus ? getStatusColor(selectedStatus) : 'bg-gray-800'} hover:opacity-90 transition`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{getStatusLabel(selectedStatus)}</span>
                      {/* Show friends only for watching/watched status */}
                      {selectedFriends.length > 0 && (selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                        <div className="flex -space-x-1">
                          {selectedFriends.slice(0, 2).map((friend, index) => (
                            <div
                              key={friend.id}
                              className="w-5 h-5 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center text-xs font-medium border-2 border-white"
                              style={{ zIndex: selectedFriends.length - index }}
                            >
                              {friend.name.charAt(0)}
                            </div>
                          ))}
                          {selectedFriends.length > 2 && (
                            <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white">
                              +{selectedFriends.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute top-full mt-2 w-48 bg-[#1A1A1A] rounded-lg shadow-xl z-10 py-2">
                      <button
                        onClick={() => handleStatusSelect('want-to-play')}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-800"
                      >
                        Want to Watch
                      </button>
                      <button
                        onClick={() => handleStatusSelect('currently-playing')}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-800"
                      >
                        Watching
                      </button>
                      <button
                        onClick={() => handleStatusSelect('completed')}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-800"
                      >
                        Watched
                      </button>
                      {selectedStatus && (
                        <>
                          <div className="border-t border-gray-700 my-1"></div>
                          <button
                            onClick={() => handleStatusSelect('remove')}
                            className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800"
                          >
                            Remove from Library
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Share Button */}
                <button
                  onClick={() => setShowRecommendModal(true)}
                  className="py-2 px-4 rounded-lg font-medium text-white bg-gray-800 hover:opacity-90 transition flex items-center space-x-2"
                >
                  <Share size={16} />
                  <span>Share</span>
                </button>
              </div>

              {/* Friends who watched this movie */}
              {friendsWhoWatched.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">Friends who watched:</span>
                      <div className="flex -space-x-1">
                        {friendsWhoWatched.slice(0, 4).map((friend) => (
                          <div
                            key={friend.id}
                            className="w-6 h-6 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0B0B0B]"
                            title={`${friend.name} - ${friend.rating}/5 stars`}
                          >
                            {friend.name.charAt(0)}
                          </div>
                        ))}
                        {friendsWhoWatched.length > 4 && (
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0B0B0B]">
                            +{friendsWhoWatched.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowFriendsWhoWatched(true)}
                      className="text-transparent bg-gradient-to-r from-[#FF6A00] to-[#FFB347] bg-clip-text text-sm hover:underline"
                    >
                      View all
                    </button>
                  </div>
                </div>
              )}

              {/* Rate this movie - Only show if Watching or Watched */}
              {(selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                <div className="mb-6">
                  {/* Afficher la review existante de l'utilisateur */}
                  {currentUserReview ? (
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">Your Review</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">
                            {currentUserReview.is_public ? <span className="text-transparent bg-gradient-to-r from-[#FF6A00] to-[#FFB347] bg-clip-text">Public</span> : <span className="text-white">Private</span>}
                          </span>
                          <button
                            onClick={() => setShowReviewBox(true)}
                            className="text-white text-xs hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRatingClick(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1"
                            >
                              <Star
                                size={16}
                                className={`transition-colors cursor-pointer ${
                                  star <= (hoverRating || userRating || currentUserReview.rating)
                                    ? 'text-[#FF6A00] fill-[#FF6A00]'
                                    : 'text-gray-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-white text-sm">{userRating || currentUserReview.rating}/5</span>
                      </div>
                      {currentUserReview.review_text && (
                        <p className="text-[#B0B0B0] text-sm">{currentUserReview.review_text}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <h3 className="text-white font-medium mb-3">Rate this movie</h3>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => {
                              handleRatingClick(rating)
                            }}
                            onMouseEnter={() => setHoverRating(rating)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1"
                          >
                            <Star
                              size={24}
                              className={`transition-colors ${
                                (hoverRating || userRating) >= rating
                                  ? 'text-[#FF6A00] fill-[#FF6A00]'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                        {userRating > 0 && (
                          <span className="text-white ml-2 font-medium">{userRating}/5</span>
                        )}
                      </div>
                    </>
                  )}
                
                  {showReviewBox && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                      <h4 className="text-white font-medium mb-3">Share your thoughts about this movie</h4>
                      <div className="flex space-x-2 mb-3">
                        <button
                          onClick={() => setReviewPrivacy('private')}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            reviewPrivacy === 'private'
                              ? 'bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white border-0'
                              : 'bg-transparent text-gray-400 border border-gray-700'
                          }`}
                        >
                          Private Note
                        </button>
                        <button
                          onClick={() => setReviewPrivacy('public')}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            reviewPrivacy === 'public'
                              ? 'bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white border-0'
                              : 'bg-transparent text-gray-400 border border-gray-700'
                          }`}
                        >
                          Share publicly
                        </button>
                      </div>
                      <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="Optional: Add your thoughts..."
                        className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-gray-600"
                      />
                      <div className="flex justify-between items-center mt-3">
                        <button 
                          onClick={() => {
                            setShowReviewBox(false)
                            setUserReview('')
                          }}
                          className="px-4 py-2 text-gray-400 text-sm font-medium hover:text-white transition-colors"
                        >
                          Skip review
                        </button>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setShowReviewBox(false)
                              setUserReview('')
                            }}
                            className="px-4 py-2 text-gray-400 text-sm font-medium hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleReviewSubmit}
                            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Your Friends' Reviews - Placeholder for future social feature */}
              {(selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-3">Your Friends' Reviews</h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="text-gray-400 mb-2">👥</div>
                        <p className="text-gray-400 text-sm mb-1">Connect with friends to see their reviews</p>
                        <p className="text-gray-500 text-xs">Coming soon in social features</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ratings */}
              {movieDetail.imdbRating && movieDetail.imdbRating !== 'N/A' && (
                <div className="mb-6">
                  <div className="flex space-x-8">
                    {(() => {
                      const ratings = generateMockRatings(movieDetail.imdbRating)
                      return (
                        <>
                          <div>
                            <h3 className="text-white font-semibold mb-1">IMDb</h3>
                            <p className="text-gray-300">{ratings.imdb}/10</p>
                          </div>
                          <div>
                            <h3 className="text-white font-semibold mb-1">Rotten Tomatoes</h3>
                            <p className="text-gray-300">{ratings.rottenTomatoes}%</p>
                          </div>
                          <div>
                            <h3 className="text-white font-semibold mb-1">Letterboxd</h3>
                            <p className="text-gray-300">{ratings.letterboxd}/5</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Plot */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-2">Plot</h3>
                <div className="text-gray-300 leading-relaxed">
                  <p>
                    {showFullPlot ? movieDetail.Plot : truncatePlot(movieDetail.Plot)}
                  </p>
                  {movieDetail.Plot && movieDetail.Plot.length > 200 && (
                    <button
                      onClick={() => setShowFullPlot(!showFullPlot)}
                      className="text-white text-sm mt-2 hover:underline"
                    >
                      {showFullPlot ? 'Less' : 'More'}
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6">
                <div className="flex">
                  <span className="text-gray-400 w-24">Director:</span>
                  <span className="text-white">{movieDetail.Director}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-24">Cast:</span>
                  <span className="text-white">{movieDetail.Actors}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-24">Genre:</span>
                  <span className="text-white">{movieDetail.Genre}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-24">Released:</span>
                  <span className="text-white">{movieDetail.Released}</span>
                </div>
              </div>

              {/* More from this director */}
              {movieDetail.Director && movieDetail.Director !== 'N/A' && directorMovies.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4">More from {movieDetail.Director}</h3>
                  <div className="flex space-x-3 overflow-x-auto pb-2">
                    {directorMovies.map((movie) => (
                      <div 
                        key={movie.id} 
                        className="flex-shrink-0 w-28 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          if (onMovieSelect) {
                            onMovieSelect(movie.id.replace('movie-', ''))
                          }
                        }}
                      >
                        {movie.image ? (
                          <img
                            src={movie.image}
                            alt={movie.title}
                            className="w-full h-40 object-cover rounded-lg mb-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-40 bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                        <p className="text-white text-sm truncate" title={movie.title}>{movie.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {(movieReviews.length > 0 || userPublicReviews.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4">
                    Reviews ({movieReviews.length + userPublicReviews.length})
                  </h3>
                  <div className="space-y-4">
                    {/* Reviews publiques des utilisateurs d'abord */}
                    {userPublicReviews.map((review) => (
                      <div key={`user-${review.id}`} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {(review.username || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-white font-medium">{review.username || 'Anonymous User'}</span>
                            <span className="text-transparent bg-gradient-to-r from-[#FF6A00] to-[#FFB347] bg-clip-text text-xs">✓ Stackr User</span>
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                className={`${
                                  star <= review.rating
                                    ? 'text-[#FF6A00] fill-[#FF6A00]'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.review_text && (
                          <p className="text-white text-sm mb-2">{review.review_text}</p>
                        )}
                        <span className="text-white text-xs">{review.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]}</span>
                      </div>
                    ))}

                    {/* Real Reviews */}
                    {(showAllReviews ? movieReviews : movieReviews.slice(0, 3)).map((review) => (
                      <div key={`real-${review.id}`} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {review.author.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-white font-medium">{review.author}</span>
                            {review.verified && (
                              <span className="text-green-400 text-xs">✓ Verified</span>
                            )}
                            <span className="text-gray-400 text-sm">• {review.platform}</span>
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                className={`${
                                  star <= review.rating
                                    ? 'text-[#FF6A00] fill-[#FF6A00]'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="mb-2">
                          <p className="text-white text-sm leading-relaxed">
                            {expandedReviews.has(review.id) ? review.fullText : review.text}
                          </p>
                          {review.text !== review.fullText && (
                            <button
                              onClick={() => toggleReviewExpansion(review.id)}
                              className="text-[#FF6A00] text-xs hover:underline mt-1"
                            >
                              {expandedReviews.has(review.id) ? 'See less' : 'See more'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">{review.date}</span>
                          {review.helpful && (
                            <span className="text-gray-400 text-xs">👍 {review.helpful} helpful</span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {movieReviews.length > 3 && (
                      <button 
                        onClick={() => setShowAllReviews(!showAllReviews)}
                        className="text-white text-sm hover:underline"
                      >
                        {showAllReviews ? 'Show less' : `Show all ${movieReviews.length + userPublicReviews.length} reviews`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-white">Movie not found</p>
            </div>
          </div>
        )}
      </div>

      {/* Friends Selection Modal */}
      {showFriendsModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-80 max-h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Watched with friends?</h3>
              <button
                onClick={() => setShowFriendsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search friends..."
                value={friendsSearch}
                onChange={(e) => setFriendsSearch(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF6A00]"
              />
            </div>

            {/* Friends List */}
            <div className="max-h-48 overflow-y-auto mb-4">
              <div className="space-y-2">
                {filteredFriends.map((friend) => {
                  const isSelected = selectedFriends.find(f => f.id === friend.id)
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend)}
                      className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                        isSelected ? 'bg-gradient-to-r from-[#FF6A00]/20 to-[#FFB347]/20 border border-[#FF6A00]/30' : 'hover:bg-gray-700'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {friend.name.charAt(0)}
                      </div>
                      <span className="text-white text-sm">{friend.name}</span>
                      {isSelected && (
                        <div className="ml-auto">
                          <div className="w-4 h-4 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Count */}
            {selectedFriends.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm">
                  {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFriendsModal(false)}
                className="flex-1 py-2 px-4 text-gray-400 text-sm font-medium hover:text-white transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleFriendsConfirm}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Who Watched Modal */}
      {showFriendsWhoWatched && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-96 max-h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Friends who watched {movieDetail?.Title}</h3>
              <button
                onClick={() => setShowFriendsWhoWatched(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Friends List */}
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-3">
                {friendsWhoWatched.map((friend) => (
                  <div key={friend.id} className="bg-[#0B0B0B] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <button
                          onClick={() => handleFriendClick(friend)}
                          className="text-white font-medium hover:text-transparent hover:bg-gradient-to-r hover:from-[#FF6A00] hover:to-[#FFB347] hover:bg-clip-text transition-colors"
                        >
                          {friend.name}
                        </button>
                      </div>
                      
                      {/* Rating */}
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= friend.rating
                                ? 'text-[#FF6A00] fill-[#FF6A00]'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="text-gray-400 text-sm ml-1">{friend.rating}/5</span>
                      </div>
                    </div>
                    
                    {/* Review */}
                    {friend.hasReview && friend.reviewText ? (
                      <div className="mt-2">
                        <p className="text-gray-300 text-sm mb-2">{friend.reviewText}</p>
                        <button className="text-transparent bg-gradient-to-r from-[#FF6A00] to-[#FFB347] bg-clip-text text-xs hover:underline">
                          View full review
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mt-2">No review written</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowFriendsWhoWatched(false)}
                className="py-2 px-4 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friend Profile Modal */}
      {showFriendProfile && selectedFriend && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-80 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">{selectedFriend.name}'s Profile</h3>
              <button
                onClick={() => setShowFriendProfile(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                {selectedFriend.name.charAt(0)}
              </div>
              <h2 className="text-white font-semibold text-lg">{selectedFriend.name}</h2>
              <p className="text-gray-400 text-sm">@{selectedFriend.name.toLowerCase()}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-white font-bold text-lg">127</div>
                <div className="text-gray-400 text-xs">Movies</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-lg">43</div>
                <div className="text-gray-400 text-xs">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-lg">4.2</div>
                <div className="text-gray-400 text-xs">Avg Rating</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-3">Recent Activity</h4>
              <div className="space-y-2">
                <div className="bg-[#0B0B0B] rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={10}
                          className={`${
                            star <= 4 ? 'text-[#FF6A00] fill-[#FF6A00]' : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400 text-xs">2 days ago</span>
                  </div>
                  <p className="text-white text-sm">Watched "Dune: Part Two"</p>
                </div>
                <div className="bg-[#0B0B0B] rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={10}
                          className={`${
                            star <= 5 ? 'text-[#FF6A00] fill-[#FF6A00]' : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400 text-xs">1 week ago</span>
                  </div>
                  <p className="text-white text-sm">Watched "Oppenheimer"</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button className="flex-1 py-2 px-4 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                View Full Profile
              </button>
              <button className="flex-1 py-2 px-4 border border-[#FF6A00] text-transparent bg-gradient-to-r from-[#FF6A00] to-[#FFB347] bg-clip-text text-sm font-medium rounded-lg hover:bg-gradient-to-r hover:from-[#FF6A00]/10 hover:to-[#FFB347]/10 transition-colors">
                Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation Modal */}
      {showRecommendModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Share "{movieDetail?.Title}"</h3>
              <button
                onClick={() => setShowRecommendModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Plan Movie Night Button */}
            <div className="mb-6">
              <button
                onClick={handlePlanMovieNight}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
              >
                <span>🎬</span>
                <span>Plan a Movie Night</span>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1A1A1A] text-gray-400">or</span>
              </div>
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-2 block">
                Add a message (optional)
              </label>
              <textarea
                value={recommendMessage}
                onChange={(e) => setRecommendMessage(e.target.value)}
                placeholder="Why do you recommend this movie?"
                className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-[#FF6A00]"
                maxLength={200}
              />
              <div className="text-right text-gray-500 text-xs mt-1">
                {recommendMessage.length}/200
              </div>
            </div>

            {/* Send to Friends Section */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-3">Send to friends in Stackr</h4>
              
              {/* Friend Search */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={recommendSearch}
                  onChange={(e) => setRecommendSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>

              {/* Friends List */}
              <div className="max-h-32 overflow-y-auto mb-3">
                <div className="space-y-2">
                  {filteredRecommendFriends.map((friend) => {
                    const isSelected = selectedRecommendFriends.find(f => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleRecommendFriend(friend)}
                        className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-gradient-to-r from-[#FF6A00]/20 to-[#FFB347]/20 border border-[#FF6A00]/30' : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                        {isSelected && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selected Count */}
              {selectedRecommendFriends.length > 0 && (
                <div className="mb-3">
                  <p className="text-gray-400 text-sm">
                    {selectedRecommendFriends.length} friend{selectedRecommendFriends.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Send to Friends Button */}
              <button
                onClick={handleSendToFriends}
                disabled={selectedRecommendFriends.length === 0}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-opacity ${
                  selectedRecommendFriends.length > 0 
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white hover:opacity-90' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Send to Friends ({selectedRecommendFriends.length})
              </button>
            </div>

            {/* External Share Section */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-white font-medium mb-3">Share externally</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExternalShare('whatsapp')}
                  className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#25D366]/20 border border-[#25D366]/30 rounded-lg hover:bg-[#25D366]/30 transition-colors"
                >
                  <span>💬</span>
                  <span className="text-white text-sm">WhatsApp</span>
                </button>
                
                <button
                  onClick={() => handleExternalShare('imessage')}
                  className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg hover:bg-[#007AFF]/30 transition-colors"
                >
                  <span>💬</span>
                  <span className="text-white text-sm">iMessage</span>
                </button>
                
                <button
                  onClick={() => handleExternalShare('email')}
                  className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span>📧</span>
                  <span className="text-white text-sm">Email</span>
                </button>
                
                <button
                  onClick={() => handleExternalShare('copy')}
                  className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span>📋</span>
                  <span className="text-white text-sm">Copy Link</span>
                </button>
                
                <button
                  onClick={() => handleExternalShare('twitter')}
                  className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 rounded-lg hover:bg-[#1DA1F2]/30 transition-colors"
                >
                  <span>🐦</span>
                  <span className="text-white text-sm">Twitter</span>
                </button>
                
                {navigator.share && (
                  <button
                    onClick={() => handleExternalShare('native')}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-[#FF6A00]/20 to-[#FFB347]/20 border border-[#FF6A00]/30 rounded-lg hover:bg-gradient-to-r hover:from-[#FF6A00]/30 hover:to-[#FFB347]/30 transition-colors"
                  >
                    <span>📱</span>
                    <span className="text-white text-sm">Share</span>
                  </button>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowRecommendModal(false)}
                className="py-2 px-4 text-gray-400 text-sm font-medium hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movie Night Planning Modal */}
      {showMovieNightModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Plan a Movie Night</h3>
              <button
                onClick={() => setShowMovieNightModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Event Name */}
            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-2 block">
                Event Name *
              </label>
              <input
                type="text"
                value={movieNightName}
                onChange={(e) => setMovieNightName(e.target.value)}
                placeholder="e.g. Friday Night Movies"
                className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF6A00]"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Date *
                </label>
                <input
                  type="date"
                  value={movieNightDate}
                  onChange={(e) => setMovieNightDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Time (optional)
                </label>
                <input
                  type="time"
                  value={movieNightTime}
                  onChange={(e) => setMovieNightTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
            </div>

            {/* Movies Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-white text-sm font-medium">
                  Movies ({movieNightMovies.length})
                </label>
                <button
                  onClick={() => setShowAddMovieSearch(true)}
                  className="text-[#FF6A00] text-sm hover:underline"
                >
                  + Add Movie
                </button>
              </div>
              
              <div className="space-y-2">
                {movieNightMovies.map((movie) => (
                  <div key={movie.id} className="flex items-center space-x-3 p-2 bg-[#0B0B0B] rounded-lg">
                    {movie.poster ? (
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-10 h-15 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-15 bg-gray-700 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">🎬</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{movie.title}</p>
                      <p className="text-gray-400 text-xs">{movie.year}</p>
                    </div>
                    <button
                      onClick={() => removeMovieFromNight(movie.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Movie Search */}
              {showAddMovieSearch && (
                <div className="mt-4 p-4 bg-[#0B0B0B] rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white text-sm font-medium">Search Movies</h4>
                    <button
                      onClick={() => {
                        setShowAddMovieSearch(false)
                        setAddMovieSearchQuery('')
                        setAddMovieSearchResults([])
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    value={addMovieSearchQuery}
                    onChange={(e) => {
                      setAddMovieSearchQuery(e.target.value)
                      searchMoviesForNight(e.target.value)
                    }}
                    placeholder="Search for movies..."
                    className="w-full px-3 py-2 bg-[#1A1A1A] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF6A00] mb-3"
                  />
                  
                  {isSearchingMovies && (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FF6A00] mx-auto"></div>
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {addMovieSearchResults.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => addMovieToNight(movie)}
                        className="w-full flex items-center space-x-3 p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
                      >
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-8 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-8 h-12 bg-gray-700 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-xs">🎬</span>
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-white text-sm">{movie.title}</p>
                          <p className="text-gray-400 text-xs">{movie.year}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Friends Section */}
            <div className="mb-6">
              <label className="text-white text-sm font-medium mb-3 block">
                Invite Friends * ({selectedMovieNightFriends.length} selected)
              </label>
              
              {/* Friend Search */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={movieNightSearch}
                  onChange={(e) => setMovieNightSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>

              {/* Friends List */}
              <div className="max-h-32 overflow-y-auto">
                <div className="space-y-2">
                  {filteredMovieNightFriends.map((friend) => {
                    const isSelected = selectedMovieNightFriends.find(f => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleMovieNightFriend(friend)}
                        className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-gradient-to-r from-[#FF6A00]/20 to-[#FFB347]/20 border border-[#FF6A00]/30' : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                        {isSelected && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 bg-gradient-to-r from-[#FF6A00] to-[#FFB347] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMovieNightModal(false)}
                className="flex-1 py-2 px-4 text-gray-400 text-sm font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMovieNight}
                disabled={!movieNightName.trim() || !movieNightDate || selectedMovieNightFriends.length === 0}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-opacity ${
                  movieNightName.trim() && movieNightDate && selectedMovieNightFriends.length > 0
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#FFB347] text-white hover:opacity-90' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Create Movie Night
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
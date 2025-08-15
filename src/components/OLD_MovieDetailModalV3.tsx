'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Play, Share, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { omdbService } from '@/services/omdbService'
import { imageService } from '@/services/imageService'
import { trailerService } from '@/services/trailerService'
import { userReviewsService } from '@/services/userReviewsService'
import { tmdbReviewsService, type ProcessedReview } from '@/services/tmdbReviewsService'
import { optimalMovieAPI } from '@/services/optimalMovieAPI'
import { movieCache } from '@/services/movieCache'
import { tmdbImageService } from '@/services/tmdbImageService'
import { fanartService } from '@/services/fanartService'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'
import ShareWithFriendsModal from './ShareWithFriendsModal'

interface MovieDetailModalV3Props {
  isOpen: boolean
  onClose: () => void
  movieId: string
  mediaType?: 'movie' | 'tv'
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
  Ratings?: Array<{
    Source: string
    Value: string
  }>
}

export default function MovieDetailModalV3({
  isOpen,
  onClose,
  movieId,
  mediaType = 'movie',
  onAddToLibrary,
  onDeleteItem,
  library,
  onMovieSelect
}: MovieDetailModalV3Props) {
  // State declarations
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [headerImage, setHeaderImage] = useState<string | null>(null)
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
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'trailers'>('overview')
  
  // New states for friends and review functionality
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<any[]>([])
  const [showFriendsWhoWatchedModal, setShowFriendsWhoWatchedModal] = useState(false)
  const [showMovieSheet, setShowMovieSheet] = useState(false)
  const [movieSheetData, setMovieSheetData] = useState({
    dateWatched: '',
    place: '',
    accessMethod: '',
    customTags: [] as string[],
    friendsWatched: [] as any[],
    personalRating: 0,
    personalReview: ''
  })

  // Mock friends data
  const mockFriends = [
    { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Sarah', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Mike', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Emma', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'David', avatar: '/api/placeholder/32/32' }
  ]

  // Mock friends who watched this movie
  const friendsWhoWatched = [
    { id: 2, name: 'Sarah', rating: 4, hasReview: true, reviewText: 'Amazing cinematography! The story was incredible.' },
    { id: 4, name: 'Emma', rating: 5, hasReview: true, reviewText: 'Best movie I\'ve seen this year!' },
    { id: 1, name: 'Alex', rating: 4, hasReview: true, reviewText: 'Great directing and acting. Highly recommend!' }
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

  useEffect(() => {
    if (movieId) {
      loadUserRatingAndReview()
      loadMovieSheetData()
    }
  }, [movieId])

  const fetchMovieDetail = async () => {
    if (!movieId) return
    
    console.log('🚀 [MovieDetail] Starting loading for:', movieId)
    setLoading(true)
    
    try {
      // Check cache first
      const cachedData = movieCache.get(movieId)
      if (cachedData?.movieDetail) {
        console.log('⚡ [MovieDetail] Using cached movie data')
        setMovieDetail(cachedData.movieDetail)
        
        if (cachedData.media) {
          setImages(cachedData.media.images || [])
          setTrailer(cachedData.media.trailer || null)
          setHeaderImage(cachedData.media.headerImage || null)
        }
        if (cachedData.directorMovies) setDirectorMovies(cachedData.directorMovies)
        if (cachedData.reviews) setMovieReviews(cachedData.reviews)
        
        setLoading(false)
        return
      }

      // Get IMDB ID
      const imdbId = await resolveImdbId(movieId)
      const movieData = await omdbService.getMovieDetails(imdbId)
      
      if (movieData) {
        setMovieDetail(movieData)
        movieCache.set(movieId, { movieDetail: movieData }, 'MOVIE_DETAIL')
        
        // Load enhanced data
        loadEnhancedData(imdbId, movieData.Title, movieData.Director, movieData.Year)
      }
    } catch (error) {
      console.error('❌ [MovieDetail] Error loading movie:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveImdbId = async (movieId: string): Promise<string> => {
    let imdbId = movieId
    
    if (!movieId.startsWith('tt') && !movieId.startsWith('movie-')) {
      console.log('🔄 Converting TMDB ID to IMDB ID:', movieId)
      
      let convertedId = await optimalMovieAPI.getIMDbId(movieId, mediaType)
      if (!convertedId && mediaType === 'movie') {
        convertedId = await optimalMovieAPI.getIMDbId(movieId, 'tv')
      }
      
      if (convertedId) {
        imdbId = convertedId
        console.log('✅ Converted to IMDB ID:', imdbId)
      } else {
        throw new Error('Could not find IMDB ID for this movie/TV show')
      }
    }
    
    if (movieId.startsWith('movie-')) {
      imdbId = movieId.replace('movie-', '')
    }
    
    return imdbId
  }

  const loadEnhancedData = async (imdbId: string, title: string, director: string, year: string) => {
    console.log('🚀 [MovieDetail] Starting enhanced data loading...')
    
    // Load media data with simplified approach
    loadMediaData(movieId, title, year)
    
    // Load director movies
    if (director && director !== 'N/A') {
      loadDirectorMovies(director, imdbId)
    }
    
    // Load reviews
    loadMovieReviews(title, year)
  }

  const loadMediaData = async (movieId: string, movieTitle: string, movieYear?: string) => {
    try {
      console.log('🎨 [Media] Loading media for:', movieTitle)
      
      // Load all data with Promise.allSettled (no blocking failures)
      const [trailerResult, tmdbResult, fanartResult, galleryResult] = await Promise.allSettled([
        trailerService.getMovieTrailer(movieId, movieTitle, movieYear),
        tmdbImageService.getOptimizedMovieImages(movieId),
        fanartService.getMovieImages(movieId),
        imageService.getMovieGallery(movieTitle, 10)
      ])
      
      // Extract results safely
      const trailerData = trailerResult.status === 'fulfilled' ? trailerResult.value : null
      const tmdbImages = tmdbResult.status === 'fulfilled' ? tmdbResult.value : null
      const fanartImages = fanartResult.status === 'fulfilled' ? fanartResult.value : null
      const gallery = galleryResult.status === 'fulfilled' ? galleryResult.value : []
      
      // SIMPLE CASCADE FOR HEADER IMAGE
      let headerImage = null
      
      // 1. Fanart backgrounds (Ultra HD)
      if (fanartImages?.backgrounds?.[0]) {
        headerImage = fanartImages.backgrounds[0]
        console.log('🎨 Using Fanart background')
      }
      // 2. TMDb backdrops (HD)
      else if (tmdbImages?.headerImage) {
        headerImage = tmdbImages.headerImage
        console.log('🎨 Using TMDb backdrop')
      }
      // 3. OMDB poster (always available)
      else if (movieDetail?.Poster && movieDetail.Poster !== 'N/A') {
        headerImage = movieDetail.Poster
        console.log('🎨 Using OMDB poster')
      }
      // 4. Gallery first image
      else if (Array.isArray(gallery) && gallery.length > 0 && gallery[0]) {
        headerImage = gallery[0]
        console.log('🎨 Using gallery image')
      }
      // 5. GUARANTEED FALLBACK
      else {
        headerImage = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80'
        console.log('🎨 Using guaranteed fallback')
      }
      
      // GALLERY IMAGES - Simple approach
      const galleryImages = []
      
      if (fanartImages?.backgrounds) {
        galleryImages.push(...fanartImages.backgrounds.slice(0, 6))
      }
      if (tmdbImages?.galleryImages) {
        galleryImages.push(...tmdbImages.galleryImages.slice(0, 8))
      }
      if (Array.isArray(gallery)) {
        galleryImages.push(...gallery.filter(img => img && !img.includes('N/A')).slice(0, 5))
      }
      
      // Remove duplicates and limit
      const finalImages = [...new Set(galleryImages)].slice(0, 15)
      
      // TRAILER - Simple validation
      let finalTrailer = trailerData
      if (finalTrailer?.provider === 'none' || finalTrailer?.videoId === 'none') {
        finalTrailer = null
      }
      
      // Update state
      setHeaderImage(headerImage)
      setImages(finalImages)
      setTrailer(finalTrailer)
      
      // Cache the results
      movieCache.set(movieId, { 
        media: { 
          images: finalImages, 
          trailer: finalTrailer, 
          headerImage: headerImage 
        } 
      }, 'MEDIA')
      
      console.log('🎨 [Media] Loaded successfully:', {
        header: !!headerImage,
        trailer: !!finalTrailer,
        images: finalImages.length
      })
      
    } catch (error) {
      console.error('🎨 [Media] Error:', error)
      
      // Emergency fallback
      const emergencyImage = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80'
      setHeaderImage(emergencyImage)
      setImages([emergencyImage])
      setTrailer(null)
    }
  }

  const loadDirectorMovies = async (director: string, currentMovieId: string) => {
    try {
      console.log('🎬 Loading movies by director:', director)
      
      const searchResults = await omdbService.searchMovies(director)
      const relevantResults = searchResults
        .filter(movie => 
          movie.imdbID !== currentMovieId && 
          movie.Director && 
          movie.Director.toLowerCase().includes(director.toLowerCase())
        )
        .slice(0, 6)
      
      const directorMovies = relevantResults.map(movie => omdbService.convertToAppFormat(movie))
      setDirectorMovies(directorMovies)
      movieCache.set(movieId, { directorMovies }, 'DIRECTOR_MOVIES')
      
      console.log(`🎬 Found ${directorMovies.length} movies by ${director}`)
    } catch (error) {
      console.error('Error loading director movies:', error)
      setDirectorMovies([])
    }
  }

  const loadMovieReviews = async (movieTitle: string, year?: string) => {
    try {
      const reviews = await tmdbReviewsService.getMovieReviews(movieTitle, year)
      setMovieReviews(reviews)
      movieCache.set(movieId, { reviews }, 'REVIEWS')
    } catch (error) {
      console.error('Error loading movie reviews:', error)
      setMovieReviews([])
    }
  }

  // Navigation functions for carousel
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

  // Helper functions
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

  const extractRealRatings = (movieData: MovieDetail) => {
    const ratings = {
      imdb: 'N/A',
      rottenTomatoes: 'N/A',
      metacritic: 'N/A',
      letterboxd: 'N/A'
    }

    if (movieData.imdbRating && movieData.imdbRating !== 'N/A') {
      ratings.imdb = `${parseFloat(movieData.imdbRating).toFixed(1)}/10`
    }

    if (movieData.Ratings) {
      movieData.Ratings.forEach(rating => {
        switch (rating.Source) {
          case 'Internet Movie Database':
            ratings.imdb = rating.Value
            break
          case 'Rotten Tomatoes':
            ratings.rottenTomatoes = rating.Value
            break
          case 'Metacritic':
            ratings.metacritic = rating.Value
            break
        }
      })
    }

    if (movieData.imdbRating && movieData.imdbRating !== 'N/A') {
      const imdbNum = parseFloat(movieData.imdbRating)
      ratings.letterboxd = `${(imdbNum / 2).toFixed(1)}/5`
    }

    return ratings
  }

  const loadUserRatingAndReview = async () => {
    try {
      const existingReview = await userReviewsService.getCurrentUserReview('movies', movieId)
      if (existingReview) {
        setUserRating(existingReview.rating)
        setUserReview(existingReview.reviewText)
        setReviewPrivacy(existingReview.isPublic ? 'public' : 'private')
      }
    } catch (error) {
      console.error('Error loading user review:', error)
    }
  }

  const handleReviewSubmit = async () => {
    if (!movieDetail) return

    const reviewData = {
      gameId: movieDetail.imdbID,
      gameName: movieDetail.Title,
      rating: userRating,
      reviewText: userReview,
      isPublic: reviewPrivacy === 'public',
      platform: 'movie'
    }

    try {
      await userReviewsService.submitReview(reviewData)
      setShowReviewBox(false)
      
      if (selectedStatus) {
        const movieData = {
          id: movieDetail.imdbID,
          title: movieDetail.Title,
          category: 'movies' as const,
          image: movieDetail.Poster,
          year: parseInt(movieDetail.Year),
          rating: parseFloat(movieDetail.imdbRating) || 0,
          director: movieDetail.Director,
          genre: movieDetail.Genre
        }
        onAddToLibrary(movieData, selectedStatus)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const loadMovieSheetData = () => {
    try {
      const stored = localStorage.getItem(`movieSheet-${movieId}`)
      if (stored) {
        const data = JSON.parse(stored)
        setMovieSheetData(data)
        
        if (data.personalRating > 0) {
          setUserRating(data.personalRating)
        }
        if (data.personalReview) {
          setUserReview(data.personalReview)
        }
      }
    } catch (error) {
      console.error('Error loading movie sheet data:', error)
    }
  }

  const saveMovieSheetData = () => {
    try {
      localStorage.setItem(`movieSheet-${movieId}`, JSON.stringify(movieSheetData))
      
      if (movieSheetData.personalRating > 0) {
        setUserRating(movieSheetData.personalRating)
      }
      if (movieSheetData.personalReview) {
        setUserReview(movieSheetData.personalReview)
      }
      
      setShowMovieSheet(false)
    } catch (error) {
      console.error('Error saving movie sheet data:', error)
    }
  }

  const handleStatusSelect = async (status: MediaStatus) => {
    if (!movieDetail) return

    if (['watching', 'watched', 'dropped'].includes(status)) {
      setSelectedStatus(status)
      setShowFriendsModal(true)
      
      if (status === 'watched') {
        // Will show review after friends modal
      }
    } else {
      const movieData = {
        id: movieDetail.imdbID,
        title: movieDetail.Title,
        category: 'movies' as const,
        image: movieDetail.Poster,
        year: parseInt(movieDetail.Year),
        rating: parseFloat(movieDetail.imdbRating) || 0,
        director: movieDetail.Director,
        genre: movieDetail.Genre
      }
      
      onAddToLibrary(movieData, status)
      setSelectedStatus(status)
    }
    
    setShowStatusDropdown(false)
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

  if (!isOpen || !movieId) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-[#0f0e17] min-h-screen flex items-center justify-center">
        <StackrLoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="bg-[#0f0e17] min-h-screen pb-20 font-system">
      {movieDetail ? (
        <>
          {/* Header Image */}
          <div className="relative h-[160px] overflow-hidden">
            <img
              src={headerImage || 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80'}
              alt={`${movieDetail.Title} backdrop`}
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80'
              }}
            />
            
            {/* Close Button */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-5" style={{ zIndex: 20 }}>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Movie Info Section */}
          <div className="relative min-h-[240px] overflow-visible">
            <div 
              className="absolute inset-0"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.4), rgba(126, 58, 242, 0.3), rgba(107, 33, 168, 0.2), rgba(15, 14, 23, 0.7))',
                zIndex: 1
              }}
            />
            
            <div className="px-5 py-6 relative z-30">
              {/* Movie Info */}
              <div className="flex gap-4 items-start mb-4">
                <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
                  <img
                    src={movieDetail.Poster && movieDetail.Poster !== 'N/A' ? movieDetail.Poster : 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80'}
                    alt={movieDetail.Title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 pt-1">
                  <h1 className="text-xl font-bold text-white mb-1 leading-tight">{movieDetail.Title}</h1>
                  <p className="text-sm text-gray-400 mb-1">{movieDetail.Director || 'Unknown Director'}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {movieDetail.Year && <span>{movieDetail.Year}</span>}
                    {movieDetail.Genre && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{movieDetail.Genre.split(',')[0].trim()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-3 relative z-50">
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>{selectedStatus ? (() => {
                      switch (selectedStatus) {
                        case 'want-to-watch': return 'Want to Watch'
                        case 'watching': return 'Watching'
                        case 'watched': return 'Watched'
                        case 'dropped': return 'Dropped'
                        default: return 'Add to Library'
                      }
                    })() : 'Add to Library'}</span>
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                      {(['want-to-watch', 'watching', 'watched', 'dropped'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusSelect(status)}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            selectedStatus === status ? 'text-purple-400 bg-purple-600/30' : 'text-gray-300'
                          }`}
                        >
                          {(() => {
                            switch (status) {
                              case 'want-to-watch': return 'Want to Watch'
                              case 'watching': return 'Watching'
                              case 'watched': return 'Watched'
                              case 'dropped': return 'Dropped'
                              default: return status
                            }
                          })()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowShareWithFriendsModal(true)}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
                >
                  <Share size={16} />
                  <span>Share</span>
                </button>
              </div>

              {/* Friends Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Friends who watched:</span>
                    <div className="flex -space-x-1">
                      {friendsWhoWatched.slice(0, 4).map((friend) => (
                        <div
                          key={friend.id}
                          className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                          title={`${friend.name} - ${friend.rating}/5 stars`}
                        >
                          {friend.name.charAt(0)}
                        </div>
                      ))}
                      {friendsWhoWatched.length > 4 && (
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17]">
                          +{friendsWhoWatched.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFriendsWhoWatchedModal(true)}
                    className="text-gray-400 hover:text-purple-400 text-sm cursor-pointer"
                  >
                    View all
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setMovieSheetData(prev => ({
                      ...prev,
                      personalRating: userRating,
                      personalReview: userReview
                    }))
                    setShowMovieSheet(true)
                  }}
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer"
                >
                  <FileText size={14} />
                  <span>Customize movie sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-6 py-4 relative z-1">
            {/* Tab Navigation */}
            <div className="flex space-x-2 mb-6">
              {(['overview', 'trailers'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    activeTab === tab
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tab === 'overview' ? 'Overview' : 'Trailers/Photos'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* User Rating Section */}
                {userRating > 0 && (
                  <div className="mb-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-2">Your Rating</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={star <= userRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                          />
                        ))}
                      </div>
                      <span className="text-purple-400 text-sm">{userRating}/5 stars</span>
                      <button
                        onClick={() => setShowReviewBox(true)}
                        className="text-purple-400 hover:text-purple-300 text-sm underline"
                      >
                        Edit
                      </button>
                    </div>
                    {userReview && (
                      <p className="text-gray-300 text-sm">{userReview}</p>
                    )}
                  </div>
                )}

                {/* Description */}
                {movieDetail.Plot && movieDetail.Plot !== 'N/A' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <div className="text-gray-400 leading-relaxed text-sm">
                      {showFullPlot ? movieDetail.Plot : truncatePlot(movieDetail.Plot, 3)}
                      {movieDetail.Plot.length > 200 && (
                        <button
                          onClick={() => setShowFullPlot(!showFullPlot)}
                          className="text-gray-400 hover:text-gray-300 ml-1 text-sm"
                        >
                          {showFullPlot ? ' ...less' : ' ...more'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Ratings */}
                {movieDetail.imdbRating !== 'N/A' && (
                  <div className="flex space-x-8 mb-6">
                    {(() => {
                      const ratings = extractRealRatings(movieDetail)
                      return (
                        <>
                          {ratings.imdb !== 'N/A' && (
                            <div>
                              <h4 className="text-white font-semibold mb-1">IMDb</h4>
                              <p className="text-gray-300">{ratings.imdb}</p>
                            </div>
                          )}
                          {ratings.rottenTomatoes !== 'N/A' && (
                            <div>
                              <h4 className="text-white font-semibold mb-1">Rotten Tomatoes</h4>
                              <p className="text-gray-300">{ratings.rottenTomatoes}</p>
                            </div>
                          )}
                          {ratings.letterboxd !== 'N/A' && (
                            <div>
                              <h4 className="text-white font-semibold mb-1">Letterboxd</h4>
                              <p className="text-gray-300">{ratings.letterboxd}</p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}

                {/* Movie Details */}
                <div className="space-y-2 text-sm mb-6">
                  {movieDetail.Director && movieDetail.Director !== 'N/A' && (
                    <div className="text-sm flex">
                      <span className="text-gray-400 w-24 flex-shrink-0">Director:</span>
                      <span className="text-white">{movieDetail.Director}</span>
                    </div>
                  )}
                  {movieDetail.Actors && movieDetail.Actors !== 'N/A' && (
                    <div className="text-sm flex">
                      <span className="text-gray-400 w-24 flex-shrink-0">Cast:</span>
                      <span className="text-white">{movieDetail.Actors}</span>
                    </div>
                  )}
                  {movieDetail.Genre && movieDetail.Genre !== 'N/A' && (
                    <div className="text-sm flex">
                      <span className="text-gray-400 w-24 flex-shrink-0">Genre:</span>
                      <span className="text-white">{movieDetail.Genre}</span>
                    </div>
                  )}
                  {movieDetail.Released && movieDetail.Released !== 'N/A' && (
                    <div className="text-sm flex">
                      <span className="text-gray-400 w-24 flex-shrink-0">Release Date:</span>
                      <span className="text-white">{movieDetail.Released}</span>
                    </div>
                  )}
                  {movieDetail.Runtime && movieDetail.Runtime !== 'N/A' && (
                    <div className="text-sm flex">
                      <span className="text-gray-400 w-24 flex-shrink-0">Runtime:</span>
                      <span className="text-white">{movieDetail.Runtime}</span>
                    </div>
                  )}
                </div>

                {/* Reviews Section */}
                {movieReviews.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Reviews</h3>
                    <div className="space-y-4">
                      {(showAllReviews ? movieReviews : movieReviews.slice(0, 3)).map((review) => (
                        <div key={review.id} className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {review.author[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-white font-medium">{review.author}</div>
                                <div className="text-gray-400 text-sm">{review.date}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <p className="text-gray-300 leading-relaxed">
                            {expandedReviews.has(review.id) ? review.fullText : review.text}
                            {review.fullText.length > review.text.length && (
                              <button
                                onClick={() => toggleReviewExpansion(review.id)}
                                className="text-indigo-400 hover:text-indigo-300 ml-2 underline"
                              >
                                {expandedReviews.has(review.id) ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </p>
                        </div>
                      ))}
                      
                      {movieReviews.length > 3 && (
                        <button
                          onClick={() => setShowAllReviews(!showAllReviews)}
                          className="w-full py-3 text-indigo-400 hover:text-indigo-300 border border-indigo-800/50 rounded-xl transition-colors hover:bg-indigo-800/10"
                        >
                          {showAllReviews ? 'Show Less Reviews' : `Show All ${movieReviews.length} Reviews`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Director's Other Movies */}
                {directorMovies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      More by {movieDetail.Director}
                    </h3>
                    <div className="flex gap-4 pb-4 overflow-x-auto">
                      {directorMovies.slice(0, 8).map((movie) => (
                        <div
                          key={movie.id}
                          onClick={() => onMovieSelect?.(movie.id)}
                          className="flex-shrink-0 w-32 bg-gray-800/30 border border-gray-700/30 rounded-xl overflow-hidden hover:border-indigo-600/50 transition-all cursor-pointer group"
                        >
                          <div className="aspect-[2/3] bg-gray-700">
                            <img
                              src={movie.image}
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          </div>
                          <div className="p-2">
                            <h4 className="text-white font-medium text-xs mb-1 line-clamp-2 leading-tight">
                              {movie.title}
                            </h4>
                            <p className="text-gray-400 text-xs">{movie.year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trailers' && (
              <div className="space-y-6">
                {/* Media Carousel */}
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
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="text-white text-center">
            <h2 className="text-xl font-semibold mb-2">Movie not found</h2>
            <p className="text-gray-400">Unable to load movie details</p>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Who did you watch with?</h3>
            <div className="space-y-2 mb-4">
              {mockFriends.slice(0, 5).map(friend => (
                <label key={friend.id} className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={selectedFriends.includes(friend.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFriends([...selectedFriends, friend.id])
                      } else {
                        setSelectedFriends(selectedFriends.filter(id => id !== friend.id))
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-white">{friend.name}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFriendsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowFriendsModal(false)
                  if (selectedStatus === 'watched') {
                    setShowReviewBox(true)
                  }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewBox && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Rate and Review</h3>
            
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Your Rating</p>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      star <= (hoverRating || userRating) ? 'text-yellow-500 fill-current' : 'text-gray-600'
                    }`}
                    onClick={() => setUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Review (optional)</p>
              <textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                placeholder="Share your thoughts about this movie..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
              />
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Privacy</p>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={reviewPrivacy === 'private'}
                    onChange={(e) => setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-purple-600"
                  />
                  <span className="text-white">Private</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={reviewPrivacy === 'public'}
                    onChange={(e) => setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-purple-600"
                  />
                  <span className="text-white">Public</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewBox(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Who Watched Modal */}
      {showFriendsWhoWatchedModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Friends who watched</h3>
            <div className="space-y-4">
              {friendsWhoWatched.map(friend => (
                <div key={friend.id} className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                    {friend.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{friend.name}</p>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < friend.rating ? 'text-yellow-500 fill-current' : 'text-gray-600'}
                        />
                      ))}
                    </div>
                    {friend.hasReview && (
                      <p className="text-gray-400 text-sm mt-1">{friend.reviewText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowFriendsWhoWatchedModal(false)}
              className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Movie Sheet Modal */}
      {showMovieSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Customize Movie Sheet</h3>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Date Watched</label>
              <input
                type="date"
                value={movieSheetData.dateWatched}
                onChange={(e) => setMovieSheetData(prev => ({ ...prev, dateWatched: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Where did you watch it?</label>
              <input
                type="text"
                value={movieSheetData.place}
                onChange={(e) => setMovieSheetData(prev => ({ ...prev, place: e.target.value }))}
                placeholder="e.g., Cinema, Home, Friend's place..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">How did you watch it?</label>
              <select
                value={movieSheetData.accessMethod}
                onChange={(e) => setMovieSheetData(prev => ({ ...prev, accessMethod: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select method...</option>
                <option value="Netflix">Netflix</option>
                <option value="Amazon Prime">Amazon Prime</option>
                <option value="Disney+">Disney+</option>
                <option value="Hulu">Hulu</option>
                <option value="HBO Max">HBO Max</option>
                <option value="Cinema">Cinema</option>
                <option value="DVD/Blu-ray">DVD/Blu-ray</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Who did you watch with?</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {mockFriends.map(friend => (
                  <label key={friend.id} className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={movieSheetData.friendsWatched.includes(friend.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMovieSheetData(prev => ({ 
                            ...prev, 
                            friendsWatched: [...prev.friendsWatched, friend.id] 
                          }))
                        } else {
                          setMovieSheetData(prev => ({ 
                            ...prev, 
                            friendsWatched: prev.friendsWatched.filter(id => id !== friend.id) 
                          }))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-white text-sm">{friend.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Your Rating</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      star <= movieSheetData.personalRating ? 'text-yellow-500 fill-current' : 'text-gray-600'
                    }`}
                    onClick={() => setMovieSheetData(prev => ({ ...prev, personalRating: star }))}
                  />
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-gray-400 text-sm mb-2 block">Your Review</label>
              <textarea
                value={movieSheetData.personalReview}
                onChange={(e) => setMovieSheetData(prev => ({ ...prev, personalReview: e.target.value }))}
                placeholder="What did you think about this movie?"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMovieSheet(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveMovieSheetData}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Save Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share with Friends Modal */}
      {movieDetail && (
        <ShareWithFriendsModal
          isOpen={showShareWithFriendsModal}
          onClose={() => setShowShareWithFriendsModal(false)}
          item={{
            id: movieDetail.imdbID,
            type: 'movies',
            title: movieDetail.Title,
            image: movieDetail.Poster
          }}
        />
      )}
    </div>
  )
}
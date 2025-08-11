'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Play, Share, FileText } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { omdbService } from '@/services/omdbService'
import { imageService } from '@/services/imageService'
import { trailerService } from '@/services/trailerService'
import { userReviewsService } from '@/services/userReviewsService'
import { tmdbReviewsService, type ProcessedReview } from '@/services/tmdbReviewsService'
import { optimalMovieAPI } from '@/services/optimalMovieAPI'
import { movieCache } from '@/services/movieCache'
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
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'trailers'>('overview')

  const scrollableRef = useRef<HTMLDivElement>(null)

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
    
    console.log('🚀 [MovieDetail] Starting optimized loading for:', movieId)
    setLoading(true)
    
    try {
      // Check cache first
      const cachedData = movieCache.get(movieId)
      if (cachedData?.movieDetail) {
        console.log('⚡ [MovieDetail] Using cached movie data')
        setMovieDetail(cachedData.movieDetail)
        
        // Load other data from cache or fetch in background
        if (cachedData.media) {
          setImages(cachedData.media.images)
          setTrailer(cachedData.media.trailer)
        }
        if (cachedData.directorMovies) setDirectorMovies(cachedData.directorMovies)
        if (cachedData.reviews) setMovieReviews(cachedData.reviews)
        if (cachedData.userReviews) setUserPublicReviews(cachedData.userReviews)
        
        setLoading(false)
        return
      }

      // Get IMDB ID
      const imdbId = await resolveImdbId(movieId)
      const movieData = await omdbService.getMovieDetails(imdbId)
      
      if (movieData) {
        setMovieDetail(movieData)
        movieCache.set(movieId, { movieDetail: movieData }, 'MOVIE_DETAIL')
        
        // Load enhanced data in parallel
        loadEnhancedDataParallel(imdbId, movieData.Title, movieData.Director, movieData.Year)
      }
    } catch (error) {
      console.error('❌ [MovieDetail] Error loading movie:', error)
    } finally {
      setLoading(false)
    }
  }

  // Use the same resolveImdbId logic as the working version
  const resolveImdbId = async (movieId: string): Promise<string> => {
    let imdbId = movieId
    
    console.log('🎬 [resolveImdbId] Input movieId:', movieId, 'mediaType:', mediaType)
    
    // Check if it's a TMDB ID (numeric) or IMDB ID (starts with 'tt')
    if (!movieId.startsWith('tt') && !movieId.startsWith('movie-')) {
      console.log('🔄 Converting TMDB ID to IMDB ID:', movieId, 'Type:', mediaType)
      
      let convertedId = await optimalMovieAPI.getIMDbId(movieId, mediaType)
      if (!convertedId && mediaType === 'movie') {
        console.log('🔄 Not a movie, trying TV series...')
        convertedId = await optimalMovieAPI.getIMDbId(movieId, 'tv')
      }
      
      if (convertedId) {
        imdbId = convertedId
        console.log('✅ Converted to IMDB ID:', imdbId)
      } else {
        console.error('❌ Could not convert TMDB ID to IMDB ID')
        throw new Error('Could not find IMDB ID for this movie/TV show')
      }
    }
    
    if (movieId.startsWith('movie-')) {
      imdbId = movieId.replace('movie-', '')
    }
    
    return imdbId
  }

  const loadEnhancedDataParallel = async (imdbId: string, title: string, director: string, year: string) => {
    const startTime = Date.now()
    console.log('🚀 [MovieDetail] Starting parallel enhanced data loading...')
    
    // Check cache for each data type
    const cachedData = movieCache.get(movieId)
    const promises = []
    
    // Media (images + trailer)
    if (!cachedData?.media) {
      promises.push(
        loadMediaOptimized(movieId, title).then(media => {
          return { type: 'media', data: media }
        })
      )
    }
    
    // Director movies
    if (!cachedData?.directorMovies && director && director !== 'N/A') {
      promises.push(
        loadDirectorMoviesOptimized(director, imdbId).then(movies => {
          return { type: 'directorMovies', data: movies }
        })
      )
    }
    
    // TMDB Reviews
    if (!cachedData?.reviews) {
      promises.push(
        loadMovieReviewsOptimized(title, year).then(reviews => {
          return { type: 'reviews', data: reviews }
        })
      )
    }
    
    // User Reviews
    if (!cachedData?.userReviews) {
      promises.push(
        loadUserReviewsOptimized(imdbId).then(userReviews => {
          return { type: 'userReviews', data: userReviews }
        })
      )
    }
    
    if (promises.length === 0) {
      console.log('📦 All enhanced data found in cache')
      return
    }
    
    try {
      const results = await Promise.allSettled(promises)
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { type, data } = result.value
          
          switch (type) {
            case 'media':
              setImages(data.images)
              setTrailer(data.trailer)
              movieCache.set(movieId, { media: data }, 'MEDIA')
              break
            case 'directorMovies':
              setDirectorMovies(data)
              movieCache.set(movieId, { directorMovies: data }, 'DIRECTOR_MOVIES')
              break
            case 'reviews':
              setMovieReviews(data)
              movieCache.set(movieId, { reviews: data }, 'REVIEWS')
              break
            case 'userReviews':
              setUserPublicReviews(data)
              movieCache.set(movieId, { userReviews: data }, 'USER_REVIEWS')
              break
          }
        } else {
          console.error('🎬 Enhanced data loading failed:', result.reason)
        }
      })
      
      const loadTime = Date.now() - startTime
      console.log(`⚡ [MovieDetail] Enhanced data loaded in ${loadTime}ms`)
      
    } catch (error) {
      console.error('🎬 Error in parallel enhanced data loading:', error)
    }
  }

  const loadMediaOptimized = async (movieId: string, movieTitle: string) => {
    try {
      const [trailerData, gallery] = await Promise.all([
        trailerService.getMovieTrailer(movieId, movieTitle),
        imageService.getMovieGallery(movieTitle, 10)
      ])
      
      const validImages = Array.isArray(gallery) ? gallery.filter(img => img && !img.includes('N/A')) : []
      return { images: validImages, trailer: trailerData }
    } catch (error) {
      console.error('Error loading media:', error)
      return { images: [], trailer: null }
    }
  }

  const loadDirectorMoviesOptimized = async (director: string, currentMovieId: string) => {
    if (!director || director === 'N/A') return []
    
    try {
      // Rechercher par nom du réalisateur
      const searchResults = await omdbService.searchMovies(director)
      // Filtrer les résultats pour éviter le film actuel
      const filteredResults = searchResults.filter(movie => movie.imdbID !== currentMovieId)
      return filteredResults.slice(0, 6).map(movie => omdbService.convertToAppFormat(movie))
    } catch (error) {
      console.error('Error loading director movies:', error)
      return []
    }
  }

  const loadMovieReviewsOptimized = async (movieTitle: string, year?: string) => {
    try {
      return await tmdbReviewsService.getMovieReviews(movieTitle, year)
    } catch (error) {
      console.error('Error loading movie reviews:', error)
      return []
    }
  }

  const loadUserReviewsOptimized = async (movieId: string) => {
    try {
      const publicReviews = await userReviewsService.getPublicReviews('movies', movieId)
      return publicReviews || []
    } catch (error) {
      console.error('Error loading user reviews:', error)
      return []
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

  const generateMockRatings = (imdbRating: string) => {
    const imdb = parseFloat(imdbRating) || 7.5
    const rottenTomatoes = Math.round((imdb - 2.5) * 20 + Math.random() * 10 - 5)
    const letterboxd = (imdb / 2).toFixed(1)
    
    return {
      imdb: imdb.toFixed(1),
      rottenTomatoes: Math.max(0, Math.min(100, rottenTomatoes)),
      letterboxd
    }
  }

  const handleStatusSelect = async (status: MediaStatus) => {
    if (!movieDetail) return
    
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
    setShowStatusDropdown(false)
  }

  const getStatusColor = (status: MediaStatus | null) => {
    return 'bg-gradient-to-r from-indigo-600 to-purple-700'
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

  console.log('🎬 [MovieDetailModalV3] Render check - isOpen:', isOpen, 'movieId:', movieId)
  
  if (!isOpen || !movieId) {
    console.log('🎬 [MovieDetailModalV3] NOT RENDERING - isOpen:', isOpen, 'movieId:', movieId)
    return null
  }
  
  console.log('🎬 [MovieDetailModalV3] RENDERING movie detail for:', movieId)

  return (
    <div className="bg-[#0f0e17] min-h-screen pb-20 font-system">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <StackrLoadingSkeleton 
              message="Loading your movie..."
              theme="orange"
              size="medium"
              speed="normal"
            />
          </div>
        ) : movieDetail ? (
          <>
            {/* Large header image - 160px height */}
            <div className="relative h-[160px] overflow-hidden">
              <img
                src={movieDetail.Poster && movieDetail.Poster !== 'N/A' ? movieDetail.Poster : (images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80')}
                alt={`${movieDetail.Title} poster`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80'
                }}
              />
              
              {/* Navigation Header - X button top right */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-5" style={{ zIndex: 20 }}>
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Bottom Section: Movie Info with Purple Gradient */}
            <div className="relative min-h-[240px] overflow-visible">
              {/* Purple Gradient Background */}
              <div 
                className="absolute inset-0"
                style={{ 
                  background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.4), rgba(126, 58, 242, 0.3), rgba(107, 33, 168, 0.2), rgba(15, 14, 23, 0.7))',
                  zIndex: 1
                }}
              />
              
              {/* Movie Info Container */}
              <div className="px-5 py-6 relative z-30">
                {/* Movie Thumbnail + Movie Title Section */}
                <div className="flex gap-4 items-start mb-4">
                  {/* Movie Thumbnail */}
                  <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
                    <img
                      src={movieDetail.Poster && movieDetail.Poster !== 'N/A' ? movieDetail.Poster : 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80'}
                      alt={movieDetail.Title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80'
                      }}
                    />
                  </div>
                  
                  {/* Movie Title Section */}
                  <div className="flex-1 pt-1">
                    <h1 className="text-xl font-bold text-white mb-1 leading-tight">{movieDetail.Title}</h1>
                    <p className="text-sm text-gray-400 mb-1">{movieDetail.Director || 'Unknown Director'}</p>
                    
                    {/* Movie Stats on same line */}
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

                {/* Buttons - full width */}
                <div className="flex space-x-3 mt-3 relative z-50" style={{ zIndex: 100000 }}>
                  {/* Status Button */}
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
                  
                  {/* Share Button */}
                  <button 
                    onClick={() => setShowShareWithFriendsModal(true)}
                    className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
                  >
                    <Share size={16} />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Section - Under the colored section */}
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
                  {/* Plot Section */}
                  {movieDetail.Plot && movieDetail.Plot !== 'N/A' && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Plot</h3>
                      <div className="text-gray-300 leading-relaxed">
                        {showFullPlot ? movieDetail.Plot : truncatePlot(movieDetail.Plot, 3)}
                        {movieDetail.Plot.length > 200 && (
                          <button
                            onClick={() => setShowFullPlot(!showFullPlot)}
                            className="text-indigo-400 hover:text-indigo-300 ml-2 underline transition-colors"
                          >
                            {showFullPlot ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cast and Crew */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {movieDetail.Director && movieDetail.Director !== 'N/A' && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Director</h3>
                        <p className="text-indigo-300">{movieDetail.Director}</p>
                      </div>
                    )}

                    {movieDetail.Actors && movieDetail.Actors !== 'N/A' && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Cast</h3>
                        <p className="text-gray-300">{movieDetail.Actors}</p>
                      </div>
                    )}

                    {movieDetail.Genre && movieDetail.Genre !== 'N/A' && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Genres</h3>
                        <div className="flex flex-wrap gap-2">
                          {movieDetail.Genre.split(', ').map((genre, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-indigo-800/40 border border-indigo-700/40 text-indigo-200 rounded-lg text-sm"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {movieDetail.Released && movieDetail.Released !== 'N/A' && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Release Date</h3>
                        <p className="text-gray-300">{movieDetail.Released}</p>
                      </div>
                    )}
                  </div>

                  {/* Ratings Section */}
                  {movieDetail.imdbRating !== 'N/A' && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Ratings</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(() => {
                          const ratings = generateMockRatings(movieDetail.imdbRating)
                          return (
                            <>
                              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
                                <div className="text-yellow-400 font-bold text-xl">{ratings.imdb}</div>
                                <div className="text-gray-400 text-sm mt-1">IMDb</div>
                              </div>
                              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
                                <div className="text-red-400 font-bold text-xl">{ratings.rottenTomatoes}%</div>
                                <div className="text-gray-400 text-sm mt-1">Rotten Tomatoes</div>
                              </div>
                              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
                                <div className="text-green-400 font-bold text-xl">{ratings.letterboxd}</div>
                                <div className="text-gray-400 text-sm mt-1">Letterboxd</div>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}

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
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {directorMovies.slice(0, 8).map((movie) => (
                          <div
                            key={movie.id}
                            onClick={() => onMovieSelect?.(movie.id)}
                            className="bg-gray-800/30 border border-gray-700/30 rounded-xl overflow-hidden hover:border-indigo-600/50 transition-all cursor-pointer group"
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
                            <div className="p-3">
                              <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">
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
                  {(trailer || images.length > 0) && (
                    <div className="relative bg-black rounded-xl overflow-hidden">
                      <div className="aspect-video relative">
                        {(() => {
                          const totalItems = (trailer ? 1 : 0) + images.length
                          const isTrailer = trailer && activeImageIndex === 0
                          const imageIndex = trailer ? activeImageIndex - 1 : activeImageIndex

                          if (totalItems === 0) {
                            return (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <p className="text-gray-400">No media available</p>
                              </div>
                            )
                          }

                          return (
                            <>
                              {isTrailer ? (
                                <div className="w-full h-full relative group">
                                  <img
                                    src={`https://img.youtube.com/vi/${trailer.url.split('v=')[1]}/maxresdefault.jpg`}
                                    alt="Trailer thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                    <button
                                      onClick={() => window.open(trailer.url, '_blank')}
                                      className="w-20 h-20 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transform hover:scale-110 transition-all shadow-2xl"
                                    >
                                      <Play size={32} className="ml-1" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={images[imageIndex]}
                                  alt={`${movieDetail.Title} image ${imageIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80'
                                  }}
                                />
                              )}
                            </>
                          )
                        })()}

                        {/* Navigation Arrows */}
                        {((trailer ? 1 : 0) + images.length) > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all"
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <button
                              onClick={nextImage}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </>
                        )}

                        {/* Media Counter */}
                        {((trailer ? 1 : 0) + images.length) > 1 && (
                          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                            {activeImageIndex + 1} / {(trailer ? 1 : 0) + images.length}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Media Thumbnails */}
                  {(trailer || images.length > 0) && ((trailer ? 1 : 0) + images.length) > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {trailer && (
                        <button
                          onClick={() => setActiveImageIndex(0)}
                          className={`flex-shrink-0 relative ${activeImageIndex === 0 ? 'ring-2 ring-indigo-500' : ''}`}
                        >
                          <img
                            src={`https://img.youtube.com/vi/${trailer.url.split('v=')[1]}/mqdefault.jpg`}
                            alt="Trailer"
                            className="w-24 h-16 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
                            <Play size={16} className="text-white" />
                          </div>
                        </button>
                      )}
                      
                      {images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImageIndex(trailer ? index + 1 : index)}
                          className={`flex-shrink-0 ${activeImageIndex === (trailer ? index + 1 : index) ? 'ring-2 ring-indigo-500' : ''}`}
                        >
                          <img
                            src={image}
                            alt={`Image ${index + 1}`}
                            className="w-24 h-16 object-cover rounded-lg"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No Media Message */}
                  {!trailer && images.length === 0 && (
                    <div className="text-center py-12">
                      <Play size={48} className="text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No trailers or photos available for this movie</p>
                    </div>
                  )}
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
'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { omdbService } from '@/services/omdbService'
import { trailerService, type MovieTrailer } from '@/services/trailerService'
import { reviewsService, type MovieReview, type ReviewsResponse } from '@/services/reviewsService'
import { fetchWithCache, apiCache } from '@/utils/apiCache'

interface MovieDetailModalV2Props {
  isOpen: boolean
  onClose: () => void
  movieId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  imdbReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
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
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Ratings: { Source: string, Value: string }[]
  Metascore: string
  imdbRating: string
  imdbVotes: string
  Type: string
  DVD: string
  BoxOffice: string
  Production: string
  Website: string
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function MovieDetailModalV2({ 
  isOpen, 
  onClose, 
  movieId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  imdbReviews, 
  onReviewSubmit 
}: MovieDetailModalV2Props) {
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [userReview, setUserReview] = useState('')
  const [similarMovies, setSimilarMovies] = useState<any[]>([])
  const [directorMovies, setDirectorMovies] = useState<any[]>([])
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingDirector, setLoadingDirector] = useState(false)
  const [similarMoviesLoaded, setSimilarMoviesLoaded] = useState(false)
  const [directorMoviesLoaded, setDirectorMoviesLoaded] = useState(false)
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [showCast, setShowCast] = useState(false)
  const [movieTrailer, setMovieTrailer] = useState<MovieTrailer | null>(null)
  const [trailerLoading, setTrailerLoading] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [movieReviews, setMovieReviews] = useState<MovieReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  // Mock data for similar movies and director movies
  const mockSimilarMovies = [
    { id: 1, title: "Inception", image: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg", rating: 4.5 },
    { id: 2, title: "Interstellar", image: "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg", rating: 4.8 },
    { id: 3, title: "The Matrix", image: "https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg", rating: 4.7 },
    { id: 4, title: "Blade Runner 2049", image: "https://m.media-amazon.com/images/M/MV5BNzA1Njg4NzYxOV5BMl5BanBnXkFtZTgwODk5NjU3MzI@._V1_SX300.jpg", rating: 4.6 },
    { id: 5, title: "Ex Machina", image: "https://m.media-amazon.com/images/M/MV5BMTUxNzc0OTIxMV5BMl5BanBnXkFtZTgwNDI3NzU2NDE@._V1_SX300.jpg", rating: 4.5 },
    { id: 6, title: "Arrival", image: "https://m.media-amazon.com/images/M/MV5BMTExMzU0ODcxNDheQTJeQWpwZ15BbWU4MDE1OTI4MzAy._V1_SX300.jpg", rating: 4.4 },
    { id: 7, title: "Her", image: "https://m.media-amazon.com/images/M/MV5BMjA1Nzk0OTM2OF5BMl5BanBnXkFtZTgwNjU2NjEwMDE@._V1_SX300.jpg", rating: 4.6 },
    { id: 8, title: "Minority Report", image: "https://m.media-amazon.com/images/M/MV5BNjZkNDU5YzAtZjZhZC00ZWVlLWI4N2YtNzg3ZDNhMmM5NDcxL2ltYWdlL2ltYWdlXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg", rating: 4.3 }
  ]

  const mockDirectorMovies = [
    { id: 1, title: "Dunkirk", image: "https://m.media-amazon.com/images/M/MV5BN2YyZjQ0NTEtNzU5MS00NGZkLTg0MTEtYzJmMWY3MWRhZjM2XkEyXkFqcGdeQXVyMDA4NzMyOA@@._V1_SX300.jpg", rating: 4.2 },
    { id: 2, title: "The Dark Knight", image: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg", rating: 4.9 },
    { id: 3, title: "Memento", image: "https://m.media-amazon.com/images/M/MV5BZTcyNjk1MjgtOWI3Mi00YzQwLWI5MTktMzY4ZmI2NDAyNzYzXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg", rating: 4.5 },
    { id: 4, title: "The Prestige", image: "https://m.media-amazon.com/images/M/MV5BMjA4NDI0MTIxNF5BMl5BanBnXkFtZTYwNTM0MzY2._V1_SX300.jpg", rating: 4.6 }
  ]

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
      setShowAllGenres(false)
      setShowCast(false)
      setShowLibraryDropdown(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Ref pour éviter les appels API multiples
  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen && movieId && hasLoadedRef.current !== movieId) {
      hasLoadedRef.current = movieId
      fetchMovieDetail()
    }
    if (!isOpen) {
      hasLoadedRef.current = null
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
    const handleClickOutside = (event: MouseEvent) => {
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(event.target as Node)) {
        setShowLibraryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchMovieDetail = async () => {
    if (!movieId) return
    
    setLoading(true)
    try {
      let imdbId = movieId
      
      if (movieId.startsWith('movie-')) {
        imdbId = movieId.replace('movie-', '')
      }
      
      console.log('🎬 Fetching movie details for ID:', imdbId)
      
      const data = await omdbService.getMovieDetails(imdbId)
      setMovieDetail(data as MovieDetail)
      
      // Fetch trailer
      fetchTrailer(imdbId, data.Title)
      
      // Fetch real reviews
      fetchReviews(imdbId, data.Title)
      
      // Fetch similar movies
      if (data?.Genre) {
        await fetchSimilarMovies(data.Genre.split(',')[0].trim())
      }
      
      // Fetch director movies
      if (data?.Director) {
        await fetchDirectorMovies(data.Director)
      }
      
    } catch (error) {
      console.error('Error loading movie details:', error)
      
      // Fallback vers les données statiques
      const { sampleContent } = require('@/data/sampleContent')
      
      // Essayer de trouver le film correspondant dans sampleContent
      let fallbackMovie = sampleContent.movies?.find((movie: any) => 
        movie.id === movieId || movie.id === `movie-${imdbId}` || movie.id === imdbId
      )
      
      // Si pas trouvé, utiliser le premier film comme fallback
      if (!fallbackMovie) {
        fallbackMovie = sampleContent.movies?.[0] || {
          title: "Sample Movie",
          year: 2024,
          rating: 4.0,
          genre: "Drama",
          director: "Unknown Director"
        }
      }
      
      // Convertir en format MovieDetail
      setMovieDetail({
        imdbID: imdbId,
        Title: fallbackMovie.title,
        Year: fallbackMovie.year?.toString() || "2024",
        Rated: "PG-13",
        Released: `01 Jan ${fallbackMovie.year || 2024}`,
        Runtime: "120 min",
        Genre: fallbackMovie.genre || "Drama",
        Director: fallbackMovie.director || "Unknown Director",
        Writer: "Unknown Writer",
        Actors: "Various Actors",
        Plot: `${fallbackMovie.title} is an engaging ${fallbackMovie.genre || 'drama'} film that delivers compelling storytelling and memorable characters.`,
        Language: "English",
        Country: "USA",
        Awards: "N/A",
        Poster: fallbackMovie.image || "https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Movie+Poster",
        Ratings: [
          { Source: "Internet Movie Database", Value: `${fallbackMovie.rating || 7.0}/10` },
          { Source: "Rotten Tomatoes", Value: `${Math.round((fallbackMovie.rating || 7.0) * 10)}%` }
        ],
        Metascore: Math.round((fallbackMovie.rating || 7.0) * 10).toString(),
        imdbRating: (fallbackMovie.rating || 7.0).toString(),
        imdbVotes: "10,000",
        Type: "movie",
        DVD: "N/A",
        BoxOffice: "N/A",
        Production: "N/A",
        Website: "N/A"
      })
      
      // For fallback demo data, also fetch similar movies
      await fetchSimilarMovies(fallbackMovie.genre || "Drama")
      await fetchDirectorMovies(fallbackMovie.director || "Unknown Director")
      // Fetch trailer for mock data too
      fetchTrailer(imdbId, fallbackMovie.title)
      // Fetch reviews for mock data too
      fetchReviews(imdbId, fallbackMovie.title)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrailer = async (movieId: string, movieTitle: string) => {
    setTrailerLoading(true)
    try {
      const trailer = await trailerService.getMovieTrailer(movieId, movieTitle)
      setMovieTrailer(trailer)
    } catch (error) {
      console.error('Error fetching trailer:', error)
      setMovieTrailer(null)
    } finally {
      setTrailerLoading(false)
    }
  }

  const fetchReviews = async (movieId: string, movieTitle: string) => {
    setReviewsLoading(true)
    try {
      console.log('📝 Fetching reviews for movie:', movieTitle)
      const reviewsResponse = await reviewsService.getMovieReviews(movieId, movieTitle)
      setMovieReviews(reviewsResponse.reviews)
      console.log('📝 Loaded', reviewsResponse.reviews.length, 'reviews')
    } catch (error) {
      console.error('📝 Error fetching reviews:', error)
      setMovieReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchSimilarMovies = async (genre: string) => {
    setLoadingSimilar(true)
    try {
      console.log('🎬 Fetching similar movies for genre:', genre)
      
      const searchResults = await omdbService.searchMovies(genre)
      const similarMoviesData = searchResults
        .filter(movie => movie.imdbID !== movieId)
        .slice(0, 8)
        .map(movie => omdbService.convertToAppFormat(movie))
      
      setSimilarMovies(similarMoviesData)
      setSimilarMoviesLoaded(true)
      
    } catch (error) {
      console.error('🎬 Error fetching similar movies:', error)
      setSimilarMovies(mockSimilarMovies)
      setSimilarMoviesLoaded(true)
    } finally {
      setLoadingSimilar(false)
    }
  }

  const fetchDirectorMovies = async (directorName: string) => {
    setLoadingDirector(true)
    try {
      console.log('🎬 Fetching director movies for:', directorName)
      
      const searchResults = await omdbService.searchMovies(directorName)
      const directorMoviesData = searchResults
        .filter(movie => movie.imdbID !== movieId)
        .slice(0, 6)
        .map(movie => omdbService.convertToAppFormat(movie))
      
      setDirectorMovies(directorMoviesData)
      setDirectorMoviesLoaded(true)
      
    } catch (error) {
      console.error('🎬 Error fetching director movies:', error)
      setDirectorMovies(mockDirectorMovies)
      setDirectorMoviesLoaded(true)
    } finally {
      setLoadingDirector(false)
    }
  }

  const handleStatusSelect = (status: MediaStatus | 'remove') => {
    if (!movieDetail) return
    
    if (status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(movieId)
      }
      setSelectedStatus(null)
    } else {
      const movieItem = {
        id: movieId,
        title: movieDetail.Title,
        image: movieDetail.Poster !== 'N/A' ? movieDetail.Poster : undefined,
        category: 'movies' as const,
        year: parseInt(movieDetail.Year) || 2024,
        rating: movieDetail.imdbRating ? Number((parseFloat(movieDetail.imdbRating) / 2).toFixed(1)) : 0,
        director: movieDetail.Director
      }
      
      onAddToLibrary(movieItem, status)
      setSelectedStatus(status)
    }
    setShowLibraryDropdown(false)
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

  const getStatusColor = (status: MediaStatus | null) => {
    if (!status) return 'bg-gray-800'
    switch (status) {
      case 'want-to-play': return 'bg-orange-600'
      case 'currently-playing': return 'bg-green-600'
      case 'completed': return 'bg-blue-600'
      default: return 'bg-gray-800'
    }
  }

  const handleSubmitReview = () => {
    if (userRating > 0) {
      onReviewSubmit({
        rating: userRating,
        review: userReview.trim(),
        privacy: reviewPrivacy
      })
      
      setShowReviewBox(false)
      setUserReview('')
      setUserRating(0)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-[#0B0B0B] w-full h-full md:max-w-2xl md:h-[95vh] md:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : movieDetail ? (
          <>
            {/* Header */}
            <div className="relative px-4 pt-6 pb-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-start justify-between pr-12">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">{movieDetail.Title}</h1>
                  
                  {/* Metadata */}
                  <div className="flex items-center space-x-2 text-[#B0B0B0] text-sm">
                    <span>{movieDetail.Year}</span>
                    <span>•</span>
                    <span>{movieDetail.Runtime}</span>
                    <span>•</span>
                    <span>{movieDetail.Rated}</span>
                  </div>
                </div>

                {/* Share Button */}
                <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                  <Send size={18} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs - Pill Style */}
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex space-x-2">
                {[
                  { key: 'overview' as const, label: 'Overview' },
                  { key: 'reviews' as const, label: 'Reviews' },
                  { key: 'moreinfo' as const, label: 'My Movie Card' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ease-in-out ${
                      activeTab === tab.key
                        ? 'bg-[#1DB954] text-white font-bold shadow-lg border border-[#1DB954]'
                        : 'bg-transparent text-[#B0B0B0] border border-gray-600 hover:bg-gray-800 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="p-4 space-y-6">
                  {/* Media Section */}
                  <div className="space-y-4">
                    {/* Trailer */}
                    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                      {trailerLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      ) : movieTrailer && movieTrailer.provider === 'youtube' && movieTrailer.videoId && !movieTrailer.url.includes('results?search_query') ? (
                        // Trailer YouTube embed direct
                        <iframe
                          src={movieTrailer.url}
                          title={`${movieDetail.Title} Trailer`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : movieTrailer && movieTrailer.url.includes('results?search_query') ? (
                        // Recherche YouTube - ouvrir dans un nouvel onglet avec image de fond
                        <div className="relative w-full h-full">
                          <img
                            src={movieDetail.Poster !== 'N/A' ? movieDetail.Poster : 'https://via.placeholder.com/640x360/1a1a1a/ffffff?text=No+Image'}
                            alt={`${movieDetail.Title} poster`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            <Play size={48} className="text-white mb-4" />
                            <a
                              href={movieTrailer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Watch Trailer on YouTube
                            </a>
                          </div>
                        </div>
                      ) : (
                        // Pas de trailer - afficher le poster du film avec message
                        <div className="relative w-full h-full">
                          <img
                            src={movieDetail.Poster !== 'N/A' ? movieDetail.Poster : 'https://via.placeholder.com/640x360/1a1a1a/ffffff?text=No+Image'}
                            alt={`${movieDetail.Title} poster`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <Play size={48} className="text-white mb-2 opacity-50" />
                            <p className="text-white text-sm opacity-75">No trailer available</p>
                            <p className="text-gray-300 text-xs opacity-50 mt-1">Showing movie poster</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add to Library Button */}
                  <div className="relative" ref={libraryDropdownRef}>
                    <button
                      onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <span>{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                      <ChevronDown size={16} className={`transition-transform ${showLibraryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown Options */}
                    {showLibraryDropdown && (
                      <div className="absolute top-full left-0 mt-2 bg-[#1A1A1A] rounded-lg shadow-xl z-10 py-2 min-w-48 border border-gray-800">
                        <button
                          onClick={() => handleStatusSelect('want-to-play')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Want to Watch
                        </button>
                        <button
                          onClick={() => handleStatusSelect('currently-playing')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Watching
                        </button>
                        <button
                          onClick={() => handleStatusSelect('completed')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Watched
                        </button>
                        {selectedStatus && (
                          <>
                            <div className="border-t border-gray-700 my-1"></div>
                            <button
                              onClick={() => handleStatusSelect('remove')}
                              className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800 transition-colors text-sm"
                            >
                              Remove from Library
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rate this movie - Only show if Watching or Watched */}
                  {(selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Rate this movie</h3>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => {
                              setUserRating(rating)
                              setShowReviewBox(true)
                            }}
                            onMouseEnter={() => setHoverRating(rating)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1"
                          >
                            <Star
                              size={24}
                              className={`transition-colors ${
                                (hoverRating || userRating) >= rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                        {userRating > 0 && (
                          <span className="text-white ml-2 font-medium">{userRating}/5</span>
                        )}
                      </div>
                    
                    {showReviewBox && (
                      <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg border border-gray-800">
                        <h4 className="text-white font-medium mb-3">Share your thoughts about this movie</h4>
                        <div className="flex space-x-2 mb-3">
                          <button
                            onClick={() => setReviewPrivacy('private')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              reviewPrivacy === 'private'
                                ? 'bg-gray-700 text-white'
                                : 'bg-transparent text-gray-400 border border-gray-700'
                            }`}
                          >
                            Private Note
                          </button>
                          <button
                            onClick={() => setReviewPrivacy('public')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              reviewPrivacy === 'public'
                                ? 'bg-gray-700 text-white'
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
                          className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-800 focus:outline-none focus:border-gray-600"
                        />
                        <div className="flex justify-end space-x-2 mt-3">
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
                            onClick={handleSubmitReview}
                            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  )}

                  {/* Review Scores */}
                  <div className="flex space-x-4">
                    {/* IMDb Score */}
                    {movieDetail.imdbRating && movieDetail.imdbRating !== 'N/A' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{parseFloat(movieDetail.imdbRating).toFixed(1)}</span>
                        </div>
                        <span className="text-[#B0B0B0] text-sm">IMDb</span>
                      </div>
                    )}
                    
                    {/* Metacritic Score */}
                    {movieDetail.Metascore && movieDetail.Metascore !== 'N/A' && (
                      <div className="flex items-center space-x-2">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          parseInt(movieDetail.Metascore) >= 80 ? 'bg-green-700' :
                          parseInt(movieDetail.Metascore) >= 70 ? 'bg-yellow-600' :
                          parseInt(movieDetail.Metascore) >= 60 ? 'bg-orange-600' : 'bg-red-600'
                        }`}>
                          <span className="text-white font-bold text-lg">{movieDetail.Metascore}</span>
                        </div>
                        <span className="text-[#B0B0B0] text-sm">Metacritic</span>
                      </div>
                    )}
                    
                    {/* Show placeholder if no scores available */}
                    {(!movieDetail.imdbRating || movieDetail.imdbRating === 'N/A') && (!movieDetail.Metascore || movieDetail.Metascore === 'N/A') && (
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 font-bold text-sm">N/A</span>
                        </div>
                        <span className="text-[#B0B0B0] text-sm">No Scores</span>
                      </div>
                    )}
                  </div>

                  {/* Genre */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Genre</h3>
                    <button
                      onClick={() => setShowAllGenres(!showAllGenres)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors">
                        <div className="flex items-center space-x-3">
                          <span className="text-white">{movieDetail.Genre}</span>
                        </div>
                        <ChevronRight className={`text-gray-400 transition-transform ${showAllGenres ? 'rotate-90' : ''}`} size={20} />
                      </div>
                    </button>
                  </div>

                  {/* Director/Writer */}
                  <div>
                    <button
                      onClick={() => setShowCast(!showCast)}
                      className="w-full text-left flex items-center justify-between text-[#B0B0B0]"
                    >
                      <span>Director: {movieDetail.Director}</span>
                      <ChevronRight className={`transition-transform ${showCast ? 'rotate-90' : ''}`} size={16} />
                    </button>
                    
                    {showCast && (
                      <div className="mt-2 space-y-1 text-[#B0B0B0]">
                        <div>Writer: {movieDetail.Writer}</div>
                        <div>Cast: {movieDetail.Actors}</div>
                      </div>
                    )}
                  </div>

                  {/* Release Date */}
                  <div className="text-[#B0B0B0] text-sm">
                    Released: {movieDetail.Released}
                  </div>

                  {/* Plot */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Plot</h3>
                    <div className="text-[#B0B0B0] leading-relaxed">
                      <p className={`${!showFullOverview ? 'line-clamp-3' : ''}`}>
                        {movieDetail.Plot || 'No plot available.'}
                      </p>
                      {movieDetail.Plot && movieDetail.Plot.length > 150 && (
                        <button
                          onClick={() => setShowFullOverview(!showFullOverview)}
                          className="text-white text-sm mt-2 flex items-center space-x-1 hover:underline"
                        >
                          <span>{showFullOverview ? 'Less' : 'More'}</span>
                          <ChevronRight className={`transition-transform ${showFullOverview ? 'rotate-90' : ''}`} size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Similar Movies */}
                  <div>
                    <h3 className="text-white font-medium mb-4">Similar Movies</h3>
                    <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                      {similarMovies.map((movie) => (
                        <div 
                          key={movie.id} 
                          className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            // Ouvrir le détail de ce film
                            window.location.href = `#movie-${movie.id}`
                            onClose()
                          }}
                        >
                          <img
                            src={movie.image || 'https://via.placeholder.com/112x168/333/fff?text=No+Image'}
                            alt={movie.title}
                            className="w-full h-40 object-cover rounded-lg mb-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'https://via.placeholder.com/112x168/333/fff?text=No+Image'
                            }}
                          />
                          <p className="text-white text-sm truncate" title={movie.title}>{movie.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* More from this director */}
                  {movieDetail.Director && (
                    <div>
                      <h3 className="text-white font-medium mb-4">
                        More from {movieDetail.Director}
                      </h3>
                      {directorMovies.length > 0 ? (
                        <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                          {directorMovies.map((movie) => (
                            <div 
                              key={movie.id} 
                              className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                // Ouvrir le détail de ce film
                                window.location.href = `#movie-${movie.id}`
                                onClose()
                              }}
                            >
                              <img
                                src={movie.image || 'https://via.placeholder.com/112x168/333/fff?text=No+Image'}
                                alt={movie.title}
                                className="w-full h-40 object-cover rounded-lg mb-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = 'https://via.placeholder.com/112x168/333/fff?text=No+Image'
                                }}
                              />
                              <p className="text-white text-sm truncate" title={movie.title}>{movie.title}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[#B0B0B0] text-sm">
                          No other movies found from this director
                        </div>
                      )}
                    </div>
                  )}

                  {/* MPAA Rating at bottom */}
                  <div className="mt-8 pt-4 border-t border-gray-800">
                    <div className="flex justify-center">
                      <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg px-4 py-2">
                        <span className="text-[#B0B0B0] text-sm">
                          {movieDetail.Rated ? `Rated ${movieDetail.Rated}` : 'Not Rated'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Reviews</h3>
                    {movieReviews.length > 0 && (
                      <span className="text-[#B0B0B0] text-sm">{movieReviews.length} reviews</span>
                    )}
                  </div>
                  
                  {reviewsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
                              <div className="h-3 bg-gray-700 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="h-16 bg-gray-700 rounded mb-2"></div>
                          <div className="flex items-center space-x-4">
                            <div className="h-3 bg-gray-700 rounded w-20"></div>
                            <div className="h-3 bg-gray-700 rounded w-16"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : movieReviews.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {movieReviews.map((review) => (
                        <div key={review.id} className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                          {/* Review Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {review.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-medium text-sm">{review.username}</span>
                                  {review.verified && (
                                    <span className="text-green-400 text-xs">✓ Verified</span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={12}
                                        className={`${
                                          star <= review.rating
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[#B0B0B0] text-xs">{review.date}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Platform Badge */}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              review.platform === 'imdb' ? 'bg-yellow-900 text-yellow-200' :
                              review.platform === 'rotten-tomatoes' ? 'bg-red-900 text-red-200' :
                              review.platform === 'metacritic' ? 'bg-green-900 text-green-200' :
                              review.platform === 'reddit' ? 'bg-orange-900 text-orange-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {review.platform === 'imdb' ? 'IMDb' :
                               review.platform === 'rotten-tomatoes' ? 'RT' :
                               review.platform === 'metacritic' ? 'Metacritic' :
                               review.platform === 'reddit' ? 'Reddit' :
                               review.platform === 'generated' ? 'Community' : 'User'}
                            </span>
                          </div>
                          
                          {/* Review Text */}
                          <p className="text-[#B0B0B0] text-sm leading-relaxed mb-3">
                            {review.text}
                          </p>
                          
                          {/* Review Footer */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {review.helpful !== undefined && (
                              <span>👍 {review.helpful} helpful</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📝</span>
                      </div>
                      <p className="text-white font-medium mb-2">No reviews yet</p>
                      <p className="text-[#B0B0B0] text-sm">Be the first to review this movie</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="p-4 space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-white font-medium text-lg mb-2">My Movie Card</h3>
                    <p className="text-[#B0B0B0] text-sm">Track your personal movie watching experience</p>
                  </div>

                  {/* Personal Movie Info Form */}
                  <div className="space-y-4">
                    {/* Date Watched */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Date Watched</label>
                      <input 
                        type="date" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="When did you watch this?"
                      />
                    </div>

                    {/* Platform Used */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Platform Used</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select platform...</option>
                        <option value="netflix">Netflix</option>
                        <option value="disney-plus">Disney+</option>
                        <option value="hbo-max">HBO Max</option>
                        <option value="amazon-prime">Amazon Prime Video</option>
                        <option value="hulu">Hulu</option>
                        <option value="apple-tv">Apple TV+</option>
                        <option value="paramount">Paramount+</option>
                        <option value="cinema">Cinema/Theater</option>
                        <option value="blu-ray">Blu-ray/DVD</option>
                        <option value="digital-purchase">Digital Purchase</option>
                        <option value="digital-rental">Digital Rental</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Viewing Method */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">How did you watch it?</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select viewing method...</option>
                        <option value="subscription">Subscription Service</option>
                        <option value="rental">Rental</option>
                        <option value="purchase">Purchase</option>
                        <option value="cinema">Cinema/Theater</option>
                        <option value="free-trial">Free Trial</option>
                        <option value="borrowed">Borrowed/Shared</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Cost */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Cost (Optional)</label>
                      <div className="flex space-x-2">
                        <span className="bg-[#0B0B0B] text-[#B0B0B0] text-sm rounded-lg p-3 border border-gray-700 flex items-center">$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          className="flex-1 bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Who watched with */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Watched With</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="e.g., Friends, Family, Solo, Partner..."
                      />
                    </div>

                    {/* Mood/Occasion */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Mood/Occasion</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="e.g., Date night, Lazy Sunday, Stress relief..."
                      />
                    </div>

                    {/* Personal Notes */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Personal Notes</label>
                      <textarea 
                        rows={4}
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors resize-none"
                        placeholder="Your thoughts, favorite scenes, or memories about this movie..."
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                      <button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium py-3 px-4 rounded-lg transition-colors">
                        Save Movie Card
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎬</span>
              </div>
              <p className="text-white font-medium mb-2">Movie not found</p>
              <p className="text-[#B0B0B0] text-sm">Unable to load movie details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
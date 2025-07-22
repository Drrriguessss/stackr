'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share, Film, Calendar, User, Clock, Award } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface MovieDetailDarkV2Props {
  isOpen: boolean
  onClose: () => void
  movieId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  googleReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface MovieDetail {
  imdbID: string
  Title: string
  Year: string
  Rated?: string
  Released?: string
  Runtime?: string
  Genre?: string
  Director?: string
  Writer?: string
  Actors?: string
  Plot?: string
  Language?: string
  Country?: string
  Awards?: string
  Poster: string
  Ratings?: { Source: string; Value: string }[]
  Metascore?: string
  imdbRating?: string
  imdbVotes?: string
  Type?: string
  DVD?: string
  BoxOffice?: string
  Production?: string
  Website?: string
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function MovieDetailDarkV2({ 
  isOpen, 
  onClose, 
  movieId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  googleReviews, 
  onReviewSubmit 
}: MovieDetailDarkV2Props) {
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
  const [showAllActors, setShowAllActors] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [movieReviews, setMovieReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  // Mock data for similar movies and director movies
  const mockSimilarMovies = [
    { id: 1, title: "Inception", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=Inception", rating: 8.8, year: "2010", director: "Christopher Nolan" },
    { id: 2, title: "The Dark Knight", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=The+Dark+Knight", rating: 9.0, year: "2008", director: "Christopher Nolan" },
    { id: 3, title: "Interstellar", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=Interstellar", rating: 8.6, year: "2014", director: "Christopher Nolan" },
    { id: 4, title: "Dunkirk", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=Dunkirk", rating: 7.8, year: "2017", director: "Christopher Nolan" },
  ]

  const mockDirectorMovies = [
    { id: 1, title: "Memento", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=Memento", rating: 8.4, year: "2000" },
    { id: 2, title: "The Prestige", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=The+Prestige", rating: 8.5, year: "2006" },
    { id: 3, title: "Tenet", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=Tenet", rating: 7.3, year: "2020" },
    { id: 4, title: "Oppenheimer", image: "https://via.placeholder.com/300x450/1a1a1a/white?text=Oppenheimer", rating: 8.3, year: "2023" }
  ]

  // Ref pour éviter les appels API multiples
  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
      setShowAllActors(false)
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchMovieDetail = async () => {
    if (!movieId) return
    
    setLoading(true)
    try {
      // Utiliser les données de fallback statiques pour le moment
      const { sampleContent } = require('@/data/sampleContent')
      
      let fallbackMovie = sampleContent.movies.find((movie: any) => 
        movie.id === movieId || movie.id === `movie-${movieId}` || movieId.includes(movie.id.toString())
      )
      
      if (!fallbackMovie) {
        fallbackMovie = sampleContent.movies[0]
      }

      setMovieDetail({
        imdbID: fallbackMovie.id,
        Title: fallbackMovie.title,
        Year: fallbackMovie.year || '2023',
        Rated: 'PG-13',
        Released: '15 Jul 2023',
        Runtime: '148 min',
        Genre: fallbackMovie.genre || 'Drama, Thriller',
        Director: fallbackMovie.director || 'Christopher Nolan',
        Writer: 'Christopher Nolan, Jonathan Nolan',
        Actors: 'Leonardo DiCaprio, Marion Cotillard, Tom Hardy, Ellen Page',
        Plot: fallbackMovie.description || 'Un film captivant qui explore les profondeurs de l\'esprit humain à travers une intrigue complexe et des visuels époustouflants.',
        Language: 'English, French',
        Country: 'United States, United Kingdom',
        Awards: 'Won 4 Oscars. 157 wins & 220 nominations total',
        Poster: fallbackMovie.image,
        Ratings: [
          { Source: 'Internet Movie Database', Value: '8.8/10' },
          { Source: 'Rotten Tomatoes', Value: '87%' },
          { Source: 'Metacritic', Value: '74/100' }
        ],
        Metascore: '74',
        imdbRating: '8.8',
        imdbVotes: '2,150,000',
        Type: 'movie',
        DVD: '07 Dec 2010',
        BoxOffice: '$292,576,195',
        Production: 'Warner Bros. Pictures',
        Website: 'N/A'
      })

      setSimilarMovies(mockSimilarMovies)
      setDirectorMovies(mockDirectorMovies)
      
    } catch (error) {
      console.error('Error loading movie details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToLibrary = (status: MediaStatus) => {
    if (!movieDetail) return

    const libraryItem = {
      id: movieDetail.imdbID,
      title: movieDetail.Title,
      image: movieDetail.Poster,
      category: 'movies' as const,
      status,
      rating: userRating || undefined,
      addedAt: new Date().toISOString(),
      director: movieDetail.Director || 'Unknown Director',
      year: movieDetail.Year,
      genre: movieDetail.Genre || 'Drama'
    }

    onAddToLibrary(libraryItem, status)
    setSelectedStatus(status)
    setShowLibraryDropdown(false)
  }

  const handleStatusUpdate = (newStatus: MediaStatus) => {
    setSelectedStatus(newStatus)
    setShowLibraryDropdown(false)
  }

  const getStatusColor = (status: MediaStatus | null): string => {
    switch (status) {
      case 'want-to-watch': return 'bg-blue-600 hover:bg-blue-700'
      case 'currently-watching': return 'bg-yellow-600 hover:bg-yellow-700'  
      case 'completed': return 'bg-green-600 hover:bg-green-700'
      case 'on-hold': return 'bg-orange-600 hover:bg-orange-700'
      case 'dropped': return 'bg-red-600 hover:bg-red-700'
      default: return 'bg-[#1DB954] hover:bg-green-700'
    }
  }

  const getStatusLabel = (status: MediaStatus | null): string => {
    switch (status) {
      case 'want-to-watch': return 'Want to Watch'
      case 'currently-watching': return 'Currently Watching'
      case 'completed': return 'Watched'
      case 'on-hold': return 'On Hold'
      case 'dropped': return 'Dropped'
      default: return 'Add to Library'
    }
  }

  const formatRuntime = (runtime: string | undefined) => {
    if (!runtime) return 'N/A'
    return runtime.replace(' min', 'm')
  }

  const getRatingColor = (rating: string) => {
    const numRating = parseFloat(rating)
    if (numRating >= 8.0) return 'text-green-500'
    if (numRating >= 7.0) return 'text-yellow-500'
    if (numRating >= 6.0) return 'text-orange-500'
    return 'text-red-500'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <Film className="w-6 h-6 text-[#1DB954]" />
            <h2 className="text-xl font-bold text-white">Movie Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Navigation Tabs */}
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
                    : 'bg-transparent text-[#B0B0B0] border border-gray-600 hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={scrollableRef} className="flex-1 overflow-y-auto max-h-[calc(95vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1DB954]"></div>
            </div>
          ) : movieDetail ? (
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Hero Section */}
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={movieDetail.Poster}
                        alt={movieDetail.Title}
                        className="w-64 h-96 object-cover rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/300x450/1a1a1a/white?text=Movie+Poster'
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div>
                        <h1 className="text-4xl font-bold text-white mb-2">{movieDetail.Title}</h1>
                        <div className="flex items-center space-x-4 text-gray-300 mb-4">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {movieDetail.Year}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatRuntime(movieDetail.Runtime)}
                          </span>
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {movieDetail.Director}
                          </span>
                          {movieDetail.Rated && (
                            <span className="bg-gray-700 px-2 py-1 rounded text-xs font-semibold">
                              {movieDetail.Rated}
                            </span>
                          )}
                        </div>
                        
                        {/* Ratings */}
                        <div className="flex items-center space-x-6 mb-4">
                          {movieDetail.imdbRating && (
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                <span className={`font-bold text-lg ml-1 ${getRatingColor(movieDetail.imdbRating)}`}>
                                  {movieDetail.imdbRating}
                                </span>
                                <span className="text-gray-400 text-sm ml-1">/10</span>
                              </div>
                              <span className="text-gray-400 text-sm">
                                ({movieDetail.imdbVotes} votes)
                              </span>
                            </div>
                          )}
                          {movieDetail.Metascore && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400 text-sm">Metacritic:</span>
                              <span className={`font-bold ${getRatingColor((parseInt(movieDetail.Metascore) / 10).toString())}`}>
                                {movieDetail.Metascore}/100
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Add to Library Button */}
                      <div className="relative" ref={libraryDropdownRef}>
                        <button
                          onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                          className={`${getStatusColor(selectedStatus)} text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2`}
                        >
                          <span>{getStatusLabel(selectedStatus)}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {showLibraryDropdown && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-700 z-10">
                            {(['want-to-watch', 'currently-watching', 'completed', 'on-hold', 'dropped'] as MediaStatus[]).map((status) => (
                              <button
                                key={status}
                                onClick={() => selectedStatus === status ? handleStatusUpdate(status) : handleAddToLibrary(status)}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg transition-colors"
                              >
                                {getStatusLabel(status)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Movie Info Grid */}
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div className="space-y-3">
                          <div className="flex">
                            <span className="text-gray-400 w-20">Genre:</span>
                            <span className="text-white">{movieDetail.Genre || 'N/A'}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-20">Cast:</span>
                            <span className="text-white flex-1">
                              {showAllActors || !movieDetail.Actors || movieDetail.Actors.length <= 100
                                ? movieDetail.Actors || 'N/A'
                                : `${movieDetail.Actors.slice(0, 100)}...`
                              }
                              {movieDetail.Actors && movieDetail.Actors.length > 100 && !showAllActors && (
                                <button
                                  onClick={() => setShowAllActors(true)}
                                  className="ml-1 text-[#1DB954] hover:text-green-400 text-xs"
                                >
                                  show more
                                </button>
                              )}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-20">Writer:</span>
                            <span className="text-white">{movieDetail.Writer || 'N/A'}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-20">Country:</span>
                            <span className="text-white">{movieDetail.Country || 'N/A'}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-20">Language:</span>
                            <span className="text-white">{movieDetail.Language || 'N/A'}</span>
                          </div>
                          {movieDetail.BoxOffice && (
                            <div className="flex">
                              <span className="text-gray-400 w-20">Box Office:</span>
                              <span className="text-white">{movieDetail.BoxOffice}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Awards */}
                      {movieDetail.Awards && movieDetail.Awards !== 'N/A' && (
                        <div className="flex items-start space-x-2 bg-gray-900 p-3 rounded-lg">
                          <Award className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300 text-sm">{movieDetail.Awards}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plot */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Plot</h3>
                    <div className="text-gray-300 leading-relaxed">
                      {showFullOverview || (movieDetail.Plot && movieDetail.Plot.length <= 500)
                        ? movieDetail.Plot
                        : `${movieDetail.Plot?.slice(0, 500)}...`
                      }
                      {movieDetail.Plot && movieDetail.Plot.length > 500 && (
                        <button
                          onClick={() => setShowFullOverview(!showFullOverview)}
                          className="ml-2 text-[#1DB954] hover:text-green-400 font-medium"
                        >
                          {showFullOverview ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ratings Breakdown */}
                  {movieDetail.Ratings && movieDetail.Ratings.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white">Ratings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {movieDetail.Ratings.map((rating, index) => (
                          <div key={index} className="bg-gray-900 p-4 rounded-lg text-center">
                            <div className="text-gray-400 text-sm mb-1">{rating.Source}</div>
                            <div className="text-white text-xl font-bold">{rating.Value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Similar Movies */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Similar Movies</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {similarMovies.map((movie) => (
                        <div key={movie.id} className="group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={movie.image}
                              alt={movie.title}
                              className="w-full h-72 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/300x450/1a1a1a/white?text=Movie+Poster'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="mt-2">
                            <h4 className="text-white font-medium truncate">{movie.title}</h4>
                            <p className="text-gray-400 text-sm">{movie.year} • {movie.director}</p>
                            <div className="flex items-center mt-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-white text-sm ml-1">{movie.rating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Director's Other Movies */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">More by {movieDetail.Director}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {directorMovies.map((movie) => (
                        <div key={movie.id} className="group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={movie.image}
                              alt={movie.title}
                              className="w-full h-72 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/300x450/1a1a1a/white?text=Movie+Poster'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="mt-2">
                            <h4 className="text-white font-medium truncate">{movie.title}</h4>
                            <p className="text-gray-400 text-sm">{movie.year}</p>
                            <div className="flex items-center mt-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-white text-sm ml-1">{movie.rating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Movie Reviews</h3>
                  <div className="bg-gray-900 rounded-lg p-4 text-center">
                    <Film className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">Reviews feature coming soon...</p>
                  </div>
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">My Movie Card</h3>
                  <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Watching Status
                        </label>
                        <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#1DB954] focus:border-transparent">
                          <option value="want-to-watch">Want to Watch</option>
                          <option value="currently-watching">Currently Watching</option>
                          <option value="completed">Watched</option>
                          <option value="on-hold">On Hold</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          My Rating
                        </label>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setUserRating(star)}
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${
                                  star <= (hoverRating || userRating)
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-600 hover:text-yellow-400'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Watch Date
                        </label>
                        <input
                          type="date"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Rewatch Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Personal Notes
                      </label>
                      <textarea
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
                        rows={4}
                        placeholder="What did you think about this movie?"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
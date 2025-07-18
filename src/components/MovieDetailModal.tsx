'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Calendar, Clock, Award, Users, Globe, Check } from 'lucide-react'
import { omdbService } from '@/services/omdbService'
import { idsMatch } from '@/utils/idNormalizer'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface MovieDetailModalProps {
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

export default function MovieDetailModal({ 
  isOpen, 
  onClose, 
  movieId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  imdbReviews, 
  onReviewSubmit 
}: MovieDetailModalProps) {
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'social' | 'more'>('info')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [similarMovies, setSimilarMovies] = useState<any[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false) // 🔧 NOUVEAU

  const scrollableRef = useRef<HTMLDivElement>(null)

  const movieStats = {
    'want-to-play': 2341,
    'currently-playing': 1156,
    'completed': 8923
  }

  // 🔧 Fonction pour créer un ID cohérent
  const getConsistentId = (movieId: string, imdbID?: string): string => {
    if (movieId.startsWith('movie-')) {
      return movieId
    }
    if (imdbID) {
      return `movie-${imdbID}`
    }
    return `movie-${movieId}`
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab('info')
      setSimilarMovies([])
      setHasUnsavedChanges(false) // 🔧 Reset changes
    }
  }, [isOpen, movieId])

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
    if (isOpen && movieId) {
      fetchMovieDetail()
    }
  }, [isOpen, movieId])

  // 🔧 Détecter le statut initial
  useEffect(() => {
    console.log('🎬 Checking initial library status for movieId:', movieId)
    
    const possibleIds = [
      movieId,
      `movie-${movieId}`,
      movieId.startsWith('movie-') ? movieId.replace('movie-', '') : null
    ].filter(Boolean)
    
    let libraryItem = null
    for (const id of possibleIds) {
      libraryItem = library.find(item => idsMatch(item.id, id!))
      if (libraryItem) {
        console.log('  ✅ Found in library:', libraryItem)
        break
      }
    }
    
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
    } else {
      setSelectedStatus(null)
    }
  }, [movieId, library])

  // 🔧 NOUVEAU: Gérer la fermeture avec auto-suppression
  const handleClose = () => {
    console.log('🚪 Modal closing...')
    console.log('  hasUnsavedChanges:', hasUnsavedChanges)
    console.log('  selectedStatus:', selectedStatus)
    
    // Si aucun statut n'est sélectionné et qu'il y avait des changements, supprimer de la bibliothèque
    if (hasUnsavedChanges && selectedStatus === null && movieDetail && onDeleteItem) {
      const idToDelete = getConsistentId(movieId, movieDetail.imdbID)
      console.log('🗑️ Auto-removing from library on close:', idToDelete)
      onDeleteItem(idToDelete)
    }
    
    onClose()
  }

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
      
      if (data?.Genre) {
        await fetchSimilarMovies(data.Genre.split(',')[0].trim())
      }
      
    } catch (error) {
      console.error('Error loading movie details:', error)
      setMovieDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchSimilarMovies = async (genre: string) => {
    try {
      const searchResults = await omdbService.searchMovies(genre)
      const similarMoviesData = searchResults
        .filter(movie => movie.imdbID !== movieId)
        .slice(0, 6)
        .map(movie => omdbService.convertToAppFormat(movie))
      
      setSimilarMovies(similarMoviesData)
    } catch (error) {
      console.error('Error fetching similar movies:', error)
      setSimilarMovies([])
    }
  }

  // 🔧 CORRECTION: Gestion du statut avec auto-suppression
  const handleStatusSelect = (status: MediaStatus) => {
    if (!movieDetail) return
    
    const consistentId = getConsistentId(movieId, movieDetail.imdbID)
    
    console.log('🔧 Status selection:')
    console.log('  Current selectedStatus:', selectedStatus)
    console.log('  New status:', status)
    console.log('  consistentId:', consistentId)
    
    if (selectedStatus === status) {
      // 🔧 NOUVEAU: Si même statut, désélectionner (suppression différée)
      console.log('🔄 Deselecting status - will remove on close')
      setSelectedStatus(null)
      setHasUnsavedChanges(true)
    } else {
      // Ajouter/Modifier le statut
      const movieItem = {
        id: consistentId,
        title: movieDetail.Title,
        image: movieDetail.Poster !== 'N/A' ? movieDetail.Poster : undefined,
        category: 'movies' as const,
        year: parseInt(movieDetail.Year) || new Date().getFullYear(),
        rating: movieDetail.imdbRating ? Number((parseFloat(movieDetail.imdbRating) / 2).toFixed(1)) : 0,
        director: movieDetail.Director
      }
      
      console.log('➕ Adding/updating movie:', movieItem)
      onAddToLibrary(movieItem, status)
      setSelectedStatus(status)
      setHasUnsavedChanges(true)
    }
  }

  // 🔧 Suppression immédiate via bouton
  const handleRemoveFromLibrary = () => {
    if (!onDeleteItem || !movieDetail) return
    
    const idToDelete = getConsistentId(movieId, movieDetail.imdbID)
    console.log('🗑️ Immediate removal from library:', idToDelete)
    
    onDeleteItem(idToDelete)
    setSelectedStatus(null)
    setHasUnsavedChanges(false) // Pas besoin d'auto-suppression
  }

  const getStatusLabel = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'Want to Watch'
      case 'currently-playing': return 'Watching'
      case 'completed': return 'Watched'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'bg-orange-500 hover:bg-orange-600 text-white'
      case 'currently-playing': return 'bg-green-500 hover:bg-green-600 text-white'
      case 'completed': return 'bg-blue-500 hover:bg-blue-600 text-white'
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-600 text-white'
      case 'dropped': return 'bg-red-500 hover:bg-red-600 text-white'
      default: return 'bg-gray-500 hover:bg-gray-600 text-white'
    }
  }

  const handleSubmitReview = () => {
    if (userRating > 0 && userReview.trim()) {
      onReviewSubmit({
        rating: userRating,
        review: userReview.trim()
      })
      
      setShowReviewBox(false)
      setUserReview('')
      setUserRating(0)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose() // 🔧 Utiliser handleClose au lieu de onClose
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : movieDetail ? (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <button
                onClick={handleClose} // 🔧 Utiliser handleClose
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 p-2 hover:bg-white/80 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="p-6 flex items-center space-x-4">
                <div className="w-20 h-28 rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-gray-100 flex-shrink-0">
                  {movieDetail.Poster !== 'N/A' ? (
                    <img
                      src={movieDetail.Poster}
                      alt={movieDetail.Title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🎬
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{movieDetail.Title}</h1>
                  
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-gray-600">{movieDetail.Year}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600">{movieDetail.Runtime}</span>
                    {movieDetail.Rated && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-medium">
                          {movieDetail.Rated}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {movieDetail.imdbRating && movieDetail.imdbRating !== 'N/A' && (
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={`${
                              star <= (parseFloat(movieDetail.imdbRating) / 2) ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {(parseFloat(movieDetail.imdbRating) / 2).toFixed(1)}/5 • IMDb {movieDetail.imdbRating}/10
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {/* 🔧 Action buttons avec logique complète */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex space-x-3 mb-4">
                  {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusSelect(status)}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all shadow-sm ${
                        selectedStatus === status
                          ? `${getStatusColor(status)} ring-2 ring-blue-300`
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {selectedStatus === status && (
                          <Check size={16} className="text-white" />
                        )}
                        <div>
                          <div className="text-sm font-semibold">{getStatusLabel(status)}</div>
                          <div className="text-xs opacity-80">
                            {movieStats[status].toLocaleString()} users
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* 🔧 Message d'état avec indication de suppression automatique */}
                {selectedStatus ? (
                  <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <span>✅ Added to your library as "{getStatusLabel(selectedStatus)}"</span>
                    <button 
                      onClick={handleRemoveFromLibrary}
                      className="text-red-600 hover:text-red-800 text-sm underline"
                    >
                      Remove from library
                    </button>
                  </div>
                ) : hasUnsavedChanges ? (
                  <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    ⚠️ No status selected - this movie will be removed from your library when you close this window
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    💡 Click a status to add this movie to your library
                  </div>
                )}

                {/* User rating - reste identique */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-gray-900 font-semibold mb-3">Rate this movie</h4>
                  <div className="flex items-center space-x-2 mb-3">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => {
                          setUserRating(rating)
                          setShowReviewBox(true)
                        }}
                        onMouseEnter={() => setHoverRating(rating)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={24}
                          className={`transition-colors ${
                            (hoverRating || userRating) >= rating
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    ))}
                    {userRating > 0 && (
                      <span className="text-gray-900 ml-2 font-medium">{userRating}/5</span>
                    )}
                  </div>
                  
                  {showReviewBox && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="text-sm text-gray-700 mb-2 block font-medium">Share your thoughts</label>
                      <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="What did you think about this movie?"
                        className="w-full h-20 px-3 py-2 bg-white text-gray-900 text-sm rounded-lg resize-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex space-x-2 mt-3">
                        <button 
                          onClick={handleSubmitReview}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Submit Review
                        </button>
                        <button 
                          onClick={() => {
                            setShowReviewBox(false)
                            setUserReview('')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Section - reste identique */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-gray-900 font-semibold mb-4">Recent Reviews</h3>
                <div className="flex space-x-4 overflow-x-auto pb-2">
                  {userReviews.map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm">👤</span>
                        </div>
                        <span className="text-gray-900 text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded-full font-medium">You</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {review.review || review.text}
                      </p>
                    </div>
                  ))}
                  
                  {imdbReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm">🎬</span>
                        </div>
                        <span className="text-gray-900 text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-full font-medium">IMDb</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs - reste identique */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                <div className="flex px-6">
                  {(['info', 'social', 'more'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 px-4 font-medium transition-colors relative ${
                        activeTab === tab
                          ? 'text-gray-900'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content - reste identique */}
              <div className="p-6">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-3">Plot</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-gray-700 leading-relaxed">
                          {movieDetail.Plot || 'No plot available.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Director</h5>
                        <p className="text-gray-600 text-sm">
                          {movieDetail.Director || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Release Date</h5>
                        <p className="text-gray-600 text-sm">
                          {movieDetail.Released || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Genre</h5>
                        <p className="text-gray-600 text-sm">
                          {movieDetail.Genre || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Runtime</h5>
                        <p className="text-gray-600 text-sm">
                          {movieDetail.Runtime || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-gray-900 font-semibold mb-3">Cast</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-gray-700 text-sm">
                          {movieDetail.Actors || 'Cast information not available.'}
                        </p>
                      </div>
                    </div>

                    {movieDetail.Awards && movieDetail.Awards !== 'N/A' && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-3">Awards</h4>
                        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                          <p className="text-yellow-800 text-sm">
                            {movieDetail.Awards}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'social' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Community Stats</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-orange-600">{movieStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-orange-700 font-medium">Want to Watch</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-green-600">{movieStats['currently-playing'].toLocaleString()}</div>
                          <div className="text-sm text-green-700 font-medium">Watching</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-blue-600">{movieStats['completed'].toLocaleString()}</div>
                          <div className="text-sm text-blue-700 font-medium">Watched</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Ratings</h4>
                      <div className="space-y-3">
                        {movieDetail.Ratings?.map((rating, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="font-medium text-gray-900">{rating.Source}</span>
                            <span className="text-gray-600">{rating.Value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">External Links</h4>
                      <div className="space-y-3">
                        <a 
                          href={`https://www.imdb.com/title/${movieDetail.imdbID}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on IMDb
                        </a>

                        {movieDetail.Website && movieDetail.Website !== 'N/A' && (
                          <a
                            href={movieDetail.Website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl text-gray-700 hover:text-gray-900 transition-colors border border-gray-200"
                          >
                            <Globe size={16} />
                            <span className="font-medium">Official Website</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>

                    {similarMovies.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">Similar Movies</h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {similarMovies.map((movie) => (
                            <div key={movie.id} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                              {movie.image && (
                                <img
                                  src={movie.image}
                                  alt={movie.title}
                                  className="w-full h-20 object-cover rounded-lg mb-2 border border-gray-100"
                                />
                              )}
                              <h5 className="text-sm font-medium text-gray-900 truncate mb-1" title={movie.title}>
                                {movie.title}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                <span className="text-xs text-gray-600">{movie.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Additional Information</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">Language:</span>
                            <span className="text-gray-600">
                              {movieDetail.Language || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">Country:</span>
                            <span className="text-gray-600">
                              {movieDetail.Country || 'N/A'}
                            </span>
                          </div>
                          {movieDetail.BoxOffice && movieDetail.BoxOffice !== 'N/A' && (
                            <div className="flex justify-between col-span-2">
                              <span className="font-medium text-gray-900">Box Office:</span>
                              <span className="text-gray-600 text-right">
                                {movieDetail.BoxOffice}
                              </span>
                            </div>
                          )}
                          {movieDetail.Production && movieDetail.Production !== 'N/A' && (
                            <div className="flex justify-between col-span-2">
                              <span className="font-medium text-gray-900">Production:</span>
                              <span className="text-gray-600 text-right">
                                {movieDetail.Production}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-600">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎬</span>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">Movie not found</p>
            <p className="text-sm">Unable to load movie details. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
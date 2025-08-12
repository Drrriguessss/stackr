'use client'
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Star, Play, Share, FileText } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'

// Hooks personnalisés
import { useMovieDetail } from '@/hooks/useMovieDetail'
import { useMovieReview } from '@/hooks/useMovieReview'

// Composants modulaires
import MovieHeader from './MovieDetail/MovieHeader'
import MovieInfoSection from './MovieDetail/MovieInfoSection'
import MediaCarousel from './MovieDetail/MediaCarousel'
import ReviewsSection from './MovieDetail/ReviewsSection'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'

// Lazy load des modales pour optimiser le chargement initial
const ShareWithFriendsModal = lazy(() => import('./ShareWithFriendsModal'))

interface MovieDetailModalV3OptimizedProps {
  isOpen: boolean
  onClose: () => void
  movieId: string
  mediaType?: 'movie' | 'tv'
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onMovieSelect?: (movieId: string) => void
}

// Types améliorés
interface MovieSheetData {
  dateWatched: string
  place: string
  accessMethod: string
  customTags: string[]
  friendsWatched: number[]
  personalRating: number
  personalReview: string
}

interface Friend {
  id: number
  name: string
  avatar?: string
  rating?: number
  hasReview?: boolean
  reviewText?: string
}

// Constantes externalisées
const MOCK_FRIENDS: Friend[] = [
  { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
  { id: 2, name: 'Sarah', avatar: '/api/placeholder/32/32' },
  { id: 3, name: 'Mike', avatar: '/api/placeholder/32/32' },
  { id: 4, name: 'Emma', avatar: '/api/placeholder/32/32' },
  { id: 5, name: 'David', avatar: '/api/placeholder/32/32' }
]

const FRIENDS_WHO_WATCHED: Friend[] = [
  { id: 2, name: 'Sarah', rating: 4, hasReview: true, reviewText: 'Amazing cinematography! The story was incredible.' },
  { id: 4, name: 'Emma', rating: 5, hasReview: true, reviewText: 'Best movie I\'ve seen this year!' },
  { id: 1, name: 'Alex', rating: 4, hasReview: true, reviewText: 'Great directing and acting. Highly recommend!' }
]

export default function MovieDetailModalV3Optimized({
  isOpen,
  onClose,
  movieId,
  mediaType = 'movie',
  onAddToLibrary,
  onDeleteItem,
  library,
  onMovieSelect
}: MovieDetailModalV3OptimizedProps) {
  // Hooks personnalisés pour la logique métier
  const { movieDetail, loading, error, mediaData, directorMovies, movieReviews } = useMovieDetail(movieId, mediaType)
  const reviewState = useMovieReview(movieId)
  
  // États locaux simplifiés
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'trailers'>('overview')
  const [showFullPlot, setShowFullPlot] = useState(false)
  
  // États pour les modales
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])
  const [showFriendsWhoWatchedModal, setShowFriendsWhoWatchedModal] = useState(false)
  const [showMovieSheet, setShowMovieSheet] = useState(false)
  const [movieSheetData, setMovieSheetData] = useState<MovieSheetData>({
    dateWatched: '',
    place: '',
    accessMethod: '',
    customTags: [],
    friendsWatched: [],
    personalRating: 0,
    personalReview: ''
  })

  // Effet pour synchroniser le statut avec la bibliothèque
  useEffect(() => {
    const libraryItem = library.find(item => item.id === movieId)
    setSelectedStatus(libraryItem?.status || null)
  }, [movieId, library])

  // Effet pour charger les données de la feuille de film
  useEffect(() => {
    if (movieId) {
      loadMovieSheetData()
    }
  }, [movieId])

  // Mémoisation des calculs coûteux
  const extractedRatings = useMemo(() => {
    if (!movieDetail) return null
    
    const ratings = {
      imdb: 'N/A',
      rottenTomatoes: 'N/A',
      metacritic: 'N/A',
      letterboxd: 'N/A'
    }

    if (movieDetail.imdbRating && movieDetail.imdbRating !== 'N/A') {
      ratings.imdb = `${parseFloat(movieDetail.imdbRating).toFixed(1)}/10`
      const imdbNum = parseFloat(movieDetail.imdbRating)
      ratings.letterboxd = `${(imdbNum / 2).toFixed(1)}/5`
    }

    if (movieDetail.Ratings) {
      movieDetail.Ratings.forEach(rating => {
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

    return ratings
  }, [movieDetail])

  // Callbacks optimisés avec useCallback
  const truncatePlot = useCallback((text: string, sentences: number = 3): string => {
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
  }, [])

  const loadMovieSheetData = useCallback(() => {
    try {
      const stored = localStorage.getItem(`movieSheet-${movieId}`)
      if (stored) {
        const data = JSON.parse(stored)
        setMovieSheetData(data)
        
        if (data.personalRating > 0) {
          reviewState.setUserRating(data.personalRating)
        }
        if (data.personalReview) {
          reviewState.setUserReview(data.personalReview)
        }
      }
    } catch (error) {
      console.error('Error loading movie sheet data:', error)
    }
  }, [movieId, reviewState])

  const saveMovieSheetData = useCallback(() => {
    try {
      localStorage.setItem(`movieSheet-${movieId}`, JSON.stringify(movieSheetData))
      
      if (movieSheetData.personalRating > 0) {
        reviewState.setUserRating(movieSheetData.personalRating)
      }
      if (movieSheetData.personalReview) {
        reviewState.setUserReview(movieSheetData.personalReview)
      }
      
      setShowMovieSheet(false)
    } catch (error) {
      console.error('Error saving movie sheet data:', error)
    }
  }, [movieId, movieSheetData, reviewState])

  const handleStatusSelect = useCallback(async (status: MediaStatus) => {
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
  }, [movieDetail, onAddToLibrary])

  // Rendu conditionnel
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

  if (error) {
    return (
      <div className="bg-[#0f0e17] min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading movie</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0f0e17] min-h-screen pb-20 font-system">
      {movieDetail ? (
        <>
          {/* Header avec image */}
          <MovieHeader
            headerImage={mediaData.headerImage}
            movieTitle={movieDetail.Title}
            onClose={onClose}
          />

          {/* Section d'informations du film */}
          <MovieInfoSection
            movieDetail={movieDetail}
            selectedStatus={selectedStatus}
            showStatusDropdown={showStatusDropdown}
            setShowStatusDropdown={setShowStatusDropdown}
            handleStatusSelect={handleStatusSelect}
            setShowShareWithFriendsModal={setShowShareWithFriendsModal}
            friendsWhoWatched={FRIENDS_WHO_WATCHED}
            setShowFriendsWhoWatchedModal={setShowFriendsWhoWatchedModal}
            setShowMovieSheet={setShowMovieSheet}
            userRating={reviewState.userRating}
            userReview={reviewState.userReview}
            setMovieSheetData={setMovieSheetData}
          />

          {/* Contenu principal avec tabs */}
          <div className="px-6 py-4 relative z-1">
            {/* Navigation par tabs */}
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

            {/* Contenu des tabs */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Your Review - Mobile optimized */}
                {reviewState.userRating > 0 && (
                  <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                    {/* Header plus compact */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold text-base">Your review</h3>
                      <button
                        onClick={() => reviewState.setShowReviewBox(true)}
                        className="text-white text-xs font-medium hover:text-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    
                    {/* Review content - Structure mobile */}
                    <div className="py-2">
                      {/* Avatar + Username */}
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                          U
                        </div>
                        <span className="text-white font-medium text-sm">You</span>
                      </div>
                      
                      {/* Rating + Privacy sur ligne séparée */}
                      <div className="flex items-center justify-between mb-3 ml-11">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={`${
                                star <= reviewState.userRating
                                  ? 'text-purple-400 fill-current'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs">({reviewState.reviewPrivacy})</span>
                      </div>
                      
                      {/* Review text pleine largeur */}
                      {reviewState.userReview && (
                        <div className="mb-2">
                          <p className="text-gray-300 text-xs leading-relaxed">
                            {reviewState.userReview}
                          </p>
                        </div>
                      )}
                      
                      {/* Likes */}
                      <div className="flex items-center space-x-1 text-gray-400">
                        <span className="text-xs">❤️</span>
                        <span className="text-xs">{Math.floor(Math.random() * 100) + 10} likes</span>
                      </div>
                    </div>
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
                {extractedRatings && movieDetail.imdbRating !== 'N/A' && (
                  <div className="flex space-x-8 mb-6">
                    {extractedRatings.imdb !== 'N/A' && (
                      <div>
                        <h4 className="text-white font-semibold mb-1">IMDb</h4>
                        <p className="text-gray-300">{extractedRatings.imdb}</p>
                      </div>
                    )}
                    {extractedRatings.rottenTomatoes !== 'N/A' && (
                      <div>
                        <h4 className="text-white font-semibold mb-1">Rotten Tomatoes</h4>
                        <p className="text-gray-300">{extractedRatings.rottenTomatoes}</p>
                      </div>
                    )}
                    {extractedRatings.letterboxd !== 'N/A' && (
                      <div>
                        <h4 className="text-white font-semibold mb-1">Letterboxd</h4>
                        <p className="text-gray-300">{extractedRatings.letterboxd}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Détails du film */}
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

                {/* Section des reviews */}
                <ReviewsSection reviews={movieReviews} />

                {/* Autres films du réalisateur */}
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
                <MediaCarousel
                  trailer={mediaData.trailer}
                  images={mediaData.images}
                  movieTitle={movieDetail.Title}
                  moviePoster={movieDetail.Poster}
                />
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

      {/* Modales - Lazy loaded */}
      <Suspense fallback={null}>
        {movieDetail && showShareWithFriendsModal && (
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
      </Suspense>

      {/* Modal de review (simplifié) */}
      {reviewState.showReviewBox && (
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
                      star <= (reviewState.hoverRating || reviewState.userRating) ? 'text-yellow-500 fill-current' : 'text-gray-600'
                    }`}
                    onClick={() => reviewState.setUserRating(star)}
                    onMouseEnter={() => reviewState.setHoverRating(star)}
                    onMouseLeave={() => reviewState.setHoverRating(0)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Review (optional)</p>
              <textarea
                value={reviewState.userReview}
                onChange={(e) => reviewState.setUserReview(e.target.value)}
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
                    checked={reviewState.reviewPrivacy === 'private'}
                    onChange={(e) => reviewState.setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-purple-600"
                  />
                  <span className="text-white">Private</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={reviewState.reviewPrivacy === 'public'}
                    onChange={(e) => reviewState.setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-purple-600"
                  />
                  <span className="text-white">Public</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => reviewState.setShowReviewBox(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => reviewState.submitReview(movieDetail, selectedStatus, onAddToLibrary)}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
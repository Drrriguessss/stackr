'use client'
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Star, Play, Share, FileText, X } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { streamingService, type AffiliateLink } from '@/services/streamingService'

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
  { id: 1, name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face&q=80' },
  { id: 2, name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=64&h=64&fit=crop&crop=face&q=80' },
  { id: 3, name: 'Mike', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face&q=80' },
  { id: 4, name: 'Emma', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face&q=80' },
  { id: 5, name: 'David', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face&q=80' }
]

// Liste vide par défaut - seules les vraies reviews apparaîtront
const FRIENDS_WHO_WATCHED: Friend[] = [
  // Cette liste sera vide jusqu'à ce que de vrais amis ajoutent des reviews/ratings
  // Exemple de structure pour de futurs amis :
  // { 
  //   id: 2, 
  //   name: 'Sarah', 
  //   rating: 4, 
  //   hasReview: true, 
  //   reviewText: 'Amazing cinematography! The story was incredible.', 
  //   avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=64&h=64&fit=crop&crop=face&q=80' 
  // }
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
  
  // États pour rating et review - LIKE MUSIC MODAL
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [userReview, setUserReview] = useState('')
  const [showInlineRating, setShowInlineRating] = useState(false)
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [expandedUserReview, setExpandedUserReview] = useState(false)
  // Photo de profil utilisateur - null si pas connecté, URL si connecté
  const isUserSignedIn = false // À remplacer par le vrai état de connexion
  const userAvatar = isUserSignedIn ? 'URL_DE_LA_VRAIE_PHOTO_DU_COMPTE' : null
  
  // États pour streaming providers
  const [streamingProviders, setStreamingProviders] = useState<AffiliateLink[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  
  // États pour movie sheet - LIKE MUSIC MODAL
  // (showMovieSheet et movieSheetData déclarés plus bas avec le bon type)
  
  // États pour Your Review interactions Instagram-like
  const [userReviewData, setUserReviewData] = useState({
    isLiked: false,
    likesCount: 0,
    commentsCount: 0,
    comments: [] as any[]
  })
  
  // États pour modales et commentaires
  const [showUserReviewComments, setShowUserReviewComments] = useState(false)
  const [showShareUserReviewModal, setShowShareUserReviewModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  
  // États pour les modales
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])
  const [showFriendsWhoWatchedModal, setShowFriendsWhoWatchedModal] = useState(false)
  const [showMovieSheet, setShowMovieSheet] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [movieSheetData, setMovieSheetData] = useState({
    dateWatched: '',
    location: '',
    watchedWith: '',
    format: 'theater',
    personalRating: 0,
    personalReview: ''
  })

  // Effet pour synchroniser le statut avec la bibliothèque - LIKE MUSIC MODAL
  useEffect(() => {
    if (isOpen && movieId) {
      console.log('🔄 [MOVIE MODAL] Synchronizing status with library for movieId:', movieId)
      
      // Check library status
      if (library && library.length > 0) {
        const libraryItem = library.find(item => item.id === movieId)
        console.log('🔍 [MOVIE MODAL] Found library item:', libraryItem)
        const newStatus = libraryItem?.status || null
        console.log('🔄 [MOVIE MODAL] Setting status to:', newStatus)
        setSelectedStatus(newStatus)
      } else {
        setSelectedStatus(null)
      }
    }
  }, [isOpen, movieId, library])

  // Effet pour charger les données de la feuille de film
  useEffect(() => {
    if (movieId) {
      loadMovieSheetData()
    }
  }, [movieId])

  // Load saved rating, review and interactions from localStorage
  useEffect(() => {
    if (movieId) {
      const savedData = localStorage.getItem(`movie-review-${movieId}`)
      if (savedData) {
        const { rating, review, privacy, interactions } = JSON.parse(savedData)
        setUserRating(rating || 0)
        setUserReview(review || '')
        setReviewPrivacy(privacy || 'private')
        
        // Load interactions data
        if (interactions) {
          setUserReviewData({
            isLiked: interactions.isLiked || false,
            likesCount: interactions.likesCount || 0,
            commentsCount: interactions.commentsCount || 0,
            comments: interactions.comments || []
          })
        }
      } else {
        // Reset when switching to a new movie
        setUserRating(0)
        setUserReview('')
        setReviewPrivacy('private')
        setShowInlineRating(false)
        setUserReviewData({
          isLiked: false,
          likesCount: 0,
          commentsCount: 0,
          comments: []
        })
      }
    }
  }, [movieId])

  // Cleanup on modal close - LIKE MUSIC MODAL
  useEffect(() => {
    if (!isOpen) {
      console.log('🎬 [Cleanup] Modal closed, resetting all states')
      
      // Reset all states when modal closes
      setSelectedStatus(null)
      setShowStatusDropdown(false)
      setShowInlineRating(false)
      setActiveTab('overview')
      setUserRating(0)
      setHoverRating(0)
      setUserReview('')
      setReviewPrivacy('private')
      setExpandedUserReview(false)
      setReviewSaved(false)
      setShowMovieSheet(false)
      setShowShareModal(false)
      setShowShareWithFriendsModal(false)
      setShowFriendsModal(false)
      setShowFriendsWhoWatchedModal(false)
      setStreamingProviders([])
      setLoadingProviders(false)
    }
  }, [isOpen])

  // Load streaming providers
  useEffect(() => {
    if (movieId && movieDetail?.imdbID) {
      const loadStreamingProviders = async () => {
        setLoadingProviders(true)
        try {
          // Use movieId directly - the service will handle IMDB/TMDB conversion
          console.log('🎬 Loading streaming providers for movieId:', movieId)
          const cleanMovieId = movieId.replace('movie-', '')
          const providers = await streamingService.getMovieProviders(cleanMovieId, 'US', movieDetail?.Title)
          console.log('🎬 Streaming providers loaded:', providers)
          setStreamingProviders(providers)
        } catch (error) {
          console.error('Error loading streaming providers:', error)
          setStreamingProviders([])
        } finally {
          setLoadingProviders(false)
        }
      }
      
      loadStreamingProviders()
    }
  }, [movieId, movieDetail?.imdbID])

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

  // Handle status selection - MATCHED WITH MUSIC MODAL PATTERN
  const handleStatusSelect = useCallback(async (status: MediaStatus | null) => {
    if (!movieDetail) return
    
    // Handle remove from library
    if (status === null || status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(movieDetail.imdbID)
      }
      setSelectedStatus(null)
      setShowStatusDropdown(false)
      return
    }
    
    // Prepare movie data for library
    const movieData = {
      id: movieDetail.imdbID,
      title: movieDetail.Title,
      category: 'movies' as const,
      image: movieDetail.Poster,
      year: parseInt(movieDetail.Year),
      rating: parseFloat(movieDetail.imdbRating) || 0,
      director: movieDetail.Director,
      genre: movieDetail.Genre,
      runtime: movieDetail.Runtime,
      actors: movieDetail.Actors,
      plot: movieDetail.Plot,
      language: movieDetail.Language,
      country: movieDetail.Country,
      awards: movieDetail.Awards,
      type: movieDetail.Type
    }
    
    try {
      // Add/update item in library
      await onAddToLibrary(movieData, status)
      setSelectedStatus(status)
      setShowStatusDropdown(false)
      
      // Show friends modal for social statuses (like music modal)
      if (status === 'watched') {
        // Optional: show a rating modal or friends activity
        setShowInlineRating(true)
      }
      
      console.log('🎬 [MOVIE MODAL] Successfully updated library with status:', status)
    } catch (error) {
      console.error('🎬 [ERROR] Failed to update library:', error)
    }
  }, [movieDetail, onAddToLibrary, onDeleteItem])


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
                {/* Your Review - Style Instagram (shown if user has rating but review box is closed) */}
                {userRating > 0 && !showInlineRating && (
                  <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                    {/* Header: Title + Privacy + Edit */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-white font-semibold text-base">Your review</h3>
                        <span className="text-gray-400 text-xs">({reviewPrivacy})</span>
                      </div>
                      <button
                        onClick={() => setShowInlineRating(true)}
                        className="text-white text-xs font-medium hover:text-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    
                    {/* Fine ligne blanche */}
                    <div className="border-t border-white/10 mb-4"></div>
                    
                    {/* Review content */}
                    <div className="py-2">
                      {/* Avatar + You + Rating */}
                      <div className="flex items-center space-x-3 mb-2">
                        {userAvatar ? (
                          <img 
                            src={userAvatar} 
                            alt="Your avatar" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                            U
                          </div>
                        )}
                        <div className="flex items-center space-x-2 flex-1">
                          <span className="text-white font-medium text-sm">You</span>
                          {/* Rating en violet */}
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                className={`${
                                  star <= userRating
                                    ? 'text-purple-400 fill-current'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Review text */}
                      {userReview && (
                        <div className="mb-3 ml-11">
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {expandedUserReview 
                              ? userReview 
                              : userReview.length > 60 ? userReview.substring(0, 60) + '...' : userReview
                            }
                            {userReview.length > 60 && (
                              <button
                                onClick={() => setExpandedUserReview(!expandedUserReview)}
                                className="text-gray-400 hover:text-gray-300 ml-1 text-xs"
                              >
                                {expandedUserReview ? '...less' : '...more'}
                              </button>
                            )}
                          </p>
                        </div>
                      )}
                      
                      {/* Actions Instagram style avec compteurs */}
                      <div className="ml-11">
                        <div className="flex items-center space-x-4">
                          {/* Like - Heart outline avec compteur */}
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={() => {
                                const newData = {
                                  ...userReviewData,
                                  isLiked: !userReviewData.isLiked,
                                  likesCount: userReviewData.isLiked ? userReviewData.likesCount - 1 : userReviewData.likesCount + 1
                                }
                                setUserReviewData(newData)
                                
                                // Save to localStorage
                                const existingData = localStorage.getItem(`movie-review-${movieId}`)
                                const data = existingData ? JSON.parse(existingData) : {}
                                localStorage.setItem(`movie-review-${movieId}`, JSON.stringify({
                                  ...data,
                                  interactions: newData,
                                  timestamp: new Date().toISOString()
                                }))
                              }}
                              className={`transition-colors ${userReviewData.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-300'}`}
                            >
                              {userReviewData.isLiked ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                              )}
                            </button>
                            {userReviewData.likesCount > 0 && (
                              <span className="text-gray-300 text-xs">{userReviewData.likesCount}</span>
                            )}
                          </div>
                          
                          {/* Comment - Chat bubble avec compteur */}
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={() => setShowUserReviewComments(true)}
                              className="text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                              </svg>
                            </button>
                            {userReviewData.commentsCount > 0 && (
                              <span className="text-gray-300 text-xs">{userReviewData.commentsCount}</span>
                            )}
                          </div>
                          
                          {/* Share - Send arrow */}
                          <button 
                            onClick={() => setShowShareUserReviewModal(true)}
                            className="text-gray-400 hover:text-gray-300 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M22 2L11 13"/>
                              <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ratings - MOVED BEFORE DESCRIPTION */}
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

                {/* Rate this movie section - EXACTLY LIKE MUSIC MODAL */}
                <div className="mt-4">
                  <div className="text-gray-400 text-sm mb-1">Rate this {mediaType === 'tv' ? 'TV show' : 'movie'}</div>
                  
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={async () => {
                          // Allow editing: if same rating is clicked, reset to 0
                          const newRating = userRating === star ? 0 : star
                          setUserRating(newRating)
                          
                          // Open review box when rating (but not when clearing)
                          if (newRating > 0) {
                            setShowInlineRating(true)
                          } else {
                            setShowInlineRating(false)
                            // Clear saved data when rating is reset to 0
                            localStorage.removeItem(`movie-review-${movieId}`)
                            setUserReview('')
                          }
                          
                          // Save rating immediately to localStorage
                          if (newRating > 0) {
                            const existingData = localStorage.getItem(`movie-review-${movieId}`)
                            const data = existingData ? JSON.parse(existingData) : {}
                            localStorage.setItem(`movie-review-${movieId}`, JSON.stringify({
                              ...data,
                              rating: newRating,
                              interactions: userReviewData,
                              timestamp: new Date().toISOString()
                            }))
                          }
                        }}
                        className="transition-all duration-200 hover:scale-110"
                      >
                        <Star
                          size={18}
                          className={`${
                            star <= (hoverRating || userRating)
                              ? 'text-purple-400 fill-purple-400 drop-shadow-sm'
                              : 'text-gray-600 hover:text-gray-500'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                    {userRating > 0 && (
                      <span className="text-gray-400 text-sm ml-2">{userRating}/5</span>
                    )}
                  </div>
                </div>

                {/* Review section - EXACTLY LIKE MUSIC MODAL - ONLY if rating > 0 */}
                {showInlineRating && userRating > 0 && (
                  <div className="mb-6 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] border border-gray-700/50 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">Share your thoughts</h3>
                    
                    {/* Review Text Area */}
                    <div className="space-y-3">
                      <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="Write your review... (optional)"
                        className="w-full bg-black/20 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                        rows={3}
                      />
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-white/70 text-sm">Review privacy:</span>
                          <div className="flex bg-black/30 rounded-lg p-1">
                            <button
                              onClick={() => setReviewPrivacy('private')}
                              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                                reviewPrivacy === 'private'
                                  ? 'bg-purple-600 text-white'
                                  : 'text-white/60 hover:text-white/80'
                              }`}
                            >
                              Private
                            </button>
                            <button
                              onClick={() => setReviewPrivacy('public')}
                              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                                reviewPrivacy === 'public'
                                  ? 'bg-purple-600 text-white'
                                  : 'text-white/60 hover:text-white/80'
                              }`}
                            >
                              Public
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!userReview.trim() ? (
                            <button
                              onClick={() => {
                                // Skip: close the review box but keep the rating saved
                                setShowInlineRating(false)
                                // Save rating without review text
                                const reviewData = {
                                  rating: userRating,
                                  review: '',
                                  privacy: reviewPrivacy,
                                  interactions: userReviewData,
                                  timestamp: new Date().toISOString()
                                }
                                localStorage.setItem(`movie-review-${movieId}`, JSON.stringify(reviewData))
                              }}
                              className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-md hover:bg-gray-600 transition-colors"
                            >
                              Skip
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                // Save review to localStorage
                                const reviewData = {
                                  rating: userRating,
                                  review: userReview,
                                  privacy: reviewPrivacy,
                                  interactions: userReviewData,
                                  timestamp: new Date().toISOString()
                                }
                                localStorage.setItem(`movie-review-${movieId}`, JSON.stringify(reviewData))
                                console.log('Review saved:', reviewData)
                                setShowInlineRating(false)
                              }}
                              className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
                            >
                              Save Review
                            </button>
                          )}
                        </div>
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
                  {movieDetail.Awards && movieDetail.Awards !== 'N/A' && (
                    <div className="text-sm flex">
                      <span className="text-gray-400 w-24 flex-shrink-0">Awards:</span>
                      <span className="text-white">{movieDetail.Awards}</span>
                    </div>
                  )}
                </div>

                {/* Customize movie sheet - LIKE MUSIC MODAL */}
                <div className="mb-4">
                  <button 
                    onClick={() => setShowMovieSheet(true)}
                    className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <FileText size={14} />
                    <span>Customize movie sheet</span>
                  </button>
                </div>

                {/* Where to Watch Section */}
                {(streamingProviders.length > 0 || loadingProviders) && (
                  <div className="space-y-2">
                    {loadingProviders ? (
                      <div className="text-sm flex">
                        <span className="text-gray-400 w-24 flex-shrink-0">Streaming:</span>
                        <span className="text-white">Loading...</span>
                      </div>
                    ) : (
                      <>
                        {/* Streaming Services */}
                        {streamingProviders.filter(p => p.type === 'streaming').length > 0 && (
                          <div className="text-sm flex">
                            <span className="text-gray-400 w-24 flex-shrink-0">Streaming:</span>
                            <div className="flex flex-wrap gap-2">
                              {streamingProviders
                                .filter(p => p.type === 'streaming')
                                .slice(0, 3)
                                .map((provider, index) => (
                                  <span key={provider.provider}>
                                    <a
                                      href={provider.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      {provider.provider}
                                    </a>
                                    {index < streamingProviders.filter(p => p.type === 'streaming').slice(0, 3).length - 1 && (
                                      <span className="text-gray-400">, </span>
                                    )}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Rental Services */}
                        {streamingProviders.filter(p => p.type === 'rent').length > 0 && (
                          <div className="text-sm flex">
                            <span className="text-gray-400 w-24 flex-shrink-0">Rent:</span>
                            <div className="flex flex-wrap gap-2">
                              {streamingProviders
                                .filter(p => p.type === 'rent')
                                .slice(0, 3)
                                .map((provider, index) => (
                                  <span key={provider.provider}>
                                    <a
                                      href={provider.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      {provider.provider}
                                    </a>
                                    {index < streamingProviders.filter(p => p.type === 'rent').slice(0, 3).length - 1 && (
                                      <span className="text-gray-400">, </span>
                                    )}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Purchase Services */}
                        {streamingProviders.filter(p => p.type === 'buy').length > 0 && (
                          <div className="text-sm flex">
                            <span className="text-gray-400 w-24 flex-shrink-0">Buy:</span>
                            <div className="flex flex-wrap gap-2">
                              {streamingProviders
                                .filter(p => p.type === 'buy')
                                .slice(0, 3)
                                .map((provider, index) => (
                                  <span key={provider.provider}>
                                    <a
                                      href={provider.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      {provider.provider}
                                    </a>
                                    {index < streamingProviders.filter(p => p.type === 'buy').slice(0, 3).length - 1 && (
                                      <span className="text-gray-400">, </span>
                                    )}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Physical Media & Merchandise Section */}
                {movieDetail && (
                  <div className="space-y-2">
                    {streamingService.getMovieMerchandiseLinks(movieDetail.Title, movieDetail.Year).map((link) => (
                      <div key={link.name} className="text-sm flex">
                        <span className="text-gray-400 w-24 flex-shrink-0">{link.name}:</span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300"
                        >
                          {link.provider}
                        </a>
                      </div>
                    ))}
                  </div>
                )}

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

      {/* Comments Modal - Style Instagram */}
      {showUserReviewComments && (
        <div className="fixed inset-0 z-60 bg-black/50">
          {/* Overlay cliquable pour fermer */}
          <div 
            className="absolute inset-0" 
            onClick={() => setShowUserReviewComments(false)}
          />
          
          {/* Modal sliding from bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center p-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold text-center">Comments</h3>
            </div>
            
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {userReviewData.comments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">No comments yet</div>
                  <div className="text-gray-500 text-xs mt-1">Be the first to comment</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userReviewData.comments.map((comment: any) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                        {comment.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl px-3 py-2">
                          <div className="text-white text-sm font-medium">{comment.username}</div>
                          <div className="text-gray-300 text-sm">{comment.text}</div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 ml-3">
                          <span className="text-gray-500 text-xs">
                            {(() => {
                              const now = new Date()
                              const then = new Date(comment.timestamp)
                              const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
                              if (seconds < 60) return 'just now'
                              if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
                              if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
                              return then.toLocaleDateString()
                            })()}
                          </span>
                          <button className="text-gray-500 text-xs font-medium">Like</button>
                          <button className="text-gray-500 text-xs font-medium">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Comment input */}
            <div className="border-t border-gray-700 p-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt="Your avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-600 to-indigo-700 flex items-center justify-center text-xs font-medium text-white">
                      U
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      const comment = {
                        id: Date.now().toString(),
                        userId: 'current-user',
                        username: 'You',
                        text: newComment,
                        timestamp: new Date().toISOString(),
                        likes: 0,
                        isLiked: false
                      }
                      const newData = {
                        ...userReviewData,
                        comments: [...userReviewData.comments, comment],
                        commentsCount: userReviewData.commentsCount + 1
                      }
                      setUserReviewData(newData)
                      setNewComment('')
                      
                      // Save to localStorage
                      const existingData = localStorage.getItem(`movie-review-${movieId}`)
                      const data = existingData ? JSON.parse(existingData) : {}
                      localStorage.setItem(`movie-review-${movieId}`, JSON.stringify({
                        ...data,
                        interactions: newData,
                        timestamp: new Date().toISOString()
                      }))
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {newComment.trim() && (
                  <button
                    onClick={() => {
                      const comment = {
                        id: Date.now().toString(),
                        userId: 'current-user',
                        username: 'You',
                        text: newComment,
                        timestamp: new Date().toISOString(),
                        likes: 0,
                        isLiked: false
                      }
                      const newData = {
                        ...userReviewData,
                        comments: [...userReviewData.comments, comment],
                        commentsCount: userReviewData.commentsCount + 1
                      }
                      setUserReviewData(newData)
                      setNewComment('')
                      
                      // Save to localStorage
                      const existingData = localStorage.getItem(`movie-review-${movieId}`)
                      const data = existingData ? JSON.parse(existingData) : {}
                      localStorage.setItem(`movie-review-${movieId}`, JSON.stringify({
                        ...data,
                        interactions: newData,
                        timestamp: new Date().toISOString()
                      }))
                    }}
                    className="text-purple-400 font-medium text-sm"
                  >
                    Post
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Review Modal */}
      {showShareUserReviewModal && movieDetail && (
        <Suspense fallback={null}>
          <ShareWithFriendsModal
            isOpen={showShareUserReviewModal}
            onClose={() => setShowShareUserReviewModal(false)}
            item={{
              id: `review-${movieDetail.imdbID}`,
              type: 'review',
              title: `Review of ${movieDetail.Title}`,
              image: movieDetail.Poster,
              description: userReview || `${userRating}/5 stars`
            }}
          />
        </Suspense>
      )}

      {/* Friends Who Watched Modal */}
      {showFriendsWhoWatchedModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm">
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center p-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-semibold text-lg">Friends who watched</h3>
                <button
                  onClick={() => setShowFriendsWhoWatchedModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">{FRIENDS_WHO_WATCHED.length} friends watched this movie</p>
            </div>
            
            {/* Friends list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="space-y-4">
                {FRIENDS_WHO_WATCHED.map((friend) => (
                  <div key={friend.id} className="bg-gray-800/50 rounded-lg p-4">
                    {/* Friend header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-medium text-white">
                            {friend.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{friend.name}</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= friend.rating 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-600'
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-gray-400 text-sm ml-1">{friend.rating}/5</span>
                          </div>
                        </div>
                        <div className="text-gray-500 text-xs">2 days ago</div>
                      </div>
                    </div>
                    
                    {/* Friend review */}
                    {friend.hasReview && friend.reviewText && (
                      <div className="bg-gray-900/50 rounded-lg p-3 mt-2">
                        <p className="text-gray-300 text-sm leading-relaxed">
                          "{friend.reviewText}"
                        </p>
                      </div>
                    )}
                    
                    {/* No review case */}
                    {!friend.hasReview && (
                      <div className="text-gray-500 text-sm italic">
                        {friend.name} rated this movie but didn't write a review.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Overlay to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setShowFriendsWhoWatchedModal(false)}
          />
        </div>
      )}

      {/* Movie Sheet Modal - LIKE MUSIC MODAL */}
      {showMovieSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Movie Sheet</h3>
              <button
                onClick={() => setShowMovieSheet(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-gray-400 text-sm mb-1">Date watched</label>
                <div
                  onClick={() => setShowDatePicker(true)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600 hover:border-gray-500 cursor-pointer flex items-center justify-between"
                >
                  <span className={movieSheetData.dateWatched ? 'text-white' : 'text-gray-400'}>
                    {movieSheetData.dateWatched 
                      ? new Date(movieSheetData.dateWatched).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Select date'
                    }
                  </span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Modern Calendar Picker */}
                {showDatePicker && (
                  <div className={`absolute top-0 left-0 z-10 bg-white border border-gray-300 rounded-lg shadow-2xl overflow-hidden ${
                    showMonthPicker ? 'w-80 h-48' : showYearPicker ? 'w-80 h-96' : 'w-80 h-auto'
                  }`}>
                    {/* Calendar Header */}
                    <div className="bg-gray-50 border-b border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => {
                            const newDate = new Date(calendarDate)
                            newDate.setMonth(newDate.getMonth() - 1)
                            setCalendarDate(newDate)
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            className="px-3 py-1 hover:bg-gray-200 rounded text-gray-800 font-medium text-sm flex items-center"
                          >
                            {calendarDate.toLocaleDateString('en-US', { month: 'long' })}
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowYearPicker(!showYearPicker)}
                            className="px-3 py-1 hover:bg-gray-200 rounded text-gray-800 font-medium text-sm flex items-center"
                          >
                            {calendarDate.getFullYear()}
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        
                      </div>
                      
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded text-gray-500"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Month Picker Overlay */}
                    {showMonthPicker && (
                      <div className="absolute inset-0 bg-white z-20 p-4">
                        <div className="grid grid-cols-4 gap-3">
                          {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((month, index) => (
                            <button
                              key={month}
                              onClick={() => {
                                const newDate = new Date(calendarDate)
                                newDate.setMonth(index)
                                setCalendarDate(newDate)
                                setShowMonthPicker(false)
                              }}
                              className={`py-3 px-2 rounded-lg text-sm font-bold transition-colors ${
                                calendarDate.getMonth() === index
                                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                                  : 'hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Year Picker Overlay */}
                    {showYearPicker && (
                      <div className="absolute inset-0 bg-white z-20 p-4 flex flex-col">
                        <div className="text-center mb-3">
                          <h4 className="text-gray-800 font-medium">Select Year</h4>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <div className="grid grid-cols-4 gap-2 pb-4">
                            {Array.from({length: 80}, (_, i) => new Date().getFullYear() - i).map((year) => (
                              <button
                                key={year}
                                onClick={() => {
                                  const newDate = new Date(calendarDate)
                                  newDate.setFullYear(year)
                                  setCalendarDate(newDate)
                                  setShowYearPicker(false)
                                }}
                                className={`py-2 px-1 rounded text-xs font-bold transition-colors ${
                                  calendarDate.getFullYear() === year
                                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                                    : 'hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                {year}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Calendar Grid */}
                    {!showMonthPicker && !showYearPicker && (
                      <div className="p-3">
                        {/* Days of week header */}
                        <div className="grid grid-cols-7 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
                              {day}
                            </div>
                          ))}
                        </div>
                        
                        {/* Calendar days grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const year = calendarDate.getFullYear()
                            const month = calendarDate.getMonth()
                            const firstDay = new Date(year, month, 1)
                            const lastDay = new Date(year, month + 1, 0)
                            const startDate = new Date(firstDay)
                            startDate.setDate(startDate.getDate() - firstDay.getDay())
                            
                            const days = []
                            const today = new Date()
                            const selectedDate = movieSheetData.dateWatched ? new Date(movieSheetData.dateWatched) : null
                            
                            for (let i = 0; i < 42; i++) {
                              const currentDate = new Date(startDate)
                              currentDate.setDate(startDate.getDate() + i)
                              
                              const isCurrentMonth = currentDate.getMonth() === month
                              const isToday = currentDate.toDateString() === today.toDateString()
                              const isSelected = selectedDate && currentDate.toDateString() === selectedDate.toDateString()
                              const isFuture = currentDate > today
                              
                              days.push(
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (!isFuture) {
                                      setMovieSheetData({
                                        ...movieSheetData, 
                                        dateWatched: currentDate.toISOString().split('T')[0]
                                      })
                                      setShowDatePicker(false)
                                    }
                                  }}
                                  disabled={isFuture}
                                  className={`p-2 text-sm font-medium rounded transition-colors ${
                                    isFuture
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-blue-500 text-white'
                                      : isToday
                                      ? 'bg-blue-100 text-blue-600 font-bold'
                                      : isCurrentMonth
                                      ? 'text-gray-800 hover:bg-gray-100'
                                      : 'text-gray-400 hover:bg-gray-50'
                                  }`}
                                >
                                  {currentDate.getDate()}
                                </button>
                              )
                            }
                            
                            return days
                          })()}
                        </div>
                        
                        {/* Footer actions */}
                        <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              const today = new Date()
                              setMovieSheetData({...movieSheetData, dateWatched: today.toISOString().split('T')[0]})
                              setCalendarDate(today)
                            }}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Today
                          </button>
                          <button
                            onClick={() => {
                              setMovieSheetData({...movieSheetData, dateWatched: ''})
                              setShowDatePicker(false)
                            }}
                            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Location</label>
                <input
                  type="text"
                  value={movieSheetData.location}
                  onChange={(e) => setMovieSheetData({...movieSheetData, location: e.target.value})}
                  placeholder="Where did you watch this?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Watched with</label>
                <input
                  type="text"
                  value={movieSheetData.watchedWith}
                  onChange={(e) => setMovieSheetData({...movieSheetData, watchedWith: e.target.value})}
                  placeholder="Who did you watch this with?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Format</label>
                <select
                  value={movieSheetData.format}
                  onChange={(e) => setMovieSheetData({...movieSheetData, format: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="theater">Theater</option>
                  <option value="streaming">Streaming</option>
                  <option value="blu-ray">Blu-ray</option>
                  <option value="dvd">DVD</option>
                  <option value="digital">Digital download</option>
                  <option value="tv">TV broadcast</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Private rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={`cursor-pointer transition-colors ${
                        star <= movieSheetData.personalRating ? 'text-yellow-500 fill-current' : 'text-gray-600'
                      }`}
                      onClick={() => setMovieSheetData({...movieSheetData, personalRating: star})}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Private review</label>
                <textarea
                  value={movieSheetData.personalReview}
                  onChange={(e) => setMovieSheetData({...movieSheetData, personalReview: e.target.value})}
                  placeholder="Write your review..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMovieSheet(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveMovieSheetData()
                  setShowMovieSheet(false)
                }}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
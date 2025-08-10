'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share, Calendar, DollarSign, Tag, Users, Check, FileText, Image, Video, Info, MessageCircle } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { newTrailerService, type ValidatedTrailer } from '@/services/newTrailerService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import { realGameReviewsService, type RealGameReview } from '@/services/realGameReviewsService'
import { fetchWithCache, apiCache } from '@/utils/apiCache'
import { rawgService, type RAWGGame } from '@/services/rawgService'
import ShareWithFriendsModal from './ShareWithFriendsModal'

interface GameDetailDarkV2Props {
  isOpen: boolean
  onClose: () => void
  gameId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  googleReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface GameDetail {
  id: number
  name: string
  background_image: string
  description_raw: string
  rating: number
  rating_count: number
  released: string
  platforms: { platform: { name: string } }[]
  developers: { name: string }[]
  publishers: { name: string }[]
  genres: { name: string }[]
  tags: { name: string }[]
  website: string
  stores: { store: { name: string }, url: string }[]
  screenshots: { image: string }[]
  metacritic: number
  esrb_rating: { name: string }
  parent_platforms: { platform: { name: string } }[]
}

type TabType = 'overview' | 'trailers'

export default function GameDetailDarkV2({ 
  isOpen, 
  onClose, 
  gameId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  googleReviews, 
  onReviewSubmit 
}: GameDetailDarkV2Props) {
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [userReview, setUserReview] = useState('')
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [similarGames, setSimilarGames] = useState<any[]>([])
  const [developerGames, setDeveloperGames] = useState<any[]>([])
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingDeveloper, setLoadingDeveloper] = useState(false)
  const [similarGamesLoaded, setSimilarGamesLoaded] = useState(false)
  const [developerGamesLoaded, setDeveloperGamesLoaded] = useState(false)
  const [showSimilarGames, setShowSimilarGames] = useState(false)
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const [showPublisher, setShowPublisher] = useState(false)
  const [gameTrailer, setGameTrailer] = useState<ValidatedTrailer | null>(null)
  const [trailerLoading, setTrailerLoading] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [realGameReviews, setRealGameReviews] = useState<RealGameReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [userPublicReviews, setUserPublicReviews] = useState<UserReview[]>([])
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [gameImages, setGameImages] = useState<string[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // New states for enhanced functionality
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<any[]>([])
  const [showGameSheet, setShowGameSheet] = useState(false)
  const [showFriendsWhoPlayedModal, setShowFriendsWhoPlayedModal] = useState(false)
  const [gameSheetData, setGameSheetData] = useState({
    datePlayed: '',
    platform: '',
    accessMethod: '',
    purchasePrice: '',
    customTags: [] as string[],
    friendsPlayed: [] as any[],
    personalRating: 0,
    personalReview: ''
  })

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''

  // Mock friends data
  const mockFriends = [
    { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Sarah', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Mike', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Emma', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'David', avatar: '/api/placeholder/32/32' },
    { id: 6, name: 'Lisa', avatar: '/api/placeholder/32/32' },
    { id: 7, name: 'Tom', avatar: '/api/placeholder/32/32' }
  ]

  // Mock friends who played this game
  const friendsWhoPlayed = [
    { id: 2, name: 'Sarah', rating: 4, hasReview: true, reviewText: 'Amazing gameplay! The story was incredible.' },
    { id: 4, name: 'Emma', rating: 5, hasReview: true, reviewText: 'Best game I\'ve played this year!' },
    { id: 6, name: 'Lisa', rating: 3, hasReview: false, reviewText: null },
    { id: 1, name: 'Alex', rating: 4, hasReview: true, reviewText: 'Great graphics and mechanics. Highly recommend!' }
  ]

  const statusOptions: { key: MediaStatus, label: string }[] = [
    { key: 'want-to-play', label: 'Want to play' },
    { key: 'playing', label: 'Playing' },
    { key: 'completed', label: 'Completed' },
    { key: 'paused', label: 'Paused' },
    { key: 'dropped', label: 'Dropped' }
  ]

  useEffect(() => {
    if (isOpen && gameId) {
      fetchGameDetail()
      fetchGameTrailer()
      fetchGameImages()
      fetchRealGameReviews()
      fetchUserPublicReviews()
      checkCurrentUserReview()
    }
  }, [isOpen, gameId])

  useEffect(() => {
    const libraryItem = library.find(item => 
      item.id === gameId || item.id === `game-${gameId}`
    )
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
      if (libraryItem.userRating) {
        setUserRating(libraryItem.userRating)
      }
      if (libraryItem.notes) {
        setUserReview(libraryItem.notes)
      }
    } else {
      setSelectedStatus(null)
      setUserRating(0)
      setUserReview('')
    }
  }, [gameId, library])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(event.target as Node)) {
        setShowLibraryDropdown(false)
      }
    }

    if (showLibraryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLibraryDropdown])

  const fetchGameDetail = async () => {
    setLoading(true)
    try {
      const data = await fetchWithCache(
        `https://api.rawg.io/api/games/${gameId}?key=${RAWG_API_KEY}`,
        `game-detail-${gameId}`
      )
      
      if (!data || data.error) throw new Error('Failed to fetch game details')
      
      setGameDetail(data)
      console.log('🎮 Game detail loaded:', data.name)
    } catch (error) {
      console.error('Error fetching game details:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGameTrailer = async () => {
    if (!gameDetail?.name) return
    
    setTrailerLoading(true)
    try {
      const trailer = await newTrailerService.getGameTrailer(gameDetail.name)
      setGameTrailer(trailer)
    } catch (error) {
      console.error('Error fetching game trailer:', error)
    } finally {
      setTrailerLoading(false)
    }
  }

  const fetchGameImages = async () => {
    setImagesLoading(true)
    try {
      const response = await fetch(
        `https://api.rawg.io/api/games/${gameId}/screenshots?key=${RAWG_API_KEY}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch game images')
      
      const data = await response.json()
      const images = data.results?.map((img: any) => img.image) || []
      setGameImages(images)
    } catch (error) {
      console.error('Error fetching game images:', error)
    } finally {
      setImagesLoading(false)
    }
  }

  const fetchRealGameReviews = async () => {
    if (!gameDetail?.name) return
    
    setReviewsLoading(true)
    try {
      const reviews = await realGameReviewsService.getGameReviews(gameDetail.name)
      setRealGameReviews(reviews)
    } catch (error) {
      console.error('Error fetching game reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchUserPublicReviews = async () => {
    try {
      const reviews = await userReviewsService.getPublicReviews('game', gameId)
      setUserPublicReviews(reviews)
    } catch (error) {
      console.error('Error fetching user reviews:', error)
    }
  }

  const checkCurrentUserReview = async () => {
    try {
      const review = await userReviewsService.getCurrentUserReview('game', gameId)
      setCurrentUserReview(review)
      if (review) {
        setUserRating(review.rating)
        setUserReview(review.reviewText)
        setReviewPrivacy(review.isPublic ? 'public' : 'private')
      }
    } catch (error) {
      console.error('Error checking current user review:', error)
    }
  }

  const handleStatusSelect = async (status: MediaStatus) => {
    if (!gameDetail) return

    // If selecting "Playing" or "Completed", show friends modal
    if (status === 'playing' || status === 'completed') {
      setSelectedStatus(status)
      setShowFriendsModal(true)
      
      // If "Completed", also prepare to show rating/review
      if (status === 'completed') {
        setShowReviewBox(true)
      }
    } else {
      // For other statuses, just add to library
      const gameData = {
        id: `game-${gameDetail.id}`,
        title: gameDetail.name,
        category: 'games' as const,
        image: gameDetail.background_image,
        year: new Date(gameDetail.released).getFullYear(),
        rating: gameDetail.rating,
        developer: gameDetail.developers?.[0]?.name || 'Unknown',
        genre: gameDetail.genres?.[0]?.name || 'Unknown'
      }
      
      onAddToLibrary(gameData, status)
      setSelectedStatus(status)
    }
    
    setShowLibraryDropdown(false)
  }

  const handleFriendsSelected = () => {
    if (!gameDetail) return
    
    // Add to library with selected friends
    const gameData = {
      id: `game-${gameDetail.id}`,
      title: gameDetail.name,
      category: 'games' as const,
      image: gameDetail.background_image,
      year: new Date(gameDetail.released).getFullYear(),
      rating: gameDetail.rating,
      developer: gameDetail.developers?.[0]?.name || 'Unknown',
      genre: gameDetail.genres?.[0]?.name || 'Unknown',
      friendsPlayed: selectedFriends
    }
    
    onAddToLibrary(gameData, selectedStatus!)
    setShowFriendsModal(false)
    
    // If completed, show rating/review modal
    if (selectedStatus === 'completed') {
      setShowReviewBox(true)
    }
  }

  const handleReviewSubmit = async () => {
    if (!gameDetail) return

    const reviewData = {
      gameId: `game-${gameDetail.id}`,
      gameName: gameDetail.name,
      rating: userRating,
      reviewText: userReview,
      isPublic: reviewPrivacy === 'public',
      platform: 'game'
    }

    try {
      await userReviewsService.submitReview(reviewData)
      onReviewSubmit(reviewData)
      
      // Update library item with rating and review
      const gameData = {
        id: `game-${gameDetail.id}`,
        userRating: userRating,
        notes: userReview
      }
      
      // This should trigger an update, not an add
      // You might need to implement an onUpdateItem prop
      
      setShowReviewBox(false)
      fetchUserPublicReviews() // Refresh public reviews
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const handleRemoveFromLibrary = () => {
    if (onDeleteItem && gameDetail) {
      onDeleteItem(`game-${gameDetail.id}`)
      setSelectedStatus(null)
      setShowLibraryDropdown(false)
    }
  }

  const handleSaveGameSheet = () => {
    // Save custom game sheet data
    console.log('Saving game sheet:', gameSheetData)
    
    // Update library item with custom data
    if (gameDetail) {
      const updateData = {
        datePlayed: gameSheetData.datePlayed,
        platform: gameSheetData.platform,
        accessMethod: gameSheetData.accessMethod,
        purchasePrice: gameSheetData.purchasePrice,
        customTags: gameSheetData.customTags,
        friendsPlayed: gameSheetData.friendsPlayed,
        userRating: gameSheetData.personalRating || userRating,
        notes: gameSheetData.personalReview || userReview
      }
      
      // Update the review if it changed
      if (gameSheetData.personalRating !== userRating || gameSheetData.personalReview !== userReview) {
        setUserRating(gameSheetData.personalRating)
        setUserReview(gameSheetData.personalReview)
        handleReviewSubmit()
      }
    }
    
    setShowGameSheet(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[90vh] bg-gray-900 rounded-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
        >
          <X size={20} className="text-white" />
        </button>

        {/* Scrollable content */}
        <div ref={scrollableRef} className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : gameDetail ? (
            <>
              {/* 1. Large header image */}
              <div className="relative w-full h-96">
                <img
                  src={gameDetail.background_image}
                  alt={gameDetail.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
              </div>

              {/* 2. Colored section with main info */}
              <div className="relative bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-lg p-6">
                <div className="flex gap-6">
                  {/* Mini thumbnail */}
                  <div className="w-24 h-32 rounded-lg overflow-hidden border-2 border-white/20 flex-shrink-0">
                    <img
                      src={gameDetail.background_image}
                      alt={gameDetail.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title and info */}
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-white mb-2">{gameDetail.name}</h1>
                    <p className="text-xl text-white/80 mb-1">
                      {gameDetail.developers?.map(dev => dev.name).join(', ') || 'Unknown Developer'}
                    </p>
                    <p className="text-sm text-white/60">
                      {new Date(gameDetail.released).getFullYear()} • {gameDetail.genres?.map(g => g.name).join(', ')} • {gameDetail.platforms?.slice(0, 3).map(p => p.platform.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Add to Library button with dropdown */}
              <div className="px-6 py-4 bg-gray-900/95 border-b border-gray-800">
                <div className="flex gap-3">
                  <div className="relative" ref={libraryDropdownRef}>
                    <button
                      onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                      className={`px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 ${
                        selectedStatus 
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {selectedStatus ? (
                        <>
                          <Check size={16} />
                          {statusOptions.find(s => s.key === selectedStatus)?.label || 'In Library'}
                        </>
                      ) : (
                        'Add to Library'
                      )}
                      <ChevronDown size={16} />
                    </button>

                    {showLibraryDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
                        {statusOptions.map(option => (
                          <button
                            key={option.key}
                            onClick={() => handleStatusSelect(option.key)}
                            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center justify-between"
                          >
                            {option.label}
                            {selectedStatus === option.key && <Check size={14} />}
                          </button>
                        ))}
                        {selectedStatus && (
                          <>
                            <div className="border-t border-gray-700" />
                            <button
                              onClick={handleRemoveFromLibrary}
                              className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 transition-colors"
                            >
                              Remove from Library
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Share button */}
                  <button
                    onClick={() => setShowShareWithFriendsModal(true)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full font-medium transition-colors flex items-center gap-2"
                  >
                    <Share size={16} />
                    Share
                  </button>

                  {/* 5. Customize game sheet link */}
                  <button
                    onClick={() => setShowGameSheet(true)}
                    className="px-6 py-3 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Customize this game sheet
                  </button>
                </div>
              </div>

              {/* 6. Friends who played section */}
              <div className="px-6 py-4 bg-gray-900/95 border-b border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Friends who played</h3>
                  <button
                    onClick={() => setShowFriendsWhoPlayedModal(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View all
                  </button>
                </div>
                <div className="flex gap-3">
                  {friendsWhoPlayed.slice(0, 4).map(friend => (
                    <div key={friend.id} className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-1">
                        <span className="text-white text-sm">{friend.name[0]}</span>
                      </div>
                      <p className="text-xs text-gray-400">{friend.name}</p>
                      <div className="flex justify-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className={i < friend.rating ? 'text-yellow-500 fill-current' : 'text-gray-600'}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {friendsWhoPlayed.length === 0 && (
                    <p className="text-gray-500 text-sm">No friends have played this game yet</p>
                  )}
                </div>
              </div>

              {/* 7. Tab navigation */}
              <div className="px-6 py-4 bg-gray-900/95">
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('trailers')}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${
                      activeTab === 'trailers'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Trailers/Photos
                  </button>
                </div>

                {/* Tab content */}
                {activeTab === 'overview' ? (
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                      <p className="text-gray-300 leading-relaxed">
                        {showFullOverview 
                          ? gameDetail.description_raw 
                          : `${gameDetail.description_raw?.slice(0, 200)}...`}
                      </p>
                      {gameDetail.description_raw && gameDetail.description_raw.length > 200 && (
                        <button
                          onClick={() => setShowFullOverview(!showFullOverview)}
                          className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                        >
                          {showFullOverview ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>

                    {/* Game details */}
                    <div className="grid grid-cols-2 gap-4">
                      {gameDetail.metacritic && (
                        <div>
                          <p className="text-gray-500 text-sm">Metacritic Score</p>
                          <p className="text-white font-semibold">{gameDetail.metacritic}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500 text-sm">Developer</p>
                        <p className="text-white">{gameDetail.developers?.map(d => d.name).join(', ') || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Publishers</p>
                        <p className="text-white">{gameDetail.publishers?.map(p => p.name).join(', ') || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Release Date</p>
                        <p className="text-white">{new Date(gameDetail.released).toLocaleDateString()}</p>
                      </div>
                      {gameDetail.esrb_rating && (
                        <div>
                          <p className="text-gray-500 text-sm">ESRB Rating</p>
                          <p className="text-white">{gameDetail.esrb_rating.name}</p>
                        </div>
                      )}
                    </div>

                    {/* Reviews placeholder */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Reviews</h3>
                      <div className="space-y-3">
                        {realGameReviews.slice(0, 3).map((review, index) => (
                          <div key={index} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white font-medium">{review.username}</p>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={14}
                                    className={i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-600'}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-300 text-sm">{review.reviewText}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Trailer */}
                    {gameTrailer && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Trailer</h3>
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <iframe
                            src={`https://www.youtube.com/embed/${gameTrailer.videoId}`}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}

                    {/* Screenshots */}
                    {gameImages.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Screenshots</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {gameImages.slice(0, 6).map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Screenshot ${index + 1}`}
                              className="rounded-lg w-full h-40 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Game not found</p>
            </div>
          )}
        </div>

        {/* Modals */}
        {/* Friends selection modal */}
        {showFriendsModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Who did you play with?</h3>
              <div className="space-y-2 mb-4">
                {mockFriends.map(friend => (
                  <label key={friend.id} className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFriends.some(f => f.id === friend.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFriends([...selectedFriends, friend])
                        } else {
                          setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id))
                        }
                      }}
                      className="rounded text-blue-600"
                    />
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-white text-sm">{friend.name[0]}</span>
                    </div>
                    <span className="text-white">{friend.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFriendsModal(false)
                    handleFriendsSelected()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Skip
                </button>
                <button
                  onClick={handleFriendsSelected}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rating and review modal */}
        {showReviewBox && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Rate and Review</h3>
              
              {/* Rating stars */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={
                        star <= (hoverRating || userRating)
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-600'
                      }
                    />
                  </button>
                ))}
              </div>

              {/* Review text */}
              <textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                placeholder="Write your review (optional)"
                className="w-full h-32 px-3 py-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />

              {/* Privacy toggle */}
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={reviewPrivacy === 'private'}
                    onChange={(e) => setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-blue-600"
                  />
                  <span className="text-white">Private</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={reviewPrivacy === 'public'}
                    onChange={(e) => setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-blue-600"
                  />
                  <span className="text-white">Public</span>
                </label>
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
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customize game sheet modal */}
        {showGameSheet && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-white mb-4">Customize Game Sheet</h3>
              
              <div className="space-y-4">
                {/* Date played */}
                <div>
                  <label className="text-gray-400 text-sm">Date Played</label>
                  <input
                    type="date"
                    value={gameSheetData.datePlayed}
                    onChange={(e) => setGameSheetData({...gameSheetData, datePlayed: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Platform */}
                <div>
                  <label className="text-gray-400 text-sm">Platform</label>
                  <select
                    value={gameSheetData.platform}
                    onChange={(e) => setGameSheetData({...gameSheetData, platform: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select platform</option>
                    <option value="PC">PC</option>
                    <option value="PlayStation 5">PlayStation 5</option>
                    <option value="Xbox Series X">Xbox Series X</option>
                    <option value="Nintendo Switch">Nintendo Switch</option>
                    <option value="Steam Deck">Steam Deck</option>
                  </select>
                </div>

                {/* Access method */}
                <div>
                  <label className="text-gray-400 text-sm">How did you access it?</label>
                  <select
                    value={gameSheetData.accessMethod}
                    onChange={(e) => setGameSheetData({...gameSheetData, accessMethod: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select method</option>
                    <option value="Purchased">Purchased</option>
                    <option value="Game Pass">Game Pass</option>
                    <option value="PS Plus">PlayStation Plus</option>
                    <option value="Free to Play">Free to Play</option>
                    <option value="Borrowed">Borrowed</option>
                    <option value="Gift">Gift</option>
                  </select>
                </div>

                {/* Purchase price */}
                <div>
                  <label className="text-gray-400 text-sm">Purchase Price</label>
                  <input
                    type="text"
                    value={gameSheetData.purchasePrice}
                    onChange={(e) => setGameSheetData({...gameSheetData, purchasePrice: e.target.value})}
                    placeholder="e.g., $59.99"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Custom tags */}
                <div>
                  <label className="text-gray-400 text-sm">Custom Tags</label>
                  <input
                    type="text"
                    placeholder="Enter tags separated by commas"
                    onChange={(e) => setGameSheetData({...gameSheetData, customTags: e.target.value.split(',')})}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Friends played with */}
                <div>
                  <label className="text-gray-400 text-sm">Friends you played with</label>
                  <div className="space-y-2">
                    {mockFriends.map(friend => (
                      <label key={friend.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={gameSheetData.friendsPlayed.some(f => f.id === friend.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setGameSheetData({
                                ...gameSheetData,
                                friendsPlayed: [...gameSheetData.friendsPlayed, friend]
                              })
                            } else {
                              setGameSheetData({
                                ...gameSheetData,
                                friendsPlayed: gameSheetData.friendsPlayed.filter(f => f.id !== friend.id)
                              })
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="text-white">{friend.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating and review */}
                <div>
                  <label className="text-gray-400 text-sm">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setGameSheetData({...gameSheetData, personalRating: star})}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={
                            star <= gameSheetData.personalRating
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-600'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Review</label>
                  <textarea
                    value={gameSheetData.personalReview}
                    onChange={(e) => setGameSheetData({...gameSheetData, personalReview: e.target.value})}
                    placeholder="Write your review"
                    className="w-full h-24 px-3 py-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowGameSheet(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGameSheet}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save Game Card
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Friends who played modal */}
        {showFriendsWhoPlayedModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Friends Who Played</h3>
              <div className="space-y-3">
                {friendsWhoPlayed.map(friend => (
                  <div key={friend.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-white text-sm">{friend.name[0]}</span>
                        </div>
                        <span className="text-white font-medium">{friend.name}</span>
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < friend.rating ? 'text-yellow-500 fill-current' : 'text-gray-600'}
                          />
                        ))}
                      </div>
                    </div>
                    {friend.hasReview && (
                      <p className="text-gray-300 text-sm">{friend.reviewText}</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowFriendsWhoPlayedModal(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Share with friends modal */}
        {showShareWithFriendsModal && (
          <ShareWithFriendsModal
            isOpen={showShareWithFriendsModal}
            onClose={() => setShowShareWithFriendsModal(false)}
            itemTitle={gameDetail?.name || ''}
            itemType="game"
            itemImage={gameDetail?.background_image || ''}
          />
        )}
      </div>
    </div>
  )
}
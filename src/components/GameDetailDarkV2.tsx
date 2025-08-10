'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Star, Send, ChevronDown, Share, FileText } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { newTrailerService, type ValidatedTrailer } from '@/services/newTrailerService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import { realGameReviewsService, type RealGameReview } from '@/services/realGameReviewsService'
import { fetchWithCache, apiCache } from '@/utils/apiCache'
import { rawgService, type RAWGGame } from '@/services/rawgService'
import ShareWithFriendsModal from './ShareWithFriendsModal'

interface GameDetailDarkV2Props {
  gameId: string
  onBack: () => void
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
  gameId,
  onBack, 
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
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [gameImages, setGameImages] = useState<string[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [validatedTrailers, setValidatedTrailers] = useState<ValidatedTrailer[]>([])
  
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

  const libraryDropdownRef = useRef<HTMLDivElement>(null)
  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''

  // Mock friends data
  const mockFriends = [
    { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Sarah', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Mike', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Emma', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'David', avatar: '/api/placeholder/32/32' }
  ]

  // Mock friends who played this game
  const friendsWhoPlayed = [
    { id: 2, name: 'Sarah', rating: 4, hasReview: true, reviewText: 'Amazing gameplay! The story was incredible.' },
    { id: 4, name: 'Emma', rating: 5, hasReview: true, reviewText: 'Best game I\'ve played this year!' },
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
    if (gameId) {
      fetchGameDetail()
      fetchGameImages()
      loadUserRatingAndReview()
    }
  }, [gameId])

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

  const loadUserRatingAndReview = async () => {
    try {
      const existingReview = await userReviewsService.getCurrentUserReview('games', gameId)
      if (existingReview) {
        setUserRating(existingReview.rating)
        setUserReview(existingReview.reviewText)
        setReviewPrivacy(existingReview.isPublic ? 'public' : 'private')
      }
    } catch (error) {
      console.error('Error loading user review:', error)
    }
  }

  const handleStatusSelect = async (status: MediaStatus) => {
    if (!gameDetail) return

    if (status === 'playing' || status === 'completed') {
      setSelectedStatus(status)
      setShowFriendsModal(true)
      
      if (status === 'completed') {
        setShowReviewBox(true)
      }
    } else {
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
      setShowReviewBox(false)
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

  const getStatusLabel = (status: MediaStatus): string => {
    const statusLabels: Record<MediaStatus, string> = {
      'want-to-play': 'Want to play',
      'playing': 'Playing',
      'completed': 'Completed', 
      'dropped': 'Dropped',
      'want-to-watch': 'Want to watch',
      'watching': 'Watching',
      'watched': 'Watched',
      'want-to-read': 'Want to read',
      'reading': 'Reading',
      'read': 'Read',
      'want-to-listen': 'Want to listen',
      'currently-playing': 'Playing',
      'listened': 'Listened'
    }
    return statusLabels[status] || 'Add to Library'
  }

  return (
    <div className="bg-[#0f0e17] min-h-screen pb-20 font-system">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : gameDetail ? (
            <>
              {/* 1. Large header image - 160px height */}
              <div className="relative h-[160px] overflow-hidden">
                <img
                  src={gameDetail.background_image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop&q=80'}
                  alt={`${gameDetail.name} background`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop&q=80'
                  }}
                />
                
                {/* Navigation Header */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5" style={{ zIndex: 20 }}>
                  <button
                    onClick={onBack}
                    className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>
              </div>

              {/* Bottom Section: Game Info with Purple Gradient */}
              <div className="relative min-h-[240px] overflow-visible">
                {/* Purple Gradient Background */}
                <div 
                  className="absolute inset-0"
                  style={{ 
                    background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.4), rgba(126, 58, 242, 0.3), rgba(107, 33, 168, 0.2), rgba(15, 14, 23, 0.7))',
                    zIndex: 1
                  }}
                />
                
                {/* Game Info Container */}
                <div className="px-5 py-6 relative z-30">
                  {/* Game Thumbnail + Game Title Section */}
                  <div className="flex gap-4 items-start mb-4">
                    {/* Game Thumbnail */}
                    <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
                      <img
                        src={gameDetail.background_image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop&q=80'}
                        alt={gameDetail.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop&q=80'
                        }}
                      />
                    </div>
                    
                    {/* Game Title Section */}
                    <div className="flex-1 pt-1">
                      <h1 className="text-xl font-bold text-white mb-1 leading-tight">{gameDetail.name}</h1>
                      <p className="text-sm text-gray-400 mb-1">{gameDetail.developers?.[0]?.name || 'Unknown Developer'}</p>
                      
                      {/* Game Stats on same line - WITHOUT platforms */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {gameDetail.released && <span>{new Date(gameDetail.released).getFullYear()}</span>}
                        {gameDetail.genres?.[0] && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span>{gameDetail.genres[0].name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Buttons - full width */}
                  <div className="flex space-x-3 mt-3 relative z-50" ref={libraryDropdownRef} style={{ zIndex: 100000 }}>
                    {/* Status Button */}
                    <div className="relative flex-1">
                      <button
                        onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                      >
                        <span>{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                        <ChevronDown size={16} className={`transition-transform ${showLibraryDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showLibraryDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                          {(['want-to-play', 'playing', 'completed', 'dropped'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusSelect(status)}
                              className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                selectedStatus === status ? 'text-purple-400 bg-purple-600/30' : 'text-gray-300'
                              }`}
                            >
                              {getStatusLabel(status)}
                            </button>
                          ))}
                          {selectedStatus && (
                            <>
                              <div className="border-t border-purple-500/30 my-1" />
                              <button
                                onClick={handleRemoveFromLibrary}
                                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors rounded-b-lg"
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
                      onClick={() => setShowShareWithFriendsModal(true)}
                      className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
                    >
                      <Share size={16} />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Friends who played */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">Friends who played:</span>
                        <div className="flex -space-x-1">
                          {friendsWhoPlayed.slice(0, 4).map((friend) => (
                            <div
                              key={friend.id}
                              className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                              title={`${friend.name} - ${friend.rating}/5 stars`}
                            >
                              {friend.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFriendsWhoPlayedModal(true)}
                        className="text-gray-400 hover:text-purple-400 text-sm cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                    
                    {/* Customize this game sheet */}
                    <button
                      onClick={() => setShowGameSheet(true)}
                      className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer"
                    >
                      <FileText size={14} />
                      <span>Customize this game sheet</span>
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
                  <div className="space-y-6">
                    {/* Section rating utilisateur - visible si l'utilisateur a noté */}
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
                        </div>
                        {userReview && (
                          <p className="text-gray-300 text-sm">{userReview}</p>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {gameDetail.description_raw && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                        <div className="text-gray-300 leading-relaxed text-sm">
                          <p className={`${showFullOverview ? '' : 'line-clamp-3'}`}>
                            {gameDetail.description_raw.slice(0, showFullOverview ? undefined : 200)}
                            {!showFullOverview && gameDetail.description_raw.length > 200 && '...'}
                          </p>
                          {gameDetail.description_raw.length > 200 && (
                            <button
                              onClick={() => setShowFullOverview(!showFullOverview)}
                              className="text-purple-400 hover:text-purple-300 text-sm mt-2"
                            >
                              {showFullOverview ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Game Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Game Details</h3>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        {gameDetail.metacritic && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Metacritic Score:</span>
                            <span className="text-white">{gameDetail.metacritic}/100</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Developer:</span>
                          <span className="text-white">{gameDetail.developers?.[0]?.name || 'Unknown'}</span>
                        </div>
                        {gameDetail.publishers?.[0] && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Publisher:</span>
                            <span className="text-white">{gameDetail.publishers[0].name}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Release Date:</span>
                          <span className="text-white">{gameDetail.released ? new Date(gameDetail.released).toLocaleDateString() : 'TBA'}</span>
                        </div>
                        {gameDetail.platforms && gameDetail.platforms.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Platforms:</span>
                            <span className="text-white">{gameDetail.platforms.map(p => p.platform.name).join(', ')}</span>
                          </div>
                        )}
                        {gameDetail.esrb_rating && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">ESRB Rating:</span>
                            <span className="text-white">{gameDetail.esrb_rating.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reviews Placeholder */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">User Reviews</h3>
                      <div className="text-gray-400 text-sm bg-gray-800/50 rounded-lg p-4">
                        Reviews coming soon...
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'trailers' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Media</h3>
                    
                    {/* Screenshots */}
                    {gameImages.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-white mb-3">Screenshots</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {gameImages.slice(0, 6).map((screenshot, index) => (
                            <div key={index} className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                              <img
                                src={screenshot}
                                alt={`${gameDetail.name} screenshot ${index + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                onClick={() => window.open(screenshot, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {gameImages.length === 0 && (
                      <div className="text-gray-400 text-sm bg-gray-800/50 rounded-lg p-4">
                        No media available for this game.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="text-white text-center">
                <h2 className="text-xl font-semibold mb-2">Game not found</h2>
                <p className="text-gray-400">Unable to load game details</p>
              </div>
            </div>
          )}
      
      {/* All the modals and popups */}
        
        {/* Friends Modal */}
        {showFriendsModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Who did you play with?</h3>
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
                    if (selectedStatus === 'completed') {
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
              
              {/* Rating */}
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

              {/* Review Text */}
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Review (optional)</p>
                <textarea
                  value={userReview}
                  onChange={(e) => setUserReview(e.target.value)}
                  placeholder="Share your thoughts about this game..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
                />
              </div>

              {/* Privacy */}
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

        {/* Friends Who Played Modal */}
        {showFriendsWhoPlayedModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">Friends who played</h3>
              <div className="space-y-4">
                {friendsWhoPlayed.map(friend => (
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
                onClick={() => setShowFriendsWhoPlayedModal(false)}
                className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareWithFriendsModal && gameDetail && (
          <ShareWithFriendsModal
            isOpen={showShareWithFriendsModal}
            onClose={() => setShowShareWithFriendsModal(false)}
            item={{
              id: gameDetail.id.toString(),
              type: 'games' as const,
              title: gameDetail.name,
              image: gameDetail.background_image
            }}
          />
        )}
    </div>
  )
}
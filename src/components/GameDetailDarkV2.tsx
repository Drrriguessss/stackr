'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, Share, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { newTrailerService, type ValidatedTrailer } from '@/services/newTrailerService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import { realGameReviewsService, type RealGameReview } from '@/services/realGameReviewsService'
import { fetchWithCache, apiCache } from '@/utils/apiCache'
import { rawgService, type RAWGGame } from '@/services/rawgService'
import { igdbService } from '@/services/igdbService'
import ShareWithFriendsModal from './ShareWithFriendsModal'

interface GameDetailDarkV2Props {
  gameId: string
  onBack: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  onUpdateItem?: (id: string, updates: Partial<LibraryItem>) => void
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
  onUpdateItem,
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
  const [igdbArtwork, setIgdbArtwork] = useState<string | null>(null)
  const [igdbVideos, setIgdbVideos] = useState<any[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  
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
      loadGameSheetData()
    }
  }, [gameId])

  // Fetch IGDB artwork and videos when game details are loaded
  useEffect(() => {
    if (gameDetail?.name) {
      fetchIGDBArtwork(gameDetail.name)
      fetchIGDBVideos(gameDetail.name)
    }
  }, [gameDetail])

  const loadGameSheetData = () => {
    const libraryItem = library.find(item => 
      item.id === gameId || item.id === `game-${gameId}`
    )
    if (libraryItem?.additionalInfo?.gameSheet) {
      setGameSheetData(libraryItem.additionalInfo.gameSheet)
    }
  }

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

  const fetchIGDBArtwork = async (gameName: string) => {
    try {
      console.log('🎮 [IGDB] Fetching images for:', gameName)
      
      // Search for game on IGDB
      const games = await igdbService.searchGames(gameName, 1)
      
      if (games && games.length > 0) {
        const gameId = games[0].id
        
        // Priority 1: Try screenshots first (real in-game images)
        console.log('🎮 [IGDB] Trying screenshots first (in-game images)...')
        const screenshots = await igdbService.getGameScreenshots(gameId)
        
        if (screenshots && screenshots.length > 0) {
          const screenshotUrl = igdbService.getImageUrl(screenshots[0].image_id, 'screenshot_big')
          setIgdbArtwork(screenshotUrl)
          console.log('🎮 [IGDB] Screenshot found (priority):', screenshotUrl)
        } else {
          console.log('🎮 [IGDB] No screenshots found, trying artworks as fallback')
          // Priority 2: Fallback to artworks if no screenshots
          const artworks = await igdbService.getGameArtworks(gameId)
          if (artworks && artworks.length > 0) {
            const artworkUrl = igdbService.getImageUrl(artworks[0].image_id, 'screenshot_big')
            setIgdbArtwork(artworkUrl)
            console.log('🎮 [IGDB] Artwork found (fallback):', artworkUrl)
          }
        }
      }
    } catch (error) {
      console.error('🎮 [IGDB] Error fetching images:', error)
      // Keep using RAWG image as fallback
    }
  }

  const fetchIGDBVideos = async (gameName: string) => {
    try {
      setVideosLoading(true)
      console.log('🎬 [IGDB] Fetching videos for:', gameName)
      
      // Search for game on IGDB first
      const games = await igdbService.searchGames(gameName, 1)
      
      if (games && games.length > 0) {
        const gameId = games[0].id
        
        // Fetch videos for this game
        const videos = await igdbService.getGameVideos(gameId)
        
        if (videos && videos.length > 0) {
          console.log(`🎬 [IGDB] Found ${videos.length} videos for ${gameName}`)
          setIgdbVideos(videos)
        } else {
          console.log('🎬 [IGDB] No videos found for', gameName)
          setIgdbVideos([])
        }
      } else {
        console.log('🎬 [IGDB] Game not found for video search:', gameName)
        setIgdbVideos([])
      }
    } catch (error) {
      console.error('🎬 [IGDB] Error fetching videos:', error)
      setIgdbVideos([])
    } finally {
      setVideosLoading(false)
    }
  }

  // Navigation functions for media carousel
  const nextMedia = () => {
    const totalItems = igdbVideos.length + gameImages.length
    if (totalItems > 0) {
      setActiveMediaIndex((prev) => (prev + 1) % totalItems)
    }
  }

  const prevMedia = () => {
    const totalItems = igdbVideos.length + gameImages.length
    if (totalItems > 0) {
      setActiveMediaIndex((prev) => (prev - 1 + totalItems) % totalItems)
    }
  }

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
              {/* Header with backdrop image - Using IGDB Artwork when available */}
              <div className="relative h-[200px] overflow-hidden">
                <img
                  src={igdbArtwork || gameDetail.background_image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1280&h=720&fit=crop&q=80'}
                  alt={`${gameDetail.name} backdrop`}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                
                {/* Gradient overlay - Same as MusicModal */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e17] via-[#0f0e17]/60 to-transparent" />
                
                {/* Close button - Same as MusicModal */}
                <div className="absolute top-0 right-0 p-5">
                  <button
                    onClick={onBack}
                    className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Game Info Section */}
              <div className="px-6 py-6 relative -mt-16">
                {/* Thumbnail + Basic Info */}
                <div className="flex gap-4 items-start mb-4 relative z-10">
                  {/* Game Thumbnail */}
                  <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
                    <img
                      src={gameDetail.background_image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=100&h=100&fit=crop&q=80'}
                      alt={gameDetail.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                      style={{ imageRendering: 'crisp-edges', backfaceVisibility: 'hidden' }}
                    />
                  </div>
                  
                  {/* Title and Developer */}
                  <div className="flex-1 pt-1">
                    <h1 className="text-xl font-bold text-white mb-1 leading-tight">{gameDetail.name}</h1>
                    <p className="text-sm text-gray-400 mb-1">{gameDetail.developers?.[0]?.name || 'Unknown Developer'}</p>
                    
                    {/* Game Stats */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {gameDetail.released && <span>{new Date(gameDetail.released).getFullYear()}</span>}
                      {gameDetail.genres?.[0]?.name && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{gameDetail.genres[0].name}</span>
                        </>
                      )}
                      {gameDetail.rating && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{gameDetail.rating.toFixed(1)}/5</span>
                        </>
                      )}
                      {gameDetail.platforms?.[0]?.platform?.name && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{gameDetail.platforms[0].platform.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mb-4">
                  {/* Status Button */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                      className="w-full h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-medium rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 flex items-center justify-center space-x-1 text-xs"
                    >
                      <span className="truncate">{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform flex-shrink-0 ${showLibraryDropdown ? 'rotate-180' : ''}`}>
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
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
                    className="h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white rounded-lg transition-all duration-200 flex items-center space-x-1 text-xs"
                  >
                    <Share size={14} />
                    <span>Share</span>
                  </button>
                </div>

                {/* Friends who played */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">Friends who played:</span>
                      {friendsWhoPlayed.length > 0 ? (
                        <div className="flex -space-x-1">
                          {friendsWhoPlayed.slice(0, 4).map((friend) => (
                            <div
                              key={friend.id}
                              className="w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                              title={`${friend.name} - ${friend.rating}/5 stars`}
                            >
                              {friend.name.charAt(0)}
                            </div>
                          ))}
                          {friendsWhoPlayed.length > 4 && (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17]">
                              +{friendsWhoPlayed.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">None</span>
                      )}
                    </div>
                    {friendsWhoPlayed.length > 0 && (
                      <button
                        onClick={() => setShowFriendsWhoPlayedModal(true)}
                        className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                      >
                        View all
                      </button>
                    )}
                  </div>
                  
                  {/* Customize game sheet */}
                  <button
                    onClick={() => setShowGameSheet(true)}
                    className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <FileText size={14} />
                    <span>Customize game sheet</span>
                  </button>
                </div>
              </div>

              {/* Main Content Section */}
              <div className="px-6 py-4 relative z-1">
                {/* Tabs: Overview / Trailers */}
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setActiveTab('overview')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        activeTab === 'overview'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Overview
                    </button>
                    <button 
                      onClick={() => setActiveTab('trailers')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                        activeTab === 'trailers'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Trailers/Photos
                    </button>
                  </div>
                </div>

                {/* Overview Content */}
                <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
                  <div className="space-y-8">
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
                              className="text-gray-400 hover:text-gray-300 ml-1 text-sm"
                            >
                              {showFullOverview ? ' ...less' : ' ...more'}
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
                </div>

                {/* Trailers Content */}
                <div style={{ display: activeTab === 'trailers' ? 'block' : 'none' }}>
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Media</h3>
                    
                    {/* Loading state */}
                    {videosLoading && (
                      <div className="text-gray-400 text-sm bg-gray-800/50 rounded-lg p-4">
                        Loading trailers...
                      </div>
                    )}
                    
                    {/* Media Carousel */}
                    {!videosLoading && (igdbVideos.length > 0 || gameImages.length > 0) && (
                      <div className="space-y-4 mb-6">
                        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                          {/* Current media item */}
                          {activeMediaIndex < igdbVideos.length ? (
                            /* IGDB Video */
                            <div className="w-full h-full">
                              <iframe
                                src={igdbService.getVideoUrl(igdbVideos[activeMediaIndex].video_id)}
                                title={igdbVideos[activeMediaIndex].name || `${gameDetail.name} Trailer ${activeMediaIndex + 1}`}
                                className="w-full h-full"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            </div>
                          ) : gameImages.length > 0 ? (
                            /* Screenshot */
                            <img
                              src={gameImages[activeMediaIndex - igdbVideos.length]}
                              alt={`${gameDetail.name} screenshot ${activeMediaIndex - igdbVideos.length + 1}`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => window.open(gameImages[activeMediaIndex - igdbVideos.length], '_blank')}
                            />
                          ) : (
                            /* Fallback */
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No media available
                            </div>
                          )}
                          
                          {/* Navigation arrows */}
                          {(igdbVideos.length + gameImages.length) > 1 && (
                            <>
                              <button
                                onClick={prevMedia}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                              >
                                <ChevronLeft size={20} />
                              </button>
                              <button
                                onClick={nextMedia}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                              >
                                <ChevronRight size={20} />
                              </button>
                            </>
                          )}
                        </div>
                        
                        {/* Media thumbnails */}
                        {(igdbVideos.length + gameImages.length) > 1 && (
                          <div className="flex space-x-2 overflow-x-auto pb-2">
                            {/* IGDB Video thumbnails */}
                            {igdbVideos.map((video, index) => (
                              <button
                                key={video.video_id || index}
                                onClick={() => setActiveMediaIndex(index)}
                                className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors relative ${
                                  activeMediaIndex === index ? 'border-white' : 'border-transparent'
                                }`}
                              >
                                {gameDetail.background_image ? (
                                  <img
                                    src={gameDetail.background_image}
                                    alt={`Video ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <span className="text-xs text-gray-300">V{index + 1}</span>
                                  </div>
                                )}
                                {/* Play icon overlay */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-4 h-4 bg-white/80 rounded-full flex items-center justify-center">
                                    <div className="w-0 h-0 border-l-2 border-l-black border-t-1 border-t-transparent border-b-1 border-b-transparent ml-0.5"></div>
                                  </div>
                                </div>
                              </button>
                            ))}
                            
                            {/* Screenshot thumbnails */}
                            {gameImages.map((image, index) => (
                              <button
                                key={index}
                                onClick={() => setActiveMediaIndex(igdbVideos.length + index)}
                                className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors ${
                                  (igdbVideos.length + index) === activeMediaIndex ? 'border-white' : 'border-transparent'
                                }`}
                              >
                                <img
                                  src={image}
                                  alt={`Screenshot ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!videosLoading && gameImages.length === 0 && igdbVideos.length === 0 && (
                      <div className="text-gray-400 text-sm bg-gray-800/50 rounded-lg p-4">
                        No media available for this game.
                      </div>
                    )}
                  </div>
                </div>
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

        {/* Game Sheet Modal */}
        {showGameSheet && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Game Sheet</h3>
              
              {/* Date Played */}
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Date Played</label>
                <input
                  type="date"
                  value={gameSheetData.datePlayed}
                  onChange={(e) => setGameSheetData({...gameSheetData, datePlayed: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Platform */}
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Platform</label>
                <select
                  value={gameSheetData.platform}
                  onChange={(e) => setGameSheetData({...gameSheetData, platform: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Platform</option>
                  <option value="PlayStation 5">PlayStation 5</option>
                  <option value="Xbox Series X/S">Xbox Series X/S</option>
                  <option value="Nintendo Switch">Nintendo Switch</option>
                  <option value="PC">PC</option>
                  <option value="Steam Deck">Steam Deck</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>

              {/* Access Method */}
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Access Method</label>
                <select
                  value={gameSheetData.accessMethod}
                  onChange={(e) => setGameSheetData({...gameSheetData, accessMethod: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Access Method</option>
                  <option value="Purchased">Purchased</option>
                  <option value="Game Pass">Game Pass</option>
                  <option value="PlayStation Plus">PlayStation Plus</option>
                  <option value="Free to Play">Free to Play</option>
                  <option value="Gift">Gift</option>
                </select>
              </div>

              {/* Purchase Price */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">Purchase Price</label>
                <input
                  type="text"
                  placeholder="$59.99"
                  value={gameSheetData.purchasePrice}
                  onChange={(e) => setGameSheetData({...gameSheetData, purchasePrice: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGameSheet(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save game sheet data to library item
                    if (onUpdateItem && gameDetail) {
                      const libraryItemId = library.find(item => 
                        item.id === gameId || item.id === `game-${gameId}`
                      )?.id
                      
                      if (libraryItemId) {
                        const existingItem = library.find(item => item.id === libraryItemId)
                        onUpdateItem(libraryItemId, { 
                          additionalInfo: {
                            ...existingItem?.additionalInfo,
                            gameSheet: gameSheetData
                          }
                        })
                      }
                    }
                    setShowGameSheet(false)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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
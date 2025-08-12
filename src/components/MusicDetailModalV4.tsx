'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Star, X, Share, FileText, ChevronDown } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import type { MusicDetailData } from '@/types/musicTypes'
import { musicServiceV2 } from '@/services/musicServiceV2'
import { musicMetacriticService, type MetacriticScore } from '@/services/musicMetacriticService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'
import ShareWithFriendsModal from './ShareWithFriendsModal'

interface MusicDetailModalV4Props {
  isOpen: boolean
  onClose: () => void
  musicId: string // Format: 'track-123' ou 'album-456'
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onMusicSelect?: (musicId: string) => void
}

// Mock friends data
const FRIENDS_WHO_LISTENED = [
  { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
  { id: 2, name: 'Sarah', avatar: '/api/placeholder/32/32', hasReview: true },
  { id: 3, name: 'Mike', avatar: '/api/placeholder/32/32' },
  { id: 4, name: 'Emma', avatar: '/api/placeholder/32/32', hasReview: true }
]

const MUSIC_STATUSES = [
  { value: 'want-to-listen', label: 'Want to Listen' },
  { value: 'currently-listening', label: 'Currently Listening' },
  { value: 'listened', label: 'Listened' },
  { value: 'remove', label: 'Remove from Library' }
]

export default function MusicDetailModalV4({
  isOpen,
  onClose,
  musicId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onMusicSelect
}: MusicDetailModalV4Props) {
  // States - copying from BookDetailModalV3 structure
  const [musicDetail, setMusicDetail] = useState<MusicDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [showFriendsWhoListened, setShowFriendsWhoListened] = useState(false)
  const [showFriendsListModal, setShowFriendsListModal] = useState(false)
  const [showInlineRating, setShowInlineRating] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'media'>('overview')
  
  // Review states
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [userReview, setUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)
  
  // Audio preview states
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  
  // Metacritic states
  const [metacriticScore, setMetacriticScore] = useState<MetacriticScore | null>(null)
  const [loadingMetacritic, setLoadingMetacritic] = useState(false)
  
  // Album tracks states
  const [albumTracks, setAlbumTracks] = useState<any[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)

  // Determine if it's an album or single
  const isAlbum = useMemo(() => musicId.startsWith('album-'), [musicId])
  const isSingle = useMemo(() => musicId.startsWith('track-'), [musicId])

  // Load music detail
  const fetchMusicDetail = useCallback(async () => {
    console.log('🎵 [DEBUG] fetchMusicDetail called with musicId:', musicId)
    if (!musicId) {
      console.log('🎵 [DEBUG] No musicId, returning early')
      return
    }
    
    try {
      console.log('🎵 [DEBUG] Setting loading to true')
      setLoading(true)
      const detail = await musicServiceV2.getMusicDetails(musicId)
      console.log('🎵 [DEBUG] Got music detail:', detail ? 'success' : 'null')
      setMusicDetail(detail)
      
      // Load additional data
      if (detail) {
        console.log('🎵 [DEBUG] Loading additional data...')
        loadMetacriticScore(detail.title, detail.artist)
        loadExistingReview(detail.id)
        
        // Load album tracks if this is an album
        if (isAlbum) {
          loadAlbumTracks(detail.id, detail.title, detail.artist)
        }
      }
    } catch (error) {
      console.error('Error fetching music details:', error)
    } finally {
      console.log('🎵 [DEBUG] Setting loading to false')
      setLoading(false)
    }
  }, [musicId])

  // Load Metacritic score
  const loadMetacriticScore = useCallback(async (title: string, artist: string) => {
    try {
      setLoadingMetacritic(true)
      const score = await musicMetacriticService.getMetacriticScore(artist, title, isAlbum)
      setMetacriticScore(score)
    } catch (error) {
      console.error('Error loading Metacritic score:', error)
    } finally {
      setLoadingMetacritic(false)
    }
  }, [isAlbum])

  // Load existing review
  const loadExistingReview = useCallback(async (mediaId: string) => {
    try {
      const existingReview = await userReviewsService.getUserReviewForMedia(mediaId)
      if (existingReview) {
        setCurrentUserReview(existingReview)
        setUserRating(existingReview.rating)
        setUserReview(existingReview.review_text || '')
        setReviewPrivacy(existingReview.is_public ? 'public' : 'private')
      }
    } catch (error) {
      console.error('Error loading existing review:', error)
    }
  }, [])
  
  // Load album tracks
  const loadAlbumTracks = useCallback(async (albumId: string, albumTitle: string, artistName: string) => {
    console.log('🎵 [AlbumTracks] Loading tracks for album:', albumId)
    
    try {
      setLoadingTracks(true)
      
      // Utiliser l'API iTunes pour récupérer les tracks de l'album
      const cleanId = albumId.replace('album-', '')
      const response = await fetch(
        `/api/itunes?endpoint=lookup&id=${cleanId}&entity=song&limit=50`,
        { signal: AbortSignal.timeout(8000) }
      )
      
      if (!response.ok) {
        throw new Error(`Album tracks lookup failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length <= 1) {
        // Pas de tracks trouvées (le premier résultat est souvent l'album lui-même)
        setAlbumTracks([])
        return
      }
      
      // Filtrer et formater les tracks (exclure l'album lui-même)
      const tracks = data.results
        .filter((item: any) => item.wrapperType === 'track' && item.kind === 'song')
        .map((track: any, index: number) => ({
          id: `track-${track.trackId}`,
          name: track.trackName,
          duration: formatTrackDuration(track.trackTimeMillis),
          trackNumber: track.trackNumber || index + 1,
          previewUrl: track.previewUrl,
          artist: track.artistName
        }))
        .sort((a: any, b: any) => a.trackNumber - b.trackNumber) // Trier par numéro de track
      
      console.log(`🎵 [AlbumTracks] Found ${tracks.length} tracks for album:`, albumTitle)
      setAlbumTracks(tracks)
      
    } catch (error) {
      console.error('🎵 [AlbumTracks] Error loading album tracks:', error)
      setAlbumTracks([])
    } finally {
      setLoadingTracks(false)
    }
  }, [])
  
  // Helper function to format track duration
  const formatTrackDuration = (milliseconds?: number): string => {
    if (!milliseconds) return '3:30'
    
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Load data and check library status when modal opens - SINGLE EFFECT TO PREVENT DOUBLE RENDER
  useEffect(() => {
    console.log('🎵 [DEBUG] useEffect triggered with:', { 
      isOpen, 
      musicId, 
      libraryLength: library.length,
      fetchMusicDetailRef: fetchMusicDetail.toString().substring(0, 50) + '...'
    })
    
    if (isOpen && musicId) {
      console.log('🎵 [Modal] Loading music detail and checking library status for:', musicId)
      
      // Check library status
      if (library.length > 0) {
        const libraryItem = library.find(item => item.id === musicId)
        console.log('🎵 [DEBUG] Library item found:', libraryItem?.status || 'none')
        setSelectedStatus(libraryItem?.status || null)
      }
      
      // Fetch music detail
      console.log('🎵 [DEBUG] About to call fetchMusicDetail()')
      fetchMusicDetail()
    }
  }, [isOpen, musicId, library])

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all states when modal closes to prevent double modals
      setMusicDetail(null)
      setSelectedStatus(null)
      setShowStatusDropdown(false)
      setShowShareWithFriendsModal(false)
      setShowFriendsWhoListened(false)
      setShowFriendsListModal(false)
      setShowInlineRating(false)
      setActiveTab('overview')
      setUserRating(0)
      setHoverRating(0)
      setUserReview('')
      setReviewPrivacy('private')
      setCurrentUserReview(null)
      setIsPreviewPlaying(false)
      if (audioRef) {
        audioRef.pause()
        setAudioRef(null)
      }
      setAlbumTracks([])
      setLoadingTracks(false)
      setMetacriticScore(null)
      setLoadingMetacritic(false)
    }
  }, [isOpen, audioRef])

  // Audio preview functions
  const handlePreviewToggle = useCallback(() => {
    if (!musicDetail?.previewUrl) return

    if (isPreviewPlaying) {
      audioRef?.pause()
      setIsPreviewPlaying(false)
    } else {
      if (audioRef) {
        audioRef.play()
      } else {
        const audio = new Audio(musicDetail.previewUrl)
        audio.addEventListener('ended', () => setIsPreviewPlaying(false))
        audio.play()
        setAudioRef(audio)
      }
      setIsPreviewPlaying(true)
    }
  }, [musicDetail?.previewUrl, isPreviewPlaying, audioRef])

  // Go to album function
  const handleGoToAlbum = useCallback(() => {
    if (isSingle && musicDetail?.parentAlbum && onMusicSelect) {
      onMusicSelect(musicDetail.parentAlbum.id)
    }
  }, [isSingle, musicDetail?.parentAlbum, onMusicSelect])
  
  // Add to library function - copying BookDetailModalV3 logic
  const handleAddToLibrary = useCallback(async (status: MediaStatus) => {
    if (!musicDetail) return
    if (status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(musicDetail.id)
      }
      setSelectedStatus(null)
      setShowStatusDropdown(false)
      return
    }
    
    // Add to library for ALL status
    const musicData = {
      id: musicDetail.id,
      title: musicDetail.title,
      category: 'music' as const,
      image: musicDetail.image,
      year: musicDetail.releaseDate ? new Date(musicDetail.releaseDate).getFullYear() : undefined,
      rating: musicDetail.rating || 0,
      artist: musicDetail.artist,
      genre: musicDetail.genre,
      duration: musicDetail.duration
    }
    
    onAddToLibrary(musicData, status)
    setSelectedStatus(status)
    
    // Show inline rating for listened status
    if (status === 'listened') {
      setShowInlineRating(true)
    }
    
    setShowStatusDropdown(false)
  }, [musicDetail, onAddToLibrary, onDeleteItem])

  // Save review function
  const handleSaveReview = useCallback(async () => {
    if (!musicDetail) return
    
    try {
      await userReviewsService.submitReview({
        mediaId: musicDetail.id,
        mediaTitle: musicDetail.title,
        mediaCategory: 'music',
        rating: userRating,
        reviewText: userReview,
        isPublic: reviewPrivacy === 'public'
      })
      
      setShowInlineRating(false)
      setCurrentUserReview({
        id: 'temp',
        media_id: musicDetail.id,
        media_title: musicDetail.title,
        media_category: 'music',
        user_identifier: 'temp',
        rating: userRating,
        review_text: userReview,
        is_public: reviewPrivacy === 'public',
        helpful_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error saving review:', error)
    }
  }, [musicDetail, userRating, userReview, reviewPrivacy])

  // Format status for display
  const formatStatusForDisplay = useCallback((status: MediaStatus | null) => {
    if (!status) return 'Add to Library'
    const statusObj = MUSIC_STATUSES.find(s => s.value === status)
    return statusObj?.label || 'Add to Library'
  }, [])

  // Get available statuses
  const getAvailableStatuses = useCallback(() => {
    return selectedStatus 
      ? MUSIC_STATUSES 
      : MUSIC_STATUSES.filter(s => s.value !== 'remove')
  }, [selectedStatus])

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="bg-[#0f0e17] min-h-screen flex items-center justify-center">
        <StackrLoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="bg-[#0f0e17] min-h-screen pb-20 font-system">
      {musicDetail ? (
        <>
          {/* Large header image - 160px height */}
      <div className="relative h-[160px] overflow-hidden">
        <img
          src={musicDetail?.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1280&h=720&fit=crop&q=80'}
          alt={`${musicDetail?.title} backdrop`}
          className="w-full h-full object-cover"
          loading="eager"
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

      {/* Music Info Section with GRAY/BLACK Gradient - COPIED FROM BookDetailModalV3 */}
      <div className="relative min-h-[240px] overflow-visible">
        {/* GRAY/BLACK Gradient Background - EXACTLY LIKE BOOKS */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(to bottom, rgba(55, 65, 81, 0.4), rgba(31, 41, 55, 0.3), rgba(17, 24, 39, 0.2), rgba(15, 14, 23, 0.7))',
            zIndex: 1
          }}
        />
        
        {/* Music Info Container */}
        <div className="px-5 py-6 relative z-30">
          {/* Thumbnail + Title Section - SAME LAYOUT AS BOOKS */}
          <div className="flex gap-4 items-start mb-4">
            {/* Music Thumbnail - 100x100 EXACTLY LIKE BOOKS + Listen Icon */}
            <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0 relative">
              <img
                src={musicDetail?.image}
                alt={musicDetail?.title}
                className="w-full h-full object-cover"
              />
              {/* Listen Icon - Bottom Right for Singles Only */}
              {isSingle && musicDetail?.previewUrl && (
                <button
                  onClick={handlePreviewToggle}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-gray-800/90 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-gray-700/90 backdrop-blur-sm"
                  title="Listen to 30-second preview"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    {isPreviewPlaying ? (
                      // Pause icon
                      <>
                        <rect x="6" y="4" width="4" height="16" fill="white"/>
                        <rect x="14" y="4" width="4" height="16" fill="white"/>
                      </>
                    ) : (
                      // Play icon
                      <polygon points="8,5 8,19 19,12" fill="white"/>
                    )}
                  </svg>
                </button>
              )}
            </div>
            
            {/* Music Title Section */}
            <div className="flex-1 pt-1">
              <h1 className="text-xl font-bold text-white mb-1 leading-tight">{musicDetail?.title}</h1>
              <p className="text-sm text-gray-400 mb-1">{musicDetail?.artist}</p>
              
              {/* Music Stats on same line */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {musicDetail?.releaseDate && <span>{new Date(musicDetail.releaseDate).getFullYear()}</span>}
                {musicDetail?.genre && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span>{musicDetail.genre}</span>
                  </>
                )}
                {musicDetail?.duration && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span>{musicDetail.duration}</span>
                  </>
                )}
              </div>
              
              {/* Badge Single/Album + Album Link */}
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
                  {isAlbum ? 'Album' : 'Single'}
                </span>
                {isSingle && musicDetail?.parentAlbum && (
                  <button
                    onClick={handleGoToAlbum}
                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    Album "{musicDetail.parentAlbum.title}"
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Buttons - EXACTLY LIKE BOOKS */}
          <div className="flex space-x-3 mt-3 relative z-50" style={{ zIndex: 100000 }}>
            {/* Status Button - SAME STYLE AS BOOKS */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
              >
                <span>{formatStatusForDisplay(selectedStatus)}</span>
              </button>
              
              {/* Dropdown EXACTLY LIKE BOOKS */}
              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                  {getAvailableStatuses().map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleAddToLibrary(status.value as MediaStatus)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        selectedStatus === status.value ? 'text-purple-400 bg-purple-600/30' : 'text-gray-300'
                      } ${status.value === 'remove' ? 'text-red-400 hover:bg-red-600/20' : ''}`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Share Button - SAME STYLE AS BOOKS */}
            <button 
              onClick={() => setShowShareWithFriendsModal(true)}
              className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
            >
              <Share size={16} />
              <span>Share</span>
            </button>
          </div>

          {/* Friends who listened - EXACTLY LIKE BOOKS */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Friends who listened:</span>
                <div className="flex -space-x-1">
                  {FRIENDS_WHO_LISTENED.slice(0, 4).map((friend) => (
                    <div
                      key={friend.id}
                      className="w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                      title={friend.name}
                    >
                      {friend.name.charAt(0)}
                    </div>
                  ))}
                  {FRIENDS_WHO_LISTENED.length > 4 && (
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17]">
                      +{FRIENDS_WHO_LISTENED.length - 4}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowFriendsListModal(true)}
                className="text-gray-400 hover:text-gray-300 text-sm cursor-pointer"
              >
                View all
              </button>
            </div>
            
            {/* Customize music sheet - LIKE BOOKS */}
            <button className="text-gray-400 hover:text-gray-300 text-sm flex items-center space-x-1 cursor-pointer">
              <FileText size={14} />
              <span>Customize music sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Section - COPIED FROM BookDetailModalV3 */}
      <div className="px-6 py-4 relative z-1">
        <div className="space-y-8">
          
          {/* Rate this music section - COPY RATING LOGIC FROM BOOKS */}
          {showInlineRating && (
            <div className="mb-6 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 border border-gray-700/50">
              <h3 className="text-white font-semibold text-base mb-4">Rate this {isAlbum ? 'album' : 'song'}</h3>
              
              {/* Rating stars */}
              <div className="flex items-center space-x-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      star <= (hoverRating || userRating) 
                        ? 'text-purple-500 fill-current' 
                        : 'text-gray-600 hover:text-purple-400'
                    }`}
                    onClick={() => setUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
                {userRating > 0 && (
                  <span className="text-white ml-2 text-sm">{userRating}/5 stars</span>
                )}
              </div>

              {/* Review textarea - ONLY if rating > 0 */}
              {userRating > 0 && (
                <div className="space-y-3">
                  <textarea
                    value={userReview}
                    onChange={(e) => setUserReview(e.target.value)}
                    placeholder="Write your review... (optional)"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20 text-sm"
                  />
                  
                  {/* Privacy buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">Review privacy:</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setReviewPrivacy('private')}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            reviewPrivacy === 'private'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Private
                        </button>
                        <button
                          onClick={() => setReviewPrivacy('public')}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            reviewPrivacy === 'public'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Public
                        </button>
                      </div>
                    </div>
                    
                    {/* Save button */}
                    <button
                      onClick={handleSaveReview}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Your Review - COPY FROM BOOKS */}
          {currentUserReview && (
            <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
              {/* Header: Title + Privacy + Edit */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-white font-semibold text-base">Your review</h3>
                  <span className="text-gray-400 text-xs">({currentUserReview.is_public ? 'public' : 'private'})</span>
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
              <div className="space-y-4">
                {/* Rating stars */}
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= currentUserReview.rating ? 'text-purple-500 fill-current' : 'text-gray-600'}
                    />
                  ))}
                  <span className="text-gray-400 text-sm ml-2">{currentUserReview.rating}/5</span>
                </div>
                
                {/* Review text */}
                {currentUserReview.review_text && (
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {currentUserReview.review_text}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tabs: Overview / Videos/Photos - SAME STYLE AS GAME DETAIL */}
          <div className="mb-6">
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
                onClick={() => setActiveTab('media')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'media'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Videos/Photos
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Metacritic Score */}
              {metacriticScore?.available && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Metacritic Score</h3>
                  <div className="text-white font-medium text-lg">{metacriticScore.score}/100</div>
                </div>
              )}

              {/* Music Details */}
              <div className="space-y-2 text-sm mb-6">
                <div className="flex items-center text-gray-400">
                  <span className="w-20 flex-shrink-0">Artist:</span>
                  <span className="text-white">{musicDetail.artist}</span>
                </div>
                {musicDetail.genre && (
                  <div className="flex items-center text-gray-400">
                    <span className="w-20 flex-shrink-0">Genre:</span>
                    <span className="text-white">{musicDetail.genre}</span>
                  </div>
                )}
                {musicDetail.releaseDate && (
                  <div className="flex items-center text-gray-400">
                    <span className="w-20 flex-shrink-0">Released:</span>
                    <span className="text-white">{new Date(musicDetail.releaseDate).getFullYear()}</span>
                  </div>
                )}
                {musicDetail.duration && (
                  <div className="flex items-center text-gray-400">
                    <span className="w-20 flex-shrink-0">Duration:</span>
                    <span className="text-white">{musicDetail.duration}</span>
                  </div>
                )}
              </div>

              {/* Link to Complete Album (for singles) */}
              {isSingle && musicDetail.parentAlbum && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">From the Album</h3>
                  <button
                    onClick={() => onMusicSelect && onMusicSelect(musicDetail.parentAlbum!.id)}
                    className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors w-full text-left"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={musicDetail.image} 
                        alt={musicDetail.parentAlbum.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{musicDetail.parentAlbum.title}</p>
                      <p className="text-gray-400 text-sm">{musicDetail.artist} • {musicDetail.parentAlbum.year}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Track List (for albums) */}
              {isAlbum && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Tracklist</h3>
                  
                  {loadingTracks ? (
                    <div className="text-center text-gray-400 py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                      Loading tracks...
                    </div>
                  ) : albumTracks.length > 0 ? (
                    <div className="space-y-2">
                      {albumTracks.map((track, index) => (
                        <div key={track.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer group">
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-400 text-sm w-6 text-center font-mono">{track.trackNumber}</span>
                            <div className="flex-1">
                              <p className="text-white group-hover:text-purple-400 transition-colors">{track.name}</p>
                              <p className="text-gray-500 text-xs">{track.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {track.previewUrl && (
                              <button 
                                className="w-6 h-6 bg-purple-600/20 hover:bg-purple-600/40 rounded-full flex items-center justify-center transition-colors"
                                title="Preview"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                                  <polygon points="8,5 8,19 19,12" fill="currentColor"/>
                                </svg>
                              </button>
                            )}
                            <span className="text-gray-400 text-sm font-mono">{track.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      <p className="text-sm">No tracks found for this album</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="text-center text-gray-400 py-8">
                Videos and photos coming soon...
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="text-white text-center">
            <h2 className="text-xl font-semibold mb-2">Music not found</h2>
            <p className="text-gray-400">Unable to load music details</p>
          </div>
        </div>
      )}

      {/* Modals en dehors du contenu principal */}
      {showShareWithFriendsModal && musicDetail && (
        <ShareWithFriendsModal
          isOpen={showShareWithFriendsModal}
          onClose={() => setShowShareWithFriendsModal(false)}
          item={{
            id: musicDetail.id,
            type: 'music',
            title: musicDetail.title,
            image: musicDetail.image
          }}
        />
      )}

      {/* Friends Who Listened Modal */}
      {showFriendsListModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Friends who listened</h3>
              <button
                onClick={() => setShowFriendsListModal(false)}
                className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 80px)' }}>
              {FRIENDS_WHO_LISTENED.map((friend) => (
                <div key={friend.id} className="flex items-center space-x-3 py-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                    {friend.name.charAt(0)}
                  </div>
                  
                  {/* Friend Info */}
                  <div className="flex-1">
                    <p className="text-white font-medium">{friend.name}</p>
                    {friend.hasReview ? (
                      <div className="flex items-center space-x-1 mt-1">
                        {/* Rating stars */}
                        <div className="flex space-x-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" className="text-yellow-400">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs ml-1">• Left a review</span>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Listened recently</p>
                    )}
                  </div>
                  
                  {/* Status */}
                  <div className="text-xs text-gray-500">
                    2d ago
                  </div>
                </div>
              ))}
              
              {/* Placeholder message */}
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Reviews and ratings from friends coming soon!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share, FileText } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { musicService } from '@/services/musicService'
import { musicReviewsService, type MusicReview } from '@/services/musicReviewsService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'

interface MusicDetailModalV2Props {
  isOpen: boolean
  onClose: () => void
  albumId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  spotifyReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface AlbumDetail {
  id: string
  title: string
  artist: string
  image: string
  releaseDate: string
  genre: string
  trackCount: number
  duration: string
  label: string
  tracks: { name: string, duration: string }[]
  description: string
  rating: number
  spotifyUrl?: string
  appleMusicUrl?: string
  youtubeUrl?: string
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function MusicDetailModalV2({ 
  isOpen, 
  onClose, 
  albumId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  spotifyReviews, 
  onReviewSubmit 
}: MusicDetailModalV2Props) {
  const [albumDetail, setAlbumDetail] = useState<AlbumDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [userReview, setUserReview] = useState('')
  const [similarAlbums, setSimilarAlbums] = useState<any[]>([])
  const [artistAlbums, setArtistAlbums] = useState<any[]>([])
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingArtist, setLoadingArtist] = useState(false)
  const [similarAlbumsLoaded, setSimilarAlbumsLoaded] = useState(false)
  const [artistAlbumsLoaded, setArtistAlbumsLoaded] = useState(false)
  const [showAllTracks, setShowAllTracks] = useState(false)
  const [showLabel, setShowLabel] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [musicReviews, setMusicReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [userPublicReviews, setUserPublicReviews] = useState<UserReview[]>([])
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)
  const [showProductSheet, setShowProductSheet] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [productSheetData, setProductSheetData] = useState({
    listenDate: '',
    platform: '',
    audiophileSetup: '',
    context: '',
    friendsListenedWith: [] as any[],
    personalRating: 0,
    personalReview: '',
    favoriteTrack: '',
    mood: '',
    replayValue: '',
    location: ''
  })

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  // Mock friends data (same as in MovieDetailModalV3)
  const mockFriends = [
    { id: 1, name: 'Axel', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Maite', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Darren', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Joshua', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'Jeremy', avatar: '/api/placeholder/32/32' },
    { id: 6, name: 'Ana', avatar: '/api/placeholder/32/32' },
    { id: 7, name: 'Susete', avatar: '/api/placeholder/32/32' }
  ]

  // Mock data for similar albums and artist albums
  const mockSimilarAlbums = [
    { id: 1, title: "Random Access Memories", artist: "Daft Punk", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.5 },
    { id: 2, title: "Discovery", artist: "Daft Punk", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.8 },
    { id: 3, title: "Alive 2007", artist: "Daft Punk", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.7 },
    { id: 4, title: "Homework", artist: "Daft Punk", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.6 },
    { id: 5, title: "Human After All", artist: "Daft Punk", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.2 },
    { id: 6, title: "TRON: Legacy", artist: "Daft Punk", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.4 }
  ]

  const mockArtistAlbums = [
    { id: 1, title: "The Dark Side of the Moon", artist: "Pink Floyd", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.9 },
    { id: 2, title: "Wish You Were Here", artist: "Pink Floyd", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.8 },
    { id: 3, title: "The Wall", artist: "Pink Floyd", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.7 },
    { id: 4, title: "Animals", artist: "Pink Floyd", image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.6 }
  ]

  // Détecter si c'est mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    checkIsMobile()
  }, [])

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullDescription(false)
      setShowAllTracks(false)
      setShowLabel(false)
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
    if (isOpen && albumId && hasLoadedRef.current !== albumId) {
      hasLoadedRef.current = albumId
      fetchAlbumDetail()
    }
    if (!isOpen) {
      hasLoadedRef.current = null
    }
  }, [isOpen, albumId])

  useEffect(() => {
    const libraryItem = library.find(item => item.id === albumId)
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
    } else {
      setSelectedStatus(null)
    }
  }, [albumId, library])

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

  const fetchAlbumDetail = async () => {
    if (!albumId) return
    
    setLoading(true)
    try {
      console.log('🎵 Fetching album details for ID:', albumId)
      
      const data = await musicService.getAlbumDetails(albumId)
      setAlbumDetail(data as AlbumDetail)
      
      // Fetch reviews
      fetchReviews(albumId, data.title, data.artist)
      
      // Fetch similar albums
      if (data?.genre) {
        await fetchSimilarAlbums(data.genre)
      }
      
      // Fetch artist albums
      if (data?.artist) {
        await fetchArtistAlbums(data.artist)
      }
      
    } catch (error) {
      console.error('Error loading album details:', error)
      
      // Fallback vers les données statiques
      const { sampleContent } = require('@/data/sampleContent')
      
      // Essayer de trouver l'album correspondant dans sampleContent
      let fallbackAlbum = sampleContent.music?.find((album: any) => 
        album.id === albumId || album.id === `music-${albumId}` || album.id === albumId
      )
      
      // Si pas trouvé, utiliser le premier album comme fallback
      if (!fallbackAlbum) {
        fallbackAlbum = sampleContent.music?.[0] || {
          title: "Sample Album",
          artist: "Unknown Artist",
          year: 2024,
          rating: 4.0,
          genre: "Pop"
        }
      }
      
      // Convertir en format AlbumDetail
      setAlbumDetail({
        id: albumId,
        title: fallbackAlbum.title,
        artist: fallbackAlbum.artist,
        image: fallbackAlbum.image || "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album+Cover",
        releaseDate: `${fallbackAlbum.year || 2024}-01-01`,
        genre: fallbackAlbum.genre || "Pop",
        trackCount: 12,
        duration: "45:30",
        label: "Unknown Label",
        tracks: [
          { name: "Track 1", duration: "3:45" },
          { name: "Track 2", duration: "4:12" },
          { name: "Track 3", duration: "3:28" },
          { name: "Track 4", duration: "4:05" },
          { name: "Track 5", duration: "3:51" }
        ],
        description: `${fallbackAlbum.title} is an engaging ${fallbackAlbum.genre || 'musical'} album by ${fallbackAlbum.artist} that showcases their artistic vision and musical talents.`,
        rating: fallbackAlbum.rating || 4.0,
        spotifyUrl: "#",
        appleMusicUrl: "#",
        youtubeUrl: "#"
      })
      
      // For fallback demo data, also fetch similar albums
      await fetchSimilarAlbums(fallbackAlbum.genre || "Pop")
      await fetchArtistAlbums(fallbackAlbum.artist || "Unknown Artist")
      // Fetch reviews for mock data too
      fetchReviews(albumId, fallbackAlbum.title, fallbackAlbum.artist)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async (albumId: string, albumTitle: string, artist: string) => {
    setReviewsLoading(true)
    try {
      console.log('📝 Fetching reviews for album:', albumTitle, 'by', artist)
      
      // Fetch API reviews
      const reviewsResponse = await musicReviewsService.getMusicReviews(albumId, albumTitle, artist)
      setMusicReviews(reviewsResponse.reviews)
      console.log('📝 Loaded', reviewsResponse.reviews.length, 'API reviews')
      
      // Fetch user public reviews
      const publicReviews = await userReviewsService.getPublicReviewsForMedia(albumId)
      setUserPublicReviews(publicReviews)
      console.log('📝 Loaded', publicReviews.length, 'user public reviews')
      
      // Fetch current user's review (if any)
      const userReview = await userReviewsService.getUserReviewForMedia(albumId)
      setCurrentUserReview(userReview)
      if (userReview) {
        setUserRating(userReview.rating)
        setUserReview(userReview.review_text || '')
        console.log('📝 Found existing user review')
      }
    } catch (error) {
      console.error('📝 Error fetching reviews:', error)
      setMusicReviews([])
      setUserPublicReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchSimilarAlbums = async (genre: string) => {
    setLoadingSimilar(true)
    try {
      console.log('🎵 Fetching similar albums for genre:', genre)
      
      // For now, use mock data
      setSimilarAlbums(mockSimilarAlbums)
      setSimilarAlbumsLoaded(true)
      
    } catch (error) {
      console.error('🎵 Error fetching similar albums:', error)
      setSimilarAlbums(mockSimilarAlbums)
      setSimilarAlbumsLoaded(true)
    } finally {
      setLoadingSimilar(false)
    }
  }

  const fetchArtistAlbums = async (artistName: string) => {
    setLoadingArtist(true)
    try {
      console.log('🎵 Fetching artist albums for:', artistName)
      
      // For now, use mock data
      setArtistAlbums(mockArtistAlbums)
      setArtistAlbumsLoaded(true)
      
    } catch (error) {
      console.error('🎵 Error fetching artist albums:', error)
      setArtistAlbums(mockArtistAlbums)
      setArtistAlbumsLoaded(true)
    } finally {
      setLoadingArtist(false)
    }
  }

  const handleStatusSelect = (status: MediaStatus | 'remove') => {
    if (!albumDetail) return
    
    if (status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(albumId)
      }
      setSelectedStatus(null)
    } else {
      const albumItem = {
        id: albumId,
        title: albumDetail.title,
        image: albumDetail.image,
        category: 'music' as const,
        year: albumDetail.releaseDate ? new Date(albumDetail.releaseDate).getFullYear() : 2024,
        rating: albumDetail.rating,
        artist: albumDetail.artist
      }
      
      onAddToLibrary(albumItem, status)
      setSelectedStatus(status)
    }
    setShowLibraryDropdown(false)
  }

  const getStatusLabel = (status: MediaStatus | null) => {
    if (!status) return 'Add to Library'
    switch (status) {
      case 'want-to-play': return 'Want to Listen'
      case 'currently-playing': return 'Listening'
      case 'completed': return 'Listened'
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

  const handleSubmitReview = async () => {
    if (userRating > 0 && albumDetail) {
      // Sauvegarder dans notre nouveau système
      const savedReview = await userReviewsService.submitReview({
        mediaId: albumId,
        mediaTitle: albumDetail.title,
        mediaCategory: 'music',
        rating: userRating,
        reviewText: userReview.trim(),
        isPublic: reviewPrivacy === 'public'
      })
      
      if (savedReview) {
        console.log('✅ Review saved successfully')
        
        // Si publique, actualiser la liste des reviews publiques
        if (reviewPrivacy === 'public') {
          const updatedPublicReviews = await userReviewsService.getPublicReviewsForMedia(albumId)
          setUserPublicReviews(updatedPublicReviews)
        }
        
        // Mettre à jour l'état de la review actuelle
        setCurrentUserReview(savedReview)
      }
      
      // Appeler aussi l'ancien système si nécessaire
      onReviewSubmit({
        rating: userRating,
        review: userReview.trim(),
        privacy: reviewPrivacy
      })
      
      setShowReviewBox(false)
      // Synchroniser avec la fiche produit
      setProductSheetData(prev => ({ 
        ...prev, 
        personalReview: userReview.trim(),
        personalRating: userRating
      }))
      // Ne pas réinitialiser rating et review car l'utilisateur a maintenant une review existante
    }
  }

  // Fonctions pour la fiche produit musique
  const saveProductSheet = () => {
    if (albumDetail) {
      const data = { ...productSheetData, albumId: albumDetail.id }
      localStorage.setItem(`musicProductSheet_${albumDetail.id}`, JSON.stringify(data))
      
      // Synchroniser le rating général avec le rating de la fiche produit
      if (productSheetData.personalRating > 0) {
        setUserRating(productSheetData.personalRating)
      }
      
      // Synchroniser la review/note privée
      if (productSheetData.personalReview.trim()) {
        setUserReview(productSheetData.personalReview.trim())
      }
      
      console.log('Music product sheet saved:', data)
      setShowProductSheet(false)
    }
  }

  const loadProductSheet = () => {
    if (albumDetail) {
      const saved = localStorage.getItem(`musicProductSheet_${albumDetail.id}`)
      if (saved) {
        const data = JSON.parse(saved)
        setProductSheetData(data)
        
        // Synchroniser les données avec la section générale
        if (data.personalRating > 0) {
          setUserRating(data.personalRating)
        }
        if (data.personalReview && data.personalReview.trim()) {
          setUserReview(data.personalReview.trim())
        }
      }
    }
  }

  const isProductSheetCompleted = () => {
    if (!albumDetail) return false
    const saved = localStorage.getItem(`musicProductSheet_${albumDetail.id}`)
    if (!saved) return false
    const data = JSON.parse(saved)
    return !!(data.listenDate && data.platform && data.personalRating > 0)
  }

  // Charger la fiche produit quand l'album change
  useEffect(() => {
    if (albumDetail) {
      loadProductSheet()
    }
  }, [albumDetail])

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
        ) : albumDetail ? (
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
                  <h1 className="text-2xl font-bold text-white mb-1">{albumDetail.title}</h1>
                  <h2 className="text-lg text-[#B0B0B0] mb-2">{albumDetail.artist}</h2>
                  
                  {/* Metadata */}
                  <div className="flex items-center space-x-2 text-[#B0B0B0] text-sm">
                    <span>{albumDetail.releaseDate ? new Date(albumDetail.releaseDate).getFullYear() : 'TBA'}</span>
                    <span>•</span>
                    <span>{albumDetail.genre}</span>
                    <span>•</span>
                    <span>{albumDetail.trackCount} tracks</span>
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
                  { key: 'moreinfo' as const, label: 'My Music Card' }
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
                  {/* Album Cover */}
                  <div className="space-y-4">
                    <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden max-w-64 mx-auto">
                      <img
                        src={albumDetail.image || 'https://via.placeholder.com/400x400/1a1a1a/ffffff?text=Album+Cover'}
                        alt={`${albumDetail.title} album cover`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play size={48} className="text-white" />
                      </div>
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
                          Want to Listen
                        </button>
                        <button
                          onClick={() => handleStatusSelect('currently-playing')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Listening
                        </button>
                        <button
                          onClick={() => handleStatusSelect('completed')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Listened
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

                  {/* Product Sheet Button - Only show for currently-playing or completed */}
                  {(selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowProductSheet(true)}
                        className="py-2 px-4 rounded-lg font-medium text-white hover:opacity-90 transition flex items-center space-x-2 bg-gray-800"
                        style={isProductSheetCompleted() ? {
                          boxShadow: '0 0 0 2px #1DB954, 0 4px 8px rgba(29, 185, 84, 0.3)'
                        } : {}}
                        title="Music Sheet"
                      >
                        <FileText size={16} />
                        <span>Music Sheet</span>
                      </button>
                    </div>
                  )}

                  {/* Rate this album - Only show if Listening or Listened */}
                  {(selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Rate this album</h3>
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
                        <h4 className="text-white font-medium mb-3">Share your thoughts about this album</h4>
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

                  {/* Album Info */}
                  <div className="flex space-x-4">
                    {/* Duration */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 bg-purple-700 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{albumDetail.duration}</span>
                      </div>
                      <span className="text-[#B0B0B0] text-sm">Duration</span>
                    </div>
                    
                    {/* Tracks */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{albumDetail.trackCount}</span>
                      </div>
                      <span className="text-[#B0B0B0] text-sm">Tracks</span>
                    </div>
                  </div>

                  {/* Streaming Services */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Listen On</h3>
                    <div className="space-y-2">
                      {albumDetail.spotifyUrl && (
                        <a
                          href={albumDetail.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-white">Spotify</span>
                          </div>
                          <ChevronRight className="text-gray-400" size={20} />
                        </a>
                      )}
                      {albumDetail.appleMusicUrl && (
                        <a
                          href={albumDetail.appleMusicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-white">Apple Music</span>
                          </div>
                          <ChevronRight className="text-gray-400" size={20} />
                        </a>
                      )}
                      {albumDetail.youtubeUrl && (
                        <a
                          href={albumDetail.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-white">YouTube Music</span>
                          </div>
                          <ChevronRight className="text-gray-400" size={20} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Label/Producer */}
                  <div>
                    <button
                      onClick={() => setShowLabel(!showLabel)}
                      className="w-full text-left flex items-center justify-between text-[#B0B0B0]"
                    >
                      <span>Label: {albumDetail.label}</span>
                      <ChevronRight className={`transition-transform ${showLabel ? 'rotate-90' : ''}`} size={16} />
                    </button>
                  </div>

                  {/* Release Date */}
                  <div className="text-[#B0B0B0] text-sm">
                    Released: {albumDetail.releaseDate ? new Date(albumDetail.releaseDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'TBA'}
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-white font-medium mb-3">About</h3>
                    <div className="text-[#B0B0B0] leading-relaxed">
                      <p className={`${!showFullDescription ? 'line-clamp-3' : ''}`}>
                        {albumDetail.description || 'No description available.'}
                      </p>
                      {albumDetail.description && albumDetail.description.length > 150 && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="text-white text-sm mt-2 flex items-center space-x-1 hover:underline"
                        >
                          <span>{showFullDescription ? 'Less' : 'More'}</span>
                          <ChevronRight className={`transition-transform ${showFullDescription ? 'rotate-90' : ''}`} size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Track List */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Track List</h3>
                    <div className="space-y-2">
                      {albumDetail.tracks.slice(0, showAllTracks ? undefined : 5).map((track, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-[#B0B0B0] text-sm w-6">{index + 1}</span>
                            <span className="text-white">{track.name}</span>
                          </div>
                          <span className="text-[#B0B0B0] text-sm">{track.duration}</span>
                        </div>
                      ))}
                      {albumDetail.tracks.length > 5 && (
                        <button
                          onClick={() => setShowAllTracks(!showAllTracks)}
                          className="text-white text-sm mt-2 flex items-center space-x-1 hover:underline"
                        >
                          <span>{showAllTracks ? 'Show Less' : `Show All ${albumDetail.tracks.length} Tracks`}</span>
                          <ChevronRight className={`transition-transform ${showAllTracks ? 'rotate-90' : ''}`} size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Similar Albums */}
                  <div>
                    <h3 className="text-white font-medium mb-4">Similar Albums</h3>
                    <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                      {similarAlbums.map((album) => (
                        <div 
                          key={album.id} 
                          className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            // Ouvrir le détail de cet album
                            window.location.href = `#music-${album.id}`
                            onClose()
                          }}
                        >
                          <img
                            src={album.image || 'https://via.placeholder.com/112x112/333/fff?text=Album'}
                            alt={album.title}
                            className="w-full h-28 object-cover rounded-lg mb-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'https://via.placeholder.com/112x112/333/fff?text=Album'
                            }}
                          />
                          <p className="text-white text-sm truncate" title={album.title}>{album.title}</p>
                          <p className="text-[#B0B0B0] text-xs truncate" title={album.artist}>{album.artist}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* More from this artist */}
                  {albumDetail.artist && (
                    <div>
                      <h3 className="text-white font-medium mb-4">
                        More from {albumDetail.artist}
                      </h3>
                      {artistAlbums.length > 0 ? (
                        <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                          {artistAlbums.map((album) => (
                            <div 
                              key={album.id} 
                              className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                // Ouvrir le détail de cet album
                                window.location.href = `#music-${album.id}`
                                onClose()
                              }}
                            >
                              <img
                                src={album.image || 'https://via.placeholder.com/112x112/333/fff?text=Album'}
                                alt={album.title}
                                className="w-full h-28 object-cover rounded-lg mb-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = 'https://via.placeholder.com/112x112/333/fff?text=Album'
                                }}
                              />
                              <p className="text-white text-sm truncate" title={album.title}>{album.title}</p>
                              <p className="text-[#B0B0B0] text-xs truncate" title={album.artist}>{album.artist}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[#B0B0B0] text-sm">
                          No other albums found from this artist
                        </div>
                      )}
                    </div>
                  )}

                  {/* Genre at bottom */}
                  <div className="mt-8 pt-4 border-t border-gray-800">
                    <div className="flex justify-center">
                      <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg px-4 py-2">
                        <span className="text-[#B0B0B0] text-sm">
                          {albumDetail.genre}
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
                    <span className="text-[#B0B0B0] text-sm">
                      {musicReviews.length + userPublicReviews.length} reviews
                    </span>
                  </div>
                  
                  {/* Current user's review if exists */}
                  {currentUserReview && (
                    <div className="bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#1DB954] text-sm font-medium">Your Review</span>
                        <span className="text-[#B0B0B0] text-xs">
                          {currentUserReview.is_public ? '🌍 Public' : '🔒 Private'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={`${
                                star <= currentUserReview.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[#B0B0B0] text-xs">{currentUserReview.created_at.split('T')[0]}</span>
                      </div>
                      {currentUserReview.review_text && (
                        <p className="text-[#B0B0B0] text-sm">{currentUserReview.review_text}</p>
                      )}
                    </div>
                  )}
                  
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
                  ) : musicReviews.length > 0 || userPublicReviews.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {/* User Public Reviews First */}
                      {userPublicReviews.map((review) => (
                        <div key={review.id} className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {(review.username || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-medium text-sm">{review.username || 'Anonymous User'}</span>
                                  <span className="text-purple-400 text-xs">✓ Stackr User</span>
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
                                  <span className="text-[#B0B0B0] text-xs">{review.created_at.split('T')[0]}</span>
                                </div>
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-purple-900/50 text-purple-200 rounded text-xs font-medium">
                              User Review
                            </span>
                          </div>
                          {review.review_text && (
                            <p className="text-[#B0B0B0] text-sm leading-relaxed mb-3">
                              {review.review_text}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <button 
                              className="hover:text-white transition-colors"
                              onClick={() => userReviewsService.markReviewAsHelpful(review.id, true)}
                            >
                              👍 {review.helpful_count || 0} helpful
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* API Reviews */}
                      {musicReviews.map((review) => (
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
                              review.platform === 'spotify' ? 'bg-green-900 text-green-200' :
                              review.platform === 'apple-music' ? 'bg-gray-900 text-gray-200' :
                              review.platform === 'pitchfork' ? 'bg-red-900 text-red-200' :
                              review.platform === 'allmusic' ? 'bg-blue-900 text-blue-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {review.platform === 'spotify' ? 'Spotify' :
                               review.platform === 'apple-music' ? 'Apple Music' :
                               review.platform === 'pitchfork' ? 'Pitchfork' :
                               review.platform === 'allmusic' ? 'AllMusic' :
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
                      <p className="text-[#B0B0B0] text-sm">Be the first to review this album</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="p-4 space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-white font-medium text-lg mb-2">My Music Card</h3>
                    <p className="text-[#B0B0B0] text-sm">Track your personal music listening experience</p>
                  </div>

                  {/* Personal Music Info Form */}
                  <div className="space-y-4">
                    {/* Date Listened */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Date Listened</label>
                      <input 
                        type="date" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="When did you listen to this?"
                      />
                    </div>

                    {/* Platform Used */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Platform Used</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select platform...</option>
                        <option value="spotify">Spotify</option>
                        <option value="apple-music">Apple Music</option>
                        <option value="youtube-music">YouTube Music</option>
                        <option value="amazon-music">Amazon Music</option>
                        <option value="tidal">Tidal</option>
                        <option value="deezer">Deezer</option>
                        <option value="soundcloud">SoundCloud</option>
                        <option value="bandcamp">Bandcamp</option>
                        <option value="vinyl">Vinyl</option>
                        <option value="cd">CD</option>
                        <option value="digital-purchase">Digital Purchase</option>
                        <option value="radio">Radio</option>
                        <option value="live-concert">Live Concert</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Listening Context */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Listening Context</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select context...</option>
                        <option value="focused-listening">Focused Listening</option>
                        <option value="background">Background Music</option>
                        <option value="workout">Workout</option>
                        <option value="commute">Commute</option>
                        <option value="work-study">Work/Study</option>
                        <option value="party-social">Party/Social</option>
                        <option value="relaxation">Relaxation</option>
                        <option value="cooking">Cooking</option>
                        <option value="driving">Driving</option>
                        <option value="headphones">Headphones</option>
                        <option value="speakers">Speakers</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Favorite Track */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Favorite Track</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="Which track stood out to you?"
                      />
                    </div>

                    {/* Mood */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Mood While Listening</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="e.g., Energetic, Relaxed, Nostalgic, Motivated..."
                      />
                    </div>

                    {/* Replay Value */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Replay Value</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">How often would you listen again?</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="occasionally">Occasionally</option>
                        <option value="rarely">Rarely</option>
                        <option value="never">Never Again</option>
                      </select>
                    </div>

                    {/* Personal Notes */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Personal Notes</label>
                      <textarea 
                        rows={4}
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors resize-none"
                        placeholder="Your thoughts, memories, or notes about this album..."
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                      <button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium py-3 px-4 rounded-lg transition-colors">
                        Save Music Card
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
                <span className="text-2xl">🎵</span>
              </div>
              <p className="text-white font-medium mb-2">Album not found</p>
              <p className="text-[#B0B0B0] text-sm">Unable to load album details.</p>
            </div>
          </div>
        )}
      </div>

      {/* Music Product Sheet Modal */}
      {showProductSheet && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Music Sheet</h3>
              <button
                onClick={() => setShowProductSheet(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Album Info Header */}
            <div className="flex items-start space-x-3 mb-6 pb-4 border-b border-gray-700">
              {albumDetail?.image && (
                <img
                  src={albumDetail.image}
                  alt={albumDetail.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h4 className="text-white font-medium text-lg">{albumDetail?.title}</h4>
                <p className="text-gray-400 text-sm">{albumDetail?.artist} • {albumDetail?.releaseDate ? new Date(albumDetail.releaseDate).getFullYear() : 'TBA'}</p>
              </div>
            </div>

            {/* Personal Info Form */}
            <div className="space-y-4">
              {/* Listen Date */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Listen Date</label>
                <input
                  type={isMobile ? "month" : "date"}
                  value={productSheetData.listenDate}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, listenDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                  placeholder={isMobile ? "Select month" : "Select date"}
                />
              </div>

              {/* Platform */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Platform Used</label>
                <select 
                  value={productSheetData.platform}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                >
                  <option value="">Select...</option>
                  <option value="spotify">Spotify</option>
                  <option value="apple-music">Apple Music</option>
                  <option value="youtube-music">YouTube Music</option>
                  <option value="amazon-music">Amazon Music</option>
                  <option value="tidal">Tidal</option>
                  <option value="deezer">Deezer</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="bandcamp">Bandcamp</option>
                  <option value="vinyl">Vinyl</option>
                  <option value="cd">CD</option>
                  <option value="digital-purchase">Digital Purchase</option>
                  <option value="radio">Radio</option>
                  <option value="live-concert">Live Concert</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Audiophile Setup (when physical media is selected) */}
              {(productSheetData.platform === 'vinyl' || productSheetData.platform === 'cd') && (
                <div>
                  <label className="block text-white font-medium mb-2 text-sm">Audiophile Setup</label>
                  <select 
                    value={productSheetData.audiophileSetup}
                    onChange={(e) => setProductSheetData(prev => ({ ...prev, audiophileSetup: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                  >
                    <option value="">Select...</option>
                    <option value="turntable-basic">Basic Turntable</option>
                    <option value="turntable-high-end">High-End Turntable</option>
                    <option value="cd-player-basic">Basic CD Player</option>
                    <option value="cd-player-audiophile">Audiophile CD Player</option>
                    <option value="headphones">High-Quality Headphones</option>
                    <option value="speakers-bookshelf">Bookshelf Speakers</option>
                    <option value="speakers-floor">Floor Speakers</option>
                    <option value="studio-monitors">Studio Monitors</option>
                  </select>
                </div>
              )}

              {/* Listening Context */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Listening Context</label>
                <select 
                  value={productSheetData.context}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, context: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                >
                  <option value="">Select...</option>
                  <option value="focused-listening">Focused Listening</option>
                  <option value="background">Background Music</option>
                  <option value="workout">Workout</option>
                  <option value="commute">Commute</option>
                  <option value="work-study">Work/Study</option>
                  <option value="party-social">Party/Social</option>
                  <option value="relaxation">Relaxation</option>
                  <option value="cooking">Cooking</option>
                  <option value="driving">Driving</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Location (optional) */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Location (optional)</label>
                <input
                  type="text"
                  value={productSheetData.location}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g: At home, In car, Studio..."
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                />
              </div>

              {/* Friends Listened With */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Friends Listened With</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {mockFriends.map((friend) => {
                    const isSelected = productSheetData.friendsListenedWith.find(f => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        onClick={() => {
                          setProductSheetData(prev => ({
                            ...prev,
                            friendsListenedWith: isSelected 
                              ? prev.friendsListenedWith.filter(f => f.id !== friend.id)
                              : [...prev.friendsListenedWith, friend]
                          }))
                        }}
                        className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-gradient-to-r from-[#1DB954]/20 to-[#1ed760]/20 border border-[#1DB954]/30' : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                        {isSelected && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 bg-gradient-to-r from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Favorite Track */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Favorite Track</label>
                <input
                  type="text"
                  value={productSheetData.favoriteTrack}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, favoriteTrack: e.target.value }))}
                  placeholder="Which track stood out to you?"
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                />
              </div>

              {/* Personal Rating */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">My Rating</label>
                <div className="flex items-center space-x-2 mb-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setProductSheetData(prev => ({ ...prev, personalRating: rating }))}
                      className="p-1"
                    >
                      <Star
                        size={20}
                        className={`transition-colors ${
                          productSheetData.personalRating >= rating
                            ? 'text-[#1DB954] fill-[#1DB954]'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  {productSheetData.personalRating > 0 && (
                    <span className="text-white ml-2 font-medium text-sm">{productSheetData.personalRating}/5</span>
                  )}
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Mood While Listening</label>
                <input
                  type="text"
                  value={productSheetData.mood}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, mood: e.target.value }))}
                  placeholder="e.g: Energetic, Relaxed, Nostalgic..."
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                />
              </div>

              {/* Replay Value */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Replay Value</label>
                <select 
                  value={productSheetData.replayValue}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, replayValue: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                >
                  <option value="">How often would you listen again?</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="rarely">Rarely</option>
                  <option value="never">Never Again</option>
                </select>
              </div>

              {/* Personal Review */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">My Review</label>
                <textarea
                  value={productSheetData.personalReview}
                  onChange={(e) => {
                    setProductSheetData(prev => ({ ...prev, personalReview: e.target.value }))
                    // Synchroniser avec la review générale en temps réel
                    setUserReview(e.target.value)
                  }}
                  placeholder="My thoughts on this album..."
                  className="w-full h-24 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-[#1DB954]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowProductSheet(false)}
                className="flex-1 py-2 px-4 text-gray-400 text-sm font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProductSheet}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
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
'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share, ExternalLink, Calendar, Music, Award, Users, Globe, HeadphonesIcon, Clock, Check } from 'lucide-react'
import { musicService, formatTrackCount, formatPrice, formatDuration } from '@/services/musicService'
import { fetchWithCache, apiCache } from '@/utils/apiCache'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface MusicDetailModalProps {
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
  collectionId: number
  collectionName: string
  artistName: string
  artworkUrl100?: string
  artworkUrl600?: string
  releaseDate?: string
  primaryGenreName?: string
  trackCount?: number
  copyright?: string
  collectionPrice?: number
  currency?: string
  country?: string
  collectionViewUrl?: string
  artistViewUrl?: string
  collectionType?: string
  description?: string
  tracks?: any[]
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function MusicDetailModal({ 
  isOpen, 
  onClose, 
  albumId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  spotifyReviews, 
  onReviewSubmit 
}: MusicDetailModalProps) {
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
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingArtist, setLoadingArtist] = useState(false)
  const [similarAlbumsLoaded, setSimilarAlbumsLoaded] = useState(false)
  const [artistAlbumsLoaded, setArtistAlbumsLoaded] = useState(false)
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [albumTracks, setAlbumTracks] = useState<any[]>([])

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  const albumStats = {
    'want-to-play': 1845,
    'currently-playing': 623,
    'completed': 4312
  }

  // Mock data for similar albums and artist albums
  const mockSimilarAlbums = [
    { id: 1, name: "Dark Side of the Moon", artist: "Pink Floyd", image: "https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937", rating: 4.9 },
    { id: 2, name: "OK Computer", artist: "Radiohead", image: "https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856", rating: 4.8 },
    { id: 3, name: "The Wall", artist: "Pink Floyd", image: "https://i.scdn.co/image/ab67616d0000b2735d48e2f56d691f9a4e4b0bdf", rating: 4.7 },
    { id: 4, name: "Wish You Were Here", artist: "Pink Floyd", image: "https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe", rating: 4.8 },
    { id: 5, name: "Kid A", artist: "Radiohead", image: "https://i.scdn.co/image/ab67616d0000b273976b0a29766e5ef6a87c3f31", rating: 4.6 },
    { id: 6, name: "In Rainbows", artist: "Radiohead", image: "https://i.scdn.co/image/ab67616d0000b273ba4c5bf0a44d72427119dd75", rating: 4.7 }
  ]

  const mockArtistAlbums = [
    { id: 1, name: "The Bends", artist: "Radiohead", image: "https://i.scdn.co/image/ab67616d0000b273dc30583ba717007b00cceb25", rating: 4.4 },
    { id: 2, name: "Hail to the Thief", artist: "Radiohead", image: "https://i.scdn.co/image/ab67616d0000b273616a5eeecb6dc4c555ddc456", rating: 4.2 },
    { id: 3, name: "A Moon Shaped Pool", artist: "Radiohead", image: "https://i.scdn.co/image/ab67616d0000b2737ea4cf5be6981d43ad8d3bb4", rating: 4.3 },
    { id: 4, name: "King of Limbs", artist: "Radiohead", image: "https://i.scdn.co/image/ab67616d0000b273f4543c8ff7ae9b1bf2c12c10", rating: 3.8 }
  ]

  // Spotify/Apple Music Reviews mockées pour fallback
  const mockSpotifyReviews = [
    { id: 1, username: 'MusicLover2024', rating: 5, text: 'Absolute masterpiece! Every track is perfection.', date: '2024-01-15', platform: 'Spotify' },
    { id: 2, username: 'VinylCollector', rating: 5, text: 'Classic album that never gets old. Essential listening.', date: '2024-01-12', platform: 'Apple Music' },
    { id: 3, username: 'AudiophileMax', rating: 4, text: 'Great production quality and timeless songs.', date: '2024-01-10', platform: 'Spotify' },
    { id: 4, username: 'IndieRockFan', rating: 5, text: 'Revolutionized alternative rock. Iconic.', date: '2024-01-08', platform: 'Apple Music' },
    { id: 5, username: 'CriticalListener', rating: 4, text: 'Solid album with amazing atmosphere and songwriting.', date: '2024-01-05', platform: 'Spotify' }
  ]

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
      setShowAllGenres(false)
      setShowLibraryDropdown(false)
      setSimilarAlbumsLoaded(false)
      setArtistAlbumsLoaded(false)
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

    if (showLibraryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLibraryDropdown])

  const fetchAlbumDetail = async () => {
    if (!albumId) return
    
    setLoading(true)
    try {
      let iTunesId = albumId
      
      if (albumId.startsWith('music-')) {
        iTunesId = albumId.replace('music-', '')
      }
      
      console.log('🎵 Fetching album details for ID:', iTunesId)
      
      // ✅ Utiliser le cache pour l'appel principal
      const cacheKey = `album-detail-${iTunesId}`
      const data = await musicService.getAlbumDetails(iTunesId)
      setAlbumDetail(data as AlbumDetail)
      
      console.log('🎵 Album detail fetched:', data)
      
      // Reset les états de chargement
      setSimilarAlbumsLoaded(false)
      setArtistAlbumsLoaded(false)
      
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
      setAlbumDetail(null)
    } finally {
      setLoading(false)
    }
  }

  // ✅ LAZY LOADING: Charger les albums similaires à la demande
  const loadSimilarAlbums = async () => {
    if (loadingSimilar || similarAlbumsLoaded || !albumDetail) return
    
    setLoadingSimilar(true)
    try {
      console.log('🎵 Loading similar albums...')
      // Utiliser les données mockées pour une expérience fluide
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulation de chargement
      setSimilarAlbums(mockSimilarAlbums)
      setSimilarAlbumsLoaded(true)
    } catch (error) {
      console.error('Error loading similar albums:', error)
      setSimilarAlbums(mockSimilarAlbums) // Fallback sur les données mockées
    } finally {
      setLoadingSimilar(false)
    }
  }

  // ✅ LAZY LOADING: Charger les autres albums de l'artiste à la demande  
  const loadArtistAlbums = async () => {
    if (loadingArtist || artistAlbumsLoaded || !albumDetail) return
    
    setLoadingArtist(true)
    try {
      console.log('🎵 Loading artist albums...')
      // Utiliser les données mockées pour une expérience fluide
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulation de chargement
      setArtistAlbums(mockArtistAlbums)
      setArtistAlbumsLoaded(true)
    } catch (error) {
      console.error('Error loading artist albums:', error)
      setArtistAlbums(mockArtistAlbums) // Fallback sur les données mockées
    } finally {
      setLoadingArtist(false)
    }
  }

  // ✅ GESTION MODERNE DU STATUT BIBLIOTHÈQUE
  const handleStatusSelect = (status: MediaStatus) => {
    if (!albumDetail) return
    
    const albumForLibrary = {
      id: albumId,
      title: albumDetail.collectionName,
      artist: albumDetail.artistName,
      year: albumDetail.releaseDate ? new Date(albumDetail.releaseDate).getFullYear() : new Date().getFullYear(),
      image: albumDetail.artworkUrl600 || albumDetail.artworkUrl100,
      category: 'music' as const,
      genre: albumDetail.primaryGenreName,
      tracks: albumDetail.trackCount
    }
    
    onAddToLibrary(albumForLibrary, status)
    setSelectedStatus(status)
    setShowLibraryDropdown(false)
  }

  const handleRemoveFromLibrary = () => {
    if (onDeleteItem && selectedStatus) {
      onDeleteItem(albumId)
      setSelectedStatus(null)
      setShowLibraryDropdown(false)
    }
  }


  const getStatusLabel = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'Want to Listen'
      case 'currently-playing': return 'Listening'
      case 'completed': return 'Listened'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'bg-orange-500 hover:bg-orange-600'
      case 'currently-playing': return 'bg-green-500 hover:bg-green-600'
      case 'completed': return 'bg-blue-500 hover:bg-blue-600'
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'dropped': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-[#1a1a1a] rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-[#1a1a1a]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : albumDetail ? (
          <div className="flex h-full">
            {/* Left Panel - Album Info */}
            <div className="flex-1 flex flex-col">
              {/* Header with close button */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                    {musicService.getBestImageURL(albumDetail as any, 'medium') ? (
                      <img
                        src={musicService.getBestImageURL(albumDetail as any, 'medium')!}
                        alt={albumDetail.collectionName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                        🎵
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">{musicService.cleanAlbumName(albumDetail.collectionName)}</h1>
                    <p className="text-lg text-gray-300">{albumDetail.artistName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Hero Section */}
                <div className="relative">
                  <div className="h-64 bg-gradient-to-r from-orange-600 to-red-600 relative overflow-hidden">
                    {musicService.getBestImageURL(albumDetail as any, 'large') && (
                      <img
                        src={musicService.getBestImageURL(albumDetail as any, 'large')!}
                        alt={albumDetail.collectionName}
                        className="w-full h-full object-cover opacity-30"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                  </div>
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-end space-x-6">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl bg-gray-800 border-4 border-gray-700">
                        {musicService.getBestImageURL(albumDetail as any, 'large') ? (
                          <img
                            src={musicService.getBestImageURL(albumDetail as any, 'large')!}
                            alt={albumDetail.collectionName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                            🎵
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h1 className="text-4xl font-bold text-white mb-2">{musicService.cleanAlbumName(albumDetail.collectionName)}</h1>
                        <p className="text-xl text-gray-300 mb-3">{albumDetail.artistName}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                          {albumDetail.releaseDate && (
                            <span>{new Date(albumDetail.releaseDate).getFullYear()}</span>
                          )}
                          {albumDetail.trackCount && (
                            <>
                              <span>•</span>
                              <span>{formatTrackCount(albumDetail.trackCount)}</span>
                            </>
                          )}
                          {albumDetail.primaryGenreName && (
                            <>
                              <span>•</span>
                              <span>{albumDetail.primaryGenreName}</span>
                            </>
                          )}
                        </div>

                        {/* Library Actions */}
                        <div className="flex items-center space-x-3">
                          <div className="relative" ref={libraryDropdownRef}>
                            <button
                              onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2 ${
                                selectedStatus
                                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                  : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                              }`}
                            >
                              <Check size={18} />
                              <span>{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                              <ChevronDown size={16} />
                            </button>

                            {showLibraryDropdown && (
                              <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 min-w-48">
                                {(['want-to-play', 'currently-playing', 'completed', 'paused', 'dropped'] as const).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusSelect(status)}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-700 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                                      selectedStatus === status ? 'text-orange-500 bg-gray-700' : 'text-gray-300'
                                    }`}
                                  >
                                    {getStatusLabel(status)}
                                  </button>
                                ))}
                                {selectedStatus && (
                                  <>
                                    <div className="border-t border-gray-700 my-1" />
                                    <button
                                      onClick={handleRemoveFromLibrary}
                                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700 transition-colors rounded-b-xl"
                                    >
                                      Remove from Library
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <button className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors border border-gray-700">
                            <Share size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-800 px-6">
                  <div className="flex space-x-8">
                    {(['overview', 'reviews', 'moreinfo'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 text-sm font-medium transition-colors relative ${
                          activeTab === tab
                            ? 'text-orange-500'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {tab === 'overview' && 'Overview'}
                        {tab === 'reviews' && 'Reviews'}
                        {tab === 'moreinfo' && 'More Info'}
                        
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      {/* Album Stats */}
                      <div className="grid grid-cols-3 gap-6">
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                          <div className="text-2xl font-bold text-orange-500 mb-1">{albumStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Want to Listen</div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                          <div className="text-2xl font-bold text-green-500 mb-1">{albumStats['currently-playing'].toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Listening</div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                          <div className="text-2xl font-bold text-blue-500 mb-1">{albumStats.completed.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Completed</div>
                        </div>
                      </div>

                      {/* Album Details */}
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">Album Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Release Date</div>
                            <div className="text-white">{albumDetail.releaseDate ? new Date(albumDetail.releaseDate).toLocaleDateString() : 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Genre</div>
                            <div className="text-white">{albumDetail.primaryGenreName || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Tracks</div>
                            <div className="text-white">{albumDetail.trackCount ? formatTrackCount(albumDetail.trackCount) : 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Country</div>
                            <div className="text-white">{albumDetail.country || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Similar Albums */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-white">Similar Albums</h3>
                          {!similarAlbumsLoaded && (
                            <button
                              onClick={loadSimilarAlbums}
                              disabled={loadingSimilar}
                              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 text-sm"
                            >
                              {loadingSimilar ? 'Loading...' : 'Show Similar'}
                            </button>
                          )}
                        </div>

                        {similarAlbumsLoaded && (
                          <div className="grid grid-cols-3 gap-4">
                            {similarAlbums.slice(0, 6).map((album, index) => (
                              <div key={index} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                                <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-700">
                                  <img
                                    src={album.image}
                                    alt={album.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <h4 className="font-medium text-white text-sm mb-1 truncate">{album.name}</h4>
                                <p className="text-xs text-gray-400 truncate">{album.artist}</p>
                                <div className="flex items-center mt-2">
                                  <Star size={12} className="text-yellow-500 mr-1" />
                                  <span className="text-xs text-gray-400">{album.rating}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Artist Albums */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-white">More by {albumDetail.artistName}</h3>
                          {!artistAlbumsLoaded && (
                            <button
                              onClick={loadArtistAlbums}
                              disabled={loadingArtist}
                              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 text-sm"
                            >
                              {loadingArtist ? 'Loading...' : 'Show More'}
                            </button>
                          )}
                        </div>

                        {artistAlbumsLoaded && (
                          <div className="grid grid-cols-4 gap-4">
                            {artistAlbums.map((album, index) => (
                              <div key={index} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                                <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-700">
                                  <img
                                    src={album.image}
                                    alt={album.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <h4 className="font-medium text-white text-sm mb-1 truncate">{album.name}</h4>
                                <div className="flex items-center">
                                  <Star size={12} className="text-yellow-500 mr-1" />
                                  <span className="text-xs text-gray-400">{album.rating}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="space-y-6">
                      {/* Review Form */}
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">Write a Review</h3>
                        
                        {/* Rating */}
                        <div className="flex items-center space-x-4 mb-4">
                          <span className="text-gray-400">Your rating:</span>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setUserRating(star)}
                                className="transition-colors"
                              >
                                <Star
                                  size={20}
                                  className={`${
                                    star <= (hoverRating || userRating)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          {userRating > 0 && (
                            <span className="text-yellow-500 text-sm">({userRating}/5)</span>
                          )}
                        </div>

                        {/* Privacy Toggle */}
                        <div className="flex items-center space-x-4 mb-4">
                          <span className="text-gray-400">Privacy:</span>
                          <div className="flex bg-gray-700 rounded-lg p-1">
                            <button
                              onClick={() => setReviewPrivacy('private')}
                              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                                reviewPrivacy === 'private'
                                  ? 'bg-gray-600 text-white'
                                  : 'text-gray-400 hover:text-gray-300'
                              }`}
                            >
                              Private
                            </button>
                            <button
                              onClick={() => setReviewPrivacy('public')}
                              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                                reviewPrivacy === 'public'
                                  ? 'bg-gray-600 text-white'
                                  : 'text-gray-400 hover:text-gray-300'
                              }`}
                            >
                              Public
                            </button>
                          </div>
                        </div>

                        {/* Review Text */}
                        <textarea
                          value={userReview}
                          onChange={(e) => setUserReview(e.target.value)}
                          placeholder="Share your thoughts about this album..."
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          rows={4}
                        />

                        <button
                          onClick={handleSubmitReview}
                          disabled={!userRating || !userReview.trim()}
                          className="mt-4 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                        >
                          <Send size={16} />
                          <span>Submit Review</span>
                        </button>
                      </div>

                      {/* Reviews List */}
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Community Reviews</h3>
                        <div className="space-y-4">
                          {(spotifyReviews.length > 0 ? spotifyReviews : mockSpotifyReviews).map((review) => (
                            <div key={review.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">{review.username[0]}</span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">{review.username}</div>
                                    <div className="text-xs text-gray-400">{review.platform}</div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        size={14}
                                        className={`${
                                          i < review.rating
                                            ? 'text-yellow-500 fill-yellow-500'
                                            : 'text-gray-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <p className="text-gray-300 leading-relaxed">{review.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'moreinfo' && (
                    <div className="space-y-6">
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">Technical Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Collection Type</div>
                            <div className="text-white">{albumDetail.collectionType || 'Album'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Copyright</div>
                            <div className="text-white text-sm">{albumDetail.copyright || 'N/A'}</div>
                          </div>
                          {albumDetail.collectionPrice && (
                            <div>
                              <div className="text-sm text-gray-400 mb-1">Price</div>
                              <div className="text-white">{formatPrice(albumDetail.collectionPrice, albumDetail.currency || 'USD')}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Duration</div>
                            <div className="text-white">{albumDetail.trackCount ? formatDuration(albumDetail.trackCount) : 'Unknown'}</div>
                          </div>
                        </div>
                      </div>

                      {/* External Links */}
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">External Links</h3>
                        <div className="space-y-3">
                          {albumDetail.collectionViewUrl && (
                            <a
                              href={albumDetail.collectionViewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              <ExternalLink size={18} className="text-gray-400" />
                              <span className="text-white">View on iTunes</span>
                            </a>
                          )}
                          {albumDetail.artistViewUrl && (
                            <a
                              href={albumDetail.artistViewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              <ExternalLink size={18} className="text-gray-400" />
                              <span className="text-white">Artist on iTunes</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 bg-[#1a1a1a]">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                <span className="text-2xl">🎵</span>
              </div>
              <p className="text-lg font-medium text-white mb-2">Album not found</p>
              <p className="text-sm text-gray-400">Unable to load album details. Please try again.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
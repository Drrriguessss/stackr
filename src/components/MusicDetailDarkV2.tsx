'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share, Music, Calendar, User, Clock } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface MusicDetailDarkV2Props {
  isOpen: boolean
  onClose: () => void
  albumId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  googleReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface MusicDetail {
  id: string
  collectionName: string
  artistName: string
  artworkUrl100: string
  artworkUrl600?: string
  releaseDate: string
  primaryGenreName: string
  country?: string
  trackCount?: number
  collectionPrice?: number
  currency?: string
  collectionExplicitness?: string
  previewUrl?: string
  collectionViewUrl?: string
  description?: string
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function MusicDetailDarkV2({ 
  isOpen, 
  onClose, 
  albumId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  googleReviews, 
  onReviewSubmit 
}: MusicDetailDarkV2Props) {
  const [albumDetail, setAlbumDetail] = useState<MusicDetail | null>(null)
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
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [albumReviews, setAlbumReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Mock data for similar albums and artist albums
  const mockSimilarAlbums = [
    { id: 1, title: "Random Access Memories", artist: "Daft Punk", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=RAM", rating: 4.7 },
    { id: 2, title: "Discovery", artist: "Daft Punk", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=Discovery", rating: 4.8 },
    { id: 3, title: "Cross", artist: "Justice", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=Cross", rating: 4.6 },
    { id: 4, title: "In Return", artist: "ODESZA", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=In+Return", rating: 4.5 },
  ]

  const mockArtistAlbums = [
    { id: 1, title: "Homework", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=Homework", rating: 4.5, year: "1997" },
    { id: 2, title: "Human After All", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=Human+After+All", rating: 4.2, year: "2005" },
    { id: 3, title: "Alive 2007", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=Alive+2007", rating: 4.9, year: "2007" },
    { id: 4, title: "TRON: Legacy", image: "https://via.placeholder.com/200x200/1a1a1a/white?text=TRON+Legacy", rating: 4.4, year: "2010" }
  ]

  // Mock tracklist
  const mockTracklist = [
    { id: 1, title: "Give Life Back to Music", duration: "4:20" },
    { id: 2, title: "The Game of Love", duration: "5:22" },
    { id: 3, title: "Giorgio by Moroder", duration: "9:04" },
    { id: 4, title: "Within", duration: "3:48" },
    { id: 5, title: "Instant Crush", duration: "5:37" },
    { id: 6, title: "Lose Yourself to Dance", duration: "5:53" },
    { id: 7, title: "Touch", duration: "8:18" },
    { id: 8, title: "Get Lucky", duration: "6:07" },
  ]

  // Ref pour éviter les appels API multiples
  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAlbumDetail = async () => {
    if (!albumId) return
    
    setLoading(true)
    try {
      // Utiliser les données de fallback statiques pour le moment
      const { sampleContent } = require('@/data/sampleContent')
      
      let fallbackAlbum = sampleContent.music.find((album: any) => 
        album.id === albumId || album.id === `music-${albumId}` || albumId.includes(album.id.toString())
      )
      
      if (!fallbackAlbum) {
        fallbackAlbum = sampleContent.music[0]
      }

      setAlbumDetail({
        id: fallbackAlbum.id,
        collectionName: fallbackAlbum.title,
        artistName: fallbackAlbum.artist || 'Unknown Artist',
        artworkUrl100: fallbackAlbum.image,
        artworkUrl600: fallbackAlbum.image,
        releaseDate: fallbackAlbum.year || '2023',
        primaryGenreName: fallbackAlbum.genre || 'Electronic',
        country: 'US',
        trackCount: Math.floor(Math.random() * 15) + 8,
        collectionPrice: 9.99,
        currency: 'USD',
        collectionExplicitness: 'notExplicit',
        previewUrl: undefined,
        collectionViewUrl: '#',
        description: fallbackAlbum.description || 'Un album exceptionnel qui marque une nouvelle ère musicale avec ses compositions innovantes et sa production impeccable.'
      })

      setSimilarAlbums(mockSimilarAlbums)
      setArtistAlbums(mockArtistAlbums)
      
    } catch (error) {
      console.error('Error loading album details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToLibrary = (status: MediaStatus) => {
    if (!albumDetail) return

    const libraryItem = {
      id: albumDetail.id,
      title: albumDetail.collectionName,
      image: albumDetail.artworkUrl600 || albumDetail.artworkUrl100,
      category: 'music' as const,
      status,
      rating: userRating || undefined,
      addedAt: new Date().toISOString(),
      artist: albumDetail.artistName,
      year: albumDetail.releaseDate,
      genre: albumDetail.primaryGenreName
    }

    onAddToLibrary(libraryItem, status)
    setSelectedStatus(status)
    setShowLibraryDropdown(false)
  }

  const handleStatusUpdate = (newStatus: MediaStatus) => {
    setSelectedStatus(newStatus)
    setShowLibraryDropdown(false)
  }

  const handlePlayPreview = () => {
    if (audioRef.current && albumDetail?.previewUrl) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const getStatusColor = (status: MediaStatus | null): string => {
    switch (status) {
      case 'want-to-listen': return 'bg-blue-600 hover:bg-blue-700'
      case 'currently-listening': return 'bg-yellow-600 hover:bg-yellow-700'  
      case 'completed': return 'bg-green-600 hover:bg-green-700'
      case 'on-hold': return 'bg-orange-600 hover:bg-orange-700'
      case 'dropped': return 'bg-red-600 hover:bg-red-700'
      default: return 'bg-[#1DB954] hover:bg-green-700'
    }
  }

  const getStatusLabel = (status: MediaStatus | null): string => {
    switch (status) {
      case 'want-to-listen': return 'Want to Listen'
      case 'currently-listening': return 'Currently Listening'
      case 'completed': return 'Listened'
      case 'on-hold': return 'On Hold'
      case 'dropped': return 'Dropped'
      default: return 'Add to Library'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).getFullYear().toString()
  }

  const getTotalDuration = () => {
    const totalMinutes = mockTracklist.reduce((acc, track) => {
      const [minutes, seconds] = track.duration.split(':').map(Number)
      return acc + minutes + (seconds / 60)
    }, 0)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.floor(totalMinutes % 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <Music className="w-6 h-6 text-[#1DB954]" />
            <h2 className="text-xl font-bold text-white">Album Details</h2>
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
              { key: 'moreinfo' as const, label: 'My Album Card' }
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
          ) : albumDetail ? (
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Hero Section */}
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={albumDetail.artworkUrl600 || albumDetail.artworkUrl100}
                        alt={albumDetail.collectionName}
                        className="w-64 h-64 object-cover rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x400/1a1a1a/white?text=Album+Cover'
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div>
                        <h1 className="text-4xl font-bold text-white mb-2">{albumDetail.collectionName}</h1>
                        <div className="flex items-center space-x-4 text-gray-300 mb-4">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {albumDetail.artistName}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(albumDetail.releaseDate)}
                          </span>
                          <span className="flex items-center">
                            <Music className="w-4 h-4 mr-1" />
                            {albumDetail.primaryGenreName}
                          </span>
                        </div>
                      </div>

                      {/* Play Button and Add to Library */}
                      <div className="flex items-center space-x-4">
                        {albumDetail.previewUrl && (
                          <button
                            onClick={handlePlayPreview}
                            className="bg-[#1DB954] hover:bg-green-600 text-white p-3 rounded-full transition-colors"
                          >
                            <Play className={`w-6 h-6 ${isPlaying ? 'animate-pulse' : ''}`} />
                          </button>
                        )}

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
                              {(['want-to-listen', 'currently-listening', 'completed', 'on-hold', 'dropped'] as MediaStatus[]).map((status) => (
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
                      </div>

                      {/* Album Info Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tracks:</span>
                            <span className="text-white">{albumDetail.trackCount || mockTracklist.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white">{getTotalDuration()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Country:</span>
                            <span className="text-white">{albumDetail.country || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Price:</span>
                            <span className="text-white">
                              {albumDetail.collectionPrice ? `${albumDetail.collectionPrice} ${albumDetail.currency}` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Explicit:</span>
                            <span className="text-white">
                              {albumDetail.collectionExplicitness === 'explicit' ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">About this album</h3>
                    <div className="text-gray-300 leading-relaxed">
                      {showFullOverview || (albumDetail.description && albumDetail.description.length <= 500)
                        ? albumDetail.description
                        : `${albumDetail.description?.slice(0, 500)}...`
                      }
                      {albumDetail.description && albumDetail.description.length > 500 && (
                        <button
                          onClick={() => setShowFullOverview(!showFullOverview)}
                          className="ml-2 text-[#1DB954] hover:text-green-400 font-medium"
                        >
                          {showFullOverview ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tracklist */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Tracklist</h3>
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                      {mockTracklist.map((track, index) => (
                        <div key={track.id} className="flex items-center justify-between p-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                            <span className="text-white">{track.title}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-400 text-sm">{track.duration}</span>
                            <button className="text-gray-500 hover:text-white transition-colors">
                              <Play className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Similar Albums */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Similar Albums</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {similarAlbums.map((album) => (
                        <div key={album.id} className="group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={album.image}
                              alt={album.title}
                              className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/200x200/1a1a1a/white?text=Album+Cover'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="mt-2">
                            <h4 className="text-white font-medium truncate">{album.title}</h4>
                            <p className="text-gray-400 text-sm truncate">{album.artist}</p>
                            <div className="flex items-center mt-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-white text-sm ml-1">{album.rating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Artist's Other Albums */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">More by {albumDetail.artistName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {artistAlbums.map((album) => (
                        <div key={album.id} className="group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={album.image}
                              alt={album.title}
                              className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/200x200/1a1a1a/white?text=Album+Cover'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="mt-2">
                            <h4 className="text-white font-medium truncate">{album.title}</h4>
                            <p className="text-gray-400 text-sm">{album.year}</p>
                            <div className="flex items-center mt-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-white text-sm ml-1">{album.rating}</span>
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
                  <h3 className="text-2xl font-bold text-white">Listener Reviews</h3>
                  <div className="bg-gray-900 rounded-lg p-4 text-center">
                    <Music className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">Reviews feature coming soon...</p>
                  </div>
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">My Album Card</h3>
                  <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Listening Status
                        </label>
                        <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#1DB954] focus:border-transparent">
                          <option value="want-to-listen">Want to Listen</option>
                          <option value="currently-listening">Currently Listening</option>
                          <option value="completed">Listened</option>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Personal Notes
                      </label>
                      <textarea
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
                        rows={4}
                        placeholder="What did you think about this album?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Favorite Track
                      </label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#1DB954] focus:border-transparent">
                        <option value="">Select a track...</option>
                        {mockTracklist.map((track) => (
                          <option key={track.id} value={track.title}>
                            {track.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Audio Element */}
        {albumDetail?.previewUrl && (
          <audio
            ref={audioRef}
            src={albumDetail.previewUrl}
            onEnded={() => setIsPlaying(false)}
            onError={() => setIsPlaying(false)}
          />
        )}
      </div>
    </div>
  )
}
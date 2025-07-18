'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Calendar, Music, Award, Users, Globe, Play, HeadphonesIcon, Clock, Check } from 'lucide-react'
import { musicService, formatTrackCount, formatPrice, formatDuration } from '@/services/musicService'
import { idsMatch } from '@/utils/idNormalizer'
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
}

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
  const [activeTab, setActiveTab] = useState<'info' | 'social' | 'more'>('info')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [similarAlbums, setSimilarAlbums] = useState<any[]>([])
  const [artistAlbums, setArtistAlbums] = useState<any[]>([])

  const scrollableRef = useRef<HTMLDivElement>(null)

  const albumStats = {
    'want-to-play': 1845,
    'currently-playing': 623,
    'completed': 4312
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab('info')
      setSimilarAlbums([])
      setArtistAlbums([])
    }
  }, [isOpen, albumId])

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
    if (isOpen && albumId) {
      fetchAlbumDetail()
    }
  }, [isOpen, albumId])

  // 🔧 CORRECTION PRINCIPALE: Utiliser idsMatch pour détecter le statut
  useEffect(() => {
    console.log('🎵 DEBUG MusicModal:')
    console.log('  albumId:', albumId)
    console.log('  library IDs:', library.map(item => item.id))
    console.log('  looking for match with albumId:', albumId)
    
    // Essayer plusieurs formats d'ID pour trouver l'item
    const possibleIds = [
      albumId,
      `music-${albumId}`,
      albumId.startsWith('music-') ? albumId.replace('music-', '') : `music-${albumId}`
    ]
    
    console.log('  possibleIds:', possibleIds)
    
    let libraryItem = null
    for (const id of possibleIds) {
      libraryItem = library.find(item => idsMatch(item.id, id))
      if (libraryItem) {
        console.log('  ✅ Found match with ID:', id, 'library item:', libraryItem)
        break
      }
    }
    
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
      console.log('  status set to:', libraryItem.status)
    } else {
      setSelectedStatus(null)
      console.log('  ❌ no library item found - status set to null')
    }
  }, [albumId, library])

  const fetchAlbumDetail = async () => {
    if (!albumId) return
    
    setLoading(true)
    try {
      let iTunesId = albumId
      
      // Si l'ID commence par 'music-', le retirer
      if (albumId.startsWith('music-')) {
        iTunesId = albumId.replace('music-', '')
      }
      
      console.log('🎵 Fetching album details for ID:', iTunesId)
      
      const data = await musicService.getAlbumDetails(iTunesId)
      setAlbumDetail(data as AlbumDetail)
      
      console.log('🎵 Album detail fetched:', data)
      
      // Charger des albums similaires et de l'artiste
      if (data) {
        if (data.primaryGenreName) {
          await fetchSimilarAlbums(data)
        }
        if (data.artistName) {
          await fetchArtistAlbums(data.artistName, data.collectionId)
        }
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
      setAlbumDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchSimilarAlbums = async (album: AlbumDetail) => {
    try {
      const similarAlbumsData = await musicService.getSimilarAlbums(album as any, 6)
      const convertedAlbums = similarAlbumsData.map(album => musicService.convertToAppFormat(album))
      setSimilarAlbums(convertedAlbums)
    } catch (error) {
      console.error('Error fetching similar albums:', error)
      setSimilarAlbums([])
    }
  }

  const fetchArtistAlbums = async (artist: string, excludeAlbumId: number) => {
    try {
      const artistAlbumsData = await musicService.getAlbumsByArtist(artist, 8)
      const filteredAlbums = artistAlbumsData
        .filter(album => album.collectionId !== excludeAlbumId)
        .slice(0, 6)
        .map(album => musicService.convertToAppFormat(album))
      
      setArtistAlbums(filteredAlbums)
    } catch (error) {
      console.error('Error fetching artist albums:', error)
      setArtistAlbums([])
    }
  }

  // 🔧 CORRECTION: Créer un ID cohérent pour la bibliothèque
  const handleStatusSelect = (status: MediaStatus) => {
    if (!albumDetail) return
    
    // Créer un ID normalisé
    const normalizedId = albumId.startsWith('music-') 
      ? albumId 
      : `music-${albumDetail.collectionId}`
    
    console.log('🔧 Adding album to library:')
    console.log('  albumDetail.collectionId:', albumDetail.collectionId)
    console.log('  albumId:', albumId)
    console.log('  normalizedId:', normalizedId)
    
    const albumItem = {
      id: normalizedId,
      title: albumDetail.collectionName,
      image: musicService.getBestImageURL(albumDetail as any, 'medium'),
      category: 'music' as const,
      year: albumDetail.releaseDate ? new Date(albumDetail.releaseDate).getFullYear() : new Date().getFullYear(),
      rating: 0,
      artist: albumDetail.artistName
    }
    
    console.log('  final albumItem:', albumItem)
    onAddToLibrary(albumItem, status)
    setSelectedStatus(status)
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
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
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
        ) : albumDetail ? (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 p-2 hover:bg-white/80 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="p-6 flex items-center space-x-4">
                <div className="w-20 h-20 rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-gray-100 flex-shrink-0">
                  {musicService.getBestImageURL(albumDetail as any, 'medium') ? (
                    <img
                      src={musicService.getBestImageURL(albumDetail as any, 'medium')!}
                      alt={albumDetail.collectionName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🎵
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{musicService.cleanAlbumName(albumDetail.collectionName)}</h1>
                  <h2 className="text-lg text-gray-600 mb-2">{albumDetail.artistName}</h2>
                  
                  <div className="flex items-center space-x-4 mb-2">
                    {albumDetail.releaseDate && (
                      <span className="text-gray-600 text-sm">
                        {new Date(albumDetail.releaseDate).getFullYear()}
                      </span>
                    )}
                    {albumDetail.trackCount && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-600 text-sm">{formatTrackCount(albumDetail.trackCount)}</span>
                      </>
                    )}
                    {albumDetail.primaryGenreName && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-600 text-sm">{albumDetail.primaryGenreName}</span>
                      </>
                    )}
                  </div>
                  
                  {albumDetail.trackCount && (
                    <div className="text-sm text-gray-600">
                      {formatDuration(albumDetail.trackCount)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {/* Action buttons avec possibilité de décocher */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex space-x-3 mb-4">
                  {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        // Si déjà sélectionné, on retire de la bibliothèque
                        if (selectedStatus === status) {
                          if (onDeleteItem) {
                            // 🔧 CORRECTION: Utiliser l'ID cohérent
                            const idToDelete = albumId.startsWith('music-') 
  ? albumId 
  : `music-${albumId}`
                            console.log('🗑️ Removing from library with ID:', idToDelete)
                            onDeleteItem(idToDelete)
                          }
                          setSelectedStatus(null)
                        } else {
                          // Ajouter/Modifier le statut
                          handleStatusSelect(status)
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all shadow-sm ${
                        selectedStatus === status
                          ? `${getStatusColor(status)} ring-2 ring-blue-300 text-white`
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
                            {albumStats[status].toLocaleString()} listeners
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Message d'état */}
                {selectedStatus ? (
                  <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <span>✅ Added to your library as "{getStatusLabel(selectedStatus)}"</span>
                    <button 
                      onClick={() => {
                        if (onDeleteItem) {
                          const idToDelete = albumId.startsWith('music-') 
                            ? albumId 
                            : `music-${albumDetail.collectionId}`
                          onDeleteItem(idToDelete)
                        }
                        setSelectedStatus(null)
                      }}
                      className="text-red-600 hover:text-red-800 text-sm underline"
                    >
                      Remove from library
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    💡 Click a status to add this album to your library
                  </div>
                )}

                {/* User rating */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-gray-900 font-semibold mb-3">Rate this album</h4>
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
                        placeholder="What did you think about this album?"
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

              {/* Reviews Section */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-gray-900 font-semibold mb-4">Recent Reviews</h3>
                <div className="flex space-x-4 overflow-x-auto pb-2">
                  {/* User reviews first */}
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
                  
                  {/* Spotify reviews */}
                  {spotifyReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm">🎵</span>
                        </div>
                        <span className="text-gray-900 text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-full font-medium">Music Community</span>
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

              {/* Tabs */}
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

              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Artist</h5>
                        <p className="text-gray-600 text-sm">
                          {albumDetail.artistName}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Release Date</h5>
                        <p className="text-gray-600 text-sm">
                          {albumDetail.releaseDate ? new Date(albumDetail.releaseDate).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Genre</h5>
                        <p className="text-gray-600 text-sm">
                          {albumDetail.primaryGenreName || 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Tracks</h5>
                        <p className="text-gray-600 text-sm">
                          {albumDetail.trackCount ? formatTrackCount(albumDetail.trackCount) : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {albumDetail.copyright && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-3">Copyright</h4>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <p className="text-gray-700 text-sm">
                            {albumDetail.copyright}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'social' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Listening Stats</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-orange-600">{albumStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-orange-700 font-medium">Want to Listen</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-green-600">{albumStats['currently-playing'].toLocaleString()}</div>
                          <div className="text-sm text-green-700 font-medium">Listening</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-blue-600">{albumStats['completed'].toLocaleString()}</div>
                          <div className="text-sm text-blue-700 font-medium">Listened</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Album Type</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <Music size={20} className="text-purple-600" />
                          <span className="font-medium text-purple-900">
                            {albumDetail.collectionType || 'Album'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">External Links</h4>
                      <div className="space-y-3">
                        {albumDetail.collectionViewUrl && (
                          <a 
                            href={albumDetail.collectionViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on iTunes
                          </a>
                        )}

                        {albumDetail.artistViewUrl && (
                          <a
                            href={albumDetail.artistViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <Users size={16} />
                            <span>Artist Page</span>
                            <ExternalLink size={12} />
                          </a>
                        )}

                        <a 
                          href={`https://open.spotify.com/search/${encodeURIComponent(albumDetail.artistName + ' ' + albumDetail.collectionName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                        >
                          <Play className="w-4 h-4" />
                          Search on Spotify
                        </a>
                      </div>
                    </div>

                    {/* More from Artist */}
                    {artistAlbums.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">
                          More from {albumDetail.artistName}
                        </h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {artistAlbums.map((album) => (
                            <div key={album.id} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                              {album.image && (
                                <img
                                  src={album.image}
                                  alt={album.title}
                                  className="w-full h-20 object-cover rounded-lg mb-2 border border-gray-100"
                                />
                              )}
                              <h5 className="text-sm font-medium text-gray-900 truncate mb-1" title={album.title}>
                                {album.title}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                <span className="text-xs text-gray-600">{album.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Similar Albums */}
                    {similarAlbums.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">Similar Albums</h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {similarAlbums.map((album) => (
                            <div key={album.id} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                              {album.image && (
                                <img
                                  src={album.image}
                                  alt={album.title}
                                  className="w-full h-20 object-cover rounded-lg mb-2 border border-gray-100"
                                />
                              )}
                              <h5 className="text-sm font-medium text-gray-900 truncate mb-1" title={album.title}>
                                {album.title}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                <span className="text-xs text-gray-600">{album.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Info */}
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Additional Information</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">Country:</span>
                            <span className="text-gray-600">
                              {albumDetail.country || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">Duration:</span>
                            <span className="text-gray-600">
                              {albumDetail.trackCount ? formatDuration(albumDetail.trackCount) : 'Unknown'}
                            </span>
                          </div>
                          {albumDetail.collectionPrice && (
                            <div className="flex justify-between col-span-2">
                              <span className="font-medium text-gray-900">Price:</span>
                              <span className="text-gray-600 text-right">
                                {formatPrice(albumDetail.collectionPrice, albumDetail.currency || 'USD')}
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
              <span className="text-2xl">🎵</span>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">Album not found</p>
            <p className="text-sm">Unable to load album details. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
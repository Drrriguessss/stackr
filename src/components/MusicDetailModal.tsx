'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Calendar, Music, Award, Users, Globe, Play, HeadphonesIcon } from 'lucide-react'
import { musicService, formatTrackCount, formatPrice, formatDuration } from '@/services/musicService'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface MusicDetailModalProps {
  isOpen: boolean
  onClose: () => void
  albumId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
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

  useEffect(() => {
    const libraryItem = library.find(item => item.id === `music-${albumId}`)
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
    } else {
      setSelectedStatus(null)
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
      
      const data = await musicService.getAlbumDetails(iTunesId)
      setAlbumDetail(data as AlbumDetail)
      
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

  const handleStatusSelect = (status: MediaStatus) => {
    if (!albumDetail) return
    
    const albumItem = {
      id: `music-${albumDetail.collectionId}`,
      title: albumDetail.collectionName,
      image: musicService.getBestImageURL(albumDetail as any, 'medium'),
      category: 'music' as const,
      year: albumDetail.releaseDate ? new Date(albumDetail.releaseDate).getFullYear() : new Date().getFullYear(),
      rating: 0,
      artist: albumDetail.artistName
    }
    
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

            {/* Rest of the modal content would continue here... */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-center text-gray-500">
                <Music size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Album detail content would go here...</p>
                <p className="text-sm mt-2">Similar to BookDetailModal structure</p>
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
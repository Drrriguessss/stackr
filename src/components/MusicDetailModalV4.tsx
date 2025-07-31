'use client'
import { useState, useEffect } from 'react'
import { X, Star, Play, ChevronLeft, ChevronRight, Share, FileText, ArrowRight } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import type { MusicDetailData } from '@/types/musicTypes'
import { musicServiceV2 } from '@/services/musicServiceV2'
import { musicFunFactsService, type FunFact } from '@/services/musicFunFactsService'

interface MusicDetailModalV4Props {
  isOpen: boolean
  onClose: () => void
  musicId: string // Format: 'track-123' ou 'album-456'
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onMusicSelect?: (musicId: string) => void
}

export default function MusicDetailModalV4({
  isOpen,
  onClose,
  musicId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onMusicSelect
}: MusicDetailModalV4Props) {
  const [musicDetail, setMusicDetail] = useState<MusicDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [musicVideo, setMusicVideo] = useState<{ url: string; provider: string } | null>(null)
  const [youtubeWatchUrl, setYoutubeWatchUrl] = useState<string | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [albumTracks, setAlbumTracks] = useState<any[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  
  // États pour le partage et les reviews
  const [showShareModal, setShowShareModal] = useState(false)
  const [showMoreShareOptions, setShowMoreShareOptions] = useState(false)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [showProductSheet, setShowProductSheet] = useState(false)
  const [productSheetData, setProductSheetData] = useState({
    listenDate: '',
    platform: '',
    friendsListened: [] as any[],
    personalRating: 0,
    personalReview: '',
    location: '',
    mood: ''
  })
  
  // États pour les Fun Facts
  const [funFacts, setFunFacts] = useState<FunFact[]>([])
  const [loadingFunFacts, setLoadingFunFacts] = useState(false)

  // Déterminer le type de contenu
  const contentType = musicId.startsWith('track-') ? 'single' : 'album'
  const isAlbum = contentType === 'album'
  const isSingle = contentType === 'single'

  useEffect(() => {
    if (isOpen && musicId) {
      fetchMusicDetail()
    }
  }, [isOpen, musicId])

  const fetchMusicDetail = async () => {
    if (!musicId) return
    
    setLoading(true)
    
    // 🔄 RESET des états vidéo pour éviter les fuites de la chanson précédente
    setMusicVideo(null)
    setYoutubeWatchUrl(null)
    setActiveImageIndex(0)
    
    try {
      console.log(`🎵 [V4] Fetching ${contentType} details for:`, musicId)
      
      let data: MusicDetailData | null = null
      
      if (isAlbum) {
        data = await musicServiceV2.getAlbumDetails(musicId)
      } else {
        data = await musicServiceV2.getTrackDetails(musicId)
      }
      
      if (data) {
        console.log(`🎵 [V4] ✅ ${contentType} data loaded:`, data)
        setMusicDetail(data)
        
        // Charger images d'abord
        await loadImages(data.image)
        
        // Puis charger vidéo avec les BONNES données (pas le state)
        await loadMusicVideo(data)
        
        // Si c'est un album, charger la liste des chansons
        if (isAlbum) {
          await loadAlbumTracks(musicId, data.title, data.artist)
        }
        
        // Charger les Fun Facts
        await loadFunFacts(data.artist, data.title)
      } else {
        throw new Error(`No ${contentType} data received`)
      }
      
    } catch (error) {
      console.error(`🎵 [V4] Error loading ${contentType}:`, error)
      setMusicDetail(null)
    }
    
    setLoading(false)
  }

  const loadMusicVideo = async (musicData?: MusicDetailData) => {
    console.log(`🎬 [V4] Loading video for ${contentType}`)
    
    // Utiliser les données passées en paramètre ou le state
    const currentMusicDetail = musicData || musicDetail
    
    // Albums n'ont JAMAIS de vidéos (photos uniquement)
    if (isAlbum) {
      console.log(`🎬 [V4] 📸 Album detected - no video, photos only`)
      setMusicVideo(null)
      setYoutubeWatchUrl(null)
      return
    }
    
    // Singles: utiliser le nouveau service d'embed
    if (!currentMusicDetail?.artist || !currentMusicDetail?.title) {
      console.log(`🎬 [V4] Missing artist/title info for video search`)
      setMusicVideo(null)
      return
    }
    
    try {
      console.log(`🎬 [V4] Getting embed URL for: "${currentMusicDetail.title}" by ${currentMusicDetail.artist}`)
      
      // Utiliser le nouveau service d'embed qui FONCTIONNE
      const { musicVideoEmbedService } = await import('../services/musicVideoEmbedService')
      const videoData = await musicVideoEmbedService.getMusicVideoEmbed(
        currentMusicDetail.artist, 
        currentMusicDetail.title
      )
      
      console.log(`🎬 [V4] Embed service response:`, videoData)
      
      if (videoData.embedUrl) {
        console.log(`🎬 [V4] ✅ Got embed URL: ${videoData.embedUrl}`)
        
        // Définir directement l'URL d'embed qui fonctionne
        setMusicVideo({
          url: videoData.embedUrl,
          provider: 'youtube'
        })
        setYoutubeWatchUrl(videoData.watchUrl)
      } else {
        console.log(`🎬 [V4] 🔗 No embed available, using watch link`)
        setMusicVideo(null)
        setYoutubeWatchUrl(videoData.watchUrl)
      }
      
    } catch (error) {
      console.error(`🎬 [V4] Video embed service failed:`, error)
      
      // Fallback: lien de recherche YouTube
      const searchQuery = encodeURIComponent(`${currentMusicDetail.artist} ${currentMusicDetail.title} official video`)
      const fallbackUrl = `https://www.youtube.com/results?search_query=${searchQuery}`
      
      console.log(`🎬 [V4] 🔗 Using fallback YouTube search`)
      setMusicVideo(null)
      setYoutubeWatchUrl(fallbackUrl)
    }
  }
  
  // 🎬 MÉTHODE SIMPLE COMME DANS MOVIE: Pas de tests complexes

  const loadAlbumTracks = async (albumId: string, albumTitle: string, artistName: string) => {
    console.log(`🎵 [V4] Loading tracks for album: ${albumTitle}`)
    setLoadingTracks(true)
    
    try {
      const cleanId = albumId.replace('album-', '')
      
      // Récupérer toutes les chansons de l'album via l'API iTunes
      const response = await fetch(
        `/api/itunes?endpoint=lookup&id=${cleanId}&entity=song`,
        { signal: AbortSignal.timeout(8000) }
      )
      
      if (!response.ok) {
        throw new Error(`Album tracks lookup failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        // Filtrer pour ne garder que les chansons (pas l'album lui-même)
        const tracks = data.results.filter((item: any) => 
          item.wrapperType === 'track' && 
          item.kind === 'song' &&
          item.artistName.toLowerCase() === artistName.toLowerCase()
        )
        
        // Trier par numéro de piste
        tracks.sort((a: any, b: any) => (a.trackNumber || 0) - (b.trackNumber || 0))
        
        console.log(`🎵 [V4] Found ${tracks.length} tracks for album`)
        setAlbumTracks(tracks)
      } else {
        console.log(`🎵 [V4] No tracks found for album`)
        setAlbumTracks([])
      }
      
    } catch (error) {
      console.error(`🎵 [V4] Error loading album tracks:`, error)
      setAlbumTracks([])
    }
    
    setLoadingTracks(false)
  }

  const loadFunFacts = async (artist: string, title: string) => {
    console.log(`🎭 [V4] Loading fun facts for: "${title}" by ${artist}`)
    setLoadingFunFacts(true)
    setFunFacts([])
    
    try {
      const factsData = await musicFunFactsService.getFunFacts(artist, title, isAlbum)
      
      if (factsData.facts && factsData.facts.length > 0) {
        console.log(`🎭 [V4] Found ${factsData.facts.length} fun facts`)
        setFunFacts(factsData.facts)
      } else {
        console.log(`🎭 [V4] No fun facts found`)
        setFunFacts([])
      }
      
    } catch (error) {
      console.error(`🎭 [V4] Error loading fun facts:`, error)
      setFunFacts([])
    }
    
    setLoadingFunFacts(false)
  }

  const handleExternalShare = (platform: string) => {
    if (!musicDetail) return
    
    const mediaType = isAlbum ? 'album' : 'song'
    const text = `Check out this ${mediaType}: "${musicDetail.title}" by ${musicDetail.artist}`
    const musicUrl = `${window.location.origin}/music/${musicDetail.id}`
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${musicUrl}`)}`)
        break
      case 'imessage':
        window.open(`sms:&body=${encodeURIComponent(`${text} ${musicUrl}`)}`)
        break
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(`Music Recommendation: ${musicDetail.title}`)}&body=${encodeURIComponent(`${text}\n\n${musicUrl}`)}`)
        break
      case 'copy':
        navigator.clipboard.writeText(`${text} ${musicUrl}`)
        alert('Link copied to clipboard!')
        break
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${musicUrl}`)}`)
        break
      case 'native':
        if (navigator.share) {
          navigator.share({
            title: `Music Recommendation: ${musicDetail.title}`,
            text: text,
            url: musicUrl
          })
        }
        break
    }
  }

  const handleRatingClick = (rating: number) => {
    setUserRating(rating)
    setProductSheetData(prev => ({ ...prev, personalRating: rating }))
    setShowReviewBox(true)
  }

  const handleReviewSubmit = () => {
    // TODO: Sauvegarder la review dans un service
    console.log('Review submitted:', {
      rating: userRating,
      review: userReview,
      privacy: reviewPrivacy,
      musicId: musicDetail?.id
    })
    
    setProductSheetData(prev => ({ 
      ...prev, 
      personalReview: userReview.trim() 
    }))
    
    setShowReviewBox(false)
  }

  const saveProductSheet = () => {
    if (musicDetail) {
      const data = { ...productSheetData, musicId: musicDetail.id }
      localStorage.setItem(`musicProductSheet_${musicDetail.id}`, JSON.stringify(data))
      
      if (productSheetData.personalRating > 0) {
        setUserRating(productSheetData.personalRating)
      }
      
      if (productSheetData.personalReview.trim()) {
        setUserReview(productSheetData.personalReview.trim())
      }
      
      console.log('Music product sheet saved:', data)
      setShowProductSheet(false)
    }
  }

  const loadProductSheet = () => {
    if (musicDetail) {
      const saved = localStorage.getItem(`musicProductSheet_${musicDetail.id}`)
      if (saved) {
        const data = JSON.parse(saved)
        setProductSheetData(data)
        
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
    if (!musicDetail) return false
    const saved = localStorage.getItem(`musicProductSheet_${musicDetail.id}`)
    if (!saved) return false
    const data = JSON.parse(saved)
    return !!(data.listenDate && data.platform && data.personalRating > 0)
  }

  // Mock friends data
  const mockFriends = [
    { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Maite', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Darren', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Joshua', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'Jeremy', avatar: '/api/placeholder/32/32' },
    { id: 6, name: 'Ana', avatar: '/api/placeholder/32/32' }
  ]

  // Charger la fiche produit quand la musique change
  useEffect(() => {
    if (musicDetail) {
      loadProductSheet()
    }
  }, [musicDetail])

  const loadImages = async (mainImage: string) => {
    console.log(`🖼️ [V4] Loading images for ${contentType}`)
    
    // L'API iTunes ne fournit qu'une seule image (la couverture)
    // On utilise la meilleure résolution disponible
    const bestQualityImage = mainImage.replace(/\d+x\d+/, '1000x1000')
    
    console.log(`🖼️ [V4] Using single album cover image: ${bestQualityImage}`)
    
    // On ne met qu'une seule image pour éviter les duplicatas
    setImages([bestQualityImage])
  }

  const handleGoToAlbum = () => {
    if (isSingle && musicDetail?.parentAlbum && onMusicSelect) {
      onMusicSelect(musicDetail.parentAlbum.id)
    }
  }

  const handleAddToLibrary = (status: MediaStatus) => {
    if (!musicDetail) return
    
    const libraryItem = {
      id: musicDetail.id,
      title: musicDetail.title,
      artist: musicDetail.artist,
      image: musicDetail.image,
      category: 'music' as const,
      year: musicDetail.releaseDate ? new Date(musicDetail.releaseDate).getFullYear() : 2024,
      rating: musicDetail.rating || 4.0,
      type: musicDetail.type
    }
    
    onAddToLibrary(libraryItem, status)
    setSelectedStatus(status)
    setShowStatusDropdown(false)
  }

  const nextImage = () => {
    const hasVideoSlot = musicVideo || youtubeWatchUrl
    const totalItems = (hasVideoSlot ? 1 : 0) + images.length
    setActiveImageIndex((prev) => (prev + 1) % totalItems)
  }

  const prevImage = () => {
    const hasVideoSlot = musicVideo || youtubeWatchUrl
    const totalItems = (hasVideoSlot ? 1 : 0) + images.length
    setActiveImageIndex((prev) => (prev - 1 + totalItems) % totalItems)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-white">Loading {contentType}...</div>
          </div>
        ) : musicDetail ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
                
                <div className="flex items-center gap-3 pr-12">
                  <h1 className="text-3xl font-bold text-white">{musicDetail.title}</h1>
                  {/* Badge Type */}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    isAlbum 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {isAlbum ? 'Album' : 'Single'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3 mt-2 text-gray-400">
                  <span className="text-lg">{musicDetail.artist}</span>
                  <span>•</span>
                  <span>{musicDetail.releaseDate ? new Date(musicDetail.releaseDate).getFullYear() : 'TBA'}</span>
                  <span>•</span>
                  <span>{musicDetail.genre}</span>
                  {musicDetail.duration && (
                    <>
                      <span>•</span>
                      <span>{musicDetail.duration}</span>
                    </>
                  )}
                  {musicDetail.trackCount && (
                    <>
                      <span>•</span>
                      <span>{musicDetail.trackCount} tracks</span>
                    </>
                  )}
                </div>
                
                {/* Lien vers album parent pour les singles */}
                {isSingle && musicDetail.parentAlbum && (
                  <button
                    onClick={handleGoToAlbum}
                    className="flex items-center gap-2 mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    From the album "{musicDetail.parentAlbum.title}" ({musicDetail.parentAlbum.year})
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Media Section - Video + Images Carousel */}
            <div className="space-y-4 mb-6">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {musicVideo && activeImageIndex === 0 ? (
                  <iframe
                    src={musicVideo.url}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    title="Music Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  />
                ) : youtubeWatchUrl && activeImageIndex === 0 ? (
                  <div className="relative w-full h-full">
                    {/* Image de fond */}
                    {images.length > 0 && (
                      <img
                        src={images[0]}
                        alt={musicDetail?.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Overlay avec bouton Watch on YouTube */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <a
                        href={youtubeWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg text-white transition-colors"
                      >
                        <Play size={20} />
                        Watch on YouTube
                      </a>
                    </div>
                  </div>
                ) : images.length > 0 ? (
                  <img
                    src={images[musicVideo ? activeImageIndex - 1 : activeImageIndex]}
                    alt={`${musicDetail.title} image`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      <div className="text-5xl mb-2">🎵</div>
                      <p>No media available</p>
                      {youtubeWatchUrl && (
                        <a
                          href={youtubeWatchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-blue-400 hover:text-blue-300 underline"
                        >
                          Search on YouTube
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Navigation arrows */}
                {((musicVideo || youtubeWatchUrl ? 1 : 0) + images.length > 1) && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Media thumbnails */}
              {((musicVideo || youtubeWatchUrl ? 1 : 0) + images.length > 1) && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {(musicVideo || youtubeWatchUrl) && (
                    <button
                      onClick={() => setActiveImageIndex(0)}
                      className={`flex-shrink-0 w-16 h-10 rounded overflow-hidden border-2 ${
                        activeImageIndex === 0 ? 'border-green-500' : 'border-transparent'
                      }`}
                    >
                      <div className="w-full h-full bg-red-600 flex items-center justify-center">
                        {musicVideo ? (
                          <Play size={12} className="text-white" />
                        ) : (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  )}
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(musicVideo ? index + 1 : index)}
                      className={`flex-shrink-0 w-16 h-10 rounded overflow-hidden border-2 ${
                        activeImageIndex === (musicVideo ? index + 1 : index) ? 'border-green-500' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${musicDetail.title} thumbnail`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedStatus
                      ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white border-0'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {selectedStatus || 'Add to Library'}
                </button>
                
                {showStatusDropdown && (
                  <div className="absolute top-full mt-2 bg-gray-800 rounded-lg shadow-lg z-10 min-w-48">
                    {isAlbum ? (
                      <>
                        <button
                          onClick={() => handleAddToLibrary('want-to-listen')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 first:rounded-t-lg"
                        >
                          Want to Listen
                        </button>
                        <button
                          onClick={() => handleAddToLibrary('listened')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 last:rounded-b-lg"
                        >
                          Listened
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAddToLibrary('want-to-listen')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 first:rounded-t-lg"
                        >
                          Want to Hear
                        </button>
                        <button
                          onClick={() => handleAddToLibrary('listened')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 last:rounded-b-lg"
                        >
                          Heard
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowShareModal(true)}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Share size={20} />
                <span>Share</span>
              </button>
              
              {/* Product Sheet Button - Only show for listened */}
              {selectedStatus === 'listened' && (
                <button
                  onClick={() => setShowProductSheet(true)}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  style={isProductSheetCompleted() ? {
                    boxShadow: '0 0 0 2px #10B981, 0 4px 8px rgba(16, 185, 129, 0.3)'
                  } : {}}
                  title="Music Sheet"
                >
                  <FileText size={20} />
                </button>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                {isAlbum ? 'About this Album' : 'About this Song'}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {musicDetail.description}
              </p>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">Rating</h3>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`${
                      star <= Math.floor(musicDetail.rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
                <span className="text-white ml-2">
                  {(musicDetail.rating || 0).toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            {/* User Rating & Review */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">Your Rating</h3>
              <div className="flex items-center space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1"
                  >
                    <Star
                      size={24}
                      className={`transition-colors ${
                        star <= (hoverRating || userRating)
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
                <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-white font-medium mb-3">Share your thoughts about this {isAlbum ? 'album' : 'song'}</h4>
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => setReviewPrivacy('private')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        reviewPrivacy === 'private'
                          ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white border-0'
                          : 'bg-transparent text-gray-400 border border-gray-700'
                      }`}
                    >
                      Private Note
                    </button>
                    <button
                      onClick={() => setReviewPrivacy('public')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        reviewPrivacy === 'public'
                          ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white border-0'
                          : 'bg-transparent text-gray-400 border border-gray-700'
                      }`}
                    >
                      Share publicly
                    </button>
                  </div>
                  <textarea
                    value={userReview}
                    onChange={(e) => {
                      setUserReview(e.target.value)
                      setProductSheetData(prev => ({ 
                        ...prev, 
                        personalReview: e.target.value 
                      }))
                    }}
                    placeholder="Optional: Add your thoughts..."
                    className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-gray-600"
                  />
                  <div className="flex justify-between items-center mt-3">
                    <button
                      onClick={() => setShowReviewBox(false)}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReviewSubmit}
                      className="px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tracklist pour les albums */}
            {isAlbum && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-3">Tracklist</h3>
                {loadingTracks ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-400">Loading tracks...</div>
                  </div>
                ) : albumTracks.length > 0 ? (
                  <div className="space-y-2">
                    {albumTracks.map((track: any) => (
                      <button
                        key={track.trackId}
                        onClick={() => onMusicSelect && onMusicSelect(`track-${track.trackId}`)}
                        className="w-full text-left p-3 bg-gray-800 hover:bg-gradient-to-r hover:from-[#10B981]/10 hover:to-[#34D399]/10 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-400 text-sm w-6">
                              {track.trackNumber || '-'}
                            </span>
                            <div>
                              <div className="text-white group-hover:text-[#10B981] transition-colors">
                                {track.trackName}
                              </div>
                              {track.trackTimeMillis && (
                                <div className="text-gray-400 text-sm">
                                  {Math.floor(track.trackTimeMillis / 60000)}:
                                  {String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}
                                </div>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-gray-400 group-hover:text-[#10B981] transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    No tracks found for this album
                  </div>
                )}
              </div>
            )}

            {/* Fun Facts Section */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">Fun Facts</h3>
              {loadingFunFacts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-400">Loading fun facts...</div>
                </div>
              ) : funFacts.length > 0 ? (
                <div className="space-y-4">
                  {funFacts.map((fact, index) => (
                    <div 
                      key={index}
                      className="p-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border-l-4 border-l-[#10B981]"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {fact.type === 'trivia' && <span className="text-2xl">💡</span>}
                          {fact.type === 'chart' && <span className="text-2xl">📈</span>}
                          {fact.type === 'recording' && <span className="text-2xl">🎙️</span>}
                          {fact.type === 'inspiration' && <span className="text-2xl">✨</span>}
                          {fact.type === 'collaboration' && <span className="text-2xl">🤝</span>}
                          {fact.type === 'award' && <span className="text-2xl">🏆</span>}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">{fact.title}</h4>
                          <p className="text-gray-300 text-sm leading-relaxed">{fact.description}</p>
                          {fact.source && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500 italic">Source: {fact.source}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-4xl mb-2">🎭</div>
                  <p>No fun facts available for this {isAlbum ? 'album' : 'song'}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-white">
            <div className="text-xl mb-2">Content not found</div>
            <div className="text-gray-400">This {contentType} is not available.</div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Share "{musicDetail?.title}"</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* More Options Toggle */}
            <div className="text-center mb-4">
              <button
                onClick={() => setShowMoreShareOptions(!showMoreShareOptions)}
                className="text-gray-400 hover:text-white text-sm underline"
              >
                More sharing options
              </button>
            </div>

            {/* External Share Section */}
            {showMoreShareOptions && (
              <div className="border-t border-gray-700 pt-4 mb-6">
                <h4 className="text-white font-medium mb-3">Share externally</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExternalShare('whatsapp')}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#25D366]/20 border border-[#25D366]/30 rounded-lg hover:bg-[#25D366]/30 transition-colors"
                  >
                    <span>💬</span>
                    <span className="text-white text-sm">WhatsApp</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('imessage')}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg hover:bg-[#007AFF]/30 transition-colors"
                  >
                    <span>💬</span>
                    <span className="text-white text-sm">iMessage</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('email')}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <span>📧</span>
                    <span className="text-white text-sm">Email</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('copy')}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <span>📋</span>
                    <span className="text-white text-sm">Copy Link</span>
                  </button>
                  
                  <button
                    onClick={() => handleExternalShare('twitter')}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 rounded-lg hover:bg-[#1DA1F2]/30 transition-colors"
                  >
                    <span>🐦</span>
                    <span className="text-white text-sm">Twitter</span>
                  </button>
                  
                  {navigator.share && (
                    <button
                      onClick={() => handleExternalShare('native')}
                      className="flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-[#FF6A00]/20 to-[#FFB347]/20 border border-[#FF6A00]/30 rounded-lg hover:bg-gradient-to-r hover:from-[#FF6A00]/30 hover:to-[#FFB347]/30 transition-colors"
                    >
                      <span>📱</span>
                      <span className="text-white text-sm">Share</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Sheet Modal */}
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

            {/* Music Info Header */}
            <div className="flex items-start space-x-3 mb-6 pb-4 border-b border-gray-700">
              <img
                src={musicDetail?.image}
                alt={musicDetail?.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h4 className="text-white font-medium text-base">{musicDetail?.title}</h4>
                <p className="text-gray-400 text-sm">{musicDetail?.artist}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    isAlbum 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {isAlbum ? 'Album' : 'Single'}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Info Form */}
            <div className="space-y-4">
              {/* Listen Date */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Listen Date</label>
                <input
                  type="date"
                  value={productSheetData.listenDate}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, listenDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Platform</label>
                <select 
                  value={productSheetData.platform}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#10B981]"
                >
                  <option value="">Select...</option>
                  <option value="spotify">Spotify</option>
                  <option value="apple-music">Apple Music</option>
                  <option value="youtube-music">YouTube Music</option>
                  <option value="amazon-music">Amazon Music</option>
                  <option value="deezer">Deezer</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="tidal">Tidal</option>
                  <option value="vinyl">Vinyl</option>
                  <option value="cd">CD</option>
                  <option value="radio">Radio</option>
                  <option value="live">Live Performance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Location (optional)</label>
                <input
                  type="text"
                  value={productSheetData.location}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g: At home, In car, Concert hall..."
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              {/* Mood */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Mood</label>
                <select 
                  value={productSheetData.mood}
                  onChange={(e) => setProductSheetData(prev => ({ ...prev, mood: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#10B981]"
                >
                  <option value="">Select mood...</option>
                  <option value="happy">😊 Happy</option>
                  <option value="sad">😢 Sad</option>
                  <option value="energetic">⚡ Energetic</option>
                  <option value="relaxed">😌 Relaxed</option>
                  <option value="nostalgic">🎭 Nostalgic</option>
                  <option value="focused">🎯 Focused</option>
                  <option value="romantic">💕 Romantic</option>
                  <option value="melancholic">🌧️ Melancholic</option>
                  <option value="party">🎉 Party</option>
                  <option value="workout">💪 Workout</option>
                </select>
              </div>

              {/* Friends Listened With */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Friends Present</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {mockFriends.map((friend) => {
                    const isSelected = productSheetData.friendsListened.find(f => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        onClick={() => {
                          setProductSheetData(prev => ({
                            ...prev,
                            friendsListened: isSelected 
                              ? prev.friendsListened.filter(f => f.id !== friend.id)
                              : [...prev.friendsListened, friend]
                          }))
                        }}
                        className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-gradient-to-r from-[#10B981]/20 to-[#34D399]/20 border border-[#10B981]/30' : 'hover:bg-gray-700'
                        }`}
                      >
                        <img src={friend.avatar} alt={friend.name} className="w-8 h-8 rounded-full" />
                        <span className="text-white text-sm">{friend.name}</span>
                      </button>
                    )
                  })}
                </div>
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
                            ? 'text-[#10B981] fill-[#10B981]'
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

              {/* Personal Review */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">My Review</label>
                <textarea
                  value={productSheetData.personalReview}
                  onChange={(e) => {
                    setProductSheetData(prev => ({ ...prev, personalReview: e.target.value }))
                    setUserReview(e.target.value)
                  }}
                  placeholder={`My thoughts on this ${isAlbum ? 'album' : 'song'}...`}
                  className="w-full h-24 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-[#10B981]"
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
                className="flex-1 py-2 px-4 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
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
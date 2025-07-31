'use client'
import { useState, useEffect } from 'react'
import { X, Star, Play, ChevronLeft, ChevronRight, Share, FileText, ArrowRight } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import type { MusicDetailData } from '@/types/musicTypes'
import { musicServiceV2 } from '@/services/musicServiceV2'

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

  const loadImages = async (mainImage: string) => {
    console.log(`🖼️ [V4] Loading images for ${contentType}`)
    
    // Image principale avec plusieurs résolutions
    const imageList = [
      mainImage,
      mainImage.replace('400x400', '600x600'),
      mainImage.replace('400x400', '800x800'),
      mainImage.replace('400x400', '1000x1000')
    ]
    
    // Pour les albums ou singles sans vidéo, ajouter des images supplémentaires
    if (isAlbum || !musicDetail?.youtubeVideoId) {
      console.log(`🖼️ [V4] Adding extra images for better photo carousel`)
      
      // Ajouter des variantes d'images
      const extraImages = [
        mainImage.replace('400x400', '300x300'),
        mainImage.replace('400x400', '500x500'),
        // Essayer d'autres formats iTunes si disponibles
        mainImage.replace('100x100', '400x400'),
        mainImage.replace('60x60', '400x400')
      ]
      
      // Filtrer les doublons et ajouter
      extraImages.forEach(img => {
        if (!imageList.includes(img)) {
          imageList.push(img)
        }
      })
    }
    
    console.log(`🖼️ [V4] Loaded ${imageList.length} images`)
    setImages(imageList)
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
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800">
                    <div className="text-center text-white p-8">
                      <div className="text-6xl mb-4">▶️</div>
                      <h3 className="text-xl font-bold mb-2">Watch on YouTube</h3>
                      <p className="text-red-100 mb-4 text-sm">
                        Click to search and watch this song
                      </p>
                      <a
                        href={youtubeWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-lg font-medium hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        Open YouTube
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
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
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
              
              <button className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <Share size={20} />
              </button>
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
          </div>
        ) : (
          <div className="p-8 text-center text-white">
            <div className="text-xl mb-2">Content not found</div>
            <div className="text-gray-400">This {contentType} is not available.</div>
          </div>
        )}
      </div>
    </div>
  )
}
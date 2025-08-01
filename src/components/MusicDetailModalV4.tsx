'use client'
import { useState, useEffect } from 'react'
import { X, Star, Play, ChevronLeft, ChevronRight, Share, FileText, ArrowRight, Music } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import type { MusicDetailData } from '@/types/musicTypes'
import { musicServiceV2 } from '@/services/musicServiceV2'
import { musicFunFactsService, type FunFact } from '@/services/musicFunFactsService'
import { musicMetacriticService, type MetacriticScore } from '@/services/musicMetacriticService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'

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
  const [recommendMessage, setRecommendMessage] = useState('')
  const [selectedRecommendFriends, setSelectedRecommendFriends] = useState<any[]>([])
  const [recommendSearch, setRecommendSearch] = useState('')
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [showShareThoughtsPrompt, setShowShareThoughtsPrompt] = useState(true)
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
  
  // États pour Metacritic
  const [metacriticScore, setMetacriticScore] = useState<MetacriticScore | null>(null)
  const [loadingMetacritic, setLoadingMetacritic] = useState(false)
  
  // États pour Friends modal
  const [showFriendsWhoListened, setShowFriendsWhoListened] = useState(false)
  
  // États pour les reviews utilisateur
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)
  const [publicReviews, setPublicReviews] = useState<UserReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  
  // États pour l'édition des reviews
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [editRating, setEditRating] = useState(0)
  const [editReviewText, setEditReviewText] = useState('')
  const [editReviewPrivacy, setEditReviewPrivacy] = useState<'private' | 'public'>('private')
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)

  // Mock friends data pour le partage
  const mockFriends = [
    { id: 1, name: 'Axel', avatar: null },
    { id: 2, name: 'Maite', avatar: null },
    { id: 3, name: 'Darren', avatar: null },
    { id: 4, name: 'Joshua', avatar: null },
    { id: 5, name: 'Jeremy', avatar: null },
    { id: 6, name: 'Ana', avatar: null },
    { id: 7, name: 'Susete', avatar: null }
  ]

  // Filtrer les amis pour la recherche
  const filteredRecommendFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(recommendSearch.toLowerCase())
  )

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
    
    // 🔄 RESET des états de review
    setUserRating(0)
    setShowReviewBox(false)
    setShowShareThoughtsPrompt(true)
    setUserReview('')
    setReviewPrivacy('private')
    
    // 🔄 RESET des états audio
    setIsPreviewPlaying(false)
    setAudioRef(null)
    
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
        
        // 🚀 OPTIMISATION: Charger tout en parallèle pour de meilleures performances
        const parallelTasks = [
          // Images (rapide)
          loadImages(data.image),
          // Vidéo (peut être lent)
          loadMusicVideo(data),
          // Fun Facts, Metacritic et Reviews
          loadFunFacts(data.artist, data.title),
          loadMetacriticScore(data.artist, data.title),
          loadUserReviews(data.id)
        ]
        
        // Album tracks selon le type
        if (isAlbum) {
          parallelTasks.push(loadAlbumTracks(musicId, data.title, data.artist))
        } else if (isSingle && data.parentAlbum) {
          parallelTasks.push(loadAlbumTracks(data.parentAlbum.id, data.parentAlbum.title, data.artist))
        }
        
        // Exécuter toutes les tâches en parallèle
        await Promise.allSettled(parallelTasks)
        console.log(`🎵 [V4] ⚡ All data loaded in parallel for ${contentType}`)
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

  const loadMetacriticScore = async (artist: string, title: string) => {
    console.log(`🏆 [V4] Loading Metacritic score for: "${title}" by ${artist}`)
    setLoadingMetacritic(true)
    setMetacriticScore(null)
    
    try {
      const scoreData = await musicMetacriticService.getMetacriticScore(artist, title, isAlbum)
      
      if (scoreData.available) {
        console.log(`🏆 [V4] Found Metacritic score: ${scoreData.score}`)
        setMetacriticScore(scoreData)
      } else {
        console.log(`🏆 [V4] No Metacritic score available`)
        setMetacriticScore(scoreData)
      }
      
    } catch (error) {
      console.error(`🏆 [V4] Error loading Metacritic score:`, error)
      setMetacriticScore(null)
    }
    
    setLoadingMetacritic(false)
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

  // Fonctions pour gérer les amis dans le share modal
  const toggleRecommendFriend = (friend: any) => {
    const isSelected = selectedRecommendFriends.find(f => f.id === friend.id)
    if (isSelected) {
      setSelectedRecommendFriends(prev => prev.filter(f => f.id !== friend.id))
    } else {
      setSelectedRecommendFriends(prev => [...prev, friend])
    }
  }

  const handleSendToFriends = () => {
    if (selectedRecommendFriends.length === 0 || !musicDetail) return
    
    const friendNames = selectedRecommendFriends.map(f => f.name).join(', ')
    const mediaType = isAlbum ? 'album' : 'song'
    alert(`Recommendation sent to: ${friendNames}${recommendMessage ? `\nMessage: "${recommendMessage}"` : ''}`)
    
    // Reset form
    setSelectedRecommendFriends([])
    setRecommendMessage('')
    setShowShareModal(false)
  }

  const handleRatingClick = async (rating: number) => {
    setUserRating(rating)
    setProductSheetData(prev => ({ ...prev, personalRating: rating }))
    setShowReviewBox(true)
    
    // Sauvegarder automatiquement le rating
    if (musicDetail && rating > 0) {
      await submitUserReview(rating, userReview, reviewPrivacy === 'public')
    }
  }

  const handleReviewSubmit = async () => {
    if (!musicDetail || userRating === 0) return
    
    setProductSheetData(prev => ({ 
      ...prev, 
      personalReview: userReview.trim() 
    }))
    
    await submitUserReview(userRating, userReview, reviewPrivacy === 'public')
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


  // Mock friends who listened to this song/album
  const mockFriendsWhoListened = [
    { id: 2, name: 'Maite', rating: 5, hasReview: true, reviewText: 'Absolutely love this track! The production is incredible.' },
    { id: 4, name: 'Joshua', rating: 4, hasReview: true, reviewText: 'Great vibe, perfect for my workout playlist.' },
    { id: 6, name: 'Ana', rating: 4, hasReview: false, reviewText: null },
    { id: 1, name: 'Alex', rating: 3, hasReview: true, reviewText: 'Not bad, but I prefer their older stuff.' }
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

  // Charger les reviews utilisateur
  const loadUserReviews = async (mediaId: string) => {
    setLoadingReviews(true)
    try {
      // Charger la review de l'utilisateur actuel
      const userReview = await userReviewsService.getUserReviewForMedia(mediaId)
      setCurrentUserReview(userReview)
      
      if (userReview) {
        setUserRating(userReview.rating)
        setUserReview(userReview.review_text || '')
        setReviewPrivacy(userReview.is_public ? 'public' : 'private')
      }
      
      // Charger les reviews publiques
      const reviews = await userReviewsService.getPublicReviewsForMedia(mediaId)
      setPublicReviews(reviews)
      
      console.log(`📝 Loaded ${reviews.length} public reviews for ${mediaId}`)
    } catch (error) {
      console.error('Error loading user reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Soumettre une review
  const submitUserReview = async (rating: number, reviewText: string, isPublic: boolean) => {
    if (!musicDetail) return
    
    try {
      const reviewData = {
        mediaId: musicDetail.id,
        mediaTitle: musicDetail.title,
        mediaCategory: 'music' as const,
        rating,
        reviewText: reviewText || undefined,
        isPublic
      }
      
      const savedReview = await userReviewsService.submitReview(reviewData)
      
      if (savedReview) {
        setCurrentUserReview(savedReview)
        // Recharger les reviews publiques si la review est publique
        if (isPublic) {
          const updatedReviews = await userReviewsService.getPublicReviewsForMedia(musicDetail.id)
          setPublicReviews(updatedReviews)
        }
        console.log('✅ Review saved successfully')
      }
    } catch (error) {
      console.error('❌ Error saving review:', error)
    }
  }

  // Initier l'édition d'une review
  const handleEditReview = () => {
    if (!currentUserReview) return
    
    setEditRating(currentUserReview.rating)
    setEditReviewText(currentUserReview.review_text || '')
    setEditReviewPrivacy(currentUserReview.is_public ? 'public' : 'private')
    setIsEditingReview(true)
  }

  // Sauvegarder les modifications de la review
  const handleSaveEditedReview = async () => {
    if (!musicDetail || editRating === 0) return
    
    try {
      // Utiliser la même fonction de soumission
      await submitUserReview(editRating, editReviewText, editReviewPrivacy === 'public')
      setIsEditingReview(false)
    } catch (error) {
      console.error('❌ Error updating review:', error)
    }
  }

  // Annuler l'édition
  const handleCancelEdit = () => {
    setIsEditingReview(false)
    setEditRating(0)
    setEditReviewText('')
    setEditReviewPrivacy('private')
  }

  // Supprimer une review
  const handleDeleteReview = async () => {
    if (!musicDetail || !currentUserReview) return
    
    try {
      const success = await userReviewsService.deleteUserReview(musicDetail.id)
      if (success) {
        setCurrentUserReview(null)
        // Recharger les reviews publiques
        const updatedReviews = await userReviewsService.getPublicReviewsForMedia(musicDetail.id)
        setPublicReviews(updatedReviews)
        console.log('✅ Review deleted successfully')
      }
    } catch (error) {
      console.error('❌ Error deleting review:', error)
    }
  }

  // Fonction pour contrôler la lecture audio
  const handlePreviewToggle = () => {
    if (audioRef) {
      if (isPreviewPlaying) {
        audioRef.pause()
        setIsPreviewPlaying(false)
      } else {
        audioRef.play()
        setIsPreviewPlaying(true)
      }
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

  // Fonction pour formater les statuts d'affichage
  const formatStatusForDisplay = (status: string | null) => {
    if (!status) return 'Add to Library'
    switch (status) {
      case 'want-to-listen': return 'Want To Listen'
      case 'listened': return 'Listened'
      case 'currently-listening': return 'Currently Listening'
      default: return status
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="bg-[#0B0B0B] w-full h-full md:max-w-4xl md:h-[95vh] md:rounded-2xl overflow-hidden flex flex-col">
        {loading ? (
          <StackrLoadingSkeleton 
            message={`Loading your ${contentType}...`}
            className="flex-1 justify-center"
          />
        ) : musicDetail ? (
          <>
            {/* Header - Same structure as MovieDetailModalV3 */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] border-b border-gray-700/50 shadow-xl">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h1 className="text-2xl font-bold text-white pr-12">{musicDetail.title}</h1>
                
                {/* Artist on separate line */}
                <div className="mt-3">
                  <span className="text-lg text-white">{musicDetail.artist}</span>
                </div>
                
                {/* Metadata line */}
                <div className="flex items-center space-x-3 mt-2 text-gray-400">
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
                
                
                {/* Single Badge + Album Link */}
                {isSingle && (
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] text-white">
                      Single
                    </span>
                    {musicDetail.parentAlbum && (
                      <button
                        onClick={handleGoToAlbum}
                        className="flex items-center gap-2 text-sm text-transparent bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text hover:underline transition-colors"
                      >
                        <span>Album "{musicDetail.parentAlbum.title}" ({musicDetail.parentAlbum.year || 'TBA'})</span>
                      </button>
                    )}
                  </div>
                )}
                
                {/* Album Badge */}
                {isAlbum && (
                  <div className="mt-3">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] text-white">
                      Album
                    </span>
                  </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {/* Media Section - Image/Video + Preview */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                {/* Image/Video à gauche */}
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden flex-1">
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
                    {/* Overlay avec bouton Watch on YouTube - Style Films */}
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
              </div>

              {/* Media thumbnails - Only show if video not embedded AND we have video link */}
              {(!musicVideo && youtubeWatchUrl) && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setActiveImageIndex(0)}
                    className="flex-shrink-0 w-16 h-10 rounded overflow-hidden"
                  >
                    <div className="relative w-full h-full">
                      {images.length > 0 && (
                        <img
                          src={images[0]}
                          alt={musicDetail?.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* iTunes Preview Player - Singles seulement, pleine largeur avec effet vague */}
            {isSingle && musicDetail.previewUrl && (
              <div className="mb-6 px-4">
                <div className="relative">
                  <button 
                    onClick={handlePreviewToggle}
                    className="w-full animate-wave-gradient text-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden hover:scale-105"
                  >
                    {/* Overlay pour accentuer l'effet de vague */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 animate-shimmer"></div>
                    
                    <div className="relative z-10 flex items-center justify-center space-x-3">
                      {/* Icône Play/Pause avec ombre */}
                      <div className="flex items-center justify-center w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full shadow-lg">
                        {isPreviewPlaying ? (
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-4 bg-white rounded-full shadow-sm"></div>
                            <div className="w-1.5 h-4 bg-white rounded-full shadow-sm"></div>
                          </div>
                        ) : (
                          <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-1 drop-shadow-sm"></div>
                        )}
                      </div>
                      
                      <span className="text-white text-base font-semibold drop-shadow-sm">30-second preview</span>
                      <span className="text-sm text-white/80 drop-shadow-sm">via iTunes</span>
                      
                      {/* Indicateur visuel vague amélioré */}
                      {isPreviewPlaying && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse shadow-sm"></div>
                          <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse animation-delay-500 shadow-sm"></div>
                          <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse animation-delay-1000 shadow-sm"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Audio player caché mais fonctionnel */}
                    <audio 
                      ref={setAudioRef}
                      preload="metadata"
                      onEnded={() => setIsPreviewPlaying(false)}
                      onPause={() => setIsPreviewPlaying(false)}
                      onPlay={() => setIsPreviewPlaying(true)}
                      className="absolute opacity-0 pointer-events-none"
                    >
                      <source src={musicDetail.previewUrl} type="audio/mpeg" />
                    </audio>
                  </button>
                </div>
              </div>
            )}

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
                  {formatStatusForDisplay(selectedStatus)}
                </button>
                
                {showStatusDropdown && (
                  <div className="absolute top-full mt-2 bg-gray-800 rounded-lg shadow-lg z-10 min-w-48">
                    {isAlbum ? (
                      <>
                        <button
                          onClick={() => handleAddToLibrary('want-to-listen')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 first:rounded-t-lg"
                        >
                          Want To Listen
                        </button>
                        <button
                          onClick={() => handleAddToLibrary('listened')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                        >
                          Listened
                        </button>
                        <button
                          onClick={() => {
                            if (musicDetail && onDeleteItem) {
                              onDeleteItem(musicDetail.id)
                              setShowStatusDropdown(false)
                              setSelectedStatus(null)
                            }
                          }}
                          className="block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 last:rounded-b-lg"
                        >
                          Remove from Library
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAddToLibrary('want-to-listen')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 first:rounded-t-lg"
                        >
                          Want To Listen
                        </button>
                        <button
                          onClick={() => handleAddToLibrary('listened')}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                        >
                          Listened
                        </button>
                        <button
                          onClick={() => {
                            if (musicDetail && onDeleteItem) {
                              onDeleteItem(musicDetail.id)
                              setShowStatusDropdown(false)
                              setSelectedStatus(null)
                            }
                          }}
                          className="block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 last:rounded-b-lg"
                        >
                          Remove from Library
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

            {/* Ratings - Small inline like IMDB in movies */}
            {isAlbum && metacriticScore?.available && (
              <div className="mb-6">
                <div className="flex space-x-8">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Metacritic</h3>
                    <p className="text-gray-300">{metacriticScore.score}/100</p>
                  </div>
                </div>
              </div>
            )}

            {/* Friends who listened - Style Films */}
            {mockFriendsWhoListened.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Friends who listened:</span>
                    <div className="flex -space-x-1">
                      {mockFriendsWhoListened.slice(0, 4).map((friend) => (
                        <div
                          key={friend.id}
                          className="w-6 h-6 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0B0B0B]"
                          title={`${friend.name} - ${friend.rating}/5 stars`}
                        >
                          {friend.name.charAt(0)}
                        </div>
                      ))}
                      {mockFriendsWhoListened.length > 4 && (
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0B0B0B]">
                          +{mockFriendsWhoListened.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFriendsWhoListened(true)}
                    className="text-transparent bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-sm hover:underline"
                  >
                    View all
                  </button>
                </div>
              </div>
            )}

            {/* User Rating & Review - Seulement si pas de review existante */}
            {!currentUserReview && (
              <div className="mb-6">
              <h3 className="text-white font-medium mb-3">Rate this {isAlbum ? 'album' : 'song'}</h3>
              <div className="flex items-center space-x-2">
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
                          ? 'text-green-400 fill-current'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <span className="text-white ml-2 font-medium">{userRating}/5</span>
                )}
              </div>

              {/* Share your thoughts prompt - appears after rating */}
              {userRating > 0 && !showReviewBox && showShareThoughtsPrompt && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-300 text-sm mb-3">Share your thoughts about this {isAlbum ? 'album' : 'song'}</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowReviewBox(true)
                        setShowShareThoughtsPrompt(false)
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Write Review
                    </button>
                    <button
                      onClick={() => setShowShareThoughtsPrompt(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

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
            )}

            {/* Current User Review Display */}
            {currentUserReview && (
              <div className="mb-6">
                
                {isEditingReview ? (
                  <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-400">
                    {/* Edit Rating */}
                    <div className="mb-4">
                      <label className="text-white text-sm font-medium mb-2 block">Rating</label>
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setEditRating(star)}
                              className="focus:outline-none"
                            >
                              <Star
                                size={20}
                                className={`${
                                  star <= editRating
                                    ? 'text-green-400 fill-current'
                                    : 'text-gray-600 hover:text-green-400'
                                } transition-colors cursor-pointer`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-green-400 text-sm font-medium">{editRating}/5</span>
                      </div>
                    </div>

                    {/* Privacy buttons comme MovieDetailModalV3 */}
                    <div className="mb-4">
                      <label className="text-white text-sm font-medium mb-2 block">Share your thoughts about this {isAlbum ? 'album' : 'song'}</label>
                      <div className="flex space-x-2 mb-3">
                        <button
                          onClick={() => setEditReviewPrivacy('private')}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            editReviewPrivacy === 'private'
                              ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white border-0'
                              : 'bg-transparent text-gray-400 border border-gray-700'
                          }`}
                        >
                          Private Note
                        </button>
                        <button
                          onClick={() => setEditReviewPrivacy('public')}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            editReviewPrivacy === 'public'
                              ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white border-0'
                              : 'bg-transparent text-gray-400 border border-gray-700'
                          }`}
                        >
                          Share publicly
                        </button>
                      </div>
                      <textarea
                        value={editReviewText}
                        onChange={(e) => setEditReviewText(e.target.value)}
                        placeholder="Share your thoughts about this song/album..."
                        className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-400 focus:outline-none resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Edit Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSaveEditedReview}
                        disabled={editRating === 0}
                        className="px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#34D399] hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-white text-sm font-medium">Your Review</span>
                        <span className="text-xs text-gray-400">
                          ({currentUserReview.is_public ? 'Public' : 'Private'})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleEditReview}
                          className="text-white text-xs hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDeleteReview}
                          className="text-white text-xs hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={`${
                              star <= currentUserReview.rating
                                ? 'text-green-400 fill-current'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-green-400 text-sm font-medium">{currentUserReview.rating}/5</span>
                    </div>
                    {currentUserReview.review_text && (
                      <p className="text-gray-300 text-sm mt-2">{currentUserReview.review_text}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(currentUserReview.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Popular Reviews - Style Steam/Letterboxd */}
            {publicReviews.length > 0 && (
              <div className="mb-8">
                {/* Header avec MORE à droite */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold text-lg tracking-wide">POPULAR REVIEWS</h3>
                  <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                    MORE
                  </button>
                </div>
                
                {/* Reviews list avec séparateurs */}
                <div className="space-y-0">
                  {publicReviews.slice(0, 3).map((review, index) => (
                    <div key={review.id}>
                      {/* Review content */}
                      <div className="py-4 md:py-6">
                        {/* Header compacte: Avatar + Username + Rating + Comments */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {/* Avatar responsive 36px mobile, 40px desktop */}
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-xs md:text-sm font-medium text-white flex-shrink-0">
                              {review.username?.charAt(0) || 'U'}
                            </div>
                            
                            {/* Username + Rating sur même ligne */}
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium text-sm">{review.username || 'Anonymous'}</span>
                              
                              {/* Rating étoiles compactes */}
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={14}
                                    className={`${
                                      star <= review.rating
                                        ? 'text-green-400 fill-current'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Comments count à droite */}
                          <div className="flex items-center space-x-1 text-gray-400">
                            <span>💬</span>
                            <span className="text-sm">{Math.floor(Math.random() * 500) + 50}</span>
                          </div>
                        </div>
                        
                        {/* Review text avec padding aligné au username */}
                        {review.review_text && (
                          <div className="ml-11 md:ml-12 mb-2"> {/* 44px mobile, 48px desktop */}
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {review.review_text}
                            </p>
                          </div>
                        )}
                        
                        {/* Footer: Likes avec même padding */}
                        <div className="ml-11 md:ml-12">
                          <div className="flex items-center space-x-1 text-gray-400">
                            <span>❤️</span>
                            <span className="text-sm">
                              {(Math.floor(Math.random() * 100000) + 1000).toLocaleString()} likes
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Séparateur subtil (sauf pour le dernier) */}
                      {index < publicReviews.slice(0, 3).length - 1 && (
                        <div className="border-t border-gray-800 opacity-10"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracklist pour les albums - Format optimisé mobile */}
            {isAlbum && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Tracklist</h3>
                {loadingTracks ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-400">Loading tracks...</div>
                  </div>
                ) : albumTracks.length > 0 ? (
                  <>
                    {/* Mobile: Liste verticale */}
                    <div className="block md:hidden space-y-2">
                      {albumTracks.map((track: any) => {
                        // Extraire le titre principal et les featuring artists
                        const trackName = track.trackName || ''
                        const featMatch = trackName.match(/^(.+?)\s*\((?:feat|featuring|ft)\.?\s*(.+?)\)/i)
                        const mainTitle = featMatch ? featMatch[1].trim() : trackName
                        const featArtists = featMatch ? featMatch[2].trim() : null
                        
                        return (
                          <button
                            key={track.trackId}
                            onClick={() => onMusicSelect && onMusicSelect(`track-${track.trackId}`)}
                            className="w-full p-3 bg-gray-800/50 hover:bg-gradient-to-r hover:from-[#10B981]/10 hover:to-[#34D399]/10 rounded-lg border border-gray-700/50 hover:border-[#10B981]/30 transition-all group"
                          >
                            <div className="flex items-center space-x-3">
                              {/* Icône album + numéro track */}
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <Music size={16} className="text-gray-400 group-hover:text-[#10B981] transition-colors" />
                                <span className="text-gray-400 text-sm min-w-[20px] text-center group-hover:text-[#10B981] transition-colors">
                                  {track.trackNumber || '-'}
                                </span>
                              </div>
                              
                              {/* Titre et featuring */}
                              <div className="flex-1 min-w-0 text-left">
                                <div className="text-white text-sm font-medium group-hover:text-[#10B981] transition-colors leading-tight">
                                  {mainTitle}
                                </div>
                                {featArtists && (
                                  <div className="text-gray-400 text-xs mt-0.5 leading-tight">
                                    (feat. {featArtists})
                                  </div>
                                )}
                              </div>
                              
                              {/* Durée et bouton play */}
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                {track.trackTimeMillis && (
                                  <span className="text-gray-400 text-xs tabular-nums">
                                    {Math.floor(track.trackTimeMillis / 60000)}:
                                    {String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}
                                  </span>
                                )}
                                <Play size={14} className="text-gray-400 group-hover:text-[#10B981] transition-colors" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* Desktop: Grid horizontal */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {albumTracks.map((track: any) => {
                          const trackName = track.trackName || ''
                          const featMatch = trackName.match(/^(.+?)\s*\((?:feat|featuring|ft)\.?\s*(.+?)\)/i)
                          const mainTitle = featMatch ? featMatch[1].trim() : trackName
                          const featArtists = featMatch ? featMatch[2].trim() : null
                          
                          return (
                            <button
                              key={track.trackId}
                              onClick={() => onMusicSelect && onMusicSelect(`track-${track.trackId}`)}
                              className="p-4 bg-gray-800/50 hover:bg-gradient-to-r hover:from-[#10B981]/10 hover:to-[#34D399]/10 rounded-lg border border-gray-700/50 hover:border-[#10B981]/30 transition-all group text-left"
                            >
                              <div className="flex items-start space-x-3">
                                <span className="text-gray-400 text-sm group-hover:text-[#10B981] transition-colors flex-shrink-0 mt-0.5">
                                  {track.trackNumber || '-'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white text-sm font-medium group-hover:text-[#10B981] transition-colors leading-tight">
                                    {mainTitle}
                                  </div>
                                  {featArtists && (
                                    <div className="text-gray-400 text-xs mt-1 leading-tight">
                                      (feat. {featArtists})
                                    </div>
                                  )}
                                  {track.trackTimeMillis && (
                                    <div className="text-gray-400 text-xs mt-2 tabular-nums">
                                      {Math.floor(track.trackTimeMillis / 60000)}:
                                      {String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    No tracks found for this album
                  </div>
                )}
              </div>
            )}

            {/* Other songs from album - Liste verticale optimisée mobile */}
            {isSingle && albumTracks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Other songs from this album</h3>
                
                {/* Mobile: Liste verticale */}
                <div className="block md:hidden space-y-2">
                  {albumTracks.map((track: any) => {
                    // Extraire le titre principal et les featuring artists
                    const trackName = track.trackName || ''
                    const featMatch = trackName.match(/^(.+?)\s*\((?:feat|featuring|ft)\.?\s*(.+?)\)/i)
                    const mainTitle = featMatch ? featMatch[1].trim() : trackName
                    const featArtists = featMatch ? featMatch[2].trim() : null
                    
                    return (
                      <button
                        key={track.trackId}
                        onClick={() => onMusicSelect && onMusicSelect(`track-${track.trackId}`)}
                        className="w-full p-3 bg-gray-800/50 hover:bg-gradient-to-r hover:from-[#10B981]/10 hover:to-[#34D399]/10 rounded-lg border border-gray-700/50 hover:border-[#10B981]/30 transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          {/* Icône album + numéro track */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Music size={16} className="text-gray-400 group-hover:text-[#10B981] transition-colors" />
                            <span className="text-gray-400 text-sm min-w-[20px] text-center group-hover:text-[#10B981] transition-colors">
                              {track.trackNumber || '-'}
                            </span>
                          </div>
                          
                          {/* Titre et featuring */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-white text-sm font-medium group-hover:text-[#10B981] transition-colors leading-tight">
                              {mainTitle}
                            </div>
                            {featArtists && (
                              <div className="text-gray-400 text-xs mt-0.5 leading-tight">
                                (feat. {featArtists})
                              </div>
                            )}
                          </div>
                          
                          {/* Durée et bouton play */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {track.trackTimeMillis && (
                              <span className="text-gray-400 text-xs tabular-nums">
                                {Math.floor(track.trackTimeMillis / 60000)}:
                                {String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}
                              </span>
                            )}
                            <Play size={14} className="text-gray-400 group-hover:text-[#10B981] transition-colors" />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                
                {/* Desktop: Grid horizontal */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {albumTracks.map((track: any) => {
                      const trackName = track.trackName || ''
                      const featMatch = trackName.match(/^(.+?)\s*\((?:feat|featuring|ft)\.?\s*(.+?)\)/i)
                      const mainTitle = featMatch ? featMatch[1].trim() : trackName
                      const featArtists = featMatch ? featMatch[2].trim() : null
                      
                      return (
                        <button
                          key={track.trackId}
                          onClick={() => onMusicSelect && onMusicSelect(`track-${track.trackId}`)}
                          className="p-4 bg-gray-800/50 hover:bg-gradient-to-r hover:from-[#10B981]/10 hover:to-[#34D399]/10 rounded-lg border border-gray-700/50 hover:border-[#10B981]/30 transition-all group text-left"
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-gray-400 text-sm group-hover:text-[#10B981] transition-colors flex-shrink-0 mt-0.5">
                              {track.trackNumber || '-'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium group-hover:text-[#10B981] transition-colors leading-tight">
                                {mainTitle}
                              </div>
                              {featArtists && (
                                <div className="text-gray-400 text-xs mt-1 leading-tight">
                                  (feat. {featArtists})
                                </div>
                              )}
                              {track.trackTimeMillis && (
                                <div className="text-gray-400 text-xs mt-2 tabular-nums">
                                  {Math.floor(track.trackTimeMillis / 60000)}:
                                  {String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                
              </div>
            )}

            {/* Fun Facts Section - Seulement si il y a des facts réels */}
            {(!loadingFunFacts && funFacts.length > 0) && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-3">Fun Facts</h3>
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
              </div>
            )}
            </div>
          </>
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

            {/* Send to Friends Section */}
            <div className="mb-6">
              <h4 className="text-white font-medium mb-3">Send to friends in Stackr</h4>
              
              {/* Friend Search */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={recommendSearch}
                  onChange={(e) => setRecommendSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              {/* Friends List */}
              <div className="max-h-32 overflow-y-auto mb-3">
                <div className="space-y-2">
                  {filteredRecommendFriends.map((friend) => {
                    const isSelected = selectedRecommendFriends.find(f => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleRecommendFriend(friend)}
                        className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-gradient-to-r from-[#10B981]/20 to-[#34D399]/20 border border-[#10B981]/30' : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                        {isSelected && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selected Count */}
              {selectedRecommendFriends.length > 0 && (
                <div className="mb-3">
                  <p className="text-gray-400 text-sm">
                    {selectedRecommendFriends.length} friend{selectedRecommendFriends.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Message Input */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Add a message (optional)
                </label>
                <textarea
                  value={recommendMessage}
                  onChange={(e) => setRecommendMessage(e.target.value)}
                  placeholder={`Why do you recommend this ${isAlbum ? 'album' : 'song'}?`}
                  className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-[#10B981]"
                  maxLength={200}
                />
                <div className="text-right text-gray-500 text-xs mt-1">
                  {recommendMessage.length}/200
                </div>
              </div>

              {/* Send to Friends Button */}
              <button
                onClick={handleSendToFriends}
                disabled={selectedRecommendFriends.length === 0}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-opacity ${
                  selectedRecommendFriends.length > 0 
                    ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white hover:opacity-90' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Send to Friends ({selectedRecommendFriends.length})
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

            {/* External Share Section - Hidden by default */}
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
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-[#10B981]/20 to-[#34D399]/20 border border-[#10B981]/30 rounded-lg hover:bg-gradient-to-r hover:from-[#10B981]/30 hover:to-[#34D399]/30 transition-colors"
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
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
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
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">{friend.name.charAt(0)}</span>
                          </div>
                        )}
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

      {/* Friends Who Listened Modal */}
      {showFriendsWhoListened && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] rounded-lg p-6 w-96 max-h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Friends who listened to {musicDetail?.title}</h3>
              <button
                onClick={() => setShowFriendsWhoListened(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            {/* Friends List */}
            <div className="max-h-64 overflow-y-auto">
              {mockFriendsWhoListened.map((friend) => (
                <div key={friend.id} className="flex items-start space-x-3 p-3 hover:bg-gray-800 rounded-lg transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {friend.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-white font-medium">{friend.name}</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= friend.rating
                                ? 'text-[#10B981] fill-[#10B981]'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="text-gray-400 text-sm ml-1">{friend.rating}/5</span>
                      </div>
                    </div>
                    
                    {/* Review */}
                    {friend.hasReview && friend.reviewText ? (
                      <div className="mt-2">
                        <p className="text-gray-300 text-sm mb-2">{friend.reviewText}</p>
                        <button className="text-transparent bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-xs hover:underline">
                          View full review
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mt-2">No review written</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Close Button */}
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowFriendsWhoListened(false)}
                className="py-2 px-4 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Play, ChevronLeft, ChevronRight, Share, FileText } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { musicService } from '@/services/musicService'
import { musicApiService } from '@/services/musicApiService'
import { imageService } from '@/services/imageService'
import { userReviewsService } from '@/services/userReviewsService'
import { musicReviewsService, type MusicReview } from '@/services/musicReviewsService'

interface MusicDetailModalV3Props {
  isOpen: boolean
  onClose: () => void
  albumId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onAlbumSelect?: (albumId: string) => void
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

interface ProcessedMusicReview {
  id: string
  author: string
  rating: number
  text: string
  fullText: string
  platform: string
  date: string
  verified: boolean
  helpful?: number
}

export default function MusicDetailModalV3({
  isOpen,
  onClose,
  albumId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onAlbumSelect
}: MusicDetailModalV3Props) {
  const [albumDetail, setAlbumDetail] = useState<AlbumDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [musicVideo, setMusicVideo] = useState<{ url: string; provider: string } | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [showFullPlot, setShowFullPlot] = useState(false)
  const [artistAlbums, setArtistAlbums] = useState<any[]>([])
  const [albumReviews, setAlbumReviews] = useState<ProcessedMusicReview[]>([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [userPublicReviews, setUserPublicReviews] = useState<any[]>([])
  const [currentUserReview, setCurrentUserReview] = useState<any>(null)
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<any[]>([])
  const [friendsSearch, setFriendsSearch] = useState('')
  const [showFriendsWhoListened, setShowFriendsWhoListened] = useState(false)
  const [showFriendProfile, setShowFriendProfile] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<any>(null)
  const [showRecommendModal, setShowRecommendModal] = useState(false)
  const [recommendMessage, setRecommendMessage] = useState('')
  const [selectedRecommendFriends, setSelectedRecommendFriends] = useState<any[]>([])
  const [recommendSearch, setRecommendSearch] = useState('')
  const [showMoreShareOptions, setShowMoreShareOptions] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showListeningPartyModal, setShowListeningPartyModal] = useState(false)
  const [listeningPartyName, setListeningPartyName] = useState('')
  const [listeningPartyDate, setListeningPartyDate] = useState('')
  const [listeningPartyTime, setListeningPartyTime] = useState('')
  const [selectedListeningPartyFriends, setSelectedListeningPartyFriends] = useState<any[]>([])
  const [listeningPartySearch, setListeningPartySearch] = useState('')
  const [listeningPartyAlbums, setListeningPartyAlbums] = useState<any[]>([])
  const [showAddAlbumSearch, setShowAddAlbumSearch] = useState(false)
  const [addAlbumSearchQuery, setAddAlbumSearchQuery] = useState('')
  const [addAlbumSearchResults, setAddAlbumSearchResults] = useState<any[]>([])
  const [isSearchingAlbums, setIsSearchingAlbums] = useState(false)
  const [showProductSheet, setShowProductSheet] = useState(false)
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

  // Mock friends data
  const mockFriends = [
    { id: 1, name: 'Axel', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Maite', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Darren', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Joshua', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'Jeremy', avatar: '/api/placeholder/32/32' },
    { id: 6, name: 'Ana', avatar: '/api/placeholder/32/32' },
    { id: 7, name: 'Susete', avatar: '/api/placeholder/32/32' }
  ]

  // Détecter si c'est mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    checkIsMobile()
  }, [])

  useEffect(() => {
    if (isOpen && albumId) {
      fetchAlbumDetail()
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

  const fetchAlbumDetail = async () => {
    if (!albumId) return
    
    setLoading(true)
    try {
      console.log('🎵 Fetching album details for ID:', albumId)
      
      // ✅ NOUVELLE APPROCHE: Utiliser le service API amélioré
      const albumData = await musicApiService.getAlbumDetails(albumId)
      console.log('🎵 ✅ Album data received from musicApiService:', albumData)
      
      if (albumData) {
        // ✅ Convertir les données de l'API vers le format AlbumDetail
        const albumDetail: AlbumDetail = {
          id: albumData.id,
          title: albumData.title,
          artist: albumData.artist,
          image: albumData.image,
          releaseDate: `${albumData.year}-01-01`,
          genre: albumData.genre,
          trackCount: albumData.trackCount,
          duration: albumData.duration || '45:00',
          label: 'Unknown Label',
          tracks: [], // TODO: Récupérer les pistes si nécessaire
          description: albumData.description || `${albumData.title} by ${albumData.artist}`,
          rating: albumData.rating || 4.0,
          spotifyUrl: undefined,
          appleMusicUrl: undefined,
          youtubeUrl: undefined
        }
        
        console.log('🎵 ✅ Final album detail:', albumDetail)
        setAlbumDetail(albumDetail)
        
        // ✅ Utiliser les VRAIES données pour toutes les requêtes suivantes
        console.log('🎵 ✅ Fetching additional content for:', albumData.artist, '-', albumData.title)
        
        // Fetch additional content avec les vraies données
        await Promise.all([
          fetchImages(albumData.artist, albumData.title),
          fetchMusicVideo(albumData.artist, albumData.title),
          fetchReviews(albumId, albumData.title, albumData.artist),
          fetchArtistAlbums(albumData.artist)
        ])
      } else {
        throw new Error('No album data received from musicApiService')
      }
      
    } catch (error) {
      console.error('🎵 ❌ Error loading album details:', error)
      
      // ✅ CORRECTION: Fallback plus robuste
      await createFallbackAlbumDetail()
    }
    
    setLoading(false)
  }

  const createFallbackAlbumDetail = async () => {
    console.log('🎵 Creating fallback album detail for ID:', albumId)
    
    // Essayer de récupérer depuis les données sample
    try {
      const { sampleContent } = require('@/data/sampleContent')
      
      let fallbackAlbum = sampleContent.music?.find((album: any) => 
        album.id === albumId || album.id === `music-${albumId}`
      )
      
      if (!fallbackAlbum && sampleContent.music?.length > 0) {
        // Prendre un album aléatoire basé sur l'ID
        const index = parseInt(albumId.replace(/\D/g, '')) % sampleContent.music.length
        fallbackAlbum = sampleContent.music[index]
      }
      
      if (fallbackAlbum) {
        console.log('🎵 Using sample content fallback:', fallbackAlbum)
        
        const albumDetail: AlbumDetail = {
          id: albumId,
          title: fallbackAlbum.title || 'Unknown Album',
          artist: fallbackAlbum.artist || fallbackAlbum.author || 'Unknown Artist',
          image: fallbackAlbum.image || "https://via.placeholder.com/400x400/1a1a1a/ffffff?text=Album+Cover",
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
        }
        
        console.log('🎵 ✅ Created fallback album detail:', albumDetail)
        setAlbumDetail(albumDetail)
        
        // Fetch additional content avec les données fallback
        await Promise.all([
          fetchImages(albumDetail.artist, albumDetail.title),
          fetchMusicVideo(albumDetail.artist, albumDetail.title),
          fetchReviews(albumId, albumDetail.title, albumDetail.artist),
          fetchArtistAlbums(albumDetail.artist)
        ])
        
        return
      }
      
    } catch (error) {
      console.error('🎵 Fallback creation failed:', error)
    }
    
    // Ultimate fallback si tout échoue
    console.log('🎵 Using ultimate fallback')
    const ultimateFallback: AlbumDetail = {
      id: albumId,
      title: 'Music Album',
      artist: 'Various Artists',
      image: "https://via.placeholder.com/400x400/1a1a1a/ffffff?text=Music+Album",
      releaseDate: '2024-01-01',
      genre: "Pop",
      trackCount: 10,
      duration: "40:00",
      label: "Independent",
      tracks: [
        { name: "Song 1", duration: "3:45" },
        { name: "Song 2", duration: "4:12" },
        { name: "Song 3", duration: "3:28" }
      ],
      description: "A collection of great music tracks.",
      rating: 4.0,
      spotifyUrl: "#",
      appleMusicUrl: "#",
      youtubeUrl: "#"
    }
    
    setAlbumDetail(ultimateFallback)
    
    await Promise.all([
      fetchImages(ultimateFallback.artist, ultimateFallback.title),
      fetchMusicVideo(ultimateFallback.artist, ultimateFallback.title),
      fetchReviews(albumId, ultimateFallback.title, ultimateFallback.artist),
      fetchArtistAlbums(ultimateFallback.artist)
    ])
  }

  const fetchImages = async (artist: string, albumTitle: string) => {
    try {
      console.log('🖼️ Fetching images for:', artist, '-', albumTitle)
      
      const imageUrls: string[] = []
      
      // 1. Try to get iTunes album artwork in multiple sizes
      await fetchItunesAlbumArtwork(artist, albumTitle, imageUrls)
      
      // 2. Add high-quality music-themed images from Unsplash
      await fetchUnsplashMusicImages(artist, albumTitle, imageUrls)
      
      // 3. Ensure we have at least some images
      if (imageUrls.length === 0) {
        imageUrls.push(
          `https://via.placeholder.com/800x800/1a1a1a/ffffff?text=${encodeURIComponent(albumTitle)}`,
          `https://via.placeholder.com/800x600/2a2a2a/ffffff?text=${encodeURIComponent(artist)}`
        )
      }
      
      console.log('🖼️ ✅ Found', imageUrls.length, 'images for carousel')
      setImages(imageUrls.slice(0, 6)) // Limit to 6 images
      
    } catch (error) {
      console.error('🖼️ Error fetching images:', error)
      setImages([])
    }
  }

  // Fetch iTunes album artwork in different sizes
  const fetchItunesAlbumArtwork = async (artist: string, albumTitle: string, imageUrls: string[]) => {
    try {
      const searchQuery = `${artist} ${albumTitle}`.trim()
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=album&limit=3`,
        { signal: AbortSignal.timeout(5000) }
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.results && data.results.length > 0) {
          for (const album of data.results.slice(0, 2)) { // Take first 2 albums
            if (album.artworkUrl100) {
              // Generate multiple sizes of the same artwork
              const baseUrl = album.artworkUrl100.replace('100x100bb.jpg', '')
              const sizes = ['600x600bb.jpg', '400x400bb.jpg', '300x300bb.jpg']
              
              for (const size of sizes) {
                const imageUrl = baseUrl + size
                if (!imageUrls.includes(imageUrl)) {
                  imageUrls.push(imageUrl)
                }
              }
            }
          }
          
          console.log('🖼️ iTunes: Found', imageUrls.length, 'album artworks')
        }
      }
    } catch (error) {
      console.log('🖼️ iTunes artwork fetch failed:', error)
    }
  }

  // Fetch high-quality music images from Unsplash
  const fetchUnsplashMusicImages = async (artist: string, albumTitle: string, imageUrls: string[]) => {
    try {
      // Add curated music images that look professional
      const musicImages = [
        // General music/studio images
        `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop&q=80`, // Music studio
        `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&q=80`, // Headphones
        `https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop&q=80`, // Music studio 2
        `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop&q=80`, // Square format
        
        // Artist-specific images (if we can generate based on artist)
        `https://source.unsplash.com/800x600/?music,${encodeURIComponent(artist.split(' ')[0])}`,
        `https://source.unsplash.com/800x800/?album,music,${encodeURIComponent(albumTitle.split(' ')[0])}`
      ]
      
      // Add 2-3 curated images to the collection
      const selectedImages = musicImages.slice(0, 3)
      imageUrls.push(...selectedImages)
      
      console.log('🖼️ Unsplash: Added', selectedImages.length, 'music images')
      
    } catch (error) {
      console.log('🖼️ Unsplash music images failed:', error)
    }
  }

  const fetchMusicVideo = async (artist: string, albumTitle: string) => {
    try {
      // Dynamic music video search with artist/album-specific videos
      const query = `${artist} ${albumTitle} official music video`
      console.log('🎵 Searching music video for:', query)
      
      // Generate a video ID based on the artist and album to ensure consistency
      const videoId = generateVideoIdFromArtistAlbum(artist, albumTitle)
      const embedUrl = `https://www.youtube.com/embed/${videoId}`
      
      console.log('🎵 Generated video ID:', videoId, 'for', artist, '-', albumTitle)
      
      setMusicVideo({
        url: embedUrl,
        provider: 'youtube'
      })
    } catch (error) {
      console.error('🎵 Music video search failed:', error)
      
      // Fallback: show a generic music video placeholder
      setMusicVideo({
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        provider: 'youtube'
      })
    }
  }

  // Generate consistent video IDs for different artists/albums
  const generateVideoIdFromArtistAlbum = (artist: string, albumTitle: string): string => {
    // Mapping of popular artists/albums to their actual music videos
    const videoMappings: { [key: string]: string } = {
      // Billie Eilish
      'billie eilish-happier than ever': 'NUVCQXMUVnI', // Happier Than Ever
      'billie eilish-when we all fall asleep': 'DyDfgMOUjCI', // bad guy
      'billie eilish-sour': 'gBRi6aZJGj4', // everything i wanted
      
      // Taylor Swift
      'taylor swift-midnights': 'b1kbLWvqugk', // Anti-Hero
      'taylor swift-folklore': 'DIgqbci0ZWk', // cardigan
      'taylor swift-lover': 'FuXNumBwDOM', // Lover
      'taylor swift-reputation': 'wIft-t-MQuE', // Look What You Made Me Do
      'taylor swift-1989': 'nfWlot6h_JM', // Shake It Off
      
      // The Weeknd
      'the weeknd-after hours': 'tQ0yjYUFKAE', // Blinding Lights
      'the weeknd-dawn fm': 'waU75jdUnYw', // Take My Breath
      'the weeknd-starboy': 'L8eRzOYhLuw', // Starboy
      
      // Drake
      'drake-scorpion': 'DRS_PpOrUZ4', // God's Plan
      'drake-views': 'uxpDa-c-4Mc', // Hotline Bling
      'drake-take care': 'GxgqpCdOKak', // Take Care
      
      // Ariana Grande
      'ariana grande-positions': 'tcYodQoapMg', // positions
      'ariana grande-thank u next': 'gl1aHhXnN1k', // thank u, next
      'ariana grande-sweetener': 'SBC_OpSmPmQ', // no tears left to cry
      
      // Dua Lipa
      'dua lipa-future nostalgia': 'k2qgadSvNyU', // Don't Start Now
      'dua lipa-dua lipa': 'TUVcZfQe-Kw', // IDGAF
      
      // Olivia Rodrigo
      'olivia rodrigo-sour': 'ZmDBbnmKpqQ', // drivers license
      'olivia rodrigo-guts': 'hcmZzljcqLU', // vampire
      
      // Bad Bunny
      'bad bunny-un verano sin ti': 'Cy4RzybUWtk', // Me Porto Bonito
      'bad bunny-x 100pre': 'u0khWMFT6nU', // Mia
      
      // Harry Styles
      'harry styles-fine line': 'H5v3kku4y6Q', // Watermelon Sugar
      'harry styles-harrys house': 'bVvRLwmm2Tg', // As It Was
      
      // Lorde
      'lorde-melodrama': 'dMK_npDG12Q', // Green Light
      'lorde-solar power': 'wvsP_lzh2-8' // Solar Power
    }
    
    // Create a normalized key for lookup - more flexible matching
    const normalizedKey = `${artist.toLowerCase()}-${albumTitle.toLowerCase()}`
      .replace(/[^a-z0-9\-\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim()
    
    console.log('🎵 Looking for video mapping with key:', normalizedKey)
    
    // Also try partial matches for common artist names
    const artistLower = artist.toLowerCase()
    const albumLower = albumTitle.toLowerCase()
    
    // Check if we have a specific mapping for this artist/album
    if (videoMappings[normalizedKey]) {
      console.log('🎵 Found specific video mapping:', videoMappings[normalizedKey])
      return videoMappings[normalizedKey]
    }
    
    // Try partial matches for better recognition
    for (const [key, videoId] of Object.entries(videoMappings)) {
      const [mappedArtist, mappedAlbum] = key.split('-')
      
      // Check if artist matches and album partially matches
      if (artistLower.includes(mappedArtist) || mappedArtist.includes(artistLower)) {
        if (albumLower.includes(mappedAlbum) || mappedAlbum.includes(albumLower)) {
          console.log('🎵 Found partial match video mapping:', videoId, 'for key:', key)
          return videoId
        }
      }
    }
    
    // Fallback: generate a pseudo-random but consistent video ID based on the input
    const hash = hashString(normalizedKey)
    const fallbackVideos = [
      'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
      'L_jWHffIx5E', // Smash Mouth - All Star
      'ZbZSe6N_BXs', // Rick Astley - Together Forever
      'yPYZpwSpKmA', // Rick Astley - Whenever You Need Somebody
      'AC3Ejf7vPEY'  // Rick Astley - She's Got That Light
    ]
    
    const videoIndex = Math.abs(hash) % fallbackVideos.length
    console.log('🎵 Using fallback video index:', videoIndex, 'for hash:', hash)
    return fallbackVideos[videoIndex]
  }

  // Simple hash function for consistent video selection
  const hashString = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }

  const fetchReviews = async (albumId: string, albumTitle: string, artist: string) => {
    try {
      console.log('📝 Fetching reviews for album:', albumTitle, 'by', artist)
      
      // Fetch API reviews with error handling
      try {
        const reviewsResponse = await musicReviewsService.getMusicReviews(albumId, albumTitle, artist)
        if (reviewsResponse && reviewsResponse.reviews && Array.isArray(reviewsResponse.reviews)) {
          setAlbumReviews(reviewsResponse.reviews.map(review => ({
            ...review,
            fullText: review.text || review.fullText || review.text
          })))
          console.log('📝 Loaded', reviewsResponse.reviews.length, 'API reviews')
        } else {
          setAlbumReviews([])
          console.log('📝 No valid API reviews found')
        }
      } catch (apiError) {
        console.error('📝 Error fetching API reviews:', apiError)
        setAlbumReviews([])
      }
      
      // Fetch user public reviews with error handling
      try {
        const publicReviews = await userReviewsService.getPublicReviewsForMedia(albumId)
        if (publicReviews && Array.isArray(publicReviews)) {
          setUserPublicReviews(publicReviews)
          console.log('📝 Loaded', publicReviews.length, 'user public reviews')
        } else {
          setUserPublicReviews([])
          console.log('📝 No valid public reviews found')
        }
      } catch (publicError) {
        console.error('📝 Error fetching public reviews:', publicError)
        setUserPublicReviews([])
      }
      
      // Fetch current user's review with error handling
      try {
        const userReview = await userReviewsService.getUserReviewForMedia(albumId)
        setCurrentUserReview(userReview)
        if (userReview) {
          setUserRating(userReview.rating)
          setUserReview(userReview.review_text || '')
          console.log('📝 Found existing user review')
        }
      } catch (userError) {
        console.error('📝 Error fetching user review (probably 406 Supabase issue):', userError)
        setCurrentUserReview(null)
      }
      
    } catch (error) {
      console.error('📝 Error fetching reviews:', error)
      setAlbumReviews([])
      setUserPublicReviews([])
      setCurrentUserReview(null)
    }
  }

  const fetchArtistAlbums = async (artistName: string) => {
    try {
      console.log('🎵 Fetching artist albums for:', artistName)
      
      // Mock data for now - in real implementation, use music API
      const mockArtistAlbums = [
        { id: 1, title: "Previous Album", artist: artistName, image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.5 },
        { id: 2, title: "Greatest Hits", artist: artistName, image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.8 },
        { id: 3, title: "Live Performance", artist: artistName, image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.7 },
        { id: 4, title: "Acoustic Sessions", artist: artistName, image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=Album", rating: 4.6 }
      ]
      
      setArtistAlbums(mockArtistAlbums)
      
    } catch (error) {
      console.error('🎵 Error fetching artist albums:', error)
      setArtistAlbums([])
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
    setShowStatusDropdown(false)
  }

  const getStatusLabel = (status: MediaStatus | null) => {
    if (!status) return 'Add to Library'
    switch (status) {
      case 'want-to-play': return 'Want to Listen'
      case 'completed': return 'Listened'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus | null) => {
    // Apply green gradient for music theme
    return 'bg-gradient-to-r from-[#1DB954] to-[#1ed760] border-0'
  }

  const handleRatingClick = (rating: number) => {
    setUserRating(rating)
    setShowReviewBox(true)
    
    // Synchronize with product sheet
    setProductSheetData(prev => ({ ...prev, personalRating: rating }))
  }

  const handleSubmitReview = async () => {
    if (userRating > 0 && albumDetail) {
      // Sauvegarder dans notre système
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
        
        if (reviewPrivacy === 'public') {
          const updatedPublicReviews = await userReviewsService.getPublicReviewsForMedia(albumId)
          setUserPublicReviews(updatedPublicReviews)
        }
        
        setCurrentUserReview(savedReview)
      }
      
      setShowReviewBox(false)
      // Synchronize with product sheet
      setProductSheetData(prev => ({ 
        ...prev, 
        personalReview: userReview.trim(),
        personalRating: userRating
      }))
    }
  }

  // Product Sheet functions
  const saveProductSheet = () => {
    if (albumDetail) {
      const data = { ...productSheetData, albumId: albumDetail.id }
      localStorage.setItem(`musicProductSheet_${albumDetail.id}`, JSON.stringify(data))
      
      // Synchronize with general section
      if (productSheetData.personalRating > 0) {
        setUserRating(productSheetData.personalRating)
      }
      
      if (productSheetData.friendsListenedWith.length > 0) {
        setSelectedFriends(productSheetData.friendsListenedWith)
      }
      
      if (productSheetData.personalReview.trim()) {
        setUserReview(productSheetData.personalReview.trim())
      }
      
      setShowProductSheet(false)
    }
  }

  const loadProductSheet = () => {
    if (albumDetail) {
      const saved = localStorage.getItem(`musicProductSheet_${albumDetail.id}`)
      if (saved) {
        const data = JSON.parse(saved)
        setProductSheetData(data)
        
        // Synchronise avec la section générale
        if (data.personalRating > 0) {
          setUserRating(data.personalRating)
        }
        if (data.friendsListenedWith && data.friendsListenedWith.length > 0) {
          setSelectedFriends(data.friendsListenedWith)
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

  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  const nextImage = () => {
    const totalItems = (musicVideo ? 1 : 0) + images.length
    if (totalItems > 0) {
      setActiveImageIndex((prev) => (prev + 1) % totalItems)
    }
  }

  const prevImage = () => {
    const totalItems = (musicVideo ? 1 : 0) + images.length
    if (totalItems > 0) {
      setActiveImageIndex((prev) => (prev - 1 + totalItems) % totalItems)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="bg-[#0B0B0B] w-full h-full md:max-w-4xl md:h-[95vh] md:rounded-2xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : albumDetail ? (
          <>
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h1 className="text-2xl font-bold text-white pr-12">{albumDetail.title}</h1>
              <div className="flex items-center space-x-3 mt-2 text-gray-400">
                <span>{albumDetail.artist}</span>
                <span>•</span>
                <span>{albumDetail.releaseDate ? new Date(albumDetail.releaseDate).getFullYear() : 'TBA'}</span>
                <span>•</span>
                <span>{albumDetail.genre}</span>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto px-6">
              {/* Media Section */}
              <div className="space-y-4 mb-6">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  {musicVideo && activeImageIndex === 0 ? (
                    <div className="w-full h-full">
                      {musicVideo.provider === 'youtube' && musicVideo.url.includes('embed') ? (
                        <iframe
                          src={musicVideo.url}
                          className="w-full h-full"
                          allowFullScreen
                          title="Music Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <a
                            href={musicVideo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg text-white"
                          >
                            <Play size={20} />
                            Watch Music Video
                          </a>
                        </div>
                      )}
                    </div>
                  ) : images.length > 0 ? (
                    <img
                      src={images[musicVideo ? activeImageIndex - 1 : activeImageIndex]}
                      alt={`${albumDetail.title} image`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : albumDetail.image ? (
                    <img
                      src={albumDetail.image}
                      alt={albumDetail.title}
                      className="w-full h-full object-contain bg-gray-900"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-500">
                        <div className="text-5xl mb-2">🎵</div>
                        <p>No media available</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation arrows */}
                  {(images.length > 0 || musicVideo) && (
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
                {((musicVideo ? 1 : 0) + images.length > 1) && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {musicVideo && (
                      <button
                        onClick={() => setActiveImageIndex(0)}
                        className={`flex-shrink-0 w-16 h-10 rounded overflow-hidden border-2 ${
                          activeImageIndex === 0 ? 'border-green-500' : 'border-transparent'
                        }`}
                      >
                        <div className="w-full h-full bg-red-600 flex items-center justify-center">
                          <Play size={12} className="text-white" />
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
                          alt={`${albumDetail.title} thumbnail`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-3 mb-6">
                {/* Add to Library Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`py-2 px-4 rounded-lg font-medium text-white ${selectedStatus ? getStatusColor(selectedStatus) : 'bg-gray-800'} hover:opacity-90 transition`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{getStatusLabel(selectedStatus)}</span>
                      {/* Show friends only for listened status */}
                      {selectedFriends.length > 0 && selectedStatus === 'completed' && (
                        <div className="flex -space-x-1">
                          {selectedFriends.slice(0, 2).map((friend, index) => (
                            <div
                              key={friend.id}
                              className="w-5 h-5 bg-gradient-to-r from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center text-xs font-medium border-2 border-white"
                              style={{ zIndex: selectedFriends.length - index }}
                            >
                              {friend.name.charAt(0)}
                            </div>
                          ))}
                          {selectedFriends.length > 2 && (
                            <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white">
                              +{selectedFriends.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute top-full mt-2 w-48 bg-[#1A1A1A] rounded-lg shadow-xl z-10 py-2">
                      <button
                        onClick={() => handleStatusSelect('want-to-play')}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-800"
                      >
                        Want to Listen
                      </button>
                      <button
                        onClick={() => handleStatusSelect('completed')}
                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-800"
                      >
                        Listened
                      </button>
                      {selectedStatus && (
                        <>
                          <div className="border-t border-gray-700 my-1"></div>
                          <button
                            onClick={() => handleStatusSelect('remove')}
                            className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800"
                          >
                            Remove from Library
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Sheet Button - Only show for completed */}
                {selectedStatus === 'completed' && (
                  <button
                    onClick={() => setShowProductSheet(true)}
                    className="py-2 px-4 rounded-lg font-medium text-white hover:opacity-90 transition flex items-center space-x-2 bg-gray-800"
                    style={isProductSheetCompleted() ? {
                      boxShadow: '0 0 0 2px #1DB954, 0 4px 8px rgba(29, 185, 84, 0.3)'
                    } : {}}
                    title="Music Sheet"
                  >
                    <FileText size={16} />
                  </button>
                )}

                {/* Share Button */}
                <button
                  onClick={() => setShowRecommendModal(true)}
                  className="py-2 px-4 rounded-lg font-medium text-white bg-gray-800 hover:opacity-90 transition flex items-center space-x-2"
                >
                  <Share size={16} />
                  <span>Share</span>
                </button>
              </div>

              {/* Rating Section - Only show if Listened */}
              {selectedStatus === 'completed' && (
                <div className="space-y-4 mb-6">
                  <h3 className="text-white font-medium">Rate this album</h3>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleRatingClick(rating)}
                        onMouseEnter={() => setHoverRating(rating)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                      >
                        <Star
                          size={24}
                          className={`transition-colors ${
                            (hoverRating || userRating) >= rating
                              ? 'text-[#1DB954] fill-[#1DB954]'
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
                        onChange={(e) => {
                          setUserReview(e.target.value)
                          // Synchronize with product sheet
                          setProductSheetData(prev => ({ ...prev, personalReview: e.target.value }))
                        }}
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
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-gray-400 text-sm">Duration</div>
                  <div className="text-white font-medium">{albumDetail.duration}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-400 text-sm">Tracks</div>
                  <div className="text-white font-medium">{albumDetail.trackCount}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-400 text-sm">Label</div>
                  <div className="text-white font-medium">{albumDetail.label}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-400 text-sm">Rating</div>
                  <div className="text-white font-medium">{albumDetail.rating}/5</div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">About</h3>
                <div className="text-gray-300 leading-relaxed">
                  <p className={`${!showFullPlot ? 'line-clamp-3' : ''}`}>
                    {albumDetail.description}
                  </p>
                  {albumDetail.description && albumDetail.description.length > 150 && (
                    <button
                      onClick={() => setShowFullPlot(!showFullPlot)}
                      className="text-green-400 text-sm mt-2 hover:underline"
                    >
                      {showFullPlot ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>

              {/* Track List */}
              <div className="mb-6">
                <h3 className="text-white font-medium mb-3">Track List</h3>
                <div className="space-y-2">
                  {(albumDetail.tracks || []).map((track, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 text-sm w-6">{index + 1}</span>
                        <span className="text-white">{track.name}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{track.duration}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friends Who Listened */}
              {selectedFriends.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Friends who listened</h3>
                    <button className="text-green-400 text-sm hover:underline">
                      View all
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    {selectedFriends.slice(0, 6).map((friend) => (
                      <div key={friend.id} className="flex flex-col items-center space-y-1">
                        <div className="w-12 h-12 bg-gradient-to-r from-[#1DB954] to-[#1ed760] rounded-full flex items-center justify-center text-white font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-gray-400 text-xs">{friend.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">Reviews</h3>
                  <span className="text-gray-400 text-sm">
                    {albumReviews.length + userPublicReviews.length} reviews
                  </span>
                </div>
                
                {/* Current user's review if exists */}
                {currentUserReview && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-400 text-sm font-medium">Your Review</span>
                      <span className="text-gray-400 text-xs">
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
                      <span className="text-gray-400 text-xs">{currentUserReview.created_at.split('T')[0]}</span>
                    </div>
                    {currentUserReview.review_text && (
                      <p className="text-gray-300 text-sm">{currentUserReview.review_text}</p>
                    )}
                  </div>
                )}
                
                {/* All reviews */}
                <div className="space-y-4">
                  {/* User Public Reviews First */}
                  {userPublicReviews.map((review) => (
                    <div key={review.id} className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {(review.username || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium text-sm">{review.username || 'Anonymous User'}</span>
                              <span className="text-green-400 text-xs">✓ Stackr User</span>
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
                              <span className="text-gray-400 text-xs">{review.created_at.split('T')[0]}</span>
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-900/50 text-green-200 rounded text-xs font-medium">
                          User Review
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-gray-300 text-sm leading-relaxed mb-3">
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
                  {albumReviews.slice(0, showAllReviews ? undefined : 3).map((review) => (
                    <div key={review.id} className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {(review.author || 'A').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium text-sm">{review.author || 'Anonymous'}</span>
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
                              <span className="text-gray-400 text-xs">{review.date}</span>
                            </div>
                          </div>
                        </div>
                        
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
                           'Community'}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 text-sm leading-relaxed mb-3">
                        {expandedReviews.has(review.id) ? review.fullText || review.text : review.text}
                        {review.fullText && review.fullText !== review.text && (
                          <button
                            onClick={() => toggleReviewExpansion(review.id)}
                            className="text-green-400 text-sm ml-2 hover:underline"
                          >
                            {expandedReviews.has(review.id) ? 'See less' : 'See more'}
                          </button>
                        )}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {review.helpful !== undefined && (
                          <span>👍 {review.helpful} helpful</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {albumReviews.length > 3 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="text-green-400 text-sm hover:underline"
                    >
                      {showAllReviews ? 'Show less reviews' : `Show all ${albumReviews.length} reviews`}
                    </button>
                  )}
                </div>
              </div>

              {/* More from this artist */}
              {artistAlbums.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-4">
                    More from {albumDetail.artist}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {artistAlbums.map((album) => (
                      <div 
                        key={album.id} 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          if (onAlbumSelect) {
                            onAlbumSelect(album.id.toString())
                          }
                        }}
                      >
                        <img
                          src={album.image || 'https://via.placeholder.com/200x200/333/fff?text=Album'}
                          alt={album.title}
                          className="w-full aspect-square object-cover rounded-lg mb-2"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'https://via.placeholder.com/200x200/333/fff?text=Album'
                          }}
                        />
                        <p className="text-white text-sm font-medium truncate" title={album.title}>{album.title}</p>
                        <p className="text-gray-400 text-xs truncate" title={album.artist}>{album.artist}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Star size={12} className="text-yellow-400 fill-current" />
                          <span className="text-gray-400 text-xs">{album.rating}</span>
                        </div>
                      </div>
                    ))}
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
              <p className="text-gray-400 text-sm">Unable to load album details.</p>
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

              {/* Location */}
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
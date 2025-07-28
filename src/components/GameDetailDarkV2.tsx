'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { trailerService, type GameTrailer } from '@/services/trailerService'
import { reviewsService, type GameReview, type ReviewsResponse } from '@/services/reviewsService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import { fetchWithCache, apiCache } from '@/utils/apiCache'
import { igdbService, type IGDBGameGallery } from '@/services/igdbService'

interface GameDetailDarkV2Props {
  isOpen: boolean
  onClose: () => void
  gameId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  googleReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface GameDetail {
  id: number
  name: string
  background_image: string
  description_raw: string
  rating: number
  rating_count: number
  released: string
  platforms: { platform: { name: string } }[]
  developers: { name: string }[]
  publishers: { name: string }[]
  genres: { name: string }[]
  tags: { name: string }[]
  website: string
  stores: { store: { name: string }, url: string }[]
  screenshots: { image: string }[]
  metacritic: number
  esrb_rating: { name: string }
  parent_platforms: { platform: { name: string } }[]
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function GameDetailDarkV2({ 
  isOpen, 
  onClose, 
  gameId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  googleReviews, 
  onReviewSubmit 
}: GameDetailDarkV2Props) {
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [userReview, setUserReview] = useState('')
  const [similarGames, setSimilarGames] = useState<any[]>([])
  const [developerGames, setDeveloperGames] = useState<any[]>([])
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingDeveloper, setLoadingDeveloper] = useState(false)
  const [similarGamesLoaded, setSimilarGamesLoaded] = useState(false)
  const [developerGamesLoaded, setDeveloperGamesLoaded] = useState(false)
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const [showPublisher, setShowPublisher] = useState(false)
  const [gameTrailer, setGameTrailer] = useState<GameTrailer | null>(null)
  const [trailerLoading, setTrailerLoading] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [gameReviews, setGameReviews] = useState<GameReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [userPublicReviews, setUserPublicReviews] = useState<UserReview[]>([])
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)
  const [gameImages, setGameImages] = useState<string[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''

  // Mock data for similar games and developer games
  const mockSimilarGames = [
    { id: 1, name: "Super Meat Boy", image: "https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg", rating: 4.5 },
    { id: 2, name: "Celeste", image: "https://media.rawg.io/media/games/594/5949baae74fe9e399adbce0c44e28783.jpg", rating: 4.8 },
    { id: 3, name: "Hollow Knight", image: "https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg", rating: 4.7 },
    { id: 4, name: "Dead Cells", image: "https://media.rawg.io/media/games/f99/f99f08148e85c969a0b8c9d5326c6b63.jpg", rating: 4.6 },
    { id: 5, name: "Ori and the Blind Forest", image: "https://media.rawg.io/media/games/f8c/f8c6a262ead4c16b47e1219310210eb3.jpg", rating: 4.5 },
    { id: 6, name: "Shovel Knight", image: "https://media.rawg.io/media/games/713/713269608dc8f2f40f5a670a14b2de94.jpg", rating: 4.4 },
    { id: 7, name: "Katana ZERO", image: "https://media.rawg.io/media/games/375/375a7e2c93efd9e3d5e2d1c10f0ddc01.jpg", rating: 4.6 },
    { id: 8, name: "Hades", image: "https://media.rawg.io/media/games/1f4/1f47a270b8f241e4676b14d39ec620f7.jpg", rating: 4.9 }
  ]

  const mockDeveloperGames = [
    { id: 1, name: "Worms Battlegrounds", image: "https://media.rawg.io/media/games/157/15742f2f67eacff546738e1ab5c19d20.jpg", rating: 3.8 },
    { id: 2, name: "The Escapists", image: "https://media.rawg.io/media/games/9e5/9e5b91a6d02e66b8d450a977a59ae123.jpg", rating: 4.1 },
    { id: 3, name: "Overcooked", image: "https://media.rawg.io/media/games/270/270b412b66688081497b3d70c100b208.jpg", rating: 4.3 },
    { id: 4, name: "Yooka-Laylee", image: "https://media.rawg.io/media/games/966/966de4e9136a63dd13746f45b9326eb7.jpg", rating: 3.5 }
  ]


  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
      setShowAllPlatforms(false)
      setShowPublisher(false)
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
    if (isOpen && gameId && hasLoadedRef.current !== gameId) {
      hasLoadedRef.current = gameId
      fetchGameDetail()
    }
    if (!isOpen) {
      hasLoadedRef.current = null
    }
  }, [isOpen, gameId])

  useEffect(() => {
    const libraryItem = library.find(item => item.id === gameId)
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
    } else {
      setSelectedStatus(null)
    }
  }, [gameId, library])

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

  const fetchGameDetail = async () => {
    if (!gameId) return
    
    setLoading(true)
    try {
      let rawgId = gameId
      
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }
      
      // 🚀 OPTIMISATION: Utiliser le cache pour éviter les requêtes répétées
      const gameUrl = `https://api.rawg.io/api/games/${rawgId}?key=${RAWG_API_KEY}`
      const cacheKey = `game-detail-${rawgId}`
      const data = await fetchWithCache(gameUrl, cacheKey)
      
      // Vérifier si l'API retourne une erreur de limite
      if (data.error && data.error.includes('API limit')) {
        console.error('🎮 [GameDetail] API limit reached, using fallback')
        throw new Error('API_LIMIT_REACHED')
      }
      
      setGameDetail(data)
      
      // Fetch images
      loadGameImages(rawgId, data.name)
      
      // Fetch real reviews
      fetchReviews(rawgId, data.name)
      
      // 🚀 LAZY LOADING: Ne plus charger automatiquement les recommandations
      // Les utilisateurs pourront cliquer sur un bouton pour les charger
      console.log('🎮 [GameDetail] Game details loaded. Recommendations available on demand.')
      
    } catch (error) {
      console.error('Error loading game details:', error)
      
      // Fallback vers les données statiques
      const { sampleContent } = require('@/data/sampleContent')
      
      // Essayer de trouver le jeu correspondant dans sampleContent
      let fallbackGame = sampleContent.games.find((game: any) => 
        game.id === gameId || game.id === `game-${rawgId}` || game.id === rawgId
      )
      
      // Si pas trouvé, utiliser le premier jeu comme fallback
      if (!fallbackGame) {
        fallbackGame = sampleContent.games[0]
      }
      
      // Convertir en format GameDetail
      setGameDetail({
        id: parseInt(rawgId) || 1,
        name: fallbackGame.title,
        background_image: fallbackGame.image || "https://via.placeholder.com/640x360/1a1a1a/ffffff?text=Game+Image",
        description_raw: `${fallbackGame.title} is an exciting ${fallbackGame.genre} game released in ${fallbackGame.year}. Experience amazing gameplay and immersive storytelling in this fantastic ${fallbackGame.genre} adventure.`,
        rating: fallbackGame.rating || 4.0,
        rating_count: 150 + Math.floor(Math.random() * 1000),
        released: `${fallbackGame.year}-01-01`,
        platforms: [{ platform: { name: "PC" } }, { platform: { name: "PlayStation" } }],
        developers: [{ name: fallbackGame.author || "Unknown Developer" }],
        publishers: [{ name: fallbackGame.author || "Unknown Publisher" }],
        genres: [{ name: fallbackGame.genre || "Game" }],
        tags: [],
        website: "#",
        stores: [
          { store: { name: "Steam" }, url: "#" },
          { store: { name: "PlayStation Store" }, url: "#" }
        ],
        screenshots: [
          { image: fallbackGame.image || "https://via.placeholder.com/640x360" },
          { image: fallbackGame.image || "https://via.placeholder.com/640x360" }
        ],
        metacritic: Math.floor(fallbackGame.rating * 20) || 75,
        esrb_rating: { name: "Everyone" },
        parent_platforms: []
      })
      
      // For fallback demo data, also fetch similar games
      await fetchRealSimilarGames([{name: fallbackGame.genre}], [], parseInt(rawgId) || 1)
      await fetchRealDeveloperGames(fallbackGame.author || 'Unknown Developer', parseInt(rawgId) || 1)
      // Fetch images for mock data too
      loadGameImages(rawgId, fallbackGame.title)
      // Fetch reviews for mock data too
      fetchReviews(rawgId, fallbackGame.title)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrailer = async (gameId: string, gameName: string) => {
    setTrailerLoading(true)
    try {
      const trailer = await trailerService.getGameTrailer(gameId, gameName)
      setGameTrailer(trailer)
    } catch (error) {
      console.error('Error fetching trailer:', error)
      setGameTrailer(null)
    } finally {
      setTrailerLoading(false)
    }
  }

  const loadGameImages = async (gameId: string, gameName: string) => {
    console.log('🖼️ === OPTION 2: TESTING IGDB API (SIMPLIFIED) ===')
    console.log('🖼️ Loading images for:', gameName)
    
    setImagesLoading(true)
    try {
      // Récupérer le trailer
      const trailer = await trailerService.getGameTrailer(gameId, gameName)
      setGameTrailer(trailer)
      
      // Récupérer les images via IGDB service
      const igdbGallery = await igdbService.getGameImages(gameId, gameName)
      console.log('🖼️ IGDB Gallery result:', igdbGallery)
      
      if (igdbGallery.success && igdbGallery.images.length > 0) {
        const imageUrls = igdbGallery.images.map(img => img.url)
        console.log('🖼️ Setting images:', imageUrls)
        setGameImages(imageUrls)
        setCurrentImageIndex(0)
      } else {
        console.log('🖼️ No images, using fallback')
        // Fallback avec images directes
        const fallbackImages = [
          'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80',
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&q=80',
          'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop&q=80',
          'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop&q=80'
        ]
        setGameImages(fallbackImages)
        setCurrentImageIndex(0)
      }
      
    } catch (error) {
      console.error('🖼️ Error loading images:', error)
      // En cas d'erreur, toujours mettre des images
      const errorFallback = [
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&q=80'
      ]
      setGameImages(errorFallback)
      setCurrentImageIndex(0)
    } finally {
      setImagesLoading(false)
    }
  }

  // FONCTION DE TEST DIRECT RAWG
  const testRAWGDirectly = async (gameId: string, gameName: string) => {
    const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
    console.log('🖼️ RAWG API Key available:', !!RAWG_API_KEY)
    
    const images: Array<{url: string, type: string, aspectRatio: number}> = []
    
    try {
      // Nettoyer l'ID
      let rawgId = gameId
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }
      
      console.log('🖼️ Testing with game ID:', rawgId)
      
      // Test 1: Screenshots endpoint
      console.log('🖼️ Testing screenshots endpoint...')
      const screenshotsUrl = `https://api.rawg.io/api/games/${rawgId}/screenshots?key=${RAWG_API_KEY}`
      console.log('🖼️ Screenshots URL:', screenshotsUrl)
      
      const screenshotsResponse = await fetch(screenshotsUrl)
      console.log('🖼️ Screenshots response status:', screenshotsResponse.status)
      
      if (screenshotsResponse.ok) {
        const screenshotsData = await screenshotsResponse.json()
        console.log('🖼️ Screenshots data:', screenshotsData)
        
        if (screenshotsData.results && screenshotsData.results.length > 0) {
          console.log('🖼️ ✅ Found', screenshotsData.results.length, 'screenshots')
          
          screenshotsData.results.slice(0, 4).forEach((screenshot: any, index: number) => {
            console.log(`🖼️ Screenshot ${index + 1}:`, screenshot.image)
            images.push({
              url: screenshot.image,
              type: 'screenshot',
              aspectRatio: 16/9
            })
          })
        } else {
          console.log('🖼️ ❌ No screenshots in results')
        }
      } else {
        const errorText = await screenshotsResponse.text()
        console.log('🖼️ ❌ Screenshots error:', screenshotsResponse.status, errorText)
      }
      
      // Test 2: Game details pour background_image
      console.log('🖼️ Testing game details endpoint...')
      const gameUrl = `https://api.rawg.io/api/games/${rawgId}?key=${RAWG_API_KEY}`
      console.log('🖼️ Game details URL:', gameUrl)
      
      const gameResponse = await fetch(gameUrl)
      console.log('🖼️ Game response status:', gameResponse.status)
      
      if (gameResponse.ok) {
        const gameData = await gameResponse.json()
        console.log('🖼️ Game data received:', {
          name: gameData.name,
          background_image: gameData.background_image,
          screenshots_count: gameData.screenshots?.length || 0
        })
        
        if (gameData.background_image) {
          console.log('🖼️ ✅ Found background image:', gameData.background_image)
          images.unshift({
            url: gameData.background_image,
            type: 'background',
            aspectRatio: 16/9
          })
        }
        
        // Essayer aussi les screenshots dans gameData
        if (gameData.screenshots && gameData.screenshots.length > 0) {
          console.log('🖼️ Found screenshots in game data:', gameData.screenshots.length)
          gameData.screenshots.slice(0, 3).forEach((screenshot: any, index: number) => {
            if (screenshot.image) {
              console.log(`🖼️ Game data screenshot ${index + 1}:`, screenshot.image)
              images.push({
                url: screenshot.image,
                type: 'screenshot',
                aspectRatio: 16/9
              })
            }
          })
        }
      } else {
        const errorText = await gameResponse.text()
        console.log('🖼️ ❌ Game details error:', gameResponse.status, errorText)
      }
      
    } catch (error) {
      console.error('🖼️ ❌ RAWG test error:', error)
    }
    
    // Si aucune image RAWG, ajouter des images de test directes
    if (images.length === 0) {
      console.log('🖼️ No RAWG images, adding test images...')
      
      // Images de test garanties (gaming Unsplash)
      const testImages = [
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop&q=80'
      ]
      
      testImages.forEach((url, index) => {
        console.log(`🖼️ Adding test image ${index + 1}:`, url)
        images.push({
          url,
          type: 'artwork',
          aspectRatio: 16/9
        })
      })
    }
    
    console.log('🖼️ RAWG test final result:', images.length, 'images')
    return images
  }

  // FONCTION DE TEST DIRECT IGDB API
  const testIGDBDirectly = async (gameId: string, gameName: string) => {
    console.log('🖼️ Testing IGDB API for:', gameName)
    
    const images: Array<{url: string, type: string, aspectRatio: number}> = []
    
    try {
      // IGDB nécessite un token Twitch, mais on peut essayer une approche simple
      // Note: IGDB API nécessite une authentification Twitch plus complexe
      console.log('🖼️ IGDB requires Twitch authentication - skipping for now')
      
      // À la place, on va utiliser une API alternative plus simple
      // ou rechercher des images par nom de jeu
      
    } catch (error) {
      console.error('🖼️ ❌ IGDB test error:', error)
    }
    
    // Si aucune image IGDB, ajouter des images de test garanties
    if (images.length === 0) {
      console.log('🖼️ IGDB not available, adding guaranteed fallback images...')
      
      // Images gaming différentes pour tester
      const fallbackImages = [
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556065808-f644d4d28847?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=450&fit=crop&q=80'
      ]
      
      fallbackImages.forEach((url, index) => {
        console.log(`🖼️ Adding IGDB fallback image ${index + 1}:`, url)
        images.push({
          url,
          type: 'screenshot',
          aspectRatio: 16/9
        })
      })
    }
    
    console.log('🖼️ IGDB test final result:', images.length, 'images')
    return images
  }

  // FONCTION D'IMAGES GARANTIES (Option 3)
  const testGuaranteedImages = async (gameId: string, gameName: string) => {
    console.log('🖼️ Creating guaranteed images for:', gameName)
    
    const images: Array<{url: string, type: string, aspectRatio: number}> = []
    
    // Collection d'images gaming de haute qualité garanties depuis Unsplash
    const guaranteedUrls = [
      // Gaming setups et équipements
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80&auto=format',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&q=80&auto=format',
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop&q=80&auto=format',
      
      // Gaming art et scènes
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop&q=80&auto=format',
      'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=450&fit=crop&q=80&auto=format',
      'https://images.unsplash.com/photo-1556065808-f644d4d28847?w=800&h=450&fit=crop&q=80&auto=format',
      
      // Consoles et gaming
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop&q=80&auto=format',
      'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=450&fit=crop&q=80&auto=format'
    ]
    
    guaranteedUrls.forEach((url, index) => {
      console.log(`🖼️ Adding guaranteed image ${index + 1}:`, url)
      images.push({
        url,
        type: 'screenshot',
        aspectRatio: 16/9
      })
    })
    
    // Ajouter une image personnalisée avec le nom du jeu
    const customImageUrl = `https://via.placeholder.com/800x450/1a202c/ffffff?text=${encodeURIComponent(gameName.substring(0, 20))}`
    console.log('🖼️ Adding custom game image:', customImageUrl)
    images.push({
      url: customImageUrl,
      type: 'background',
      aspectRatio: 16/9
    })
    
    console.log('🖼️ Guaranteed images final result:', images.length, 'images')
    return images
  }

  const fetchReviews = async (gameId: string, gameName: string) => {
    setReviewsLoading(true)
    try {
      console.log('📝 Fetching reviews for game:', gameName)
      
      // Fetch API reviews
      const reviewsResponse = await reviewsService.getGameReviews(gameId, gameName)
      setGameReviews(reviewsResponse.reviews)
      console.log('📝 Loaded', reviewsResponse.reviews.length, 'API reviews')
      
      // Fetch user public reviews
      const publicReviews = await userReviewsService.getPublicReviewsForMedia(gameId)
      setUserPublicReviews(publicReviews)
      console.log('📝 Loaded', publicReviews.length, 'user public reviews')
      
      // Fetch current user's review (if any)
      const userReview = await userReviewsService.getUserReviewForMedia(gameId)
      setCurrentUserReview(userReview)
      if (userReview) {
        setUserRating(userReview.rating)
        setUserReview(userReview.review_text || '')
        console.log('📝 Found existing user review')
      }
    } catch (error) {
      console.error('📝 Error fetching reviews:', error)
      setGameReviews([])
      setUserPublicReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchRealSimilarGames = async (genres: any[], tags: any[], excludeGameId: number) => {
    setLoadingSimilar(true)
    try {
      console.log('🎮 Fetching real similar games for genres:', genres.map(g => g.name))
      
      // Construire la requête avec le genre principal
      const mainGenre = genres[0].name.toLowerCase()
      let searchParams = new URLSearchParams({
        key: RAWG_API_KEY,
        page_size: '12', // Réduit de 20 à 12
        ordering: '-rating',
        metacritic: '70,100'
      })

      if (mainGenre) {
        searchParams.append('genres', mainGenre)
      }

      // 🚀 OPTIMISATION: Utiliser le cache
      const similarUrl = `https://api.rawg.io/api/games?${searchParams}`
      const cacheKey = `similar-${mainGenre}-${excludeGameId}`
      const data = await fetchWithCache(similarUrl, cacheKey)
      
      // Filtrer et trier par pertinence
      let filteredGames = (data.results || [])
        .filter((game: any) => game.id !== excludeGameId)
        .filter((game: any) => game.rating >= 3.5)
        .slice(0, 8)

      filteredGames = filteredGames.map((game: any) => ({
        ...game,
        relevanceScore: calculateRelevanceScore(game, genres, tags)
      })).sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)

      setSimilarGames(filteredGames.slice(0, 8))
      setSimilarGamesLoaded(true)
      
    } catch (error) {
      console.error('🎮 Error fetching real similar games:', error)
      setSimilarGames(mockSimilarGames.filter(g => g.id !== excludeGameId))
      setSimilarGamesLoaded(true)
    } finally {
      setLoadingSimilar(false)
    }
  }

  const fetchRealDeveloperGames = async (developerName: string, excludeGameId: number) => {
    setLoadingDeveloper(true)
    try {
      console.log('🎮 Fetching real developer games for:', developerName)
      
      // D'abord, essayer de trouver le développeur par son nom exact
      const devSearchParams = new URLSearchParams({
        key: RAWG_API_KEY,
        search: developerName,
        page_size: '1'
      })

      const devResponse = await fetch(`https://api.rawg.io/api/developers?${devSearchParams}`)
      
      if (devResponse.ok) {
        const devData = await devResponse.json()
        console.log('🎮 Developer search response:', devData)
        
        if (devData.results && devData.results.length > 0) {
          const developer = devData.results[0]
          console.log('🎮 Found developer:', developer)
          
          // Utiliser l'ID du développeur pour chercher ses jeux
          const gamesParams = new URLSearchParams({
            key: RAWG_API_KEY,
            developers: developer.id.toString(),
            page_size: '20',
            ordering: '-rating'
          })
          
          const gamesResponse = await fetch(`https://api.rawg.io/api/games?${gamesParams}`)
          
          if (gamesResponse.ok) {
            const gamesData = await gamesResponse.json()
            console.log('🎮 Games by developer response:', gamesData)
            
            const developerGames = (gamesData.results || [])
              .filter((game: any) => game.id !== excludeGameId)
              .slice(0, 6)

            console.log('🎮 Final developer games:', developerGames)
            setDeveloperGames(developerGames)
            setDeveloperGamesLoaded(true)
            return
          }
        }
      }
      
      // Fallback : recherche générale avec filtre manuel
      console.log('🎮 Fallback: searching by developer name in general search')
      const fallbackParams = new URLSearchParams({
        key: RAWG_API_KEY,
        search: `"${developerName}"`, // Recherche avec guillemets pour plus de précision
        page_size: '20',
        ordering: '-rating'
      })

      const fallbackResponse = await fetch(`https://api.rawg.io/api/games?${fallbackParams}`)
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        console.log('🎮 Fallback search response:', fallbackData)
        
        // Filtrer manuellement les jeux du développeur
        const developerGames = (fallbackData.results || [])
          .filter((game: any) => game.id !== excludeGameId)
          .filter((game: any) => {
            if (!game.developers || game.developers.length === 0) return false
            return game.developers.some((dev: any) => {
              const devNameLower = dev.name.toLowerCase()
              const targetDevLower = developerName.toLowerCase()
              return devNameLower.includes(targetDevLower) || 
                     targetDevLower.includes(devNameLower) ||
                     devNameLower === targetDevLower
            })
          })
          .slice(0, 6)

        console.log('🎮 Filtered fallback developer games:', developerGames)
        setDeveloperGames(developerGames)
        setDeveloperGamesLoaded(true)
      }
      
    } catch (error) {
      console.error('🎮 Error fetching real developer games:', error)
      // Fallback to mock data
      setDeveloperGames(mockDeveloperGames.filter(g => g.id !== excludeGameId))
      setDeveloperGamesLoaded(true)
    } finally {
      setLoadingDeveloper(false)
    }
  }

  const calculateRelevanceScore = (game: any, targetGenres: any[], targetTags: any[]) => {
    let score = 0
    
    // Score de base sur le rating
    score += game.rating * 10
    
    // Bonus pour les genres correspondants
    if (game.genres) {
      const matchingGenres = game.genres.filter((genre: any) => 
        targetGenres.some(targetGenre => 
          targetGenre.name.toLowerCase() === genre.name.toLowerCase()
        )
      )
      score += matchingGenres.length * 20
    }
    
    // Bonus pour les tags correspondants
    if (game.tags && targetTags) {
      const matchingTags = game.tags.filter((tag: any) => 
        targetTags.some((targetTag: any) => 
          targetTag.name.toLowerCase() === tag.name.toLowerCase()
        )
      )
      score += matchingTags.length * 5
    }
    
    // Bonus pour les jeux populaires
    if (game.rating_count > 1000) {
      score += 10
    }
    
    return score
  }

  const handleStatusSelect = (status: MediaStatus | 'remove') => {
    if (!gameDetail) return
    
    if (status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(gameId)
      }
      setSelectedStatus(null)
    } else {
      const gameItem = {
        id: gameId,
        title: gameDetail.name,
        image: gameDetail.background_image,
        category: 'games' as const,
        year: gameDetail.released ? new Date(gameDetail.released).getFullYear() : 2024,
        rating: gameDetail.rating
      }
      
      onAddToLibrary(gameItem, status)
      setSelectedStatus(status)
    }
    setShowLibraryDropdown(false)
  }

  const getStatusLabel = (status: MediaStatus | null) => {
    if (!status) return 'Add to Library'
    switch (status) {
      case 'want-to-play': return 'Want to Play'
      case 'currently-playing': return 'Playing'
      case 'completed': return 'Completed'
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
    if (userRating > 0 && gameDetail) {
      // Sauvegarder dans notre nouveau système
      const savedReview = await userReviewsService.submitReview({
        mediaId: gameId,
        mediaTitle: gameDetail.name,
        mediaCategory: 'games',
        rating: userRating,
        reviewText: userReview.trim(),
        isPublic: reviewPrivacy === 'public'
      })
      
      if (savedReview) {
        console.log('✅ Review saved successfully')
        
        // Si publique, actualiser la liste des reviews publiques
        if (reviewPrivacy === 'public') {
          const updatedPublicReviews = await userReviewsService.getPublicReviewsForMedia(gameId)
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
      // Ne pas réinitialiser rating et review car l'utilisateur a maintenant une review existante
    }
  }

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
        ) : gameDetail ? (
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
                  <h1 className="text-2xl font-bold text-white mb-2">{gameDetail.name}</h1>
                  
                  {/* Metadata */}
                  <div className="flex items-center space-x-2 text-[#B0B0B0] text-sm">
                    <span>{gameDetail.released ? new Date(gameDetail.released).getFullYear() : 'TBA'}</span>
                    <span>•</span>
                    <span>{gameDetail.genres?.[0]?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{gameDetail.platforms?.map(p => p.platform.name).slice(0, 2).join(', ') || 'PC'}</span>
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
                  { key: 'moreinfo' as const, label: 'My Game Card' }
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
                  {/* Simplified Media Gallery - No more black screens */}
                  <div className="space-y-4">
                    {imagesLoading ? (
                      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-sm">Loading images...</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Trailer Section (if available) */}
                        {gameTrailer && gameTrailer.provider !== 'none' && (
                          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                            {gameTrailer.provider === 'youtube' && gameTrailer.videoId ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${gameTrailer.videoId}?autoplay=0&rel=0`}
                                title={`${gameDetail.name} trailer`}
                                className="w-full h-full"
                                allowFullScreen
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <div className="text-center text-white">
                                  <Play size={48} className="mx-auto mb-2 opacity-60" />
                                  <p className="text-sm opacity-75">Trailer Available</p>
                                  <a 
                                    href={gameTrailer.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 text-xs hover:underline"
                                  >
                                    Watch on {gameTrailer.provider}
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Images Grid - Simple and guaranteed to work */}
                        {gameImages.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-white font-medium text-sm">Game Screenshots</h4>
                            <div className="grid grid-cols-1 gap-3">
                              {/* Main Image */}
                              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                                <img
                                  src={gameImages[currentImageIndex]}
                                  alt={`${gameDetail.name} screenshot ${currentImageIndex + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.log('🖼️ Image failed to load:', gameImages[currentImageIndex])
                                    const target = e.target as HTMLImageElement
                                    target.src = 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80'
                                  }}
                                  onLoad={() => console.log('🖼️ ✅ Image loaded successfully:', gameImages[currentImageIndex])}
                                />
                                
                                {/* Image Navigation */}
                                {gameImages.length > 1 && (
                                  <>
                                    <button
                                      onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : gameImages.length - 1)}
                                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                                    >
                                      <ChevronRight size={20} className="rotate-180" />
                                    </button>
                                    <button
                                      onClick={() => setCurrentImageIndex(prev => prev < gameImages.length - 1 ? prev + 1 : 0)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                                    >
                                      <ChevronRight size={20} />
                                    </button>
                                    
                                    {/* Image Dots */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                                      {gameImages.map((_, index) => (
                                        <button
                                          key={index}
                                          onClick={() => setCurrentImageIndex(index)}
                                          className={`w-2 h-2 rounded-full transition-colors ${
                                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Thumbnail row */}
                              {gameImages.length > 1 && (
                                <div className="flex space-x-2 overflow-x-auto pb-2">
                                  {gameImages.map((image, index) => (
                                    <button
                                      key={index}
                                      onClick={() => setCurrentImageIndex(index)}
                                      className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors ${
                                        index === currentImageIndex ? 'border-white' : 'border-transparent'
                                      }`}
                                    >
                                      <img
                                        src={image}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.src = 'https://via.placeholder.com/80x48/333/fff?text=No+Image'
                                        }}
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Fallback if no images */}
                        {gameImages.length === 0 && (
                          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                            <img
                              src={gameDetail.background_image || 'https://via.placeholder.com/640x360/1a1a1a/ffffff?text=No+Image'}
                              alt={`${gameDetail.name} artwork`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                              <div className="w-12 h-12 mx-auto mb-2 opacity-50">📷</div>
                              <p className="text-white text-sm opacity-75">No screenshots available</p>
                              <p className="text-gray-300 text-xs opacity-50 mt-1">Showing game artwork</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                          Want to Play
                        </button>
                        <button
                          onClick={() => handleStatusSelect('currently-playing')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Playing
                        </button>
                        <button
                          onClick={() => handleStatusSelect('completed')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Completed
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

                  {/* Rate this game - Only show if Playing or Completed */}
                  {(selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Rate this game</h3>
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
                        <h4 className="text-white font-medium mb-3">Share your thoughts about this game</h4>
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

                  {/* Review Scores */}
                  <div className="flex space-x-4">
                    {/* Metacritic Score */}
                    {gameDetail.metacritic && (
                      <div className="flex items-center space-x-2">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          gameDetail.metacritic >= 80 ? 'bg-green-700' :
                          gameDetail.metacritic >= 70 ? 'bg-yellow-600' :
                          gameDetail.metacritic >= 60 ? 'bg-orange-600' : 'bg-red-600'
                        }`}>
                          <span className="text-white font-bold text-lg">{gameDetail.metacritic}</span>
                        </div>
                        <span className="text-[#B0B0B0] text-sm">Metacritic</span>
                      </div>
                    )}
                    
                    {/* OpenCritic Score - Calculated from user rating */}
                    {gameDetail.rating && gameDetail.rating_count >= 10 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{Math.round(gameDetail.rating * 20)}</span>
                        </div>
                        <span className="text-[#B0B0B0] text-sm">User Score</span>
                      </div>
                    )}
                    
                    {/* Show placeholder if no scores available */}
                    {!gameDetail.metacritic && (!gameDetail.rating || gameDetail.rating_count < 10) && (
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 font-bold text-sm">N/A</span>
                        </div>
                        <span className="text-[#B0B0B0] text-sm">No Scores</span>
                      </div>
                    )}
                  </div>

                  {/* Where to Play */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Where to Play</h3>
                    <button
                      onClick={() => setShowAllPlatforms(!showAllPlatforms)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors">
                        <div className="flex items-center space-x-3">
                          <span className="text-white">Steam • Official</span>
                        </div>
                        <ChevronRight className={`text-gray-400 transition-transform ${showAllPlatforms ? 'rotate-90' : ''}`} size={20} />
                      </div>
                    </button>
                    
                    {showAllPlatforms && (
                      <div className="mt-2 space-y-2">
                        {gameDetail.stores?.map((store, index) => (
                          <a
                            key={index}
                            href={store.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            <span className="text-white">{store.store.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Developer/Publisher */}
                  <div>
                    <button
                      onClick={() => setShowPublisher(!showPublisher)}
                      className="w-full text-left flex items-center justify-between text-[#B0B0B0]"
                    >
                      <span>Developer: {gameDetail.developers?.[0]?.name || 'Unknown'}</span>
                      <ChevronRight className={`transition-transform ${showPublisher ? 'rotate-90' : ''}`} size={16} />
                    </button>
                    
                    {showPublisher && (
                      <div className="mt-2 text-[#B0B0B0]">
                        Publisher: {gameDetail.publishers?.[0]?.name || 'Unknown'}
                      </div>
                    )}
                  </div>

                  {/* Release Date */}
                  <div className="text-[#B0B0B0] text-sm">
                    Released: {gameDetail.released ? new Date(gameDetail.released).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'TBA'}
                  </div>

                  {/* Overview */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Overview</h3>
                    <div className="text-[#B0B0B0] leading-relaxed">
                      <p className={`${!showFullOverview ? 'line-clamp-3' : ''}`}>
                        {gameDetail.description_raw || 'No description available.'}
                      </p>
                      {gameDetail.description_raw && gameDetail.description_raw.length > 150 && (
                        <button
                          onClick={() => setShowFullOverview(!showFullOverview)}
                          className="text-white text-sm mt-2 flex items-center space-x-1 hover:underline"
                        >
                          <span>{showFullOverview ? 'Less' : 'More'}</span>
                          <ChevronRight className={`transition-transform ${showFullOverview ? 'rotate-90' : ''}`} size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Similar Games */}
                  <div>
                    <h3 className="text-white font-medium mb-4">Similar Games</h3>
                    <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                      {similarGames.map((game) => (
                        <div 
                          key={game.id} 
                          className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            // Ouvrir le détail de ce jeu
                            window.location.href = `#game-${game.id}`
                            onClose()
                          }}
                        >
                          <img
                            src={game.background_image || game.image || 'https://via.placeholder.com/112x144/333/fff?text=No+Image'}
                            alt={game.name}
                            className="w-full h-36 object-cover rounded-lg mb-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'https://via.placeholder.com/112x144/333/fff?text=No+Image'
                            }}
                          />
                          <p className="text-white text-sm truncate" title={game.name}>{game.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* More from this developer */}
                  {gameDetail.developers?.[0] && (
                    <div>
                      <h3 className="text-white font-medium mb-4">
                        More from {gameDetail.developers[0].name}
                      </h3>
                      {developerGames.length > 0 ? (
                        <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                          {developerGames.map((game) => (
                            <div 
                              key={game.id} 
                              className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                // Ouvrir le détail de ce jeu
                                window.location.href = `#game-${game.id}`
                                onClose()
                              }}
                            >
                              <img
                                src={game.background_image || game.image || 'https://via.placeholder.com/112x144/333/fff?text=No+Image'}
                                alt={game.name}
                                className="w-full h-36 object-cover rounded-lg mb-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = 'https://via.placeholder.com/112x144/333/fff?text=No+Image'
                                }}
                              />
                              <p className="text-white text-sm truncate" title={game.name}>{game.name}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[#B0B0B0] text-sm">
                          No other games found from this developer
                        </div>
                      )}
                    </div>
                  )}

                  {/* ESRB Rating at bottom */}
                  <div className="mt-8 pt-4 border-t border-gray-800">
                    <div className="flex justify-center">
                      <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg px-4 py-2">
                        <span className="text-[#B0B0B0] text-sm">
                          {gameDetail.esrb_rating?.name ? `Rated ${gameDetail.esrb_rating.name}` : 'Not Rated'}
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
                      {gameReviews.length + userPublicReviews.length} reviews
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
                  ) : gameReviews.length > 0 || userPublicReviews.length > 0 ? (
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
                      {gameReviews.map((review) => (
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
                              review.platform === 'steam' ? 'bg-blue-900 text-blue-200' :
                              review.platform === 'metacritic' ? 'bg-yellow-900 text-yellow-200' :
                              review.platform === 'reddit' ? 'bg-orange-900 text-orange-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {review.platform === 'steam' ? 'Steam' :
                               review.platform === 'metacritic' ? 'Metacritic' :
                               review.platform === 'reddit' ? 'Reddit' :
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
                            {review.playtime && (
                              <span>🎮 {review.playtime} played</span>
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
                      <p className="text-[#B0B0B0] text-sm">Be the first to review this game</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="p-4 space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-white font-medium text-lg mb-2">My Game Card</h3>
                    <p className="text-[#B0B0B0] text-sm">Track your personal gaming experience</p>
                  </div>

                  {/* Personal Gaming Info Form */}
                  <div className="space-y-4">
                    {/* Date Played */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Date Played</label>
                      <input 
                        type="date" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="When did you play this?"
                      />
                    </div>

                    {/* Platform Used */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Platform Used</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select platform...</option>
                        <option value="pc">PC (Steam)</option>
                        <option value="ps5">PlayStation 5</option>
                        <option value="ps4">PlayStation 4</option>
                        <option value="xbox-series">Xbox Series X/S</option>
                        <option value="xbox-one">Xbox One</option>
                        <option value="nintendo-switch">Nintendo Switch</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Access Method */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">How did you access it?</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select access method...</option>
                        <option value="purchased-full">Purchased (Full Price)</option>
                        <option value="purchased-sale">Purchased (On Sale)</option>
                        <option value="game-pass">Xbox Game Pass</option>
                        <option value="ps-plus">PlayStation Plus</option>
                        <option value="epic-free">Epic Games (Free)</option>
                        <option value="beta">Beta Access</option>
                        <option value="demo">Demo</option>
                        <option value="borrowed">Borrowed/Shared</option>
                      </select>
                    </div>

                    {/* Purchase Price */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Purchase Price (Optional)</label>
                      <div className="flex space-x-2">
                        <span className="bg-[#0B0B0B] text-[#B0B0B0] text-sm rounded-lg p-3 border border-gray-700 flex items-center">$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          className="flex-1 bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Custom Tags */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Custom Tags</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="Add tags (e.g., multiplayer, story-rich, challenging...)"
                      />
                      <p className="text-[#B0B0B0] text-xs mt-2">Separate tags with commas</p>
                    </div>

                    {/* Personal Notes */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Personal Notes</label>
                      <textarea 
                        rows={4}
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors resize-none"
                        placeholder="Your thoughts, memories, or notes about this game..."
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                      <button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium py-3 px-4 rounded-lg transition-colors">
                        Save Game Card
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
                <span className="text-2xl">🎮</span>
              </div>
              <p className="text-white font-medium mb-2">Game not found</p>
              <p className="text-[#B0B0B0] text-sm">Unable to load game details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
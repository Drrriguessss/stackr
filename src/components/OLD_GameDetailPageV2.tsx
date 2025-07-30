'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Tag, Globe, Check, Share2, ChevronDown, ChevronUp, Play, User } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
// igdbService ne contient plus getGameImages, nous utilisons directement l'API RAWG

interface GameDetailPageV2Props {
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

export default function GameDetailPageV2({ 
  isOpen, 
  onClose, 
  gameId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  googleReviews, 
  onReviewSubmit 
}: GameDetailPageV2Props) {
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [similarGames, setSimilarGames] = useState<any[]>([])
  const [developerGames, setDeveloperGames] = useState<any[]>([])
  const [similarGamesLoading, setSimilarGamesLoading] = useState(true)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [gameImages, setGameImages] = useState<any[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)
  
  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    whereToPlay: false,
    developer: false,
    overview: false
  })

  const scrollableRef = useRef<HTMLDivElement>(null)

  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''

  // Steam Reviews (fallback data)
  const steamReviews = [
    { id: 1, username: 'SteamMaster', rating: 5, text: 'Absolutely incredible! Best game I\'ve played this year.', date: '2024-01-15' },
    { id: 2, username: 'GameReviewer', rating: 4, text: 'Great storyline and graphics. Minor bugs but overall excellent.', date: '2024-01-12' },
    { id: 3, username: 'RPGLover', rating: 5, text: 'Perfect RPG experience. Hours of entertainment guaranteed.', date: '2024-01-10' },
    { id: 4, username: 'CasualGamer', rating: 4, text: 'Fun and engaging. Worth the money spent.', date: '2024-01-08' }
  ]

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setSimilarGames([])
      setDeveloperGames([])
      setSimilarGamesLoading(true)
      setGameImages([])
      setImagesLoading(false)
      setExpandedSections({
        whereToPlay: false,
        developer: false,
        overview: false
      })
    }
  }, [isOpen, gameId])

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
    if (isOpen && gameId) {
      fetchGameDetail()
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

  const fetchGameDetail = async () => {
    if (!gameId) return
    
    setLoading(true)
    try {
      let rawgId = gameId
      
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }
      
      if (isNaN(Number(rawgId))) {
        const searchResponse = await fetch(
          `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(rawgId)}&page_size=1`
        )
        const searchData = await searchResponse.json()
        
        if (searchData.results && searchData.results.length > 0) {
          rawgId = searchData.results[0].id.toString()
        } else {
          throw new Error('Game not found in search')
        }
      }
      
      const response = await fetch(
        `https://api.rawg.io/api/games/${rawgId}?key=${RAWG_API_KEY}`
      )
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      setGameDetail(data)
      
      // Fetch real images using igdbService
      await fetchGameImages(rawgId, data.name)
      
      // Fetch similar games and developer games
      if (data.genres && data.genres.length > 0) {
        await fetchSimilarGames(data.genres[0].id, data.id)
      }
      if (data.developers && data.developers.length > 0) {
        await fetchDeveloperGames(data.developers[0].id, data.id)
      }
      
      setSimilarGamesLoading(false)
      
    } catch (error) {
      console.error('Error loading game details:', error)
      setGameDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchGameImages = async (rawgId: string, gameName: string) => {
    try {
      setImagesLoading(true)
      console.log('🖼️ Fetching RAWG screenshots for:', gameName, 'ID:', rawgId)
      
      const images: any[] = []
      
      // 1. Récupérer les screenshots depuis RAWG
      const screenshotsResponse = await fetch(
        `https://api.rawg.io/api/games/${rawgId}/screenshots?key=${RAWG_API_KEY}`
      )
      
      if (screenshotsResponse.ok) {
        const screenshotsData = await screenshotsResponse.json()
        console.log('🖼️ RAWG screenshots response:', screenshotsData?.results?.length || 0, 'screenshots')
        
        if (screenshotsData?.results && screenshotsData.results.length > 0) {
          screenshotsData.results.slice(0, 6).forEach((screenshot: any) => {
            images.push({
              url: screenshot.image,
              type: 'screenshot',
              width: screenshot.width || 1920,
              height: screenshot.height || 1080
            })
          })
        }
      }
      
      // 2. Si on a des images, les utiliser
      if (images.length > 0) {
        setGameImages(images)
        console.log('🖼️ ✅ Successfully loaded', images.length, 'real screenshots')
      } else {
        console.log('🖼️ ⚠️ No screenshots found, using fallback images')
        // Fallback avec images génériques mais différentes selon le jeu
        const fallbackImages = generateGameSpecificFallbacks(gameName)
        setGameImages(fallbackImages)
      }
      
    } catch (error) {
      console.error('🖼️ Error fetching game images:', error)
      // En cas d'erreur, utiliser des fallbacks
      const fallbackImages = generateGameSpecificFallbacks(gameName)
      setGameImages(fallbackImages)
    } finally {
      setImagesLoading(false)
    }
  }

  const generateGameSpecificFallbacks = (gameName: string) => {
    console.log('🖼️ Generating fallbacks for:', gameName)
    
    // Créer un hash simple du nom pour avoir des images cohérentes par jeu
    const gameHash = gameName.toLowerCase().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    const imageIndex = Math.abs(gameHash) % 4
    
    // Différentes collections d'images gaming selon le hash
    const imageSets = [
      // Set 1: Gaming setup
      [
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop&q=80'
      ],
      // Set 2: Gaming art
      [
        'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556065808-f644d4d28847?w=800&h=450&fit=crop&q=80'
      ],
      // Set 3: Esports
      [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&h=450&fit=crop&q=80'
      ],
      // Set 4: Controllers and devices
      [
        'https://images.unsplash.com/photo-1586182987320-4f376d39d787?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&h=450&fit=crop&q=80',
        'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800&h=450&fit=crop&q=80'
      ]
    ]
    
    const selectedSet = imageSets[imageIndex]
    
    return selectedSet.map((url, index) => ({
      url,
      type: index === 0 ? 'cover' : 'screenshot',
      width: 800,
      height: 450
    }))
  }

  const fetchSimilarGames = async (genreId: number, excludeGameId: number) => {
    try {
      const response = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=20&ordering=-rating&metacritic=70,100`
      )
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      
      const data = await response.json()
      const filteredGames = (data.results || [])
        .filter((game: any) => game.id !== excludeGameId)
        .slice(0, 8)
      
      setSimilarGames(filteredGames)
    } catch (error) {
      console.error('Error fetching similar games:', error)
      setSimilarGames([])
    }
  }

  const fetchDeveloperGames = async (developerId: number, excludeGameId: number) => {
    try {
      const response = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=20&ordering=-released&dates=2020-01-01,2024-12-31`
      )
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      
      const data = await response.json()
      const filteredGames = (data.results || [])
        .filter((game: any) => game.id !== excludeGameId)
        .slice(0, 6)
      
      setDeveloperGames(filteredGames)
    } catch (error) {
      console.error('Error fetching developer games:', error)
      setDeveloperGames([])
    }
  }

  const handleStatusSelect = (status: MediaStatus) => {
    if (!gameDetail) return
    
    if (selectedStatus === status) {
      // Remove from library
      if (onDeleteItem) {
        onDeleteItem(gameId)
      }
      setSelectedStatus(null)
    } else {
      // Add/Update status
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
  }

  const getStatusLabel = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'Want to Play'
      case 'currently-playing': return 'Playing'
      case 'completed': return 'Completed'
      default: return status
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleShare = () => {
    setShowShareOptions(!showShareOptions)
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
        className="bg-white rounded-2xl w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col shadow-xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : gameDetail ? (
          <>
            {/* Header moderne avec titre, statut et partage */}
            <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 p-2 hover:bg-white/80 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="p-6">
                {/* Titre et boutons */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{gameDetail.name}</h1>
                    
                    {/* Metadata : Année • Genre • Franchise */}
                    <div className="flex items-center space-x-2 text-gray-600 text-sm mb-4">
                      <span>{gameDetail.released ? new Date(gameDetail.released).getFullYear() : 'TBA'}</span>
                      {gameDetail.genres?.[0] && (
                        <>
                          <span>•</span>
                          <span>{gameDetail.genres[0].name}</span>
                        </>
                      )}
                      {gameDetail.developers?.[0] && (
                        <>
                          <span>•</span>
                          <span className="font-medium">{gameDetail.developers[0].name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3 ml-4">
                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={selectedStatus || ''}
                        onChange={(e) => handleStatusSelect(e.target.value as MediaStatus)}
                        className="appearance-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 pr-8 rounded-lg font-medium text-sm transition-colors cursor-pointer"
                      >
                        <option value="">Add to Library</option>
                        <option value="want-to-play">Want to Play</option>
                        <option value="currently-playing">Playing</option>
                        <option value="completed">Completed</option>
                        {selectedStatus && <option value="remove">Remove from Library</option>}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                    </div>

                    {/* Share Button */}
                    <div className="relative">
                      <button
                        onClick={handleShare}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2"
                      >
                        <Share2 size={16} />
                        <span>Share</span>
                      </button>
                      
                      {showShareOptions && (
                        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2 min-w-40">
                          <div className="text-xs text-gray-500 p-2">Coming soon!</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex px-6">
                {[
                  { key: 'overview' as const, label: 'Overview' },
                  { key: 'reviews' as const, label: 'Reviews' },
                  { key: 'moreinfo' as const, label: 'More Info' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-4 px-4 font-medium transition-colors relative ${
                      activeTab === tab.key
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                  {/* Media Section - Real Images from RAWG */}
                  {gameImages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Media</h3>
                      <div className="flex space-x-4 overflow-x-auto pb-2">
                        {gameImages.slice(0, 6).map((image, index) => (
                          <div key={index} className="relative flex-shrink-0 group">
                            <img
                              src={image.url}
                              alt={`${image.type === 'cover' ? 'Cover' : 'Screenshot'} ${index + 1}`}
                              className="w-60 h-32 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity cursor-pointer"
                            />
                            {index === 0 && image.type === 'cover' && (
                              <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                                <Play size={24} className="text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rate this game */}
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate this game</h3>
                    <div className="flex items-center space-x-2 mb-4">
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
                            size={28}
                            className={`transition-colors ${
                              (hoverRating || userRating) >= rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-300 hover:text-yellow-400'
                            }`}
                          />
                        </button>
                      ))}
                      {userRating > 0 && (
                        <span className="text-gray-900 ml-2 font-medium text-lg">{userRating}/5</span>
                      )}
                    </div>
                    
                    {showReviewBox && userRating > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Share your thoughts</h4>
                        <textarea
                          value={userReview}
                          onChange={(e) => setUserReview(e.target.value)}
                          placeholder="What did you think about this game?"
                          className="w-full h-24 px-3 py-2 bg-white text-gray-900 text-sm rounded-lg resize-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex space-x-2 text-sm">
                            <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                              Private
                            </button>
                            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                              Share publicly
                            </button>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => {
                                setShowReviewBox(false)
                                setUserReview('')
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleSubmitReview}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scores */}
                  {gameDetail.metacritic && (
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Scores</h3>
                      <div className="flex space-x-6">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-600">Metacritic:</div>
                          <div className="text-2xl font-bold text-green-600">{gameDetail.metacritic}/100</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-600">OpenCritic:</div>
                          <div className="text-2xl font-bold text-gray-400">Coming soon</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Sections */}
                  <div className="border-t border-gray-100 pt-6 space-y-4">
                    {/* Where to play */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('whereToPlay')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">Where to play</span>
                        {expandedSections.whereToPlay ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      
                      {expandedSections.whereToPlay && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                          <div className="grid grid-cols-2 gap-3">
                            {gameDetail.stores?.slice(0, 4).map((store, index) => (
                              <a
                                key={index}
                                href={store.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 bg-white hover:bg-gray-50 p-3 rounded-lg text-gray-700 hover:text-gray-900 transition-colors border border-gray-200"
                              >
                                <ExternalLink size={16} />
                                <span className="text-sm font-medium">{store.store.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Developer */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('developer')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">Developer</span>
                        {expandedSections.developer ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      
                      {expandedSections.developer && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Developer:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {gameDetail.developers?.[0]?.name || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Publisher:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {gameDetail.publishers?.[0]?.name || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Overview */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('overview')}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">Overview</span>
                        {expandedSections.overview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      
                      {expandedSections.overview && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                          <p className="text-gray-700 leading-relaxed text-sm">
                            {gameDetail.description_raw || 'No description available.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Similar Games */}
                  {!similarGamesLoading && similarGames.length > 0 && (
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar Games</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {similarGames.slice(0, 8).map((game) => (
                          <div key={game.id} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer p-3">
                            <img
                              src={game.background_image}
                              alt={game.name}
                              className="w-full h-20 object-cover rounded-lg mb-2"
                            />
                            <h5 className="text-sm font-medium text-gray-900 truncate" title={game.name}>
                              {game.name}
                            </h5>
                            <div className="flex items-center mt-1">
                              <Star size={12} className="text-yellow-500 fill-current mr-1" />
                              <span className="text-xs text-gray-600">{game.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Games by same developer */}
                  {!similarGamesLoading && developerGames.length > 0 && gameDetail.developers?.[0] && (
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Games by {gameDetail.developers[0].name}
                      </h3>
                      <div className="flex space-x-4 overflow-x-auto pb-2">
                        {developerGames.slice(0, 6).map((game) => (
                          <div key={game.id} className="flex-shrink-0 w-40 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer p-3">
                            <img
                              src={game.background_image}
                              alt={game.name}
                              className="w-full h-20 object-cover rounded-lg mb-2"
                            />
                            <h5 className="text-sm font-medium text-gray-900 truncate" title={game.name}>
                              {game.name}
                            </h5>
                            <div className="flex items-center mt-1">
                              <Star size={12} className="text-yellow-500 fill-current mr-1" />
                              <span className="text-xs text-gray-600">{game.rating?.toFixed(1) || 'N/A'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="p-6 space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                  
                  {/* User reviews first */}
                  {userReviews.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Your Reviews</h4>
                      <div className="space-y-3">
                        {userReviews.map((review) => (
                          <div key={review.id} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <div className="flex items-center space-x-2 mb-2">
                              <User size={16} className="text-blue-600" />
                              <span className="text-sm font-medium text-gray-900">{review.username}</span>
                              <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded-full">You</span>
                            </div>
                            <div className="flex items-center space-x-1 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={`${
                                    star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {review.review || review.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Steam reviews */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Community Reviews</h4>
                    <div className="space-y-3">
                      {steamReviews.map((review) => (
                        <div key={review.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-xs">🎮</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{review.username}</span>
                            <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-full">Steam</span>
                          </div>
                          <div className="flex items-center space-x-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={`${
                                  star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {review.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="p-6 space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">More Information</h3>
                  
                  {/* Technical Information */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Technical Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ESRB Rating:</span>
                        <span className="text-gray-900 font-medium">
                          {gameDetail.esrb_rating?.name || 'Not Rated'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Metacritic:</span>
                        <span className="text-gray-900 font-medium">
                          {gameDetail.metacritic ? `${gameDetail.metacritic}/100` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-600">Release Date:</span>
                        <span className="text-gray-900 font-medium">
                          {gameDetail.released ? new Date(gameDetail.released).toLocaleDateString() : 'TBA'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {gameDetail.tags && gameDetail.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {gameDetail.tags.slice(0, 12).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200"
                          >
                            <Tag size={12} className="mr-1" />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Available Platforms</h4>
                    <div className="flex flex-wrap gap-2">
                      {gameDetail.platforms?.map((platform, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm border border-gray-200"
                        >
                          {platform.platform.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* External Links */}
                  {gameDetail.website && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">External Links</h4>
                      <a
                        href={gameDetail.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg text-gray-700 hover:text-gray-900 transition-colors border border-gray-200"
                      >
                        <Globe size={16} />
                        <span className="font-medium">Official Website</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-600">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">Game not found</p>
            <p className="text-sm">Unable to load game details. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
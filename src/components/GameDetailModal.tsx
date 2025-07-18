'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Tag, Globe, Check } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface GameDetailModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void // ✅ NOUVELLE PROP
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

export default function GameDetailModal({ 
  isOpen, 
  onClose, 
  gameId, 
  onAddToLibrary, 
  onDeleteItem, // ✅ NOUVELLE PROP
  library, 
  userReviews, 
  googleReviews, 
  onReviewSubmit 
}: GameDetailModalProps) {
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'social' | 'more'>('info')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [similarGames, setSimilarGames] = useState<any[]>([])
  const [developerGames, setDeveloperGames] = useState<any[]>([])
  const [similarGamesLoading, setSimilarGamesLoading] = useState(true)

  const scrollableRef = useRef<HTMLDivElement>(null)

  const gameStats = {
    'want-to-play': 1247,
    'currently-playing': 856,
    'completed': 3421
  }

  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'

  // Steam Reviews
  const steamReviews = [
    { id: 1, username: 'SteamMaster', rating: 5, text: 'Absolutely incredible! Best game I\'ve played this year.', date: '2024-01-15' },
    { id: 2, username: 'GameReviewer', rating: 4, text: 'Great storyline and graphics. Minor bugs but overall excellent.', date: '2024-01-12' },
    { id: 3, username: 'RPGLover', rating: 5, text: 'Perfect RPG experience. Hours of entertainment guaranteed.', date: '2024-01-10' },
    { id: 4, username: 'CasualGamer', rating: 4, text: 'Fun and engaging. Worth the money spent.', date: '2024-01-08' },
    { id: 5, username: 'ProPlayer', rating: 5, text: 'Masterpiece! Revolutionary gameplay mechanics.', date: '2024-01-05' }
  ]

  useEffect(() => {
    if (isOpen) {
      setActiveTab('info')
      setSimilarGames([])
      setDeveloperGames([])
      setSimilarGamesLoading(true)
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
      
      // Fetch similar games and developer games avec les IDs
      if (data.genres && data.genres.length > 0) {
        await fetchSimilarGames(data.genres[0].id, data.id) // Passer l'ID du genre et exclure le jeu actuel
      }
      if (data.developers && data.developers.length > 0) {
        await fetchDeveloperGames(data.developers[0].id, data.id) // Passer l'ID du développeur et exclure le jeu actuel
      }
      
      setSimilarGamesLoading(false)
      
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
      setGameDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchSimilarGames = async (genreId: number, excludeGameId: number) => {
    try {
      console.log('Fetching similar games for genre ID:', genreId, 'excluding game:', excludeGameId)
      
      // Essayer d'abord avec une requête générale sans filtre spécifique
      const response = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=20&ordering=-rating&metacritic=80,100`
      )
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Similar games response (fallback):', data)
      
      // Prendre les jeux populaires et exclure le jeu actuel
      const filteredGames = (data.results || [])
        .filter((game: any) => game.id !== excludeGameId)
        .slice(0, 6)
      
      console.log('Filtered similar games:', filteredGames)
      setSimilarGames(filteredGames)
    } catch (error) {
      console.error('Error fetching similar games:', error)
      // Utiliser les données de fallback statiques
      const fallbackGames = [
        {
          id: 3498,
          name: "Grand Theft Auto V",
          background_image: "https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg",
          rating: 4.47
        },
        {
          id: 5286,
          name: "Tomb Raider",
          background_image: "https://media.rawg.io/media/games/021/021c4e21a1824d2526f925eff6324653.jpg",
          rating: 4.05
        },
        {
          id: 13536,
          name: "Portal",
          background_image: "https://media.rawg.io/media/games/7fa/7fa0b586293c5861ee32490e953a4996.jpg",
          rating: 4.51
        },
        {
          id: 12020,
          name: "Left 4 Dead 2",
          background_image: "https://media.rawg.io/media/games/d58/d588947d4286e7b5e0e12e1bea7d9844.jpg",
          rating: 4.09
        },
        {
          id: 5679,
          name: "The Elder Scrolls V: Skyrim",
          background_image: "https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9afd5.jpg",
          rating: 4.42
        },
        {
          id: 58175,
          name: "God of War",
          background_image: "https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg",
          rating: 4.56
        }
      ].filter(game => game.id !== excludeGameId).slice(0, 6)
      setSimilarGames(fallbackGames)
    }
  }

  const fetchDeveloperGames = async (developerId: number, excludeGameId: number) => {
    try {
      console.log('Fetching developer games for developer ID:', developerId, 'excluding game:', excludeGameId)
      
      // Essayer d'abord avec une requête générale pour les jeux récents populaires
      const response = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&page_size=20&ordering=-released&dates=2020-01-01,2024-12-31`
      )
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Developer games response (fallback):', data)
      
      // Prendre les jeux récents et exclure le jeu actuel
      const filteredGames = (data.results || [])
        .filter((game: any) => game.id !== excludeGameId)
        .slice(0, 6)
      
      console.log('Filtered developer games:', filteredGames)
      setDeveloperGames(filteredGames)
    } catch (error) {
      console.error('Error fetching developer games:', error)
      // Utiliser les données de fallback statiques
      const fallbackGames = [
        {
          id: 4200,
          name: "Portal 2",
          background_image: "https://media.rawg.io/media/games/2ba/2bac0e87cf45e5b508f227d281c9252a.jpg",
          rating: 4.61
        },
        {
          id: 9767,
          name: "Hollow Knight",
          background_image: "https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg",
          rating: 4.64
        },
        {
          id: 1030,
          name: "Limbo",
          background_image: "https://media.rawg.io/media/games/942/9424d6bb763dc38d9378b488603c87fa.jpg",
          rating: 4.15
        },
        {
          id: 422,
          name: "Baldur's Gate 3",
          background_image: "https://media.rawg.io/media/games/699/69993db1cfcaf895c8b22603ee1aae62.jpg",
          rating: 4.63
        },
        {
          id: 41494,
          name: "Cyberpunk 2077",
          background_image: "https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg",
          rating: 4.13
        },
        {
          id: 28,
          name: "Red Dead Redemption 2",
          background_image: "https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg",
          rating: 4.54
        }
      ].filter(game => game.id !== excludeGameId).slice(0, 6)
      setDeveloperGames(fallbackGames)
    }
  }

  const handleStatusSelect = (status: MediaStatus) => {
    if (!gameDetail) return
    
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

  const getStatusLabel = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'Want to Play'
      case 'currently-playing': return 'Playing'
      case 'completed': return 'Completed'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'bg-orange-500 hover:bg-orange-600 text-white'
      case 'currently-playing': return 'bg-green-500 hover:bg-green-600 text-white'
      case 'completed': return 'bg-blue-500 hover:bg-blue-600 text-white'
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-600 text-white'
      case 'dropped': return 'bg-red-500 hover:bg-red-600 text-white'
      default: return 'bg-gray-500 hover:bg-gray-600 text-white'
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
        ) : gameDetail ? (
          <>
            {/* Header épuré */}
            <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 p-2 hover:bg-white/80 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="p-6 flex items-center space-x-4">
                <img
                  src={gameDetail.background_image}
                  alt={gameDetail.name}
                  className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-sm"
                />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{gameDetail.name}</h1>
                  
                  {gameDetail.rating_count >= 10 && (
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={`${
                              star <= gameDetail.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {gameDetail.rating.toFixed(1)} ({gameDetail.rating_count.toLocaleString()} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {/* ✅ Action buttons avec possibilité de décocher */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex space-x-3 mb-4">
                  {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        // ✅ NOUVELLE LOGIQUE : Si déjà sélectionné, on retire de la bibliothèque
                        if (selectedStatus === status) {
                          // Retirer de la bibliothèque
                          if (onDeleteItem) {
                            onDeleteItem(gameId)
                          }
                          setSelectedStatus(null)
                        } else {
                          // Ajouter/Modifier le statut
                          handleStatusSelect(status)
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all shadow-sm ${
                        selectedStatus === status
                          ? `${getStatusColor(status)} ring-2 ring-blue-300` // ✅ Indication visuelle forte
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
                            {gameStats[status].toLocaleString()} users
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
                          onDeleteItem(gameId)
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
                    💡 Click a status to add this game to your library
                  </div>
                )}

                {/* User rating */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-gray-900 font-semibold mb-3">Rate this game</h4>
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
                        placeholder="What did you think about this game?"
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
                  
                  {/* Steam reviews */}
                  {steamReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm">🎮</span>
                        </div>
                        <span className="text-gray-900 text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-full font-medium">Steam</span>
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
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-3">About</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-gray-700 leading-relaxed">
                          {gameDetail.description_raw || 'No description available.'}
                        </p>
                      </div>
                    </div>

                    {gameDetail.tags && gameDetail.tags.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {gameDetail.tags.slice(0, 12).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm"
                            >
                              <Tag size={12} className="mr-1" />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Platforms</h5>
                        <p className="text-gray-600 text-sm">
                          {gameDetail.platforms?.map(p => p.platform.name).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Release Date</h5>
                        <p className="text-gray-600 text-sm">
                          {gameDetail.released ? new Date(gameDetail.released).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Developer</h5>
                        <p className="text-gray-600 text-sm">
                          {gameDetail.developers?.[0]?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Publisher</h5>
                        <p className="text-gray-600 text-sm">
                          {gameDetail.publishers?.[0]?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'social' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Community Stats</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-orange-600">{gameStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-orange-700 font-medium">Want to Play</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-green-600">{gameStats['currently-playing'].toLocaleString()}</div>
                          <div className="text-sm text-green-700 font-medium">Currently Playing</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-blue-600">{gameStats['completed'].toLocaleString()}</div>
                          <div className="text-sm text-blue-700 font-medium">Completed</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Recent Activity</h4>
                      <div className="space-y-3">
                        {[
                          { user: 'Alex_Gamer', action: 'completed this game', time: '2 hours ago', type: 'completed' },
                          { user: 'Sarah_RPG', action: 'added to Want to Play', time: '4 hours ago', type: 'want' },
                          { user: 'Mike_Pro', action: 'rated 5 stars', time: '6 hours ago', type: 'rating' },
                          { user: 'Jenny_Fun', action: 'started playing', time: '8 hours ago', type: 'playing' }
                        ].map((activity, index) => (
                          <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                              <span className="text-sm">
                                {activity.type === 'completed' && '✅'}
                                {activity.type === 'want' && '❤️'}
                                {activity.type === 'rating' && '⭐'}
                                {activity.type === 'playing' && '🎮'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium text-gray-900">{activity.user}</span>{' '}
                                <span className="text-gray-600">{activity.action}</span>
                              </p>
                              <p className="text-xs text-gray-500">{activity.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">External Links</h4>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-3">
                          <a 
                            href={`https://store.steampowered.com/search/?term=${encodeURIComponent(gameDetail.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Steam Store
                          </a>
                          <a 
                            href={`https://www.metacritic.com/search/game/${encodeURIComponent(gameDetail.name)}/results`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Metacritic
                          </a>
                        </div>

                        {gameDetail.website && (
                          <a
                            href={gameDetail.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 p-4 rounded-xl text-gray-700 hover:text-gray-900 transition-colors border border-gray-200"
                          >
                            <Globe size={16} />
                            <span className="font-medium">Official Website</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Similar Games by Genre */}
                    {!similarGamesLoading && similarGames.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">
                          Similar Games {gameDetail.genres?.[0]?.name && `(${gameDetail.genres[0].name})`}
                        </h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {similarGames.slice(0, 6).map((game) => (
                            <div key={game.id} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                              {game.background_image && (
                                <img
                                  src={game.background_image}
                                  alt={game.name}
                                  className="w-full h-20 object-cover rounded-lg mb-2 border border-gray-100"
                                />
                              )}
                              <h5 className="text-sm font-medium text-gray-900 truncate mb-1" title={game.name}>
                                {game.name}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                <span className="text-xs text-gray-600">{game.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* More from Developer */}
                    {!similarGamesLoading && developerGames.length > 0 && gameDetail.developers?.[0] && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">
                          More from {gameDetail.developers[0].name}
                        </h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {developerGames.slice(0, 6).map((game) => (
                            <div key={game.id} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                              {game.background_image && (
                                <img
                                  src={game.background_image}
                                  alt={game.name}
                                  className="w-full h-20 object-cover rounded-lg mb-2 border border-gray-100"
                                />
                              )}
                              <h5 className="text-sm font-medium text-gray-900 truncate mb-1" title={game.name}>
                                {game.name}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                <span className="text-xs text-gray-600">{game.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loading state pour les jeux similaires */}
                    {similarGamesLoading && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">Loading similar games...</h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex-shrink-0 w-40 bg-gray-100 rounded-xl p-3 border border-gray-200 animate-pulse">
                              <div className="w-full h-20 bg-gray-200 rounded-lg mb-2"></div>
                              <div className="h-4 bg-gray-200 rounded mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technical Info */}
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Technical Information</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">ESRB Rating:</span>
                            <span className="text-gray-600">
                              {gameDetail.esrb_rating?.name || 'Not Rated'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">Metacritic:</span>
                            <span className="text-gray-600">
                              {gameDetail.metacritic ? `${gameDetail.metacritic}/100` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="font-medium text-gray-900">Genres:</span>
                            <span className="text-gray-600 text-right">
                              {gameDetail.genres?.map(g => g.name).join(', ') || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="font-medium text-gray-900">Platforms:</span>
                            <span className="text-gray-600 text-right">
                              {gameDetail.parent_platforms?.map(p => p.platform.name).join(', ') || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Available Stores */}
                    {gameDetail.stores && gameDetail.stores.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">Available Stores</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {gameDetail.stores.slice(0, 6).map((store, index) => (
                            <a
                              key={index}
                              href={store.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 bg-white hover:bg-gray-50 p-3 rounded-xl text-gray-700 hover:text-gray-900 transition-colors border border-gray-200 shadow-sm text-sm font-medium"
                            >
                              <ExternalLink size={14} />
                              <span>{store.store.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Screenshots */}
                    {gameDetail.screenshots && gameDetail.screenshots.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">Screenshots</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {gameDetail.screenshots.slice(0, 4).map((screenshot, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={screenshot.image}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-32 object-cover rounded-xl border border-gray-200 group-hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
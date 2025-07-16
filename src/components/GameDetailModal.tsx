'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Tag, Globe } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface GameDetailModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
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
      setSimilarGamesLoading(false)
      
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
      setGameDetail(null)
    } finally {
      setLoading(false)
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-gray-900 rounded-xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : gameDetail ? (
          <>
            {/* Header */}
            <div 
              className="relative h-48 bg-cover bg-center flex-shrink-0"
              style={{ backgroundImage: `url(${gameDetail.background_image})` }}
            >
              <div className="absolute inset-0 bg-black/60"></div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X size={24} />
              </button>
              
              <div className="absolute bottom-4 left-4 right-4 flex items-end space-x-4">
                <img
                  src={gameDetail.background_image}
                  alt={gameDetail.name}
                  className="w-24 h-32 object-cover rounded-lg border-2 border-white/20"
                />
                <div className="flex-1 text-white">
                  <h1 className="text-2xl font-bold mb-2">{gameDetail.name}</h1>
                  
                  {gameDetail.rating_count >= 10 && (
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={`${
                              star <= gameDetail.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm">
                        {gameDetail.rating.toFixed(1)} ({gameDetail.rating_count.toLocaleString()} votes)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {/* Action buttons */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex space-x-2 mb-3">
                  {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusSelect(status)}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        selectedStatus === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-sm">{getStatusLabel(status)}</div>
                      <div className="text-xs opacity-75">
                        {gameStats[status].toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
                
                {selectedStatus && (
                  <div className="mt-3 text-sm text-gray-400">
                    Added to your library on {new Date().toLocaleDateString()}
                  </div>
                )}

                {/* User rating */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <h4 className="text-white font-medium mb-3">Rate this game</h4>
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
                        className="relative"
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
                      <span className="text-white ml-2">{userRating}/5</span>
                    )}
                  </div>
                  
                  {showReviewBox && (
                    <div className="mt-3">
                      <label className="text-sm text-gray-400 mb-2 block">Review this game (optional)</label>
                      <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="Share your thoughts about this game..."
                        className="w-full h-20 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex space-x-2 mt-2">
                        <button 
                          onClick={handleSubmitReview}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-500"
                        >
                          Submit
                        </button>
                        <button 
                          onClick={() => {
                            setShowReviewBox(false)
                            setUserReview('')
                          }}
                          className="px-4 py-2 bg-gray-700 text-gray-300 text-sm rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3">Recent Reviews</h3>
                <div className="flex space-x-4 overflow-x-auto pb-2">
                  {/* User reviews first */}
                  {userReviews.map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-800 rounded-lg p-3 border-l-2 border-blue-500">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">👤</span>
                        <span className="text-white text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">You</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{review.rating}</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {review.review || review.text}
                      </p>
                    </div>
                  ))}
                  
                  {/* Steam reviews */}
                  {steamReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">🎮</span>
                        <span className="text-white text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">Steam</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{review.rating}</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
                <div className="flex">
                  {(['info', 'social', 'more'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 px-4 font-medium transition-colors ${
                        activeTab === tab
                          ? 'text-white border-b-2 border-blue-500'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-4 bg-gray-900">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-white font-semibold mb-2">About</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {gameDetail.description_raw || 'No description available.'}
                      </p>
                    </div>

                    {gameDetail.tags && gameDetail.tags.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {gameDetail.tags.slice(0, 12).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 border border-blue-500/30 hover:border-blue-400/50 transition-colors cursor-pointer"
                            >
                              <Tag size={12} className="mr-1" />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="text-white font-medium mb-1">Platforms</h5>
                        <p className="text-gray-400">
                          {gameDetail.platforms?.map(p => p.platform.name).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <h5 className="text-white font-medium mb-1">Release Date</h5>
                        <p className="text-gray-400">
                          {gameDetail.released ? new Date(gameDetail.released).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <h5 className="text-white font-medium mb-1">Developer</h5>
                        <p className="text-gray-400">
                          {gameDetail.developers?.[0]?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <h5 className="text-white font-medium mb-1">Publisher</h5>
                        <p className="text-gray-400">
                          {gameDetail.publishers?.[0]?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'social' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-white font-semibold mb-4">Community Stats</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-800 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-400">{gameStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Want to Play</div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-400">{gameStats['currently-playing'].toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Currently Playing</div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-400">{gameStats['completed'].toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Completed</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-white font-semibold mb-3">External Links</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <a 
                            href={`https://store.steampowered.com/search/?term=${encodeURIComponent(gameDetail.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Steam Store
                          </a>
                          <a 
                            href={`https://www.metacritic.com/search/game/${encodeURIComponent(gameDetail.name)}/results`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
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
                            className="flex items-center space-x-2 bg-gray-800 p-3 rounded-lg text-gray-300 hover:text-white transition-colors"
                          >
                            <Globe size={16} />
                            <span>Official Website</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p>Game not found</p>
            <p className="text-sm mt-2">Unable to load game details. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
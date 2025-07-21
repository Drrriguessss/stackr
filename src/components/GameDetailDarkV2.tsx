'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'

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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const [showPublisher, setShowPublisher] = useState(false)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'

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

  // Mock trailer URL
  const mockTrailerUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ"

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
      setShowStatusDropdown(false)
      setShowAllPlatforms(false)
      setShowPublisher(false)
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
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
      
      const response = await fetch(
        `https://api.rawg.io/api/games/${rawgId}?key=${RAWG_API_KEY}`
      )
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      setGameDetail(data)
      
      // Use mock data for similar and developer games
      setSimilarGames(mockSimilarGames)
      setDeveloperGames(mockDeveloperGames)
      
    } catch (error) {
      console.error('Error loading game details:', error)
      // Mock data for demo
      setGameDetail({
        id: 1,
        name: "Penarium",
        background_image: "https://media.rawg.io/media/games/3ea/3ea3c9bbd940b6cb7f2139e42d3d443f.jpg",
        description_raw: "Penarium is a frantic 2D arena arcade game where you take on the role of Willy, a trapped circus worker trying to survive sadistic circus acts for the amusement of a twisted audience.",
        rating: 3.8,
        rating_count: 245,
        released: "2015-09-22",
        platforms: [{ platform: { name: "PC" } }, { platform: { name: "PlayStation 4" } }],
        developers: [{ name: "Self Made Miracle" }],
        publishers: [{ name: "Team17" }],
        genres: [{ name: "Platformer" }],
        tags: [],
        website: "https://penarium-game.com",
        stores: [
          { store: { name: "Steam" }, url: "https://store.steampowered.com/app/307590/Penarium/" },
          { store: { name: "PlayStation Store" }, url: "#" }
        ],
        screenshots: [
          { image: "https://media.rawg.io/media/screenshots/5f5/5f5a38a222252d996b18962806eed707.jpg" },
          { image: "https://media.rawg.io/media/screenshots/e19/e196cb3b24fecc914d59f3d076366e5b.jpg" },
          { image: "https://media.rawg.io/media/screenshots/dbb/dbb69b101dc23fc4667de8db03dee36d.jpg" }
        ],
        metacritic: 74,
        esrb_rating: { name: "Teen" },
        parent_platforms: []
      })
      setSimilarGames(mockSimilarGames)
      setDeveloperGames(mockDeveloperGames)
    } finally {
      setLoading(false)
    }
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
    setShowStatusDropdown(false)
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

  const handleSubmitReview = () => {
    if (userRating > 0) {
      onReviewSubmit({
        rating: userRating,
        review: userReview.trim(),
        privacy: reviewPrivacy
      })
      
      setShowReviewBox(false)
      setUserReview('')
      setUserRating(0)
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
                    <span>None</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Status Dropdown */}
                  <div className="relative" ref={statusDropdownRef}>
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className={`px-4 py-2 rounded-full text-white text-sm font-medium flex items-center space-x-2 transition-colors ${getStatusColor(selectedStatus)}`}
                    >
                      <span>{getStatusLabel(selectedStatus)}</span>
                      <ChevronDown size={16} />
                    </button>
                    
                    {showStatusDropdown && (
                      <div className="absolute top-full right-0 mt-2 bg-[#1A1A1A] rounded-lg shadow-xl z-10 py-1 min-w-40 border border-gray-800">
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
                            <div className="border-t border-gray-800 my-1"></div>
                            <button
                              onClick={() => handleStatusSelect('remove')}
                              className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-800 transition-colors text-sm"
                            >
                              Remove from Library
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Share Button */}
                  <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-800">
              <div className="flex px-4">
                {[
                  { key: 'overview' as const, label: 'Overview' },
                  { key: 'reviews' as const, label: 'Reviews' },
                  { key: 'moreinfo' as const, label: 'More Info' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-4 font-medium transition-colors relative ${
                      activeTab === tab.key
                        ? 'text-white'
                        : 'text-[#B0B0B0] hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="p-4 space-y-6">
                  {/* Media Section */}
                  <div className="space-y-4">
                    {/* Trailer */}
                    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                      <iframe
                        src={mockTrailerUrl}
                        title="Game Trailer"
                        className="w-full h-full"
                        allowFullScreen
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Play size={48} className="text-white opacity-80" />
                      </div>
                    </div>

                    {/* Screenshots */}
                    <div className="flex space-x-2 overflow-x-auto pb-2 snap-x">
                      {gameDetail.screenshots?.slice(0, 3).map((screenshot, index) => (
                        <img
                          key={index}
                          src={screenshot.image}
                          alt={`Screenshot ${index + 1}`}
                          className="w-32 h-20 object-cover rounded-lg flex-shrink-0 snap-start"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rate this game */}
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

                  {/* Review Scores */}
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 bg-green-700 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">74</span>
                      </div>
                      <span className="text-[#B0B0B0] text-sm">Metacritic</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">79</span>
                      </div>
                      <span className="text-[#B0B0B0] text-sm">OpenCritic</span>
                    </div>
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
                        <div key={game.id} className="flex-shrink-0 w-28 snap-start">
                          <img
                            src={game.image}
                            alt={game.name}
                            className="w-full h-36 object-cover rounded-lg mb-2"
                          />
                          <p className="text-white text-sm truncate">{game.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* More from this developer */}
                  <div>
                    <h3 className="text-white font-medium mb-4">More from this developer</h3>
                    <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                      {developerGames.map((game) => (
                        <div key={game.id} className="flex-shrink-0 w-28 snap-start">
                          <img
                            src={game.image}
                            alt={game.name}
                            className="w-full h-36 object-cover rounded-lg mb-2"
                          />
                          <p className="text-white text-sm truncate">{game.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="p-4 space-y-4">
                  <h3 className="text-white font-medium">Reviews</h3>
                  <p className="text-[#B0B0B0]">Reviews coming soon...</p>
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="p-4 space-y-4">
                  <h3 className="text-white font-medium">More Information</h3>
                  <div className="space-y-3 text-[#B0B0B0]">
                    <div className="flex justify-between">
                      <span>ESRB Rating</span>
                      <span className="text-white">{gameDetail.esrb_rating?.name || 'Not Rated'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Release Date</span>
                      <span className="text-white">
                        {gameDetail.released ? new Date(gameDetail.released).toLocaleDateString() : 'TBA'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platforms</span>
                      <span className="text-white">
                        {gameDetail.platforms?.map(p => p.platform.name).join(', ') || 'N/A'}
                      </span>
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
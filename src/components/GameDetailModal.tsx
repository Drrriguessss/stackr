'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ChevronLeft, ChevronRight, ExternalLink, Users, Tag, Globe } from 'lucide-react'

interface GameDetailModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  onAddToLibrary: (item: any, status: string) => void
  library: any[]
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

interface Review {
  id: string
  username: string
  avatar: string
  rating: number
  text: string
  date: string
}

export default function GameDetailModal({ isOpen, onClose, gameId, onAddToLibrary, library }: GameDetailModalProps) {
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'social' | 'more'>('info') // ✅ Par défaut sur 'info'
  const [currentScreenshot, setCurrentScreenshot] = useState(0)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [showCustomTag, setShowCustomTag] = useState(false)
  const [customTag, setCustomTag] = useState('')
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [showFullReview, setShowFullReview] = useState<{ [key: string]: boolean }>({})
  const [similarGames, setSimilarGames] = useState<any[]>([])
  const [developerGames, setDeveloperGames] = useState<any[]>([])

  const scrollableRef = useRef<HTMLDivElement>(null)

  const realReviews: Review[] = [
    {
      id: '1',
      username: 'Michael Chen',
      avatar: '👨‍💻',
      rating: 5.0,
      text: 'Absolutely incredible experience. The world-building is phenomenal and every quest feels meaningful. The combat system is smooth and responsive. Graphics are stunning on PC with ray tracing enabled. Easily one of the best games I\'ve played in years. Worth every penny and every hour invested.',
      date: '2024-01-15'
    },
    {
      id: '2', 
      username: 'Sarah Rodriguez',
      avatar: '👩‍🎮',
      rating: 4.5,
      text: 'Amazing game with incredible attention to detail. The story kept me hooked for hours. Some minor bugs here and there but nothing game-breaking. The character progression system is well thought out. Highly recommend to anyone who enjoys RPGs.',
      date: '2024-01-10'
    },
    {
      id: '3',
      username: 'David Park',
      avatar: '🎮',
      rating: 4.0,
      text: 'Great game overall but has a steep learning curve. Once you get the hang of it, it\'s really rewarding. The multiplayer aspect adds a lot of replay value.',
      date: '2024-01-08'
    }
  ]

  const gameStats = {
    'want-to-play': 1247,
    'currently-playing': 856,
    'completed': 3421
  }

  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'

  // ✅ Reset activeTab à 'info' quand on ouvre une nouvelle fiche
  useEffect(() => {
    if (isOpen) {
      setActiveTab('info')
      setCurrentScreenshot(0)
      setSimilarGames([])
      setDeveloperGames([])
    }
  }, [isOpen, gameId])

  // Fonction pour changer d'onglet et scroll jusqu'à la première section
  const changeTab = (newTab: 'info' | 'social' | 'more') => {
    setActiveTab(newTab)
    
    // Attendre que le DOM soit mis à jour puis scroller jusqu'à la première section de chaque onglet
    setTimeout(() => {
      if (scrollableRef.current) {
        let scrollPosition = 0
        
        // ✅ POSITIONS FIXES BASÉES SUR VOS IMAGES
        switch (newTab) {
          case 'info':
            // Scroll jusqu'au début du contenu des onglets
            scrollPosition = 400 // Position approximative après reviews
            break
          case 'social':
            // Scroll pour voir "Community Stats" complètement
            scrollPosition = 380 // Position pour voir le titre en entier
            break
          case 'more':
            // Scroll pour voir "Similar Games" complètement  
            scrollPosition = 380 // Même position que social
            break
        }
        
        scrollableRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        })
      }
    }, 100) // Délai plus long pour s'assurer que le contenu est rendu
  }

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
      
      // ✅ RECHERCHER JEUX SIMILAIRES PAR TAGS COMMUNS - VERSION AMÉLIORÉE
      try {
        if (data.tags && data.tags.length > 0) {
          // Prendre le premier tag populaire pour une recherche plus simple
          const popularTag = data.tags[0].name
          const similarResponse = await fetch(
            `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(popularTag)}&page_size=12&ordering=-rating`
          )
          const similarData = await similarResponse.json()
          console.log('Similar games API response:', similarData)
          if (similarData.results) {
            // Filtrer le jeu actuel et prendre les 6 premiers
            const filtered = similarData.results
              .filter((game: any) => game.id !== data.id)
              .slice(0, 6)
            setSimilarGames(filtered)
            console.log('Similar games loaded:', filtered.length, filtered)
          }
        }
        
        // Fallback: recherche par genre si pas de tags
        if ((!data.tags || data.tags.length === 0) && data.genres && data.genres.length > 0) {
          const genreName = data.genres[0].name
          const fallbackResponse = await fetch(
            `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(genreName)}&page_size=8&ordering=-rating`
          )
          const fallbackData = await fallbackResponse.json()
          if (fallbackData.results) {
            const filtered = fallbackData.results
              .filter((game: any) => game.id !== data.id)
              .slice(0, 6)
            setSimilarGames(filtered)
            console.log('Similar games (genre fallback):', filtered.length)
          }
        }
      } catch (error) {
        console.error('Error loading similar games:', error)
      }
      
      // ✅ RECHERCHER JEUX DU DÉVELOPPEUR PAR ID DÉVELOPPEUR
      try {
        if (data.developers && data.developers.length > 0) {
          const developerId = data.developers[0].id || data.developers[0].name
          let devResponse
          
          // Essayer d'abord avec l'ID du développeur
          if (typeof developerId === 'number') {
            devResponse = await fetch(
              `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&developers=${developerId}&page_size=8&ordering=-rating`
            )
          } else {
            // Fallback avec le nom du développeur
            devResponse = await fetch(
              `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(developerId)}&page_size=8&ordering=-rating`
            )
          }
          
          const devData = await devResponse.json()
          if (devData.results) {
            // Filtrer le jeu actuel et prendre les 4 premiers
            const filtered = devData.results
              .filter((game: any) => game.id !== data.id)
              .slice(0, 4)
            setDeveloperGames(filtered)
            console.log('Developer games loaded:', filtered.length)
          }
        }
      } catch (error) {
        console.error('Error loading developer games:', error)
      }
      
      const screenshotsResponse = await fetch(
        `https://api.rawg.io/api/games/${rawgId}/screenshots?key=${RAWG_API_KEY}`
      )
      const screenshotsData = await screenshotsResponse.json()
      setGameDetail(prev => prev ? { ...prev, screenshots: screenshotsData.results || [] } : null)
      
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
      setGameDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusSelect = (status: string) => {
    if (!gameDetail) return
    
    const gameItem = {
      id: gameId,
      title: gameDetail.name,
      image: gameDetail.background_image,
      category: 'games',
      year: gameDetail.released ? new Date(gameDetail.released).getFullYear() : 2024,
      rating: gameDetail.rating
    }
    
    onAddToLibrary(gameItem, status)
    setSelectedStatus(status)
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'want-to-play': return 'Want to Play'
      case 'currently-playing': return 'Playing'
      case 'completed': return 'Completed'
      default: return status
    }
  }

  const nextScreenshot = () => {
    if (gameDetail?.screenshots) {
      setCurrentScreenshot((prev) => 
        prev === gameDetail.screenshots.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevScreenshot = () => {
    if (gameDetail?.screenshots) {
      setCurrentScreenshot((prev) => 
        prev === 0 ? gameDetail.screenshots.length - 1 : prev - 1
      )
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
            {/* Header fixe */}
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
                        {gameDetail.rating.toFixed(1)} ({gameDetail.rating_count.toLocaleString()} votes, {realReviews.length} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Zone scrollable */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Boutons d'action */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex space-x-2 mb-3">
                  {['want-to-play', 'currently-playing', 'completed'].map((status) => (
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
                        {gameStats[status as keyof typeof gameStats].toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
                
                {selectedStatus && (
                  <div className="mt-3 text-sm text-gray-400">
                    Added to your library on {new Date().toLocaleDateString()}
                  </div>
                )}

                {/* Rating utilisateur */}
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
                        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-500">
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

              {/* Reviews */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-3">Recent Reviews</h3>
                <div className="flex space-x-4 overflow-x-auto pb-2">
                  {realReviews.map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{review.avatar}</span>
                        <span className="text-white text-sm font-medium">{review.username}</span>
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
                      <p className={`text-gray-300 text-sm leading-relaxed ${
                        showFullReview[review.id] ? '' : 'line-clamp-3'
                      }`}>
                        {review.text}
                      </p>
                      {review.text.length > 100 && (
                        <button 
                          onClick={() => setShowFullReview((prev) => ({
                            ...prev,
                            [review.id]: !prev[review.id]
                          }))}
                          className="text-blue-400 text-xs mt-1 hover:text-blue-300"
                        >
                          {showFullReview[review.id] ? 'See less' : 'See more'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Onglets sticky */}
              <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
                <div className="flex">
                  {(['info', 'social', 'more'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => changeTab(tab)}
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

              {/* Contenu onglets */}
              <div className="p-4 bg-gray-900">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div id="info-about">
                      <h4 className="text-white font-semibold mb-2">About</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {gameDetail.description_raw || 'No description available.'}
                      </p>
                    </div>

                    {/* ✅ NOUVELLE SECTION TAGS */}
                    {gameDetail.tags && gameDetail.tags.length > 0 && (
                      <div id="info-tags">
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
                    <div id="social-community-stats">
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

                    <div>
                      <h4 className="text-white font-semibold mb-3">Friends Activity</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 bg-gray-800 p-3 rounded-lg">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">A</div>
                          <div className="flex-1">
                            <p className="text-white text-sm"><span className="font-medium">Alex</span> is currently playing this game</p>
                            <p className="text-gray-400 text-xs">2 hours ago</p>
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} size={12} className="text-yellow-400 fill-current" />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 bg-gray-800 p-3 rounded-lg">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">M</div>
                          <div className="flex-1">
                            <p className="text-white text-sm"><span className="font-medium">Marie</span> completed this game</p>
                            <p className="text-gray-400 text-xs">1 day ago</p>
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4].map((star) => (
                              <Star key={star} size={12} className="text-yellow-400 fill-current" />
                            ))}
                            <Star size={12} className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-3">Popular Lists</h4>
                      <div className="space-y-2">
                        <div className="bg-gray-800 p-3 rounded-lg">
                          <h5 className="text-white font-medium">Best RPGs of 2024</h5>
                          <p className="text-gray-400 text-sm">by GameMaster_2024 • 156 games</p>
                        </div>
                        <div className="bg-gray-800 p-3 rounded-lg">
                          <h5 className="text-white font-medium">Must Play This Year</h5>
                          <p className="text-gray-400 text-sm">by PixelWarrior • 89 games</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-6">
                    <div id="more-similar-games">
                      <h4 className="text-white font-semibold mb-4">Similar Games</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {similarGames.length > 0 ? (
                          similarGames.map((game) => (
                            <div key={game.id} className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden hover:from-gray-700 hover:to-gray-800 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-xl">
                              <div className="relative h-32 bg-gray-700">
                                {game.background_image ? (
                                  <img
                                    src={game.background_image}
                                    alt={game.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                    <span className="text-white text-2xl">🎮</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1">
                                  <div className="flex items-center space-x-1">
                                    <Star size={10} className="text-yellow-400 fill-current" />
                                    <span className="text-white text-xs font-medium">
                                      {game.rating ? game.rating.toFixed(1) : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-3">
                                <h5 className="text-white font-medium text-sm truncate group-hover:text-blue-300 transition-colors">
                                  {game.name}
                                </h5>
                                <p className="text-gray-400 text-xs mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 text-xs font-medium">
                                    {game.genres?.[0]?.name || 'Game'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback si pas de résultats API
                          gameDetail.genres?.slice(0, 6).map((genre, index) => (
                            <div key={index} className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden">
                              <div className="relative h-32 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-2xl">🎮</span>
                              </div>
                              <div className="p-3">
                                <h5 className="text-white font-medium text-sm">Similar Game {index + 1}</h5>
                                <p className="text-gray-400 text-xs mt-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 text-xs font-medium">
                                    {genre.name}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {gameDetail.developers && gameDetail.developers.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-4">More from {gameDetail.developers[0].name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {developerGames.length > 0 ? (
                            developerGames.map((game) => (
                              <div key={game.id} className="group flex bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl overflow-hidden hover:from-gray-700 hover:to-gray-800 transition-all duration-300 cursor-pointer transform hover:scale-102 hover:shadow-lg">
                                <div className="relative w-24 h-20 bg-gray-700 flex-shrink-0">
                                  {game.background_image ? (
                                    <img
                                      src={game.background_image}
                                      alt={game.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                                      <span className="text-white text-lg">🎮</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-center">
                                  <h5 className="text-white font-medium text-sm truncate group-hover:text-purple-300 transition-colors">
                                    {game.name}
                                  </h5>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-400 text-xs">
                                      {game.released ? new Date(game.released).getFullYear() : 'TBA'}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      <Star size={10} className="text-yellow-400 fill-current" />
                                      <span className="text-gray-300 text-xs">
                                        {game.rating ? game.rating.toFixed(1) : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            // Fallback si pas de résultats API
                            <>
                              <div className="group flex bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl overflow-hidden">
                                <div className="relative w-24 h-20 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-lg">🎮</span>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-center">
                                  <h5 className="text-white font-medium text-sm">Previous Game Title</h5>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-400 text-xs">2022</span>
                                    <div className="flex items-center space-x-1">
                                      <Star size={10} className="text-yellow-400 fill-current" />
                                      <span className="text-gray-300 text-xs">4.5</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="group flex bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl overflow-hidden">
                                <div className="relative w-24 h-20 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-lg">🎮</span>
                                </div>
                                <div className="flex-1 p-3 flex flex-col justify-center">
                                  <h5 className="text-white font-medium text-sm">Another Game Title</h5>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-400 text-xs">2020</span>
                                    <div className="flex items-center space-x-1">
                                      <Star size={10} className="text-yellow-400 fill-current" />
                                      <span className="text-gray-300 text-xs">4.1</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-white font-semibold mb-3">Technical Details</h4>
                      <div className="space-y-3">
                        {gameDetail.esrb_rating && (
                          <div>
                            <h5 className="text-white font-medium text-sm mb-1">ESRB Rating</h5>
                            <p className="text-gray-400 text-sm">{gameDetail.esrb_rating.name}</p>
                          </div>
                        )}
                        <div>
                          <h5 className="text-white font-medium text-sm mb-1">Supported Languages</h5>
                          <p className="text-gray-400 text-sm">English, French, Spanish, German, Japanese</p>
                        </div>
                        <div>
                          <h5 className="text-white font-medium text-sm mb-1">Game Size</h5>
                          <p className="text-gray-400 text-sm">~45 GB</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-3">External Links</h4>
                      <div className="space-y-2">
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
                        <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-lg text-gray-300">
                          <span>🎮</span>
                          <span>Steam Store</span>
                          <ExternalLink size={12} />
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-800 p-3 rounded-lg text-gray-300">
                          <span>🎯</span>
                          <span>Metacritic</span>
                          <ExternalLink size={12} />
                        </div>
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
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { X, Star, ChevronLeft, ChevronRight, ExternalLink, Calendar, Users, Tag, Globe, Clock } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'info' | 'social' | 'more'>('info')
  const [currentScreenshot, setCurrentScreenshot] = useState(0)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [showCustomTag, setShowCustomTag] = useState(false)
  const [customTag, setCustomTag] = useState('')

  // Bloquer le scroll de l'arrière-plan quand la modal est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup au démontage
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Simuler des reviews (en attendant le backend)
  const mockReviews: Review[] = [
    {
      id: '1',
      username: 'GameMaster_2024',
      avatar: '🎮',
      rating: 4.5,
      text: 'Incredible game with amazing graphics and gameplay. The story is captivating and the mechanics are solid...',
      date: '2024-01-15'
    },
    {
      id: '2', 
      username: 'PixelWarrior',
      avatar: '🕹️',
      rating: 5.0,
      text: 'Absolutely perfect! This game exceeded all my expectations. The attention to detail is phenomenal...',
      date: '2024-01-10'
    }
  ]

  // Stats simulées pour les boutons
  const gameStats = {
    'want-to-play': 1247,
    'currently-playing': 856,
    'completed': 3421
  }

  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'

  useEffect(() => {
    if (isOpen && gameId) {
      fetchGameDetail()
    }
  }, [isOpen, gameId])

  useEffect(() => {
    // Vérifier si le jeu est déjà dans la library
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
      // ✅ GESTION INTELLIGENTE DES IDS
      let rawgId = gameId
      
      // Si l'ID commence par 'game-', l'enlever
      if (gameId.startsWith('game-')) {
        rawgId = gameId.replace('game-', '')
      }
      
      // Si ce n'est pas un nombre (cas des jeux de sampleContent), essayer de le chercher par nom
      if (isNaN(Number(rawgId))) {
        console.log('ID non numérique détecté, recherche par nom...')
        // Utiliser l'API de recherche pour trouver le jeu
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
      
      // Récupérer les screenshots
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
        // Fermer si on clique sur le backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} // Empêcher la fermeture si on clique dans la modal
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : gameDetail ? (
          <>
            {/* Header avec image de fond */}
            <div 
              className="relative h-64 bg-cover bg-center"
              style={{ backgroundImage: `url(${gameDetail.background_image})` }}
            >
              <div className="absolute inset-0 bg-black/60"></div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X size={24} />
              </button>
              
              {/* Info du jeu dans le header */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end space-x-4">
                <img
                  src={gameDetail.background_image}
                  alt={gameDetail.name}
                  className="w-24 h-32 object-cover rounded-lg border-2 border-white/20"
                />
                <div className="flex-1 text-white">
                  <h1 className="text-2xl font-bold mb-2">{gameDetail.name}</h1>
                  
                  {/* Rating Stackr */}
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
                        {gameDetail.rating.toFixed(1)} ({gameDetail.rating_count.toLocaleString()} votes, {mockReviews.length} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'action avec stats */}
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
              
              {/* Custom tag button */}
              <button
                onClick={() => setShowCustomTag(!showCustomTag)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + New tag
              </button>
              
              {showCustomTag && (
                <div className="mt-2 flex space-x-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Enter custom tag..."
                    className="flex-1 px-3 py-2 bg-gray-800 text-white rounded"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
                </div>
              )}
              
              {/* Info d'ajout à la library */}
              {selectedStatus && (
                <div className="mt-3 text-sm text-gray-400">
                  Added to your library on {new Date().toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Carrousel de reviews */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold mb-3">Recent Reviews</h3>
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {mockReviews.map((review) => (
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
                    <p className="text-gray-300 text-sm line-clamp-3">{review.text}</p>
                    <button className="text-blue-400 text-xs mt-1 hover:text-blue-300">See more</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-gray-700">
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

            {/* Contenu des onglets */}
            <div className="flex-1 overflow-y-auto bg-gray-900">
              <div className="p-4">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h4 className="text-white font-semibold mb-2">About</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {gameDetail.description_raw || 'No description available.'}
                      </p>
                    </div>

                    {/* Screenshots */}
                    {gameDetail.screenshots && gameDetail.screenshots.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-2">Screenshots</h4>
                        <div className="relative">
                          <img
                            src={gameDetail.screenshots[currentScreenshot]?.image}
                            alt="Screenshot"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          {gameDetail.screenshots.length > 1 && (
                            <>
                              <button
                                onClick={prevScreenshot}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                              >
                                <ChevronLeft size={20} />
                              </button>
                              <button
                                onClick={nextScreenshot}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                              >
                                <ChevronRight size={20} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Infos détaillées */}
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
                      <div>
                        <h5 className="text-white font-medium mb-1">Genres</h5>
                        <p className="text-gray-400">
                          {gameDetail.genres?.map(g => g.name).join(', ') || 'N/A'}
                        </p>
                      </div>
                      {gameDetail.metacritic && (
                        <div>
                          <h5 className="text-white font-medium mb-1">Metacritic</h5>
                          <p className="text-gray-400">{gameDetail.metacritic}/100</p>
                        </div>
                      )}
                    </div>

                    {/* Tags populaires */}
                    {gameDetail.tags && gameDetail.tags.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-2">Popular Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {gameDetail.tags.slice(0, 10).map((tag, index) => (
                            <span
                              key={index}
                              className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Liens */}
                    <div className="flex space-x-4">
                      {gameDetail.website && (
                        <a
                          href={gameDetail.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300"
                        >
                          <Globe size={16} />
                          <span>Official Website</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'social' && (
                  <div className="space-y-4">
                    <div className="text-center text-gray-400">
                      <Users size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Social features coming soon!</p>
                      <p className="text-sm mt-2">
                        Friend stats, community ratings, and more will be available here.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-4">
                    <div className="text-center text-gray-400">
                      <Tag size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Additional info coming soon!</p>
                      <p className="text-sm mt-2">
                        DLC, similar games, and extended details will be available here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-400">
            Game not found
          </div>
        )}
      </div>
    </div>
  )
}
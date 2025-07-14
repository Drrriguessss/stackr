'use client'
import { useState, useEffect } from 'react'
import { X, Play, Check, Plus, Star, ExternalLink } from 'lucide-react'

interface GameDetailModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  onAddToLibrary: (item: any, status: string) => void
  library: any[]
}

export default function GameDetailModal({ isOpen, onClose, gameId, onAddToLibrary, library }: GameDetailModalProps) {
  const [gameDetails, setGameDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)

  const RAWG_API_KEY = '517c9101ad6b4cb0a1f8cd5c91ce57ec'

  // Vérifier si le jeu est dans la bibliothèque
  useEffect(() => {
    if (gameDetails) {
      const libraryItem = library.find((item: any) => item.id === `game-${gameDetails.id}`)
      setCurrentStatus(libraryItem?.status || null)
    }
  }, [library, gameDetails])

  // Charger les détails du jeu
  useEffect(() => {
    if (!isOpen || !gameId) return

    const loadGameDetails = async () => {
      setLoading(true)
      try {
        const cleanGameId = gameId.replace('game-', '')
        const response = await fetch(
          `https://api.rawg.io/api/games/${cleanGameId}?key=${RAWG_API_KEY}`
        )
        const data = await response.json()
        setGameDetails(data)
      } catch (error) {
        console.error('Erreur chargement détails:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGameDetails()
  }, [isOpen, gameId])

  // Calculer les stats locales
  const getLocalStats = () => {
    const gameItems = library.filter(item => item.category === 'games')
    return {
      playing: gameItems.filter(item => item.status === 'playing').length,
      completed: gameItems.filter(item => item.status === 'completed').length,
      wantToPlay: gameItems.filter(item => item.status === 'want-to-play').length
    }
  }

  const handleAddToLibrary = (status: string) => {
    if (!gameDetails) return

    const gameItem = {
      id: `game-${gameDetails.id}`,
      title: gameDetails.name,
      author: gameDetails.developers?.[0]?.name || 'Unknown',
      year: new Date(gameDetails.released).getFullYear() || 2024,
      rating: gameDetails.rating || 0,
      genre: gameDetails.genres?.[0]?.name || 'Unknown',
      category: 'games',
      image: gameDetails.background_image
    }

    setCurrentStatus(status)
    onAddToLibrary(gameItem, status)
  }

  if (!isOpen) return null

  const localStats = getLocalStats()

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className={`bg-gray-900 w-full max-h-[90vh] overflow-hidden transition-all duration-300 ease-out ${
        isOpen 
          ? 'transform translate-y-0 opacity-100' 
          : 'transform translate-y-full opacity-0'
      } sm:rounded-xl sm:max-w-4xl sm:transform-none sm:translate-y-0`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : gameDetails ? (
          <>
            {/* Header */}
            <div className="relative">
              {/* Handle bar pour mobile (swipe indicator) */}
              <div className="sm:hidden flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
              </div>

              {/* Image de fond */}
              <div className="h-48 sm:h-80 relative overflow-hidden">
                <img
                  src={gameDetails.background_image}
                  alt={gameDetails.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                
                {/* Bouton fermer */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Info principale */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  {/* Jaquette */}
                  <div className="w-32 h-44 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={gameDetails.background_image}
                      alt={gameDetails.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{gameDetails.name}</h1>
                    <p className="text-gray-300 mb-2">{gameDetails.developers?.[0]?.name}</p>
                    
                    {/* Rating Metacritic */}
                    {gameDetails.metacritic && (
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="bg-green-600 text-white px-2 py-1 rounded text-sm font-bold">
                          {gameDetails.metacritic}
                        </div>
                        <span className="text-gray-400 text-sm">Metacritic</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { status: 'want-to-play', label: 'Want to Play', icon: Plus, count: localStats.wantToPlay },
                  { status: 'playing', label: 'Playing', icon: Play, count: localStats.playing },
                  { status: 'completed', label: 'Completed', icon: Check, count: localStats.completed }
                ].map(button => {
                  const IconComponent = button.icon
                  const isActive = currentStatus === button.status
                  
                  return (
                    <button
                      key={button.status}
                      onClick={() => handleAddToLibrary(button.status)}
                      className={`p-4 rounded-lg text-center transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <IconComponent size={20} />
                        <span className="text-sm font-medium">{button.label}</span>
                        <span className="text-xs opacity-75">{button.count} games</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Onglets */}
            <div className="px-6 py-2 border-b border-gray-700">
              <div className="flex space-x-6">
                {[
                  { id: 'info', name: 'Info' },
                  { id: 'social', name: 'Social' },
                  { id: 'more', name: 'More' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des onglets */}
            <div className="p-4 sm:p-6 max-h-64 sm:max-h-96 overflow-y-auto">
              {activeTab === 'info' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                      {gameDetails.description_raw || 'No description available.'}
                    </p>
                  </div>

                  {/* Infos techniques */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Release Date</h4>
                      <p className="text-gray-400 text-sm">{gameDetails.released || 'TBA'}</p>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Platforms</h4>
                      <p className="text-gray-400 text-sm">
                        {gameDetails.platforms?.map((p: any) => p.platform.name).join(', ') || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Genres</h4>
                      <p className="text-gray-400 text-sm">
                        {gameDetails.genres?.map((g: any) => g.name).join(', ') || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2 text-sm sm:text-base">Publishers</h4>
                      <p className="text-gray-400 text-sm">
                        {gameDetails.publishers?.map((p: any) => p.name).join(', ') || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {gameDetails.tags && gameDetails.tags.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Popular Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {gameDetails.tags.slice(0, 10).map((tag: any) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 sm:px-3 bg-gray-800 text-gray-300 rounded-full text-xs sm:text-sm"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'social' && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm sm:text-base">Social features coming soon!</p>
                  <p className="text-xs sm:text-sm mt-2">Reviews, friends activity, and community stats will be added in future updates.</p>
                </div>
              )}

              {activeTab === 'more' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Liens */}
                  <div>
                    <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Links</h4>
                    <div className="flex flex-wrap gap-3">
                      {gameDetails.website && (
                        <a
                          href={gameDetails.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 sm:px-4 rounded-lg text-gray-300 hover:text-white transition-colors text-sm"
                        >
                          <ExternalLink size={14} />
                          <span>Official Website</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Développeurs */}
                  {gameDetails.developers && gameDetails.developers.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3 text-sm sm:text-base">Developers</h4>
                      <div className="space-y-2">
                        {gameDetails.developers.map((dev: any) => (
                          <div key={dev.id} className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-white font-medium text-sm">{dev.name}</p>
                            {dev.games_count && (
                              <p className="text-gray-400 text-xs">{dev.games_count} games</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p>Failed to load game details</p>
          </div>
        )}
      </div>
    </div>
  )
}
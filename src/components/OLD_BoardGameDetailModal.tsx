'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Share, ExternalLink, Calendar, Users, Clock, Award, Trophy, Dice6, Check, Zap } from 'lucide-react'
import { optimalBoardGameAPI, type OptimalBoardGameResult } from '@/services/optimalBoardGameAPI'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface BoardGameDetailModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  bggReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface BoardGameDetail extends OptimalBoardGameResult {
  // Additional fields can be added here if needed
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function BoardGameDetailModal({ 
  isOpen, 
  onClose, 
  gameId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  bggReviews, 
  onReviewSubmit 
}: BoardGameDetailModalProps) {
  const [gameDetail, setGameDetail] = useState<BoardGameDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [userReview, setUserReview] = useState('')
  const [similarGames, setSimilarGames] = useState<OptimalBoardGameResult[]>([])
  const [designerGames, setDesignerGames] = useState<OptimalBoardGameResult[]>([])
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingDesigner, setLoadingDesigner] = useState(false)
  const [similarGamesLoaded, setSimilarGamesLoaded] = useState(false)
  const [designerGamesLoaded, setDesignerGamesLoaded] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  const gameStats = {
    'want-to-play': 2456,
    'completed': 3871
  }

  // Mock BGG Reviews fallback
  const mockBGGReviews = [
    { id: 1, username: 'BoardGameGeeker', rating: 5, text: 'Fantastic game with amazing replay value. Great mechanics and theme integration.', date: '2024-01-15', platform: 'BGG' },
    { id: 2, username: 'MeepleCollector', rating: 4, text: 'Solid game design with beautiful components. Takes a few plays to master.', date: '2024-01-12', platform: 'BGG' },
    { id: 3, username: 'TabletopTactician', rating: 5, text: 'One of the best games in its category. Highly recommended!', date: '2024-01-10', platform: 'BGG' },
    { id: 4, username: 'GameNightHost', rating: 4, text: 'Great for game nights. Easy to learn but deep strategy.', date: '2024-01-08', platform: 'BGG' },
    { id: 5, username: 'StrategyGamer', rating: 5, text: 'Excellent balance of luck and strategy. Never gets old.', date: '2024-01-05', platform: 'BGG' }
  ]

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
      setShowLibraryDropdown(false)
      setSimilarGamesLoaded(false)
      setDesignerGamesLoaded(false)
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

    if (showLibraryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLibraryDropdown])

  const fetchGameDetail = async () => {
    if (!gameId) return
    
    setLoading(true)
    try {
      console.log('🎲 Fetching board game details for ID:', gameId)
      
      // First, try to get the game details from the BoardGameGeek API
      // We'll use the public API with proper error handling
      const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&type=boardgame&stats=1`)
      
      if (!response.ok) {
        throw new Error(`BGG API error: ${response.status}`)
      }
      
      const xmlText = await response.text()
      
      // Check for BGG's "202 Accepted" response (means request is processing)
      if (xmlText.includes('Your request for this collection has been accepted')) {
        console.log('🎲 BGG returned 202 processing response, waiting 2 seconds and retrying...')
        
        // Wait 2 seconds and try again
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&type=boardgame&stats=1`)
        
        if (retryResponse.ok) {
          const retryXml = await retryResponse.text()
          if (!retryXml.includes('Your request for this collection has been accepted')) {
            const gameData = parseGameXML(retryXml, gameId)
            if (gameData) {
              setGameDetail(gameData)
              console.log('🎲 Board game detail loaded after retry:', gameData.name)
            } else {
              throw new Error('Failed to parse game data after retry')
            }
          } else {
            throw new Error('BGG still processing request after retry')
          }
        } else {
          throw new Error('Retry request failed')
        }
      } else {
        // Parse the XML directly
        const gameData = parseGameXML(xmlText, gameId)
        if (gameData) {
          setGameDetail(gameData)
          console.log('🎲 Board game detail loaded:', gameData.name)
        } else {
          throw new Error('Failed to parse game data')
        }
      }
      
      // Reset les états de chargement
      setSimilarGamesLoaded(false)
      setDesignerGamesLoaded(false)
      
    } catch (error) {
      console.error('🎲 Error loading board game details:', error)
      setGameDetail(null)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to parse BGG XML response
  const parseGameXML = (xmlText: string, id: string): BoardGameDetail | null => {
    try {
      // Extract basic game information from XML
      const primaryNameMatch = xmlText.match(/<name[^>]*type="primary"[^>]*value="([^"]*)"/)
      const yearMatch = xmlText.match(/<yearpublished[^>]*value="([^"]*)"/)
      const descriptionMatch = xmlText.match(/<description[^>]*>([\s\S]*?)<\/description>/)
      const imageMatch = xmlText.match(/<image[^>]*>([\s\S]*?)<\/image>/)
      const thumbnailMatch = xmlText.match(/<thumbnail[^>]*>([\s\S]*?)<\/thumbnail>/)
      
      // Player and time info
      const minPlayersMatch = xmlText.match(/<minplayers[^>]*value="([^"]*)"/)
      const maxPlayersMatch = xmlText.match(/<maxplayers[^>]*value="([^"]*)"/)
      const playingTimeMatch = xmlText.match(/<playingtime[^>]*value="([^"]*)"/)
      const minPlayTimeMatch = xmlText.match(/<minplaytime[^>]*value="([^"]*)"/)
      const maxPlayTimeMatch = xmlText.match(/<maxplaytime[^>]*value="([^"]*)"/)
      const minAgeMatch = xmlText.match(/<minage[^>]*value="([^"]*)"/)
      
      // Statistics
      const averageMatch = xmlText.match(/<average[^>]*value="([^"]*)"/)
      const usersRatedMatch = xmlText.match(/<usersrated[^>]*value="([^"]*)"/)
      const rankMatch = xmlText.match(/<rank[^>]*name="boardgame"[^>]*value="([^"]*)"/)
      const averageWeightMatch = xmlText.match(/<averageweight[^>]*value="([^"]*)"/)
      
      // Extract designers
      const designerMatches = xmlText.match(/<link[^>]*type="boardgamedesigner"[^>]*id="([^"]*)"[^>]*value="([^"]*)"/g)
      const designers = designerMatches?.map(match => {
        const idMatch = match.match(/id="([^"]*)"/)
        const nameMatch = match.match(/value="([^"]*)"/)
        return { id: idMatch?.[1] || '', name: nameMatch?.[1] || '' }
      }) || []
      
      // Extract categories
      const categoryMatches = xmlText.match(/<link[^>]*type="boardgamecategory"[^>]*id="([^"]*)"[^>]*value="([^"]*)"/g)
      const categories = categoryMatches?.map(match => {
        const idMatch = match.match(/id="([^"]*)"/)
        const nameMatch = match.match(/value="([^"]*)"/)
        return { id: idMatch?.[1] || '', name: nameMatch?.[1] || '' }
      }) || []
      
      const name = primaryNameMatch?.[1] || ''
      if (!name) {
        console.error('🎲 No primary name found in XML for game ID:', id)
        return null
      }
      
      const yearPublished = yearMatch ? parseInt(yearMatch[1]) : undefined
      const minPlayers = minPlayersMatch ? parseInt(minPlayersMatch[1]) : undefined
      const maxPlayers = maxPlayersMatch ? parseInt(maxPlayersMatch[1]) : undefined
      const playingTime = playingTimeMatch ? parseInt(playingTimeMatch[1]) : undefined
      const minPlayTime = minPlayTimeMatch ? parseInt(minPlayTimeMatch[1]) : undefined
      const maxPlayTime = maxPlayTimeMatch ? parseInt(maxPlayTimeMatch[1]) : undefined
      const minAge = minAgeMatch ? parseInt(minAgeMatch[1]) : undefined
      const bggRating = averageMatch ? parseFloat(averageMatch[1]) : undefined
      const rating = bggRating ? Math.min(5, Math.max(0, bggRating / 2)) : undefined
      const usersRated = usersRatedMatch ? parseInt(usersRatedMatch[1]) : undefined
      const rank = rankMatch && rankMatch[1] !== 'Not Ranked' ? parseInt(rankMatch[1]) : undefined
      const weight = averageWeightMatch ? parseFloat(averageWeightMatch[1]) : undefined
      
      const complexity = weight 
        ? weight <= 2.0 ? 'Light'
          : weight <= 3.0 ? 'Medium-Light'
          : weight <= 4.0 ? 'Medium'
          : weight <= 4.5 ? 'Medium-Heavy'
          : 'Heavy'
        : undefined
      
      const playerCountText = minPlayers && maxPlayers
        ? minPlayers === maxPlayers ? `${minPlayers} player${minPlayers !== 1 ? 's' : ''}`
          : `${minPlayers}-${maxPlayers} players`
        : undefined
      
      const playTimeText = playingTime 
        ? `${playingTime} minutes`
        : minPlayTime && maxPlayTime && minPlayTime !== maxPlayTime
        ? `${minPlayTime}-${maxPlayTime} minutes`
        : minPlayTime ? `${minPlayTime}+ minutes`
        : undefined
      
      // Clean up description
      let description = ''
      if (descriptionMatch) {
        description = descriptionMatch[1]
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
      }
      
      return {
        id,
        source: 'bgg',
        name,
        description,
        image: imageMatch?.[1]?.trim() || '',
        thumbnail: thumbnailMatch?.[1]?.trim() || '',
        yearPublished,
        minPlayers,
        maxPlayers,
        playingTime,
        minPlayTime,
        maxPlayTime,
        minAge,
        rating,
        bggRating,
        ratingsCount: usersRated,
        usersRated,
        weight,
        rank,
        categories,
        designers,
        mechanics: [], // Not parsing mechanics for simplicity
        artists: [], // Not parsing artists for simplicity
        publishers: [], // Not parsing publishers for simplicity
        families: [],
        title: name,
        author: designers[0]?.name || 'Unknown Designer',
        category: 'boardgames',
        type: 'boardgame',
        overview: description,
        year: yearPublished,
        genre: categories[0]?.name || 'Board Game',
        complexity,
        playerCountText,
        playTimeText,
        ageText: minAge ? `${minAge}+` : undefined,
        bggUrl: `https://boardgamegeek.com/boardgame/${id}`
      } as BoardGameDetail
    } catch (error) {
      console.error('🎲 Error parsing game XML:', error)
      return null
    }
  }

  // Lazy loading for similar games
  const loadSimilarGames = async () => {
    if (loadingSimilar || similarGamesLoaded || !gameDetail) return
    
    setLoadingSimilar(true)
    try {
      console.log('🎲 Loading similar games...')
      const recommendations = await optimalBoardGameAPI.getRecommendations(gameDetail, 6)
      setSimilarGames(recommendations)
      setSimilarGamesLoaded(true)
    } catch (error) {
      console.error('Error loading similar games:', error)
      setSimilarGames([]) // Empty fallback
    } finally {
      setLoadingSimilar(false)
    }
  }

  // Lazy loading for designer games
  const loadDesignerGames = async () => {
    if (loadingDesigner || designerGamesLoaded || !gameDetail || !gameDetail.designers?.length) return
    
    setLoadingDesigner(true)
    try {
      console.log('🎲 Loading designer games...')
      const designerName = gameDetail.designers[0].name
      const designerResults = await optimalBoardGameAPI.search(designerName, { limit: 4 })
      const filteredResults = designerResults.filter(game => game.id !== gameDetail.id)
      setDesignerGames(filteredResults)
      setDesignerGamesLoaded(true)
    } catch (error) {
      console.error('Error loading designer games:', error)
      setDesignerGames([]) // Empty fallback
    } finally {
      setLoadingDesigner(false)
    }
  }

  // Library status management
  const handleStatusSelect = (status: MediaStatus) => {
    if (!gameDetail) return
    
    const gameForLibrary = {
      id: gameId,
      title: gameDetail.name,
      designer: gameDetail.designers?.[0]?.name || 'Unknown Designer',
      year: gameDetail.yearPublished || new Date().getFullYear(),
      image: gameDetail.image,
      category: 'boardgames' as const,
      genre: gameDetail.categories?.[0]?.name || 'Board Game',
      players: gameDetail.playerCountText,
      playTime: gameDetail.playTimeText,
      complexity: gameDetail.complexity,
      bggRating: gameDetail.bggRating
    }
    
    onAddToLibrary(gameForLibrary, status)
    setSelectedStatus(status)
    setShowLibraryDropdown(false)
  }

  const handleRemoveFromLibrary = () => {
    if (onDeleteItem && selectedStatus) {
      onDeleteItem(gameId)
      setSelectedStatus(null)
      setShowLibraryDropdown(false)
    }
  }

  const getStatusLabel = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'Want to Play'
      case 'currently-playing': return 'Playing'
      case 'completed': return 'Played'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'bg-orange-500 hover:bg-orange-600'
      case 'currently-playing': return 'bg-green-500 hover:bg-green-600'
      case 'completed': return 'bg-blue-500 hover:bg-blue-600'
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'dropped': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Light': return 'bg-green-100 text-green-700'
      case 'Medium-Light': return 'bg-blue-100 text-blue-700'
      case 'Medium': return 'bg-yellow-100 text-yellow-700'
      case 'Medium-Heavy': return 'bg-orange-100 text-orange-700'
      case 'Heavy': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
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
        className="bg-[#1a1a1a] rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-[#1a1a1a]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : gameDetail ? (
          <div className="flex h-full">
            {/* Left Panel - Game Info */}
            <div className="flex-1 flex flex-col">
              {/* Header with close button */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                    {gameDetail.thumbnail || gameDetail.image ? (
                      <img
                        src={gameDetail.thumbnail || gameDetail.image!}
                        alt={gameDetail.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                        🎲
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">{gameDetail.name}</h1>
                    <p className="text-lg text-gray-300">{gameDetail.designers?.[0]?.name || 'Unknown Designer'}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Hero Section */}
                <div className="relative">
                  <div className="h-64 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
                    {gameDetail.image && (
                      <img
                        src={gameDetail.image}
                        alt={gameDetail.name}
                        className="w-full h-full object-cover opacity-30"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                  </div>
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-end space-x-6">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl bg-gray-800 border-4 border-gray-700">
                        {gameDetail.image ? (
                          <img
                            src={gameDetail.image}
                            alt={gameDetail.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                            🎲
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h1 className="text-4xl font-bold text-white mb-2">{gameDetail.name}</h1>
                        <p className="text-xl text-gray-300 mb-3">{gameDetail.designers?.[0]?.name || 'Unknown Designer'}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                          {gameDetail.yearPublished && (
                            <span>{gameDetail.yearPublished}</span>
                          )}
                          {gameDetail.playerCountText && (
                            <>
                              <span>•</span>
                              <span>{gameDetail.playerCountText}</span>
                            </>
                          )}
                          {gameDetail.playTimeText && (
                            <>
                              <span>•</span>
                              <span>{gameDetail.playTimeText}</span>
                            </>
                          )}
                          {gameDetail.complexity && (
                            <>
                              <span>•</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getComplexityColor(gameDetail.complexity)}`}>
                                {gameDetail.complexity}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Library Actions */}
                        <div className="flex items-center space-x-3">
                          <div className="relative" ref={libraryDropdownRef}>
                            <button
                              onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2 ${
                                selectedStatus
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                              }`}
                            >
                              <Check size={18} />
                              <span>{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                              <ChevronDown size={16} />
                            </button>

                            {showLibraryDropdown && (
                              <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 min-w-48">
                                {(['want-to-play', 'currently-playing', 'completed', 'paused', 'dropped'] as const).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusSelect(status)}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-700 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                                      selectedStatus === status ? 'text-indigo-500 bg-gray-700' : 'text-gray-300'
                                    }`}
                                  >
                                    {getStatusLabel(status)}
                                  </button>
                                ))}
                                {selectedStatus && (
                                  <>
                                    <div className="border-t border-gray-700 my-1" />
                                    <button
                                      onClick={handleRemoveFromLibrary}
                                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700 transition-colors rounded-b-xl"
                                    >
                                      Remove from Library
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <button className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors border border-gray-700">
                            <Share size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-800 px-6">
                  <div className="flex space-x-8">
                    {(['overview', 'reviews', 'moreinfo'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 text-sm font-medium transition-colors relative ${
                          activeTab === tab
                            ? 'text-indigo-500'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {tab === 'overview' && 'Overview'}
                        {tab === 'reviews' && 'Reviews'}
                        {tab === 'moreinfo' && 'More Info'}
                        
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                      {/* Game Stats */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                          <div className="text-2xl font-bold text-orange-500 mb-1">{gameStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Want to Play</div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                          <div className="text-2xl font-bold text-blue-500 mb-1">{gameStats.completed.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">Played</div>
                        </div>
                      </div>

                      {/* Game Description */}
                      {gameDetail.description && (
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                          <h3 className="text-xl font-semibold text-white mb-4">About This Game</h3>
                          <p className="text-gray-300 leading-relaxed">{gameDetail.description}</p>
                        </div>
                      )}

                      {/* Game Details */}
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">Game Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Year Published</div>
                            <div className="text-white">{gameDetail.yearPublished || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Players</div>
                            <div className="text-white">{gameDetail.playerCountText || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Play Time</div>
                            <div className="text-white">{gameDetail.playTimeText || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Complexity</div>
                            <div className="text-white">{gameDetail.complexity || 'Unknown'}</div>
                          </div>
                          {gameDetail.bggRating && (
                            <div>
                              <div className="text-sm text-gray-400 mb-1">BGG Rating</div>
                              <div className="text-white flex items-center gap-2">
                                <Award size={16} className="text-blue-500" />
                                {gameDetail.bggRating.toFixed(1)}/10
                              </div>
                            </div>
                          )}
                          {gameDetail.rank && (
                            <div>
                              <div className="text-sm text-gray-400 mb-1">BGG Rank</div>
                              <div className="text-white flex items-center gap-2">
                                <Trophy size={16} className="text-yellow-500" />
                                #{gameDetail.rank}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Similar Games */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-white">Similar Games</h3>
                          {!similarGamesLoaded && (
                            <button
                              onClick={loadSimilarGames}
                              disabled={loadingSimilar}
                              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 text-sm"
                            >
                              {loadingSimilar ? 'Loading...' : 'Show Similar'}
                            </button>
                          )}
                        </div>

                        {similarGamesLoaded && (
                          <div className="grid grid-cols-3 gap-4">
                            {similarGames.slice(0, 6).map((game, index) => (
                              <div key={index} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                                <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-700">
                                  {game.image ? (
                                    <img
                                      src={game.image}
                                      alt={game.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <Dice6 size={32} />
                                    </div>
                                  )}
                                </div>
                                <h4 className="font-medium text-white text-sm mb-1 truncate">{game.name}</h4>
                                <p className="text-xs text-gray-400 truncate">{game.designers?.[0]?.name || 'Unknown Designer'}</p>
                                {game.rating && (
                                  <div className="flex items-center mt-2">
                                    <Star size={12} className="text-yellow-500 mr-1" />
                                    <span className="text-xs text-gray-400">{game.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Designer Games */}
                      {gameDetail.designers && gameDetail.designers.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">More by {gameDetail.designers[0].name}</h3>
                            {!designerGamesLoaded && (
                              <button
                                onClick={loadDesignerGames}
                                disabled={loadingDesigner}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 text-sm"
                              >
                                {loadingDesigner ? 'Loading...' : 'Show More'}
                              </button>
                            )}
                          </div>

                          {designerGamesLoaded && (
                            <div className="grid grid-cols-4 gap-4">
                              {designerGames.map((game, index) => (
                                <div key={index} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                                  <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-700">
                                    {game.image ? (
                                      <img
                                        src={game.image}
                                        alt={game.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Dice6 size={24} />
                                      </div>
                                    )}
                                  </div>
                                  <h4 className="font-medium text-white text-sm mb-1 truncate">{game.name}</h4>
                                  {game.rating && (
                                    <div className="flex items-center">
                                      <Star size={12} className="text-yellow-500 mr-1" />
                                      <span className="text-xs text-gray-400">{game.rating.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div className="space-y-6">
                      {/* Review Form */}
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">Write a Review</h3>
                        
                        {/* Rating */}
                        <div className="flex items-center space-x-4 mb-4">
                          <span className="text-gray-400">Your rating:</span>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setUserRating(star)}
                                className="transition-colors"
                              >
                                <Star
                                  size={20}
                                  className={`${
                                    star <= (hoverRating || userRating)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          {userRating > 0 && (
                            <span className="text-yellow-500 text-sm">({userRating}/5)</span>
                          )}
                        </div>

                        {/* Privacy Toggle */}
                        <div className="flex items-center space-x-4 mb-4">
                          <span className="text-gray-400">Privacy:</span>
                          <div className="flex bg-gray-700 rounded-lg p-1">
                            <button
                              onClick={() => setReviewPrivacy('private')}
                              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                                reviewPrivacy === 'private'
                                  ? 'bg-gray-600 text-white'
                                  : 'text-gray-400 hover:text-gray-300'
                              }`}
                            >
                              Private
                            </button>
                            <button
                              onClick={() => setReviewPrivacy('public')}
                              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                                reviewPrivacy === 'public'
                                  ? 'bg-gray-600 text-white'
                                  : 'text-gray-400 hover:text-gray-300'
                              }`}
                            >
                              Public
                            </button>
                          </div>
                        </div>

                        {/* Review Text */}
                        <textarea
                          value={userReview}
                          onChange={(e) => setUserReview(e.target.value)}
                          placeholder="Share your thoughts about this board game..."
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          rows={4}
                        />

                        <button
                          onClick={handleSubmitReview}
                          disabled={!userRating || !userReview.trim()}
                          className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                        >
                          <Send size={16} />
                          <span>Submit Review</span>
                        </button>
                      </div>

                      {/* Reviews List */}
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-4">Community Reviews</h3>
                        <div className="space-y-4">
                          {(bggReviews.length > 0 ? bggReviews : mockBGGReviews).map((review) => (
                            <div key={review.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">{review.username[0]}</span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">{review.username}</div>
                                    <div className="text-xs text-gray-400">{review.platform}</div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        size={14}
                                        className={`${
                                          i < review.rating
                                            ? 'text-yellow-500 fill-yellow-500'
                                            : 'text-gray-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <p className="text-gray-300 leading-relaxed">{review.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'moreinfo' && (
                    <div className="space-y-6">
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">Game Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Categories</div>
                            <div className="text-white">{gameDetail.categories?.map(c => c.name).join(', ') || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Mechanics</div>
                            <div className="text-white">{gameDetail.mechanics?.map(m => m.name).join(', ') || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Publisher</div>
                            <div className="text-white">{gameDetail.publishers?.[0]?.name || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Artists</div>
                            <div className="text-white">{gameDetail.artists?.map(a => a.name).join(', ') || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>

                      {/* External Links */}
                      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">External Links</h3>
                        <div className="space-y-3">
                          {gameDetail.bggUrl && (
                            <a
                              href={gameDetail.bggUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                              <ExternalLink size={18} className="text-gray-400" />
                              <span className="text-white">View on BoardGameGeek</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 bg-[#1a1a1a]">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                <span className="text-2xl">🎲</span>
              </div>
              <p className="text-lg font-medium text-white mb-2">Game not found</p>
              <p className="text-sm text-gray-400">Unable to load game details. Please try again.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
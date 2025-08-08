'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Star, Send, ChevronDown, Share, ExternalLink, Award, Trophy, Dice6, Check, FileText } from 'lucide-react'
import { optimalBoardGameAPI, type OptimalBoardGameResult } from '@/services/optimalBoardGameAPI'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { userReviewsService } from '@/services/userReviewsService'
import ShareWithFriendsModal from './ShareWithFriendsModal'

interface BoardGameDetailPageProps {
  gameId: string
  onBack: () => void
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

export default function BoardGameDetailPage({ 
  gameId,
  onBack, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  bggReviews, 
  onReviewSubmit 
}: BoardGameDetailPageProps) {
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
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<any[]>([])
  const [friendsSearch, setFriendsSearch] = useState('')
  const [showGameSheet, setShowGameSheet] = useState(false)
  const [showFriendsWhoPlayedModal, setShowFriendsWhoPlayedModal] = useState(false)
  const [currentUserReview, setCurrentUserReview] = useState<any>(null)
  const [gameSheetData, setGameSheetData] = useState({
    playDate: '',
    location: '',
    friendsPlayed: [] as any[],
    personalRating: 0,
    personalReview: ''
  })

  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  const gameStats = {
    'want-to-play': 2456,
    'completed': 3871
  }

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

  // Mock friends who played this game
  const friendsWhoPlayed = [
    { id: 2, name: 'Maite', rating: 4, hasReview: true, reviewText: 'Amazing game! Great strategy and fun mechanics.' },
    { id: 4, name: 'Joshua', rating: 5, hasReview: true, reviewText: 'One of the best board games I\'ve played this year!' },
    { id: 6, name: 'Ana', rating: 3, hasReview: false, reviewText: null },
    { id: 1, name: 'Axel', rating: 4, hasReview: true, reviewText: 'Great game night with friends. Highly recommend!' }
  ]

  // Mock BGG Reviews fallback
  const mockBGGReviews = [
    { id: 1, username: 'BoardGameGeeker', rating: 5, text: 'Fantastic game with amazing replay value. Great mechanics and theme integration.', date: '2024-01-15', platform: 'BGG' },
    { id: 2, username: 'MeepleCollector', rating: 4, text: 'Solid game design with beautiful components. Takes a few plays to master.', date: '2024-01-12', platform: 'BGG' },
    { id: 3, username: 'TabletopTactician', rating: 5, text: 'One of the best games in its category. Highly recommended!', date: '2024-01-10', platform: 'BGG' },
    { id: 4, username: 'GameNightHost', rating: 4, text: 'Great for game nights. Easy to learn but deep strategy.', date: '2024-01-08', platform: 'BGG' },
    { id: 5, username: 'StrategyGamer', rating: 5, text: 'Excellent balance of luck and strategy. Never gets old.', date: '2024-01-05', platform: 'BGG' }
  ]

  useEffect(() => {
    setActiveTab('overview')
    setShowFullOverview(false)
    setShowLibraryDropdown(false)
    setSimilarGamesLoaded(false)
    setDesignerGamesLoaded(false)
  }, [gameId])

  // Ref pour éviter les appels API multiples
  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (gameId && hasLoadedRef.current !== gameId) {
      hasLoadedRef.current = gameId
      fetchGameDetail()
    }
  }, [gameId])

  useEffect(() => {
    const libraryItem = library.find(item => item.id === gameId)
    console.log('🎲 [BoardGame] Library check for gameId:', gameId)
    console.log('🎲 [BoardGame] Library items:', library.map(item => ({ id: item.id, title: item.title, status: item.status })))
    console.log('🎲 [BoardGame] Found library item:', libraryItem)
    
    if (libraryItem) {
      console.log('🎲 [BoardGame] Setting status to:', libraryItem.status)
      setSelectedStatus(libraryItem.status)
    } else {
      console.log('🎲 [BoardGame] No library item found, setting status to null')
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

  // Library status management - moved above with friends modal logic

  const handleRemoveFromLibrary = () => {
    console.log('🎲 [BoardGame] handleRemoveFromLibrary called')
    console.log('🎲 [BoardGame] onDeleteItem exists:', !!onDeleteItem)
    console.log('🎲 [BoardGame] selectedStatus:', selectedStatus)
    console.log('🎲 [BoardGame] gameId to remove:', gameId)
    
    if (onDeleteItem && selectedStatus) {
      console.log('🎲 [BoardGame] Calling onDeleteItem with gameId:', gameId)
      onDeleteItem(gameId)
      console.log('🎲 [BoardGame] Setting selectedStatus to null')
      setSelectedStatus(null)
      setShowLibraryDropdown(false)
    } else {
      console.warn('🎲 [BoardGame] Cannot remove: onDeleteItem or selectedStatus missing')
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

  const handleRatingClick = async (rating: number) => {
    setUserRating(rating)
    // Auto-save rating
    if (gameDetail) {
      try {
        await userReviewsService.submitReview({
          mediaId: gameId,
          mediaTitle: gameDetail.name,
          mediaCategory: 'boardgames',
          rating,
          reviewText: userReview,
          isPublic: reviewPrivacy === 'public'
        })
        console.log('🎲 [BoardGame] Rating saved successfully:', rating)
      } catch (error) {
        console.error('🎲 [BoardGame] Error saving rating:', error)
      }
    }
  }

  const toggleFriend = (friend: any) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id)
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id)
      } else {
        return [...prev, friend]
      }
    })
  }

  const handleStatusSelect = (status: MediaStatus) => {
    console.log('🎲 [BoardGame] handleStatusSelect called with status:', status)
    console.log('🎲 [BoardGame] gameDetail exists:', !!gameDetail)
    console.log('🎲 [BoardGame] gameId:', gameId)
    
    if (!gameDetail) {
      console.error('🎲 [BoardGame] No gameDetail available, cannot add to library')
      return
    }
    
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
    
    console.log('🎲 [BoardGame] Game data to add:', gameForLibrary)
    console.log('🎲 [BoardGame] Calling onAddToLibrary with status:', status)
    
    // Call the parent's onAddToLibrary function
    onAddToLibrary(gameForLibrary, status)
    
    // Update local state
    console.log('🎲 [BoardGame] Setting local selectedStatus to:', status)
    setSelectedStatus(status)
    setShowLibraryDropdown(false)
    
    // If status is 'completed' (Played), show friends modal
    if (status === 'completed') {
      console.log('🎲 [BoardGame] Status is completed, showing friends modal')
      setShowFriendsModal(true)
    }
  }

  return (
    <div className="bg-[#0f0e17] min-h-screen pb-20 font-system">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : gameDetail ? (
        <div>
          {/* Hero Section - Letterboxd Style: Image Top + Info Bottom */}
          <div className="relative min-h-[400px] overflow-visible">
            {/* Top Section: Pure Image (40% height) */}
            <div className="relative h-[160px] overflow-hidden">
              <img
                src={gameDetail.image || 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop&q=80'}
                alt={`${gameDetail.name} background`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop&q=80'
                }}
              />
              
              {/* Navigation Header - Above everything */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5" style={{ zIndex: 20 }}>
                <button
                  onClick={onBack}
                  className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
                >
                  <ArrowLeft size={20} />
                </button>
                
                {/* Removed URL bar as requested */}
                <div className="w-10 h-10 opacity-0">
                  {/* Spacer */}
                </div>
              </div>
            </div>

            {/* Bottom Section: Game Info with Purple Gradient */}
            <div className="relative min-h-[240px] overflow-visible">
              {/* Purple Gradient Background for Info Section */}
              <div 
                className="absolute inset-0"
                style={{ 
                  background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.4), rgba(126, 58, 242, 0.3), rgba(107, 33, 168, 0.2), rgba(15, 14, 23, 0.7))',
                  zIndex: 1
                }}
              />
              
              {/* Texture Overlay */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3C/defs%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,
                  zIndex: 2
                }}
              />

              {/* Game Info Container */}
              <div className="px-5 py-6 relative z-30" style={{ overflow: 'visible' }}>
                {/* Container avec image + infos SEULEMENT */}
                <div className="flex gap-4 items-start mb-4">
                  {/* Game Thumbnail - Fixed 100x100 */}
                  <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 relative cursor-pointer transition-transform duration-200 active:scale-95">
                    {gameDetail.image ? (
                      <img
                        src={gameDetail.image}
                        alt={gameDetail.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[40px] text-white">
                        🎲
                      </div>
                    )}
                    
                    {/* HD Badge */}
                    <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white backdrop-blur-sm">
                      HD
                    </div>
                  </div>
                  
                  {/* Game Title Section */}
                  <div className="flex-1 pt-1">
                    <h1 className="text-xl font-bold text-white mb-1 leading-tight">{gameDetail.name}</h1>
                    <p className="text-sm text-gray-400 mb-1">{gameDetail.designers?.[0]?.name || 'Unknown Designer'}</p>
                    
                    {/* Game Stats on same line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {gameDetail.yearPublished && <span>{gameDetail.yearPublished}</span>}
                      {gameDetail.playerCountText && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{gameDetail.playerCountText}</span>
                        </>
                      )}
                      {gameDetail.playTimeText && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{gameDetail.playTimeText}</span>
                        </>
                      )}
                      {gameDetail.complexity && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span>{gameDetail.complexity}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* NOUVELLE section pour les boutons - full width */}
                <div className="flex space-x-3 mt-3 relative z-50" ref={libraryDropdownRef} style={{ zIndex: 100000 }}>
                  {/* Status Button */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                    >
                      <span>{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                      <ChevronDown size={16} className={`transition-transform ${showLibraryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showLibraryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                        {(['want-to-play', 'completed'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusSelect(status)}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              selectedStatus === status ? 'text-purple-400 bg-purple-600/30' : 'text-gray-300'
                            }`}
                          >
                            {getStatusLabel(status)}
                          </button>
                        ))}
                        {selectedStatus && (
                          <>
                            <div className="border-t border-purple-500/30 my-1" />
                            <button
                              onClick={handleRemoveFromLibrary}
                              className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors rounded-b-lg"
                            >
                              Remove from Library
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Share Button */}
                  <button 
                    onClick={() => setShowShareWithFriendsModal(true)}
                    className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
                  >
                    <Share size={16} />
                    <span>Share</span>
                  </button>
                </div>

                {/* Friends who played */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">Friends who played:</span>
                      <div className="flex -space-x-1">
                        {friendsWhoPlayed.slice(0, 4).map((friend) => (
                          <div
                            key={friend.id}
                            className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                            title={`${friend.name} - ${friend.rating}/5 stars`}
                          >
                            {friend.name.charAt(0)}
                          </div>
                        ))}
                        {friendsWhoPlayed.length > 4 && (
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform">
                            +{friendsWhoPlayed.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowFriendsWhoPlayedModal(true)}
                      className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                    >
                      View all
                    </button>
                  </div>
                  
                  {/* Game Sheet Link */}
                  <div className="mt-2">
                    <button
                      onClick={() => setShowGameSheet(true)}
                      className="text-purple-400 hover:text-purple-300 text-sm transition-colors flex items-center space-x-1"
                    >
                      <FileText size={14} />
                      <span>Customize this game sheet</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Main Content - BookDetailModalV3 Style */}
          <div className="px-6 py-4 relative" style={{ zIndex: 1 }}>

            {/* Rate this game section (shown if user has marked as played) */}
            {selectedStatus === 'completed' && (
              <div className="mb-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Rate this game</h3>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRatingClick(star)}
                        className="transition-all duration-200 hover:scale-110"
                      >
                        <Star
                          size={20}
                          className={`${
                            star <= (hoverRating || userRating)
                              ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                              : 'text-white/30 hover:text-yellow-400'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  {userRating > 0 && (
                    <span className="text-purple-400 text-sm font-medium">
                      {userRating}/5 stars
                    </span>
                  )}
                </div>
                
                {/* Review Text Area */}
                {userRating > 0 && (
                  <div className="space-y-3">
                    <textarea
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      placeholder="Write your review... (optional)"
                      className="w-full bg-black/20 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                      rows={3}
                    />
                    
                    {/* Privacy Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-white/70 text-sm">Review privacy:</span>
                        <div className="flex bg-black/30 rounded-lg p-1">
                          <button
                            onClick={() => setReviewPrivacy('private')}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${
                              reviewPrivacy === 'private'
                                ? 'bg-purple-600 text-white'
                                : 'text-white/60 hover:text-white/80'
                            }`}
                          >
                            Private
                          </button>
                          <button
                            onClick={() => setReviewPrivacy('public')}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${
                              reviewPrivacy === 'public'
                                ? 'bg-purple-600 text-white'
                                : 'text-white/60 hover:text-white/80'
                            }`}
                          >
                            Public
                          </button>
                        </div>
                      </div>
                      
                      {userReview.trim() && (
                        <button
                          onClick={handleSubmitReview}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                        >
                          Save Review
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {gameDetail.description && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-2">Description</h3>
                <div className="text-gray-400 text-sm leading-relaxed">
                  <div 
                    style={!showFullOverview ? {
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden'
                    } : undefined}
                  >
                    {gameDetail.description}
                  </div>
                  {gameDetail.description.length > 300 && (
                    <button
                      onClick={() => setShowFullOverview(!showFullOverview)}
                      className="text-gray-400 hover:text-gray-300 text-xs mt-1 transition-colors inline-block"
                    >
                      {showFullOverview ? 'show less' : '...more'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Game Information */}
            <div className="space-y-3">
              <div className="flex">
                <span className="text-gray-400 w-24 flex-shrink-0 text-sm">Designer:</span>
                <span className="text-white flex-1 text-sm">{gameDetail.designers?.[0]?.name || 'Unknown'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-400 w-24 flex-shrink-0 text-sm">Year:</span>
                <span className="text-white flex-1 text-sm">{gameDetail.yearPublished || 'Unknown'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-400 w-24 flex-shrink-0 text-sm">Players:</span>
                <span className="text-white flex-1 text-sm">{gameDetail.playerCountText || 'Unknown'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-400 w-24 flex-shrink-0 text-sm">Play Time:</span>
                <span className="text-white flex-1 text-sm">{gameDetail.playTimeText || 'Unknown'}</span>
              </div>
              <div className="flex">
                <span className="text-gray-400 w-24 flex-shrink-0 text-sm">Complexity:</span>
                <span className="text-white flex-1 text-sm">{gameDetail.complexity || 'Unknown'}</span>
              </div>
              {gameDetail.bggRating && (
                <div className="flex">
                  <span className="text-gray-400 w-24 flex-shrink-0 text-sm">BGG Rating:</span>
                  <span className="text-white flex-1 text-sm">{gameDetail.bggRating.toFixed(1)}/10</span>
                </div>
              )}
              {gameDetail.categories && gameDetail.categories.length > 0 && (
                <div className="flex">
                  <span className="text-gray-400 w-24 flex-shrink-0 text-sm">Categories:</span>
                  <span className="text-white flex-1 text-sm">{gameDetail.categories.map(c => c.name).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
              <span className="text-2xl">🎲</span>
            </div>
            <p className="text-lg font-medium text-white mb-2">Game not found</p>
            <p className="text-sm text-gray-400">Unable to load game details. Please try again.</p>
          </div>
        </div>
      )}
      
      {/* Friends Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-purple-500/30 max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-purple-500/30">
              <h3 className="text-xl font-semibold text-white mb-2">Who did you play with?</h3>
              <p className="text-gray-400 text-sm">Select friends who played this game with you</p>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={friendsSearch}
                  onChange={(e) => setFriendsSearch(e.target.value)}
                  className="w-full bg-black/20 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                />
              </div>
              
              {/* Friends List */}
              <div className="space-y-2">
                {mockFriends
                  .filter(friend => friend.name.toLowerCase().includes(friendsSearch.toLowerCase()))
                  .map((friend) => {
                    const isSelected = selectedFriends.some(f => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleFriend(friend)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isSelected 
                            ? 'bg-purple-600/30 border border-purple-500'
                            : 'bg-black/20 hover:bg-purple-600/10 border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <span className={`font-medium ${
                          isSelected ? 'text-purple-300' : 'text-white'
                        }`}>
                          {friend.name}
                        </span>
                        {isSelected && (
                          <div className="ml-auto w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
            
            <div className="p-6 border-t border-purple-500/30 flex space-x-3">
              <button
                onClick={() => {
                  setShowFriendsModal(false)
                  setSelectedFriends([])
                  setFriendsSearch('')
                }}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowFriendsModal(false)
                  setFriendsSearch('')
                  // Could save selected friends here
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200"
              >
                Done ({selectedFriends.length})
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Share With Friends Modal */}
      {showShareWithFriendsModal && gameDetail && (
        <ShareWithFriendsModal
          isOpen={showShareWithFriendsModal}
          onClose={() => setShowShareWithFriendsModal(false)}
          item={{
            id: gameId,
            type: 'boardgames' as const,
            title: gameDetail.name,
            image: gameDetail.image
          }}
        />
      )}
      
      {/* Game Sheet Modal */}
      {showGameSheet && gameDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-purple-500/30 max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-purple-500/30">
              <h3 className="text-xl font-semibold text-white mb-2">Game Sheet</h3>
              <p className="text-gray-400 text-sm">Track your gaming experience</p>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Game Info */}
              <div className="flex items-start space-x-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0">
                  {gameDetail.image ? (
                    <img src={gameDetail.image} alt={gameDetail.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎲</div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-1">{gameDetail.name}</h4>
                  <p className="text-gray-400 text-sm mb-2">{gameDetail.designers?.[0]?.name || 'Unknown Designer'}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {gameDetail.yearPublished && <span>{gameDetail.yearPublished}</span>}
                    {gameDetail.playerCountText && <span>• {gameDetail.playerCountText}</span>}
                    {gameDetail.playTimeText && <span>• {gameDetail.playTimeText}</span>}
                  </div>
                </div>
              </div>
              
              {/* Play Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Play Date</label>
                  <input
                    type="date"
                    value={gameSheetData.playDate}
                    onChange={(e) => setGameSheetData(prev => ({ ...prev, playDate: e.target.value }))}
                    className="w-full bg-black/20 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    placeholder="Where did you play?"
                    value={gameSheetData.location}
                    onChange={(e) => setGameSheetData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-black/20 border border-purple-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
              
              {/* Friends Played With */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Friends Played With</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                      </div>
                      <button onClick={() => toggleFriend(friend)} className="text-red-400 text-xs">Remove</button>
                    </div>
                  ))}
                  {selectedFriends.length === 0 && (
                    <p className="text-gray-500 text-sm">No friends selected</p>
                  )}
                </div>
              </div>
              
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">My Rating</label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setGameSheetData(prev => ({ ...prev, personalRating: star }))}
                      className="transition-colors"
                    >
                      <Star
                        size={24}
                        className={`${
                          star <= gameSheetData.personalRating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-400 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Review */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">My Review</label>
                <textarea
                  value={gameSheetData.personalReview}
                  onChange={(e) => setGameSheetData(prev => ({ ...prev, personalReview: e.target.value }))}
                  placeholder="How was your experience?"
                  className="w-full bg-black/20 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-purple-500/30 flex space-x-3">
              <button
                onClick={() => setShowGameSheet(false)}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save game sheet data
                  setShowGameSheet(false)
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200"
              >
                Save Game Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Who Played Modal */}
      {showFriendsWhoPlayedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-purple-500/30 max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-purple-500/30">
              <h3 className="text-xl font-semibold text-white mb-2">Friends who played {gameDetail?.name}</h3>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {friendsWhoPlayed.map((friend) => (
                <div key={friend.id} className="bg-black/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                        {friend.name.charAt(0)}
                      </div>
                      <span className="text-white font-medium">{friend.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={12} className={star <= friend.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                      ))}
                      <span className="text-gray-400 text-sm ml-1">{friend.rating}/5</span>
                    </div>
                  </div>
                  {friend.hasReview && friend.reviewText && (
                    <p className="text-gray-300 text-sm">{friend.reviewText}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-purple-500/30">
              <button onClick={() => setShowFriendsWhoPlayedModal(false)} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
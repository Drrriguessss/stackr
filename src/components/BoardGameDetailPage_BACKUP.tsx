'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, Share, ExternalLink, Award, Trophy, Dice6, Check, FileText } from 'lucide-react'
import { optimalBoardGameAPI, type OptimalBoardGameResult } from '@/services/optimalBoardGameAPI'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { userReviewsService } from '@/services/userReviewsService'
import { socialService } from '@/services/socialService'
import { reviewInteractionsService, type ReviewComment } from '@/services/reviewInteractionsService'
import ShareWithFriendsModal from './ShareWithFriendsModal'
import { avatarService } from '@/services/avatarService'

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

type TabType = 'overview' | 'reviews' | 'moreinfo' | 'media'

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
  const [showStatusPopup, setShowStatusPopup] = useState(false)
  // Removed showFriendsModal - no popup when selecting played status
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  // Removed selectedFriends and friendsSearch - no longer needed without friends popup
  const [showGameSheet, setShowGameSheet] = useState(false)
  const [showFriendsWhoPlayedModal, setShowFriendsWhoPlayedModal] = useState(false)
  const [showFriendsSelector, setShowFriendsSelector] = useState(false)
  const [userFriends, setUserFriends] = useState<any[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [currentUserReview, setCurrentUserReview] = useState<any>(null)
  const [realFriendsWhoPlayed, setRealFriendsWhoPlayed] = useState<any[]>([])
  const [loadingFriendsWhoPlayed, setLoadingFriendsWhoPlayed] = useState(false)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [expandedUserReview, setExpandedUserReview] = useState(false)
  const [userReviewData, setUserReviewData] = useState({
    isLiked: false,
    likesCount: 0,
    commentsCount: 0,
    comments: [] as Array<{
      id: string
      userId: string
      username: string
      text: string
      timestamp: string
      likes: number
      isLiked: boolean
    }>
  })
  
  // Comment modal states
  const [showUserReviewComments, setShowUserReviewComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  
  // Share modal states
  const [showShareModal, setShowShareModal] = useState(false)
  const [gameSheetData, setGameSheetData] = useState({
    playDate: '',
    location: '',
    friendsPlayed: [] as any[],
    personalRating: 0,
    personalReview: ''
  })

  // Removed libraryDropdownRef - using modal popup instead

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

  // Load friends who played this game
  const loadFriendsWhoPlayed = async () => {
    setLoadingFriendsWhoPlayed(true)
    try {
      // Get all friends
      const friends = await socialService.getFriends()
      
      // For now, we'll just show all friends as a placeholder
      // In a real implementation, we would check each friend's library
      // or activity feed to see who has played this game
      
      // Temporarily return empty array until we have a proper way to check
      // which friends have played this specific game
      setRealFriendsWhoPlayed([])
      
      // TODO: Implement proper logic to check which friends have this game
      // This would require either:
      // 1. A backend endpoint to get friends' library items for a specific game
      // 2. Or access to friends' activity feeds filtered by this game
      
    } catch (error) {
      console.error('Error loading friends who played:', error)
      setRealFriendsWhoPlayed([])
    } finally {
      setLoadingFriendsWhoPlayed(false)
    }
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
    setActiveTab('overview')
    setShowFullOverview(false)
    setShowStatusPopup(false)
    setSimilarGamesLoaded(false)
    setDesignerGamesLoaded(false)
  }, [gameId])

  // Ref pour éviter les appels API multiples
  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (gameId && hasLoadedRef.current !== gameId) {
      hasLoadedRef.current = gameId
      fetchGameDetail()
      loadFriendsWhoPlayed()
      loadUserRating()
    }
  }, [gameId])

  // Load existing user rating for this game
  const loadUserRating = async () => {
    try {
      const existingReview = await userReviewsService.getUserReviewForMedia(gameId)
      if (existingReview) {
        console.log('🎲 [BoardGame] Loading existing rating:', existingReview.rating)
        setUserRating(existingReview.rating)
        setUserReview(existingReview.review_text || '')
        setReviewPrivacy(existingReview.is_public ? 'public' : 'private')
        
        // Load review interactions
        const reviewId = `boardgame_${gameId}_user_${existingReview.user_identifier}`
        const interactions = await reviewInteractionsService.getReviewInteractions(reviewId)
        const comments = await reviewInteractionsService.getReviewComments(reviewId)
        
        setUserReviewData({
          isLiked: interactions.user_liked,
          likesCount: interactions.likes_count,
          commentsCount: interactions.comments_count,
          comments: comments.map(comment => ({
            id: comment.id,
            userId: comment.user_id,
            username: comment.username,
            text: comment.comment_text,
            timestamp: comment.created_at,
            likes: comment.likes_count || 0,
            isLiked: comment.user_liked || false
          }))
        })
        
        // If user has a rating, we'll show the "Your review" section instead of opening the review box
        // The review box will only open when user clicks "Edit" or when they start rating
        // No need to auto-open setShowReviewBox here
      }
    } catch (error) {
      console.error('🎲 [BoardGame] Error loading user rating:', error)
    }
  }

  useEffect(() => {
    const libraryItem = library.find(item => item.id === gameId)
    // Library status check
    
    if (libraryItem) {
      // Status found in library
      setSelectedStatus(libraryItem.status)
    } else {
      // No status found in library
      setSelectedStatus(null)
    }
  }, [gameId, library])

  // Removed dropdown click outside handler - using modal instead

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
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA wrapper
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, '/')
          .replace(/&#10;/g, '\n') // Remplacer &#10; par saut de ligne
          .replace(/&#13;/g, '\r') // Remplacer &#13; par retour chariot
          .replace(/&#32;/g, ' ') // Remplacer &#32; par espace
          .replace(/&#160;/g, ' ') // Remplacer &#160; par espace insécable
          .replace(/&#8211;/g, '–') // Remplacer &#8211; par tiret court
          .replace(/&#8212;/g, '—') // Remplacer &#8212; par tiret long
          .replace(/&#8216;/g, "\u2018") // Remplacer &#8216; par apostrophe gauche
          .replace(/&#8217;/g, "\u2019") // Remplacer &#8217; par apostrophe droite
          .replace(/&#8220;/g, "\u201C") // Remplacer &#8220; par guillemet gauche
          .replace(/&#8221;/g, "\u201D") // Remplacer &#8221; par guillemet droit
          .replace(/&#8230;/g, '...') // Remplacer &#8230; par points de suspension
          // Traiter les entités UTF-8 mal encodées (séquences &#226;&#128;&#xxx;)
          .replace(/&#226;&#128;&#147;/g, '–') // EN DASH mal encodé
          .replace(/&#226;&#128;&#148;/g, '—') // EM DASH mal encodé
          .replace(/&#226;&#128;&#156;/g, '"') // LEFT DOUBLE QUOTE mal encodé
          .replace(/&#226;&#128;&#157;/g, '"') // RIGHT DOUBLE QUOTE mal encodé
          .replace(/&#226;&#128;&#152;/g, "'") // LEFT SINGLE QUOTE mal encodé
          .replace(/&#226;&#128;&#153;/g, "'") // RIGHT SINGLE QUOTE mal encodé
          .replace(/&#226;&#128;&#166;/g, '...') // ELLIPSIS mal encodé
          .replace(/&#226;&#128;&#149;/g, '—') // HORIZONTAL BAR mal encodé
          .replace(/&hellip;/g, '...')
          .replace(/&mdash;/g, '—')
          .replace(/&ndash;/g, '–')
          .replace(/&rsquo;/g, "\u2019")
          .replace(/&lsquo;/g, "\u2018")
          .replace(/&rdquo;/g, "\u201D")
          .replace(/&ldquo;/g, "\u201C")
          .replace(/&nbsp;/g, ' ')
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
    // Remove from library called
    
    if (onDeleteItem && selectedStatus) {
      // Removing item from library
      onDeleteItem(gameId)
      // Status reset to null
      setSelectedStatus(null)
      setShowStatusPopup(false)
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

  const handleSubmitReview = async () => {
    if (userRating > 0 && userReview.trim()) {
      try {
        await userReviewsService.submitReview({
          mediaId: gameId,
          mediaTitle: gameDetail?.name || '',
          mediaCategory: 'boardgames',
          rating: userRating,
          reviewText: userReview.trim(),
          isPublic: reviewPrivacy === 'public'
        })
        
        // Review saved
        // Close review box to show the Instagram-style review section
        setShowReviewBox(false)
        
        // Show success feedback
        setReviewSaved(true)
        setTimeout(() => setReviewSaved(false), 2000)
        
        // Call the parent's onReviewSubmit if it exists
        onReviewSubmit({
          rating: userRating,
          review: userReview.trim()
        })
      } catch (error) {
        console.error('🎲 [BoardGame] Error saving review:', error)
      }
    }
  }

  const handleSkipReview = () => {
    // Just close the review box without saving any review text
    // The rating is already saved from handleRatingClick
    // Saving rating only
    setShowReviewBox(false)
  }

  // Helper function to truncate text to one line
  const truncateToOneLine = (text: string) => {
    return text.length > 60 ? text.substring(0, 60) + '...' : text
  }

  // Helper to get current user identifier
  const getCurrentUserIdentifier = () => {
    if (typeof window === 'undefined') return 'anonymous'
    return localStorage.getItem('stackr_user_identifier') || 'anonymous'
  }

  // Your review actions
  const handleLikeUserReview = async () => {
    try {
      const currentUser = getCurrentUserIdentifier()
      const reviewId = `boardgame_${gameId}_user_${currentUser}`
      
      const newLikeState = await reviewInteractionsService.toggleReviewLike(reviewId)
      
      setUserReviewData(prev => ({
        ...prev,
        isLiked: newLikeState,
        likesCount: newLikeState ? prev.likesCount + 1 : Math.max(0, prev.likesCount - 1)
      }))
    } catch (error) {
      console.error('Error toggling like:', error)
      // Fallback to local state update
      setUserReviewData(prev => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
      }))
    }
  }

  const handleCommentUserReview = () => {
    setShowUserReviewComments(true)
  }

  const handleShareUserReview = async () => {
    setShowShareModal(true)
    
    // Mark review as shared for tracking
    try {
      const currentUser = getCurrentUserIdentifier()
      const reviewId = `boardgame_${gameId}_user_${currentUser}`
      await reviewInteractionsService.markReviewAsShared(reviewId)
    } catch (error) {
      console.error('Error marking review as shared:', error)
    }
  }

  // Comment functions
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return
    
    try {
      const currentUser = getCurrentUserIdentifier()
      const reviewId = `boardgame_${gameId}_user_${currentUser}`
      
      const comment = await reviewInteractionsService.addReviewComment(reviewId, newComment.trim())
      
      if (comment) {
        setUserReviewData(prev => ({
          ...prev,
          commentsCount: prev.commentsCount + 1,
          comments: [...prev.comments, {
            id: comment.id,
            userId: comment.user_id,
            username: comment.username,
            text: comment.comment_text,
            timestamp: comment.created_at,
            likes: 0,
            isLiked: false
          }]
        }))
        
        setNewComment('')
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    }
  }

  // Format timestamp for comments
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }

  // Clean HTML description function
  const cleanDescription = (htmlContent: string): string => {
    if (!htmlContent) return ''
    
    // Supprimer toutes les balises HTML et nettoyer le contenu
    return htmlContent
      // D'abord remplacer certaines balises par des espaces pour éviter la concatenation
      .replace(/<\/?(p|div|br|h[1-6])[^>]*>/gi, ' ') // Ajouter espaces pour les balises de bloc
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Supprimer entièrement les scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Supprimer entièrement les styles
      .replace(/<[^>]*>/g, '') // Supprimer toutes les autres balises HTML
      .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par espaces
      .replace(/&amp;/g, '&') // Remplacer &amp; par &
      .replace(/&lt;/g, '<') // Remplacer &lt; par <
      .replace(/&gt;/g, '>') // Remplacer &gt; par >
      .replace(/&quot;/g, '"') // Remplacer &quot; par "
      .replace(/&#39;/g, "'") // Remplacer &#39; par '
      .replace(/&#x27;/g, "'") // Remplacer &#x27; par '
      .replace(/&#x2F;/g, '/') // Remplacer &#x2F; par /
      .replace(/&#10;/g, '\n') // Remplacer &#10; par saut de ligne
      .replace(/&#13;/g, '\r') // Remplacer &#13; par retour chariot
      .replace(/&#32;/g, ' ') // Remplacer &#32; par espace
      .replace(/&#160;/g, ' ') // Remplacer &#160; par espace insécable
      .replace(/&#8211;/g, '–') // Remplacer &#8211; par tiret court
      .replace(/&#8212;/g, '—') // Remplacer &#8212; par tiret long
      .replace(/&#8216;/g, "\u2018") // Remplacer &#8216; par apostrophe gauche
      .replace(/&#8217;/g, "\u2019") // Remplacer &#8217; par apostrophe droite
      .replace(/&#8220;/g, "\u201C") // Remplacer &#8220; par guillemet gauche
      .replace(/&#8221;/g, "\u201D") // Remplacer &#8221; par guillemet droit
      .replace(/&#8230;/g, '...') // Remplacer &#8230; par points de suspension
      // Traiter les entités UTF-8 mal encodées (séquences &#226;&#128;&#xxx;)
      .replace(/&#226;&#128;&#147;/g, '–') // EN DASH mal encodé
      .replace(/&#226;&#128;&#148;/g, '—') // EM DASH mal encodé
      .replace(/&#226;&#128;&#156;/g, '"') // LEFT DOUBLE QUOTE mal encodé
      .replace(/&#226;&#128;&#157;/g, '"') // RIGHT DOUBLE QUOTE mal encodé
      .replace(/&#226;&#128;&#152;/g, "'") // LEFT SINGLE QUOTE mal encodé
      .replace(/&#226;&#128;&#153;/g, "'") // RIGHT SINGLE QUOTE mal encodé
      .replace(/&#226;&#128;&#166;/g, '...') // ELLIPSIS mal encodé
      .replace(/&#226;&#128;&#149;/g, '—') // HORIZONTAL BAR mal encodé
      .replace(/&hellip;/g, '...') // Remplacer &hellip; par ...
      .replace(/&mdash;/g, '—') // Remplacer &mdash; par —
      .replace(/&ndash;/g, '–') // Remplacer &ndash; par –
      .replace(/&rsquo;/g, "\u2019") // Remplacer &rsquo; par '
      .replace(/&lsquo;/g, "\u2018") // Remplacer &lsquo; par '
      .replace(/&rdquo;/g, "\u201D") // Remplacer &rdquo; par "
      .replace(/&ldquo;/g, "\u201C") // Remplacer &ldquo; par "
      .replace(/\s+/g, ' ') // Normaliser les espaces multiples
      .trim()
  }

  const handleRatingClick = async (rating: number) => {
    // Allow editing: if same rating is clicked, reset to 0
    const newRating = userRating === rating ? 0 : rating
    setUserRating(newRating)
    
    // Open review box when rating (but not when clearing)
    if (newRating > 0) {
      setShowReviewBox(true)
    } else {
      setShowReviewBox(false)
    }
    
    // Auto-save rating
    if (gameDetail) {
      try {
        if (newRating > 0) {
          await userReviewsService.submitReview({
            mediaId: gameId,
            mediaTitle: gameDetail.name,
            mediaCategory: 'boardgames',
            rating: newRating,
            reviewText: userReview,
            isPublic: reviewPrivacy === 'public'
          })
          // Rating saved
        } else {
          // If rating is 0, delete the review
          await userReviewsService.deleteUserReview(gameId)
          // Rating deleted
          setUserReview('') // Clear review text when rating is deleted
        }
      } catch (error) {
        console.error('🎲 [BoardGame] Error saving/deleting rating:', error)
      }
    }
  }

  // Removed toggleFriend function - no longer needed without friends popup

  const loadUserFriends = async () => {
    if (userFriends.length > 0) return // Already loaded
    
    setLoadingFriends(true)
    try {
      const friends = await socialService.getFriends()
      setUserFriends(friends.map(friend => ({
        id: friend.friend_id,
        name: friend.display_name || friend.username || 'Friend',
        avatar: friend.avatar_url
      })))
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setLoadingFriends(false)
    }
  }

  const addFriendToGame = (friend: any) => {
    const isAlreadySelected = gameSheetData.friendsPlayed.some(f => f.id === friend.id)
    if (!isAlreadySelected) {
      setGameSheetData(prev => ({ 
        ...prev, 
        friendsPlayed: [...prev.friendsPlayed, friend] 
      }))
    }
    setShowFriendsSelector(false)
  }

  // Removed handleFriendsConfirm - no longer needed without friends popup

  const handleStatusSelect = (status: MediaStatus) => {
    // If clicking on the same status, just close the popup
    if (selectedStatus === status) {
      setShowStatusPopup(false)
      return
    }
    
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
    
    // Call the parent's onAddToLibrary function and update state immediately
    onAddToLibrary(gameForLibrary, status)
    setSelectedStatus(status)
    setShowStatusPopup(false)
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
              
              {/* Navigation Header - X button top right */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-5" style={{ zIndex: 20 }}>
                <button
                  onClick={onBack}
                  className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
                >
                  <X size={20} />
                </button>
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
                <div className="flex space-x-3 mt-3 relative z-50" style={{ zIndex: 100000 }}>
                  {/* Status Button */}
                  <div className="flex-1">
                    <button
                      onClick={() => setShowStatusPopup(true)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                    >
                      <span>{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                    </button>
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
                      {loadingFriendsWhoPlayed ? (
                        <span className="text-gray-500 text-sm">Loading...</span>
                      ) : realFriendsWhoPlayed.length > 0 ? (
                        <div className="flex -space-x-1">
                          {realFriendsWhoPlayed.slice(0, 4).map((friend) => (
                            friend.avatar_url ? (
                              <img
                                key={friend.friend_id}
                                src={friend.avatar_url}
                                alt={friend.display_name || friend.username}
                                className="w-6 h-6 rounded-full border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                                title={`${friend.display_name || friend.username}${friend.rating ? ` - ${friend.rating}/5 stars` : ''}`}
                              />
                            ) : (
                              <div
                                key={friend.friend_id}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                                style={{ backgroundColor: avatarService.getAvatarColor(friend.friend_id) }}
                                title={`${friend.display_name || friend.username}${friend.rating ? ` - ${friend.rating}/5 stars` : ''}`}
                              >
                                {avatarService.getInitials(friend.display_name || friend.username)}
                              </div>
                            )
                          ))}
                          {realFriendsWhoPlayed.length > 4 && (
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform">
                              +{realFriendsWhoPlayed.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">None</span>
                      )}
                    </div>
                    {realFriendsWhoPlayed.length > 0 && (
                      <button 
                        onClick={() => setShowFriendsWhoPlayedModal(true)}
                        className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                      >
                        View all
                      </button>
                    )}
                  </div>
                  
                  {/* Game Sheet Link */}
                  <div className="mt-2">
                    <button
                      onClick={() => setShowGameSheet(true)}
                      className="text-purple-400 hover:text-purple-300 text-sm transition-colors flex items-center space-x-1"
                    >
                      <FileText size={14} />
                      <span>Customize this board game sheet</span>
                    </button>
                  </div>

                  {/* Tabs: Overview / Videos/Photos */}
                  <div className="mt-6 mb-4">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                          activeTab === 'overview'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Overview
                      </button>
                      <button 
                        onClick={() => setActiveTab('media')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                          activeTab === 'media'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Videos/Photos
                      </button>
                    </div>
                  </div>
                  
                  {/* Tab Content */}
                  {activeTab === 'overview' && (
                    <>
                      {/* Rate this game section - Always visible */}
                      <div className="mt-4">
                        <div className="text-gray-400 text-sm mb-1">Rate this game</div>
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => handleRatingClick(star)}
                              className="transition-all duration-200 hover:scale-110"
                            >
                              <Star
                                size={18}
                                className={`${
                                  star <= (hoverRating || userRating)
                                    ? 'text-purple-400 fill-purple-400 drop-shadow-sm'
                                    : 'text-gray-600 hover:text-gray-500'
                                } transition-colors`}
                              />
                            </button>
                          ))}
                          {userRating > 0 && (
                            <span className="text-gray-400 text-sm ml-2">{userRating}/5</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'media' && (
                    <div className="mt-4 space-y-6">
                      <div className="text-center text-gray-400 py-8">
                        Videos and photos coming soon...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Main Content - BookDetailModalV3 Style */}
          {activeTab === 'overview' && (
            <div className="px-6 py-4 relative" style={{ zIndex: 1 }}>

            {/* Review section (shown when user rates the game) */}
            {showReviewBox && userRating > 0 && (
              <div className="mb-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Share your thoughts</h3>
                
                {/* Review Text Area */}
                <div className="space-y-3">
                  <textarea
                    value={userReview}
                    onChange={(e) => setUserReview(e.target.value)}
                    placeholder="Write your review... (optional)"
                    className="w-full bg-black/20 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    rows={3}
                  />
                  
                  {/* Action Buttons */}
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
                      
                      <div className="flex items-center space-x-2">
                        {!userReview.trim() && (
                          <button
                            onClick={handleSkipReview}
                            className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-md hover:bg-gray-600 transition-colors"
                          >
                            Skip
                          </button>
                        )}
                        {userReview.trim() && (
                          <button
                            onClick={handleSubmitReview}
                            className={`px-3 py-1 text-white text-xs font-medium rounded-md transition-all duration-200 ${
                              reviewSaved 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                            }`}
                          >
                            {reviewSaved ? 'Saved!' : 'Save Review'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Your Review - Style Instagram (shown if user has rating but review box is closed) */}
            {userRating > 0 && !showReviewBox && (
              <div className="mb-6 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                {/* Header: Title + Privacy + Edit */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-white font-semibold text-base">Your review</h3>
                    <span className="text-gray-400 text-xs">({reviewPrivacy})</span>
                  </div>
                  <button
                    onClick={() => setShowReviewBox(true)}
                    className="text-white text-xs font-medium hover:text-gray-300 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                
                {/* Fine ligne blanche */}
                <div className="border-t border-white/10 mb-4"></div>
                
                {/* Review content */}
                <div className="py-2">
                  {/* Avatar + You + Rating */}
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                      U
                    </div>
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-white font-medium text-sm">You</span>
                      {/* Rating en mauve */}
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= userRating
                                ? 'text-purple-400 fill-current'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Review text */}
                  {userReview && (
                    <div className="mb-3 ml-11">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {expandedUserReview 
                          ? userReview 
                          : truncateToOneLine(userReview)
                        }
                        {userReview.length > 60 && (
                          <button
                            onClick={() => setExpandedUserReview(!expandedUserReview)}
                            className="text-purple-400 hover:text-purple-300 ml-1 text-xs"
                          >
                            {expandedUserReview ? 'less' : 'more'}
                          </button>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {/* Actions Instagram style avec compteurs */}
                  <div className="ml-11">
                    <div className="flex items-center space-x-4">
                      {/* Like - Heart outline avec compteur */}
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={handleLikeUserReview}
                          className={`transition-colors ${userReviewData.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-300'}`}
                        >
                          {userReviewData.isLiked ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                          )}
                        </button>
                        {userReviewData.likesCount > 0 && (
                          <span className="text-gray-300 text-xs">{userReviewData.likesCount}</span>
                        )}
                      </div>
                      
                      {/* Comment - Chat bubble avec compteur */}
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={handleCommentUserReview}
                          className="text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                        {userReviewData.commentsCount > 0 && (
                          <span className="text-gray-300 text-xs">{userReviewData.commentsCount}</span>
                        )}
                      </div>
                      
                      {/* Share - Send arrow */}
                      <button 
                        onClick={handleShareUserReview}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M22 2L11 13"/>
                          <path d="M22 2L15 22L11 13L2 9L22 2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
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
                    {cleanDescription(gameDetail.description)}
                  </div>
                  {cleanDescription(gameDetail.description).length > 300 && (
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
      
      {/* Friends Modal removed - no popup when selecting played status */}
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
              <h3 className="text-xl font-semibold text-white mb-2">Board Game Sheet</h3>
              <p className="text-gray-400 text-sm">Track your board gaming experience</p>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Friends Played With</label>
                  <button
                    onClick={() => {
                      loadUserFriends()
                      setShowFriendsSelector(true)
                    }}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-colors"
                  >
                    Add Friends
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {gameSheetData.friendsPlayed.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                      </div>
                      <button 
                        onClick={() => setGameSheetData(prev => ({ 
                          ...prev, 
                          friendsPlayed: prev.friendsPlayed.filter(f => f.id !== friend.id) 
                        }))} 
                        className="text-red-400 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {gameSheetData.friendsPlayed.length === 0 && (
                    <p className="text-gray-500 text-sm">No friends selected</p>
                  )}
                </div>
                
                {/* Friends Selector Modal */}
                {showFriendsSelector && (
                  <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
                    <div className="bg-[#1A1A1A] rounded-lg border border-purple-500/30 max-w-sm w-full max-h-96 overflow-hidden">
                      <div className="p-4 border-b border-purple-500/30">
                        <h4 className="text-lg font-semibold text-white">Select Friends</h4>
                      </div>
                      <div className="p-4 max-h-64 overflow-y-auto">
                        {loadingFriends ? (
                          <p className="text-gray-400 text-center">Loading friends...</p>
                        ) : userFriends.length > 0 ? (
                          <div className="space-y-2">
                            {userFriends.map((friend) => {
                              const isAlreadySelected = gameSheetData.friendsPlayed.some(f => f.id === friend.id)
                              return (
                                <button
                                  key={friend.id}
                                  onClick={() => addFriendToGame(friend)}
                                  disabled={isAlreadySelected}
                                  className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-colors ${
                                    isAlreadySelected 
                                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                      : 'bg-black/20 hover:bg-black/40 text-white'
                                  }`}
                                >
                                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm">
                                    {friend.name.charAt(0)}
                                  </div>
                                  <span className="text-sm">{friend.name}</span>
                                  {isAlreadySelected && <span className="text-xs ml-auto">✓ Added</span>}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-center">No friends found</p>
                        )}
                      </div>
                      <div className="p-4 border-t border-purple-500/30">
                        <button
                          onClick={() => setShowFriendsSelector(false)}
                          className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                Save Board Game Sheet
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
              {realFriendsWhoPlayed.map((friend) => (
                <div key={friend.friend_id} className="bg-black/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt={friend.display_name || friend.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: avatarService.getAvatarColor(friend.friend_id) }}
                        >
                          {avatarService.getInitials(friend.display_name || friend.username)}
                        </div>
                      )}
                      <span className="text-white font-medium">{friend.display_name || friend.username}</span>
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

      {/* Comments Modal - Style Instagram */}
      {showUserReviewComments && (
        <div className="fixed inset-0 z-60 bg-black/50">
          {/* Overlay cliquable pour fermer */}
          <div 
            className="absolute inset-0" 
            onClick={() => setShowUserReviewComments(false)}
          />
          
          {/* Modal sliding from bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center p-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold text-center">Comments</h3>
            </div>
            
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {userReviewData.comments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">No comments yet</div>
                  <div className="text-gray-500 text-xs mt-1">Be the first to comment</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userReviewData.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                        {comment.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl px-3 py-2">
                          <div className="text-white text-sm font-medium">{comment.username}</div>
                          <div className="text-gray-300 text-sm">{comment.text}</div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 ml-3">
                          <span className="text-gray-500 text-xs">{formatTimeAgo(comment.timestamp)}</span>
                          <button className="text-gray-500 text-xs font-medium">Like</button>
                          <button className="text-gray-500 text-xs font-medium">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Comment input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                  U
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What do you think?"
                    className="w-full bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                  />
                  {newComment.trim() && (
                    <button
                      onClick={handleSubmitComment}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-medium"
                    >
                      Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Media Tab Content */}
        {activeTab === 'media' && (
          <div className="px-6 py-4 relative" style={{ zIndex: 1 }}>
            <div className="space-y-6">
              <div className="text-center text-gray-400 py-16">
                <div className="text-lg mb-2">Videos and photos coming soon...</div>
                <div className="text-sm">This section will showcase gameplay videos, unboxing videos, and component photos.</div>
              </div>
            </div>
          </div>
        )}

      {/* Share Modal */}
      {showShareModal && gameDetail && (
        <ShareWithFriendsModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          item={{
            id: gameId,
            type: 'boardgames',
            title: gameDetail.name,
            image: gameDetail.image
          }}
        />
      )}

      {/* Status Selection Popup */}
      {showStatusPopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-sm border border-purple-500/30">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">Add to Library</h3>
              <p className="text-gray-400 text-sm">Choose your board game status</p>
            </div>

            {/* Status Options */}
            <div className="space-y-3">
              {(['want-to-play', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  className={`w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                    selectedStatus === status
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-gray-600 hover:border-purple-400 bg-gray-800/50 text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="font-medium">{getStatusLabel(status)}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedStatus === status
                      ? 'border-purple-400 bg-purple-500'
                      : 'border-gray-500'
                  }`}>
                    {selectedStatus === status && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                </button>
              ))}

              {/* Remove from Library option - only show if already in library */}
              {selectedStatus && (
                <>
                  <div className="border-t border-gray-600 my-4"></div>
                  <button
                    onClick={handleRemoveFromLibrary}
                    className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all duration-200 flex items-center justify-between"
                  >
                    <span className="font-medium">Remove from Library</span>
                    <div className="w-6 h-6 rounded-full border-2 border-red-400 flex items-center justify-center">
                      {/* Empty circle for remove option */}
                    </div>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
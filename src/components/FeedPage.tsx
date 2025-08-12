'use client'
import React, { useState, useEffect } from 'react'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Star, 
  Clock, 
  Users, 
  BookOpen, 
  Film, 
  Music, 
  Gamepad2,
  Plus,
  TrendingUp,
  Book,
  Calendar,
  User,
  Bell,
  Search,
  LogOut,
  Settings,
  ChevronDown
} from 'lucide-react'
import { AuthModal } from './AuthModal'
import { AuthService, type AuthUser } from '@/services/authService'
import { socialService, type Activity, type Friend } from '@/services/socialService'
import { avatarService } from '@/services/avatarService'
import type { LibraryItem } from '@/types'
import FriendSearchModal from './FriendSearchModal'
import FriendRequestsModal from './FriendRequestsModal'
import NotificationBell from './NotificationBell'

interface FeedPageProps {
  library?: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
}


export default function FeedPage({
  library = [],
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail
}: FeedPageProps) {
  const [feedActivities, setFeedActivities] = useState<Activity[]>([])
  const [recentLibraryItems, setRecentLibraryItems] = useState<LibraryItem[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [isLoadingFeed, setIsLoadingFeed] = useState(true)
  const [sharedMedia, setSharedMedia] = useState<any[]>([])
  const [isLoadingShared, setIsLoadingShared] = useState(true)
  
  // Auth state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  
  // Social modals
  const [showFriendSearchModal, setShowFriendSearchModal] = useState(false)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)

  useEffect(() => {
    console.log('📚 [FeedPage] Loading library data...')
    console.log('📚 [FeedPage] Total library items:', library.length)
    console.log('📚 [FeedPage] Library items by category:', {
      games: library.filter(item => item.category === 'games').length,
      movies: library.filter(item => item.category === 'movies').length,
      books: library.filter(item => item.category === 'books').length,
      music: library.filter(item => item.category === 'music').length
    })
    
    // Simuler les derniers items ajoutés à la bibliothèque
    const recent = library
      .sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime())
      .slice(0, 5)
    
    // Debug images des livres
    console.log('📚 [FeedPage] Recent library items:', recent.map(item => ({
      title: item.title,
      category: item.category,
      image: item.image,
      hasImage: !!item.image
    })))
    
    // 📚 DEBUGGING SPÉCIFIQUE POUR LES LIVRES
    const bookItems = recent.filter(item => item.category === 'books')
    console.log('📚 [FeedPage] Book items specifically:', bookItems.map(book => ({
      title: book.title,
      image: book.image,
      imageType: typeof book.image,
      imageLength: book.image?.length,
      isValidUrl: book.image?.startsWith('http'),
      fullItem: book
    })))
    
    if (bookItems.length === 0) {
      console.log('📚 [FeedPage] ❌ NO BOOKS FOUND in recent library items')
    } else {
      console.log(`📚 [FeedPage] ✅ Found ${bookItems.length} books in library`)
    }
    
    setRecentLibraryItems(recent)
  }, [library])

  // Load social data when user is authenticated
  useEffect(() => {
    if (currentUser) {
      loadSocialData()
    }
  }, [currentUser])

  // Listen for media detail events from notifications
  useEffect(() => {
    const handleOpenMediaDetail = (event: any) => {
      const { type, id } = event.detail
      
      switch (type) {
        case 'games':
          onOpenGameDetail?.(id)
          break
        case 'movies':
          onOpenMovieDetail?.(id)
          break
        case 'books':
          onOpenBookDetail?.(id)
          break
        case 'music':
          onOpenMusicDetail?.(id)
          break
        default:
          console.log('Unknown media type:', type)
      }
    }

    window.addEventListener('openMediaDetail', handleOpenMediaDetail)
    
    return () => {
      window.removeEventListener('openMediaDetail', handleOpenMediaDetail)
    }
  }, [onOpenGameDetail, onOpenMovieDetail, onOpenBookDetail, onOpenMusicDetail])

  const ensureUserProfile = async (user: AuthUser) => {
    try {
      const existingProfile = await socialService.getUserProfile(user.id)
      const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
      const displayName = user.name || username
      
      if (!existingProfile) {
        // Créer un profil utilisateur automatiquement
        await socialService.createOrUpdateProfile(user.id, {
          username,
          display_name: displayName,
          avatar_url: user.avatar,
          is_public: true
        })
      } else {
        // Mettre à jour l'avatar existant si on a un nouveau de Google
        if (user.avatar && existingProfile.avatar_url !== user.avatar) {
          console.log('🔄 [Avatar] Updating existing profile avatar:', user.avatar)
          await socialService.createOrUpdateProfile(user.id, {
            ...existingProfile,
            avatar_url: user.avatar
          })
        }
      }
      
      // Toujours sauvegarder/mettre à jour l'avatar Google dans user_avatars
      if (user.avatar) {
        console.log('🔄 [Avatar] Saving Google avatar to user_avatars:', user.avatar)
        await avatarService.updateUserAvatar(user.id, user.avatar)
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  const loadSocialData = async () => {
    setIsLoadingFeed(true)
    setIsLoadingShared(true)
    try {
      // Load friends
      const friendsList = await socialService.getFriends()
      setFriends(friendsList)

      // Load friend activities
      const activities = await socialService.getFriendActivities(20)
      setFeedActivities(activities)

      // Load shared media
      const shared = await socialService.getSharedMedia()
      setSharedMedia(shared)

      // Load pending friend requests count
      const requests = await socialService.getPendingFriendRequests()
      setPendingRequestsCount(requests.length)
    } catch (error) {
      console.error('Error loading social data:', error)
    } finally {
      setIsLoadingFeed(false)
      setIsLoadingShared(false)
    }
  }

  const handleLikeActivity = async (activityId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await socialService.unlikeActivity(activityId)
      } else {
        await socialService.likeActivity(activityId)
      }
      
      // Update local state
      setFeedActivities(prev => prev.map(activity => {
        if (activity.id === activityId) {
          return {
            ...activity,
            user_liked: !isLiked,
            likes_count: (activity.likes_count || 0) + (isLiked ? -1 : 1)
          }
        }
        return activity
      }))
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  // Auth effects
  useEffect(() => {
    // Charger l'utilisateur actuel
    const loadUser = async () => {
      const user = await AuthService.getCurrentUser()
      setCurrentUser(user)
      if (user) {
        const avatar = await avatarService.getAvatarUrl(user.id)
        setUserAvatar(avatar)
      }
    }
    loadUser()

    // Écouter les changements d'authentification
    const { data: { subscription } } = AuthService.onAuthStateChange(async (user) => {
      setCurrentUser(user)
      if (user) {
        setIsAuthModalOpen(false)
        // Créer ou vérifier le profil utilisateur
        await ensureUserProfile(user)
        const avatar = await avatarService.getAvatarUrl(user.id)
        setUserAvatar(avatar)
      } else {
        setUserAvatar(null)
      }
    })

    // Fermer le menu utilisateur si on clique ailleurs
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = event.target as Element
        if (!target.closest('.user-menu')) {
          setIsUserMenuOpen(false)
        }
      }
    }

    // Listen for avatar updates
    const handleAvatarUpdate = (event: any) => {
      const { userId, avatarUrl } = event.detail
      if (currentUser && currentUser.id === userId) {
        setUserAvatar(avatarUrl)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('avatarUpdated', handleAvatarUpdate)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('avatarUpdated', handleAvatarUpdate)
    }
  }, [isUserMenuOpen])

  const handleSignOut = async () => {
    const { error } = await AuthService.signOut()
    if (!error) {
      setCurrentUser(null)
      setIsUserMenuOpen(false)
      // Optionnel: recharger la page pour vider les données
      window.location.reload()
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'games': return <Gamepad2 size={16} className="text-green-600" />
      case 'movies': return <Film size={16} className="text-blue-600" />
      case 'books': return <BookOpen size={16} className="text-orange-600" />
      case 'music': return <Music size={16} className="text-purple-600" />
      default: return <Star size={16} className="text-gray-600" />
    }
  }

  const getActivityDescription = (activity: Activity): string => {
    switch (activity.activity_type) {
      case 'library_add': return 'added to library'
      case 'status_update': 
        const status = activity.metadata?.status
        if (status === 'completed') return 'completed'
        if (status === 'currently-playing' || status === 'currently-watching' || status === 'currently-reading') return 'started'
        return 'updated status for'
      case 'review': return 'reviewed'
      case 'rating': return 'rated'
      case 'achievement': return activity.metadata?.achievement_text || 'unlocked an achievement'
      default: return 'updated'
    }
  }

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const handleItemClick = (item: any, category: string) => {
    const itemId = item.id || '1'
    
    switch (category) {
      case 'games':
        onOpenGameDetail?.(itemId)
        break
      case 'movies':
        onOpenMovieDetail?.(itemId)
        break
      case 'books':
        onOpenBookDetail?.(itemId)
        break
      case 'music':
        onOpenMusicDetail?.(itemId)
        break
    }
  }

  const handleSharedItemClick = (sharedItem: any) => {
    const itemId = sharedItem.item_id || '1'
    
    switch (sharedItem.item_type) {
      case 'games':
        onOpenGameDetail?.(itemId)
        break
      case 'movies':
        onOpenMovieDetail?.(itemId)
        break
      case 'books':
        onOpenBookDetail?.(itemId)
        break
      case 'music':
        onOpenMusicDetail?.(itemId)
        break
    }
  }


  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
            
            {/* Barre de recherche et notifications */}
            <div className="flex items-center space-x-3">
              {/* Barre de recherche */}
              <div className="hidden sm:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search games, movies, music, books..."
                    className="pl-10 pr-4 py-2 w-64 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    onClick={() => window.dispatchEvent(new CustomEvent('openGlobalSearch'))}
                    readOnly
                  />
                </div>
              </div>
              
              {/* Version mobile de la recherche */}
              <button 
                className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => window.dispatchEvent(new CustomEvent('openGlobalSearch'))}
              >
                <Search size={20} className="text-gray-600" />
              </button>
              
              {/* Icône notifications */}
              {currentUser && <NotificationBell />}

              {/* Authentification */}
              <div className="relative user-menu">
                {currentUser ? (
                  // Utilisateur connecté
                  <div className="flex items-center">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div 
                        className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.dispatchEvent(new CustomEvent('navigateToProfile'))
                          setIsUserMenuOpen(false)
                        }}
                      >
                        {userAvatar ? (
                          <img 
                            src={userAvatar} 
                            alt={currentUser.name || 'User'} 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {currentUser.name?.charAt(0)?.toUpperCase() || '👤'}
                          </span>
                        )}
                      </div>
                      <ChevronDown size={16} className="text-gray-500 hidden sm:block" />
                    </button>

                    {/* Menu utilisateur */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="font-medium text-gray-900">{currentUser.name}</p>
                          <p className="text-sm text-gray-500">{currentUser.email}</p>
                        </div>
                        
                        <button
                          onClick={() => setShowFriendSearchModal(true)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <Search size={16} />
                          Find Friends
                        </button>

                        <button
                          onClick={() => setShowFriendRequestsModal(true)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 w-full relative"
                        >
                          <Users size={16} />
                          Friend Requests
                          {pendingRequestsCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </button>

                        <button className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 w-full">
                          <Settings size={16} />
                          Settings
                        </button>

                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Utilisateur non connecté
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <User size={16} />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Recent Library Additions */}
        {recentLibraryItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Plus className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Recently Added to Your Library</h2>
                <Book className="text-purple-600 ml-2" size={20} />
              </div>
            </div>
            <div className="p-4">
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {recentLibraryItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => handleItemClick(item, item.category)}
                  >
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 hover:shadow-md transition-shadow">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('📚 [FeedPage] Image failed to load for:', item.title, item.image)
                            console.log('📚 [FeedPage] Failed image details:', {
                              itemCategory: item.category,
                              imageUrl: item.image,
                              imageLength: item.image?.length,
                              startsWithHttp: item.image?.startsWith('http'),
                              errorEvent: e
                            })
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 ${item.image ? 'hidden' : ''}`}>
                        {item.category === 'books' && <BookOpen size={20} />}
                        {item.category === 'games' && <Gamepad2 size={20} />}
                        {item.category === 'movies' && <Film size={20} />}
                        {item.category === 'music' && <Music size={20} />}
                        <span className="text-xs mt-1 text-center px-1">No Image</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 text-center max-w-16 truncate">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recently Recommended - Horizontal scroll */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Share2 className="text-green-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Recently Recommended</h2>
              </div>
            </div>
            <div className="p-4">
              {(() => {
                // 🔧 FIX: Utiliser feedActivities au lieu de sharedMedia (même source que la section qui fonctionne)
                const recommendedItems = feedActivities
                  .filter(activity => 
                    activity.activity_type === 'library_add' && 
                    activity.user?.id !== currentUser?.id &&
                    activity.item_image &&
                    activity.item_title
                  )
                  .slice(0, 8) // Show max 8 items
                
                return recommendedItems.length > 0 ? (
                  <div className="flex space-x-4 overflow-x-auto pb-2">
                    {recommendedItems.map((activity) => {
                      // 📚 DEBUG POUR LES LIVRES RECOMMANDÉS (utilise maintenant feedActivities)
                      if (activity.item_type === 'books') {
                        console.log('📚 [Recently Recommended - Fixed] Book activity:', {
                          title: activity.item_title,
                          image: activity.item_image,
                          imageType: typeof activity.item_image,
                          imageLength: activity.item_image?.length,
                          isValidUrl: activity.item_image?.startsWith('http'),
                          fullActivity: activity
                        })
                      }
                      
                      return (
                      <div 
                        key={activity.id}
                        className="flex-shrink-0 cursor-pointer group"
                        onClick={() => handleItemClick({ id: activity.item_id }, activity.item_type)}
                      >
                        <div className="w-20 relative">
                          {/* Media Cover */}
                          <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 hover:shadow-md transition-shadow mx-auto">
                            {activity.item_image ? (
                              <img
                                src={activity.item_image}
                                alt={activity.item_title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.log('📚 [Recently Recommended - Fixed] Image failed for:', activity.item_title, activity.item_image)
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  // Don't try to render React components as HTML strings
                                  const fallback = target.nextElementSibling as HTMLElement
                                  if (fallback) {
                                    fallback.style.display = 'flex'
                                  }
                                }}
                              />
                            ) : null}
                            
                            {/* Fallback icon - hidden initially if image exists, shown on error or if no image */}
                            <div 
                              className="w-full h-full flex items-center justify-center bg-gray-200"
                              style={{ display: activity.item_image ? 'none' : 'flex' }}
                            >
                              {getCategoryIcon(activity.item_type)}
                            </div>
                          </div>
                          
                          {/* Friend Avatar Badge */}
                          <div className="absolute top-0 right-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            {activity.user?.avatar_url ? (
                              <img
                                src={activity.user.avatar_url}
                                alt={activity.user.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={12} className="text-green-600" />
                            )}
                          </div>
                          
                          {/* Title and Friend Name */}
                          <div className="mt-2 text-center">
                            <p className="text-xs text-gray-900 font-medium truncate px-1">
                              {activity.item_title}
                            </p>
                            <p className="text-xs text-gray-500 truncate px-1">
                              by {activity.user?.display_name || 'Friend'}
                            </p>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Share2 size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No recommendations yet</p>
                    <p className="text-gray-400 text-xs">Ask friends to share content with you!</p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Friends Recently Added These Titles */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Users className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Friends recently added these titles to their library</h2>
              </div>
            </div>
            <div className="p-4">
              {/* Filter activities to show only library additions from friends */}
              {(() => {
                const recentAdditions = feedActivities
                  .filter(activity => 
                    activity.activity_type === 'library_add' && 
                    activity.user?.id !== currentUser?.id &&
                    activity.item_image &&
                    activity.item_title
                  )
                  .slice(0, 8) // Show max 8 items

                return recentAdditions.length > 0 ? (
                  <div className="flex space-x-4 overflow-x-auto pb-2">
                    {recentAdditions.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex-shrink-0 cursor-pointer group"
                        onClick={() => handleItemClick({ id: activity.item_id }, activity.item_type)}
                      >
                        <div className="w-20 relative">
                          {/* Media Cover */}
                          <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 hover:shadow-md transition-shadow mx-auto">
                            {activity.item_image ? (
                              <img
                                src={activity.item_image}
                                alt={activity.item_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                {getCategoryIcon(activity.item_type)}
                              </div>
                            )}
                          </div>
                          
                          {/* Friend Avatar Badge */}
                          <div className="absolute top-0 right-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            {activity.user?.avatar_url ? (
                              <img
                                src={activity.user.avatar_url}
                                alt={activity.user.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={12} className="text-blue-600" />
                            )}
                          </div>
                          
                          {/* Title and Friend Name */}
                          <div className="mt-2 text-center">
                            <p className="text-xs text-gray-900 font-medium truncate px-1">
                              {activity.item_title}
                            </p>
                            <p className="text-xs text-gray-500 truncate px-1">
                              by {activity.user?.display_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No recent additions from friends</p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Friends Rated These Titles */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Star className="text-yellow-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Friends rated these titles</h2>
              </div>
            </div>
            <div className="p-4">
              {/* Filter activities to show only ratings from friends */}
              {(() => {
                const recentRatings = feedActivities
                  .filter(activity => 
                    activity.activity_type === 'rating' && 
                    activity.user?.id !== currentUser?.id &&
                    activity.item_image &&
                    activity.item_title &&
                    activity.metadata?.rating
                  )
                  .slice(0, 8) // Show max 8 items

                return recentRatings.length > 0 ? (
                  <div className="flex space-x-4 overflow-x-auto pb-2">
                    {recentRatings.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex-shrink-0 cursor-pointer group"
                        onClick={() => handleItemClick({ id: activity.item_id }, activity.item_type)}
                      >
                        <div className="w-20 relative">
                          {/* Media Cover */}
                          <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 hover:shadow-md transition-shadow mx-auto">
                            {activity.item_image ? (
                              <img
                                src={activity.item_image}
                                alt={activity.item_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                {getCategoryIcon(activity.item_type)}
                              </div>
                            )}
                          </div>
                          
                          {/* Friend Avatar Badge */}
                          <div className="absolute top-0 right-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            {activity.user?.avatar_url ? (
                              <img
                                src={activity.user.avatar_url}
                                alt={activity.user.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={12} className="text-yellow-600" />
                            )}
                          </div>
                          
                          {/* Title, Friend Name and Rating */}
                          <div className="mt-2 text-center">
                            <p className="text-xs text-gray-900 font-medium truncate px-1">
                              {activity.item_title}
                            </p>
                            <p className="text-xs text-gray-500 truncate px-1">
                              by {activity.user?.display_name}
                            </p>
                            <div className="flex items-center justify-center mt-1">
                              <Star size={10} className="text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-700 ml-1">{activity.metadata?.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No recent ratings from friends</p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <MessageCircle className="text-purple-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">Recent reviews</h2>
              </div>
            </div>
            <div className="p-4">
              {/* Filter activities to show only reviews from friends */}
              {(() => {
                const recentReviews = feedActivities
                  .filter(activity => 
                    activity.activity_type === 'review' && 
                    activity.user?.id !== currentUser?.id &&
                    activity.item_image &&
                    activity.item_title &&
                    activity.metadata?.review_text &&
                    activity.metadata?.rating
                  )
                  .slice(0, 6) // Show max 6 reviews

                return recentReviews.length > 0 ? (
                  <div className="flex space-x-4 overflow-x-auto pb-2">
                    {recentReviews.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex-shrink-0 cursor-pointer group w-64"
                        onClick={() => handleItemClick({ id: activity.item_id }, activity.item_type)}
                      >
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start space-x-3">
                            {/* Media Cover */}
                            <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 relative">
                              {activity.item_image ? (
                                <img
                                  src={activity.item_image}
                                  alt={activity.item_title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  {getCategoryIcon(activity.item_type)}
                                </div>
                              )}
                              {/* Friend Avatar Badge */}
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                {activity.user?.avatar_url ? (
                                  <img
                                    src={activity.user.avatar_url}
                                    alt={activity.user.display_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User size={12} className="text-purple-600" />
                                )}
                              </div>
                            </div>
                            
                            {/* Review Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {activity.item_title}
                              </h4>
                              <div className="flex items-center space-x-1 mt-1 mb-2">
                                <Star size={12} className="text-yellow-400 fill-current" />
                                <span className="text-xs text-gray-700">{activity.metadata?.rating}</span>
                                <span className="text-xs text-gray-500">• by {activity.user?.display_name}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-3">
                                {activity.metadata?.review_text}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No recent reviews from friends</p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* My Recent Activities */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">My recent activities</h2>
                </div>
                <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  See more
                </button>
              </div>
            </div>
            <div className="p-4">
              {/* Show the user's most recent activity */}
              {(() => {
                const myRecentActivity = feedActivities
                  .filter(activity => activity.user?.id === currentUser?.id)
                  .slice(0, 1)[0] // Get only the most recent activity

                return myRecentActivity ? (
                  <div className="flex items-start space-x-3">
                    {/* User Avatar */}
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-100">
                      {currentUser?.avatar_url ? (
                        <img
                          src={currentUser.avatar_url}
                          alt={currentUser.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-indigo-600" />
                      )}
                    </div>
                    
                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900">{currentUser?.display_name}</span>
                        <span className="text-sm text-gray-500">@{currentUser?.username}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">{getTimeAgo(new Date(myRecentActivity.created_at))}</span>
                      </div>

                      {/* Activity Description */}
                      <div className="flex items-center space-x-2 mb-3">
                        {getCategoryIcon(myRecentActivity.item_type)}
                        <span className="text-gray-700">
                          {getActivityDescription(myRecentActivity)}
                          <span className="font-medium"> "{myRecentActivity.item_title}"</span>
                        </span>
                      </div>

                      {/* Item Card */}
                      {myRecentActivity.item_title && (
                        <div 
                          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleItemClick({ id: myRecentActivity.item_id }, myRecentActivity.item_type)}
                        >
                          <div className="w-12 h-16 bg-gray-200 rounded-lg overflow-hidden">
                            {myRecentActivity.item_image ? (
                              <img
                                src={myRecentActivity.item_image}
                                alt={myRecentActivity.item_title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {getCategoryIcon(myRecentActivity.item_type)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900">{myRecentActivity.item_title}</h4>
                            <p className="text-sm text-gray-500">
                              {myRecentActivity.item_type} • {myRecentActivity.metadata?.year || new Date(myRecentActivity.created_at).getFullYear()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">No recent activities</p>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* My Night Planned */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="text-pink-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">My night planned</h2>
                </div>
                <button className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                  Create event
                </button>
              </div>
            </div>
            <div className="p-4">
              {/* Mock data for planned events - replace with real social events data */}
              {(() => {
                const plannedEvents = [
                  {
                    id: '1',
                    type: 'movie_night',
                    title: 'Horror Movie Marathon',
                    date: '2024-08-05',
                    time: '20:00',
                    participants: [
                      { name: 'Alex', avatar: '/api/placeholder/24/24' },
                      { name: 'Sarah', avatar: '/api/placeholder/24/24' },
                      { name: 'Mike', avatar: '/api/placeholder/24/24' }
                    ],
                    movies: [
                      { title: 'The Conjuring', image: '/api/placeholder/40/60' },
                      { title: 'Hereditary', image: '/api/placeholder/40/60' },
                      { title: 'Midsommar', image: '/api/placeholder/40/60' }
                    ]
                  },
                  {
                    id: '2',
                    type: 'music_night',
                    title: 'Indie Rock Session',
                    date: '2024-08-07',
                    time: '19:30',
                    participants: [
                      { name: 'Emma', avatar: '/api/placeholder/24/24' },
                      { name: 'Jake', avatar: '/api/placeholder/24/24' }
                    ],
                    albums: [
                      { title: 'In Rainbows', artist: 'Radiohead', image: '/api/placeholder/40/40' },
                      { title: 'Funeral', artist: 'Arcade Fire', image: '/api/placeholder/40/40' }
                    ]
                  }
                ]

                return plannedEvents.length > 0 ? (
                  <div className="space-y-4">
                    {plannedEvents.map((event) => (
                      <div key={event.id} className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {event.type === 'movie_night' ? <Film size={16} className="text-pink-600" /> : <Music size={16} className="text-pink-600" />}
                              {event.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {event.time}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <div className="flex -space-x-2 mr-3">
                              {event.participants.slice(0, 3).map((participant, index) => (
                                <div key={index} className="w-8 h-8 rounded-full overflow-hidden border-2 border-white bg-gray-200">
                                  <img
                                    src={participant.avatar}
                                    alt={participant.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {event.participants.length > 3 && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                  <span className="text-xs text-gray-600">+{event.participants.length - 3}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Media Preview */}
                        {event.type === 'movie_night' && event.movies && (
                          <div className="flex space-x-2 overflow-x-auto pb-2">
                            {event.movies.map((movie, index) => (
                              <div key={index} className="flex-shrink-0">
                                <div className="w-10 h-14 rounded-lg overflow-hidden bg-gray-200">
                                  <img
                                    src={movie.image}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-xs text-gray-600 mt-1 text-center truncate w-10">
                                  {movie.title}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {event.type === 'music_night' && event.albums && (
                          <div className="flex space-x-3 overflow-x-auto pb-2">
                            {event.albums.map((album, index) => (
                              <div key={index} className="flex-shrink-0 flex items-center space-x-2">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                                  <img
                                    src={album.image}
                                    alt={album.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">{album.title}</p>
                                  <p className="text-xs text-gray-600 truncate">{album.artist}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-pink-200">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Users size={14} />
                            <span>{event.participants.length} participants</span>
                          </div>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 text-xs bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition-colors">
                              View details
                            </button>
                            <button className="px-3 py-1 text-xs bg-white text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                              Join
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">No events planned</h3>
                    <p className="text-gray-500 text-sm mb-4">Create a movie night or music session with friends</p>
                    <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm">
                      Create your first event
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Social Feed - HIDDEN for now since activities are now organized in specific sections above */}
        {false && currentUser ? (
          isLoadingFeed ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-3">Loading feed...</p>
            </div>
          ) : feedActivities.length > 0 ? (
            <div className="space-y-4">
              {feedActivities.map((activity) => {
                const metadata = activity.metadata || {}
                const activityDescription = getActivityDescription(activity)
                
                return (
                  <div key={activity.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Activity Header */}
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        {/* User Avatar */}
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-100">
                          {activity.user?.avatar_url ? (
                            <img
                              src={activity.user.avatar_url}
                              alt={activity.user.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={20} className="text-blue-600" />
                          )}
                        </div>
                        
                        {/* Activity Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-semibold text-gray-900">{activity.user?.display_name}</span>
                            <span className="text-sm text-gray-500">@{activity.user?.username}</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-500">{getTimeAgo(new Date(activity.created_at))}</span>
                          </div>

                          {/* Activity Description */}
                          <div className="flex items-center space-x-2 mb-3">
                            {getCategoryIcon(activity.item_type)}
                            <span className="text-gray-700">
                              {activityDescription}
                              <span className="font-medium"> "{activity.item_title}"</span>
                            </span>
                          </div>

                          {/* Item Card */}
                          {activity.item_title && activity.activity_type !== 'achievement' && (
                            <div 
                              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleItemClick({ id: activity.item_id }, activity.item_type)}
                            >
                              {activity.item_image && (
                                <img
                                  src={activity.item_image}
                                  alt={activity.item_title}
                                  className="w-12 h-16 rounded-lg object-cover bg-gray-200"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{activity.item_title}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  {getCategoryIcon(activity.item_type)}
                                  <span className="text-sm text-gray-500 capitalize">{activity.item_type}</span>
                                  {metadata.rating && (
                                    <div className="flex items-center space-x-1">
                                      <Star size={12} className="text-yellow-400 fill-current" />
                                      <span className="text-sm text-gray-600">{metadata.rating}/5</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Review Content */}
                          {activity.activity_type === 'review' && metadata.review_text && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="flex items-center space-x-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={14}
                                    className={`${
                                      star <= (metadata.rating || 0)
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="text-sm text-gray-600 ml-1">
                                  {metadata.rating}/5
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm italic">"{metadata.review_text}"</p>
                            </div>
                          )}

                          {/* Achievement Badge */}
                          {activity.activity_type === 'achievement' && (
                            <div className="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                              <div className="flex items-center space-x-2">
                                <TrendingUp className="text-yellow-600" size={20} />
                                <span className="font-medium text-yellow-800">Achievement Unlocked!</span>
                              </div>
                              <p className="text-yellow-700 mt-1">{metadata.achievement_text}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-6">
                          <button 
                            onClick={() => handleLikeActivity(activity.id, activity.user_liked || false)}
                            className={`flex items-center space-x-2 transition-colors ${
                              activity.user_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart size={18} className={activity.user_liked ? 'fill-current' : ''} />
                            <span className="text-sm">{activity.likes_count || 0}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                            <MessageCircle size={18} />
                            <span className="text-sm">{activity.comments_count || 0}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                            <Share2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-500 mb-4">Add friends to see their activity in your feed!</p>
              <button
                onClick={() => setShowFriendSearchModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Find Friends
              </button>
            </div>
          )
        ) : (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-purple-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to see your friends' activity</h3>
            <p className="text-gray-600 mb-4">
              Connect with friends, share reviews, and discover new content together.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Modal d'authentification */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false)
          // L'utilisateur sera mis à jour via onAuthStateChange
        }}
      />

      {/* Friend Search Modal */}
      <FriendSearchModal
        isOpen={showFriendSearchModal}
        onClose={() => setShowFriendSearchModal(false)}
        onOpenProfile={(userId) => {
          window.dispatchEvent(new CustomEvent('openUserProfile', { detail: { userId } }))
        }}
      />

      {/* Friend Requests Modal */}
      <FriendRequestsModal
        isOpen={showFriendRequestsModal}
        onClose={() => setShowFriendRequestsModal(false)}
        onRequestHandled={() => {
          // Reload social data to update counts
          loadSocialData()
        }}
      />
    </div>
  )
}
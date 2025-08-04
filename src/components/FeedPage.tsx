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
  
  // Auth state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  
  // Social modals
  const [showFriendSearchModal, setShowFriendSearchModal] = useState(false)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)

  useEffect(() => {
    // Simuler les derniers items ajoutés à la bibliothèque
    const recent = library
      .sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime())
      .slice(0, 5)
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
      if (!existingProfile) {
        // Créer un profil utilisateur automatiquement
        const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
        const displayName = user.name || username
        
        await socialService.createOrUpdateProfile(user.id, {
          username,
          display_name: displayName,
          avatar_url: user.avatar,
          is_public: true
        })
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  const loadSocialData = async () => {
    setIsLoadingFeed(true)
    try {
      // Load friends
      const friendsList = await socialService.getFriends()
      setFriends(friendsList)

      // Load friend activities
      const activities = await socialService.getFriendActivities(20)
      setFeedActivities(activities)

      // Load pending friend requests count
      const requests = await socialService.getPendingFriendRequests()
      setPendingRequestsCount(requests.length)
    } catch (error) {
      console.error('Error loading social data:', error)
    } finally {
      setIsLoadingFeed(false)
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
    }
    loadUser()

    // Écouter les changements d'authentification
    const { data: { subscription } } = AuthService.onAuthStateChange(async (user) => {
      setCurrentUser(user)
      if (user) {
        setIsAuthModalOpen(false)
        // Créer ou vérifier le profil utilisateur
        await ensureUserProfile(user)
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

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
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
    const itemId = item.id?.toString() || '1'
    
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
                    placeholder="Search feed..."
                    className="pl-10 pr-4 py-2 w-64 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              
              {/* Version mobile de la recherche */}
              <button className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
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
                        className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.dispatchEvent(new CustomEvent('navigateToProfile'))
                          setIsUserMenuOpen(false)
                        }}
                      >
                        {currentUser.avatar ? (
                          <img 
                            src={currentUser.avatar} 
                            alt={currentUser.name || 'User'} 
                            className="w-8 h-8 rounded-full"
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
                          Rechercher des amis
                        </button>

                        <button
                          onClick={() => setShowFriendRequestsModal(true)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 w-full relative"
                        >
                          <Users size={16} />
                          Demandes d'amis
                          {pendingRequestsCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </button>

                        <button className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 w-full">
                          <Settings size={16} />
                          Paramètres
                        </button>

                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut size={16} />
                          Se déconnecter
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
                    <span className="hidden sm:inline">Se connecter</span>
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
                      <img
                        src={item.image || ''}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
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

        {/* Social Feed */}
        {currentUser ? (
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
                        {activity.user?.avatar_url ? (
                          <img
                            src={activity.user.avatar_url}
                            alt={activity.user.display_name}
                            className="w-10 h-10 rounded-full border-2 border-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={20} className="text-blue-600" />
                          </div>
                        )}
                        
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
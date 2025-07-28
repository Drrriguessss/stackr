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
  Search
} from 'lucide-react'
import type { LibraryItem } from '@/types'

interface FeedPageProps {
  library?: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
}

interface FeedActivity {
  id: string
  type: 'library_add' | 'friend_activity' | 'review' | 'achievement'
  timestamp: Date
  user: {
    name: string
    avatar: string
    username: string
  }
  content: {
    action: string
    item?: {
      title: string
      category: string
      image: string
      rating?: number
    }
    review?: {
      text: string
      rating: number
    }
  }
}

export default function FeedPage({
  library = [],
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail
}: FeedPageProps) {
  const [feedActivities, setFeedActivities] = useState<FeedActivity[]>([])
  const [recentLibraryItems, setRecentLibraryItems] = useState<LibraryItem[]>([])

  useEffect(() => {
    // Simuler les derniers items ajoutés à la bibliothèque
    const recent = library
      .sort((a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime())
      .slice(0, 5)
    setRecentLibraryItems(recent)

    // Générer des activités de feed factices
    generateMockFeedActivities()
  }, [library])

  const generateMockFeedActivities = () => {
    const mockActivities: FeedActivity[] = [
      {
        id: '1',
        type: 'friend_activity',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
        user: {
          name: 'Alex Martin',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          username: '@alexm'
        },
        content: {
          action: 'completed',
          item: {
            title: 'The Legend of Zelda: Tears of the Kingdom',
            category: 'games',
            image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5s4k.webp',
            rating: 5
          }
        }
      },
      {
        id: '2',
        type: 'review',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4h ago
        user: {
          name: 'Sarah Chen',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
          username: '@sarahc'
        },
        content: {
          action: 'reviewed',
          item: {
            title: 'Oppenheimer',
            category: 'movies',
            image: 'https://m.media-amazon.com/images/M/MV5BMDBkYzU0MjUtYzBhNi00ODk0LWFkMDgtNjBmZGM2YTNhZmJjXkEyXkFqcGc@._V1_SX300.jpg'
          },
          review: {
            text: 'Absolutely stunning cinematography and performances. Nolan at his finest!',
            rating: 5
          }
        }
      },
      {
        id: '3',
        type: 'friend_activity',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6h ago
        user: {
          name: 'Marcus Johnson',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
          username: '@marcusj'
        },
        content: {
          action: 'started reading',
          item: {
            title: 'Fourth Wing',
            category: 'books',
            image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1689087207i/61431922.jpg',
            rating: 4
          }
        }
      },
      {
        id: '4',
        type: 'achievement',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8h ago
        user: {
          name: 'Emma Wilson',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
          username: '@emmaw'
        },
        content: {
          action: 'reached 100 completed games milestone! 🎮',
          item: {
            title: '',
            category: 'achievement',
            image: ''
          }
        }
      },
      {
        id: '5',
        type: 'friend_activity',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12h ago
        user: {
          name: 'David Kim',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
          username: '@davidk'
        },
        content: {
          action: 'loved',
          item: {
            title: 'Harry\'s House',
            category: 'music',
            image: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Harry_Styles_-_Harry%27s_House.png',
            rating: 5
          }
        }
      }
    ]

    setFeedActivities(mockActivities)
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'games': return <Gamepad2 size={16} className="text-green-600" />
      case 'movies': return <Film size={16} className="text-blue-600" />
      case 'books': return <BookOpen size={16} className="text-orange-600" />
      case 'music': return <Music size={16} className="text-purple-600" />
      default: return <Star size={16} className="text-gray-600" />
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
              <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Bell size={20} className="text-gray-600" />
                {/* Badge de notification */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </button>
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
        <div className="space-y-4">
          {feedActivities.map((activity) => (
            <div key={activity.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Activity Header */}
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {/* User Avatar */}
                  <img
                    src={activity.user.avatar}
                    alt={activity.user.name}
                    className="w-10 h-10 rounded-full border-2 border-gray-100"
                  />
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">{activity.user.name}</span>
                      <span className="text-sm text-gray-500">{activity.user.username}</span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500">{getTimeAgo(activity.timestamp)}</span>
                    </div>

                    {/* Activity Description */}
                    <div className="flex items-center space-x-2 mb-3">
                      {activity.content.item?.category && getCategoryIcon(activity.content.item.category)}
                      <span className="text-gray-700">
                        {activity.content.action}
                        {activity.content.item?.title && (
                          <span className="font-medium"> "{activity.content.item.title}"</span>
                        )}
                      </span>
                    </div>

                    {/* Item Card (if applicable) */}
                    {activity.content.item?.title && activity.type !== 'achievement' && (
                      <div 
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleItemClick(activity.content.item, activity.content.item?.category || '')}
                      >
                        <img
                          src={activity.content.item.image}
                          alt={activity.content.item.title}
                          className="w-12 h-16 rounded-lg object-cover bg-gray-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{activity.content.item.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getCategoryIcon(activity.content.item.category)}
                            <span className="text-sm text-gray-500 capitalize">{activity.content.item.category}</span>
                            {activity.content.item.rating && (
                              <div className="flex items-center space-x-1">
                                <Star size={12} className="text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600">{activity.content.item.rating}/5</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Review Content */}
                    {activity.content.review && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center space-x-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={`${
                                star <= activity.content.review!.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-1">
                            {activity.content.review.rating}/5
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm italic">"{activity.content.review.text}"</p>
                      </div>
                    )}

                    {/* Achievement Badge */}
                    {activity.type === 'achievement' && (
                      <div className="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="text-yellow-600" size={20} />
                          <span className="font-medium text-yellow-800">Achievement Unlocked!</span>
                        </div>
                        <p className="text-yellow-700 mt-1">{activity.content.action}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-6">
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors">
                      <Heart size={18} />
                      <span className="text-sm">{Math.floor(Math.random() * 20) + 5}</span>
                    </button>
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                      <MessageCircle size={18} />
                      <span className="text-sm">{Math.floor(Math.random() * 10) + 1}</span>
                    </button>
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-purple-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Social Features Coming Soon!</h3>
          <p className="text-gray-600 mb-4">
            Connect with friends, share reviews, and discover new content together. 
            User profiles and friend system are in development.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-purple-600">
            <div className="flex items-center space-x-1">
              <User size={16} />
              <span>User Profiles</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users size={16} />
              <span>Friend System</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle size={16} />
              <span>Real Reviews</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
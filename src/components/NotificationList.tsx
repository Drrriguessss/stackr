'use client'

import { useState, useEffect } from 'react'
import { X, Check, CheckCheck, Bell } from 'lucide-react'
import { type Notification } from '@/services/notificationService'
import { supabase } from '@/lib/supabase'

interface NotificationListProps {
  notifications: Notification[]
  onClose: () => void
  onNotificationRead: (notificationId: string) => void
  onMarkAllRead: () => void
  onNotificationClick?: (notification: Notification) => void
}

export default function NotificationList({ 
  notifications, 
  onClose, 
  onNotificationRead, 
  onMarkAllRead,
  onNotificationClick 
}: NotificationListProps) {
  const [friendAvatars, setFriendAvatars] = useState<Record<string, string>>({})

  // Load friend avatars when notifications change
  useEffect(() => {
    const loadFriendAvatars = async () => {
      const friendIds = notifications
        .filter(n => n.from_user_id && (n.type === 'recommendation' || n.type === 'media_shared'))
        .map(n => n.from_user_id!)
        .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, avatar_url')
          .in('id', friendIds)

        if (profiles) {
          const avatarMap: Record<string, string> = {}
          profiles.forEach(profile => {
            if (profile.avatar_url) {
              avatarMap[profile.id] = profile.avatar_url
            }
          })
          setFriendAvatars(avatarMap)
        }
      }
    }

    loadFriendAvatars()
  }, [notifications])
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'A few seconds ago'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-US')
  }

  const formatCompactTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return `${Math.floor(diffInSeconds / 86400)}d`
  }

  const getNotificationIcon = (type: string, mediaType?: string) => {
    if (type === 'recommendation' || type === 'media_shared') {
      // Déterminer l'icône selon le type de média
      switch (mediaType?.toLowerCase()) {
        case 'games':
          return '🎮'
        case 'movies':
          return '🎬'
        case 'books':
          return '📚'
        case 'music':
          return '🎵'
        default:
          return '🎬' // Fallback
      }
    }
    
    switch (type) {
      case 'friend_request':
        return '👥'
      case 'friend_accepted':
        return '✅'
      case 'activity_like':
        return '❤️'
      case 'activity_comment':
        return '💬'
      default:
        return '🔔'
    }
  }

  const getFriendProfileImage = (notification: Notification): string | null => {
    // First, try to get from dynamically loaded friend avatars
    if (notification.from_user_id && friendAvatars[notification.from_user_id]) {
      return friendAvatars[notification.from_user_id]
    }

    // Fallback: try to get friend profile image from data field (new notifications)
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data
        if (data.friendProfileImage) {
          return data.friendProfileImage
        }
      } catch (e) {
        console.log('🔔 [NotificationList] Error parsing friend profile data:', e)
      }
    }
    
    // Return null if no friend profile image is available
    return null
  }

  const getFriendName = (notification: Notification): string | null => {
    // Try to get friend name from data field first
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data
        if (data.recommenderName) {
          return data.recommenderName
        }
      } catch (e) {
        console.log('🔔 [NotificationList] Error parsing friend name data:', e)
      }
    }
    
    // Fallback: extract name from message
    const match = notification.message.match(/^([^\\s]+)\\s+recommends/)
    return match ? match[1] : null
  }
  
  const getMediaType = (notification: Notification): string | null => {
    // Try to get media type from data field first
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data
        if (data.mediaType) return data.mediaType
      } catch (e) {
        // Fall through to message parsing
      }
    }
    
    // Fallback to message parsing (old format)
    if (notification.message && notification.message.includes('(') && notification.message.includes(':')) {
      const match = notification.message.match(/\(([^:]+):/);
      if (match) return match[1]
    }
    
    return null
  }

  const getDisplayMessage = (notification: Notification): string => {
    // Clean up the message by removing image URL if present
    let message = notification.message.split('|')[0]
    const originalMessage = message
    
    // More aggressive cleaning for technical IDs
    // Remove patterns like (books:zAsEQAAQBAJ), (movies:tt0133093), (games:12345), etc.
    message = message.replace(/\s*\([^)]*:[^)]*\)\s*/g, '')
    
    // Also remove any remaining parentheses with just IDs (fallback)
    message = message.replace(/\s*\([a-zA-Z0-9_-]+\)\s*/g, '')
    
    // Clean up extra spaces that might remain
    message = message.replace(/\s+/g, ' ')
    
    // Debug log for problematic notifications
    if (originalMessage !== message.trim()) {
      console.log('🧹 [NotificationList] Cleaned message:', {
        original: originalMessage,
        cleaned: message.trim(),
        notificationId: notification.id
      })
    }
    
    return message.trim()
  }

  const getMediaImage = (notification: Notification): string | null => {
    // Try to get image from data field first (new format)
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data
        if (data.mediaImage) {
          return data.mediaImage
        }
      } catch (e) {
        console.log('🔔 [NotificationList] Error parsing media image data:', e)
      }
    }
    
    // Fallback to message parsing (old format)
    if (notification.message && notification.message.includes('|')) {
      const imageUrl = notification.message.split('|')[1]
      return imageUrl
    }
    
    return null
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0e17] rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                title="Mark all as read"
              >
                <CheckCheck size={16} />
                <span>Mark all read</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell size={48} className="text-gray-500 mb-4" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-800 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-gray-800 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => onNotificationClick?.(notification)}
                >
                  {/* New Layout: Friend Avatar Left | Text Center (3 lines max) | Media Image + Time Right */}
                  {(notification.type === 'recommendation' || notification.type === 'media_shared') ? (
                    <div className="flex items-start space-x-3 h-16"> {/* Fixed height for 3 text lines */}
                      {/* Left: Friend Profile Image */}
                      <div className="flex-shrink-0">
                        {(() => {
                          const friendProfileImage = getFriendProfileImage(notification)
                          const friendName = getFriendName(notification)
                          
                          if (friendProfileImage) {
                            return (
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700">
                                <img 
                                  src={friendProfileImage} 
                                  alt={friendName || 'Friend'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-600 text-white font-semibold text-sm">${friendName ? friendName.charAt(0).toUpperCase() : '👤'}</div>`
                                  }}
                                />
                              </div>
                            )
                          } else {
                            return (
                              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {friendName ? friendName.charAt(0).toUpperCase() : '👤'}
                                </span>
                              </div>
                            )
                          }
                        })()}
                      </div>

                      {/* Center: Text (max 3 lines with ellipsis) */}
                      <div className="flex-1 min-w-0 h-16 flex flex-col justify-center">
                        <p className={`text-sm leading-tight overflow-hidden ${
                          !notification.read ? 'text-gray-200' : 'text-gray-400'
                        }`}
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {getDisplayMessage(notification)}
                        </p>
                      </div>

                      {/* Right: Media Image + Compact Time */}
                      <div className="flex-shrink-0 flex flex-col items-center space-y-1">
                        {(() => {
                          const mediaImage = getMediaImage(notification)
                          const mediaType = getMediaType(notification)
                          
                          if (mediaImage) {
                            return (
                              <>
                                <div className="w-12 h-10 rounded overflow-hidden bg-gray-700">
                                  <img 
                                    src={mediaImage} 
                                    alt="Media"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-lg">${getNotificationIcon(notification.type, mediaType)}</div>`
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatCompactTime(notification.created_at)}
                                </span>
                              </>
                            )
                          } else {
                            return (
                              <>
                                <div className="w-12 h-10 flex items-center justify-center text-lg">
                                  {getNotificationIcon(notification.type, mediaType)}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatCompactTime(notification.created_at)}
                                </span>
                              </>
                            )
                          }
                        })()}
                        
                        {/* Mark as read button */}
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onNotificationRead(notification.id)
                            }}
                            className="text-blue-400 hover:text-blue-300 mt-1"
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Fallback layout for other notification types */
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm ${
                              !notification.read ? 'text-gray-200' : 'text-gray-400'
                            }`}>
                              {getDisplayMessage(notification)}
                            </p>
                            
                            <p className="text-xs text-gray-500 mt-2">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                          
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onNotificationRead(notification.id)
                              }}
                              className="text-blue-400 hover:text-blue-300 ml-2 flex-shrink-0"
                              title="Mark as read"
                            >
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
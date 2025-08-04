'use client'

import { X, Check, CheckCheck, Bell } from 'lucide-react'
import { type Notification } from '@/services/notificationService'

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
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Il y a quelques secondes'
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)}j`
    
    return date.toLocaleDateString('fr-FR')
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
      case 'media_shared':
        return '🎬'
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

  const getMediaImage = (notification: Notification): string | null => {
    // Try to get image from data field first (new format)
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data
        if (data.mediaImage) return data.mediaImage
      } catch (e) {
        // Fall through to message parsing
      }
    }
    
    // Fallback to message parsing (old format)
    if (notification.message && notification.message.includes('|')) {
      return notification.message.split('|')[1]
    }
    
    return null
  }

  const getDisplayMessage = (notification: Notification): string => {
    // Clean up the message by removing image URL if present
    return notification.message.split('|')[0]
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
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
                title="Marquer tout comme lu"
              >
                <CheckCheck size={16} />
                <span>Tout lire</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell size={48} className="text-gray-300 mb-4" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => onNotificationClick?.(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Media thumbnail or icon */}
                    {((notification.type === 'recommendation' || notification.type === 'media_shared') && getMediaImage(notification)) ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img 
                          src={getMediaImage(notification)} 
                          alt="Media"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl">${getNotificationIcon(notification.type)}</div>`
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onNotificationRead(notification.id)
                            }}
                            className="text-blue-600 hover:text-blue-700 ml-2"
                            title="Marquer comme lu"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                      
                      <p className={`text-sm mt-1 ${
                        !notification.read ? 'text-gray-800' : 'text-gray-600'
                      }`}>
                        {getDisplayMessage(notification)}
                      </p>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
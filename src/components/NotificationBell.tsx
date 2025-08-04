'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { notificationService, type Notification } from '@/services/notificationService'
import { AuthService } from '@/services/authService'
import { supabase } from '@/lib/supabase'
import NotificationList from './NotificationList'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadNotifications()
      loadUnreadCount()
      
      // Set up real-time subscription for notifications
      const channel = supabase
        .channel(`notifications:${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUser.id}`
          },
          (payload) => {
            console.log('🔔 [NotificationBell] New notification received:', payload)
            loadUnreadCount()
            loadNotifications()
          }
        )
        .on('broadcast', { event: 'notification' }, (payload) => {
          console.log('🔔 [NotificationBell] Broadcast notification received:', payload)
          loadUnreadCount()
          loadNotifications()
        })
        .subscribe()
      
      // Fallback polling every 2 minutes for reliability
      const interval = setInterval(() => {
        loadUnreadCount()
      }, 120000)

      return () => {
        channel.unsubscribe()
        clearInterval(interval)
      }
    }
  }, [currentUser])

  const loadUser = async () => {
    const user = await AuthService.getCurrentUser()
    setCurrentUser(user)
  }

  const loadNotifications = async () => {
    if (!currentUser) return
    
    const notifications = await notificationService.getNotifications(currentUser.id)
    setNotifications(notifications)
  }

  const loadUnreadCount = async () => {
    if (!currentUser) return
    
    const count = await notificationService.getUnreadCount(currentUser.id)
    setUnreadCount(count)
  }

  const handleBellClick = () => {
    setShowNotifications(true)
    if (unreadCount > 0) {
      loadNotifications() // Refresh notifications when opening
    }
  }

  const handleNotificationRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId)
    loadUnreadCount() // Refresh count
    loadNotifications() // Refresh list
  }

  const handleMarkAllRead = async () => {
    if (!currentUser) return
    
    await notificationService.markAllAsRead(currentUser.id)
    setUnreadCount(0)
    loadNotifications()
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      handleNotificationRead(notification.id)
    }

    // Handle different notification types
    if (notification.type === 'recommendation' || notification.type === 'media_shared') {
      let mediaType, mediaId
      
      // Try to parse from data field first (new format)
      if (notification.data) {
        try {
          const data = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data
          mediaType = data.mediaType
          mediaId = data.mediaId
        } catch (e) {
          console.log('Failed to parse notification data, falling back to message parsing')
        }
      }
      
      // Fallback to message parsing (old format)
      if (!mediaType || !mediaId) {
        const messageMatch = notification.message.match(/\((\w+):([^)|]+)/)
        if (messageMatch) {
          [, mediaType, mediaId] = messageMatch
        }
      }
      
      if (mediaType && mediaId) {
        // Create a mock event to trigger the appropriate detail modal
        const mockEvent = new CustomEvent('openMediaDetail', {
          detail: {
            type: mediaType,
            id: mediaId
          }
        })
        
        // Close notification modal first
        setShowNotifications(false)
        
        // Dispatch the event after a small delay to ensure modal is closed
        setTimeout(() => {
          window.dispatchEvent(mockEvent)
        }, 100)
      }
    }
  }

  if (!currentUser) return null

  return (
    <>
      <button
        onClick={handleBellClick}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-red-500 animate-pulse" : "text-gray-600"} />
        
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </div>
        )}
      </button>

      {showNotifications && (
        <NotificationList
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onNotificationRead={handleNotificationRead}
          onMarkAllRead={handleMarkAllRead}
          onNotificationClick={handleNotificationClick}
        />
      )}
    </>
  )
}
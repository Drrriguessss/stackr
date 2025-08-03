'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { notificationService, type Notification } from '@/services/notificationService'
import { AuthService } from '@/services/authService'
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
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount()
      }, 30000)

      return () => clearInterval(interval)
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

  if (!currentUser) return null

  return (
    <>
      <button
        onClick={handleBellClick}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-blue-600" : "text-gray-600"} />
        
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
        />
      )}
    </>
  )
}
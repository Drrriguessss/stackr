'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { pushNotificationService } from '@/services/pushNotificationService'
import { AuthService } from '@/services/authService'
import NotificationSettings from './NotificationSettings'

export default function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    initializeNotifications()
    setupServiceWorkerListener()
  }, [])

  const initializeNotifications = async () => {
    try {
      console.log('🔔 [PushNotificationManager] Initializing notifications...')
      const user = await AuthService.getCurrentUser()
      if (!user) {
        console.log('🔔 [PushNotificationManager] No user found')
        return
      }

      console.log('🔔 [PushNotificationManager] User found:', user.id)
      setCurrentUser(user)

      // Check if push notifications are supported
      const isSupported = pushNotificationService.isSupported()
      console.log('🔔 [PushNotificationManager] Push notifications supported:', isSupported)

      if (isSupported) {
        // Check if already subscribed
        const subscribed = await pushNotificationService.isSubscribed(user.id)
        console.log('🔔 [PushNotificationManager] User subscribed:', subscribed)
        setIsSubscribed(subscribed)

        // Show prompt after delay if not subscribed
        if (!subscribed) {
          setTimeout(() => {
            const permission = Notification.permission
            console.log('🔔 [PushNotificationManager] Notification permission:', permission)
            if (permission === 'default') {
              setShowPrompt(true)
            }
          }, 5000) // Show after 5 seconds
        }
      } else {
        console.log('🔔 [PushNotificationManager] Push notifications not supported - likely missing VAPID keys')
      }
    } catch (error) {
      console.error('🔔 [PushNotificationManager] Error initializing notifications:', error)
    }
  }

  const setupServiceWorkerListener = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICK') {
          // Handle notification click - navigate to specific content
          const { data, url } = event.data
          if (url && url !== '/') {
            window.location.href = url
          }
        }
      })
    }
  }

  const handleQuickSubscribe = async () => {
    if (!currentUser) return

    try {
      const success = await pushNotificationService.subscribe(currentUser.id)
      if (success) {
        setIsSubscribed(true)
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
    }
  }

  const handleDismissPrompt = () => {
    setShowPrompt(false)
    localStorage.setItem('notification-prompt-dismissed', 'true')
  }

  // Don't show prompt if user already dismissed it
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-prompt-dismissed')
    if (dismissed) {
      setShowPrompt(false)
    }
  }, [])

  return (
    <>
      {/* Notification Bell Icon */}
      <button
        onClick={() => {
          console.log('🔔 [PushNotificationManager] Bell icon clicked')
          setShowSettings(true)
        }}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Paramètres de notification"
      >
        {isSubscribed ? (
          <BellRing size={20} className="text-blue-600" />
        ) : (
          <Bell size={20} className="text-gray-600" />
        )}
        
        {isSubscribed && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></div>
        )}
      </button>

      {/* Quick Subscribe Prompt */}
      {showPrompt && !isSubscribed && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-40 animate-slide-up">
          <div className="flex items-start space-x-3">
            <BellRing size={20} className="text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">Restez informé !</h3>
              <p className="text-xs text-gray-600 mt-1">
                Recevez des notifications quand vos amis vous recommandent des médias.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleQuickSubscribe}
              className="flex-1 bg-blue-600 text-white text-xs py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Activer
            </button>
            <button
              onClick={handleDismissPrompt}
              className="text-xs text-gray-600 hover:text-gray-900 px-2"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <NotificationSettings onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}
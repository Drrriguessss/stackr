'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Settings, Clock, Users, Star, Zap, Check, X } from 'lucide-react'
import { pushNotificationService, type NotificationPreferences } from '@/services/pushNotificationService'
import { AuthService } from '@/services/authService'

interface NotificationSettingsProps {
  onClose: () => void
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadNotificationSettings()
  }, [])

  const loadNotificationSettings = async () => {
    try {
      setIsLoading(true)
      
      // Get current user
      const user = await AuthService.getCurrentUser()
      if (!user) return
      
      setCurrentUser(user)

      // Check subscription status
      const subscribed = await pushNotificationService.isSubscribed(user.id)
      setIsSubscribed(subscribed)

      // Load preferences
      const prefs = await pushNotificationService.getPreferences(user.id)
      setPreferences(prefs)

    } catch (error) {
      console.error('Error loading notification settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionToggle = async () => {
    if (!currentUser) return

    try {
      setIsUpdating(true)

      if (isSubscribed) {
        // Unsubscribe
        const success = await pushNotificationService.unsubscribe(currentUser.id)
        if (success) {
          setIsSubscribed(false)
        }
      } else {
        // Subscribe
        const success = await pushNotificationService.subscribe(currentUser.id)
        if (success) {
          setIsSubscribed(true)
        }
      }
    } catch (error) {
      console.error('Error toggling subscription:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!currentUser || !preferences) return

    try {
      const newPreferences = { ...preferences, [key]: value }
      setPreferences(newPreferences)

      await pushNotificationService.updatePreferences(currentUser.id, { [key]: value })
    } catch (error) {
      console.error('Error updating preferences:', error)
      // Revert on error
      setPreferences(preferences)
    }
  }

  const getPermissionStatus = () => {
    if (!pushNotificationService.isSupported()) {
      return { status: 'unsupported', message: 'Votre navigateur ne supporte pas les notifications push' }
    }

    const permission = Notification.permission
    switch (permission) {
      case 'granted':
        return { status: 'granted', message: 'Notifications autorisées' }
      case 'denied':
        return { status: 'denied', message: 'Notifications bloquées - Vous pouvez les réactiver dans les paramètres du navigateur' }
      default:
        return { status: 'default', message: 'Cliquez pour autoriser les notifications' }
    }
  }

  const permissionInfo = getPermissionStatus()

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell size={24} className="text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Push Notification Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isSubscribed ? (
                  <Bell size={20} className="text-green-600" />
                ) : (
                  <BellOff size={20} className="text-gray-400" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">Notifications Push</h3>
                  <p className="text-sm text-gray-600">{permissionInfo.message}</p>
                </div>
              </div>
              <button
                onClick={handleSubscriptionToggle}
                disabled={isUpdating || permissionInfo.status === 'unsupported'}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isSubscribed 
                    ? 'bg-blue-600' 
                    : 'bg-gray-200'
                } ${permissionInfo.status === 'unsupported' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSubscribed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Notification Types */}
          {isSubscribed && preferences && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Types de notifications</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <Users size={16} className="text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Recommandations d'amis</p>
                      <p className="text-sm text-gray-600">Quand un ami vous recommande un média</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('friend_recommendations', !preferences.friend_recommendations)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      preferences.friend_recommendations ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        preferences.friend_recommendations ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <Zap size={16} className="text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Activités d'amis</p>
                      <p className="text-sm text-gray-600">Nouvelles activités de vos amis</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('friend_activities', !preferences.friend_activities)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      preferences.friend_activities ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        preferences.friend_activities ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <Star size={16} className="text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Contenus tendance</p>
                      <p className="text-sm text-gray-600">Nouveaux médias populaires</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('trending_content', !preferences.trending_content)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      preferences.trending_content ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        preferences.trending_content ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <Clock size={16} className="text-orange-600" />
                    <div>
                      <p className="font-medium text-gray-900">Rappels</p>
                      <p className="text-sm text-gray-600">Pour terminer vos médias en cours</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('completion_reminders', !preferences.completion_reminders)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      preferences.completion_reminders ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        preferences.completion_reminders ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <Settings size={16} className="text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Nouvelles fonctionnalités</p>
                      <p className="text-sm text-gray-600">Mises à jour de l'application</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePreferenceChange('new_features', !preferences.new_features)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      preferences.new_features ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        preferences.new_features ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permission Help */}
          {permissionInfo.status === 'denied' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <BellOff size={16} className="text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Notifications bloquées</p>
                  <p className="text-yellow-700 mt-1">
                    Pour recevoir des notifications, allez dans les paramètres de votre navigateur et autorisez les notifications pour ce site.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            <Check size={16} />
            <span>Terminé</span>
          </button>
        </div>
      </div>
    </div>
  )
}
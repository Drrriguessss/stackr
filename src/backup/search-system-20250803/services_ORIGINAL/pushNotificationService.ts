import { supabase } from '@/lib/supabase'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPreferences {
  friend_recommendations: boolean
  friend_activities: boolean
  trending_content: boolean
  completion_reminders: boolean
  new_features: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
}

export interface NotificationData {
  type: 'friend_recommendation' | 'friend_activity' | 'trending_content' | 'completion_reminder' | 'new_feature'
  title: string
  body: string
  icon?: string
  image?: string
  badge?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

class PushNotificationService {
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

  // Check if push notifications are supported
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      !!this.vapidPublicKey // Check if VAPID key is configured
    )
  }

  // Check if user has granted permission
  async getPermissionStatus(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied'
    return Notification.permission
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied'
    
    const permission = await Notification.requestPermission()
    return permission
  }

  // Subscribe user to push notifications
  async subscribe(userId: string): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.warn('Push notifications not supported')
        return false
      }

      // Check permission
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.warn('Push notification permission denied')
        return false
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready
      if (!registration) {
        console.error('Service worker not ready')
        return false
      }

      // Create subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      })

      // Get device info
      const deviceInfo = this.getDeviceInfo()

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: navigator.userAgent,
          device_type: deviceInfo.type,
          browser: deviceInfo.browser,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        })

      if (error) {
        console.error('Error saving push subscription:', error)
        return false
      }

      console.log('Push notification subscription successful')
      return true

    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return false
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
      }

      // Mark subscription as inactive in database
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)

      if (error) {
        console.error('Error unsubscribing:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  // Get user's notification preferences
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching notification preferences:', error)
        return null
      }

      return data || this.getDefaultPreferences()
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      return null
    }
  }

  // Update user's notification preferences
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error updating notification preferences:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return false
    }
  }

  // Send notification to specific user (called from server-side)
  async sendNotificationToUser(
    targetUserId: string,
    notification: NotificationData,
    relatedUserId?: string,
    relatedMediaId?: string
  ): Promise<boolean> {
    try {
      // This would typically be called from a server-side function
      // For now, we'll create the API endpoint structure
      const response = await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          notification,
          relatedUserId,
          relatedMediaId
        })
      })

      return response.ok
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  // Trigger friend recommendation notification
  async notifyFriendRecommendation(
    friendId: string,
    recommenderName: string,
    mediaTitle: string,
    mediaType: string,
    mediaId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      type: 'friend_recommendation',
      title: `${recommenderName} vous recommande quelque chose !`,
      body: `Découvrez "${mediaTitle}" dans ${mediaType}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data: {
        type: 'friend_recommendation',
        mediaId,
        mediaType,
        recommenderName,
        url: `/?media=${mediaId}&type=${mediaType}`
      },
      actions: [
        {
          action: 'view',
          title: 'Voir',
          icon: '/icons/eye.png'
        },
        {
          action: 'dismiss',
          title: 'Plus tard',
          icon: '/icons/clock.png'
        }
      ]
    }

    return this.sendNotificationToUser(friendId, notification, undefined, mediaId)
  }

  // Trigger friend activity notification
  async notifyFriendActivity(
    friendId: string,
    actorName: string,
    action: string,
    mediaTitle: string,
    mediaType: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      type: 'friend_activity',
      title: `${actorName} a ${action}`,
      body: `"${mediaTitle}" dans ${mediaType}`,
      icon: '/icons/icon-192.png',
      data: {
        type: 'friend_activity',
        actorName,
        action,
        mediaTitle,
        mediaType
      }
    }

    return this.sendNotificationToUser(friendId, notification)
  }

  // Check if user is subscribed
  async isSubscribed(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)

      if (error) {
        console.error('Error checking subscription status:', error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      console.error('Error checking subscription status:', error)
      return false
    }
  }

  // Helper methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private getDeviceInfo(): { type: string; browser: string } {
    const userAgent = navigator.userAgent.toLowerCase()
    
    let type = 'desktop'
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      type = 'tablet'
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      type = 'mobile'
    }

    let browser = 'unknown'
    if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) {
      browser = 'chrome'
    } else if (/firefox/.test(userAgent)) {
      browser = 'firefox'
    } else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
      browser = 'safari'
    } else if (/edge/.test(userAgent)) {
      browser = 'edge'
    }

    return { type, browser }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      friend_recommendations: true,
      friend_activities: true,
      trending_content: true,
      completion_reminders: true,
      new_features: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
  }
}

export const pushNotificationService = new PushNotificationService()
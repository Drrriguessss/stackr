import { supabase } from '@/lib/supabase'

export interface Notification {
  id: string
  user_id: string
  type: 'friend_request' | 'friend_accepted' | 'activity_like' | 'activity_comment' | 'media_shared' | 'recommendation'
  title: string
  message: string
  data?: string | any
  read: boolean
  created_at: string
  from_user_id?: string
  related_id?: string
}

class NotificationService {
  // Get notifications for current user
  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error fetching unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  // Create a recommendation notification
  async createRecommendationNotification(
    recipientId: string,
    recommenderName: string,
    mediaTitle: string,
    mediaType: string,
    mediaId: string,
    mediaImage?: string,
    fromUserId?: string,
    friendProfileImage?: string
  ): Promise<boolean> {
    try {
      console.log('🔔 [NotificationService] Creating notification:', {
        recipientId: recipientId.slice(0, 8) + '...',
        recommenderName,
        mediaTitle,
        mediaType,
        mediaImage,
        hasMediaImage: !!mediaImage,
        mediaImageType: typeof mediaImage,
        fromUserId: fromUserId?.slice(0, 8) + '...',
        friendProfileImage,
        hasFriendProfileImage: !!friendProfileImage
      })

      // First, verify we can access the notifications table
      const { data: testAccess, error: accessError } = await supabase
        .from('notifications')
        .select('id')
        .limit(1)

      if (accessError) {
        console.error('🔔 [NotificationService] Cannot access notifications table:', accessError)
        return false
      }

      const notificationData = {
        user_id: recipientId,
        type: 'media_shared' as const,
        title: `${recommenderName} recommends "${mediaTitle}"`,
        message: `${recommenderName} recommends "${mediaTitle}"${mediaImage ? `|${mediaImage}` : ''}`,
        read: false,
        ...(fromUserId && { from_user_id: fromUserId }),
        related_id: mediaId,
        data: JSON.stringify({
          mediaType,
          mediaId,
          mediaTitle,
          mediaImage: mediaImage || null, // Ensure it's explicitly null if undefined
          recommenderName,
          friendProfileImage: friendProfileImage || null // Include friend's profile image
        })
      }

      console.log('🔔 [NotificationService] Attempting to insert:', {
        ...notificationData,
        user_id: notificationData.user_id.slice(0, 8) + '...',
        from_user_id: notificationData.from_user_id?.slice(0, 8) + '...'
      })

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()

      if (error) {
        console.error('🔔 [NotificationService] Error creating notification:', error)
        console.error('🔔 [NotificationService] Error code:', error.code)
        console.error('🔔 [NotificationService] Error details:', error.details)
        console.error('🔔 [NotificationService] Failed data:', {
          ...notificationData,
          user_id: notificationData.user_id.slice(0, 8) + '...',
          from_user_id: notificationData.from_user_id?.slice(0, 8) + '...'
        })
        return false
      }

      console.log('🔔 [NotificationService] Notification created successfully:', {
        id: data[0]?.id,
        created_at: data[0]?.created_at
      })
      
      // Try to send real-time notification via channel
      try {
        const channel = supabase.channel(`notifications:${recipientId}`)
        await channel.send({
          type: 'broadcast',
          event: 'notification',
          payload: data[0]
        })
        console.log('🔔 [NotificationService] Real-time notification sent')
      } catch (channelError) {
        console.log('🔔 [NotificationService] Real-time notification failed, but notification saved:', channelError)
      }
      
      return true
    } catch (error) {
      console.error('🔔 [NotificationService] Unexpected error creating notification:', error)
      return false
    }
  }
}

export const notificationService = new NotificationService()
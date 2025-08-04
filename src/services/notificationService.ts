'use client'

import { supabase } from '@/lib/supabase'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: string | any
  read: boolean
  created_at: string
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
    mediaImage?: string
  ): Promise<boolean> {
    try {
      console.log('🔔 [NotificationService] Creating notification:', {
        recipientId,
        recommenderName,
        mediaTitle,
        mediaType
      })

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'recommendation',
          title: 'Nouvelle recommandation',
          message: `${recommenderName} vous recommande "${mediaTitle}" (${mediaType}:${mediaId}${mediaImage ? `|${mediaImage}` : ''})`
        })
        .select()

      if (error) {
        console.error('🔔 [NotificationService] Error creating notification:', error)
        return false
      }

      console.log('🔔 [NotificationService] Notification created successfully:', data)
      return true
    } catch (error) {
      console.error('🔔 [NotificationService] Error creating notification:', error)
      return false
    }
  }
}

export const notificationService = new NotificationService()
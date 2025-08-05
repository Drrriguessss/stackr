import { supabase } from '@/lib/supabase'
import type { AuthUser } from './authService'
import { notificationService } from './notificationService'
import { avatarService } from './avatarService'

export interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
  updated_at: string
}

export interface Friend {
  friend_id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  friendship_date: string
}

export interface SearchUser {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  email?: string
  is_friend: boolean
  has_pending_request: boolean
  has_profile: boolean
}

export interface Activity {
  id: string
  user_id: string
  activity_type: 'library_add' | 'status_update' | 'review' | 'rating' | 'achievement'
  item_id: string
  item_type: 'games' | 'movies' | 'music' | 'books'
  item_title: string
  item_image?: string
  metadata: any
  visibility: 'public' | 'friends' | 'private'
  created_at: string
  // Joined data
  user?: UserProfile
  likes_count?: number
  comments_count?: number
  user_liked?: boolean
}

export interface ActivityComment {
  id: string
  activity_id: string
  user_id: string
  comment_text: string
  created_at: string
  user?: UserProfile
}

export interface Notification {
  id: string
  user_id: string
  type: 'friend_request' | 'friend_accepted' | 'activity_like' | 'activity_comment' | 'media_shared'
  from_user_id?: string
  related_id?: string
  message?: string
  read: boolean
  created_at: string
  from_user?: UserProfile
}

export interface MediaShare {
  id: string
  from_user_id: string
  to_user_id: string
  item_id: string
  item_type: 'games' | 'movies' | 'music' | 'books'
  item_title: string
  item_image?: string
  message?: string
  created_at: string
  from_user?: UserProfile
}

class SocialService {
  // User Profile Management
  async createOrUpdateProfile(userId: string, data: Partial<UserProfile>) {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        ...data,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
    return true
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    
    return data
  }

  async searchUsers(query: string): Promise<SearchUser[]> {
    const { data, error } = await supabase
      .rpc('search_users', { search_query: query })
    
    if (error) {
      console.error('Error searching users:', error)
      return []
    }
    
    return data || []
  }

  // Friend Management
  async sendFriendRequest(friendIdentifier: string): Promise<string | null> {
    // Check if it's an email (contains @) or username
    const isEmail = friendIdentifier.includes('@')
    
    try {
      if (isEmail) {
        const { data, error } = await supabase
          .rpc('send_friend_request_by_email', { friend_email: friendIdentifier })
        
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .rpc('send_friend_request', { friend_username: friendIdentifier })
        
        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
      throw error
    }
  }

  async acceptFriendRequest(requestId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('accept_friend_request', { request_id: requestId })
    
    if (error) {
      console.error('Error accepting friend request:', error)
      throw error
    }
    
    return data
  }

  async rejectFriendRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)
    
    if (error) {
      console.error('Error rejecting friend request:', error)
      throw error
    }
    
    return true
  }

  async getFriends(): Promise<Friend[]> {
    const { data, error } = await supabase
      .rpc('get_friends')
    
    if (error) {
      console.error('Error fetching friends:', error)
      return []
    }
    
    return data || []
  }

  async getPendingFriendRequests(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
    
    if (error) {
      console.error('Error fetching friend requests:', error)
      return []
    }
    
    return data || []
  }

  // Activity Feed
  async createActivity(activity: Omit<Activity, 'id' | 'created_at' | 'user'>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    console.log('🔍 [Debug] Creating activity for user:', user.id, 'Activity:', activity)

    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...activity,
        user_id: user.id
      })
      .select()
    
    if (error) {
      console.error('🔍 [Debug] Error creating activity:', error)
      throw error
    }
    
    console.log('🔍 [Debug] Activity created successfully:', data)
    return true
  }

  async getFriendActivities(limit: number = 20, offset: number = 0): Promise<Activity[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // First get list of friends
    const friends = await this.getFriends()
    const friendIds = friends.map(f => f.friend_id)
    
    // Include current user for their own activities
    friendIds.push(user.id)

    console.log('🔍 [Debug] Current user:', user.id)
    console.log('🔍 [Debug] Friends found:', friends.length, friends)
    console.log('🔍 [Debug] Friend IDs to search:', friendIds)

    if (friendIds.length === 1) {
      // Only current user, no friends yet
      console.log('🔍 [Debug] No friends found, returning empty array')
      return []
    }

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .in('user_id', friendIds)
      .in('visibility', ['public', 'friends'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    console.log('🔍 [Debug] Activities query result:', { data, error })
    
    if (error) {
      console.error('Error fetching activities:', error)
      return []
    }

    // Get all unique user IDs for batch avatar loading
    const activityUserIds = [...new Set((data || []).map(activity => activity.user_id))]
    const avatarMap = await avatarService.getBatchAvatars(activityUserIds)

    // Transform the data and get additional info for each activity
    const activities = await Promise.all((data || []).map(async (activity) => {
      // Get user profile separately
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', activity.user_id)
        .single()

      // Use optimized avatar
      const optimizedAvatar = avatarMap.get(activity.user_id)
      if (userProfile && optimizedAvatar) {
        userProfile.avatar_url = optimizedAvatar
      }

      // Get likes count
      const { count: likesCount } = await supabase
        .from('activity_likes')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id)

      // Get comments count  
      const { count: commentsCount } = await supabase
        .from('activity_comments')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id)

      // Check if current user liked this activity
      const { data: userLiked } = await supabase
        .from('activity_likes')
        .select('id')
        .eq('activity_id', activity.id)
        .eq('user_id', user.id)
        .limit(1)

      return {
        ...activity,
        user: userProfile,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        user_liked: !!(userLiked && userLiked.length > 0)
      }
    }))

    return activities
  }

  async likeActivity(activityId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('activity_likes')
      .insert({
        activity_id: activityId,
        user_id: user.id
      })
    
    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.error('Error liking activity:', error)
      throw error
    }
    
    return true
  }

  async unlikeActivity(activityId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('activity_likes')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error unliking activity:', error)
      throw error
    }
    
    return true
  }

  async commentOnActivity(activityId: string, commentText: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: activityId,
        user_id: user.id,
        comment_text: commentText
      })
    
    if (error) {
      console.error('Error commenting on activity:', error)
      throw error
    }
    
    return true
  }

  async getActivityComments(activityId: string): Promise<ActivityComment[]> {
    const { data, error } = await supabase
      .from('activity_comments')
      .select(`
        *,
        user_profiles!activity_comments_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching comments:', error)
      return []
    }

    return (data || []).map(comment => ({
      ...comment,
      user: comment.user_profiles
    }))
  }

  // Media Sharing
  async shareMediaWithFriend(
    toUserId: string,
    item: {
      id: string
      type: 'games' | 'movies' | 'music' | 'books'
      title: string
      image?: string
    },
    message?: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // First, save the media share to database
    const { error } = await supabase
      .from('media_shares')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        item_id: item.id,
        item_type: item.type,
        item_title: item.title,
        item_image: item.image,
        message
      })
    
    if (error) {
      console.error('Error sharing media:', error)
      throw error
    }

    // Get current user's profile for push notification
    const { data: fromUserProfile } = await supabase
      .from('user_profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    // Create in-app notification using our simple notification service
    const recommenderName = fromUserProfile?.display_name || fromUserProfile?.username || 'Un ami'
    
    console.log('🔔 Creating recommendation notification for:', {
      toUserId,
      recommenderName,
      itemTitle: item.title,
      itemType: item.type
    })
    
    // 🔍 DEBUG: Vérifier les données de l'item avant de créer la notification
    console.log('📤 [SocialService] Sharing item details:', {
      title: item.title,
      type: item.type,
      id: item.id,
      image: item.image,
      hasImage: !!item.image,
      imageType: typeof item.image,
      imageLength: item.image?.length,
      fullItem: item
    })
    
    const notificationCreated = await notificationService.createRecommendationNotification(
      toUserId,
      recommenderName,
      item.title,
      item.type,
      item.id,
      item.image,
      user.id
    )
    
    console.log('🔔 Notification created successfully:', notificationCreated)
    
    return true
  }

  async getSharedMedia(): Promise<MediaShare[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    console.log('🔍 [Debug] Fetching shared media for user:', user.id)

    // First, get the basic media shares
    const { data: shares, error: sharesError } = await supabase
      .from('media_shares')
      .select('*')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
    
    console.log('🔍 [Debug] Raw shares data:', shares?.map(share => ({
      id: share.id,
      from_user_id: share.from_user_id,
      to_user_id: share.to_user_id,
      current_user_matches_to: user.id === share.to_user_id,
      current_user_matches_from: user.id === share.from_user_id
    })))
    
    if (sharesError) {
      console.error('Error fetching shared media:', sharesError)
      return []
    }

    if (!shares || shares.length === 0) {
      console.log('🔍 [Debug] No shared media found')
      return []
    }

    console.log('🔍 [Debug] Found', shares.length, 'shared items')

    // Remove duplicates based on item_id and from_user_id
    const uniqueShares = shares.filter((share, index, arr) => 
      arr.findIndex(s => s.item_id === share.item_id && s.from_user_id === share.from_user_id) === index
    )

    console.log('🔍 [Debug] After removing duplicates:', uniqueShares.length, 'items')

    // Get user profiles and avatars for each unique share
    const userIds = [...new Set(uniqueShares.map(share => share.from_user_id))]
    
    console.log('🔍 [Debug] Getting profiles for userIds:', userIds)
    
    // Try to get user profiles with error handling for RLS issues
    let userProfiles: any[] = []
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)
      
      console.log('🔍 [Debug] User profiles query result:', { profiles, profilesError })
      
      if (!profilesError && profiles) {
        userProfiles = profiles
      }
    } catch (error) {
      console.log('🔍 [Debug] Failed to get user profiles, continuing with fallback:', error)
    }

    // Get optimized avatars using avatarService with better error handling
    let avatarMap = new Map<string, string>()
    try {
      avatarMap = await avatarService.getBatchAvatars(userIds)
      console.log('🔍 [Debug] Avatar map results:', Array.from(avatarMap.entries()))
    } catch (error) {
      console.log('🔍 [Debug] Failed to get batch avatars, trying individual avatar lookup:', error)
    }
    
    // For any missing avatars, try to get them individually
    for (const userId of userIds) {
      if (!avatarMap.has(userId) || !avatarMap.get(userId)) {
        try {
          console.log('🔍 [Debug] Trying individual avatar lookup for:', userId.slice(0, 8))
          const avatarUrl = await avatarService.getAvatarUrl(userId)
          if (avatarUrl) {
            avatarMap.set(userId, avatarUrl)
            console.log('🔍 [Debug] Found individual avatar:', avatarUrl)
          } else {
            // Create fallback only if no avatar found
            const profile = userProfiles?.find(p => p.id === userId)
            const displayName = profile?.display_name || profile?.username || 'Friend'
            const initials = displayName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
            const colors = ['3B82F6', '10B981', '8B5CF6', 'F59E0B', 'EF4444', '06B6D4', 'EC4899', '6366F1']
            const colorIndex = parseInt(userId.slice(-2), 16) % colors.length
            const color = colors[colorIndex]
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${initials}&background=${color}&color=fff&size=64`
            avatarMap.set(userId, fallbackAvatar)
            console.log('🔍 [Debug] Generated fallback avatar for', userId.slice(0, 8), ':', fallbackAvatar)
          }
        } catch (individualError) {
          console.log('🔍 [Debug] Individual avatar lookup failed for', userId.slice(0, 8), ':', individualError)
        }
      }
    }

    // Combine the data with proper avatars
    const result = uniqueShares.map(share => {
      const profile = userProfiles?.find(profile => profile.id === share.from_user_id)
      const avatarUrl = avatarMap.get(share.from_user_id) || profile?.avatar_url
      
      // Create fallback profile if none found (due to RLS restrictions)
      const finalFromUser = profile || {
        id: share.from_user_id,
        username: 'friend',
        display_name: 'Friend', 
        avatar_url: null
      }
      
      console.log('🔍 [Debug] Processing share:', {
        shareId: share.id,
        from_user_id: share.from_user_id,
        profile_found: !!profile,
        profile_avatar: profile?.avatar_url,
        avatar_from_map: avatarMap.get(share.from_user_id),
        final_avatar: avatarUrl,
        using_fallback_profile: !profile
      })
      
      return {
        ...share,
        from_user: {
          ...finalFromUser,
          avatar_url: avatarUrl
        }
      }
    })

    console.log('🔍 [Debug] Final result with avatars:', result.length, 'items')
    result.forEach((item, index) => {
      console.log(`🔍 [Debug] Item ${index}:`, {
        current_user_id: user.id,
        from_user_id: item.from_user_id,
        to_user_id: item.to_user_id,
        from_user_name: item.from_user?.display_name,
        item_title: item.item_title
      })
    })
    return result as MediaShare[]
  }

  // Notifications
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
      .from('notifications')
      .select(`
        *,
        from_user:user_profiles!notifications_from_user_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data || []
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
    
    if (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
    
    return true
  }

  async markAllNotificationsAsRead(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    
    if (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
    
    return true
  }

  // Real-time subscriptions
  subscribeToNotifications(callback: (notification: Notification) => void) {
    const { data: { user } } = supabase.auth.getUser()
    if (!user) return null

    return supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()
  }

  subscribeToActivities(callback: (activity: Activity) => void) {
    return supabase
      .channel('activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities'
        },
        (payload) => {
          callback(payload.new as Activity)
        }
      )
      .subscribe()
  }
}

export const socialService = new SocialService()
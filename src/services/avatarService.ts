import { supabase } from '@/lib/supabase'

class AvatarService {
  // In-memory cache for avatars to avoid repeated requests
  private avatarCache = new Map<string, { url: string | null, timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Get user avatar (custom or Google)
  async getUserAvatar(userId: string): Promise<string | null> {
    // Check cache first
    const cached = this.avatarCache.get(userId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.url
    }
    try {
      // First try custom avatar
      const { data: customAvatar } = await supabase
        .from('user_avatars')
        .select('avatar_url')
        .eq('user_id', userId)
        .single()

      if (customAvatar?.avatar_url) {
        this.cacheAvatar(userId, customAvatar.avatar_url)
        return customAvatar.avatar_url
      }

      // Then try user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single()

      if (profile?.avatar_url) {
        this.cacheAvatar(userId, profile.avatar_url)
        return profile.avatar_url
      }

      // Finally get from auth user
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.id === userId) {
        const avatarUrl = user.user_metadata?.avatar_url || null
        this.cacheAvatar(userId, avatarUrl)
        return avatarUrl
      }

      // Cache the result (even if null)
      this.avatarCache.set(userId, { url: null, timestamp: Date.now() })
      return null
    } catch (error) {
      console.error('Error getting user avatar:', error)
      return null
    }
  }

  // Cache the avatar result
  private cacheAvatar(userId: string, avatarUrl: string | null) {
    this.avatarCache.set(userId, { url: avatarUrl, timestamp: Date.now() })
  }

  // Update user avatar
  async updateUserAvatar(userId: string, newAvatarUrl: string): Promise<boolean> {
    try {
      // First, get the current Google avatar to preserve it
      const { data: { user } } = await supabase.auth.getUser()
      const googleAvatar = user?.user_metadata?.avatar_url || null

      console.log('🔄 [AvatarService] Updating avatar for user:', userId)

      // Upsert into user_avatars
      const { error: avatarError } = await supabase
        .from('user_avatars')
        .upsert({
          user_id: userId,
          avatar_url: newAvatarUrl,
          google_avatar_url: googleAvatar,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (avatarError) {
        console.error('Error updating avatar:', avatarError)
        return false
      }

      // Also update user_profiles for consistency and to ensure it appears everywhere
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile avatar:', profileError)
      }

      console.log('✅ [AvatarService] Avatar updated successfully')
      
      // Invalidate cache for this user
      this.avatarCache.delete(userId)
      
      return true
    } catch (error) {
      console.error('Error updating user avatar:', error)
      return false
    }
  }

  // Reset to Google avatar
  async resetToGoogleAvatar(userId: string): Promise<boolean> {
    try {
      // Get the stored Google avatar
      const { data: avatarData } = await supabase
        .from('user_avatars')
        .select('google_avatar_url')
        .eq('user_id', userId)
        .single()

      if (avatarData?.google_avatar_url) {
        return await this.updateUserAvatar(userId, avatarData.google_avatar_url)
      }

      // If no stored Google avatar, delete custom avatar
      const { error } = await supabase
        .from('user_avatars')
        .delete()
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error resetting to Google avatar:', error)
      return false
    }
  }

  // Get avatar URL with fallback
  async getAvatarUrl(userId: string): Promise<string> {
    const avatar = await this.getUserAvatar(userId)
    
    if (avatar) {
      return avatar
    }

    // Generate a default avatar based on user ID
    const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'pink', 'indigo']
    const colorIndex = parseInt(userId.slice(-1), 16) % colors.length
    const color = colors[colorIndex]
    
    // Return a gradient avatar as fallback
    return `https://ui-avatars.com/api/?name=User&background=${color}&color=fff`
  }

  // Batch get avatars for multiple users (optimized for feed)
  async getBatchAvatars(userIds: string[]): Promise<Map<string, string>> {
    const avatarMap = new Map<string, string>()
    const uncachedUserIds: string[] = []

    // Check cache first for all users
    for (const userId of userIds) {
      const cached = this.avatarCache.get(userId)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        if (cached.url) {
          avatarMap.set(userId, cached.url)
        }
      } else {
        uncachedUserIds.push(userId)
      }
    }

    // If all users were cached, return early
    if (uncachedUserIds.length === 0) {
      return avatarMap
    }

    try {
      // Get custom avatars for uncached users only
      const { data: customAvatars } = await supabase
        .from('user_avatars')
        .select('user_id, avatar_url')
        .in('user_id', uncachedUserIds)

      customAvatars?.forEach(avatar => {
        avatarMap.set(avatar.user_id, avatar.avatar_url)
        this.cacheAvatar(avatar.user_id, avatar.avatar_url)
      })

      // Get profile avatars for users without custom avatars
      const usersWithoutCustom = uncachedUserIds.filter(id => !avatarMap.has(id))
      if (usersWithoutCustom.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, avatar_url')
          .in('id', usersWithoutCustom)
          .not('avatar_url', 'is', null)

        profiles?.forEach(profile => {
          if (profile.avatar_url) {
            avatarMap.set(profile.id, profile.avatar_url)
            this.cacheAvatar(profile.id, profile.avatar_url)
          }
        })
      }

      // For remaining users, generate defaults and cache them
      uncachedUserIds.forEach(userId => {
        if (!avatarMap.has(userId)) {
          const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'pink', 'indigo']
          const colorIndex = parseInt(userId.slice(-1), 16) % colors.length
          const color = colors[colorIndex]
          const defaultAvatar = `https://ui-avatars.com/api/?name=User&background=${color}&color=fff`
          avatarMap.set(userId, defaultAvatar)
          this.cacheAvatar(userId, defaultAvatar)
        }
      })

      return avatarMap
    } catch (error) {
      console.error('Error getting batch avatars:', error)
      return avatarMap
    }
  }
}

export const avatarService = new AvatarService()
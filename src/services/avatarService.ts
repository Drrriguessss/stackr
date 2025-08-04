import { supabase } from '@/lib/supabase'

class AvatarService {
  // Get user avatar (custom or Google)
  async getUserAvatar(userId: string): Promise<string | null> {
    try {
      // First try custom avatar
      const { data: customAvatar } = await supabase
        .from('user_avatars')
        .select('avatar_url')
        .eq('user_id', userId)
        .single()

      if (customAvatar?.avatar_url) {
        return customAvatar.avatar_url
      }

      // Then try user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single()

      if (profile?.avatar_url) {
        return profile.avatar_url
      }

      // Finally get from auth user
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.id === userId) {
        return user.user_metadata?.avatar_url || null
      }

      return null
    } catch (error) {
      console.error('Error getting user avatar:', error)
      return null
    }
  }

  // Update user avatar
  async updateUserAvatar(userId: string, newAvatarUrl: string): Promise<boolean> {
    try {
      // First, get the current Google avatar to preserve it
      const { data: { user } } = await supabase.auth.getUser()
      const googleAvatar = user?.user_metadata?.avatar_url || null

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

      // Also update user_profiles for consistency
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile avatar:', profileError)
      }

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

    try {
      // Get custom avatars
      const { data: customAvatars } = await supabase
        .from('user_avatars')
        .select('user_id, avatar_url')
        .in('user_id', userIds)

      customAvatars?.forEach(avatar => {
        avatarMap.set(avatar.user_id, avatar.avatar_url)
      })

      // Get profile avatars for users without custom avatars
      const usersWithoutCustom = userIds.filter(id => !avatarMap.has(id))
      if (usersWithoutCustom.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, avatar_url')
          .in('id', usersWithoutCustom)
          .not('avatar_url', 'is', null)

        profiles?.forEach(profile => {
          if (profile.avatar_url) {
            avatarMap.set(profile.id, profile.avatar_url)
          }
        })
      }

      // For remaining users, generate defaults
      userIds.forEach(userId => {
        if (!avatarMap.has(userId)) {
          const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'pink', 'indigo']
          const colorIndex = parseInt(userId.slice(-1), 16) % colors.length
          const color = colors[colorIndex]
          avatarMap.set(userId, `https://ui-avatars.com/api/?name=User&background=${color}&color=fff`)
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
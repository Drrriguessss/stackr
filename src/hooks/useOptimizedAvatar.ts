'use client'

import { useState, useEffect } from 'react'
import { avatarService } from '@/services/avatarService'

export function useOptimizedAvatar(userId: string | undefined) {
  const [avatar, setAvatar] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setAvatar(null)
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadAvatar = async () => {
      try {
        const avatarUrl = await avatarService.getAvatarUrl(userId)
        if (isMounted) {
          setAvatar(avatarUrl)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading avatar:', error)
        if (isMounted) {
          setAvatar(null)
          setIsLoading(false)
        }
      }
    }

    loadAvatar()

    return () => {
      isMounted = false
    }
  }, [userId])

  return { avatar, isLoading }
}
'use client'
import React, { useState } from 'react'
import { X, User, Camera } from 'lucide-react'
import { socialService } from '@/services/socialService'
import { AuthService } from '@/services/authService'

interface UserProfileSetupProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function UserProfileSetup({ isOpen, onClose, onComplete }: UserProfileSetupProps) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; displayName?: string }>({})

  const validateForm = () => {
    const newErrors: typeof errors = {}
    
    if (!username.trim()) {
      newErrors.username = 'Username is required'
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }
    
    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    try {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) throw new Error('No user found')
      
      await socialService.createOrUpdateProfile(currentUser.id, {
        username: username.trim().toLowerCase(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        is_public: true
      })
      
      onComplete()
    } catch (error: any) {
      if (error.message?.includes('duplicate key')) {
        setErrors({ username: 'This username is already taken' })
      } else {
        alert('Failed to create profile. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Complete Your Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Avatar placeholder */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User size={40} className="text-blue-600 dark:text-blue-400" />
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Camera size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
                  errors.username 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                placeholder="johndoe"
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name *
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
                errors.displayName 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="John Doe"
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.displayName}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio (optional)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
              placeholder="Tell us a bit about yourself..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Creating Profile...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
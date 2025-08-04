'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowLeft,
  Camera,
  Settings,
  Users,
  Star,
  MessageSquare,
  TrendingUp,
  Trophy,
  Film,
  Gamepad2,
  Music,
  BookOpen,
  BarChart3,
  Lock,
  Globe
} from 'lucide-react'
import { AuthService, type AuthUser } from '@/services/authService'
import { socialService, type UserProfile } from '@/services/socialService'
import { libraryService } from '@/services/libraryService'
import { avatarService } from '@/services/avatarService'
import type { LibraryItem } from '@/types'

interface ProfilePageProps {
  onBack: () => void
  userId?: string // If not provided, show current user's profile
  library: LibraryItem[]
}

interface ProfileStats {
  totalMedia: number
  ratedMedia: number
  totalReviews: number
  byCategory: {
    games: number
    movies: number
    music: number
    books: number
  }
}

interface TopFive {
  games: string[]
  movies: string[]
  music: string[]
  books: string[]
}

export default function ProfilePage({ onBack, userId, library }: ProfilePageProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [stats, setStats] = useState<ProfileStats>({
    totalMedia: 0,
    ratedMedia: 0,
    totalReviews: 0,
    byCategory: {
      games: 0,
      movies: 0,
      music: 0,
      books: 0
    }
  })
  const [topFive, setTopFive] = useState<TopFive>({
    games: [],
    movies: [],
    music: [],
    books: []
  })
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public')
  const [editingTopFive, setEditingTopFive] = useState<keyof TopFive | null>(null)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    try {
      const user = await AuthService.getCurrentUser()
      setCurrentUser(user)

      // Determine which profile to load
      const profileUserId = userId || user?.id
      if (!profileUserId) return

      setIsOwnProfile(profileUserId === user?.id)

      // Load user profile
      const userProfile = await socialService.getUserProfile(profileUserId)
      setProfile(userProfile)

      // Load avatar
      const avatar = await avatarService.getAvatarUrl(profileUserId)
      setUserAvatar(avatar)

      // Load stats
      if (isOwnProfile || userProfile?.is_public) {
        await loadStats(profileUserId)
        await loadRecentActivities(profileUserId)
      }

      // Load saved top 5 lists (TODO: implement storage)
      // For now, use placeholder data
      setTopFive({
        games: [],
        movies: [],
        music: [],
        books: []
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadStats = async (userId: string) => {
    const userLibrary = library.filter(item => {
      // If viewing own profile, show all
      if (isOwnProfile) return true
      // Otherwise, filter based on profile privacy settings
      return true // TODO: implement privacy filtering
    })

    const ratedItems = userLibrary.filter(item => item.rating && item.rating > 0)
    
    const byCategory = {
      games: userLibrary.filter(item => item.category === 'games').length,
      movies: userLibrary.filter(item => item.category === 'movies').length,
      music: userLibrary.filter(item => item.category === 'music').length,
      books: userLibrary.filter(item => item.category === 'books').length
    }

    setStats({
      totalMedia: userLibrary.length,
      ratedMedia: ratedItems.length,
      totalReviews: 0, // TODO: implement review counting
      byCategory
    })
  }

  const loadRecentActivities = async (userId: string) => {
    try {
      const activities = await socialService.getUserActivities(userId, 10)
      setRecentActivities(activities)
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const handleSaveTopFive = async (category: keyof TopFive, items: string[]) => {
    // TODO: Save to database
    setTopFive(prev => ({
      ...prev,
      [category]: items
    }))
    setEditingTopFive(null)
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      // Create a compressed version of the image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = async () => {
        // Calculate new dimensions (max 400x400)
        const maxSize = 400
        let { width, height } = img
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        
        // Update avatar in service
        const success = await avatarService.updateUserAvatar(currentUser.id, compressedDataUrl)
        if (success) {
          setUserAvatar(compressedDataUrl)
          // Dispatch event to update avatar elsewhere
          window.dispatchEvent(new CustomEvent('avatarUpdated', { 
            detail: { userId: currentUser.id, avatarUrl: compressedDataUrl } 
          }))
        } else {
          alert('Failed to update avatar. Please try again.')
        }
      }
      
      img.onerror = () => {
        alert('Error loading image. Please try a different file.')
      }
      
      // Load the image
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error uploading avatar. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'games': return <Gamepad2 size={16} />
      case 'movies': return <Film size={16} />
      case 'music': return <Music size={16} />
      case 'books': return <BookOpen size={16} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h1 className="text-lg font-semibold">Profile</h1>
          
          {isOwnProfile && (
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white p-6 border-b">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={profile?.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-bold">
                  {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            {isOwnProfile && (
              <>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <label 
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  {uploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera size={16} />
                  )}
                </label>
              </>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{profile?.display_name}</h2>
            <p className="text-gray-500">@{profile?.username}</p>
            
            {/* Stats */}
            <div className="flex items-center space-x-6 mt-4">
              <div className="text-center">
                <div className="text-xl font-bold">{stats.totalMedia}</div>
                <div className="text-sm text-gray-500">Media</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{stats.ratedMedia}</div>
                <div className="text-sm text-gray-500">Rated</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{stats.totalReviews}</div>
                <div className="text-sm text-gray-500">Reviews</div>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="mt-4 text-gray-700">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mt-6 border-t pt-4">
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'public' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe size={16} className="inline mr-2" />
            Public
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('private')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                activeTab === 'private' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Lock size={16} className="inline mr-2" />
              Private
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {activeTab === 'public' ? (
          <>
            {/* Recent Activity */}
            <section className="bg-white rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp size={20} className="mr-2 text-blue-600" />
                Recent Activity
              </h3>
              
              {recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getCategoryIcon(activity.item_type)}
                      <div className="flex-1">
                        <p className="text-sm">
                          Added <span className="font-medium">{activity.item_title}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No recent activity</p>
              )}
            </section>

            {/* Top 5 Lists */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Trophy size={20} className="mr-2 text-yellow-600" />
                My Top 5
              </h3>

              {(['movies', 'games', 'music', 'books'] as const).map((category) => (
                <div key={category} className="bg-white rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium flex items-center">
                      {getCategoryIcon(category)}
                      <span className="ml-2">
                        Top 5 {category === 'movies' ? 'Movies' : 
                               category === 'games' ? 'Games' :
                               category === 'music' ? 'Music' : 'Books'}
                      </span>
                    </h4>
                    {isOwnProfile && (
                      <button
                        onClick={() => setEditingTopFive(category)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {topFive[category].length === 0 ? 'Add' : 'Edit'}
                      </button>
                    )}
                  </div>

                  {editingTopFive === category ? (
                    <TopFiveEditor
                      category={category}
                      items={topFive[category]}
                      onSave={(items) => handleSaveTopFive(category, items)}
                      onCancel={() => setEditingTopFive(null)}
                    />
                  ) : (
                    topFive[category].length > 0 ? (
                      <ol className="list-decimal list-inside space-y-2">
                        {topFive[category].map((item, index) => (
                          <li key={index} className="text-gray-700">{item}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-gray-500 text-sm italic">
                        {isOwnProfile ? 'Click "Add" to create your top 5' : 'Not defined yet'}
                      </p>
                    )
                  )}
                </div>
              ))}
            </section>
          </>
        ) : (
          /* Private Tab Content */
          <>
            {/* Friends List */}
            <section className="bg-white rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users size={20} className="mr-2 text-blue-600" />
                My Friends
              </h3>
              <p className="text-gray-500 text-sm">Friends list (to be implemented)</p>
            </section>

            {/* Detailed Stats */}
            <section className="bg-white rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 size={20} className="mr-2 text-green-600" />
                Detailed Statistics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(stats.byCategory).map(([category, count]) => (
                  <div key={category} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      {getCategoryIcon(category)}
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 capitalize">{category}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-500 mt-4 italic">
                More detailed statistics coming soon...
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

// Top 5 Editor Component
function TopFiveEditor({ 
  category, 
  items, 
  onSave, 
  onCancel 
}: { 
  category: keyof TopFive
  items: string[]
  onSave: (items: string[]) => void
  onCancel: () => void
}) {
  const [editItems, setEditItems] = useState<string[]>([...items, '', '', '', '', ''].slice(0, 5))

  const handleChange = (index: number, value: string) => {
    const newItems = [...editItems]
    newItems[index] = value
    setEditItems(newItems)
  }

  const handleSave = () => {
    const filteredItems = editItems.filter(item => item.trim() !== '')
    onSave(filteredItems)
  }

  return (
    <div className="space-y-2">
      {editItems.map((item, index) => (
        <input
          key={index}
          type="text"
          value={item}
          onChange={(e) => handleChange(index, e.target.value)}
          placeholder={`#${index + 1}`}
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      ))}
      <div className="flex space-x-2 mt-4">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
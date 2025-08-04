'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowLeft,
  Search,
  UserPlus,
  Users,
  User,
  MessageCircle,
  Star,
  TrendingUp
} from 'lucide-react'
import { AuthService, type AuthUser } from '@/services/authService'
import { socialService, type Friend, type SearchUser } from '@/services/socialService'
import { avatarService } from '@/services/avatarService'

interface FriendsPageProps {
  onBack: () => void
  onOpenProfile: (userId: string) => void
}

export default function FriendsPage({ onBack, onOpenProfile }: FriendsPageProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)
  const [friendAvatars, setFriendAvatars] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadFriends()
    }
  }, [currentUser])

  const loadUser = async () => {
    const user = await AuthService.getCurrentUser()
    setCurrentUser(user)
  }

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true)
      const friendsList = await socialService.getFriends()
      setFriends(friendsList)

      // Load avatars for friends
      if (friendsList.length > 0) {
        const friendIds = friendsList.map(f => f.friend_id)
        const avatars = await avatarService.getBatchAvatars(friendIds)
        setFriendAvatars(avatars)
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setIsLoadingFriends(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const results = await socialService.searchUsers(query.trim())
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendFriendRequest = async (friendIdentifier: string) => {
    try {
      await socialService.sendFriendRequest(friendIdentifier)
      // Refresh search results to update button states
      if (searchQuery) {
        handleSearch(searchQuery)
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
    }
  }

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    })
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
          
          <h1 className="text-lg font-semibold">Friends</h1>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Search size={20} className="mr-2 text-blue-600" />
            Find Friends
          </h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Username or email..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Search Results */}
          {isSearching && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <p className="text-gray-500 text-center py-4">No users found</p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="flex items-center space-x-3 flex-1 cursor-pointer"
                    onClick={() => onOpenProfile(user.id)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 hover:text-blue-600">
                        {user.display_name}
                      </p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  
                  {user.is_friend ? (
                    <span className="text-green-600 text-sm font-medium">✓ Friend</span>
                  ) : user.has_pending_request ? (
                    <span className="text-orange-600 text-sm font-medium">Pending</span>
                  ) : (
                    <button
                      onClick={() => handleSendFriendRequest(user.email || user.username)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <UserPlus size={14} className="inline mr-1" />
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends List */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users size={20} className="mr-2 text-green-600" />
            My Friends ({friends.length})
          </h2>

          {isLoadingFriends ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-3">Loading...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No friends yet</p>
              <p className="text-gray-400 text-sm mt-1">Use the search above to find friends</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div 
                  key={friend.friend_id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onOpenProfile(friend.friend_id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                      {friendAvatars.get(friend.friend_id) ? (
                        <img
                          src={friendAvatars.get(friend.friend_id)}
                          alt={friend.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={24} className="text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 hover:text-blue-600">
                        {friend.display_name}
                      </p>
                      <p className="text-sm text-gray-500">@{friend.username}</p>
                      <p className="text-xs text-gray-400">
                        Friends since {formatJoinDate(friend.friendship_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-white rounded-lg transition-colors">
                      <MessageCircle size={16} className="text-gray-400" />
                    </button>
                    <span className="text-gray-300">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {friends.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <TrendingUp size={18} className="mr-2 text-blue-600" />
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{friends.length}</div>
                <div className="text-sm text-gray-600">Friends</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {friends.filter(f => new Date(f.friendship_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                </div>
                <div className="text-sm text-gray-600">This month</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import React, { useState, useEffect } from 'react'
import { X, Search, UserPlus, Check, Clock, User } from 'lucide-react'
import { socialService, type SearchUser } from '@/services/socialService'

interface FriendSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FriendSearchModal({ isOpen, onClose }: FriendSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen])

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return

    setIsSearching(true)
    try {
      const results = await socialService.searchUsers(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendFriendRequest = async (user: SearchUser) => {
    const identifier = user.has_profile ? user.username : user.email || user.username
    setSendingRequests(prev => new Set(prev).add(identifier))
    
    try {
      await socialService.sendFriendRequest(identifier)
      // Update the search results to reflect the new status
      setSearchResults(prev => 
        prev.map(u => 
          u.id === user.id 
            ? { ...u, has_pending_request: true }
            : u
        )
      )
    } catch (error: any) {
      alert(error.message || 'Failed to send friend request')
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(identifier)
        return newSet
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Find Friends</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by username, email, or display name"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || searchQuery.trim().length < 2}
            className={`w-full mt-3 py-2 px-4 rounded-lg font-medium transition-colors ${
              isSearching || searchQuery.trim().length < 2
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto px-4 pb-4">
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.display_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.has_profile ? `@${user.username}` : user.email}
                      </p>
                      {!user.has_profile && (
                        <p className="text-xs text-orange-500 dark:text-orange-400">No profile yet</p>
                      )}
                    </div>
                  </div>

                  {user.is_friend ? (
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Check size={16} />
                      <span className="text-sm">Friends</span>
                    </div>
                  ) : user.has_pending_request ? (
                    <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                      <Clock size={16} />
                      <span className="text-sm">Pending</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendFriendRequest(user)}
                      disabled={sendingRequests.has(user.has_profile ? user.username : (user.email || user.username))}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        sendingRequests.has(user.has_profile ? user.username : (user.email || user.username))
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <UserPlus size={16} />
                      <span>{sendingRequests.has(user.has_profile ? user.username : (user.email || user.username)) ? 'Sending...' : 'Add Friend'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <User size={48} className="mx-auto mb-3 opacity-50" />
              <p>No users found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
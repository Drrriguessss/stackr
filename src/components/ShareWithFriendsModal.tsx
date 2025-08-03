'use client'
import React, { useState, useEffect } from 'react'
import { X, Send, User, Check } from 'lucide-react'
import { socialService, type Friend } from '@/services/socialService'

interface ShareWithFriendsModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    id: string
    type: 'games' | 'movies' | 'music' | 'books'
    title: string
    image?: string
  }
}

export default function ShareWithFriendsModal({ isOpen, onClose, item }: ShareWithFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [message, setMessage] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFriends()
      setMessage(`Check out "${item.title}" - I think you'd love it!`)
    } else {
      setSelectedFriends(new Set())
      setMessage('')
    }
  }, [isOpen, item.title])

  const loadFriends = async () => {
    setIsLoading(true)
    try {
      const friendsList = await socialService.getFriends()
      setFriends(friendsList)
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends)
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId)
    } else {
      newSelected.add(friendId)
    }
    setSelectedFriends(newSelected)
  }

  const handleShare = async () => {
    if (selectedFriends.size === 0) return

    setIsSending(true)
    try {
      const sharePromises = Array.from(selectedFriends).map(friendId =>
        socialService.shareMediaWithFriend(friendId, item, message)
      )
      
      await Promise.all(sharePromises)
      
      // Success feedback
      alert(`Shared "${item.title}" with ${selectedFriends.size} friend(s)!`)
      onClose()
    } catch (error) {
      console.error('Error sharing:', error)
      alert('Failed to share. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Share with Friends</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Item Preview */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            {item.image && (
              <img
                src={item.image}
                alt={item.title}
                className="w-12 h-16 rounded-lg object-cover bg-gray-200"
              />
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{item.type}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message..."
            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-3">Loading friends...</p>
            </div>
          ) : friends.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select friends to share with:
              </p>
              {friends.map((friend) => (
                <button
                  key={friend.friend_id}
                  onClick={() => toggleFriend(friend.friend_id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedFriends.has(friend.friend_id)
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{friend.display_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{friend.username}</p>
                    </div>
                  </div>
                  {selectedFriends.has(friend.friend_id) && (
                    <Check size={20} className="text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No friends yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Add friends to start sharing!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {friends.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleShare}
              disabled={selectedFriends.size === 0 || isSending}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedFriends.size > 0 && !isSending
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
              }`}
            >
              {isSending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sharing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Send size={16} />
                  <span>
                    Share with {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
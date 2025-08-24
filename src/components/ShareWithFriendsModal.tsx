'use client'
import React, { useState, useEffect } from 'react'
import { Link, MessageCircle, Check, Copy, UserPlus } from 'lucide-react'
import { socialService } from '@/services/socialService'
import { avatarService } from '@/services/avatarService'
import type { Friend } from '@/services/socialService'

interface ShareWithFriendsModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    id: string
    type: 'games' | 'movies' | 'music' | 'books' | 'boardgames'
    title: string
    image?: string
    customMessage?: string // Message personnalisé pour le partage de review
  }
}

export default function ShareWithFriendsModal({ isOpen, onClose, item }: ShareWithFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [shareMessage, setShareMessage] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Reset state when opening
      setSelectedFriends([])
      // Use custom message if provided, otherwise empty
      setShareMessage(item.customMessage || '')
      // Load friends
      loadFriends()
    } else {
      // Delay hiding to allow animation
      setTimeout(() => setIsVisible(false), 300)
    }
  }, [isOpen, item.customMessage])

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

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/${item.type}/${item.id}`
    navigator.clipboard.writeText(shareUrl)
    
    // Show toast notification
    setToastMessage('Link copied!')
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Check out "${item.title}" on Stackr! ${window.location.href}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleMessages = () => {
    const text = encodeURIComponent(`Check out "${item.title}" on Stackr! ${window.location.href}`)
    // Pour iOS
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.open(`sms:&body=${text}`, '_self')
    } else {
      // Pour Android et autres
      window.open(`sms:?body=${text}`, '_self')
    }
  }

  const handleSendToFriends = async () => {
    if (selectedFriends.length === 0) return
    
    try {
      // Send to each selected friend
      const promises = selectedFriends.map(friendId => 
        socialService.shareMediaWithFriend(
          friendId,
          {
            id: item.id,
            type: item.type,
            title: item.title,
            image: item.image
          },
          shareMessage || undefined
        )
      )
      
      await Promise.all(promises)
      
      // Show success toast
      setToastMessage(`Sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`)
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error sharing with friends:', error)
      setToastMessage('Failed to share. Please try again.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleOverlayClick}
      >
        {/* Modal sliding from bottom */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl transition-transform duration-300 ease-out ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '70vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="text-center pb-4">
            <h3 className="text-white font-semibold text-lg">Share</h3>
          </div>

          {/* Content container with scroll */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 180px)' }}>
            {/* Friends Grid */}
            <div className="px-4 pb-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">Loading friends...</div>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus size={48} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-2">No friends added yet</p>
                  <p className="text-gray-500 text-xs">Add friends to share your favorite content!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {friends.map((friend) => (
                    <button
                      key={friend.friend_id}
                      onClick={() => toggleFriendSelection(friend.friend_id)}
                      className="flex flex-col items-center space-y-2"
                    >
                      <div className="relative">
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.display_name}
                            className={`w-16 h-16 rounded-full object-cover transition-all ${
                              selectedFriends.includes(friend.friend_id)
                                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
                                : ''
                            }`}
                          />
                        ) : (
                          <div 
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all ${
                              selectedFriends.includes(friend.friend_id)
                                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
                                : ''
                            }`}
                            style={{ backgroundColor: avatarService.getAvatarColor(friend.friend_id) }}
                          >
                            {avatarService.getInitials(friend.display_name || friend.username)}
                          </div>
                        )}
                        {selectedFriends.includes(friend.friend_id) && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-white text-xs font-medium truncate w-full text-center">
                        {friend.display_name || friend.username}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Message input - Only show if friends selected */}
            {selectedFriends.length > 0 && (
              <div className="px-4 pb-4">
                <input
                  type="text"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a message..."
                  className="w-full bg-gray-800 text-white rounded-full px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* External share options */}
            <div className="px-4 pb-4">
              <div className="bg-gray-800 rounded-xl p-1">
                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <Link size={20} className="text-gray-300" />
                  </div>
                  <span className="text-white text-sm font-medium">Copy Link</span>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <span className="text-white text-sm font-medium">WhatsApp</span>
                </button>

                {/* Messages */}
                <button
                  onClick={handleMessages}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <MessageCircle size={20} className="text-white" fill="white" />
                  </div>
                  <span className="text-white text-sm font-medium">Messages</span>
                </button>
              </div>
            </div>
          </div>

          {/* Send button - Fixed at bottom */}
          {selectedFriends.length > 0 && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-800">
              <button
                onClick={handleSendToFriends}
                className="w-full bg-blue-500 text-white rounded-full py-3 font-semibold text-sm hover:bg-blue-600 transition-colors"
              >
                Send to {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in">
          <div className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            {toastMessage}
          </div>
        </div>
      )}
    </>
  )
}
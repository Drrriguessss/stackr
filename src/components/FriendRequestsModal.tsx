'use client'
import React, { useState, useEffect } from 'react'
import { X, Check, XCircle, User } from 'lucide-react'
import { socialService } from '@/services/socialService'

interface FriendRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  onRequestHandled?: () => void
}

export default function FriendRequestsModal({ 
  isOpen, 
  onClose, 
  onRequestHandled 
}: FriendRequestsModalProps) {
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      loadFriendRequests()
    }
  }, [isOpen])

  const loadFriendRequests = async () => {
    setIsLoading(true)
    try {
      const pendingRequests = await socialService.getPendingFriendRequests()
      setRequests(pendingRequests)
    } catch (error) {
      console.error('Error loading friend requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId))
    
    try {
      await socialService.acceptFriendRequest(requestId)
      setRequests(prev => prev.filter(req => req.id !== requestId))
      onRequestHandled?.()
    } catch (error) {
      console.error('Error accepting friend request:', error)
      alert('Failed to accept friend request')
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId))
    
    try {
      await socialService.rejectFriendRequest(requestId)
      setRequests(prev => prev.filter(req => req.id !== requestId))
      onRequestHandled?.()
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      alert('Failed to reject friend request')
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Friend Requests {requests.length > 0 && `(${requests.length})`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-3">Loading requests...</p>
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {request.requester_avatar ? (
                      <img
                        src={request.requester_avatar}
                        alt={request.requester_display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.requester_display_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{request.requester_username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={processingRequests.has(request.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        processingRequests.has(request.id)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                      }`}
                      title="Accept"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      disabled={processingRequests.has(request.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        processingRequests.has(request.id)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                      }`}
                      title="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <User size={48} className="mx-auto mb-3 opacity-50" />
              <p>No pending friend requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
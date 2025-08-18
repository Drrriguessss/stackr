// REWRITE FROM SCRATCH: Board Game Status Manager
// Simple, reliable status synchronization without race conditions

import React, { useState, useEffect } from 'react'
import { MediaStatus } from '../types'

interface BoardGameStatusManagerProps {
  gameId: string
  library: any[]
  onStatusChange: (gameId: string, status: MediaStatus) => Promise<void>
  onRemoveFromLibrary: (gameId: string) => Promise<void>
}

interface StatusOption {
  value: MediaStatus
  label: string
  description?: string
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'want-to-play', label: 'Want to Play', description: 'Add to wishlist' },
  { value: 'completed', label: 'Played', description: 'Mark as completed' }
]

export default function BoardGameStatusManager({ 
  gameId, 
  library, 
  onStatusChange, 
  onRemoveFromLibrary 
}: BoardGameStatusManagerProps) {
  // SIMPLE STATE: Only track what we need
  const [currentStatus, setCurrentStatus] = useState<MediaStatus | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // SIMPLE SYNC: Only sync FROM library TO local state (one direction)
  useEffect(() => {
    const libraryItem = library.find(item => item.id === gameId)
    const newStatus = libraryItem?.status || null
    
    // Only update if different (avoid unnecessary renders)
    if (currentStatus !== newStatus) {
      setCurrentStatus(newStatus)
    }
  }, [gameId, library]) // NO currentStatus in dependencies = no loop

  // SIMPLE STATUS UPDATE: Direct and reliable
  const handleStatusSelect = async (status: MediaStatus) => {
    if (isUpdating) return // Prevent double-clicks
    
    try {
      setIsUpdating(true)
      setShowPopup(false)
      
      // Optimistic update (immediate UI feedback)
      setCurrentStatus(status)
      
      // Call API
      await onStatusChange(gameId, status)
      
    } catch (error) {
      console.error('Status update failed:', error)
      
      // Revert on error
      const libraryItem = library.find(item => item.id === gameId)
      setCurrentStatus(libraryItem?.status || null)
      setShowPopup(true) // Reopen popup on error
      
    } finally {
      setIsUpdating(false)
    }
  }

  // SIMPLE REMOVE: Direct and reliable
  const handleRemove = async () => {
    if (isUpdating) return
    
    try {
      setIsUpdating(true)
      setShowPopup(false)
      
      // Optimistic update
      setCurrentStatus(null)
      
      // Call API
      await onRemoveFromLibrary(gameId)
      
    } catch (error) {
      console.error('Remove failed:', error)
      
      // Revert on error
      const libraryItem = library.find(item => item.id === gameId)
      setCurrentStatus(libraryItem?.status || null)
      setShowPopup(true)
      
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusLabel = (status: MediaStatus | null): string => {
    if (!status) return 'Add to Library'
    const option = STATUS_OPTIONS.find(opt => opt.value === status)
    return option?.label || status
  }

  const getButtonColor = (): string => {
    if (isUpdating) return 'bg-purple-600'
    if (!currentStatus) return 'bg-purple-600 hover:bg-purple-700'
    return 'bg-green-600 hover:bg-green-700'
  }

  return (
    <div className="relative">
      {/* MAIN BUTTON */}
      <button
        onClick={() => setShowPopup(true)}
        disabled={isUpdating}
        className={`w-full px-6 py-3 rounded-xl text-white font-medium transition-all duration-200 ${getButtonColor()}`}
      >
        {isUpdating ? (
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        ) : (
          <span>{getStatusLabel(currentStatus)}</span>
        )}
      </button>

      {/* STATUS POPUP */}
      {showPopup && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowPopup(false)}
          />
          
          {/* Popup */}
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl z-50">
            <h3 className="text-white font-medium mb-3">Update Status</h3>
            
            {/* Status Options */}
            <div className="space-y-2 mb-4">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 flex items-center justify-between ${
                    currentStatus === option.value
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-gray-600 hover:border-purple-400 bg-gray-800/50 text-gray-300 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-sm text-gray-400">{option.description}</div>
                    )}
                  </div>
                  
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    currentStatus === option.value
                      ? 'border-purple-400 bg-purple-500'
                      : 'border-gray-500'
                  }`}>
                    {currentStatus === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Remove Option (only if in library) */}
            {currentStatus && (
              <>
                <div className="border-t border-gray-600 my-3"></div>
                <button
                  onClick={handleRemove}
                  className="w-full p-3 rounded-lg border border-red-600 hover:border-red-500 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 transition-all duration-200"
                >
                  <span className="font-medium">Remove from Library</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
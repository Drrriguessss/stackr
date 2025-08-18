'use client'
import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { optimalBoardGameAPI } from '@/services/optimalBoardGameAPI'
import type { LibraryItem, MediaStatus } from '@/types'

interface BoardGameTestModalProps {
  gameId: string
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
}

interface GameData {
  id: string
  name: string
  image?: string
  thumbnail?: string
  yearPublished?: number
  rating?: number
}

export default function BoardGameTestModal({
  gameId,
  isOpen,
  onClose,
  onAddToLibrary,
  onDeleteItem,
  library
}: BoardGameTestModalProps) {
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<MediaStatus | null>(null)

  // Load game data from API
  useEffect(() => {
    if (!isOpen || !gameId) return

    const loadGameData = async () => {
      setLoading(true)
      try {
        console.log('🎲 [TEST MODAL] Loading game data for ID:', gameId)
        
        // Search for the game by ID (we'll get the first result)
        const results = await optimalBoardGameAPI.search(gameId)
        
        if (results.length > 0) {
          const game = results[0]
          setGameData({
            id: game.id,
            name: game.name,
            image: game.image,
            thumbnail: game.thumbnail,
            yearPublished: game.yearPublished,
            rating: game.rating
          })
          console.log('🎲 [TEST MODAL] Game data loaded:', game.name)
        } else {
          console.warn('🎲 [TEST MODAL] No game found for ID:', gameId)
        }
      } catch (error) {
        console.error('🎲 [TEST MODAL] Error loading game:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGameData()
  }, [isOpen, gameId])

  // Sync with library status
  useEffect(() => {
    const libraryItem = library.find(item => item.id === gameId)
    setCurrentStatus(libraryItem?.status || null)
  }, [gameId, library])

  // Get button text based on status
  const getButtonText = (status: MediaStatus | null) => {
    switch (status) {
      case 'want-to-play': return 'Want to Play'
      case 'completed': return 'Played'
      default: return 'Add to Library'
    }
  }

  // Handle status change
  const handleStatusChange = async (newStatus: MediaStatus | null) => {
    if (!gameData) return

    setShowDropdown(false)
    setCurrentStatus(newStatus) // Immediate UI update

    try {
      if (newStatus === null) {
        // Remove from library
        if (onDeleteItem) {
          await onDeleteItem(gameId)
          console.log('🗑️ [TEST MODAL] Removed from library')
        }
      } else {
        // Add/update in library
        const gameForLibrary = {
          id: gameData.id,
          title: gameData.name,
          category: 'boardgames' as const,
          image: gameData.image || gameData.thumbnail,
          year: gameData.yearPublished,
          author: 'Unknown Designer', // We don't have designer info in this simple version
          genre: 'Board Game'
        }

        await onAddToLibrary(gameForLibrary, newStatus)
        console.log('✅ [TEST MODAL] Added/updated in library:', newStatus)
      }
    } catch (error) {
      console.error('❌ [TEST MODAL] Failed to update library:', error)
      // Revert UI on error
      const libraryItem = library.find(item => item.id === gameId)
      setCurrentStatus(libraryItem?.status || null)
    }
  }

  // Bloquer le scroll de la page quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup au démontage
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>
          <h2 className="text-xl font-bold pr-12">Board Game Test</h2>
        </div>

        {/* Content - avec scroll interne si nécessaire */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : gameData ? (
            <div className="space-y-6">
              {/* Game Image */}
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-xl overflow-hidden shadow-lg bg-gray-100">
                  {gameData.image || gameData.thumbnail ? (
                    <img 
                      src={gameData.image || gameData.thumbnail} 
                      alt={gameData.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=400&fit=crop&q=80'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🎲
                    </div>
                  )}
                </div>
              </div>

              {/* Game Title */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {gameData.name}
                </h3>
                {gameData.yearPublished && (
                  <p className="text-gray-600">
                    {gameData.yearPublished}
                  </p>
                )}
                {gameData.rating && (
                  <p className="text-yellow-600 font-medium">
                    ⭐ {gameData.rating.toFixed(1)}/5
                  </p>
                )}
              </div>

              {/* Add to Library Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 relative"
                >
                  <span>{getButtonText(currentStatus)}</span>
                  <ChevronDown 
                    size={20} 
                    className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                      <button
                        onClick={() => handleStatusChange('want-to-play')}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        Want to Play
                      </button>
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="w-full px-4 py-3 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors border-t border-gray-100"
                      >
                        Played
                      </button>
                      {currentStatus && (
                        <button
                          onClick={() => handleStatusChange(null)}
                          className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                        >
                          Remove from Library
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Current Status Display */}
              {currentStatus && (
                <div className="text-center p-3 bg-green-50 text-green-700 rounded-xl">
                  <p className="text-sm font-medium">
                    Status: {getButtonText(currentStatus)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Game not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
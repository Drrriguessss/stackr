'use client'
import React, { useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import BoardGamesSection from './BoardGamesSection'
import type { MediaStatus, LibraryItem } from '@/types'

interface BoardGamesModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  onBackToSelection: () => void
  library: LibraryItem[]
}

export default function BoardGamesModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail,
  onBackToSelection,
  library
}: BoardGamesModalProps) {
  // Local library state for testing
  const [localLibrary, setLocalLibrary] = useState<LibraryItem[]>([])

  const handleAddToLibrary = (item: any, status: MediaStatus) => {
    console.log('🎲 [BoardGamesModal] Adding to library:', item.name, status)
    
    // Simulate adding to library
    const newItem: LibraryItem = {
      id: item.id,
      title: item.name || item.title,
      category: 'boardgames',
      status,
      rating: 0,
      progress: 0,
      notes: '',
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setLocalLibrary(prev => [...prev, newItem])
    
    // Also call the parent function
    onAddToLibrary(item, status)
  }

  const handleOpenDetail = (item: any) => {
    console.log('🎲 [BoardGamesModal] Opening detail for:', item.name)
    
    // Format complexity and player info for display
    const playerInfo = item.playerCountText || 
      `${item.minPlayers || '?'}-${item.maxPlayers || '?'} players`
    const playTimeInfo = item.playTimeText || 
      (item.playingTime ? `${item.playingTime} minutes` : 'Unknown duration')
    
    // Create detailed info string
    const detailText = [
      `Game: ${item.name}`,
      `Designer: ${item.designers?.map(d => d.name).join(', ') || 'Unknown'}`,
      `Publisher: ${item.publishers?.[0]?.name || 'Unknown'}`,
      `Year: ${item.yearPublished || 'Unknown'}`,
      `Players: ${playerInfo}`,
      `Play Time: ${playTimeInfo}`,
      `Age: ${item.ageText || 'Unknown'}`,
      `BGG Rating: ${item.bggRating ? item.bggRating.toFixed(1) + '/10' : 'Not rated'}`,
      `Complexity: ${item.complexity || 'Unknown'}`,
      `Categories: ${item.categories?.slice(0, 3).map(c => c.name).join(', ') || 'None'}`,
      `Mechanics: ${item.mechanics?.slice(0, 3).map(m => m.name).join(', ') || 'None'}`,
      `BGG Rank: ${item.rank ? '#' + item.rank : 'Unranked'}`,
      `Ratings: ${item.ratingsCount?.toLocaleString() || 0} users`,
      '',
      item.description ? `Description: ${item.description.substring(0, 200)}...` : 'No description available'
    ].join('\n')
    
    alert(detailText)
    
    // Also call the parent function
    onOpenDetail(item)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-7xl max-h-[90vh] bg-gray-50 rounded-2xl shadow-2xl overflow-hidden z-[10000]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToSelection}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to media selection"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex-1">
                <h2 className="text-xl font-bold">🎲 Board Games Discovery</h2>
                <p className="text-sm text-white/80">Search and discover board games with BoardGameGeek integration</p>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  🎲 Board Games Library & Search
                </h1>
                <p className="text-gray-600">
                  Discover thousands of board games with comprehensive data from BoardGameGeek, including ratings, complexity, and detailed game mechanics
                </p>
                
                {/* BGG Attribution */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Data Source:</strong> This search is powered by the BoardGameGeek (BGG) database, 
                    the most comprehensive resource for board game information. BGG ratings, ranks, and statistics 
                    reflect the opinions of the global board gaming community.
                  </p>
                </div>
              </div>

              <BoardGamesSection
                onAddToLibrary={handleAddToLibrary}
                onOpenDetail={handleOpenDetail}
                library={localLibrary}
              />

              {/* Debug Info */}
              <div className="mt-8 p-4 bg-white rounded-xl border">
                <h3 className="font-semibold mb-2">Debug - Library Items:</h3>
                <div className="text-sm text-gray-700">
                  {localLibrary.length === 0 ? (
                    <p className="text-gray-500 italic">No board games added to library yet</p>
                  ) : (
                    <div className="space-y-2">
                      {localLibrary.map((item, index) => (
                        <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <strong>{item.title}</strong>
                            <span className="text-gray-500 ml-2">({item.category})</span>
                          </div>
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BGG Information Panel */}
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                <h3 className="font-semibold text-indigo-900 mb-2">About BoardGameGeek (BGG)</h3>
                <div className="text-sm text-indigo-700 space-y-2">
                  <p>
                    <strong>BGG Rating:</strong> Community average rating out of 10, based on thousands of user reviews.
                  </p>
                  <p>
                    <strong>BGG Rank:</strong> Overall ranking among all board games in the BGG database.
                  </p>
                  <p>
                    <strong>Complexity:</strong> Weight rating from 1 (Light) to 5 (Heavy), indicating game complexity.
                  </p>
                  <p>
                    <strong>Categories & Mechanics:</strong> Detailed classification system helping you find games that match your preferences.
                  </p>
                  <p className="text-xs text-indigo-600 mt-3">
                    Note: Search results may take a few seconds due to BoardGameGeek API rate limiting (1 request per second).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
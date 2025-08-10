'use client'
import React, { useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import GamesSection from './GamesSection'
import type { MediaStatus, LibraryItem } from '@/types'

interface GamesModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  onBackToSelection: () => void
  library: LibraryItem[]
}

export default function GamesModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail,
  onBackToSelection,
  library
}: GamesModalProps) {
  // Local library state for testing
  const [localLibrary, setLocalLibrary] = useState<LibraryItem[]>([])

  const handleAddToLibrary = (item: any, status: MediaStatus) => {
    console.log('🎮 [GamesModal] Adding to library:', item.name, status)
    
    // Simulate adding to library
    const newItem: LibraryItem = {
      id: item.id,
      title: item.name || item.title,
      category: 'games',
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
    console.log('🎮 [GamesModal] Opening detail for:', item.name, 'ID:', item.id)
    // Close this modal first before opening detail
    onClose()
    // Small delay to ensure smooth transition
    setTimeout(() => {
      onOpenDetail({
        ...item,
        category: 'games'
      })
    }, 100)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-7xl max-h-[90vh] bg-gray-50 rounded-2xl shadow-2xl overflow-hidden z-[10000]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToSelection}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to media selection"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex-1">
                <h2 className="text-xl font-bold">🎮 Games Search</h2>
                <p className="text-sm text-white/80">Discover and search games with RAWG-powered intelligence</p>
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
                  🎮 Games Discovery
                </h1>
                <p className="text-gray-600">
                  Search and discover games with intelligent relevance ranking and quality filtering
                </p>
              </div>

              <GamesSection
                onAddToLibrary={handleAddToLibrary}
                onOpenDetail={handleOpenDetail}
                library={localLibrary}
              />

              {/* Debug Info */}
              <div className="mt-8 p-4 bg-white rounded-xl border">
                <h3 className="font-semibold mb-2">Debug - Library Items:</h3>
                <pre className="text-sm text-gray-700 overflow-auto">
                  {JSON.stringify(localLibrary, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
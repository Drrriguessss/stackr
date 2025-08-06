'use client'
import React, { useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import MoviesTVSectionV2 from './MoviesTVSectionV2'
import type { MediaStatus, LibraryItem } from '@/types'

interface MoviesTVModalV2Props {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  onBackToSelection: () => void
  library: LibraryItem[]
}

export default function MoviesTVModalV2({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail,
  onBackToSelection,
  library
}: MoviesTVModalV2Props) {
  // Local library state for testing (same as test page)
  const [localLibrary, setLocalLibrary] = useState<LibraryItem[]>([])

  const handleAddToLibrary = (item: any, status: MediaStatus) => {
    console.log('🎬 [MoviesTVV2] Adding to library:', item.title, status)
    
    // Simulate adding to library (same logic as test page)
    const newItem: LibraryItem = {
      id: item.id,
      title: item.title,
      category: 'movies',
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
    console.log('🎬 [MoviesTVV2] Opening detail for:', item.title, 'Category:', item.category)
    // Directly call the parent function - modal closing is handled in page.tsx
    onOpenDetail(item)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-7xl max-h-[90vh] bg-gray-50 rounded-2xl shadow-2xl overflow-hidden z-[10000]">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToSelection}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to media selection"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex-1">
                <h2 className="text-xl font-bold">🎬 Movies/TV V2 Test Page</h2>
                <p className="text-sm text-white/80">Testing the new TMDB-powered Movies/TV section</p>
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

          {/* Content - Exact same as test page */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  🎬 Movies/TV V2 Test Page
                </h1>
                <p className="text-gray-600">
                  Testing the new TMDB-powered Movies/TV section
                </p>
              </div>

              <MoviesTVSectionV2
                onAddToLibrary={handleAddToLibrary}
                onOpenDetail={handleOpenDetail}
                library={localLibrary}
              />

              {/* Debug Info - same as test page */}
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
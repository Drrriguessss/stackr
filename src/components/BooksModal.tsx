'use client'
import React, { useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import BooksSection from './BooksSection'
import type { MediaStatus, LibraryItem } from '@/types'

interface BooksModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenDetail: (item: any) => void
  onBackToSelection: () => void
  library: LibraryItem[]
}

export default function BooksModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenDetail,
  onBackToSelection,
  library
}: BooksModalProps) {
  // Local library state for testing
  const [localLibrary, setLocalLibrary] = useState<LibraryItem[]>([])

  const handleAddToLibrary = (item: any, status: MediaStatus) => {
    console.log('📚 [BooksModal] Adding to library:', item.title, status)
    
    // Simulate adding to library
    const newItem: LibraryItem = {
      id: item.id,
      title: item.title || item.name,
      category: 'books',
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
    console.log('📚 [BooksModal] Opening detail for:', item.title)
    alert(`Book detail modal for: ${item.title}\n\nAuthor: ${item.authors?.join(', ') || 'Unknown'}\nPublisher: ${item.publisher || 'Unknown'}\nRating: ${item.rating ? item.rating.toFixed(1) + '/5' : 'No rating'}`)
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
          <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToSelection}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to media selection"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex-1">
                <h2 className="text-xl font-bold">📚 Books Discovery</h2>
                <p className="text-sm text-white/80">Search and discover books with Google Books integration</p>
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
                  📚 Book Library & Search
                </h1>
                <p className="text-gray-600">
                  Discover millions of books with intelligent search, ratings, and detailed information
                </p>
              </div>

              <BooksSection
                onAddToLibrary={handleAddToLibrary}
                onOpenDetail={handleOpenDetail}
                library={localLibrary}
              />

              {/* Debug Info */}
              <div className="mt-8 p-4 bg-white rounded-xl border">
                <h3 className="font-semibold mb-2">Debug - Library Items:</h3>
                <div className="text-sm text-gray-700">
                  {localLibrary.length === 0 ? (
                    <p className="text-gray-500 italic">No books added to library yet</p>
                  ) : (
                    <div className="space-y-2">
                      {localLibrary.map((item, index) => (
                        <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <strong>{item.title}</strong>
                            <span className="text-gray-500 ml-2">({item.category})</span>
                          </div>
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
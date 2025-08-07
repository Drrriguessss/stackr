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
    <div className="fixed inset-0 z-10 bg-white overflow-y-auto">
      {/* Content wrapper with proper spacing for bottom nav (80px) */}
      <div className="min-h-screen pb-20">
        {/* Content */}
        <div className="p-4 pt-6">
          <div className="max-w-7xl mx-auto">
            <BooksSection
              onAddToLibrary={handleAddToLibrary}
              onOpenDetail={handleOpenDetail}
              library={localLibrary}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'
import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import UnifiedSearchBar from '@/components/UnifiedSearchBar'
import type { LibraryItem, MediaStatus } from '@/types'

interface SearchTabModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string, mediaType?: 'movie' | 'tv') => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  onOpenBoardGameDetail?: (gameId: string) => void
  library: LibraryItem[]
}

export default function SearchTabModal({
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  onOpenBoardGameDetail,
  library
}: SearchTabModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Disable scrolling on body
      document.body.style.overflow = 'hidden'
    } else {
      // Re-enable scrolling on body
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      {/* Modal Content - Scrollable container */}
      <div className="fixed inset-0 bg-[#0f0e17] overflow-y-auto">
        {/* Close button - Fixed position within modal */}
        <button
          onClick={onClose}
          className="sticky top-4 left-full -translate-x-16 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={20} className="text-white" />
        </button>

        {/* Exact copy of Search tab content - Now scrollable */}
        <div className="min-h-screen bg-[#0f0e17] flex flex-col relative">
          {/* Header Section - now solid black */}
          <div className="absolute inset-x-0 top-0 h-32 sm:h-40">
            {/* Solid black background */}
            <div 
              className="absolute inset-0 bg-[#0f0e17]"
            />
          </div>
          
          {/* Main Content - above gradient with higher z-index */}
          <div className="relative z-20 flex flex-col min-h-screen">
            <div className="container mx-auto max-w-2xl px-4 sm:px-6 pt-6 pb-4 sm:pt-8 sm:pb-6">
            </div>
            
            <div className="container mx-auto max-w-2xl px-4 sm:px-6 pb-20 flex-1 flex flex-col">
              {/* NEW: Unified Search Bar - Apple Music Style (no title) */}
              <div className="mb-8">
                <UnifiedSearchBar
                  onAddToLibrary={onAddToLibrary}
                  onOpenGameDetail={onOpenGameDetail}
                  onOpenMovieDetail={onOpenMovieDetail}
                  onOpenBookDetail={onOpenBookDetail}
                  onOpenMusicDetail={onOpenMusicDetail}
                  onOpenBoardGameDetail={onOpenBoardGameDetail}
                  library={library}
                />
              </div>
              
              {/* Category Buttons - HIDDEN but code intact for future reactivation */}
              <div className="hidden flex-col gap-2 sm:gap-3 flex-1 justify-start">
                {/* This section is hidden in the original Search tab */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'
import React, { memo } from 'react'
import { X } from 'lucide-react'

interface BookHeaderProps {
  headerImage: string
  bookTitle: string
  onClose: () => void
}

const BookHeader = memo(({ headerImage, bookTitle, onClose }: BookHeaderProps) => {
  return (
    <div className="relative h-[160px] overflow-hidden">
      <img
        src={headerImage}
        alt={`${bookTitle} backdrop`}
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1280&h=720&fit=crop&q=80'
        }}
      />
      
      {/* Navigation Header - X button top right */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-5" style={{ zIndex: 20 }}>
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
})

BookHeader.displayName = 'BookHeader'

export default BookHeader
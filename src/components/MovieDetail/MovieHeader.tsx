'use client'
import React, { memo } from 'react'
import { X } from 'lucide-react'

interface MovieHeaderProps {
  headerImage: string | null
  movieTitle?: string
  onClose: () => void
}

const MovieHeader = memo(({ headerImage, movieTitle, onClose }: MovieHeaderProps) => {
  const fallbackImage = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80'
  
  return (
    <div className="relative h-[160px] overflow-hidden">
      <img
        src={headerImage || fallbackImage}
        alt={`${movieTitle || 'Movie'} backdrop`}
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = fallbackImage
        }}
      />
      
      <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-5" style={{ zIndex: 20 }}>
        <button
          onClick={onClose}
          className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
          aria-label="Close movie details"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
})

MovieHeader.displayName = 'MovieHeader'

export default MovieHeader
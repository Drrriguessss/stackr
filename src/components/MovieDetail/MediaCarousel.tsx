'use client'
import React, { memo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'

interface MediaCarouselProps {
  trailer: { url: string; provider: string } | null
  images: string[]
  movieTitle: string
  moviePoster?: string
}

const MediaCarousel = memo(({ trailer, images, movieTitle, moviePoster }: MediaCarouselProps) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  
  const totalItems = (trailer ? 1 : 0) + images.length
  
  const nextImage = useCallback(() => {
    if (totalItems > 0) {
      setActiveImageIndex((prev) => (prev + 1) % totalItems)
    }
  }, [totalItems])

  const prevImage = useCallback(() => {
    if (totalItems > 0) {
      setActiveImageIndex((prev) => (prev - 1 + totalItems) % totalItems)
    }
  }, [totalItems])

  const renderMediaContent = () => {
    if (trailer && activeImageIndex === 0) {
      if (trailer.provider === 'youtube' && trailer.url.includes('embed')) {
        return (
          <iframe
            src={trailer.url}
            className="w-full h-full"
            allowFullScreen
            title="Movie Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )
      } else {
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <a
              href={trailer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg text-white"
            >
              <Play size={20} />
              Watch Trailer
            </a>
          </div>
        )
      }
    } else if (images.length > 0) {
      const imageIndex = trailer ? activeImageIndex - 1 : activeImageIndex
      return (
        <img
          src={images[imageIndex]}
          alt={`${movieTitle} scene`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      )
    } else if (moviePoster && moviePoster !== 'N/A') {
      return (
        <img
          src={moviePoster}
          alt={movieTitle}
          className="w-full h-full object-contain bg-gray-900"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      )
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-500">
            <div className="text-5xl mb-2">🎬</div>
            <p>No media available</p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {renderMediaContent()}
        
        {/* Navigation arrows */}
        {totalItems > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {totalItems > 0 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {/* Trailer thumbnail */}
          {trailer && (
            <button
              onClick={() => setActiveImageIndex(0)}
              className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors relative ${
                activeImageIndex === 0 ? 'border-white' : 'border-transparent'
              }`}
              aria-label="Watch trailer"
            >
              {moviePoster && moviePoster !== 'N/A' ? (
                <img
                  src={moviePoster}
                  alt="Trailer thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-700"></div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Play size={12} className="text-white" />
              </div>
            </button>
          )}
          
          {/* Image thumbnails */}
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveImageIndex(trailer ? index + 1 : index)}
              className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors ${
                (trailer ? index + 1 : index) === activeImageIndex ? 'border-white' : 'border-transparent'
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

MediaCarousel.displayName = 'MediaCarousel'

export default MediaCarousel
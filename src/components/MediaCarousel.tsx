// Composant carousel horizontal pour naviguer entre trailer et images
// Permet de swiper de droite à gauche entre le trailer et les screenshots/backdrops

import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import type { MediaGallery } from '../services/imageService'

// Composant séparé pour les images avec gestion d'erreur
const MediaImage: React.FC<{
  image: MediaGallery['images'][0]
  itemTitle: string
  index: number
}> = ({ image, itemTitle, index }) => {
  const [imageError, setImageError] = useState(false)
  
  const typeLabels = {
    screenshot: 'Gameplay',
    backdrop: 'Image',
    poster: 'Affiche',
    background: 'Artwork'
  }

  const handleImageError = () => {
    console.log('🖼️ Image failed to load:', image.url)
    setImageError(true)
  }

  return (
    <div className="flex-shrink-0 w-full h-full bg-gray-900 rounded-lg overflow-hidden relative group">
      {!imageError ? (
        <img
          src={image.url}
          alt={`${itemTitle} - ${typeLabels[image.type]} ${index + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={handleImageError}
        />
      ) : (
        // Fallback si l'image ne charge pas
        <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center text-gray-400">
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-sm text-center px-2">Image non disponible</p>
          <p className="text-xs text-gray-500 mt-1">{typeLabels[image.type]}</p>
        </div>
      )}
      
      {/* Badge type d'image */}
      <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-semibold">
        {typeLabels[image.type]}
      </div>

      {/* Overlay au hover */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300" />
    </div>
  )
}

interface MediaCarouselProps {
  gallery: MediaGallery
  itemTitle: string
  className?: string
}

const MediaCarousel: React.FC<MediaCarouselProps> = ({ 
  gallery, 
  itemTitle, 
  className = '' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  // Calculer le nombre total d'éléments (trailer + images)
  const totalItems = (gallery.trailer ? 1 : 0) + gallery.images.length
  const hasTrailer = gallery.trailer !== null
  
  // Naviguer vers un index spécifique
  const goToIndex = (index: number) => {
    if (index < 0 || index >= totalItems || isScrolling) return
    
    setIsScrolling(true)
    setCurrentIndex(index)
    
    // Scroll vers l'élément
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const itemWidth = container.clientWidth
      container.scrollTo({
        left: index * itemWidth,
        behavior: 'smooth'
      })
    }
    
    // Réactiver la navigation après l'animation
    setTimeout(() => setIsScrolling(false), 300)
  }

  // Navigation précédent/suivant
  const goToPrevious = () => goToIndex(currentIndex - 1)
  const goToNext = () => goToIndex(currentIndex + 1)

  // Gestion du touch/swipe mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe gauche - aller au suivant
        goToNext()
      } else {
        // Swipe droite - aller au précédent
        goToPrevious()
      }
    }
    
    touchStartX.current = null
    touchEndX.current = null
  }

  // Gestion du scroll pour mettre à jour l'index actuel
  const handleScroll = () => {
    if (isScrolling || !scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const itemWidth = container.clientWidth
    const scrollLeft = container.scrollLeft
    const newIndex = Math.round(scrollLeft / itemWidth)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalItems) {
      setCurrentIndex(newIndex)
    }
  }

  // Rendu du trailer
  const renderTrailer = () => {
    if (!gallery.trailer) return null

    const { url, provider, videoId } = gallery.trailer
    const isEmbeddable = provider === 'youtube' && videoId && !url.includes('results?search_query')

    return (
      <div className="flex-shrink-0 w-full h-full bg-gray-900 rounded-lg overflow-hidden relative group">
        {isEmbeddable ? (
          <iframe
            src={url}
            className="w-full h-full"
            allowFullScreen
            title={`${itemTitle} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center text-white relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            <div className="relative z-10 text-center">
              <Play className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Trailer Officiel</h3>
              <p className="text-sm text-gray-300 mb-4">Cliquez pour regarder sur YouTube</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Regarder le Trailer
              </a>
            </div>
          </div>
        )}
        
        {/* Badge "Trailer" */}
        <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-semibold">
          Trailer
        </div>
      </div>
    )
  }


  if (totalItems === 0) {
    return (
      <div className={`w-full aspect-video bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <div className="w-12 h-12 mx-auto mb-2 opacity-50">📷</div>
          <p className="text-sm">Aucun média disponible</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full aspect-video ${className}`}>
      {/* Container principal avec scroll horizontal */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-x-auto scrollbar-hide flex snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Trailer en premier si disponible */}
        {hasTrailer && (
          <div className="flex-shrink-0 w-full h-full snap-start">
            {renderTrailer()}
          </div>
        )}
        
        {/* Images */}
        {gallery.images.map((image, index) => (
          <div key={`img-${index}`} className="flex-shrink-0 w-full h-full snap-start">
            <MediaImage image={image} itemTitle={itemTitle} index={index} />
          </div>
        ))}
      </div>

      {/* Boutons de navigation (desktop) */}
      {totalItems > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-all duration-200 z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={goToNext}
            disabled={currentIndex === totalItems - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-all duration-200 z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicateurs de position */}
      {totalItems > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {Array.from({ length: totalItems }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>
      )}

      {/* Compteur (mobile) */}
      <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-xs font-medium z-10">
        {currentIndex + 1} / {totalItems}
      </div>
    </div>
  )
}

export default MediaCarousel
'use client'

import React, { useState, useRef, useEffect } from 'react'

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
  className?: string
  lazy?: boolean
}

export default function OptimizedImage({ 
  src, 
  alt, 
  fallback, 
  className = '', 
  lazy = true,
  ...props 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy)
  const imgRef = useRef<HTMLImageElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, isInView])

  const handleLoad = () => {
    setIsLoaded(true)
    setIsError(false)
  }

  const handleError = () => {
    setIsError(true)
    setIsLoaded(false)
  }

  const shouldShowImage = isInView && src && !isError
  const showFallback = isError && fallback

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Loading placeholder */}
      {!isLoaded && shouldShowImage && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      {/* Main image */}
      {shouldShowImage && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
      
      {/* Fallback image */}
      {showFallback && (
        <img
          src={fallback}
          alt={alt}
          className={className}
          onError={() => setIsError(false)} // Prevent infinite fallback loop
          {...props}
        />
      )}
      
      {/* Error state - no fallback */}
      {isError && !fallback && (
        <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
          <span className="text-gray-400 text-xs">No image</span>
        </div>
      )}
    </div>
  )
}
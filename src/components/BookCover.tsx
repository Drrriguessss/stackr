import React, { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { bookCoverManager } from '@/utils/bookCoverManager'

interface BookCoverProps {
  book: {
    id?: string
    image?: string
    isbn?: string
    title: string
    authors?: string[]
  }
  className?: string
  alt?: string
  onError?: () => void
  showSkeleton?: boolean
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none'
  minHeight?: string
}

const BookCover: React.FC<BookCoverProps> = ({ 
  book, 
  className = '', 
  alt, 
  onError,
  showSkeleton = true,
  objectFit = 'cover',
  minHeight = '144px'
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(book.image || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const maxRetries = 2

  useEffect(() => {
    loadOptimalImage()
  }, [book.id, book.image, book.isbn, book.title])

  const loadOptimalImage = async () => {
    if (error && retryCount >= maxRetries) return

    setIsLoading(true)
    
    try {
      const optimalImage = await bookCoverManager.getBookCover({
        id: book.id,
        image: book.image,
        isbn: book.isbn,
        title: book.title,
        authors: book.authors
      })
      
      setImageSrc(optimalImage)
      setError(false)
    } catch (err) {
      console.error('📚 Error loading book cover:', err)
      setError(true)
      setRetryCount(prev => prev + 1)
      
      // Fallback immédiat vers placeholder si toutes les tentatives échouent
      if (retryCount >= maxRetries) {
        const placeholder = generateFallbackPlaceholder()
        setImageSrc(placeholder)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageError = () => {
    if (!error && retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      setError(true)
      loadOptimalImage()
    } else {
      // Dernière tentative : placeholder simple
      const fallback = generateFallbackPlaceholder()
      setImageSrc(fallback)
      onError?.()
    }
  }

  const generateFallbackPlaceholder = (): string => {
    return `https://placehold.co/400x600/667eea/ffffff?text=${encodeURIComponent(book.title.substring(0, 30))}`
  }

  // Skeleton loader pendant le chargement
  if (isLoading && showSkeleton) {
    return (
      <div className={`book-cover-skeleton bg-gray-700 animate-pulse rounded-lg flex items-center justify-center ${className}`}>
        <BookOpen size={24} className="text-gray-500" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc || generateFallbackPlaceholder()}
      alt={alt || `Couverture de ${book.title}`}
      className={`book-cover transition-opacity duration-300 ${className} ${
        isLoading ? 'opacity-50' : 'opacity-100'
      }`}
      onError={handleImageError}
      loading="lazy"
      style={{
        minHeight: minHeight, // Éviter le layout shift
        objectFit: objectFit
      }}
    />
  )
}

export default BookCover
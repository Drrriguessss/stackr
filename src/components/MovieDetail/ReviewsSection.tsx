'use client'
import React, { memo, useState, useCallback } from 'react'
import { Star } from 'lucide-react'
import type { ProcessedReview } from '@/services/tmdbReviewsService'

interface ReviewsSectionProps {
  reviews: ProcessedReview[]
  maxInitialReviews?: number
}

const ReviewsSection = memo(({ reviews, maxInitialReviews = 3 }: ReviewsSectionProps) => {
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())

  // Fonction pour tronquer à la première phrase
  const truncateToOneSentence = useCallback((text: string): string => {
    if (!text) return ''
    
    // Trouve la première phrase (jusqu'au premier . ! ou ?)
    const firstSentenceMatch = text.match(/^[^.!?]*[.!?]/)
    if (firstSentenceMatch) {
      return firstSentenceMatch[0].trim()
    }
    
    // Si pas de ponctuation, tronquer à ~80 caractères
    if (text.length > 80) {
      return text.substring(0, 80).trim()
    }
    
    return text
  }, [])

  // Fonction pour obtenir la longueur de la première phrase
  const getFirstSentenceLength = useCallback((text: string): number => {
    const truncated = truncateToOneSentence(text)
    return truncated.length
  }, [truncateToOneSentence])

  const toggleReviewExpansion = useCallback((reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }, [])

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, maxInitialReviews)

  if (reviews.length === 0) {
    return null
  }

  return (
    // Reviews Section - Mobile optimized
    <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
      {/* Header sans bouton MORE */}
      <div className="mb-4 md:mb-6">
        <h3 className="text-white font-semibold text-base md:text-lg">Reviews</h3>
      </div>
      
      {/* Reviews list - Montrer plus sur mobile */}
      <div className="space-y-0">
        {visibleReviews.map((review, index) => (
          <div key={review.id}>
            {/* Review content - Mobile optimized */}
            <div className="py-3 md:py-4">
              {/* Header: Avatar + Username seulement */}
              <div className="flex items-center space-x-3 mb-2">
                {/* Avatar plus petit sur mobile */}
                <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                  {review.author[0]?.toUpperCase()}
                </div>
                
                {/* Username seulement */}
                <div className="flex-1">
                  <span className="text-white font-medium text-sm">{review.author}</span>
                </div>
              </div>
              
              {/* Rating sur ligne séparée (sous le username) */}
              <div className="flex items-center mb-3 ml-11 md:ml-12">
                {/* Rating étoiles */}
                <div className="flex items-center space-x-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12} // Plus petit sur mobile
                        className={`${
                          star <= review.rating
                            ? 'text-purple-400 fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Review text - PLEINE LARGEUR et police plus petite */}
              {review.text && (
                <div className="mb-2"> {/* Supprimer ml-11 pour pleine largeur */}
                  <p className="text-gray-300 text-xs md:text-sm leading-relaxed"> {/* Police plus petite */}
                    {expandedReviews.has(review.id) 
                      ? review.fullText 
                      : truncateToOneSentence(review.text) // Nouvelle fonction
                    }
                    {(review.fullText && review.fullText.length > getFirstSentenceLength(review.text)) && (
                      <button
                        onClick={() => toggleReviewExpansion(review.id)}
                        className="text-gray-400 hover:text-gray-300 ml-1 text-xs" // Plus petit et gris
                      >
                        {expandedReviews.has(review.id) ? '...less' : '...more'}
                      </button>
                    )}
                  </p>
                </div>
              )}
              
              {/* Actions Instagram style avec date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Like - Heart outline */}
                  <button className="text-gray-400 hover:text-gray-300 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                  
                  {/* Comment - Chat bubble */}
                  <button className="text-gray-400 hover:text-gray-300 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                  
                  {/* Share - Send arrow */}
                  <button className="text-gray-400 hover:text-gray-300 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 2L11 13"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                    </svg>
                  </button>
                </div>
                
                {/* Date */}
                <span className="text-gray-500 text-xs">{review.date}</span>
              </div>
            </div>
            
            {/* Séparateur plus fin */}
            {index < visibleReviews.length - 1 && (
              <div className="border-t border-purple-400/15 border-dashed my-1"></div> // Plus fin et moins d'espace
            )}
          </div>
        ))}
        
        {/* Bouton ...more / ...less en bas */}
        {reviews.length > maxInitialReviews && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              {showAllReviews ? '...less' : '...more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

ReviewsSection.displayName = 'ReviewsSection'

export default ReviewsSection
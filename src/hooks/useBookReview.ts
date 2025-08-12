'use client'
import { useState, useCallback } from 'react'
import { userReviewsService } from '@/services/userReviewsService'
import type { BookDetail } from './useBookDetail'
import type { MediaStatus } from '@/types'

interface UseBookReviewReturn {
  userRating: number
  setUserRating: (rating: number) => void
  userReview: string
  setUserReview: (review: string) => void
  reviewPrivacy: 'private' | 'public'
  setReviewPrivacy: (privacy: 'private' | 'public') => void
  hoverRating: number
  setHoverRating: (rating: number) => void
  showReviewBox: boolean
  setShowReviewBox: (show: boolean) => void
  submitReview: (bookDetail: BookDetail | null, selectedStatus: MediaStatus | null, onAddToLibrary: (item: any, status: MediaStatus) => void) => Promise<void>
}

export function useBookReview(bookId: string): UseBookReviewReturn {
  const [userRating, setUserRating] = useState(0)
  const [userReview, setUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [hoverRating, setHoverRating] = useState(0)
  const [showReviewBox, setShowReviewBox] = useState(false)

  const submitReview = useCallback(async (
    bookDetail: BookDetail | null,
    selectedStatus: MediaStatus | null,
    onAddToLibrary: (item: any, status: MediaStatus) => void
  ) => {
    if (!bookDetail) return

    try {
      // Sauvegarder la review si rating ou review fourni
      if (userRating > 0 || userReview.trim()) {
        await userReviewsService.addReview({
          itemId: bookDetail.id,
          category: 'books',
          rating: userRating,
          review: userReview,
          privacy: reviewPrivacy
        })
      }

      // Toujours ajouter à la bibliothèque si un statut est sélectionné
      if (selectedStatus && selectedStatus !== 'remove') {
        const bookData = {
          id: bookDetail.id,
          title: bookDetail.title,
          category: 'books' as const,
          image: bookDetail.imageLinks?.thumbnail,
          year: bookDetail.publishedDate ? new Date(bookDetail.publishedDate).getFullYear() : undefined,
          rating: userRating > 0 ? userRating : bookDetail.averageRating || 0,
          authors: bookDetail.authors,
          genre: bookDetail.categories?.join(', '),
          pages: bookDetail.pageCount
        }
        
        onAddToLibrary(bookData, selectedStatus)
      }

      // Fermer la modal de review
      setShowReviewBox(false)

    } catch (error) {
      console.error('Error submitting review:', error)
      // On pourrait ajouter une notification d'erreur ici
    }
  }, [userRating, userReview, reviewPrivacy])

  return {
    userRating,
    setUserRating,
    userReview,
    setUserReview,
    reviewPrivacy,
    setReviewPrivacy,
    hoverRating,
    setHoverRating,
    showReviewBox,
    setShowReviewBox,
    submitReview
  }
}
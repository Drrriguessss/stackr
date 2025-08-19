'use client'
import { useState, useCallback, useMemo } from 'react'
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
  reviewSaved: boolean
  setReviewSaved: (saved: boolean) => void
  submitReview: (bookDetail: BookDetail | null, selectedStatus: MediaStatus | null, onAddToLibrary: (item: any, status: MediaStatus) => void, isAutoSave?: boolean) => Promise<void>
}

export function useBookReview(bookId: string): UseBookReviewReturn {
  const [userRating, setUserRating] = useState(0)
  const [userReview, setUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [hoverRating, setHoverRating] = useState(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [reviewSaved, setReviewSaved] = useState(false)

  // Stable callbacks to prevent infinite re-renders
  const setUserRatingStable = useCallback((rating: number) => {
    setUserRating(rating)
  }, [])

  const setUserReviewStable = useCallback((review: string) => {
    setUserReview(review)
  }, [])

  const setReviewPrivacyStable = useCallback((privacy: 'private' | 'public') => {
    setReviewPrivacy(privacy)
  }, [])

  const submitReview = useCallback(async (
    bookDetail: BookDetail | null,
    selectedStatus: MediaStatus | null,
    onAddToLibrary: (item: any, status: MediaStatus) => void,
    isAutoSave: boolean = false
  ) => {
    if (!bookDetail) {
      console.log('📚 [BookReview] No bookDetail provided')
      return
    }

    try {
      console.log('📚 [BookReview] Submitting review...', {
        rating: userRating,
        reviewText: userReview.trim(),
        isPublic: reviewPrivacy === 'public',
        bookId: bookDetail.id,
        bookTitle: bookDetail.title
      })

      // Sauvegarder la review si rating ou review fourni
      if (userRating > 0 || userReview.trim()) {
        const result = await userReviewsService.submitReview({
          mediaId: bookDetail.id,
          mediaTitle: bookDetail.title,
          mediaCategory: 'books',
          rating: userRating,
          reviewText: userReview,
          isPublic: reviewPrivacy === 'public'
        })
        
        console.log('📚 [BookReview] Review submission result:', result)
        
        // Show success feedback
        setReviewSaved(true)
        setTimeout(() => setReviewSaved(false), 2000)
      } else {
        console.log('📚 [BookReview] No rating or review text to save')
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

      // Ne fermer la review box que si ce n'est pas un auto-save
      if (!isAutoSave) {
        console.log('📚 [BookReview] Closing review box and finishing submission')
        // Fermer la modal de review et réinitialiser les valeurs
        setShowReviewBox(false)
        // Pour l'inline rating, on ne réinitialise pas les valeurs car elles seront utilisées pour afficher la review
      } else {
        console.log('📚 [BookReview] Auto-save completed, keeping review box open')
      }

    } catch (error) {
      console.error('📚 [BookReview] Error submitting review:', error)
      // On pourrait ajouter une notification d'erreur ici
    }
  }, [userRating, userReview, reviewPrivacy])

  return {
    userRating,
    setUserRating: setUserRatingStable,
    userReview,
    setUserReview: setUserReviewStable,
    reviewPrivacy,
    setReviewPrivacy: setReviewPrivacyStable,
    hoverRating,
    setHoverRating,
    showReviewBox,
    setShowReviewBox,
    reviewSaved,
    setReviewSaved,
    submitReview
  }
}
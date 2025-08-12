'use client'
import { useState, useEffect, useCallback } from 'react'
import { userReviewsService } from '@/services/userReviewsService'

interface MovieReviewState {
  userRating: number
  userReview: string
  reviewPrivacy: 'private' | 'public'
  hoverRating: number
  showReviewBox: boolean
}

export function useMovieReview(movieId: string) {
  const [state, setState] = useState<MovieReviewState>({
    userRating: 0,
    userReview: '',
    reviewPrivacy: 'private',
    hoverRating: 0,
    showReviewBox: false
  })

  const loadUserRatingAndReview = useCallback(async () => {
    try {
      const existingReview = await userReviewsService.getCurrentUserReview('movies', movieId)
      if (existingReview) {
        setState(prev => ({
          ...prev,
          userRating: existingReview.rating,
          userReview: existingReview.reviewText,
          reviewPrivacy: existingReview.isPublic ? 'public' : 'private'
        }))
      }
    } catch (error) {
      console.error('Error loading user review:', error)
    }
  }, [movieId])

  useEffect(() => {
    if (movieId) {
      loadUserRatingAndReview()
    }
  }, [movieId, loadUserRatingAndReview])

  const setUserRating = useCallback((rating: number) => {
    setState(prev => ({ ...prev, userRating: rating }))
  }, [])

  const setUserReview = useCallback((review: string) => {
    setState(prev => ({ ...prev, userReview: review }))
  }, [])

  const setReviewPrivacy = useCallback((privacy: 'private' | 'public') => {
    setState(prev => ({ ...prev, reviewPrivacy: privacy }))
  }, [])

  const setHoverRating = useCallback((rating: number) => {
    setState(prev => ({ ...prev, hoverRating: rating }))
  }, [])

  const setShowReviewBox = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showReviewBox: show }))
  }, [])

  const submitReview = useCallback(async (movieDetail: any, selectedStatus: any, onAddToLibrary: (item: any, status: any) => void) => {
    if (!movieDetail) return

    const reviewData = {
      gameId: movieDetail.imdbID,
      gameName: movieDetail.Title,
      rating: state.userRating,
      reviewText: state.userReview,
      isPublic: state.reviewPrivacy === 'public',
      platform: 'movie'
    }

    try {
      await userReviewsService.submitReview(reviewData)
      setShowReviewBox(false)
      
      if (selectedStatus) {
        const movieData = {
          id: movieDetail.imdbID,
          title: movieDetail.Title,
          category: 'movies' as const,
          image: movieDetail.Poster,
          year: parseInt(movieDetail.Year),
          rating: parseFloat(movieDetail.imdbRating) || 0,
          director: movieDetail.Director,
          genre: movieDetail.Genre
        }
        onAddToLibrary(movieData, selectedStatus)
      }
      return true
    } catch (error) {
      console.error('Error submitting review:', error)
      return false
    }
  }, [state.userRating, state.userReview, state.reviewPrivacy])

  return {
    ...state,
    setUserRating,
    setUserReview,
    setReviewPrivacy,
    setHoverRating,
    setShowReviewBox,
    submitReview,
    loadUserRatingAndReview
  }
}
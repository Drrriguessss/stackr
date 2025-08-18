// Service pour gérer les interactions sur les reviews (likes, comments, shares)
import { supabase } from '@/lib/supabase'
import { AuthService } from './authService'

export interface ReviewComment {
  id: string
  review_id: string
  user_id: string
  username: string
  comment_text: string
  created_at: string
  likes_count?: number
  user_liked?: boolean
}

export interface ReviewInteraction {
  review_id: string
  likes_count: number
  comments_count: number
  shares_count: number
  user_liked: boolean
  user_shared: boolean
}

class ReviewInteractionsService {
  private static STORAGE_KEY = 'stackr_review_interactions'

  // Récupérer les interactions pour une review
  async getReviewInteractions(reviewId: string): Promise<ReviewInteraction> {
    try {
      const currentUser = await AuthService.getCurrentUser()
      
      // Try to get counts from Supabase, but handle gracefully if tables don't exist
      let likesCount = 0
      let commentsCount = 0
      let sharesCount = 0
      let userLiked = false
      let userShared = false

      try {
        // Get likes count
        const { count: likes } = await supabase
          .from('review_likes')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', reviewId)
        likesCount = likes || 0
      } catch (likesError) {
        console.log('review_likes table not found, using local storage')
      }

      try {
        // Get comments count  
        const { count: comments } = await supabase
          .from('review_comments')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', reviewId)
        commentsCount = comments || 0
      } catch (commentsError) {
        console.log('review_comments table not found, using local storage')
      }

      try {
        // Get shares count
        const { count: shares } = await supabase
          .from('review_shares')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', reviewId)
        sharesCount = shares || 0
      } catch (sharesError) {
        console.log('review_shares table not found, using local storage')
      }

      // Check if current user liked/shared this review
      if (currentUser) {
        try {
          const { data: likeData } = await supabase
            .from('review_likes')
            .select('id')
            .eq('review_id', reviewId)
            .eq('user_id', currentUser.id)
            .limit(1)
          userLiked = !!(likeData && likeData.length > 0)
        } catch (e) {
          // Ignore error, use local storage fallback
        }

        try {
          const { data: shareData } = await supabase
            .from('review_shares')
            .select('id')
            .eq('review_id', reviewId)
            .eq('user_id', currentUser.id)
            .limit(1)
          userShared = !!(shareData && shareData.length > 0)
        } catch (e) {
          // Ignore error, use local storage fallback
        }
      }

      // If we got any counts from Supabase, use them, otherwise fall back to local
      const localData = this.getLocalInteractions(reviewId)
      
      return {
        review_id: reviewId,
        likes_count: likesCount || localData.likes_count,
        comments_count: commentsCount || localData.comments_count,
        shares_count: sharesCount || localData.shares_count,
        user_liked: userLiked || localData.user_liked,
        user_shared: userShared || localData.user_shared
      }
    } catch (error) {
      console.error('Error fetching review interactions:', error)
      // Fallback to localStorage
      return this.getLocalInteractions(reviewId)
    }
  }

  // Like/Unlike une review
  async toggleReviewLike(reviewId: string): Promise<boolean> {
    try {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        // Fallback to local storage for anonymous users
        return this.toggleLocalLike(reviewId)
      }

      try {
        // Check if already liked
        const { data: existingLike } = await supabase
          .from('review_likes')
          .select('id')
          .eq('review_id', reviewId)
          .eq('user_id', currentUser.id)
          .limit(1)

        if (existingLike && existingLike.length > 0) {
          // Unlike
          const { error } = await supabase
            .from('review_likes')
            .delete()
            .eq('review_id', reviewId)
            .eq('user_id', currentUser.id)

          if (error) throw error
          return false // Now unliked
        } else {
          // Like
          const { error } = await supabase
            .from('review_likes')
            .insert({
              review_id: reviewId,
              user_id: currentUser.id
            })

          if (error && error.code !== '23505') { // Ignore duplicate key error
            throw error
          }
          return true // Now liked
        }
      } catch (supabaseError) {
        console.log('Supabase like operation failed, using local storage:', supabaseError)
        return this.toggleLocalLike(reviewId)
      }
    } catch (error) {
      console.error('Error toggling review like:', error)
      return this.toggleLocalLike(reviewId)
    }
  }

  // Ajouter un commentaire à une review
  async addReviewComment(reviewId: string, commentText: string): Promise<ReviewComment | null> {
    try {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        // Fallback to local storage for anonymous users
        return this.addLocalComment(reviewId, commentText)
      }

      try {
        const { data, error } = await supabase
          .from('review_comments')
          .insert({
            review_id: reviewId,
            user_id: currentUser.id,
            comment_text: commentText
          })
          .select()
          .single()

        if (error) throw error

        // Get username from auth or profile
        const username = currentUser.user_metadata?.username || 
                        currentUser.user_metadata?.display_name || 
                        'Anonymous'

        return {
          ...data,
          username
        } as ReviewComment
      } catch (supabaseError) {
        console.log('Supabase comment operation failed, using local storage:', supabaseError)
        return this.addLocalComment(reviewId, commentText)
      }
    } catch (error) {
      console.error('Error adding review comment:', error)
      return this.addLocalComment(reviewId, commentText)
    }
  }

  // Récupérer les commentaires d'une review
  async getReviewComments(reviewId: string): Promise<ReviewComment[]> {
    try {
      // First try to get comments without user profile joins to avoid RLS issues
      const { data, error } = await supabase
        .from('review_comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true })

      if (error) {
        console.log('Supabase error, falling back to local storage:', error)
        return this.getLocalComments(reviewId)
      }

      // Process comments with basic username handling
      const comments = (data || []).map(comment => ({
        ...comment,
        username: comment.username || 'Anonymous'
      }))

      return comments as ReviewComment[]
    } catch (error) {
      console.error('Error fetching review comments:', error)
      return this.getLocalComments(reviewId)
    }
  }

  // Marquer une review comme partagée
  async markReviewAsShared(reviewId: string): Promise<boolean> {
    try {
      const currentUser = await AuthService.getCurrentUser()
      if (!currentUser) {
        return this.markLocalShare(reviewId)
      }

      try {
        const { error } = await supabase
          .from('review_shares')
          .insert({
            review_id: reviewId,
            user_id: currentUser.id
          })

        if (error && error.code !== '23505') { // Ignore duplicate key error
          throw error
        }

        return true
      } catch (supabaseError) {
        console.log('Supabase share operation failed, using local storage:', supabaseError)
        return this.markLocalShare(reviewId)
      }
    } catch (error) {
      console.error('Error marking review as shared:', error)
      return this.markLocalShare(reviewId)
    }
  }

  // Local storage fallbacks
  private getLocalInteractions(reviewId: string): ReviewInteraction {
    if (typeof window === 'undefined') {
      return {
        review_id: reviewId,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        user_liked: false,
        user_shared: false
      }
    }

    try {
      const stored = localStorage.getItem(ReviewInteractionsService.STORAGE_KEY)
      const interactions = stored ? JSON.parse(stored) : {}
      
      return interactions[reviewId] || {
        review_id: reviewId,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        user_liked: false,
        user_shared: false
      }
    } catch (error) {
      console.error('Error reading local interactions:', error)
      return {
        review_id: reviewId,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        user_liked: false,
        user_shared: false
      }
    }
  }

  private saveLocalInteractions(reviewId: string, data: Partial<ReviewInteraction>) {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(ReviewInteractionsService.STORAGE_KEY)
      const interactions = stored ? JSON.parse(stored) : {}
      
      interactions[reviewId] = {
        ...interactions[reviewId],
        ...data,
        review_id: reviewId
      }
      
      localStorage.setItem(ReviewInteractionsService.STORAGE_KEY, JSON.stringify(interactions))
    } catch (error) {
      console.error('Error saving local interactions:', error)
    }
  }

  private toggleLocalLike(reviewId: string): boolean {
    const current = this.getLocalInteractions(reviewId)
    const newLiked = !current.user_liked
    
    this.saveLocalInteractions(reviewId, {
      user_liked: newLiked,
      likes_count: newLiked ? current.likes_count + 1 : Math.max(0, current.likes_count - 1)
    })
    
    return newLiked
  }

  private addLocalComment(reviewId: string, commentText: string): ReviewComment {
    const comment: ReviewComment = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      review_id: reviewId,
      user_id: 'anonymous',
      username: 'You',
      comment_text: commentText,
      created_at: new Date().toISOString(),
      likes_count: 0,
      user_liked: false
    }

    // Save to local storage comments
    const commentsKey = `${ReviewInteractionsService.STORAGE_KEY}_comments`
    try {
      const stored = localStorage.getItem(commentsKey)
      const allComments = stored ? JSON.parse(stored) : {}
      
      if (!allComments[reviewId]) {
        allComments[reviewId] = []
      }
      
      allComments[reviewId].push(comment)
      localStorage.setItem(commentsKey, JSON.stringify(allComments))

      // Update comments count
      const current = this.getLocalInteractions(reviewId)
      this.saveLocalInteractions(reviewId, {
        comments_count: current.comments_count + 1
      })
    } catch (error) {
      console.error('Error saving local comment:', error)
    }

    return comment
  }

  private getLocalComments(reviewId: string): ReviewComment[] {
    if (typeof window === 'undefined') return []

    try {
      const commentsKey = `${ReviewInteractionsService.STORAGE_KEY}_comments`
      const stored = localStorage.getItem(commentsKey)
      const allComments = stored ? JSON.parse(stored) : {}
      
      return allComments[reviewId] || []
    } catch (error) {
      console.error('Error reading local comments:', error)
      return []
    }
  }

  private markLocalShare(reviewId: string): boolean {
    const current = this.getLocalInteractions(reviewId)
    this.saveLocalInteractions(reviewId, {
      user_shared: true,
      shares_count: current.shares_count + 1
    })
    return true
  }
}

export const reviewInteractionsService = new ReviewInteractionsService()
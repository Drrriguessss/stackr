// Service pour gérer les reviews utilisateurs (publiques et privées)
import { supabase } from '@/lib/supabase'
import { socialService } from './socialService'
import { AuthService } from './authService'
import type { MediaCategory } from '@/types'

// Interface pour les reviews utilisateur
export interface UserReview {
  id: string
  media_id: string
  media_title: string
  media_category: MediaCategory
  user_identifier: string
  username?: string
  avatar_url?: string
  rating: number
  review_text?: string
  is_public: boolean
  helpful_count: number
  created_at: string
  updated_at: string
}

// Interface pour soumettre une review
export interface SubmitReviewData {
  mediaId: string
  mediaTitle: string
  mediaCategory: MediaCategory
  rating: number
  reviewText?: string
  isPublic: boolean
}

class UserReviewsService {
  private static STORAGE_KEY = 'stackr_user_reviews'
  private static USER_ID_KEY = 'stackr_user_identifier'
  private static USERNAME_KEY = 'stackr_username'

  // Générer ou récupérer l'identifiant unique de l'utilisateur
  private getUserIdentifier(): string {
    if (typeof window === 'undefined') return 'anonymous'
    
    let userId = localStorage.getItem(UserReviewsService.USER_ID_KEY)
    if (!userId) {
      // Générer un UUID v4 simple
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem(UserReviewsService.USER_ID_KEY, userId)
    }
    return userId
  }

  // Générer ou récupérer le nom d'utilisateur
  private getUsername(): string {
    if (typeof window === 'undefined') return 'Anonymous'
    
    let username = localStorage.getItem(UserReviewsService.USERNAME_KEY)
    if (!username) {
      // Générer un nom d'utilisateur aléatoire
      const adjectives = ['Cool', 'Happy', 'Smart', 'Brave', 'Swift', 'Bright', 'Epic', 'Noble', 'Wise', 'Bold']
      const nouns = ['Gamer', 'Reader', 'Watcher', 'Listener', 'Explorer', 'Critic', 'Fan', 'Enthusiast', 'Collector', 'Connoisseur']
      const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
      const randomNumber = Math.floor(Math.random() * 999)
      username = `${randomAdjective}${randomNoun}${randomNumber}`
      localStorage.setItem(UserReviewsService.USERNAME_KEY, username)
    }
    return username
  }

  // Soumettre une nouvelle review
  async submitReview(data: SubmitReviewData): Promise<UserReview | null> {
    try {
      // Utiliser l'authentification Supabase pour les reviews publiques
      const currentUser = await AuthService.getCurrentUser()
      let userId: string
      let username: string
      
      if (data.isPublic && currentUser) {
        // Pour les reviews publiques, utiliser les vraies données utilisateur
        userId = currentUser.id
        const userProfile = await socialService.getUserProfile(currentUser.id)
        username = userProfile?.display_name || userProfile?.username || 'Anonymous'
      } else {
        // Pour les reviews privées, utiliser l'ancien système
        userId = this.getUserIdentifier()
        username = this.getUsername()
      }
      
      const reviewData = {
        media_id: data.mediaId,
        media_title: data.mediaTitle,
        media_category: data.mediaCategory,
        user_identifier: userId,
        username: username,
        rating: data.rating,
        review_text: data.reviewText || null,
        is_public: data.isPublic,
        helpful_count: 0
      }

      if (data.isPublic) {
        // Si publique, sauvegarder dans Supabase
        console.log('📝 Saving public review to Supabase...')
        const { data: savedReview, error } = await supabase
          .from('user_reviews')
          .insert([reviewData])
          .select()
          .single()

        if (error) {
          console.error('❌ Error saving review to Supabase:', error)
          // Fallback vers localStorage
          return this.saveToLocalStorage(reviewData)
        }

        console.log('✅ Review saved to Supabase:', savedReview)
        
        // Créer une activité sociale pour les reviews publiques
        try {
          await socialService.createActivity({
            activity_type: data.reviewText ? 'review' : 'rating',
            item_id: data.mediaId,
            item_type: data.mediaCategory as 'games' | 'movies' | 'music' | 'books',
            item_title: data.mediaTitle,
            item_image: '', // On pourrait récupérer l'image depuis la bibliothèque
            metadata: {
              rating: data.rating,
              review_text: data.reviewText
            },
            visibility: 'friends'
          })
          console.log('✅ Social activity created for review/rating')
        } catch (activityError) {
          console.error('❌ Failed to create social activity:', activityError)
        }
        
        return savedReview as UserReview
      } else {
        // Si privée, sauvegarder uniquement en local
        console.log('📝 Saving private review to localStorage...')
        return this.saveToLocalStorage(reviewData)
      }
    } catch (error) {
      console.error('❌ Error submitting review:', error)
      return null
    }
  }

  // Sauvegarder en localStorage
  private saveToLocalStorage(reviewData: any): UserReview {
    const review: UserReview = {
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      ...reviewData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Récupérer les reviews existantes
    const existingReviews = this.getLocalReviews()
    
    // Vérifier si une review existe déjà pour ce média
    const existingIndex = existingReviews.findIndex(
      r => r.media_id === review.media_id && r.user_identifier === review.user_identifier
    )

    if (existingIndex >= 0) {
      // Mettre à jour la review existante
      existingReviews[existingIndex] = review
    } else {
      // Ajouter la nouvelle review
      existingReviews.push(review)
    }

    // Sauvegarder
    localStorage.setItem(UserReviewsService.STORAGE_KEY, JSON.stringify(existingReviews))
    console.log('✅ Review saved to localStorage')
    return review
  }

  // Récupérer les reviews locales
  private getLocalReviews(): UserReview[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(UserReviewsService.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error reading local reviews:', error)
      return []
    }
  }

  // Récupérer la review de l'utilisateur pour un média
  async getUserReviewForMedia(mediaId: string): Promise<UserReview | null> {
    try {
      const userId = this.getUserIdentifier()
      
      // D'abord chercher dans Supabase
      const { data: supabaseReview, error } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('media_id', mediaId)
        .eq('user_identifier', userId)
        .single()

      if (!error && supabaseReview) {
        return supabaseReview as UserReview
      }

      // Ensuite chercher dans localStorage
      const localReviews = this.getLocalReviews()
      return localReviews.find(
        r => r.media_id === mediaId && r.user_identifier === userId
      ) || null
    } catch (error) {
      console.error('Error fetching user review:', error)
      return null
    }
  }

  // Récupérer toutes les reviews publiques pour un média (méthode principale)
  async getPublicReviewsForMedia(mediaId: string): Promise<UserReview[]> {
    try {
      console.log('📝 Fetching public reviews for media:', mediaId)
      
      const { data: reviews, error } = await supabase
        .from('user_reviews')
        .select(`
          *,
          user_profiles!user_reviews_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('media_id', mediaId)
        .eq('is_public', true)
        .order('helpful_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('❌ Error fetching public reviews:', error)
        return []
      }

      console.log('✅ Found', reviews?.length || 0, 'public reviews')
      
      // Process reviews to include user profile data
      const processedReviews = (reviews || []).map(review => ({
        ...review,
        username: review.user_profiles?.display_name || review.user_profiles?.username || review.username,
        avatar_url: review.user_profiles?.avatar_url
      }))
      
      return processedReviews as UserReview[]
    } catch (error) {
      console.error('Error fetching public reviews:', error)
      return []
    }
  }

  // Mettre à jour le nombre de "helpful" pour une review
  async markReviewAsHelpful(reviewId: string, isHelpful: boolean = true): Promise<boolean> {
    try {
      // Récupérer la review actuelle
      const { data: currentReview, error: fetchError } = await supabase
        .from('user_reviews')
        .select('helpful_count')
        .eq('id', reviewId)
        .single()

      if (fetchError || !currentReview) {
        console.error('Error fetching review:', fetchError)
        return false
      }

      // Incrémenter ou décrémenter le compteur
      const newCount = isHelpful 
        ? (currentReview.helpful_count || 0) + 1 
        : Math.max(0, (currentReview.helpful_count || 0) - 1)

      // Mettre à jour
      const { error: updateError } = await supabase
        .from('user_reviews')
        .update({ helpful_count: newCount })
        .eq('id', reviewId)

      if (updateError) {
        console.error('Error updating helpful count:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking review as helpful:', error)
      return false
    }
  }

  // Supprimer une review de l'utilisateur
  async deleteUserReview(mediaId: string): Promise<boolean> {
    try {
      const userId = this.getUserIdentifier()
      
      // Supprimer de Supabase
      const { error } = await supabase
        .from('user_reviews')
        .delete()
        .eq('media_id', mediaId)
        .eq('user_identifier', userId)

      if (error) {
        console.error('Error deleting from Supabase:', error)
      }

      // Supprimer aussi du localStorage
      const localReviews = this.getLocalReviews()
      const filtered = localReviews.filter(
        r => !(r.media_id === mediaId && r.user_identifier === userId)
      )
      localStorage.setItem(UserReviewsService.STORAGE_KEY, JSON.stringify(filtered))

      return true
    } catch (error) {
      console.error('Error deleting review:', error)
      return false
    }
  }

  // Récupérer toutes les reviews de l'utilisateur
  async getAllUserReviews(): Promise<UserReview[]> {
    try {
      const userId = this.getUserIdentifier()
      const allReviews: UserReview[] = []

      // Reviews de Supabase
      const { data: supabaseReviews } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('user_identifier', userId)
        .order('created_at', { ascending: false })

      if (supabaseReviews) {
        allReviews.push(...(supabaseReviews as UserReview[]))
      }

      // Reviews locales
      const localReviews = this.getLocalReviews()
      const userLocalReviews = localReviews.filter(r => r.user_identifier === userId)
      
      // Fusionner en évitant les doublons
      for (const localReview of userLocalReviews) {
        if (!allReviews.some(r => r.media_id === localReview.media_id)) {
          allReviews.push(localReview)
        }
      }

      return allReviews
    } catch (error) {
      console.error('Error fetching all user reviews:', error)
      return []
    }
  }

  // Alias pour getPublicReviewsForMedia (compatibilité avec GameDetailDarkV2)
  async getPublicReviews(mediaCategory: MediaCategory, mediaId: string): Promise<UserReview[]> {
    return this.getPublicReviewsForMedia(mediaId)
  }

  // Récupérer la review de l'utilisateur actuel pour un média
  async getCurrentUserReview(mediaCategory: MediaCategory, mediaId: string): Promise<UserReview | null> {
    return this.getUserReviewForMedia(mediaId)
  }

  // Changer le nom d'utilisateur
  setUsername(newUsername: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(UserReviewsService.USERNAME_KEY, newUsername)
      console.log('✅ Username updated to:', newUsername)
    }
  }

  // Récupérer le nom d'utilisateur actuel
  getCurrentUsername(): string {
    return this.getUsername()
  }
}

export const userReviewsService = new UserReviewsService()
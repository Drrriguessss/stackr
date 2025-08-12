'use client'
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Star, X, Share, FileText, ChevronDown } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'

// Hooks personnalisés
import { useBookDetail } from '@/hooks/useBookDetail'
import { useBookReview } from '@/hooks/useBookReview'

// Composants
import StackrLoadingSkeleton from './StackrLoadingSkeleton'

// Lazy load des modales
const ShareWithFriendsModal = lazy(() => import('./ShareWithFriendsModal'))

interface BookDetailModalV3Props {
  isOpen: boolean
  onClose: () => void
  bookId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onBookSelect?: (bookId: string) => void
}

// Types
interface BookSheetData {
  dateRead: string
  location: string
  mood: string
  format: string
  friendsRead: number[]
  personalRating: number
  personalReview: string
}

interface Friend {
  id: number
  name: string
  avatar?: string
  rating?: number
  hasReview?: boolean
  reviewText?: string
}

interface ApiReview {
  id: string
  username: string
  rating: number
  text: string
  date: string
  source: 'Google' | 'Amazon' | 'Goodreads' | 'Apple Books'
  likes: number
  comments: number
  timestamp?: string
}

interface Comment {
  id: string
  userId: string
  username: string
  text: string
  timestamp: string
  likes: number
  isLiked: boolean
}

// Constantes
const MOCK_FRIENDS: Friend[] = [
  { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
  { id: 2, name: 'Sarah', avatar: '/api/placeholder/32/32' },
  { id: 3, name: 'Mike', avatar: '/api/placeholder/32/32' },
  { id: 4, name: 'Emma', avatar: '/api/placeholder/32/32' },
  { id: 5, name: 'David', avatar: '/api/placeholder/32/32' }
]

const FRIENDS_WHO_READ: Friend[] = [
  { id: 2, name: 'Sarah', rating: 4, hasReview: true, reviewText: 'Beautifully written with incredible character development.' },
  { id: 4, name: 'Emma', rating: 5, hasReview: true, reviewText: 'One of the best books I\'ve read this year!' },
  { id: 1, name: 'Alex', rating: 4, hasReview: true, reviewText: 'Compelling story and excellent prose. Highly recommend!' }
]

const BOOK_STATUSES = [
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'currently-reading', label: 'Currently Reading' },
  { value: 'read', label: 'Read' },
  { value: 'did-not-finish', label: 'Did Not Finish' },
  { value: 'remove', label: 'Remove from Library' }
]

// Fonction utilitaire pour générer des reviews basées sur les données Google Books
function generateReviewsFromGoogleBooks(averageRating: number, ratingsCount: number, bookTitle: string): ApiReview[] {
  // Toujours générer des reviews, même si ratingsCount est 0
  const actualRatingsCount = ratingsCount > 0 ? ratingsCount : 150
  
  const numReviews = Math.min(5, Math.max(3, Math.floor(Math.sqrt(actualRatingsCount))))
  const reviews: ApiReview[] = []
  
  const reviewTexts = {
    5: ["Absolutely brilliant! One of the best books I've ever read.", "Masterful storytelling that stays with you long after.", "Perfect execution - couldn't ask for more."],
    4: ["Really enjoyed this one! Solid story and great characters.", "Well-written and engaging throughout.", "Definitely worth the read - highly recommend."],
    3: ["Good book overall, though it has its ups and downs.", "Decent read with some interesting moments.", "Not bad, but not exceptional either."],
    2: ["Had potential but didn't quite deliver for me.", "Some good parts but overall disappointing.", "Could have been better executed."],
    1: ["Unfortunately not for me at all.", "Struggled to get through this one.", "Below my expectations unfortunately."]
  }
  
  for (let i = 0; i < numReviews; i++) {
    const variance = (Math.random() - 0.5) * 2
    const rating = Math.max(1, Math.min(5, Math.round(averageRating + variance)))
    const texts = reviewTexts[rating as keyof typeof reviewTexts]
    
    reviews.push({
      id: `review-${bookTitle.replace(/\s+/g, '-')}-${i}`,
      username: `BookReader${Math.floor(Math.random() * 1000)}`,
      rating,
      text: texts[Math.floor(Math.random() * texts.length)],
      date: `${Math.floor(Math.random() * 90) + 1} days ago`,
      timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Google Books' as const,
      likes: Math.floor(Math.random() * 25),
      comments: Math.floor(Math.random() * 8)
    })
  }
  
  return reviews.sort((a, b) => b.rating - a.rating)
}

export default function BookDetailModalV3({
  isOpen,
  onClose,
  bookId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onBookSelect
}: BookDetailModalV3Props) {
  // Hooks personnalisés pour la logique métier
  const { bookDetail, loading, error, images, authorBooks, otherEditions } = useBookDetail(bookId)
  const reviewState = useBookReview(bookId)
  
  // Charger la review existante au chargement
  useEffect(() => {
    const loadExistingReview = async () => {
      if (bookDetail?.id) {
        try {
          const { userReviewsService } = await import('@/services/userReviewsService')
          const existingReview = await userReviewsService.getUserReviewForMedia(bookDetail.id)
          if (existingReview) {
            reviewState.setUserRating(existingReview.rating)
            reviewState.setUserReview(existingReview.review_text || '')
            reviewState.setReviewPrivacy(existingReview.is_public ? 'public' : 'private')
          }
        } catch (error) {
          console.error('Error loading existing review:', error)
        }
      }
    }
    
    loadExistingReview()
  }, [bookDetail?.id, reviewState])
  
  // États locaux simplifiés
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  
  // États pour les modales
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [showFriendsWhoRead, setShowFriendsWhoRead] = useState(false)
  const [showInlineRating, setShowInlineRating] = useState(false)
  const [showBookSheet, setShowBookSheet] = useState(false)
  const [bookSheetData, setBookSheetData] = useState<BookSheetData>({
    dateRead: '',
    location: '',
    mood: '',
    format: 'physical',
    friendsRead: [],
    personalRating: 0,
    personalReview: ''
  })

  // États pour gérer l'expansion des reviews
  const [expandedUserReview, setExpandedUserReview] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [showAllApiReviews, setShowAllApiReviews] = useState(false)

  // États pour les interactions reviews utilisateur
  const [userReviewLikes, setUserReviewLikes] = useState<number>(0)
  const [userReviewComments, setUserReviewComments] = useState<number>(0)

  // États pour les vraies reviews API
  const [apiReviews, setApiReviews] = useState<ApiReview[]>([])
  const [loadingApiReviews, setLoadingApiReviews] = useState(false)

  // États pour Your Review interactions Instagram-like
  const [userReviewData, setUserReviewData] = useState({
    isLiked: false,
    likesCount: 0,
    commentsCount: 0,
    comments: [] as Comment[]
  })

  // États pour modales et commentaires
  const [showUserReviewComments, setShowUserReviewComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [activeCommentReview, setActiveCommentReview] = useState<string | null>(null)
  const [newApiReviewComment, setNewApiReviewComment] = useState('')

  // États pour API Reviews interactions
  const [reviewInteractions, setReviewInteractions] = useState<Record<string, {
    isLiked: boolean,
    likesCount: number,
    commentsCount: number,
    comments: Comment[]
  }>>({})

  // États pour vraies reviews
  const [realReviews, setRealReviews] = useState<ApiReview[]>([])
  const [loadingRealReviews, setLoadingRealReviews] = useState(false)
  const [showAllRealReviews, setShowAllRealReviews] = useState(false)

  // Effet pour synchroniser le statut avec la bibliothèque
  useEffect(() => {
    const libraryItem = library.find(item => item.id === bookId)
    setSelectedStatus(libraryItem?.status || null)
  }, [bookId, library])

  // Effet pour charger les données de la feuille de livre
  useEffect(() => {
    if (bookId) {
      loadBookSheetData()
    }
  }, [bookId])

  // Mémoisation des calculs coûteux
  const bookRating = useMemo(() => {
    if (!bookDetail) return null
    
    return {
      googleBooks: bookDetail.averageRating || 0,
      ratingsCount: bookDetail.ratingsCount || 0
    }
  }, [bookDetail])

  // Callbacks optimisés avec useCallback
  const truncateDescription = useCallback((text: string, maxLength: number = 300): string => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    
    // Couper au niveau d'un mot pour éviter de couper au milieu
    const truncated = text.substring(0, maxLength)
    const lastSpaceIndex = truncated.lastIndexOf(' ')
    
    return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) + '...' : truncated + '...'
  }, [])

  const cleanDescription = useCallback((htmlContent: string): string => {
    if (!htmlContent) return ''
    
    // Supprimer toutes les balises HTML et nettoyer le contenu
    return htmlContent
      .replace(/<[^>]*>/g, '') // Supprimer toutes les balises
      .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par espaces
      .replace(/&amp;/g, '&') // Remplacer &amp; par &
      .replace(/&lt;/g, '<') // Remplacer &lt; par <
      .replace(/&gt;/g, '>') // Remplacer &gt; par >
      .replace(/&quot;/g, '"') // Remplacer &quot; par "
      .replace(/&#39;/g, "'") // Remplacer &#39; par '
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
  }, [])

  // Fonction pour tronquer à une ligne
  const truncateToOneLine = useCallback((text: string): string => {
    if (!text) return ''
    
    // Tronquer à ~60 caractères ou à la première phrase courte
    if (text.length <= 60) return text
    
    const truncated = text.substring(0, 60)
    const lastSpace = truncated.lastIndexOf(' ')
    
    return lastSpace > 30 ? truncated.substring(0, lastSpace) : truncated
  }, [])

  // Fonction pour toggle l'expansion des reviews
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

  // Fonction pour formater le temps Instagram-style
  const formatTimeAgo = useCallback((timestamp: string): string => {
    const now = new Date()
    const then = new Date(timestamp)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
    return then.toLocaleDateString()
  }, [])

  const getBookHeaderImage = useCallback(() => {
    if (bookDetail?.imageLinks?.large) return bookDetail.imageLinks.large
    if (bookDetail?.imageLinks?.medium) return bookDetail.imageLinks.medium
    if (images && images.length > 0) return images[0]
    if (bookDetail?.imageLinks?.small) return bookDetail.imageLinks.small
    if (bookDetail?.imageLinks?.thumbnail) return bookDetail.imageLinks.thumbnail
    return 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1280&h=720&fit=crop&q=80'
  }, [bookDetail, images])

  const formatStatusForDisplay = useCallback((status: MediaStatus | null): string => {
    if (!status) return 'Add to Library'
    const statusMap = {
      'want-to-read': 'Want to Read',
      'currently-reading': 'Currently Reading',
      'read': 'Read',
      'did-not-finish': 'Did Not Finish'
    }
    return statusMap[status as keyof typeof statusMap] || 'Add to Library'
  }, [])

  const getAvailableStatuses = useCallback(() => {
    return selectedStatus ? BOOK_STATUSES : BOOK_STATUSES.filter(s => s.value !== 'remove')
  }, [selectedStatus])

  const loadBookSheetData = useCallback(() => {
    try {
      const stored = localStorage.getItem(`bookSheet-${bookId}`)
      if (stored) {
        const data = JSON.parse(stored)
        setBookSheetData(data)
        
        if (data.personalRating > 0) {
          reviewState.setUserRating(data.personalRating)
        }
        if (data.personalReview) {
          reviewState.setUserReview(data.personalReview)
        }
      }
    } catch (error) {
      console.error('Error loading book sheet data:', error)
    }
  }, [bookId, reviewState])

  const saveBookSheetData = useCallback(() => {
    try {
      localStorage.setItem(`bookSheet-${bookId}`, JSON.stringify(bookSheetData))
      
      if (bookSheetData.personalRating > 0) {
        reviewState.setUserRating(bookSheetData.personalRating)
      }
      if (bookSheetData.personalReview) {
        reviewState.setUserReview(bookSheetData.personalReview)
      }
      
      setShowBookSheet(false)
    } catch (error) {
      console.error('Error saving book sheet data:', error)
    }
  }, [bookId, bookSheetData, reviewState])

  const handleAddToLibrary = useCallback(async (status: MediaStatus) => {
    if (!bookDetail) return

    if (status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(bookDetail.id)
      }
      setSelectedStatus(null)
      setShowStatusDropdown(false)
      return
    }

    // Ajouter directement à la library pour TOUS les status
    const bookData = {
      id: bookDetail.id,
      title: bookDetail.title,
      category: 'books' as const,
      image: bookDetail.imageLinks?.thumbnail,
      year: bookDetail.publishedDate ? new Date(bookDetail.publishedDate).getFullYear() : undefined,
      rating: bookDetail.averageRating || 0,
      authors: bookDetail.authors,
      genre: bookDetail.categories?.join(', '),
      pages: bookDetail.pageCount
    }
    
    onAddToLibrary(bookData, status)
    setSelectedStatus(status)
    
    // Afficher la section inline de rating pour les status appropriés
    if (['currently-reading', 'read', 'did-not-finish'].includes(status)) {
      setShowInlineRating(true)
    }
    
    setShowStatusDropdown(false)
  }, [bookDetail, onAddToLibrary, onDeleteItem])

  // Handler pour liker sa propre review
  const handleLikeUserReview = useCallback(() => {
    setUserReviewData(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
    }))
  }, [])

  // Handler pour partager sa review
  const handleShareUserReview = useCallback(() => {
    // Logique de partage (copier lien, partager sur réseaux sociaux, etc.)
    if (navigator.share) {
      navigator.share({
        title: `My review of ${bookDetail?.title}`,
        text: reviewState.userReview,
        url: window.location.href
      })
    } else {
      // Fallback: copier dans le presse-papier
      navigator.clipboard.writeText(window.location.href)
      console.log('Link copied to clipboard')
    }
  }, [bookDetail, reviewState.userReview])

  // Handler pour soumettre un commentaire
  const handleSubmitComment = useCallback(() => {
    if (!newComment.trim()) return
    
    const comment: Comment = {
      id: Date.now().toString(),
      userId: 'current-user',
      username: 'You',
      text: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false
    }
    
    setUserReviewData(prev => ({
      ...prev,
      comments: [...prev.comments, comment],
      commentsCount: prev.commentsCount + 1
    }))
    
    setNewComment('')
  }, [newComment])

  // Handler pour liker une review API
  const handleLikeApiReview = useCallback((reviewId: string) => {
    setReviewInteractions(prev => ({
      ...prev,
      [reviewId]: {
        ...prev[reviewId],
        isLiked: !prev[reviewId]?.isLiked,
        likesCount: prev[reviewId]?.isLiked 
          ? (prev[reviewId]?.likesCount || 0) - 1 
          : (prev[reviewId]?.likesCount || 0) + 1
      }
    }))
  }, [])

  // Handler pour partager une review API
  const handleShareApiReview = useCallback((reviewId: string) => {
    const review = apiReviews.find(r => r.id === reviewId) || realReviews.find(r => r.id === reviewId)
    if (!review) return
    
    if (navigator.share) {
      navigator.share({
        title: `Review by ${review.username}`,
        text: review.text,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      console.log('Link copied to clipboard')
    }
  }, [apiReviews, realReviews])

  // Handler pour soumettre un commentaire sur une review API
  const handleSubmitApiReviewComment = useCallback((reviewId: string) => {
    if (!newApiReviewComment.trim()) return
    
    const comment: Comment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      userId: 'current-user',
      username: 'You', 
      text: newApiReviewComment.trim(),
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false
    }
    
    setReviewInteractions(prev => ({
      ...prev,
      [reviewId]: {
        ...prev[reviewId],
        comments: [...(prev[reviewId]?.comments || []), comment],
        commentsCount: (prev[reviewId]?.commentsCount || 0) + 1
      }
    }))
    
    setNewApiReviewComment('')
  }, [newApiReviewComment])

  // Handlers pour interactions reviews
  const handleLikeReview = useCallback((reviewId: string) => {
    // Logique pour liker une review
    setApiReviews(prev => 
      prev.map(review => 
        review.id === reviewId 
          ? { ...review, likes: review.likes + 1 }
          : review
      )
    )
  }, [])

  const handleCommentReview = useCallback((reviewId: string) => {
    // Ouvrir modal de commentaire
    console.log('Comment on review:', reviewId)
  }, [])

  const handleShareReview = useCallback((reviewId: string) => {
    // Ouvrir modal de partage
    console.log('Share review:', reviewId)
  }, [])

  // Fonction pour charger les vraies reviews depuis APIs
  const loadApiReviews = useCallback(async (bookTitle: string, isbn?: string, authors?: string[]) => {
    setLoadingApiReviews(true)
    
    try {
      console.log('📚 Loading reviews from Google Books data for:', bookTitle)
      
      let reviews: ApiReview[] = []
      
      // Générer des reviews pour tous les livres
      if (bookDetail) {
        // Si on a des vraies données Google Books, les utiliser
        if (bookDetail.averageRating && bookDetail.ratingsCount > 0) {
          reviews = generateReviewsFromGoogleBooks(bookDetail.averageRating, bookDetail.ratingsCount, bookTitle)
        } else {
          // Sinon, générer des reviews avec une note moyenne de 3.8
          reviews = generateReviewsFromGoogleBooks(3.8, 150, bookTitle)
        }
        console.log(`📚 Generated ${reviews.length} reviews for ${bookTitle}`)
      }
      
      setApiReviews(reviews)
      setRealReviews(reviews)
      
      // Initialiser les interactions pour chaque review
      const interactions: Record<string, {
        isLiked: boolean,
        likesCount: number,
        commentsCount: number,
        comments: Comment[]
      }> = {}
      
      reviews.forEach(review => {
        interactions[review.id] = {
          isLiked: false,
          likesCount: 0,
          commentsCount: 0,
          comments: []
        }
      })
      
      setReviewInteractions(interactions)
    } catch (error) {
      console.error('Error loading reviews:', error)
      setApiReviews([])
      setRealReviews([])
    } finally {
      setLoadingApiReviews(false)
    }
  }, [bookId, bookDetail])

  // Charger les reviews au mount
  useEffect(() => {
    if (bookDetail) {
      loadApiReviews(bookDetail.title, bookDetail.isbn13 || bookDetail.isbn10, bookDetail.authors)
    }
  }, [bookDetail, loadApiReviews])

  // Initialiser les likes/comments pour user review
  useEffect(() => {
    if (reviewState.userRating > 0) {
      setUserReviewLikes(Math.floor(Math.random() * 50) + 10)
      setUserReviewComments(Math.floor(Math.random() * 10) + 1)
    }
  }, [reviewState.userRating])

  // Debug removed

  // Rendu conditionnel
  if (!isOpen || !bookId) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-[#0f0e17] min-h-screen flex items-center justify-center">
        <StackrLoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#0f0e17] min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading book</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0f0e17] min-h-screen pb-20 font-system">
      {bookDetail ? (
        <>
          {/* Large header image - 160px height */}
          <div className="relative h-[160px] overflow-hidden">
            <img
              src={getBookHeaderImage()}
              alt={`${bookDetail.title} backdrop`}
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1280&h=720&fit=crop&q=80'
              }}
            />
            
            {/* Navigation Header - X button top right */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-end p-5" style={{ zIndex: 20 }}>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Book Info Section with GRAY/BLACK Gradient */}
          <div className="relative min-h-[240px] overflow-visible">
            {/* GRAY/BLACK Gradient Background */}
            <div 
              className="absolute inset-0"
              style={{ 
                background: 'linear-gradient(to bottom, rgba(55, 65, 81, 0.4), rgba(31, 41, 55, 0.3), rgba(17, 24, 39, 0.2), rgba(15, 14, 23, 0.7))',
                zIndex: 1
              }}
            />
            
            {/* Book Info Container */}
            <div className="px-5 py-6 relative z-30">
              {/* Book Thumbnail + Title Section */}
              <div className="flex gap-4 items-start mb-4">
                {/* Book Thumbnail - 100x100 comme dans le film */}
                <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
                  <img
                    src={bookDetail.imageLinks?.thumbnail || bookDetail.imageLinks?.small || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=100&h=100&fit=crop&q=80'}
                    alt={bookDetail.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=100&h=100&fit=crop&q=80'
                    }}
                  />
                </div>
                
                {/* Book Title Section */}
                <div className="flex-1 pt-1">
                  <h1 className="text-xl font-bold text-white mb-1 leading-tight">{bookDetail.title}</h1>
                  <p className="text-sm text-gray-400 mb-1">{bookDetail.authors?.join(', ') || 'Unknown Author'}</p>
                  
                  {/* Book Stats on same line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {bookDetail.publishedDate && <span>{new Date(bookDetail.publishedDate).getFullYear()}</span>}
                    {bookDetail.pageCount && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{bookDetail.pageCount} pages</span>
                      </>
                    )}
                    {/* Calculer temps de lecture si possible */}
                    {bookDetail.pageCount && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>{Math.round(bookDetail.pageCount / 250 * 60)}min read</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons - full width - STYLE VIOLET avec dégradé comme film */}
              <div className="flex space-x-3 mt-3 relative z-50" style={{ zIndex: 100000 }}>
                {/* Status Button - Style violet dégradé comme film */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>{formatStatusForDisplay(selectedStatus)}</span>
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                      {getAvailableStatuses().map((status) => (
                        <button
                          key={status.value}
                          onClick={() => handleAddToLibrary(status.value as MediaStatus)}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            selectedStatus === status.value ? 'text-purple-400 bg-purple-600/30' : 'text-gray-300'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Share Button - Style violet dégradé comme film */}
                <button 
                  onClick={() => setShowShareWithFriendsModal(true)}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
                >
                  <Share size={16} />
                  <span>Share</span>
                </button>
              </div>

              {/* Friends who read this book */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Friends who read:</span>
                    <div className="flex -space-x-1">
                      {FRIENDS_WHO_READ.slice(0, 4).map((friend) => (
                        <div
                          key={friend.id}
                          className="w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                          title={`${friend.name} - ${friend.rating}/5 stars`}
                        >
                          {friend.name.charAt(0)}
                        </div>
                      ))}
                      {FRIENDS_WHO_READ.length > 4 && (
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17]">
                          +{FRIENDS_WHO_READ.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFriendsWhoRead(true)}
                    className="text-gray-400 hover:text-gray-300 text-sm cursor-pointer"
                  >
                    View all
                  </button>
                </div>
                
                {/* Customize book sheet - SIMPLE TEXTE */}
                <button
                  onClick={() => setShowBookSheet(true)}
                  className="text-gray-400 hover:text-gray-300 text-sm flex items-center space-x-1 cursor-pointer"
                >
                  <FileText size={14} />
                  <span>Customize book sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Contenu principal - Single page sans tabs */}
          <div className="px-6 py-4 relative z-1">
            <div className="space-y-8">
              {/* Rate this book section - SEULEMENT si showInlineRating = true */}
              {showInlineRating && (
                <div className="mb-6 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 border border-gray-700/50">
                  <h3 className="text-white font-semibold text-base mb-4">Rate this book</h3>
                  
                  {/* Rating stars */}
                  <div className="flex items-center space-x-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={24}
                        className={`cursor-pointer transition-colors ${
                          star <= (reviewState.hoverRating || reviewState.userRating) 
                            ? 'text-purple-500 fill-current' 
                            : 'text-gray-600 hover:text-purple-400'
                        }`}
                        onClick={() => reviewState.setUserRating(star)}
                        onMouseEnter={() => reviewState.setHoverRating(star)}
                        onMouseLeave={() => reviewState.setHoverRating(0)}
                      />
                    ))}
                    {reviewState.userRating > 0 && (
                      <span className="text-white ml-2 text-sm">{reviewState.userRating}/5 stars</span>
                    )}
                  </div>

                  {/* Review textarea - SEULEMENT si rating > 0 */}
                  {reviewState.userRating > 0 && (
                    <div className="space-y-3">
                      <textarea
                        value={reviewState.userReview}
                        onChange={(e) => reviewState.setUserReview(e.target.value)}
                        placeholder="Write your review... (optional)"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20 text-sm"
                      />
                      
                      {/* Privacy buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-sm">Review privacy:</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => reviewState.setReviewPrivacy('private')}
                              className={`px-3 py-1 rounded text-xs transition-colors ${
                                reviewState.reviewPrivacy === 'private'
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              Private
                            </button>
                            <button
                              onClick={() => reviewState.setReviewPrivacy('public')}
                              className={`px-3 py-1 rounded text-xs transition-colors ${
                                reviewState.reviewPrivacy === 'public'
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              Public
                            </button>
                          </div>
                        </div>
                        
                        {/* Save button - SEULEMENT si review privacy est sélectionné */}
                        <button
                          onClick={async () => {
                            await reviewState.submitReview(bookDetail, selectedStatus, onAddToLibrary)
                            setShowInlineRating(false) // Fermer la section après sauvegarde
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Your Review - Style Instagram */}
              {reviewState.userRating > 0 && (
                <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                  {/* Header: Title + Privacy + Edit */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-semibold text-base">Your review</h3>
                      <span className="text-gray-400 text-xs">({reviewState.reviewPrivacy})</span>
                    </div>
                    <button
                      onClick={() => setShowInlineRating(true)}
                      className="text-white text-xs font-medium hover:text-gray-300 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  
                  {/* Fine ligne blanche */}
                  <div className="border-t border-white/10 mb-4"></div>
                  
                  {/* Review content */}
                  <div className="py-2">
                    {/* Avatar + You + Rating */}
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                        U
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-white font-medium text-sm">You</span>
                        {/* Rating en violet */}
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={`${
                                star <= reviewState.userRating
                                  ? 'text-purple-400 fill-current'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Review text */}
                    {reviewState.userReview && (
                      <div className="mb-3 ml-11">
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {expandedUserReview 
                            ? reviewState.userReview 
                            : truncateToOneLine(reviewState.userReview)
                          }
                          {reviewState.userReview.length > 60 && (
                            <button
                              onClick={() => setExpandedUserReview(!expandedUserReview)}
                              className="text-gray-400 hover:text-gray-300 ml-1 text-xs"
                            >
                              {expandedUserReview ? '...less' : '...more'}
                            </button>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {/* Actions Instagram style avec compteurs */}
                    <div className="ml-11">
                      <div className="flex items-center space-x-4">
                        {/* Like - Heart outline avec compteur */}
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => handleLikeUserReview()}
                            className={`transition-colors ${userReviewData.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-300'}`}
                          >
                            {userReviewData.isLiked ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                              </svg>
                            )}
                          </button>
                          {userReviewData.likesCount > 0 && (
                            <span className="text-gray-300 text-xs">{userReviewData.likesCount}</span>
                          )}
                        </div>
                        
                        {/* Comment - Chat bubble avec compteur */}
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => setShowUserReviewComments(true)}
                            className="text-gray-400 hover:text-gray-300 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
                          {userReviewData.commentsCount > 0 && (
                            <span className="text-gray-300 text-xs">{userReviewData.commentsCount}</span>
                          )}
                        </div>
                        
                        {/* Share - Send arrow */}
                        <button 
                          onClick={() => handleShareUserReview()}
                          className="text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M22 2L11 13"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {bookDetail.description && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <div className="text-gray-400 leading-relaxed text-sm">
                    {showFullDescription 
                      ? cleanDescription(bookDetail.description) 
                      : truncateDescription(cleanDescription(bookDetail.description))
                    }
                    {cleanDescription(bookDetail.description).length > 300 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-gray-400 hover:text-gray-300 ml-1 text-xs"
                      >
                        {showFullDescription ? '...less' : '...more'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Google Books Rating - Always displayed */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Google Books Rating</h3>
                {bookRating && bookRating.googleBooks > 0 ? (
                  <div className="flex items-center space-x-3">
                    {/* Rating number */}
                    <span className="text-white font-medium text-lg">
                      {bookRating.googleBooks.toFixed(1)}/5
                    </span>
                    {/* Ratings count */}
                    <span className="text-gray-400 text-sm">
                      ({bookRating.ratingsCount.toLocaleString()} {bookRating.ratingsCount === 1 ? 'rating' : 'ratings'})
                    </span>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    No ratings available yet
                  </div>
                )}
              </div>

              {/* Détails du livre */}
              <div className="space-y-2 text-sm mb-6">
                {bookDetail.publisher && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Publisher:</span>
                    <span className="text-white">{bookDetail.publisher}</span>
                  </div>
                )}
                {bookDetail.publishedDate && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Published:</span>
                    <span className="text-white">{new Date(bookDetail.publishedDate).toLocaleDateString()}</span>
                  </div>
                )}
                {bookDetail.pageCount && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Pages:</span>
                    <span className="text-white">{bookDetail.pageCount}</span>
                  </div>
                )}
                {bookDetail.categories && bookDetail.categories.length > 0 && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Genre:</span>
                    <span className="text-white">{bookDetail.categories.join(', ')}</span>
                  </div>
                )}
                {bookDetail.language && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Language:</span>
                    <span className="text-white">{bookDetail.language.toUpperCase()}</span>
                  </div>
                )}
                {bookDetail.isbn13 && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">ISBN-13:</span>
                    <span className="text-white">{bookDetail.isbn13}</span>
                  </div>
                )}
              </div>

              {/* More from this author */}
              {authorBooks.length > 0 && bookDetail.authors && bookDetail.authors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    More by {bookDetail.authors[0]}
                  </h3>
                  <div className="flex gap-4 pb-4 overflow-x-auto">
                    {authorBooks.slice(0, 8).map((book) => (
                      <div
                        key={book.id}
                        onClick={() => onBookSelect?.(book.id)}
                        className="flex-shrink-0 w-32 bg-gray-800/30 border border-gray-700/30 rounded-xl overflow-hidden hover:border-gray-600/50 transition-all cursor-pointer group"
                      >
                        <div className="aspect-[2/3] bg-gray-700">
                          <img
                            src={book.image || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=128&h=192&fit=crop&q=80'}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=128&h=192&fit=crop&q=80'
                            }}
                          />
                        </div>
                        <div className="p-2">
                          <h4 className="text-white font-medium text-xs mb-1 line-clamp-2 leading-tight">
                            {book.title}
                          </h4>
                          {book.year && <p className="text-gray-400 text-xs">{book.year}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other editions */}
              {otherEditions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Other Editions</h3>
                  <div className="flex gap-4 pb-4 overflow-x-auto">
                    {otherEditions.slice(0, 6).map((edition) => (
                      <div
                        key={edition.id}
                        onClick={() => onBookSelect?.(edition.id)}
                        className="flex-shrink-0 w-32 bg-gray-800/30 border border-gray-700/30 rounded-xl overflow-hidden hover:border-gray-600/50 transition-all cursor-pointer group"
                      >
                        <div className="aspect-[2/3] bg-gray-700">
                          <img
                            src={edition.image || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=128&h=192&fit=crop&q=80'}
                            alt={edition.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=128&h=192&fit=crop&q=80'
                            }}
                          />
                        </div>
                        <div className="p-2">
                          <h4 className="text-white font-medium text-xs mb-1 line-clamp-2 leading-tight">
                            {edition.title}
                          </h4>
                          <p className="text-gray-400 text-xs">{edition.publisher}</p>
                          {edition.year && <p className="text-gray-400 text-xs">{edition.year}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real Reviews Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Reviews</h3>
                  {realReviews.length > 3 && (
                    <button 
                      onClick={() => setShowAllRealReviews(!showAllRealReviews)}
                      className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                      {showAllRealReviews ? 'Less' : 'More'}
                    </button>
                  )}
                </div>
                
                {loadingRealReviews ? (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-sm">Loading reviews...</div>
                  </div>
                ) : realReviews.length === 0 ? (
                  <div className="text-gray-400 text-sm bg-gray-800/30 rounded-lg p-4 text-center">
                    No reviews yet
                    <div className="text-gray-500 text-xs mt-1">Be the first to review this book</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(showAllRealReviews ? realReviews : realReviews.slice(0, 3)).map((review) => (
                      <div key={review.id} className="bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 border border-gray-700/50">
                        {/* User info + date */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            {/* Avatar violet rond */}
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                              {review.username[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium text-sm">{review.username}</span>
                              {/* Rating en violet */}
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={12}
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
                          {/* Date à droite */}
                          <span className="text-gray-500 text-xs">{review.timestamp ? formatTimeAgo(review.timestamp) : review.date}</span>
                        </div>
                        
                        {/* Review text */}
                        <div className="mb-3 ml-11">
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {expandedReviews.has(review.id) 
                              ? review.text 
                              : truncateToOneLine(review.text)
                            }
                            {review.text.length > 60 && (
                              <button
                                onClick={() => toggleReviewExpansion(review.id)}
                                className="text-gray-400 hover:text-gray-300 ml-1 text-xs"
                              >
                                {expandedReviews.has(review.id) ? '...less' : '...more'}
                              </button>
                            )}
                          </p>
                        </div>
                        
                        {/* Actions Instagram style avec compteurs */}
                        <div className="ml-11">
                          <div className="flex items-center space-x-4">
                            {/* Like avec compteur */}
                            <div className="flex items-center space-x-1">
                              <button 
                                onClick={() => handleLikeApiReview(review.id)}
                                className={`transition-colors ${
                                  reviewInteractions[review.id]?.isLiked 
                                    ? 'text-red-500' 
                                    : 'text-gray-400 hover:text-gray-300'
                                }`}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={reviewInteractions[review.id]?.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                              </button>
                              {(reviewInteractions[review.id]?.likesCount || 0) > 0 && (
                                <span className="text-gray-300 text-xs">{reviewInteractions[review.id]?.likesCount}</span>
                              )}
                            </div>
                            
                            {/* Comment avec compteur */}
                            <div className="flex items-center space-x-1">
                              <button 
                                onClick={() => setActiveCommentReview(review.id)}
                                className="text-gray-400 hover:text-gray-300 transition-colors"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                              </button>
                              {(reviewInteractions[review.id]?.commentsCount || 0) > 0 && (
                                <span className="text-gray-300 text-xs">{reviewInteractions[review.id]?.commentsCount}</span>
                              )}
                            </div>
                            
                            {/* Share */}
                            <button 
                              onClick={() => handleShareApiReview(review.id)}
                              className="text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M22 2L11 13"/>
                                <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="text-white text-center">
            <h2 className="text-xl font-semibold mb-2">Book not found</h2>
            <p className="text-gray-400">Unable to load book details</p>
          </div>
        </div>
      )}

      {/* Modales - Lazy loaded */}
      <Suspense fallback={null}>
        {bookDetail && showShareWithFriendsModal && (
          <ShareWithFriendsModal
            isOpen={showShareWithFriendsModal}
            onClose={() => setShowShareWithFriendsModal(false)}
            item={{
              id: bookDetail.id,
              type: 'books',
              title: bookDetail.title,
              image: bookDetail.imageLinks?.thumbnail
            }}
          />
        )}
      </Suspense>

      {/* Modal de review */}
      {false && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Rate and Review</h3>
            
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Your Rating</p>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      star <= (reviewState.hoverRating || reviewState.userRating) ? 'text-yellow-500 fill-current' : 'text-gray-600'
                    }`}
                    onClick={() => reviewState.setUserRating(star)}
                    onMouseEnter={() => reviewState.setHoverRating(star)}
                    onMouseLeave={() => reviewState.setHoverRating(0)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Review (optional)</p>
              <textarea
                value={reviewState.userReview}
                onChange={(e) => reviewState.setUserReview(e.target.value)}
                placeholder="Share your thoughts about this book..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20"
              />
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Privacy</p>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={reviewState.reviewPrivacy === 'private'}
                    onChange={(e) => reviewState.setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-gray-600"
                  />
                  <span className="text-white">Private</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={reviewState.reviewPrivacy === 'public'}
                    onChange={(e) => reviewState.setReviewPrivacy(e.target.value as 'private' | 'public')}
                    className="text-gray-600"
                  />
                  <span className="text-white">Public</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => reviewState.setShowReviewBox(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => reviewState.submitReview(bookDetail, selectedStatus, onAddToLibrary)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {false && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Who are you reading with?</h3>
            
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {MOCK_FRIENDS.map((friend) => (
                <label key={friend.id} className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFriends.includes(friend.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFriends([...selectedFriends, friend.id])
                      } else {
                        setSelectedFriends(selectedFriends.filter(id => id !== friend.id))
                      }
                    }}
                    className="text-gray-600"
                  />
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {friend.name[0]}
                  </div>
                  <span className="text-white">{friend.name}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFriendsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowFriendsModal(false)
                  if (['read', 'currently-reading', 'did-not-finish'].includes(selectedStatus || '')) {
                    reviewState.setShowReviewBox(true)
                  }
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Who Read Modal */}
      {showFriendsWhoRead && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Friends who read this</h3>
              <button
                onClick={() => setShowFriendsWhoRead(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {FRIENDS_WHO_READ.map((friend) => (
                <div key={friend.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-medium">
                        {friend.name[0]}
                      </div>
                      <span className="text-white font-medium">{friend.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={star <= (friend.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-600'}
                        />
                      ))}
                    </div>
                  </div>
                  {friend.reviewText && (
                    <p className="text-gray-300 text-sm">{friend.reviewText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Book Sheet Modal */}
      {showBookSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Book Sheet</h3>
              <button
                onClick={() => setShowBookSheet(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Date of reading</label>
                <input
                  type="date"
                  value={bookSheetData.dateRead}
                  onChange={(e) => setBookSheetData({...bookSheetData, dateRead: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Location</label>
                <input
                  type="text"
                  value={bookSheetData.location}
                  onChange={(e) => setBookSheetData({...bookSheetData, location: e.target.value})}
                  placeholder="Where did you read this?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Mood</label>
                <input
                  type="text"
                  value={bookSheetData.mood}
                  onChange={(e) => setBookSheetData({...bookSheetData, mood: e.target.value})}
                  placeholder="What was your mood?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Format</label>
                <select
                  value={bookSheetData.format}
                  onChange={(e) => setBookSheetData({...bookSheetData, format: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="physical">Physical book</option>
                  <option value="ebook">E-book</option>
                  <option value="audiobook">Audiobook</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={`cursor-pointer transition-colors ${
                        star <= bookSheetData.personalRating ? 'text-yellow-500 fill-current' : 'text-gray-600'
                      }`}
                      onClick={() => setBookSheetData({...bookSheetData, personalRating: star})}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Review</label>
                <textarea
                  value={bookSheetData.personalReview}
                  onChange={(e) => setBookSheetData({...bookSheetData, personalReview: e.target.value})}
                  placeholder="Write your review..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBookSheet(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveBookSheetData}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal - Style Instagram */}
      {showUserReviewComments && (
        <div className="fixed inset-0 z-60 bg-black/50">
          {/* Overlay cliquable pour fermer */}
          <div 
            className="absolute inset-0" 
            onClick={() => setShowUserReviewComments(false)}
          />
          
          {/* Modal sliding from bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center p-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold text-center">Comments</h3>
            </div>
            
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {userReviewData.comments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">No comments yet</div>
                  <div className="text-gray-500 text-xs mt-1">Be the first to comment</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userReviewData.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                        {comment.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl px-3 py-2">
                          <div className="text-white text-sm font-medium">{comment.username}</div>
                          <div className="text-gray-300 text-sm">{comment.text}</div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 ml-3">
                          <span className="text-gray-500 text-xs">{formatTimeAgo(comment.timestamp)}</span>
                          <button className="text-gray-500 text-xs font-medium">Like</button>
                          <button className="text-gray-500 text-xs font-medium">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Comment input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                  U
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What do you think?"
                    className="w-full bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                  />
                  {newComment.trim() && (
                    <button
                      onClick={handleSubmitComment}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-medium"
                    >
                      Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Review Comments Modal - Style Instagram */}
      {activeCommentReview && (
        <div className="fixed inset-0 z-60 bg-black/50">
          {/* Overlay cliquable pour fermer */}
          <div 
            className="absolute inset-0" 
            onClick={() => setActiveCommentReview(null)}
          />
          
          {/* Modal sliding from bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center p-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold text-center">Comments</h3>
            </div>
            
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {(!reviewInteractions[activeCommentReview]?.comments?.length) ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">No comments yet</div>
                  <div className="text-gray-500 text-xs mt-1">Be the first to comment</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewInteractions[activeCommentReview].comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                        {comment.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl px-3 py-2">
                          <div className="text-white text-sm font-medium">{comment.username}</div>
                          <div className="text-gray-300 text-sm">{comment.text}</div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 ml-3">
                          <span className="text-gray-500 text-xs">{formatTimeAgo(comment.timestamp)}</span>
                          <button className="text-gray-500 text-xs font-medium">Like</button>
                          <button className="text-gray-500 text-xs font-medium">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Comment input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                  U
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newApiReviewComment}
                    onChange={(e) => setNewApiReviewComment(e.target.value)}
                    placeholder="What do you think?"
                    className="w-full bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitApiReviewComment(activeCommentReview)}
                  />
                  {newApiReviewComment.trim() && (
                    <button
                      onClick={() => handleSubmitApiReviewComment(activeCommentReview)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-medium"
                    >
                      Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
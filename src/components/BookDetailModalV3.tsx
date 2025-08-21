'use client'
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Star, X, Share, FileText, ChevronDown } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'

// Hooks personnalisés
import { useBookDetail } from '@/hooks/useBookDetail'
import { useBookReview } from '@/hooks/useBookReview'

// Services
import { socialService } from '@/services/socialService'
import { LibraryService } from '@/services/libraryService'
import { avatarService } from '@/services/avatarService'
import { AuthService } from '@/services/authService'

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


// Constantes
const MOCK_FRIENDS: Friend[] = [
  { id: 1, name: 'Alex', avatar: '/api/placeholder/32/32' },
  { id: 2, name: 'Sarah', avatar: '/api/placeholder/32/32' },
  { id: 3, name: 'Mike', avatar: '/api/placeholder/32/32' },
  { id: 4, name: 'Emma', avatar: '/api/placeholder/32/32' },
  { id: 5, name: 'David', avatar: '/api/placeholder/32/32' }
]

// Friends who read will be loaded dynamically from actual library data

const BOOK_STATUSES = [
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'currently-reading', label: 'Currently Reading' },
  { value: 'read', label: 'Read' },
  { value: 'did-not-finish', label: 'Did Not Finish' },
  { value: 'remove', label: 'Remove from Library' }
]


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
    let isMounted = true
    
    const loadExistingReview = async () => {
      if (bookDetail?.id && isMounted) {
        try {
          const { userReviewsService } = await import('@/services/userReviewsService')
          const existingReview = await userReviewsService.getUserReviewForMedia(bookDetail.id)
          if (existingReview && isMounted) {
            reviewState.setUserRating(existingReview.rating)
            reviewState.setUserReview(existingReview.review_text || '')
            reviewState.setReviewPrivacy(existingReview.is_public ? 'public' : 'private')
          }
        } catch (error) {
          // Silently handle Supabase errors to avoid infinite loops
          console.log('Could not load existing review (using fallback):', error.message)
        }
      }
    }
    
    loadExistingReview()
    
    return () => {
      isMounted = false
    }
  }, [bookDetail?.id]) // Remove function dependencies to avoid infinite loop
  
  // États locaux simplifiés
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  
  // Mobile reliability states (inspired by movie modal)
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const [lastUserAction, setLastUserAction] = useState<number>(0)
  
  // État pour tracker si c'est la première ouverture du modal (pour éviter les syncs répétées)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // États pour les modales
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [showFriendsWhoRead, setShowFriendsWhoRead] = useState(false)
  const [friendsWhoRead, setFriendsWhoRead] = useState<Friend[]>([])
  const [loadingFriendsWhoRead, setLoadingFriendsWhoRead] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  // Tab states for Overview/Preview functionality
  const [activeTab, setActiveTab] = useState<'overview' | 'preview'>('overview')
  // Removed showInlineRating state - rating section is now always visible
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

  // États pour les interactions reviews utilisateur
  const [userReviewLikes, setUserReviewLikes] = useState<number>(0)
  const [userReviewComments, setUserReviewComments] = useState<number>(0)


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

  // Effet pour synchroniser le statut avec la bibliothèque - COMME MOVIE MODAL
  useEffect(() => {
    if (isOpen && bookId && isInitialLoad) {
      console.log('📚 [BOOK MODAL] INITIAL LOAD - synchronizing status with library for bookId:', bookId)
      console.log('📚 [BOOK MODAL] Current selectedStatus before sync:', selectedStatus)
      
      // Check library status ONLY on modal open (initial load)
      if (library && library.length > 0) {
        const libraryItem = library.find(item => item.id === bookId)
        console.log('🔍 [BOOK MODAL] Found library item:', libraryItem)
        const newStatus = libraryItem?.status || null
        console.log('🔄 [BOOK MODAL] Setting INITIAL status to:', newStatus)
        
        setSelectedStatus(newStatus)
      } else {
        console.log('🔄 [BOOK MODAL] No library items, setting null status')
        setSelectedStatus(null)
      }
      
      setIsInitialLoad(false)
      console.log('🔄 [BOOK MODAL] ✅ Initial load complete')
    }
    // Bloquer toute sync supplémentaire si l'utilisateur a agi récemment (dans les 5 dernières secondes)
    else if (isOpen && bookId && !isInitialLoad && library && library.length > 0 && !isUserInteracting) {
      const timeSinceLastAction = Date.now() - lastUserAction
      if (timeSinceLastAction > 5000) { // Plus de 5 secondes depuis la dernière action
        console.log('🔄 [BOOK MODAL] Allowing library sync - no recent user action')
        const libraryItem = library.find(item => item.id === bookId)
        const newStatus = libraryItem?.status || null
        
        // Only update if status actually changed from external source
        if (newStatus !== selectedStatus) {
          console.log(`🔄 [BOOK MODAL] External status change detected: ${selectedStatus} -> ${newStatus}`)
          setSelectedStatus(newStatus)
        }
      } else {
        console.log(`🔄 [BOOK MODAL] Blocking library sync - recent user action (${timeSinceLastAction}ms ago)`)
      }
    }
  }, [isOpen, bookId, library, isInitialLoad, selectedStatus, lastUserAction, isUserInteracting])

  // Reset initial load flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialLoad(true)
      setIsUserInteracting(false) // Reset user interaction flag
      console.log('🔄 [BOOK MODAL] Modal closed - reset for next load')
    }
  }, [isOpen])

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

  // Cleanup on modal close - COMME MOVIE MODAL
  useEffect(() => {
    if (!isOpen) {
      console.log('📚 [Cleanup] Modal closed, cleaning up states')
      setIsUserInteracting(false) // Reset protection flag
      setIsInitialLoad(true) // Reset for next load
    }
  }, [isOpen])

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

  // Handle status selection - COMME MOVIE MODAL - AVEC PROTECTION SUPABASE REAL-TIME
  const handleAddToLibrary = useCallback(async (status: MediaStatus) => {
    if (!bookDetail) return
    
    // PROTECTION: Marquer que l'utilisateur interagit pour éviter les overrides Supabase
    const actionTimestamp = Date.now()
    console.log('📚 [BOOK MODAL] 🔒 User interaction started - blocking real-time sync')
    setIsUserInteracting(true)
    setLastUserAction(actionTimestamp)
    
    // Handle remove from library
    if (status === null || status === 'remove') {
      console.log('📚 [BOOK MODAL] Removing item from library')
      if (onDeleteItem) {
        await onDeleteItem(bookDetail.id)
        
        // Force library refresh for mobile reliability
        setTimeout(() => {
          const event = new CustomEvent('library-changed', {
            detail: { action: 'deleted', item: { id: bookDetail.id, title: bookDetail.title }, timestamp: Date.now() }
          })
          window.dispatchEvent(event)
          console.log('🔔 [BOOK MODAL] Forced library-changed event for mobile')
        }, 500)
      }
      setSelectedStatus(null)
      setShowStatusDropdown(false)
      
      // Reset protection après délai pour les suppressions
      // Délai réduit sur mobile pour améliorer la réactivité  
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const removalDelay = isMobile ? 1000 : 2000
      setTimeout(() => {
        console.log('📚 [BOOK MODAL] 🔓 User interaction ended (removal) - allowing real-time sync')
        setIsUserInteracting(false)
      }, removalDelay)
      return
    }
    
    // Prepare book data for library
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
    
    try {
      console.log('📚 [BOOK MODAL] ⏳ Starting library update with status:', status)
      console.log('📚 [BOOK MODAL] Current selectedStatus before update:', selectedStatus)
      
      // Set status optimistically (immediate UI feedback)
      setSelectedStatus(status)
      setShowStatusDropdown(false)
      
      // Add/update item in library
      await onAddToLibrary(bookData, status)
      
      // Force library refresh for mobile reliability
      setTimeout(() => {
        const event = new CustomEvent('library-changed', {
          detail: { action: 'updated', item: { id: bookDetail.id, title: bookDetail.title, status }, timestamp: Date.now() }
        })
        window.dispatchEvent(event)
        console.log('🔔 [BOOK MODAL] Forced library-changed event for mobile')
      }, 500)
      
      console.log('📚 [BOOK MODAL] ✅ Library update completed with status:', status)
      console.log('📚 [BOOK MODAL] ✅ Successfully updated library with status:', status)
    } catch (error) {
      console.error('📚 [ERROR] Failed to update library:', error)
      // En cas d'erreur, revenir au statut précédent
      const libraryItem = library.find(item => item.id === bookDetail.id)
      setSelectedStatus(libraryItem?.status || null)
    } finally {
      // PROTECTION: Débloquer la synchronisation après un délai pour permettre à Supabase de se synchroniser
      // Délai réduit sur mobile pour améliorer la réactivité
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const protectionDelay = isMobile ? 1500 : 3000
      setTimeout(() => {
        console.log('📚 [BOOK MODAL] 🔓 User interaction ended - allowing real-time sync')
        setIsUserInteracting(false)
      }, protectionDelay)
    }
  }, [bookDetail, onAddToLibrary, onDeleteItem, library])

  // Handler pour liker sa propre review
  const handleLikeUserReview = useCallback(() => {
    setUserReviewData(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
    }))
  }, [])

  // Function to load friends who actually have this book in their library
  const loadFriendsWhoRead = useCallback(async () => {
    if (!bookDetail?.id) return

    setLoadingFriendsWhoRead(true)
    try {
      // Get user's friends list
      const friends = await socialService.getFriends()
      
      if (friends.length === 0) {
        setFriendsWhoRead([])
        setLoadingFriendsWhoRead(false)
        return
      }

      // Check each friend's library for this book
      const friendsWithBook: Friend[] = []
      
      for (const friend of friends) {
        try {
          // Get friend's library - we need a method to get specific friend's library
          // For now, we'll simulate this with the current approach
          const friendLibrary = await LibraryService.getLibrary() // This gets current user's library
          
          // In a real implementation, we'd have LibraryService.getFriendLibrary(friend.friend_id)
          // For now, randomly assign some friends as having read the book
          const hasBook = Math.random() > 0.7 // 30% chance friend has read it
          
          if (hasBook) {
            friendsWithBook.push({
              id: friend.friend_id,
              name: friend.display_name || friend.username,
              rating: Math.floor(Math.random() * 5) + 1, // Random rating 1-5
              hasReview: Math.random() > 0.5,
              reviewText: Math.random() > 0.5 ? 'Great book, really enjoyed it!' : undefined
            })
          }
        } catch (error) {
          console.error('Error checking friend library:', error)
        }
      }

      setFriendsWhoRead(friendsWithBook)
    } catch (error) {
      console.error('Error loading friends who read:', error)
      setFriendsWhoRead([])
    } finally {
      setLoadingFriendsWhoRead(false)
    }
  }, [bookDetail?.id])

  // Function to load user avatar
  const loadUserAvatar = useCallback(async () => {
    try {
      // Get current user ID first
      const currentUser = await AuthService.getCurrentUser()
      if (currentUser) {
        const avatar = await avatarService.getUserAvatar(currentUser.id)
        setUserAvatar(avatar)
      } else {
        setUserAvatar(null)
      }
    } catch (error) {
      console.error('Error loading user avatar:', error)
      setUserAvatar(null)
    }
  }, [])

  // Function to convert ISBN-13 to ISBN-10 for Amazon links
  const convertISBN13ToISBN10 = useCallback((isbn13: string): string | null => {
    // Remove any hyphens or spaces
    const cleanISBN = isbn13.replace(/[-\s]/g, '')
    
    // Check if it's a valid ISBN-13 (starts with 978 or 979)
    if (cleanISBN.length !== 13 || (!cleanISBN.startsWith('978') && !cleanISBN.startsWith('979'))) {
      return null
    }
    
    // Only convert ISBN-13 that start with 978 (979 cannot be converted to ISBN-10)
    if (!cleanISBN.startsWith('978')) {
      return null
    }
    
    // Extract the middle 9 digits (remove 978 prefix and last check digit)
    const middle9 = cleanISBN.substring(3, 12)
    
    // Calculate ISBN-10 check digit using proper algorithm
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(middle9[i]) * (10 - i)
    }
    
    const remainder = sum % 11
    const checkDigit = (11 - remainder) % 11
    const checkChar = checkDigit === 10 ? 'X' : checkDigit.toString()
    
    const isbn10 = middle9 + checkChar
    console.log(`📚 ISBN conversion: ${isbn13} → ${isbn10}`)
    
    return isbn10
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







  // Initialiser les likes/comments pour user review
  useEffect(() => {
    if (reviewState.userRating > 0) {
      setUserReviewLikes(Math.floor(Math.random() * 50) + 10)
      setUserReviewComments(Math.floor(Math.random() * 10) + 1)
    }
  }, [reviewState.userRating])

  // Load friends who read this book
  useEffect(() => {
    if (bookDetail?.id) {
      loadFriendsWhoRead()
    }
  }, [bookDetail?.id, loadFriendsWhoRead])

  // Load user avatar
  useEffect(() => {
    loadUserAvatar()
  }, [loadUserAvatar])

  // Debug removed

  // Rendu conditionnel
  if (!isOpen || !bookId) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-[#0f0e17] min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
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
          {/* Large header image - 200px height COMME MOVIE MODAL */}
          <div className="relative h-[200px] overflow-hidden">
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
            
            {/* Gradient overlay - COMME MOVIE MODAL */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e17] via-[#0f0e17]/60 to-transparent" />
            
            {/* Close button - COMME MOVIE MODAL */}
            <div className="absolute top-0 right-0 p-5">
              <button
                onClick={onClose}
                className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
                aria-label="Close book details"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Book Info Section - COMME MOVIE MODAL avec -mt-16 pour chevaucher */}
          <div className="px-6 py-6 relative -mt-16">
            {/* Thumbnail + Basic Info - COMME MOVIE MODAL */}
            <div className="flex gap-4 items-start mb-4 relative z-10">
              {/* Book Thumbnail - 100x100 COMME MOVIE MODAL */}
              <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
                <img
                  src={bookDetail.imageLinks?.thumbnail || bookDetail.imageLinks?.small || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=100&h=100&fit=crop&q=80'}
                  alt={bookDetail.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  style={{ imageRendering: 'crisp-edges', backfaceVisibility: 'hidden' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=100&h=100&fit=crop&q=80'
                  }}
                />
              </div>
              
              {/* Title and Author - COMME MOVIE MODAL */}
              <div className="flex-1 pt-1">
                <h1 className="text-xl font-bold text-white mb-1 leading-tight">{bookDetail.title}</h1>
                <p className="text-sm text-gray-400 mb-1">{bookDetail.authors?.join(', ') || 'Unknown Author'}</p>
                
                {/* Book Stats - COMME MOVIE MODAL */}
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

            {/* Action Buttons - COMME MOVIE MODAL */}
            <div className="flex space-x-3 mt-3">
              {/* Status Button - COMME MOVIE MODAL */}
              <div className="relative flex-1">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-medium rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 flex items-center justify-center space-x-1 text-xs"
                >
                  <span className="truncate">{formatStatusForDisplay(selectedStatus)}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform flex-shrink-0 ${showStatusDropdown ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                {/* Dropdown - COMME MOVIE MODAL */}
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                    {getAvailableStatuses().map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleAddToLibrary(status.value as MediaStatus)}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedStatus === status.value ? 'text-purple-400 bg-purple-600/30' : status.value === 'remove' ? 'text-red-400 hover:bg-red-600/20' : 'text-gray-300'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Share Button - COMME MOVIE MODAL */}
              <button 
                onClick={() => setShowShareWithFriendsModal(true)}
                className="h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white rounded-lg transition-all duration-200 flex items-center space-x-1 text-xs"
              >
                <Share size={14} />
                <span>Share</span>
              </button>
            </div>

            {/* Friends who read - EXACTEMENT COMME MOVIE MODAL */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-sm">Friends who read:</span>
                  {friendsWhoRead.length > 0 ? (
                    <div className="flex -space-x-1">
                      {friendsWhoRead.slice(0, 4).map((friend) => (
                        <div
                          key={friend.id}
                          className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                          title={`${friend.name} - ${friend.rating}/5 stars`}
                        >
                          {friend.avatar ? (
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.parentElement!.innerHTML = `<div class="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">${friend.name.charAt(0)}</div>`
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">
                              {friend.name.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}
                      {friendsWhoRead.length > 4 && (
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform">
                          +{friendsWhoRead.length - 4}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">None</span>
                  )}
                </div>
                {friendsWhoRead.length > 0 && (
                  <button
                    onClick={() => setShowFriendsWhoRead(true)}
                    className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                  >
                    View all
                  </button>
                )}
              </div>
              
              {/* Customize book sheet - COMME MOVIE MODAL */}
              <button
                onClick={() => setShowBookSheet(true)}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <FileText size={14} />
                <span>Customize book sheet</span>
              </button>

              {/* Tabs: Overview / Preview */}
              <div className="mt-6 mb-4">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                      activeTab === 'overview'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                      activeTab === 'preview'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Content - Google Books Embed */}
          {activeTab === 'preview' && (
            <div className="px-6 py-4">
              <div className="space-y-4">
                {bookDetail?.previewLink || bookDetail?.webReaderLink ? (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-white text-lg font-medium mb-4">Book Preview</div>
                    
                    {/* Try Google Books embed first */}
                    <div className="relative">
                      <iframe 
                        src={`https://books.google.com/books?id=${bookId}&lpg=PP1&pg=PP1&output=embed&hl=en`}
                        className="w-full h-96 rounded-lg border border-gray-600 bg-gray-900"
                        title="Book Preview"
                        loading="lazy"
                      />
                      
                      {/* Loading overlay */}
                      <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center pointer-events-none">
                        <div className="text-gray-400 text-sm">Loading preview...</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-3 justify-center text-sm">
                      {bookDetail.previewLink && (
                        <a 
                          href={bookDetail.previewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          📖 Open in Google Books
                        </a>
                      )}
                      {bookDetail.webReaderLink && (
                        <a 
                          href={bookDetail.webReaderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 transition-colors"
                        >
                          📱 Web Reader
                        </a>
                      )}
                      {bookDetail.infoLink && (
                        <a 
                          href={bookDetail.infoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          ℹ️ Book Info
                        </a>
                      )}
                    </div>
                    
                    <div className="mt-3 text-center">
                      <p className="text-gray-500 text-xs">
                        Preview availability depends on publisher permissions
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-16">
                    <div className="text-6xl mb-4">📚</div>
                    <div className="text-lg mb-2">No preview available</div>
                    <div className="text-sm mb-4">This book doesn't have a preview available from Google Books.</div>
                    
                    {/* Alternative options */}
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Try these alternatives:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {bookDetail?.buyLink && (
                          <a 
                            href={bookDetail.buyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            🛒 Buy on Google Books
                          </a>
                        )}
                        <a 
                          href={`https://www.amazon.com/s?k=${encodeURIComponent(bookDetail?.title || '')}&tag=drrriguessss-20`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 text-xs"
                        >
                          📖 Find on Amazon
                        </a>
                        <a 
                          href={`https://www.goodreads.com/search?q=${encodeURIComponent(bookDetail?.title || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-400 hover:text-yellow-300 text-xs"
                        >
                          ⭐ View on Goodreads
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contenu principal - Overview tab */}
          <div className="px-6 py-4 relative z-1" style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            <div className="space-y-8">
              {/* Rate this book section - Always visible */}
              <div className="">
                  <div className="text-gray-400 text-sm mb-1">Rate this book</div>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => reviewState.setHoverRating(star)}
                        onMouseLeave={() => reviewState.setHoverRating(0)}
                        onClick={async () => {
                          // Allow editing: if same rating is clicked, reset to 0
                          const newRating = reviewState.userRating === star ? 0 : star
                          reviewState.setUserRating(newRating)
                          
                          // Open review box when rating (but not when clearing)
                          if (newRating > 0) {
                            reviewState.setShowReviewBox(true)
                          } else {
                            reviewState.setShowReviewBox(false)
                          }
                          
                          // Auto-save rating (like board game modal)
                          if (bookDetail) {
                            try {
                              if (newRating > 0) {
                                await reviewState.submitReview(bookDetail, selectedStatus, onAddToLibrary, true)
                                console.log('📚 [BookModal] Rating auto-saved:', newRating)
                              } else {
                                // If rating is 0, delete the review
                                console.log('📚 [BookModal] Rating cleared, deleting review')
                              }
                            } catch (error) {
                              console.error('📚 [BookModal] Error auto-saving rating:', error)
                            }
                          }
                        }}
                        className="transition-all duration-200 hover:scale-110"
                      >
                        <Star
                          size={18}
                          className={`${
                            star <= (reviewState.hoverRating || reviewState.userRating)
                              ? 'text-purple-400 fill-purple-400 drop-shadow-sm'
                              : 'text-gray-600 hover:text-gray-500'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                    {reviewState.userRating > 0 && (
                      <span className="text-gray-400 text-sm ml-2">{reviewState.userRating}/5</span>
                    )}
                  </div>
                </div>

              
              {/* Review section - SEULEMENT si rating > 0 */}
              {reviewState.showReviewBox && reviewState.userRating > 0 && (
                <div className="mb-6 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] border border-gray-700/50 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Share your thoughts</h3>
                  
                  {/* Review Text Area */}
                  <div className="space-y-3">
                    <textarea
                      value={reviewState.userReview}
                      onChange={(e) => reviewState.setUserReview(e.target.value)}
                      placeholder="Write your review... (optional)"
                      className="w-full bg-black/20 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                      rows={3}
                    />
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-white/70 text-sm">Review privacy:</span>
                        <div className="flex bg-black/30 rounded-lg p-1">
                          <button
                            onClick={() => reviewState.setReviewPrivacy('private')}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${
                              reviewState.reviewPrivacy === 'private'
                                ? 'bg-purple-600 text-white'
                                : 'text-white/60 hover:text-white/80'
                            }`}
                          >
                            Private
                          </button>
                          <button
                            onClick={() => reviewState.setReviewPrivacy('public')}
                            className={`px-3 py-1 rounded-md text-xs transition-colors ${
                              reviewState.reviewPrivacy === 'public'
                                ? 'bg-purple-600 text-white'
                                : 'text-white/60 hover:text-white/80'
                            }`}
                          >
                            Public
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!reviewState.userReview.trim() && (
                          <button
                            onClick={() => {
                              // Skip: just close the review box without saving review text
                              reviewState.setShowReviewBox(false)
                            }}
                            className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-md hover:bg-gray-600 transition-colors"
                          >
                            Skip
                          </button>
                        )}
                        {reviewState.userReview.trim() && (
                          <button
                            onClick={() => {
                              console.log('📚 [BookModal] Save Review clicked', { bookDetail, selectedStatus })
                              if (!bookDetail) {
                                console.error('📚 [BookModal] bookDetail is null!')
                                return
                              }
                              reviewState.submitReview(bookDetail, selectedStatus, onAddToLibrary)
                            }}
                            className={`px-3 py-1 text-white text-xs font-medium rounded-md transition-all duration-200 ${
                              reviewState.reviewSaved 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900'
                            }`}
                          >
                            {reviewState.reviewSaved ? 'Saved!' : 'Save Review'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Your Review - Style Instagram (shown if user has rating but review box is closed) */}
              {reviewState.userRating > 0 && !reviewState.showReviewBox && (
                <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                  {/* Header: Title + Privacy + Edit */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-semibold text-base">Your review</h3>
                      <span className="text-gray-400 text-xs">({reviewState.reviewPrivacy})</span>
                    </div>
                    <button
                      onClick={() => reviewState.setShowReviewBox(true)}
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
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt="Your avatar" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                          U
                        </div>
                      )}
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

                {/* Digital Availability */}
                {bookDetail.isEbook && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Ebook:</span>
                    <span className="text-white">Available</span>
                  </div>
                )}
                {bookDetail.pdfAvailable && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">PDF:</span>
                    <span className="text-white">Available</span>
                  </div>
                )}
                {bookDetail.epubAvailable && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">EPUB:</span>
                    <span className="text-white">Available</span>
                  </div>
                )}
                {bookDetail.webReaderLink && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Preview:</span>
                    <a 
                      href={bookDetail.webReaderLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Read online
                    </a>
                  </div>
                )}
                {/* Amazon Affiliate Link */}
                {(bookDetail.isbn13 || bookDetail.isbn10 || bookDetail.title) && (
                  <div className="text-sm flex">
                    <span className="text-gray-400 w-24 flex-shrink-0">Buy:</span>
                    <a 
                      href={(() => {
                        // Hybrid Strategy: Prioritize direct links, fallback to search
                        
                        // 1. Try existing ISBN-10 first (highest commission rate)
                        if (bookDetail.isbn10) {
                          return `https://amazon.com/dp/${bookDetail.isbn10}/?tag=drrriguessss-20`
                        }
                        
                        // 2. Try ISBN-13 to ISBN-10 conversion for direct links
                        if (bookDetail.isbn13) {
                          const isbn10 = convertISBN13ToISBN10(bookDetail.isbn13)
                          if (isbn10) {
                            // Check if this is a potentially problematic ISBN (length or format issues)
                            if (isbn10.length === 10 && !isbn10.startsWith('178')) {
                              return `https://amazon.com/dp/${isbn10}/?tag=drrriguessss-20`
                            }
                          }
                          // Fallback to ISBN-13 search for problematic conversions
                          return `https://amazon.com/s?k=${bookDetail.isbn13}&tag=drrriguessss-20`
                        }
                        
                        // 3. Final fallback to title + author search
                        return `https://amazon.com/s?k=${encodeURIComponent(`"${bookDetail.title}" "${bookDetail.authors?.[0] || ''}"`).replace(/%20/g, '+')}&tag=drrriguessss-20`
                      })()}
                      title={(() => {
                        // Show user what type of link this is
                        if (bookDetail.isbn10) return "Direct Amazon product link"
                        if (bookDetail.isbn13) {
                          const isbn10 = convertISBN13ToISBN10(bookDetail.isbn13)
                          if (isbn10 && isbn10.length === 10 && !isbn10.startsWith('178')) {
                            return "Direct Amazon product link"
                          }
                          return "Amazon search (reliable)"
                        }
                        return "Amazon search by title"
                      })()}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 mr-3"
                    >
                      Amazon
                      {(() => {
                        // Visual indicator for link type
                        if (bookDetail.isbn10) return " 🎯" // Direct link
                        if (bookDetail.isbn13) {
                          const isbn10 = convertISBN13ToISBN10(bookDetail.isbn13)
                          if (isbn10 && isbn10.length === 10 && !isbn10.startsWith('178')) {
                            return " 🎯" // Direct link via conversion
                          }
                          return " 🔍" // Search by ISBN
                        }
                        return " 🔍" // Search by title
                      })()}
                    </a>
                    {bookDetail.buyLink && (
                      <a 
                        href={bookDetail.buyLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Google Books{bookDetail.price && ` (${bookDetail.price})`}
                      </a>
                    )}
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
                  // Review section is now always visible - no need to show review box conditionally
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
              {friendsWhoRead.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">None of your friends have read this book yet.</p>
                </div>
              ) : (
                friendsWhoRead.map((friend) => (
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
                ))
              )}
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
                <label className="block text-gray-400 text-sm mb-2">Private Rating</label>
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
                <label className="block text-gray-400 text-sm mb-1">Private Review</label>
                <textarea
                  value={bookSheetData.personalReview}
                  onChange={(e) => setBookSheetData({...bookSheetData, personalReview: e.target.value})}
                  placeholder="Write your private review..."
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

    </div>
  )
}
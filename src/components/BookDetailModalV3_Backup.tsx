'use client'
import { useState, useEffect } from 'react'
import { X, Star, Share, FileText, ArrowRight, BookOpen, ExternalLink, ChevronLeft, ChevronRight, Calendar, Users, List } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { googleBooksService } from '@/services/googleBooksService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import { hardcoverService, type HardcoverReview } from '@/services/hardcoverService'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'
import BookCover from './BookCover'
import ShareWithFriendsModal from './ShareWithFriendsModal'

// Function to convert HTML tags to safe styled HTML for Google Books descriptions
function formatGoogleBooksDescription(htmlDescription: string): string {
  if (!htmlDescription) return ''
  
  try {
    let formattedText = htmlDescription
    
    // First, handle self-closing br tags
    formattedText = formattedText.replace(/<br\s*\/?>/gi, '<br class="my-1" />')
    
    // Replace opening and closing tags with styled versions
    const tagReplacements = [
      // Bold tags
      { from: /<b\b[^>]*>/gi, to: '<strong class="font-bold">' },
      { from: /<\/b>/gi, to: '</strong>' },
      { from: /<strong\b[^>]*>/gi, to: '<strong class="font-bold">' },
      { from: /<\/strong>/gi, to: '</strong>' },
      
      // Italic tags
      { from: /<i\b[^>]*>/gi, to: '<em class="italic">' },
      { from: /<\/i>/gi, to: '</em>' },
      { from: /<em\b[^>]*>/gi, to: '<em class="italic">' },
      { from: /<\/em>/gi, to: '</em>' },
      
      // Paragraph tags
      { from: /<p\b[^>]*>/gi, to: '<div class="mb-3">' },
      { from: /<\/p>/gi, to: '</div>' },
      
      // Div tags
      { from: /<div\b[^>]*>/gi, to: '<div class="mb-2">' },
      { from: /<\/div>/gi, to: '</div>' }
    ]
    
    // Apply all replacements
    tagReplacements.forEach(({ from, to }) => {
      formattedText = formattedText.replace(from, to)
    })
    
    // Remove any remaining unknown HTML tags for security
    formattedText = formattedText.replace(/<(?!\/?(strong|em|br|div)\b)[^>]*>/gi, '')
    
    // Clean up multiple spaces and normalize whitespace
    formattedText = formattedText.replace(/\s+/g, ' ').trim()
    
    return formattedText
    
  } catch (error) {
    console.error("Erreur lors du formatage HTML:", error)
    // Fallback: strip all HTML tags
    return htmlDescription.replace(/(<([^>]+)>)/gi, "").replace(/\s+/g, ' ').trim()
  }
}

// Component to render formatted description with HTML styling and collapsible functionality
function FormattedDescription({ htmlContent }: { htmlContent: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const formattedContent = formatGoogleBooksDescription(htmlContent)
  
  // Check if content is long enough to need truncation (roughly 300+ characters)
  const shouldTruncate = htmlContent.length > 300
  
  const truncatedStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden'
  }
  
  return (
    <div className="text-gray-500 text-sm leading-relaxed">
      <div 
        style={!isExpanded && shouldTruncate ? truncatedStyle : undefined}
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-300 text-xs mt-1 transition-colors inline-block"
        >
          {isExpanded ? 'show less' : '...more'}
        </button>
      )}
    </div>
  )
}

interface BookDetailModalV3Props {
  isOpen: boolean
  onClose: () => void
  bookId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onBookSelect?: (bookId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
}

interface BookDetail {
  id: string
  title: string
  authors: string[]
  description: string
  publishedDate: string
  pageCount: number
  categories: string[]
  averageRating: number
  ratingsCount: number
  language: string
  publisher: string
  isbn10: string
  isbn13: string
  imageLinks: {
    thumbnail: string
    small: string
    medium: string
    large: string
    extraLarge?: string
  }
  previewLink: string
  infoLink: string
  buyLink: string
  subtitle?: string
}

export default function BookDetailModalV3({
  isOpen,
  onClose,
  bookId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onBookSelect,
  onOpenMovieDetail
}: BookDetailModalV3Props) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  
  // États pour le partage et les reviews
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [showShareThoughtsPrompt, setShowShareThoughtsPrompt] = useState(true)
  const [userReview, setUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [showProductSheet, setShowProductSheet] = useState(false)
  const [showImagePopup, setShowImagePopup] = useState(false)
  const [productSheetData, setProductSheetData] = useState({
    readDate: '',
    format: '',
    friendsRead: [] as any[],
    personalRating: 0,
    personalReview: '',
    location: '',
    mood: ''
  })
  
  // États pour les reviews utilisateur
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)
  const [publicReviews, setPublicReviews] = useState<UserReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  
  // États pour l'édition des reviews
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [editRating, setEditRating] = useState(0)
  const [editReviewText, setEditReviewText] = useState('')
  const [editReviewPrivacy, setEditReviewPrivacy] = useState<'private' | 'public'>('private')
  const [authorBooks, setAuthorBooks] = useState<any[]>([])
  const [loadingAuthorBooks, setLoadingAuthorBooks] = useState(false)
  const [otherEditions, setOtherEditions] = useState<any[]>([])
  const [currentBookEditions, setCurrentBookEditions] = useState<any[]>([])

  // États pour les fonctionnalités sociales
  const [showRecommendModal, setShowRecommendModal] = useState(false)
  const [recommendMessage, setRecommendMessage] = useState('')
  const [selectedRecommendFriends, setSelectedRecommendFriends] = useState<any[]>([])
  const [recommendSearch, setRecommendSearch] = useState('')
  const [showBookClubModal, setShowBookClubModal] = useState(false)
  
  // Book Club Meeting states
  const [bookClubName, setBookClubName] = useState('')
  const [bookClubDate, setBookClubDate] = useState('')
  const [bookClubTime, setBookClubTime] = useState('')
  const [bookClubLocation, setBookClubLocation] = useState('')
  const [discussionPoints, setDiscussionPoints] = useState('')
  const [selectedBookClubFriends, setSelectedBookClubFriends] = useState<any[]>([])
  const [bookClubSearch, setBookClubSearch] = useState('')
  const [showMoreShareOptions, setShowMoreShareOptions] = useState(false)
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  
  // États pour les reviews populaires (Hardcover Real Reviews)
  const [popularReviews, setPopularReviews] = useState<HardcoverReview[]>([])
  const [showAllPopularReviews, setShowAllPopularReviews] = useState(false)
  const [expandedPopularReviews, setExpandedPopularReviews] = useState<Set<string>>(new Set())
  const [loadingPopularReviews, setLoadingPopularReviews] = useState(false)
  const [showFriendsWhoRead, setShowFriendsWhoRead] = useState(false)

  // État pour le temps de lecture
  const [readingTime, setReadingTime] = useState<string | null>(null)

  
  // Mock friends data
  const mockFriends = [
    { id: 1, name: 'Axel', avatar: '/api/placeholder/32/32' },
    { id: 2, name: 'Maite', avatar: '/api/placeholder/32/32' },
    { id: 3, name: 'Darren', avatar: '/api/placeholder/32/32' },
    { id: 4, name: 'Joshua', avatar: '/api/placeholder/32/32' },
    { id: 5, name: 'Jeremy', avatar: '/api/placeholder/32/32' },
    { id: 6, name: 'Ana', avatar: '/api/placeholder/32/32' },
    { id: 7, name: 'Susete', avatar: '/api/placeholder/32/32' }
  ]

  const [friendsWhoRead] = useState([
    { id: 1, name: 'Alex Chen', rating: 5, review: 'Absolutely loved this book! The character development was incredible.' },
    { id: 2, name: 'Sarah Kim', rating: 4, review: 'Great read, highly recommend.' },
    { id: 3, name: 'Mike Johnson', rating: 5, review: 'One of the best books I\'ve read this year.' },
    { id: 4, name: 'Emma Wilson', rating: 4, review: 'Beautiful writing and compelling story.' },
    { id: 5, name: 'David Lee', rating: 5, review: 'Couldn\'t put it down!' }
  ])

  // Helper function pour Product Sheet
  const isProductSheetCompleted = () => {
    return productSheetData.personalRating > 0 || 
           productSheetData.personalReview.trim() !== '' ||
           productSheetData.readDate !== '' ||
           productSheetData.format !== ''
  }

  // Recommendation functions
  const toggleRecommendFriend = (friend: any) => {
    setSelectedRecommendFriends(prev => {
      const isSelected = prev.find(f => f.id === friend.id)
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id)
      } else {
        return [...prev, friend]
      }
    })
  }


  const filteredRecommendFriends = mockFriends.filter(friend => 
    friend.name.toLowerCase().includes(recommendSearch.toLowerCase())
  )

  const handleSendToFriends = () => {
    if (selectedRecommendFriends.length === 0) {
      alert('Please select at least one friend')
      return
    }
    
    // Simulate sending recommendation
    const friendNames = selectedRecommendFriends.map(f => f.name).join(', ')
    alert(`Book recommendation sent to: ${friendNames}${recommendMessage ? `\nMessage: "${recommendMessage}"` : ''}`)
    
    // Reset state
    setSelectedRecommendFriends([])
    setRecommendMessage('')
    setShowRecommendModal(false)
  }

  const handleExternalShare = (platform: string) => {
    if (!bookDetail) return
    
    const text = `Check out this book: "${bookDetail.title}" by ${bookDetail.authors?.join(', ') || 'Unknown Author'}`
    const bookUrl = `${window.location.origin}/book/${bookDetail.id}`
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${bookUrl}`)}`)
        break
      case 'imessage':
        window.open(`sms:&body=${encodeURIComponent(`${text} ${bookUrl}`)}`)
        break
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(`Book Recommendation: ${bookDetail.title}`)}&body=${encodeURIComponent(`${text}\n\n${bookUrl}`)}`)
        break
      case 'copy':
        navigator.clipboard.writeText(`${text} ${bookUrl}`)
        alert('Link copied to clipboard!')
        break
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${bookUrl}`)}`)
        break
      case 'native':
        if (navigator.share) {
          navigator.share({
            title: `Book Recommendation: ${bookDetail.title}`,
            text: text,
            url: bookUrl
          })
        }
        break
      
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(`Book Recommendation: ${bookDetail.title}`)}&body=${encodeURIComponent(`${text}\n\n${bookUrl}`)}`, '_blank')
        break
      
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${bookUrl}`)}`, '_blank')
        break
      
      case 'native':
        if (navigator.share) {
          navigator.share({
            title: `Book Recommendation: ${bookDetail.title}`,
            text: text,
            url: bookUrl
          })
        }
        break
      
      default:
        break
    }
  }

  // Book Club functions
  const toggleBookClubFriend = (friend: any) => {
    setSelectedBookClubFriends(prev => {
      const isSelected = prev.find(f => f.id === friend.id)
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id)
      } else {
        return [...prev, friend]
      }
    })
  }

  const filteredBookClubFriends = mockFriends.filter(friend => 
    friend.name.toLowerCase().includes(bookClubSearch.toLowerCase())
  )

  const handlePlanBookClub = () => {
    setShowRecommendModal(false)
    setShowBookClubModal(true)
  }

  const handleCreateBookClub = () => {
    if (!bookClubName.trim() || !bookClubDate || selectedBookClubFriends.length === 0) {
      alert('Please fill in all required fields and select at least one friend')
      return
    }

    // Simulate creating book club meeting
    const friendNames = selectedBookClubFriends.map(f => f.name).join(', ')
    alert(`Book club "${bookClubName}" created for ${bookClubDate}${bookClubTime ? ` at ${bookClubTime}` : ''}!\nInvited: ${friendNames}`)
    
    // Reset state
    setBookClubName('')
    setBookClubDate('')
    setBookClubTime('')
    setBookClubLocation('')
    setDiscussionPoints('')
    setSelectedBookClubFriends([])
    setBookClubSearch('')
    setShowBookClubModal(false)
  }

  // Google Books Image System - Simplified and Reliable
  
  // Get best thumbnail image for header
  const getBookThumbnail = () => {
    // Use Google Books images in priority order
    if (images && images.length > 0) {
      console.log('📚 Using Google Books thumbnail:', images[0])
      return images[0]
    }
    
    // Fallback to bookDetail imageLinks
    if (bookDetail?.imageLinks) {
      const url = bookDetail.imageLinks.thumbnail || bookDetail.imageLinks.small || bookDetail.imageLinks.medium
      console.log('📚 Using bookDetail thumbnail:', url)
      return url
    }
    
    return ''
  }

  // Get enhanced popup image for large display
  const getBookPopupImage = () => {
    // Priority: Use enhanced Google Books URLs
    if (bookDetail?.imageLinks) {
      const imageLinks = bookDetail.imageLinks
      let bestUrl = imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail
      
      if (bestUrl && bestUrl.includes('books.google.com/books/content')) {
        bestUrl = bestUrl
          .replace(/zoom=\d+/, 'zoom=0') // Maximum zoom for quality
          .replace(/&w=\d+/, '') // Remove width restrictions
          .replace(/&h=\d+/, '') // Remove height restrictions
          .replace('&edge=curl', '') // Remove edge effects
          .replace('http://', 'https://') // Force HTTPS
      }
      
      console.log('📚 Using enhanced Google Books popup:', bestUrl)
      return bestUrl
    }
    
    // Fallback to images array
    if (images && images.length > 0) {
      console.log('📚 Using images array for popup:', images[0])
      return images[0]
    }
    
    return ''
  }

  // Filtrer les amis pour la recherche  
  const filteredFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(recommendSearch.toLowerCase())
  )

  // Déterminer le type de contenu et les statuts appropriés
  const contentType = 'book'
  const getAvailableStatuses = () => {
    return [
      { value: 'want-to-read', label: 'Want To Read' },
      { value: 'currently-reading', label: 'Currently Reading' },
      { value: 'read', label: 'Read' },
      { value: 'paused', label: 'Paused' },
      { value: 'dropped', label: 'Dropped' }
    ]
  }

  // Format status for display
  const formatStatusForDisplay = (status: string | null) => {
    if (!status) return 'Add to Library'
    switch (status) {
      case 'want-to-read': return 'Want To Read'
      case 'currently-reading': return 'Currently Reading'
      case 'read': return 'Read'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      default: return status
    }
  }

  // Trouver l'item dans la bibliothèque - utiliser la même clé que pour l'ajout
  const libraryItem = library.find(item => item.id === bookId && item.category === 'books')
  
  useEffect(() => {
    if (isOpen && bookId) {
      // Clear existing data when changing books
      
      fetchBookDetail()
    }
  }, [isOpen, bookId])

  // Synchroniser le statut avec la bibliothèque (pattern de MovieDetailModalV3)
  useEffect(() => {
    const libraryItem = library.find(item => item.id === bookId && item.category === 'books')
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
      console.log('🔄 Library sync: Found existing library item with status:', libraryItem.status)
    } else {
      setSelectedStatus(null)
      console.log('🔄 Library sync: No library item found, resetting status')
    }
  }, [bookId, library])

  const fetchBookDetail = async () => {
    if (!bookId) return
    
    setLoading(true)
    
    try {
      // Charger les détails du livre
      const data = await googleBooksService.getBookDetails(bookId)
      
      if (data && data.volumeInfo) {
        const volumeInfo = data.volumeInfo
        
        // Mapper les données Google Books vers notre structure
        const bookData: BookDetail = {
          id: data.id,
          title: volumeInfo.title || 'Unknown Title',
          authors: volumeInfo.authors || ['Unknown Author'],
          description: volumeInfo.description || '',
          publishedDate: volumeInfo.publishedDate || '',
          pageCount: volumeInfo.pageCount || 0,
          categories: volumeInfo.categories || [],
          averageRating: volumeInfo.averageRating || 0,
          ratingsCount: volumeInfo.ratingsCount || 0,
          language: volumeInfo.language || 'en',
          publisher: volumeInfo.publisher || '',
          isbn10: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',
          isbn13: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || '',
          imageLinks: {
            thumbnail: volumeInfo.imageLinks?.thumbnail || '',
            small: volumeInfo.imageLinks?.small || volumeInfo.imageLinks?.thumbnail || '',
            medium: volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.thumbnail || '',
            large: volumeInfo.imageLinks?.large || volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.thumbnail || ''
          },
          previewLink: volumeInfo.previewLink || '',
          infoLink: volumeInfo.infoLink || '',
          buyLink: data.saleInfo?.buyLink || ''
        }
        
        setBookDetail(bookData)
        
        // Charger les images
        if (volumeInfo.imageLinks) {
          const imageUrls = [
            volumeInfo.imageLinks.extraLarge,
            volumeInfo.imageLinks.large, 
            volumeInfo.imageLinks.medium,
            volumeInfo.imageLinks.small,
            volumeInfo.imageLinks.thumbnail
          ].filter(Boolean)
          setImages(imageUrls)
        }
        
        // Charger les reviews utilisateur
        await loadUserReviews(bookId)
        
        // Charger les reviews populaires (vraies reviews de Hardcover)
        const isbn = bookData.isbn13 || bookData.isbn10 || undefined
        await loadPopularReviews(bookData.title, bookData.authors?.[0] || 'Unknown Author', isbn)
        
        // Charger d'autres livres du même auteur
        if (bookData.authors && bookData.authors.length > 0) {
          await loadAuthorBooks(bookData.authors[0], bookData.id, bookData.title)
          // Charger les autres éditions de ce livre spécifique
          await loadCurrentBookEditions(bookData.title, bookData.authors[0], bookData.id)
        }

        // Calculer le temps de lecture
        await loadReadingTime()
      }
      
    } catch (error) {
      console.error('Error loading book:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour normaliser les titres et détecter les variantes
  const normalizeTitle = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '') // Supprimer la ponctuation
      .replace(/\b(the|a|an|le|la|les|un|une|des|el|los|las|der|die|das|il|i|gli|le)\b/g, '') // Articles multilingues
      .trim()
  }

  // Fonction pour détecter les traductions du même livre
  const isTranslation = (title1: string, title2: string, language1?: string, language2?: string) => {
    // Si les titres normalisés sont identiques, probablement le même livre
    const normalized1 = normalizeTitle(title1)
    const normalized2 = normalizeTitle(title2)
    
    if (normalized1 === normalized2) return true

    // Patterns de détection de traductions
    const translationPatterns = [
      // Même structure numérique (ex: "1984", "2001", etc.)
      /^\d{3,4}$/,
      
      // Titres très courts (probablement identiques dans toutes les langues)
      /^.{1,4}$/,
      
      // Patterns communs de traductions
      {
        // "Life" variations
        en: /\b(life|lives)\b/,
        fr: /\b(vie|vies)\b/,
        es: /\b(vida|vidas)\b/,
      },
      {
        // "Love" variations  
        en: /\b(love|loved|loving)\b/,
        fr: /\b(amour|aime|aimé)\b/,
        es: /\b(amor|ama|amado)\b/,
      },
      {
        // "Death" variations
        en: /\b(death|dead|die)\b/,
        fr: /\b(mort|morte|mourir)\b/,
        es: /\b(muerte|muerto|morir)\b/,
      },
      {
        // "Years" variations
        en: /\b(year|years|century|centuries)\b/,
        fr: /\b(an|ans|année|années|siècle|siècles)\b/,
        es: /\b(año|años|siglo|siglos)\b/,
      },
      {
        // "House" variations
        en: /\b(house|home)\b/,
        fr: /\b(maison|foyer)\b/,
        es: /\b(casa|hogar)\b/,
      }
    ]

    // Vérifier les patterns numériques
    const numericPattern = /^\d{3,4}$/
    if (numericPattern.test(normalized1) && numericPattern.test(normalized2)) {
      return normalized1 === normalized2
    }

    // Vérifier les patterns de traduction
    for (const pattern of translationPatterns) {
      if (typeof pattern === 'object' && pattern.en && pattern.fr && pattern.es) {
        const hasEnglish = pattern.en.test(normalized1) || pattern.en.test(normalized2)
        const hasFrench = pattern.fr.test(normalized1) || pattern.fr.test(normalized2)
        const hasSpanish = pattern.es.test(normalized1) || pattern.es.test(normalized2)
        
        // Si on trouve des mots correspondants dans différentes langues
        if ((hasEnglish && hasFrench) || (hasEnglish && hasSpanish) || (hasFrench && hasSpanish)) {
          // Vérifier que les structures sont similaires (même nombre de mots principaux)
          const words1 = normalized1.split(' ').filter(w => w.length > 2)
          const words2 = normalized2.split(' ').filter(w => w.length > 2)
          
          if (Math.abs(words1.length - words2.length) <= 1) {
            return true
          }
        }
      }
    }

    // Détecter les séries numérotées traduites (ex: "Book 1", "Livre 1", "Libro 1")
    const seriesPattern1 = normalized1.match(/(\w+)\s*(\d+)/)
    const seriesPattern2 = normalized2.match(/(\w+)\s*(\d+)/)
    
    if (seriesPattern1 && seriesPattern2 && seriesPattern1[2] === seriesPattern2[2]) {
      // Même numéro de série
      const seriesWords = {
        en: ['book', 'volume', 'part', 'tome'],
        fr: ['livre', 'volume', 'partie', 'tome'],
        es: ['libro', 'volumen', 'parte', 'tomo']
      }
      
      const word1 = seriesPattern1[1].toLowerCase()
      const word2 = seriesPattern2[1].toLowerCase()
      
      for (const lang of Object.values(seriesWords)) {
        if (lang.includes(word1) && lang.includes(word2)) {
          return true
        }
      }
    }

    return false
  }

  // Fonction pour détecter si deux livres sont la même œuvre (différentes éditions)
  const isSameWork = (title1: string, title2: string, author1?: string, author2?: string) => {
    const normalized1 = normalizeTitle(title1)
    const normalized2 = normalizeTitle(title2)
    
    // Comparaison exacte après normalisation
    if (normalized1 === normalized2) {
      // Si on a les auteurs, on vérifie qu'ils correspondent aussi
      if (author1 && author2) {
        const normalizedAuthor1 = normalizeTitle(author1)
        const normalizedAuthor2 = normalizeTitle(author2)
        return normalizedAuthor1 === normalizedAuthor2
      }
      return true
    }
    
    // Vérifier si l'un est contenu dans l'autre (pour gérer les sous-titres)
    if (normalized1.length > 3 && normalized2.length > 3) {
      const titleMatch = normalized1.includes(normalized2) || normalized2.includes(normalized1)
      
      // Si les titres correspondent partiellement, vérifier l'auteur
      if (titleMatch && author1 && author2) {
        const normalizedAuthor1 = normalizeTitle(author1)
        const normalizedAuthor2 = normalizeTitle(author2)
        return normalizedAuthor1 === normalizedAuthor2
      }
      
      return titleMatch
    }
    
    return false
  }

  const loadAuthorBooks = async (author: string, currentBookId: string, currentBookTitle: string) => {
    try {
      setLoadingAuthorBooks(true)
      const books = await googleBooksService.getBooksByAuthor(author, 15)
      
      // Exclure le livre actuel et ses éditions
      const excludeCurrentBook = books.filter(book => {
        if (book.id === currentBookId) return false
        
        const bookTitle = book.volumeInfo?.title || ''
        if (isSameWork(bookTitle, currentBookTitle)) {
          return false // Exclure toutes les éditions du livre actuel
        }
        
        return true
      })
      
      // Déduplication avancée avec détection des traductions
      const uniqueBooks: any[] = []
      const processedTitles: any[] = []
      
      excludeCurrentBook.forEach(book => {
        const bookTitle = book.volumeInfo?.title || ''
        const bookLanguage = book.volumeInfo?.language || 'en'
        
        // Vérifier si ce livre est une traduction d'un livre déjà ajouté
        const isAlreadyAdded = processedTitles.some(processed => {
          return isTranslation(bookTitle, processed.title, bookLanguage, processed.language) ||
                 isSameWork(bookTitle, processed.title)
        })
        
        if (!isAlreadyAdded) {
          uniqueBooks.push(book)
          processedTitles.push({
            title: bookTitle,
            language: bookLanguage,
            book: book
          })
        } else {
          console.log(`📚 Filtering translation/duplicate: "${bookTitle}" (${bookLanguage})`)
        }
      })
      
      // Convertir les livres uniques
      const convertedUniqueBooks = uniqueBooks
        .slice(0, 6)
        .map(book => googleBooksService.convertToAppFormat(book))
      
      setAuthorBooks(convertedUniqueBooks)
      console.log(`📚 Loaded ${convertedUniqueBooks.length} unique books from ${author}`)
      
    } catch (error) {
      console.error('Error loading author books:', error)
    } finally {
      setLoadingAuthorBooks(false)
    }
  }

  const loadCurrentBookEditions = async (currentBookTitle: string, currentBookAuthor: string, currentBookId: string) => {
    try {
      // Rechercher spécifiquement les autres éditions de ce livre
      const books = await googleBooksService.searchBooks(currentBookTitle, 20)
      
      // Filtrer pour ne garder que les autres éditions du même livre (même titre + même auteur)
      const currentBookEditions = books.filter(book => {
        if (book.id === currentBookId) return false // Exclure le livre actuel
        
        const bookTitle = book.volumeInfo?.title || ''
        const bookAuthor = book.volumeInfo?.authors?.[0] || ''
        
        return isSameWork(bookTitle, currentBookTitle, bookAuthor, currentBookAuthor) // Vérifier titre + auteur
      })
      
      // Convertir les éditions
      const convertedEditions = currentBookEditions
        .slice(0, 8)
        .map(book => googleBooksService.convertToAppFormat(book))
      
      setCurrentBookEditions(convertedEditions)
      console.log(`📖 Found ${convertedEditions.length} other editions of "${currentBookTitle}" by ${currentBookAuthor}`)
      
    } catch (error) {
      console.error('Error loading current book editions:', error)
      setCurrentBookEditions([])
    }
  }

  const loadUserReviews = async (bookId: string) => {
    try {
      setLoadingReviews(true)
      console.log('📝 Loading reviews for book ID:', bookId)
      
      // Charger la review de l'utilisateur actuel
      const userReviewData = await userReviewsService.getUserReviewForMedia(bookId)
      console.log('📝 User review found:', userReviewData)
      if (userReviewData) {
        setCurrentUserReview(userReviewData)
        setUserRating(userReviewData.rating)
        setUserReview(userReviewData.review_text || '')
        setReviewPrivacy(userReviewData.is_public ? 'public' : 'private')
        setShowShareThoughtsPrompt(false)
      }
      
      // Charger les reviews publiques
      const reviews = await userReviewsService.getPublicReviewsForMedia(bookId)
      console.log('📝 Public reviews found:', reviews.length, 'for book:', bookId)
      setPublicReviews(reviews)
      
    } catch (error) {
      console.error('📝 Error loading user reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const loadPopularReviews = async (bookTitle: string, author: string, isbn?: string) => {
    try {
      setLoadingPopularReviews(true)
      console.log('📚 Loading REAL reviews from Hardcover for:', bookTitle, 'by', author, 'ISBN:', isbn)
      
      // Utiliser Hardcover pour obtenir de vraies reviews
      const realReviews = await hardcoverService.getBookReviews(isbn, bookTitle, author)
      
      if (realReviews.length > 0) {
        setPopularReviews(realReviews)
        console.log('📚 ✅ Loaded', realReviews.length, 'REAL reviews from Hardcover!')
      } else {
        // Si aucune review trouvée, on garde la liste vide (pas de reviews simulées)
        setPopularReviews([])
        console.log('📚 ℹ️ No reviews found for this book on Hardcover')
      }
      
    } catch (error) {
      console.error('📚 Error loading real reviews:', error)
      setPopularReviews([])
    } finally {
      setLoadingPopularReviews(false)
    }
  }

  const togglePopularReviewExpansion = (reviewId: string) => {
    setExpandedPopularReviews(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }

  const handleLikePopularReview = async (reviewId: string) => {
    try {
      // Vérifier si c'est une review Stackr (commence par "stackr-")
      if (reviewId.startsWith('stackr-')) {
        // Pour les reviews Stackr, on ne peut pas vraiment les modifier car elles sont recalculées
        // On pourrait implémenter un système de likes pour les reviews publiques ici
        console.log('📚 Liked Stackr review:', reviewId)
        return
      }

      // Pour les reviews Hardcover, on simule le like en local car l'API nécessite une auth
      setPopularReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { ...review, likesCount: review.likesCount + 1 }
            : review
        )
      )
      console.log('📚 Liked Hardcover review:', reviewId)
    } catch (error) {
      console.error('Error liking review:', error)
    }
  }

  // Fusionner les reviews Hardcover et Stackr en format unifié
  const getMergedReviews = () => {
    const mergedReviews: Array<{
      id: string
      user: { username: string; avatarUrl?: string }
      rating: number
      body: string
      createdAt: string
      likesCount: number
      commentsCount: number
      spoiler: boolean
      source: 'hardcover' | 'stackr'
      hasLiked?: boolean
    }> = []

    // Ajouter les reviews Hardcover (vraies reviews)
    popularReviews.forEach(review => {
      mergedReviews.push({
        id: review.id,
        user: {
          username: review.user.username,
          avatarUrl: review.user.avatarUrl
        },
        rating: review.rating,
        body: review.body,
        createdAt: review.createdAt,
        likesCount: review.likesCount,
        commentsCount: review.commentsCount,
        spoiler: review.spoiler,
        source: 'hardcover',
        hasLiked: false
      })
    })

    // Ajouter les reviews Stackr (community reviews)
    publicReviews.forEach(review => {
      mergedReviews.push({
        id: `stackr-${review.id}`,
        user: {
          username: 'Stackr User',
          avatarUrl: undefined
        },
        rating: review.rating,
        body: review.review_text || '',
        createdAt: review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recently',
        likesCount: Math.floor(Math.random() * 1000) + 100,
        commentsCount: Math.floor(Math.random() * 100) + 10,
        spoiler: false,
        source: 'stackr',
        hasLiked: false
      })
    })

    // Trier pour mettre les reviews Stackr en premier, puis les Hardcover
    return mergedReviews.sort((a, b) => {
      if (a.source === 'stackr' && b.source === 'hardcover') return -1
      if (a.source === 'hardcover' && b.source === 'stackr') return 1
      return 0 // Garder l'ordre original pour les reviews de même source
    })
  }

  // Calculer le temps de lecture
  const loadReadingTime = async () => {
    if (!bookDetail) return

    try {
      // Calculer le temps de lecture (fonction simple sans service externe)
      const estimatedTime = calculateReadingTime(bookDetail.pageCount)
      setReadingTime(estimatedTime)
      
    } catch (error) {
      console.error('⏰ Error calculating reading time:', error)
    }
  }

  // Fonction utilitaire pour calculer le temps de lecture
  const calculateReadingTime = (pageCount?: number): string | null => {
    if (!pageCount || pageCount <= 0) return null
    
    // Estimation basique : 250 mots par page, 200 mots par minute
    const wordsPerPage = 250
    const wordsPerMinute = 200
    const totalWords = pageCount * wordsPerPage
    const totalMinutes = Math.round(totalWords / wordsPerMinute)
    
    if (totalMinutes < 60) {
      return `${totalMinutes} min read`
    } else {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return minutes > 0 ? `${hours}h ${minutes}m read` : `${hours}h read`
    }
  }


  const handleRatingClick = async (rating: number) => {
    setUserRating(rating)
    setShowReviewBox(true)
    setShowShareThoughtsPrompt(true)
  }


  const handleReviewSubmit = async () => {
    if (!bookDetail) return

    try {
      const reviewData = {
        mediaId: bookId,
        mediaTitle: bookDetail.title,
        mediaCategory: 'books' as const,
        rating: userRating,
        reviewText: userReview.trim() || undefined,
        isPublic: reviewPrivacy === 'public'
      }

      console.log('📝 Submitting review for book ID:', bookId, 'Book Detail ID:', bookDetail.id, 'Title:', bookDetail.title)
      console.log('📝 Review data:', reviewData)

      if (currentUserReview) {
        // Pour mettre à jour, on supprime puis on recrée
        console.log('📝 Updating existing review')
        await userReviewsService.deleteUserReview(bookId)
        await userReviewsService.submitReview(reviewData)
      } else {
        console.log('📝 Creating new review')
        await userReviewsService.submitReview(reviewData)
      }

      // Recharger les reviews
      await loadUserReviews(bookId)
      setShowReviewBox(false)
      setShowShareThoughtsPrompt(false)
      
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }

  const handleEditReview = () => {
    if (currentUserReview) {
      setEditRating(currentUserReview.rating)
      setEditReviewText(currentUserReview.review_text || '')
      setEditReviewPrivacy(currentUserReview.is_public ? 'public' : 'private')
      setIsEditingReview(true)
    }
  }

  const handleUpdateReview = async () => {
    if (!currentUserReview || !bookDetail) return

    try {
      const reviewData = {
        mediaId: bookId,
        mediaTitle: bookDetail.title,
        mediaCategory: 'books' as const,
        rating: editRating,
        reviewText: editReviewText.trim() || undefined,
        isPublic: editReviewPrivacy === 'public'
      }

      await userReviewsService.deleteUserReview(bookId)
      await userReviewsService.submitReview(reviewData)
      
      // Recharger les reviews
      await loadUserReviews(bookId)
      setIsEditingReview(false)
      
    } catch (error) {
      console.error('Error updating review:', error)
    }
  }

  const handleDeleteReview = async () => {
    if (!currentUserReview) return

    try {
      await userReviewsService.deleteUserReview(bookId)
      
      // Reset local state
      setCurrentUserReview(null)
      setUserRating(0)
      setUserReview('')
      setReviewPrivacy('private')
      setShowShareThoughtsPrompt(true)
      
      // Recharger les reviews
      await loadUserReviews(bookId)
      
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  const handleAddToLibrary = async (status: MediaStatus) => {
    if (!bookDetail) return
    
    const bookData = {
      id: bookId, // Utiliser bookId (de props) comme clé principale, comme MovieDetailModalV3
      title: bookDetail.title,
      author: bookDetail.authors?.join(', ') || 'Unknown Author',
      description: bookDetail.description || '',
      image: images[0] || bookDetail.imageLinks?.thumbnail || '',
      category: 'books' as const,
      external_id: bookDetail.id, // Garder l'ID Google Books pour référence
      year: bookDetail.publishedDate ? new Date(bookDetail.publishedDate).getFullYear().toString() : ''
    }
    
    console.log('📚 Adding to library:', { bookData, status })
    await onAddToLibrary(bookData, status)
    setSelectedStatus(status)
    setShowStatusDropdown(false)
    console.log('✅ Library status updated to:', status)
    
    // Reload reviews when status changes to show rating option
    if (['read', 'paused', 'dropped'].includes(status)) {
      await loadUserReviews(bookId)
    }
  }

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="bg-[#0B0B0B] w-full h-full md:max-w-4xl md:h-[95vh] md:rounded-2xl overflow-hidden flex flex-col">
        {loading ? (
          <StackrLoadingSkeleton 
            message="Loading your book..."
            className="flex-1 justify-center"
            theme="green"
            size="medium"
            speed="normal"
          />
        ) : bookDetail ? (
          <>
            {/* Header with Book Cover */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] border-b border-gray-700/50 shadow-xl">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white z-10"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-start space-x-4">
                {/* Small Book Cover - Clickable with BookCover component */}
                <button
                  onClick={() => bookDetail.imageLinks && setShowImagePopup(true)}
                  className="w-16 h-20 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-green-500 transition-all cursor-pointer"
                >
                  <BookCover
                    book={{
                      id: bookDetail.id,
                      image: bookDetail.imageLinks?.thumbnail || bookDetail.imageLinks?.small,
                      isbn: bookDetail.isbn13 || bookDetail.isbn10,
                      title: bookDetail.title,
                      authors: bookDetail.authors
                    }}
                    className="w-full h-full bg-gray-800 rounded-lg"
                    showSkeleton={false}
                    objectFit="contain"
                    minHeight="80px"
                  />
                </button>
                
                {/* Title and Info */}
                <div className="flex-1 pr-12">
                  <h1 className="text-xl font-bold text-white mb-1">{bookDetail.title}</h1>
                  <div className="text-sm text-gray-400 mb-1">
                    {bookDetail.authors?.join(', ')}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {bookDetail.publishedDate && (
                      <span>{new Date(bookDetail.publishedDate).getFullYear()}</span>
                    )}
                    {bookDetail.publishedDate && bookDetail.pageCount && (
                      <span>•</span>
                    )}
                    {bookDetail.pageCount && (
                      <span>{bookDetail.pageCount} pages</span>
                    )}
                    {(bookDetail.pageCount || bookDetail.publishedDate) && readingTime && (
                      <span>•</span>
                    )}
                    {readingTime && (
                      <span>{readingTime} read</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6">

              {/* Action Buttons - Add to Library + Share */}
              <div className="flex space-x-3 mb-6 mt-6">
                {/* Status Button */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>{formatStatusForDisplay(selectedStatus)}</span>
                  </button>
                  
                  {/* Status Dropdown */}
                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-10">
                      {getAvailableStatuses().map((status) => (
                        <button
                          key={status.value}
                          onClick={() => handleAddToLibrary(status.value as MediaStatus)}
                          className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 first:rounded-t-lg"
                        >
                          {status.label}
                        </button>
                      ))}
                      {libraryItem && (
                        <button
                          onClick={() => {
                            if (onDeleteItem) {
                              onDeleteItem(libraryItem.id)
                              setShowStatusDropdown(false)
                              setSelectedStatus(null)
                            }
                          }}
                          className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-700 last:rounded-b-lg"
                        >
                          Remove from Library
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Share Button */}
                <button 
                  onClick={() => setShowRecommendModal(true)}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <Share size={20} />
                  <span>Share</span>
                </button>

                {/* Product Sheet Button - Only show for read status */}
                {selectedStatus === 'read' && (
                  <button 
                    onClick={() => setShowProductSheet(true)}
                    className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                    title="Book Sheet"
                  >
                    <List size={20} />
                  </button>
                )}
              </div>

              {/* Friends who read this book */}
              {friendsWhoRead.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">Friends who read:</span>
                      <div className="flex -space-x-1">
                        {friendsWhoRead.slice(0, 4).map((friend) => (
                          <div
                            key={friend.id}
                            className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0B0B0B]"
                            title={`${friend.name} - ${friend.rating}/5 stars`}
                          >
                            {friend.name.charAt(0)}
                          </div>
                        ))}
                        {friendsWhoRead.length > 4 && (
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0B0B0B]">
                            +{friendsWhoRead.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowFriendsWhoRead(true)}
                      className="text-transparent bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-sm hover:underline"
                    >
                      View all
                    </button>
                  </div>
                </div>
              )}

            {/* Image Popup */}
            {showImagePopup && getBookPopupImage() && bookDetail && (
              <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setShowImagePopup(false)}>
                <div className="relative w-full max-w-2xl h-full max-h-[90vh] flex items-center justify-center">
                  <button
                    onClick={() => setShowImagePopup(false)}
                    className="absolute top-4 right-4 text-white bg-black/70 hover:bg-black/90 rounded-full p-3 z-10 shadow-lg"
                  >
                    <X size={24} />
                  </button>
                  <img
                    src={getBookPopupImage()}
                    alt={bookDetail.title}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    style={{
                      minHeight: '400px',
                      minWidth: '300px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

              {/* Rating System - Only show for read/paused/dropped status */}
              {!currentUserReview && selectedStatus && ['read', 'paused', 'dropped'].includes(selectedStatus) && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3">Rate this book</h3>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingClick(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                      >
                        <Star
                          size={24}
                          className={`${
                            star <= (hoverRating || userRating)
                              ? 'text-green-400 fill-green-400'
                              : 'text-gray-600'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Box */}
              {showReviewBox && (
                <div className="mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Share your thoughts</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setReviewPrivacy('private')}
                          className={`px-3 py-1 text-xs rounded-full ${
                            reviewPrivacy === 'private'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          Private
                        </button>
                        <button
                          onClick={() => setReviewPrivacy('public')}
                          className={`px-3 py-1 text-xs rounded-full ${
                            reviewPrivacy === 'public'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          Public
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      placeholder="Optional: Add your thoughts..."
                      className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-gray-600"
                    />
                    <div className="flex justify-between items-center mt-3">
                      <button 
                        onClick={() => {
                          setShowReviewBox(false)
                          setUserReview('')
                        }}
                        className="px-4 py-2 text-gray-400 text-sm font-medium hover:text-white transition-colors"
                      >
                        Skip review
                      </button>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setShowReviewBox(false)
                            setUserReview('')
                          }}
                          className="px-4 py-2 text-gray-400 text-sm font-medium hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleReviewSubmit}
                          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Your Review - Style Steam/Letterboxd */}
              {currentUserReview && (
                <div className="mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-6 border border-gray-700/50">
                  {/* Header avec Edit/Delete à droite */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold">Your review</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleEditReview}
                        className="text-white text-sm font-medium hover:text-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDeleteReview}
                        className="text-white text-sm font-medium hover:text-gray-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Review content */}
                  <div className="py-4 md:py-6">
                    {/* Header compacte: Avatar + Username + Rating + Privacy */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {/* Avatar responsive 36px mobile, 40px desktop */}
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-xs md:text-sm font-medium text-white flex-shrink-0">
                          U
                        </div>
                        
                        {/* Username + Rating sur même ligne */}
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium text-sm">You</span>
                          
                          {/* Rating étoiles compactes */}
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={`${
                                  star <= currentUserReview.rating
                                    ? 'text-green-400 fill-current'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          
                          {/* Privacy status à côté des étoiles */}
                          <span className="text-gray-400 text-xs">
                            ({currentUserReview.is_public ? 'public' : 'private'})
                          </span>
                        </div>
                      </div>
                      
                      {/* Comments count à droite */}
                      <div className="flex items-center space-x-1 text-gray-400">
                        <span>💬</span>
                        <span className="text-sm">{Math.floor(Math.random() * 100) + 10}</span>
                      </div>
                    </div>
                    
                    {/* Review text avec padding aligné au username */}
                    {currentUserReview.review_text && (
                      <div className="ml-11 md:ml-12 mb-2"> {/* 44px mobile, 48px desktop */}
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {currentUserReview.review_text}
                        </p>
                      </div>
                    )}
                    
                    {/* Footer: Likes avec même padding */}
                    <div className="ml-11 md:ml-12">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <span>❤️</span>
                        <span className="text-sm">
                          {Math.floor(Math.random() * 100) + 10} likes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Review Modal */}
              {isEditingReview && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-white font-semibold mb-4">Edit Review</h3>
                    
                    <div className="mb-4">
                      <label className="block text-gray-300 text-sm mb-2">Rating</label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setEditRating(star)}
                            className="p-1"
                          >
                            <Star
                              size={24}
                              className={`${
                                star <= editRating
                                  ? 'text-green-400 fill-green-400'
                                  : 'text-gray-600'
                              } transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-300 text-sm mb-2">Review</label>
                      <textarea
                        value={editReviewText}
                        onChange={(e) => setEditReviewText(e.target.value)}
                        placeholder="Your thoughts..."
                        className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-gray-600"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-300 text-sm mb-2">Privacy</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditReviewPrivacy('private')}
                          className={`px-3 py-1 text-xs rounded-full ${
                            editReviewPrivacy === 'private'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          Private
                        </button>
                        <button
                          onClick={() => setEditReviewPrivacy('public')}
                          className={`px-3 py-1 text-xs rounded-full ${
                            editReviewPrivacy === 'public'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          Public
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditingReview(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateReview}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ratings */}
              {bookDetail.averageRating && (
                <div className="mb-6">
                  <div className="flex space-x-8">
                    <div>
                      <h3 className="text-white font-semibold mb-1">Google Books</h3>
                      <p className="text-gray-300">{bookDetail.averageRating}/5</p>
                    </div>
                    {bookDetail.ratingsCount && (
                      <div>
                        <h3 className="text-white font-semibold mb-1">Ratings</h3>
                        <p className="text-gray-300">{bookDetail.ratingsCount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {bookDetail.description && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-2">Description</h3>
                  <FormattedDescription htmlContent={bookDetail.description} />
                </div>
              )}

              {/* Details */}
              <div className="space-y-3 mb-6">
                <div className="flex">
                  <span className="text-gray-400 w-20 flex-shrink-0">Author:</span>
                  <span className="text-white flex-1">{bookDetail.authors?.join(', ')}</span>
                </div>
                {bookDetail.publisher && (
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Publisher:</span>
                    <span className="text-white flex-1">{bookDetail.publisher}</span>
                  </div>
                )}
                {bookDetail.publishedDate && (
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Published:</span>
                    <span className="text-white flex-1">{bookDetail.publishedDate}</span>
                  </div>
                )}
                {bookDetail.pageCount && (
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Pages:</span>
                    <span className="text-white flex-1">{bookDetail.pageCount}</span>
                  </div>
                )}
                {bookDetail.categories && bookDetail.categories.length > 0 && (
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Genre:</span>
                    <span className="text-white flex-1">{bookDetail.categories.join(', ')}</span>
                  </div>
                )}
                {bookDetail.language && (
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Language:</span>
                    <span className="text-white flex-1">{bookDetail.language.toUpperCase()}</span>
                  </div>
                )}
                {readingTime && (
                  <div className="flex">
                    <span className="text-gray-400 w-20 flex-shrink-0">Read time:</span>
                    <span className="text-white flex-1">{readingTime}</span>
                  </div>
                )}
              </div>



              {/* More from this author */}
              {authorBooks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4">More from {bookDetail.authors?.[0]}</h3>
                  <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                    {authorBooks.map((book) => (
                      <div 
                        key={book.id} 
                        className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onBookSelect?.(book.id.replace('book-', ''))}
                      >
                        <BookCover
                          book={{
                            id: book.id,
                            image: book.image,
                            isbn: book.isbn,
                            title: book.title,
                            authors: book.authors ? [book.authors] : []
                          }}
                          className="w-full h-36 rounded-lg mb-2"
                          showSkeleton={false}
                        />
                        <p className="text-white text-sm font-medium truncate" title={book.title}>
                          {book.title}
                        </p>
                        <p className="text-gray-400 text-xs">{book.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Editions */}
              {currentBookEditions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4">
                    Other Editions of "{bookDetail.title}"
                    <span className="text-gray-400 text-sm font-normal ml-2">
                      ({currentBookEditions.length} editions found)
                    </span>
                  </h3>
                  <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                    {currentBookEditions.map((book) => (
                      <div 
                        key={book.id} 
                        className="flex-shrink-0 w-28 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onBookSelect?.(book.id.replace('book-', ''))}
                      >
                        <div className="relative">
                          <BookCover
                            book={{
                              id: book.id,
                              image: book.image,
                              isbn: book.isbn,
                              title: book.title,
                              authors: book.authors ? [book.authors] : []
                            }}
                            className="w-full h-36 rounded-lg mb-2"
                            showSkeleton={false}
                          />
                          {/* Edition badge */}
                          <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded text-center">
                            Ed.
                          </div>
                        </div>
                        <p className="text-white text-sm font-medium truncate" title={book.title}>
                          {book.title}
                        </p>
                        <p className="text-gray-400 text-xs">{book.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Reviews - Fusion des reviews Hardcover + Stackr */}
              {(() => {
                const mergedReviews = getMergedReviews()
                return (mergedReviews.length > 0 || loadingPopularReviews) && (
                  <div className="mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-6 border border-gray-700/50">
                    {/* Header avec MORE à droite */}
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-white font-semibold">Popular reviews</h3>
                      <button 
                        onClick={() => setShowAllPopularReviews(!showAllPopularReviews)}
                        className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                      >
                        {showAllPopularReviews ? 'LESS' : 'MORE'}
                      </button>
                    </div>
                    
                    {/* Reviews list avec séparateurs */}
                    {loadingPopularReviews ? (
                      <div className="text-center py-8">
                        <div className="text-gray-400">Loading real reviews from Hardcover...</div>
                      </div>
                    ) : mergedReviews.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">No reviews found for this book yet.</p>
                        <p className="text-gray-500 text-xs mt-2">Be the first to review it!</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {mergedReviews.slice(0, showAllPopularReviews ? undefined : 6).map((review, index) => (
                        <div key={review.id}>
                          {/* Review content */}
                          <div className="py-4 md:py-6">
                            {/* Header compacte: Avatar + Username + Rating + Source Badge */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {/* Avatar responsive 36px mobile, 40px desktop */}
                                {review.user.avatarUrl ? (
                                  <img 
                                    src={review.user.avatarUrl} 
                                    alt={review.user.username}
                                    className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-xs md:text-sm font-medium text-white flex-shrink-0">
                                    {review.user.username?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                )}
                                
                                {/* Username + Rating + Source sur même ligne */}
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-medium text-sm">{review.user.username || 'Anonymous'}</span>
                                  
                                  {/* Source badge */}
                                  {review.source === 'hardcover' && (
                                    <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded border border-blue-600/30">
                                      Hardcover
                                    </span>
                                  )}
                                  {review.source === 'stackr' && (
                                    <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30">
                                      Stackr
                                    </span>
                                  )}
                                  
                                  {/* Rating étoiles compactes */}
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={14}
                                        className={`${
                                          star <= review.rating
                                            ? 'text-green-400 fill-current'
                                            : 'text-gray-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Comments count à droite + date */}
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1 text-gray-400">
                                  <span>💬</span>
                                  <span className="text-sm">{review.commentsCount}</span>
                                </div>
                                <span className="text-gray-500 text-xs">{review.createdAt}</span>
                              </div>
                            </div>
                            
                            {/* Review text avec padding aligné au username */}
                            {review.body && (
                              <div className="ml-11 md:ml-12 mb-2"> {/* 44px mobile, 48px desktop */}
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {review.spoiler && !expandedPopularReviews.has(review.id) && (
                                    <span className="text-yellow-500 text-xs mr-2">[SPOILER WARNING]</span>
                                  )}
                                  {expandedPopularReviews.has(review.id) || review.body.length <= 300 
                                    ? review.body 
                                    : review.body.substring(0, 300) + '...'}
                                  {review.body.length > 300 && (
                                    <button
                                      onClick={() => togglePopularReviewExpansion(review.id)}
                                      className="text-blue-400 text-sm ml-2 hover:underline"
                                    >
                                      {expandedPopularReviews.has(review.id) ? 'See less' : 'See more'}
                                    </button>
                                  )}
                                </p>
                              </div>
                            )}
                            
                            {/* Footer: Likes avec même padding */}
                            <div className="ml-11 md:ml-12">
                              <div className="flex items-center space-x-1 text-gray-400">
                                <button
                                  onClick={() => handleLikePopularReview(review.id)}
                                  className={`flex items-center space-x-1 transition-colors ${
                                    review.hasLiked ? 'text-red-400' : 'hover:text-red-400'
                                  }`}
                                >
                                  <span>❤️</span>
                                  <span className="text-sm">
                                    {review.likesCount.toLocaleString()} likes
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Séparateur vert pointillé - longs traits (sauf pour le dernier) */}
                          {index < (showAllPopularReviews ? mergedReviews : mergedReviews.slice(0, 6)).length - 1 && (
                            <div className="border-t border-green-400/20 border-dashed"></div>
                          )}
                        </div>
                      ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* External Links */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Links</h3>
                <div className="flex flex-wrap gap-2">
                  {bookDetail.previewLink && (
                    <button
                      onClick={() => window.open(bookDetail.previewLink, '_blank')}
                      className="px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <ExternalLink size={14} />
                      <span>Preview</span>
                    </button>
                  )}
                  {bookDetail.infoLink && (
                    <button
                      onClick={() => window.open(bookDetail.infoLink, '_blank')}
                      className="px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <ExternalLink size={14} />
                      <span>Google Books</span>
                    </button>
                  )}
                  {bookDetail.buyLink && (
                    <button
                      onClick={() => window.open(bookDetail.buyLink, '_blank')}
                      className="px-3 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition-colors flex items-center space-x-2"
                    >
                      <ExternalLink size={14} />
                      <span>Buy</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Product Sheet Modal */}
            {showProductSheet && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Book Sheet</h3>
                    <button
                      onClick={() => setShowProductSheet(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Read Date</label>
                      <input
                        type="date"
                        value={productSheetData.readDate}
                        onChange={(e) => setProductSheetData(prev => ({ ...prev, readDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Format</label>
                      <select
                        value={productSheetData.format}
                        onChange={(e) => setProductSheetData(prev => ({ ...prev, format: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                      >
                        <option value="">Select format</option>
                        <option value="physical">Physical Book</option>
                        <option value="ebook">E-Book</option>
                        <option value="audiobook">Audiobook</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Location</label>
                      <input
                        type="text"
                        value={productSheetData.location}
                        onChange={(e) => setProductSheetData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Where did you read it?"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Mood</label>
                      <input
                        type="text"
                        value={productSheetData.mood}
                        onChange={(e) => setProductSheetData(prev => ({ ...prev, mood: e.target.value }))}
                        placeholder="How did it make you feel?"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Rating</label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setProductSheetData(prev => ({ ...prev, personalRating: star }))}
                            className="p-1"
                          >
                            <Star
                              size={20}
                              className={`${
                                star <= productSheetData.personalRating
                                  ? 'text-green-400 fill-green-400'
                                  : 'text-gray-600'
                              } transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Notes</label>
                      <textarea
                        value={productSheetData.personalReview}
                        onChange={(e) => setProductSheetData(prev => ({ ...prev, personalReview: e.target.value }))}
                        placeholder="Personal thoughts..."
                        className="w-full h-20 px-3 py-2 bg-gray-700 text-white rounded-lg resize-none border border-gray-600 focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      onClick={() => setShowProductSheet(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Save to localStorage
                        if (bookDetail) {
                          const data = { ...productSheetData, bookId: bookDetail.id }
                          localStorage.setItem(`bookProductSheet_${bookDetail.id}`, JSON.stringify(data))
                          console.log('Book sheet saved:', data)
                        }
                        setShowProductSheet(false)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation Modal */}
            {showRecommendModal && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-[#1A1A1A] rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Share "{bookDetail?.title}"</h3>
                    <button
                      onClick={() => {
                        setShowRecommendModal(false)
                        setShowMoreShareOptions(false)
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {!showMoreShareOptions ? (
                    <>
                      {/* Send to Friends Section */}
                      <div className="mb-6">
                        <h4 className="text-white font-medium mb-3">Send to friends in Stackr</h4>
                        <button
                          onClick={() => setShowShareWithFriendsModal(true)}
                          className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Users size={18} />
                          <span>Share with Friends</span>
                        </button>
                        
                        <button
                          onClick={() => setShowMoreShareOptions(true)}
                          className="mt-3 w-full py-2 px-4 border border-green-600 text-green-400 text-sm font-medium rounded-lg hover:bg-green-600/10 transition-colors"
                        >
                          More sharing options
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* External Share Section */}
                      <div className="border-t border-gray-700 pt-4 mb-6">
                        <h4 className="text-white font-medium mb-3">Share externally</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleExternalShare('whatsapp')}
                            className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#25D366]/20 border border-[#25D366]/30 rounded-lg hover:bg-[#25D366]/30 transition-colors"
                          >
                            <span>💬</span>
                            <span className="text-white text-sm">WhatsApp</span>
                          </button>
                          
                          <button
                            onClick={() => handleExternalShare('imessage')}
                            className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg hover:bg-[#007AFF]/30 transition-colors"
                          >
                            <span>💬</span>
                            <span className="text-white text-sm">iMessage</span>
                          </button>
                          
                          <button
                            onClick={() => handleExternalShare('email')}
                            className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            <span>📧</span>
                            <span className="text-white text-sm">Email</span>
                          </button>
                          
                          <button
                            onClick={() => handleExternalShare('copy')}
                            className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            <span>📋</span>
                            <span className="text-white text-sm">Copy Link</span>
                          </button>
                          
                          <button
                            onClick={() => handleExternalShare('twitter')}
                            className="flex items-center justify-center space-x-2 py-2 px-3 bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 rounded-lg hover:bg-[#1DA1F2]/30 transition-colors"
                          >
                            <span>🐦</span>
                            <span className="text-white text-sm">Twitter</span>
                          </button>
                          
                          {navigator.share && (
                            <button
                              onClick={() => handleExternalShare('native')}
                              className="flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-[#10B981]/20 to-[#34D399]/20 border border-[#10B981]/30 rounded-lg hover:bg-gradient-to-r hover:from-[#10B981]/30 hover:to-[#34D399]/30 transition-colors"
                            >
                              <span>📱</span>
                              <span className="text-white text-sm">Share</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Plan Book Club Meeting Button - Always visible */}
                  <div className="border-t border-gray-700 pt-4">
                    <button
                      onClick={() => {
                        setShowBookClubModal(true)
                        setShowRecommendModal(false)
                        setShowMoreShareOptions(false)
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                    >
                      <span>📚</span>
                      <span>Plan a Book Club Meeting</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Friends Who Read Modal */}
        {showFriendsWhoRead && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] rounded-lg p-6 w-96 max-h-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Friends who read {bookDetail?.title}</h3>
                <button
                  onClick={() => setShowFriendsWhoRead(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Friends List - Style Steam/Letterboxd */}
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-0">
                  {friendsWhoRead.map((friend, index) => (
                    <div key={friend.id}>
                      <div className="py-4">
                        {/* Header compacte: Avatar + Username + Rating */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {/* Avatar */}
                            <div className="w-9 h-9 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                              {friend.name.charAt(0)}
                            </div>
                            
                            {/* Username + Rating sur même ligne */}
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium text-sm">{friend.name}</span>
                              
                              {/* Rating étoiles compactes */}
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={14}
                                    className={`${
                                      star <= friend.rating
                                        ? 'text-green-400 fill-current'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Date à droite */}
                          <span className="text-gray-500 text-xs">1 week ago</span>
                        </div>
                        
                        {/* Review text avec padding aligné au username */}
                        {friend.review && (
                          <div className="ml-11 mb-2">
                            <p className="text-gray-300 text-sm leading-relaxed">{friend.review}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Séparateur vert pointillé */}
                      {index < friendsWhoRead.length - 1 && (
                        <div className="border-t border-green-400/20 border-dashed"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Book Club Planning Modal */}
        {showBookClubModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#1A1A1A] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Plan a Book Club Meeting</h3>
                <button
                  onClick={() => setShowBookClubModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Event Name */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-2 block">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={bookClubName}
                  onChange={(e) => setBookClubName(e.target.value)}
                  placeholder={`Book Club: ${bookDetail?.title || 'Book Discussion'}`}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                />
              </div>
              
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={bookClubDate}
                    onChange={(e) => setBookClubDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">
                    Time
                  </label>
                  <input
                    type="time"
                    value={bookClubTime}
                    onChange={(e) => setBookClubTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              
              {/* Location */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-2 block">
                  Location
                </label>
                <input
                  type="text"
                  value={bookClubLocation}
                  onChange={(e) => setBookClubLocation(e.target.value)}
                  placeholder="Coffee shop, library, online..."
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                />
              </div>
              
              {/* Discussion Points */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-2 block">
                  Discussion Points
                </label>
                <textarea
                  value={discussionPoints}
                  onChange={(e) => setDiscussionPoints(e.target.value)}
                  placeholder="What themes, characters, or questions would you like to discuss?"
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-purple-500"
                />
              </div>
              
              {/* Friends Invitation */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-2 block">
                  Invite Friends *
                </label>
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={bookClubSearch}
                    onChange={(e) => setBookClubSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {filteredBookClubFriends.map((friend) => {
                    const isSelected = selectedBookClubFriends.find(f => f.id === friend.id)
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleBookClubFriend(friend)}
                        className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-600/30' : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {friend.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                        {isSelected && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {selectedBookClubFriends.length > 0 && (
                  <div className="mt-3">
                    <p className="text-gray-400 text-sm">
                      {selectedBookClubFriends.length} friend{selectedBookClubFriends.length > 1 ? 's' : ''} invited
                    </p>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBookClubModal(false)}
                  className="flex-1 py-2 px-4 text-gray-400 text-sm font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBookClub}
                  disabled={!bookClubName.trim() || !bookClubDate || selectedBookClubFriends.length === 0}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-opacity ${
                    bookClubName.trim() && bookClubDate && selectedBookClubFriends.length > 0
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Create Book Club
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share with Friends Modal */}
        {bookDetail && (
          <ShareWithFriendsModal
            isOpen={showShareWithFriendsModal}
            onClose={() => setShowShareWithFriendsModal(false)}
            item={{
              id: bookDetail.id,
              type: 'books',
              title: bookDetail.title,
              image: bookDetail.imageLinks.thumbnail
            }}
          />
        )}
      </div>
    </div>
  )
}
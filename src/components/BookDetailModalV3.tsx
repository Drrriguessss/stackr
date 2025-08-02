'use client'
import { useState, useEffect } from 'react'
import { X, Star, Share, FileText, ArrowRight, BookOpen, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { googleBooksService } from '@/services/googleBooksService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'

interface BookDetailModalV3Props {
  isOpen: boolean
  onClose: () => void
  bookId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onBookSelect?: (bookId: string) => void
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
  onBookSelect
}: BookDetailModalV3Props) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  
  // États pour le partage et les reviews
  const [showShareModal, setShowShareModal] = useState(false)
  const [showMoreShareOptions, setShowMoreShareOptions] = useState(false)
  const [recommendMessage, setRecommendMessage] = useState('')
  const [selectedRecommendFriends, setSelectedRecommendFriends] = useState<any[]>([])
  const [recommendSearch, setRecommendSearch] = useState('')
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

  // Helper function pour Product Sheet
  const isProductSheetCompleted = () => {
    return productSheetData.personalRating > 0 || 
           productSheetData.personalReview.trim() !== '' ||
           productSheetData.readDate !== '' ||
           productSheetData.format !== ''
  }

  // Mock friends data pour le partage
  const mockFriends = [
    { id: 1, name: 'Axel', avatar: null },
    { id: 2, name: 'Maite', avatar: null },
    { id: 3, name: 'Darren', avatar: null },
    { id: 4, name: 'Joshua', avatar: null },
    { id: 5, name: 'Jeremy', avatar: null },
    { id: 6, name: 'Ana', avatar: null },
    { id: 7, name: 'Susete', avatar: null }
  ]

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

  // Trouver l'item dans la bibliothèque
  const libraryItem = library.find(item => item.external_id === bookId && item.category === 'books')
  
  useEffect(() => {
    if (isOpen && bookId) {
      setSelectedStatus(libraryItem?.status || null)
      fetchBookDetail()
    }
  }, [bookId, isOpen, libraryItem])

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
        
        // Charger d'autres livres du même auteur
        if (bookData.authors && bookData.authors.length > 0) {
          await loadAuthorBooks(bookData.authors[0], bookData.id)
        }
      }
      
    } catch (error) {
      console.error('Error loading book:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAuthorBooks = async (author: string, currentBookId: string) => {
    try {
      setLoadingAuthorBooks(true)
      const books = await googleBooksService.getBooksByAuthor(author, 10)
      const filteredBooks = books
        .filter(book => book.id !== currentBookId)
        .slice(0, 6)
        .map(book => googleBooksService.convertToAppFormat(book))
      setAuthorBooks(filteredBooks)
    } catch (error) {
      console.error('Error loading author books:', error)
    } finally {
      setLoadingAuthorBooks(false)
    }
  }

  const loadUserReviews = async (bookId: string) => {
    try {
      setLoadingReviews(true)
      
      // Charger la review de l'utilisateur actuel
      const userReviewData = await userReviewsService.getUserReview('current_user', bookId, 'book')
      if (userReviewData) {
        setCurrentUserReview(userReviewData)
        setUserRating(userReviewData.rating)
        setUserReview(userReviewData.review_text || '')
        setReviewPrivacy(userReviewData.is_public ? 'public' : 'private')
        setShowShareThoughtsPrompt(false)
      }
      
      // Charger les reviews publiques
      const reviews = await userReviewsService.getPublicReviews(bookId, 'book')
      setPublicReviews(reviews)
      
    } catch (error) {
      console.error('📝 Error loading user reviews:', error)
    } finally {
      setLoadingReviews(false)
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
        userId: 'current_user',
        mediaId: bookDetail.id,
        mediaType: 'book' as const,
        rating: userRating,
        reviewText: userReview.trim() || null,
        isPublic: reviewPrivacy === 'public',
        mediaTitle: bookDetail.title,
        mediaImage: images[0] || bookDetail.imageLinks?.thumbnail || ''
      }

      if (currentUserReview) {
        await userReviewsService.updateReview(currentUserReview.id, reviewData)
      } else {
        await userReviewsService.createReview(reviewData)
      }

      // Recharger les reviews
      await loadUserReviews(bookDetail.id)
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
        userId: 'current_user',
        mediaId: bookDetail.id,
        mediaType: 'book' as const,
        rating: editRating,
        reviewText: editReviewText.trim() || null,
        isPublic: editReviewPrivacy === 'public',
        mediaTitle: bookDetail.title,
        mediaImage: images[0] || bookDetail.imageLinks?.thumbnail || ''
      }

      await userReviewsService.updateReview(currentUserReview.id, reviewData)
      
      // Recharger les reviews
      await loadUserReviews(bookDetail.id)
      setIsEditingReview(false)
      
    } catch (error) {
      console.error('Error updating review:', error)
    }
  }

  const handleDeleteReview = async () => {
    if (!currentUserReview) return

    try {
      await userReviewsService.deleteReview(currentUserReview.id)
      
      // Reset local state
      setCurrentUserReview(null)
      setUserRating(0)
      setUserReview('')
      setReviewPrivacy('private')
      setShowShareThoughtsPrompt(true)
      
      // Recharger les reviews
      await loadUserReviews(bookDetail!.id)
      
    } catch (error) {
      console.error('Error deleting review:', error)
    }
  }

  const handleAddToLibrary = (status: MediaStatus) => {
    if (!bookDetail) return
    
    const bookData = {
      id: bookDetail.id,
      title: bookDetail.title,
      author: bookDetail.authors?.join(', ') || 'Unknown Author',
      description: bookDetail.description || '',
      image: images[0] || bookDetail.imageLinks?.thumbnail || '',
      category: 'books' as const,
      external_id: bookDetail.id,
      year: bookDetail.publishedDate ? new Date(bookDetail.publishedDate).getFullYear().toString() : ''
    }
    
    onAddToLibrary(bookData, status)
    setSelectedStatus(status)
    setShowStatusDropdown(false)
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
                {/* Small Book Cover - Clickable */}
                <button
                  onClick={() => images.length > 0 && setShowImagePopup(true)}
                  className="w-16 h-20 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-green-500 transition-all cursor-pointer"
                >
                  {images.length > 0 ? (
                    <img
                      src={images[0]}
                      alt={bookDetail.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <BookOpen size={20} className="text-gray-600" />
                    </div>
                  )}
                </button>
                
                {/* Title and Info */}
                <div className="flex-1 pr-12">
                  <h1 className="text-2xl font-bold text-white mb-1">{bookDetail.title}</h1>
                  <div className="flex items-center space-x-3 text-gray-400">
                    <span>{bookDetail.authors?.join(', ')}</span>
                    {bookDetail.publishedDate && (
                      <>
                        <span>•</span>
                        <span>{new Date(bookDetail.publishedDate).getFullYear()}</span>
                      </>
                    )}
                    {bookDetail.pageCount && (
                      <>
                        <span>•</span>
                        <span>{bookDetail.pageCount} pages</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {/* Additional Images Gallery (if multiple images exist) */}
              {images.length > 1 && (
                <div className="space-y-4 mb-6 mt-6">
                  <h3 className="text-white font-semibold">Additional Images</h3>
                  <div className="flex space-x-3 overflow-x-auto pb-2">
                    {images.slice(1).map((image, index) => (
                      <div key={index + 1} className="w-16 h-20 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={image}
                          alt={`${bookDetail.title} - Image ${index + 2}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons - Same as MusicDetailModalV4 */}
              <div className="flex flex-col space-y-3 mb-6">
                {/* Status Button */}
                <div className="relative">
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
                          className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Actions - Same layout as MusicDetailModalV4 */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="relative">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      selectedStatus
                        ? 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white border-0'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    {formatStatusForDisplay(selectedStatus)}
                  </button>
                  
                  {showStatusDropdown && (
                    <div className="absolute top-full mt-2 bg-gray-800 rounded-lg shadow-lg z-10 min-w-48">
                      <button
                        onClick={() => handleAddToLibrary('want-to-read')}
                        className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 first:rounded-t-lg"
                      >
                        Want To Read
                      </button>
                      <button
                        onClick={() => handleAddToLibrary('currently-reading')}
                        className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                      >
                        Currently Reading
                      </button>
                      <button
                        onClick={() => handleAddToLibrary('read')}
                        className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                      >
                        Read
                      </button>
                      <button
                        onClick={() => handleAddToLibrary('paused')}
                        className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                      >
                        Paused
                      </button>
                      <button
                        onClick={() => handleAddToLibrary('dropped')}
                        className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                      >
                        Dropped
                      </button>
                      <button
                        onClick={() => {
                          if (bookDetail && onDeleteItem && libraryItem) {
                            onDeleteItem(libraryItem.id)
                            setShowStatusDropdown(false)
                            setSelectedStatus(null)
                          }
                        }}
                        className="block w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 last:rounded-b-lg"
                      >
                        Remove from Library
                      </button>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <Share size={20} />
                  <span>Share</span>
                </button>
                
                {/* Product Sheet Button - Only show for read */}
                {selectedStatus === 'read' && (
                  <button
                    onClick={() => setShowProductSheet(true)}
                    className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    style={isProductSheetCompleted() ? {
                      boxShadow: '0 0 0 2px #10B981, 0 4px 8px rgba(16, 185, 129, 0.3)'
                    } : {}}
                    title="Book Sheet"
                  >
                    <FileText size={20} />
                  </button>
                )}
              </div>

            {/* Image Popup */}
            {showImagePopup && images.length > 0 && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowImagePopup(false)}>
                <div className="relative max-w-4xl max-h-[90vh]">
                  <button
                    onClick={() => setShowImagePopup(false)}
                    className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 z-10"
                  >
                    <X size={24} />
                  </button>
                  <img
                    src={images[0]}
                    alt={bookDetail.title}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

              {/* Rating System */}
              {!currentUserReview && (
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

              {/* Current User Review */}
              {currentUserReview && (
                <div className="mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">Your Review</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleEditReview}
                          className="text-green-400 text-sm hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDeleteReview}
                          className="text-red-400 text-sm hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={`${
                              star <= currentUserReview.rating
                                ? 'text-green-400 fill-green-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {currentUserReview.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                    
                    {currentUserReview.review_text && (
                      <p className="text-gray-300 text-sm">{currentUserReview.review_text}</p>
                    )}
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
                  <div className="text-gray-300 leading-relaxed">
                    <p>{bookDetail.description}</p>
                  </div>
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
              </div>

              {/* Public Reviews */}
              {publicReviews.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4">Community Reviews</h3>
                  <div className="space-y-4">
                    {publicReviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {review.user_id.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-gray-300 text-sm font-medium">Stackr User</span>
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={`${
                                  star <= review.rating
                                    ? 'text-green-400 fill-green-400'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.review_text && (
                          <p className="text-gray-300 text-sm">{review.review_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* More from this author */}
              {authorBooks.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4">More from {bookDetail.authors?.[0]}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {authorBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => onBookSelect?.(book.id.replace('book-', ''))}
                        className="group text-left"
                      >
                        <div className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden mb-2">
                          {book.image ? (
                            <img 
                              src={book.image} 
                              alt={book.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen size={24} className="text-gray-600" />
                            </div>
                          )}
                        </div>
                        <p className="text-white text-sm font-medium line-clamp-1 group-hover:text-green-400 transition-colors">
                          {book.title}
                        </p>
                        <p className="text-gray-400 text-xs">{book.year}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

            {/* Share Modal */}
            {showShareModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Share this book</h3>
                    <button
                      onClick={() => {
                        setShowShareModal(false)
                        setShowMoreShareOptions(false)
                        setRecommendMessage('')
                        setSelectedRecommendFriends([])
                        setRecommendSearch('')
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {!showMoreShareOptions ? (
                    <>
                      {/* Friends List */}
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Search friends..."
                          value={recommendSearch}
                          onChange={(e) => setRecommendSearch(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 text-white text-sm rounded-lg border border-gray-600 focus:outline-none focus:border-green-500 mb-3"
                        />
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {filteredFriends.map((friend) => {
                            const isSelected = selectedRecommendFriends.some(f => f.id === friend.id)
                            return (
                              <button
                                key={friend.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedRecommendFriends(prev => prev.filter(f => f.id !== friend.id))
                                  } else {
                                    setSelectedRecommendFriends(prev => [...prev, friend])
                                  }
                                }}
                                className={`w-full p-3 rounded-lg text-left transition-colors ${
                                  isSelected ? 'bg-green-600/20 border border-green-600/30' : 'hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                    {friend.name.charAt(0)}
                                  </div>
                                  <span className="text-white text-sm">{friend.name}</span>
                                  {isSelected && (
                                    <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full flex items-center justify-center">
                                      <span className="text-white text-xs">✓</span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Message Input */}
                      {selectedRecommendFriends.length > 0 && (
                        <div className="mb-4">
                          <textarea
                            value={recommendMessage}
                            onChange={(e) => setRecommendMessage(e.target.value)}
                            placeholder="Add a message (optional)..."
                            className="w-full h-20 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg resize-none border border-gray-600 focus:outline-none focus:border-green-500"
                          />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2">
                        {selectedRecommendFriends.length > 0 && (
                          <button
                            onClick={() => {
                              // Handle recommend to friends
                              console.log('Recommending to:', selectedRecommendFriends, 'Message:', recommendMessage)
                              setShowShareModal(false)
                            }}
                            className="flex-1 py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-emerald-800 transition-colors"
                          >
                            Send to {selectedRecommendFriends.length} friend{selectedRecommendFriends.length > 1 ? 's' : ''}
                          </button>
                        )}
                        
                        <button
                          onClick={() => setShowMoreShareOptions(true)}
                          className="flex-1 py-2 px-4 border border-green-600 text-green-400 text-sm font-medium rounded-lg hover:bg-green-600/10 transition-colors"
                        >
                          More sharing options
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* External Sharing Options */}
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            const text = `Check out "${bookDetail!.title}" by ${bookDetail!.authors?.join(', ')}`
                            const url = bookDetail!.infoLink || window.location.href
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
                          }}
                          className="w-full p-3 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors text-left"
                        >
                          Share on Twitter
                        </button>
                        
                        <button
                          onClick={() => {
                            const text = `Check out "${bookDetail!.title}" by ${bookDetail!.authors?.join(', ')}`
                            const url = bookDetail!.infoLink || window.location.href
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank')
                          }}
                          className="w-full p-3 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors text-left"
                        >
                          Share on Facebook
                        </button>
                        
                        <button
                          onClick={() => {
                            const text = `Check out "${bookDetail!.title}" by ${bookDetail!.authors?.join(', ')} - ${bookDetail!.infoLink || window.location.href}`
                            navigator.clipboard.writeText(text)
                          }}
                          className="w-full p-3 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors text-left"
                        >
                          Copy link
                        </button>
                        
                        <button
                          onClick={() => setShowMoreShareOptions(false)}
                          className="w-full py-2 px-4 border border-green-600 text-green-400 text-sm font-medium rounded-lg hover:bg-green-600/10 transition-colors"
                        >
                          ← Back to friends
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
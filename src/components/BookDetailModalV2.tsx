'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, ExternalLink, Share } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'
import { googleBooksService } from '@/services/googleBooksService'
import { bookReviewsService, type BookReview } from '@/services/bookReviewsService'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'

interface BookDetailModalV2Props {
  isOpen: boolean
  onClose: () => void
  bookId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  goodreadsReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface BookDetail {
  id: string
  title: string
  author: string
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
  }
  previewLink: string
  infoLink: string
  buyLink: string
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function BookDetailModalV2({ 
  isOpen, 
  onClose, 
  bookId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  goodreadsReviews, 
  onReviewSubmit 
}: BookDetailModalV2Props) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [userReview, setUserReview] = useState('')
  const [similarBooks, setSimilarBooks] = useState<any[]>([])
  const [authorBooks, setAuthorBooks] = useState<any[]>([])
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingAuthor, setLoadingAuthor] = useState(false)
  const [similarBooksLoaded, setSimilarBooksLoaded] = useState(false)
  const [authorBooksLoaded, setAuthorBooksLoaded] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showPublisher, setShowPublisher] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [bookReviews, setBookReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [userPublicReviews, setUserPublicReviews] = useState<UserReview[]>([])
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  // Mock data for similar books and author books
  const mockSimilarBooks = [
    { id: 1, title: "The Hobbit", author: "J.R.R. Tolkien", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.5 },
    { id: 2, title: "Dune", author: "Frank Herbert", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.8 },
    { id: 3, title: "1984", author: "George Orwell", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.7 },
    { id: 4, title: "Foundation", author: "Isaac Asimov", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.6 },
    { id: 5, title: "Brave New World", author: "Aldous Huxley", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.3 },
    { id: 6, title: "Ender's Game", author: "Orson Scott Card", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.4 }
  ]

  const mockAuthorBooks = [
    { id: 1, title: "The Two Towers", author: "J.R.R. Tolkien", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.8 },
    { id: 2, title: "The Return of the King", author: "J.R.R. Tolkien", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.9 },
    { id: 3, title: "The Silmarillion", author: "J.R.R. Tolkien", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.2 },
    { id: 4, title: "Unfinished Tales", author: "J.R.R. Tolkien", image: "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book", rating: 4.1 }
  ]

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullDescription(false)
      setShowAllCategories(false)
      setShowPublisher(false)
      setShowLibraryDropdown(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Ref pour éviter les appels API multiples
  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen && bookId && hasLoadedRef.current !== bookId) {
      hasLoadedRef.current = bookId
      fetchBookDetail()
    }
    if (!isOpen) {
      hasLoadedRef.current = null
    }
  }, [isOpen, bookId])

  useEffect(() => {
    const libraryItem = library.find(item => item.id === bookId)
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
    } else {
      setSelectedStatus(null)
    }
  }, [bookId, library])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(event.target as Node)) {
        setShowLibraryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchBookDetail = async () => {
    if (!bookId) return
    
    setLoading(true)
    try {
      console.log('📚 Fetching book details for ID:', bookId)
      
      const data = await googleBooksService.getBookDetails(bookId)
      setBookDetail(data as BookDetail)
      
      // Fetch reviews
      fetchReviews(bookId, data.title, data.author)
      
      // Fetch similar books
      if (data?.categories?.length > 0) {
        await fetchSimilarBooks(data.categories[0])
      }
      
      // Fetch author books
      if (data?.author) {
        await fetchAuthorBooks(data.author)
      }
      
    } catch (error) {
      console.error('Error loading book details:', error)
      
      // Fallback vers les données statiques
      const { sampleContent } = require('@/data/sampleContent')
      
      // Essayer de trouver le livre correspondant dans sampleContent
      let fallbackBook = sampleContent.books?.find((book: any) => 
        book.id === bookId || book.id === `book-${bookId}` || book.id === bookId
      )
      
      // Si pas trouvé, utiliser le premier livre comme fallback
      if (!fallbackBook) {
        fallbackBook = sampleContent.books?.[0] || {
          title: "Sample Book",
          author: "Unknown Author",
          year: 2024,
          rating: 4.0,
          genre: "Fiction"
        }
      }
      
      // Convertir en format BookDetail
      setBookDetail({
        id: bookId,
        title: fallbackBook.title,
        author: fallbackBook.author,
        description: `${fallbackBook.title} is an engaging ${fallbackBook.genre || 'literary'} work by ${fallbackBook.author} that captivates readers with its compelling narrative and thoughtful exploration of themes.`,
        publishedDate: `${fallbackBook.year || 2024}-01-01`,
        pageCount: 320,
        categories: [fallbackBook.genre || "Fiction"],
        averageRating: fallbackBook.rating || 4.0,
        ratingsCount: 1250,
        language: "en",
        publisher: "Unknown Publisher",
        isbn10: "1234567890",
        isbn13: "9781234567890",
        imageLinks: {
          thumbnail: fallbackBook.image || "https://via.placeholder.com/128x192/1a1a1a/ffffff?text=Book+Cover",
          small: fallbackBook.image || "https://via.placeholder.com/256x384/1a1a1a/ffffff?text=Book+Cover",
          medium: fallbackBook.image || "https://via.placeholder.com/512x768/1a1a1a/ffffff?text=Book+Cover",
          large: fallbackBook.image || "https://via.placeholder.com/1024x1536/1a1a1a/ffffff?text=Book+Cover"
        },
        previewLink: "#",
        infoLink: "#",
        buyLink: "#"
      })
      
      // For fallback demo data, also fetch similar books
      await fetchSimilarBooks(fallbackBook.genre || "Fiction")
      await fetchAuthorBooks(fallbackBook.author || "Unknown Author")
      // Fetch reviews for mock data too
      fetchReviews(bookId, fallbackBook.title, fallbackBook.author)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async (bookId: string, bookTitle: string, author: string) => {
    setReviewsLoading(true)
    try {
      console.log('📝 Fetching reviews for book:', bookTitle, 'by', author)
      
      // Fetch API reviews
      const reviewsResponse = await bookReviewsService.getBookReviews(bookId, bookTitle, author)
      setBookReviews(reviewsResponse.reviews)
      console.log('📝 Loaded', reviewsResponse.reviews.length, 'API reviews')
      
      // Fetch user public reviews
      const publicReviews = await userReviewsService.getPublicReviewsForMedia(bookId)
      setUserPublicReviews(publicReviews)
      console.log('📝 Loaded', publicReviews.length, 'user public reviews')
      
      // Fetch current user's review (if any)
      const userReview = await userReviewsService.getUserReviewForMedia(bookId)
      setCurrentUserReview(userReview)
      if (userReview) {
        setUserRating(userReview.rating)
        setUserReview(userReview.review_text || '')
        console.log('📝 Found existing user review')
      }
    } catch (error) {
      console.error('📝 Error fetching reviews:', error)
      setBookReviews([])
      setUserPublicReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchSimilarBooks = async (category: string) => {
    setLoadingSimilar(true)
    try {
      console.log('📚 Fetching similar books for category:', category)
      
      // For now, use mock data
      setSimilarBooks(mockSimilarBooks)
      setSimilarBooksLoaded(true)
      
    } catch (error) {
      console.error('📚 Error fetching similar books:', error)
      setSimilarBooks(mockSimilarBooks)
      setSimilarBooksLoaded(true)
    } finally {
      setLoadingSimilar(false)
    }
  }

  const fetchAuthorBooks = async (authorName: string) => {
    setLoadingAuthor(true)
    try {
      console.log('📚 Fetching author books for:', authorName)
      
      // For now, use mock data
      setAuthorBooks(mockAuthorBooks)
      setAuthorBooksLoaded(true)
      
    } catch (error) {
      console.error('📚 Error fetching author books:', error)
      setAuthorBooks(mockAuthorBooks)
      setAuthorBooksLoaded(true)
    } finally {
      setLoadingAuthor(false)
    }
  }

  const handleStatusSelect = (status: MediaStatus | 'remove') => {
    if (!bookDetail) return
    
    if (status === 'remove') {
      if (onDeleteItem) {
        onDeleteItem(bookId)
      }
      setSelectedStatus(null)
    } else {
      const bookItem = {
        id: bookId,
        title: bookDetail.title,
        image: bookDetail.imageLinks?.thumbnail,
        category: 'books' as const,
        year: bookDetail.publishedDate ? new Date(bookDetail.publishedDate).getFullYear() : 2024,
        rating: bookDetail.averageRating,
        author: bookDetail.author
      }
      
      onAddToLibrary(bookItem, status)
      setSelectedStatus(status)
    }
    setShowLibraryDropdown(false)
  }

  const getStatusLabel = (status: MediaStatus | null) => {
    if (!status) return 'Add to Library'
    switch (status) {
      case 'want-to-play': return 'Want to Read'
      case 'currently-playing': return 'Reading'
      case 'completed': return 'Read'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus | null) => {
    if (!status) return 'bg-gray-800'
    switch (status) {
      case 'want-to-play': return 'bg-orange-600'
      case 'currently-playing': return 'bg-green-600'
      case 'completed': return 'bg-blue-600'
      default: return 'bg-gray-800'
    }
  }

  const handleSubmitReview = async () => {
    if (userRating > 0 && bookDetail) {
      // Sauvegarder dans notre nouveau système
      const savedReview = await userReviewsService.submitReview({
        mediaId: bookId,
        mediaTitle: bookDetail.title,
        mediaCategory: 'books',
        rating: userRating,
        reviewText: userReview.trim(),
        isPublic: reviewPrivacy === 'public'
      })
      
      if (savedReview) {
        console.log('✅ Review saved successfully')
        
        // Si publique, actualiser la liste des reviews publiques
        if (reviewPrivacy === 'public') {
          const updatedPublicReviews = await userReviewsService.getPublicReviewsForMedia(bookId)
          setUserPublicReviews(updatedPublicReviews)
        }
        
        // Mettre à jour l'état de la review actuelle
        setCurrentUserReview(savedReview)
      }
      
      // Appeler aussi l'ancien système si nécessaire
      onReviewSubmit({
        rating: userRating,
        review: userReview.trim(),
        privacy: reviewPrivacy
      })
      
      setShowReviewBox(false)
      // Ne pas réinitialiser rating et review car l'utilisateur a maintenant une review existante
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-[#0B0B0B] w-full h-full md:max-w-2xl md:h-[95vh] md:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : bookDetail ? (
          <>
            {/* Header */}
            <div className="relative px-4 pt-6 pb-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-start justify-between pr-12">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-1">{bookDetail.title}</h1>
                  <h2 className="text-lg text-[#B0B0B0] mb-2">{bookDetail.author}</h2>
                  
                  {/* Metadata */}
                  <div className="flex items-center space-x-2 text-[#B0B0B0] text-sm">
                    <span>{bookDetail.publishedDate ? new Date(bookDetail.publishedDate).getFullYear() : 'TBA'}</span>
                    <span>•</span>
                    <span>{bookDetail.pageCount} pages</span>
                    <span>•</span>
                    <span>{bookDetail.categories?.[0] || 'Unknown'}</span>
                  </div>
                </div>

                {/* Share Button */}
                <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                  <Send size={18} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs - Pill Style */}
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex space-x-2">
                {[
                  { key: 'overview' as const, label: 'Overview' },
                  { key: 'reviews' as const, label: 'Reviews' },
                  { key: 'moreinfo' as const, label: 'My Reading Card' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ease-in-out ${
                      activeTab === tab.key
                        ? 'bg-[#1DB954] text-white font-bold shadow-lg border border-[#1DB954]'
                        : 'bg-transparent text-[#B0B0B0] border border-gray-600 hover:bg-gray-800 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="p-4 space-y-6">
                  {/* Book Cover */}
                  <div className="space-y-4">
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden max-w-48 mx-auto">
                      <img
                        src={bookDetail.imageLinks?.medium || bookDetail.imageLinks?.thumbnail || 'https://via.placeholder.com/384x576/1a1a1a/ffffff?text=Book+Cover'}
                        alt={`${bookDetail.title} book cover`}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </div>

                  {/* Add to Library Button */}
                  <div className="relative" ref={libraryDropdownRef}>
                    <button
                      onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <span>{selectedStatus ? getStatusLabel(selectedStatus) : 'Add to Library'}</span>
                      <ChevronDown size={16} className={`transition-transform ${showLibraryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown Options */}
                    {showLibraryDropdown && (
                      <div className="absolute top-full left-0 mt-2 bg-[#1A1A1A] rounded-lg shadow-xl z-10 py-2 min-w-48 border border-gray-800">
                        <button
                          onClick={() => handleStatusSelect('want-to-play')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Want to Read
                        </button>
                        <button
                          onClick={() => handleStatusSelect('currently-playing')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Reading
                        </button>
                        <button
                          onClick={() => handleStatusSelect('completed')}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors text-sm"
                        >
                          Read
                        </button>
                        {selectedStatus && (
                          <>
                            <div className="border-t border-gray-700 my-1"></div>
                            <button
                              onClick={() => handleStatusSelect('remove')}
                              className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800 transition-colors text-sm"
                            >
                              Remove from Library
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rate this book - Only show if Reading or Read */}
                  {(selectedStatus === 'currently-playing' || selectedStatus === 'completed') && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Rate this book</h3>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => {
                              setUserRating(rating)
                              setShowReviewBox(true)
                            }}
                            onMouseEnter={() => setHoverRating(rating)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1"
                          >
                            <Star
                              size={24}
                              className={`transition-colors ${
                                (hoverRating || userRating) >= rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                        {userRating > 0 && (
                          <span className="text-white ml-2 font-medium">{userRating}/5</span>
                        )}
                      </div>
                    
                    {showReviewBox && (
                      <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg border border-gray-800">
                        <h4 className="text-white font-medium mb-3">Share your thoughts about this book</h4>
                        <div className="flex space-x-2 mb-3">
                          <button
                            onClick={() => setReviewPrivacy('private')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              reviewPrivacy === 'private'
                                ? 'bg-gray-700 text-white'
                                : 'bg-transparent text-gray-400 border border-gray-700'
                            }`}
                          >
                            Private Note
                          </button>
                          <button
                            onClick={() => setReviewPrivacy('public')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              reviewPrivacy === 'public'
                                ? 'bg-gray-700 text-white'
                                : 'bg-transparent text-gray-400 border border-gray-700'
                            }`}
                          >
                            Share publicly
                          </button>
                        </div>
                        <textarea
                          value={userReview}
                          onChange={(e) => setUserReview(e.target.value)}
                          placeholder="Optional: Add your thoughts..."
                          className="w-full h-20 px-3 py-2 bg-[#0B0B0B] text-white text-sm rounded-lg resize-none border border-gray-800 focus:outline-none focus:border-gray-600"
                        />
                        <div className="flex justify-end space-x-2 mt-3">
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
                            onClick={handleSubmitReview}
                            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                    </div>
                  )}

                  {/* Book Ratings */}
                  <div className="flex space-x-4">
                    {/* Average Rating */}
                    {bookDetail.averageRating && bookDetail.ratingsCount >= 10 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{bookDetail.averageRating.toFixed(1)}</span>
                        </div>
                        <span className="text-[#B0B0B0] text-sm">Rating</span>
                      </div>
                    )}
                    
                    {/* Page Count */}
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{bookDetail.pageCount}</span>
                      </div>
                      <span className="text-[#B0B0B0] text-sm">Pages</span>
                    </div>
                  </div>

                  {/* Where to Buy/Read */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Where to Read</h3>
                    <div className="space-y-2">
                      {bookDetail.previewLink && bookDetail.previewLink !== '#' && (
                        <a
                          href={bookDetail.previewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-white">Google Books Preview</span>
                          </div>
                          <ExternalLink className="text-gray-400" size={16} />
                        </a>
                      )}
                      {bookDetail.buyLink && bookDetail.buyLink !== '#' && (
                        <a
                          href={bookDetail.buyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-white">Buy on Google Books</span>
                          </div>
                          <ExternalLink className="text-gray-400" size={16} />
                        </a>
                      )}
                      <a
                        href={`https://www.amazon.com/s?k=${encodeURIComponent(bookDetail.title + ' ' + bookDetail.author)}&i=digital-text`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-white">Amazon Kindle</span>
                        </div>
                        <ExternalLink className="text-gray-400" size={16} />
                      </a>
                      <a
                        href={`https://www.goodreads.com/search?utf8=%E2%9C%93&query=${encodeURIComponent(bookDetail.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-white">Goodreads</span>
                        </div>
                        <ExternalLink className="text-gray-400" size={16} />
                      </a>
                    </div>
                  </div>

                  {/* Publisher/Details */}
                  <div>
                    <button
                      onClick={() => setShowPublisher(!showPublisher)}
                      className="w-full text-left flex items-center justify-between text-[#B0B0B0]"
                    >
                      <span>Publisher: {bookDetail.publisher}</span>
                      <ChevronRight className={`transition-transform ${showPublisher ? 'rotate-90' : ''}`} size={16} />
                    </button>
                    
                    {showPublisher && (
                      <div className="mt-2 space-y-1 text-[#B0B0B0]">
                        <div>Language: {bookDetail.language}</div>
                        {bookDetail.isbn13 && <div>ISBN-13: {bookDetail.isbn13}</div>}
                        {bookDetail.isbn10 && <div>ISBN-10: {bookDetail.isbn10}</div>}
                      </div>
                    )}
                  </div>

                  {/* Publication Date */}
                  <div className="text-[#B0B0B0] text-sm">
                    Published: {bookDetail.publishedDate ? new Date(bookDetail.publishedDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'TBA'}
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-white font-medium mb-3">Description</h3>
                    <div className="text-[#B0B0B0] leading-relaxed">
                      <p className={`${!showFullDescription ? 'line-clamp-4' : ''}`}>
                        {bookDetail.description || 'No description available.'}
                      </p>
                      {bookDetail.description && bookDetail.description.length > 200 && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="text-white text-sm mt-2 flex items-center space-x-1 hover:underline"
                        >
                          <span>{showFullDescription ? 'Less' : 'More'}</span>
                          <ChevronRight className={`transition-transform ${showFullDescription ? 'rotate-90' : ''}`} size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Similar Books */}
                  <div>
                    <h3 className="text-white font-medium mb-4">Similar Books</h3>
                    <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                      {similarBooks.map((book) => (
                        <div 
                          key={book.id} 
                          className="flex-shrink-0 w-24 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            // Ouvrir le détail de ce livre
                            window.location.href = `#book-${book.id}`
                            onClose()
                          }}
                        >
                          <img
                            src={book.image || 'https://via.placeholder.com/96x144/333/fff?text=Book'}
                            alt={book.title}
                            className="w-full h-36 object-cover rounded-lg mb-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'https://via.placeholder.com/96x144/333/fff?text=Book'
                            }}
                          />
                          <p className="text-white text-xs truncate" title={book.title}>{book.title}</p>
                          <p className="text-[#B0B0B0] text-xs truncate" title={book.author}>{book.author}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* More from this author */}
                  {bookDetail.author && (
                    <div>
                      <h3 className="text-white font-medium mb-4">
                        More from {bookDetail.author}
                      </h3>
                      {authorBooks.length > 0 ? (
                        <div className="flex space-x-3 overflow-x-auto pb-2 snap-x">
                          {authorBooks.map((book) => (
                            <div 
                              key={book.id} 
                              className="flex-shrink-0 w-24 snap-start cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                // Ouvrir le détail de ce livre
                                window.location.href = `#book-${book.id}`
                                onClose()
                              }}
                            >
                              <img
                                src={book.image || 'https://via.placeholder.com/96x144/333/fff?text=Book'}
                                alt={book.title}
                                className="w-full h-36 object-cover rounded-lg mb-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = 'https://via.placeholder.com/96x144/333/fff?text=Book'
                                }}
                              />
                              <p className="text-white text-xs truncate" title={book.title}>{book.title}</p>
                              <p className="text-[#B0B0B0] text-xs truncate" title={book.author}>{book.author}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[#B0B0B0] text-sm">
                          No other books found from this author
                        </div>
                      )}
                    </div>
                  )}

                  {/* Categories at bottom */}
                  <div className="mt-8 pt-4 border-t border-gray-800">
                    <div className="flex justify-center">
                      <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg px-4 py-2">
                        <span className="text-[#B0B0B0] text-sm">
                          {bookDetail.categories?.join(', ') || 'Unknown Category'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Reviews</h3>
                    <span className="text-[#B0B0B0] text-sm">
                      {bookReviews.length + userPublicReviews.length} reviews
                    </span>
                  </div>
                  
                  {/* Current user's review if exists */}
                  {currentUserReview && (
                    <div className="bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#1DB954] text-sm font-medium">Your Review</span>
                        <span className="text-[#B0B0B0] text-xs">
                          {currentUserReview.is_public ? '🌍 Public' : '🔒 Private'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={`${
                                star <= currentUserReview.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[#B0B0B0] text-xs">{currentUserReview.created_at.split('T')[0]}</span>
                      </div>
                      {currentUserReview.review_text && (
                        <p className="text-[#B0B0B0] text-sm">{currentUserReview.review_text}</p>
                      )}
                    </div>
                  )}
                  
                  {reviewsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
                              <div className="h-3 bg-gray-700 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="h-16 bg-gray-700 rounded mb-2"></div>
                          <div className="flex items-center space-x-4">
                            <div className="h-3 bg-gray-700 rounded w-20"></div>
                            <div className="h-3 bg-gray-700 rounded w-16"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : bookReviews.length > 0 || userPublicReviews.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {/* User Public Reviews First */}
                      {userPublicReviews.map((review) => (
                        <div key={review.id} className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {(review.username || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-medium text-sm">{review.username || 'Anonymous User'}</span>
                                  <span className="text-purple-400 text-xs">✓ Stackr User</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={12}
                                        className={`${
                                          star <= review.rating
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[#B0B0B0] text-xs">{review.created_at.split('T')[0]}</span>
                                </div>
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-purple-900/50 text-purple-200 rounded text-xs font-medium">
                              User Review
                            </span>
                          </div>
                          {review.review_text && (
                            <p className="text-[#B0B0B0] text-sm leading-relaxed mb-3">
                              {review.review_text}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <button 
                              className="hover:text-white transition-colors"
                              onClick={() => userReviewsService.markReviewAsHelpful(review.id, true)}
                            >
                              👍 {review.helpful_count || 0} helpful
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* API Reviews */}
                      {bookReviews.map((review) => (
                        <div key={review.id} className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                          {/* Review Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {review.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-white font-medium text-sm">{review.username}</span>
                                  {review.verified && (
                                    <span className="text-green-400 text-xs">✓ Verified</span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={12}
                                        className={`${
                                          star <= review.rating
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-600'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[#B0B0B0] text-xs">{review.date}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Platform Badge */}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              review.platform === 'goodreads' ? 'bg-yellow-900 text-yellow-200' :
                              review.platform === 'amazon' ? 'bg-orange-900 text-orange-200' :
                              review.platform === 'kirkus' ? 'bg-blue-900 text-blue-200' :
                              review.platform === 'publishers-weekly' ? 'bg-purple-900 text-purple-200' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {review.platform === 'goodreads' ? 'Goodreads' :
                               review.platform === 'amazon' ? 'Amazon' :
                               review.platform === 'kirkus' ? 'Kirkus' :
                               review.platform === 'publishers-weekly' ? 'PW' :
                               review.platform === 'generated' ? 'Community' : 'User'}
                            </span>
                          </div>
                          
                          {/* Review Text */}
                          <p className="text-[#B0B0B0] text-sm leading-relaxed mb-3">
                            {review.text}
                          </p>
                          
                          {/* Review Footer */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {review.helpful !== undefined && (
                              <span>👍 {review.helpful} helpful</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📝</span>
                      </div>
                      <p className="text-white font-medium mb-2">No reviews yet</p>
                      <p className="text-[#B0B0B0] text-sm">Be the first to review this book</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="p-4 space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-white font-medium text-lg mb-2">My Reading Card</h3>
                    <p className="text-[#B0B0B0] text-sm">Track your personal reading experience</p>
                  </div>

                  {/* Personal Reading Info Form */}
                  <div className="space-y-4">
                    {/* Date Started */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Date Started</label>
                      <input 
                        type="date" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="When did you start reading?"
                      />
                    </div>

                    {/* Date Finished */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Date Finished</label>
                      <input 
                        type="date" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="When did you finish reading?"
                      />
                    </div>

                    {/* Format */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Format</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select format...</option>
                        <option value="physical-paperback">Physical - Paperback</option>
                        <option value="physical-hardcover">Physical - Hardcover</option>
                        <option value="ebook-kindle">eBook - Kindle</option>
                        <option value="ebook-pdf">eBook - PDF</option>
                        <option value="ebook-epub">eBook - EPUB</option>
                        <option value="audiobook">Audiobook</option>
                        <option value="library-book">Library Book</option>
                        <option value="borrowed">Borrowed</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Reading Location */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Where did you read?</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors"
                        placeholder="e.g., Home, Commute, Park, Beach, Library..."
                      />
                    </div>

                    {/* Reading Speed */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Reading Pace</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">How was your reading pace?</option>
                        <option value="very-fast">Very Fast (1-2 days)</option>
                        <option value="fast">Fast (3-7 days)</option>
                        <option value="normal">Normal (1-2 weeks)</option>
                        <option value="slow">Slow (3-4 weeks)</option>
                        <option value="very-slow">Very Slow (1+ months)</option>
                        <option value="dnf">Did Not Finish</option>
                      </select>
                    </div>

                    {/* Favorite Quote */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Favorite Quote/Passage</label>
                      <textarea 
                        rows={3}
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors resize-none"
                        placeholder="Any memorable quotes or passages?"
                      />
                    </div>

                    {/* Recommendation */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Would you recommend?</label>
                      <select className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors">
                        <option value="">Select recommendation level...</option>
                        <option value="highly-recommend">Highly Recommend</option>
                        <option value="recommend">Recommend</option>
                        <option value="neutral">Neutral</option>
                        <option value="not-recommend">Don't Recommend</option>
                        <option value="avoid">Avoid</option>
                      </select>
                    </div>

                    {/* Personal Notes */}
                    <div className="bg-[#1A1A1A] rounded-lg p-4 border border-gray-800">
                      <label className="block text-white font-medium mb-2 text-sm">Personal Notes</label>
                      <textarea 
                        rows={4}
                        className="w-full bg-[#0B0B0B] text-white text-sm rounded-lg p-3 border border-gray-700 focus:outline-none focus:border-[#1DB954] transition-colors resize-none"
                        placeholder="Your thoughts, analysis, or memories about this book..."
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                      <button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-medium py-3 px-4 rounded-lg transition-colors">
                        Save Reading Card
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📚</span>
              </div>
              <p className="text-white font-medium mb-2">Book not found</p>
              <p className="text-[#B0B0B0] text-sm">Unable to load book details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
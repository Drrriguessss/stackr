'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Send, ChevronDown, ChevronRight, Play, Share, Book, Calendar, User } from 'lucide-react'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface BookDetailDarkV2Props {
  isOpen: boolean
  onClose: () => void
  bookId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  userReviews: Review[]
  googleReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface BookDetail {
  id: string
  title: string
  authors: string[]
  description: string
  imageLinks: { thumbnail?: string; large?: string }
  publishedDate: string
  publisher: string
  categories: string[]
  averageRating?: number
  ratingsCount?: number
  pageCount?: number
  language?: string
  isbn?: string
  previewLink?: string
  infoLink?: string
}

type TabType = 'overview' | 'reviews' | 'moreinfo'

export default function BookDetailDarkV2({ 
  isOpen, 
  onClose, 
  bookId, 
  onAddToLibrary, 
  onDeleteItem,
  library, 
  userReviews, 
  googleReviews, 
  onReviewSubmit 
}: BookDetailDarkV2Props) {
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
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showPublisher, setShowPublisher] = useState(false)
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
  const [bookReviews, setBookReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const scrollableRef = useRef<HTMLDivElement>(null)
  const libraryDropdownRef = useRef<HTMLDivElement>(null)

  // Mock data for similar books and author books
  const mockSimilarBooks = [
    { id: 1, title: "1984", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=1984", rating: 4.6, author: "George Orwell" },
    { id: 2, title: "Brave New World", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=Brave+New+World", rating: 4.4, author: "Aldous Huxley" },
    { id: 3, title: "Fahrenheit 451", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=Fahrenheit+451", rating: 4.5, author: "Ray Bradbury" },
    { id: 4, title: "The Handmaid's Tale", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=The+Handmaids+Tale", rating: 4.3, author: "Margaret Atwood" },
  ]

  const mockAuthorBooks = [
    { id: 1, title: "The Great Gatsby", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=The+Great+Gatsby", rating: 4.2 },
    { id: 2, title: "This Side of Paradise", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=This+Side+of+Paradise", rating: 3.8 },
    { id: 3, title: "Tender Is the Night", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=Tender+Is+the+Night", rating: 4.0 },
    { id: 4, title: "The Beautiful and Damned", image: "https://via.placeholder.com/200x300/1a1a1a/white?text=The+Beautiful+and+Damned", rating: 3.9 }
  ]

  // Ref pour éviter les appels API multiples
  const hasLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
      setShowFullOverview(false)
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchBookDetail = async () => {
    if (!bookId) return
    
    setLoading(true)
    try {
      // Utiliser les données de fallback statiques pour le moment
      const { sampleContent } = require('@/data/sampleContent')
      
      let fallbackBook = sampleContent.books.find((book: any) => 
        book.id === bookId || book.id === `book-${bookId}` || bookId.includes(book.id.toString())
      )
      
      if (!fallbackBook) {
        fallbackBook = sampleContent.books[0]
      }

      setBookDetail({
        id: fallbackBook.id,
        title: fallbackBook.title,
        authors: [fallbackBook.author || 'Unknown Author'],
        description: fallbackBook.description || 'Un livre captivant qui vous transportera dans un univers riche et complexe.',
        imageLinks: { thumbnail: fallbackBook.image, large: fallbackBook.image },
        publishedDate: fallbackBook.year || '2023',
        publisher: 'Unknown Publisher',
        categories: [fallbackBook.genre || 'Fiction'],
        averageRating: fallbackBook.rating || 4.0,
        ratingsCount: Math.floor(Math.random() * 10000) + 1000,
        pageCount: Math.floor(Math.random() * 500) + 200,
        language: 'fr',
        isbn: `978-${Math.random().toString().slice(2, 12)}`,
        previewLink: '#',
        infoLink: '#'
      })

      setSimilarBooks(mockSimilarBooks)
      setAuthorBooks(mockAuthorBooks)
      
    } catch (error) {
      console.error('Error loading book details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToLibrary = (status: MediaStatus) => {
    if (!bookDetail) return

    const libraryItem = {
      id: bookDetail.id,
      title: bookDetail.title,
      image: bookDetail.imageLinks.thumbnail || '',
      category: 'books' as const,
      status,
      rating: userRating || undefined,
      addedAt: new Date().toISOString(),
      author: bookDetail.authors[0] || 'Unknown Author',
      year: bookDetail.publishedDate,
      genre: bookDetail.categories[0] || 'Fiction'
    }

    onAddToLibrary(libraryItem, status)
    setSelectedStatus(status)
    setShowLibraryDropdown(false)
  }

  const handleStatusUpdate = (newStatus: MediaStatus) => {
    setSelectedStatus(newStatus)
    setShowLibraryDropdown(false)
  }

  const getStatusColor = (status: MediaStatus | null): string => {
    switch (status) {
      case 'want-to-read': return 'bg-blue-600 hover:bg-blue-700'
      case 'currently-reading': return 'bg-yellow-600 hover:bg-yellow-700'  
      case 'completed': return 'bg-green-600 hover:bg-green-700'
      case 'on-hold': return 'bg-orange-600 hover:bg-orange-700'
      case 'dropped': return 'bg-red-600 hover:bg-red-700'
      default: return 'bg-[#1DB954] hover:bg-green-700'
    }
  }

  const getStatusLabel = (status: MediaStatus | null): string => {
    switch (status) {
      case 'want-to-read': return 'Want to Read'
      case 'currently-reading': return 'Currently Reading'
      case 'completed': return 'Read'
      case 'on-hold': return 'On Hold'
      case 'dropped': return 'Dropped'
      default: return 'Add to Library'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).getFullYear().toString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <Book className="w-6 h-6 text-[#1DB954]" />
            <h2 className="text-xl font-bold text-white">Book Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex space-x-2">
            {[
              { key: 'overview' as const, label: 'Overview' },
              { key: 'reviews' as const, label: 'Reviews' },
              { key: 'moreinfo' as const, label: 'My Book Card' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ease-in-out ${
                  activeTab === tab.key
                    ? 'bg-[#1DB954] text-white font-bold shadow-lg border border-[#1DB954]'
                    : 'bg-transparent text-[#B0B0B0] border border-gray-600 hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={scrollableRef} className="flex-1 overflow-y-auto max-h-[calc(95vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1DB954]"></div>
            </div>
          ) : bookDetail ? (
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Hero Section */}
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={bookDetail.imageLinks.thumbnail || ''}
                        alt={bookDetail.title}
                        className="w-64 h-80 object-cover rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/200x300/1a1a1a/white?text=Book+Cover'
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      <div>
                        <h1 className="text-4xl font-bold text-white mb-2">{bookDetail.title}</h1>
                        <div className="flex items-center space-x-4 text-gray-300 mb-4">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {bookDetail.authors.join(', ')}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(bookDetail.publishedDate)}
                          </span>
                        </div>
                        
                        {bookDetail.averageRating && (
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= (bookDetail.averageRating || 0)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-white font-semibold">
                              {bookDetail.averageRating.toFixed(1)}
                            </span>
                            <span className="text-gray-400">
                              ({bookDetail.ratingsCount?.toLocaleString()} ratings)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Add to Library Button */}
                      <div className="relative" ref={libraryDropdownRef}>
                        <button
                          onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                          className={`${getStatusColor(selectedStatus)} text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2`}
                        >
                          <span>{getStatusLabel(selectedStatus)}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {showLibraryDropdown && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-700 z-10">
                            {(['want-to-read', 'currently-reading', 'completed', 'on-hold', 'dropped'] as MediaStatus[]).map((status) => (
                              <button
                                key={status}
                                onClick={() => selectedStatus === status ? handleStatusUpdate(status) : handleAddToLibrary(status)}
                                className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg transition-colors"
                              >
                                {getStatusLabel(status)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Book Info Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pages:</span>
                            <span className="text-white">{bookDetail.pageCount || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Language:</span>
                            <span className="text-white">{bookDetail.language?.toUpperCase() || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">ISBN:</span>
                            <span className="text-white font-mono text-xs">{bookDetail.isbn || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Publisher:</span>
                            <span className="text-white">{bookDetail.publisher || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Categories:</span>
                            <span className="text-white">
                              {showAllCategories || !bookDetail.categories.length || bookDetail.categories.length <= 2
                                ? bookDetail.categories.join(', ') || 'N/A'
                                : `${bookDetail.categories.slice(0, 2).join(', ')}`
                              }
                              {bookDetail.categories.length > 2 && !showAllCategories && (
                                <button
                                  onClick={() => setShowAllCategories(true)}
                                  className="ml-1 text-[#1DB954] hover:text-green-400 text-xs"
                                >
                                  +{bookDetail.categories.length - 2} more
                                </button>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">About this book</h3>
                    <div className="text-gray-300 leading-relaxed">
                      {showFullOverview || bookDetail.description.length <= 500 
                        ? bookDetail.description
                        : `${bookDetail.description.slice(0, 500)}...`
                      }
                      {bookDetail.description.length > 500 && (
                        <button
                          onClick={() => setShowFullOverview(!showFullOverview)}
                          className="ml-2 text-[#1DB954] hover:text-green-400 font-medium"
                        >
                          {showFullOverview ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Similar Books */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Similar Books</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {similarBooks.map((book) => (
                        <div key={book.id} className="group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={book.image}
                              alt={book.title}
                              className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/200x300/1a1a1a/white?text=Book+Cover'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                          </div>
                          <div className="mt-2">
                            <h4 className="text-white font-medium truncate">{book.title}</h4>
                            <p className="text-gray-400 text-sm truncate">{book.author}</p>
                            <div className="flex items-center mt-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-white text-sm ml-1">{book.rating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Author's Other Books */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">More by {bookDetail.authors[0]}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {authorBooks.map((book) => (
                        <div key={book.id} className="group cursor-pointer">
                          <div className="relative overflow-hidden rounded-lg">
                            <img
                              src={book.image}
                              alt={book.title}
                              className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/200x300/1a1a1a/white?text=Book+Cover'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                          </div>
                          <div className="mt-2">
                            <h4 className="text-white font-medium truncate">{book.title}</h4>
                            <div className="flex items-center mt-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-white text-sm ml-1">{book.rating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Reader Reviews</h3>
                  <div className="bg-gray-900 rounded-lg p-4 text-center">
                    <Book className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">Reviews feature coming soon...</p>
                  </div>
                </div>
              )}

              {activeTab === 'moreinfo' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">My Book Card</h3>
                  <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Reading Status
                        </label>
                        <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#1DB954] focus:border-transparent">
                          <option value="want-to-read">Want to Read</option>
                          <option value="currently-reading">Currently Reading</option>
                          <option value="completed">Read</option>
                          <option value="on-hold">On Hold</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          My Rating
                        </label>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setUserRating(star)}
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${
                                  star <= (hoverRating || userRating)
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-600 hover:text-yellow-400'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Personal Notes
                      </label>
                      <textarea
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
                        rows={4}
                        placeholder="What did you think about this book?"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
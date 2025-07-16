'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Calendar, BookOpen, Award, Users, Globe, Eye } from 'lucide-react'
import { googleBooksService, formatPageCount, formatPublisher, getReadingTime } from '@/services/googleBooksService'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface BookDetailModalProps {
  isOpen: boolean
  onClose: () => void
  bookId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  library: LibraryItem[]
  userReviews: Review[]
  goodreadsReviews: Review[]
  onReviewSubmit: (reviewData: any) => void
}

interface BookDetail {
  id: string
  volumeInfo: {
    title: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    categories?: string[]
    averageRating?: number
    ratingsCount?: number
    imageLinks?: {
      thumbnail?: string
      small?: string
      medium?: string
      large?: string
    }
    language?: string
    previewLink?: string
    infoLink?: string
    canonicalVolumeLink?: string
  }
  saleInfo?: {
    isEbook?: boolean
    buyLink?: string
    listPrice?: { amount: number, currencyCode: string }
  }
  accessInfo?: {
    webReaderLink?: string
    epub?: { isAvailable: boolean }
    pdf?: { isAvailable: boolean }
  }
}

export default function BookDetailModal({ 
  isOpen, 
  onClose, 
  bookId, 
  onAddToLibrary, 
  library, 
  userReviews, 
  goodreadsReviews, 
  onReviewSubmit 
}: BookDetailModalProps) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'social' | 'more'>('info')
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [showReviewBox, setShowReviewBox] = useState(false)
  const [userReview, setUserReview] = useState('')
  const [similarBooks, setSimilarBooks] = useState<any[]>([])
  const [authorBooks, setAuthorBooks] = useState<any[]>([])

  const scrollableRef = useRef<HTMLDivElement>(null)

  const bookStats = {
    'want-to-play': 3241,
    'currently-playing': 1856,
    'completed': 12923
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab('info')
      setSimilarBooks([])
      setAuthorBooks([])
    }
  }, [isOpen, bookId])

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
    if (isOpen && bookId) {
      fetchBookDetail()
    }
  }, [isOpen, bookId])

  useEffect(() => {
    const libraryItem = library.find(item => item.id === `book-${bookId}`)
    if (libraryItem) {
      setSelectedStatus(libraryItem.status)
    } else {
      setSelectedStatus(null)
    }
  }, [bookId, library])

  const fetchBookDetail = async () => {
    if (!bookId) return
    
    setLoading(true)
    try {
      let googleBookId = bookId
      
      // Si l'ID commence par 'book-', le retirer
      if (bookId.startsWith('book-')) {
        googleBookId = bookId.replace('book-', '')
      }
      
      const data = await googleBooksService.getBookDetails(googleBookId)
      setBookDetail(data as BookDetail)
      
      // Charger des livres similaires et de l'auteur
      if (data?.volumeInfo) {
        if (data.volumeInfo.categories?.length) {
          await fetchSimilarBooks(data)
        }
        if (data.volumeInfo.authors?.length) {
          await fetchAuthorBooks(data.volumeInfo.authors[0], data.id)
        }
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error)
      setBookDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchSimilarBooks = async (book: BookDetail) => {
    try {
      const similarBooksData = await googleBooksService.getSimilarBooks(book as any, 6)
      const convertedBooks = similarBooksData.map(book => googleBooksService.convertToAppFormat(book))
      setSimilarBooks(convertedBooks)
    } catch (error) {
      console.error('Error fetching similar books:', error)
      setSimilarBooks([])
    }
  }

  const fetchAuthorBooks = async (author: string, excludeBookId: string) => {
    try {
      const authorBooksData = await googleBooksService.getBooksByAuthor(author, 8)
      const filteredBooks = authorBooksData
        .filter(book => book.id !== excludeBookId)
        .slice(0, 6)
        .map(book => googleBooksService.convertToAppFormat(book))
      
      setAuthorBooks(filteredBooks)
    } catch (error) {
      console.error('Error fetching author books:', error)
      setAuthorBooks([])
    }
  }

  const handleStatusSelect = (status: MediaStatus) => {
    if (!bookDetail) return
    
    const bookItem = {
      id: `book-${bookDetail.id}`,
      title: bookDetail.volumeInfo.title,
      image: googleBooksService.getBestImageURL(bookDetail as any, 'medium'),
      category: 'books' as const,
      year: googleBooksService.getPublicationYear(bookDetail as any),
      rating: bookDetail.volumeInfo.averageRating || 0,
      author: bookDetail.volumeInfo.authors?.[0] || 'Unknown Author'
    }
    
    onAddToLibrary(bookItem, status)
    setSelectedStatus(status)
  }

  const getStatusLabel = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'Want to Read'
      case 'currently-playing': return 'Reading'
      case 'completed': return 'Read'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'bg-orange-500 hover:bg-orange-600'
      case 'currently-playing': return 'bg-green-500 hover:bg-green-600'
      case 'completed': return 'bg-blue-500 hover:bg-blue-600'
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'dropped': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const handleSubmitReview = () => {
    if (userRating > 0 && userReview.trim()) {
      onReviewSubmit({
        rating: userRating,
        review: userReview.trim()
      })
      
      setShowReviewBox(false)
      setUserReview('')
      setUserRating(0)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bookDetail ? (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 p-2 hover:bg-white/80 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="p-6 flex items-center space-x-4">
                <div className="w-20 h-28 rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-gray-100 flex-shrink-0">
                  {googleBooksService.getBestImageURL(bookDetail as any, 'medium') ? (
                    <img
                      src={googleBooksService.getBestImageURL(bookDetail as any, 'medium')!}
                      alt={bookDetail.volumeInfo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📚
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{bookDetail.volumeInfo.title}</h1>
                  {bookDetail.volumeInfo.subtitle && (
                    <h2 className="text-lg text-gray-600 mb-2">{bookDetail.volumeInfo.subtitle}</h2>
                  )}
                  
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-gray-700 font-medium">
                      {bookDetail.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                    </span>
                    {bookDetail.volumeInfo.pageCount && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-600">{formatPageCount(bookDetail.volumeInfo.pageCount)}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    {bookDetail.volumeInfo.publisher && (
                      <span>{formatPublisher(bookDetail.volumeInfo.publisher, bookDetail.volumeInfo.publishedDate || '')}</span>
                    )}
                    {bookDetail.volumeInfo.pageCount && (
                      <>
                        <span>•</span>
                        <span>{getReadingTime(bookDetail.volumeInfo.pageCount)}</span>
                      </>
                    )}
                  </div>
                  
                  {bookDetail.volumeInfo.averageRating && (
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={`${
                              star <= bookDetail.volumeInfo.averageRating! ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {bookDetail.volumeInfo.averageRating?.toFixed(1)}/5
                        {bookDetail.volumeInfo.ratingsCount && ` (${bookDetail.volumeInfo.ratingsCount.toLocaleString()} reviews)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto">
              {/* Action buttons */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex space-x-3 mb-4">
                  {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusSelect(status)}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all text-white shadow-sm ${
                        selectedStatus === status
                          ? getStatusColor(status)
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <div className="text-sm font-semibold">{getStatusLabel(status)}</div>
                      <div className="text-xs opacity-80">
                        {bookStats[status].toLocaleString()} readers
                      </div>
                    </button>
                  ))}
                </div>
                
                {selectedStatus && (
                  <div className="text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg p-3">
                    ✅ Added to your library on {new Date().toLocaleDateString()}
                  </div>
                )}

                {/* User rating */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-gray-900 font-semibold mb-3">Rate this book</h4>
                  <div className="flex items-center space-x-2 mb-3">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => {
                          setUserRating(rating)
                          setShowReviewBox(true)
                        }}
                        onMouseEnter={() => setHoverRating(rating)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={24}
                          className={`transition-colors ${
                            (hoverRating || userRating) >= rating
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    ))}
                    {userRating > 0 && (
                      <span className="text-gray-900 ml-2 font-medium">{userRating}/5</span>
                    )}
                  </div>
                  
                  {showReviewBox && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="text-sm text-gray-700 mb-2 block font-medium">Share your thoughts</label>
                      <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="What did you think about this book?"
                        className="w-full h-20 px-3 py-2 bg-white text-gray-900 text-sm rounded-lg resize-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex space-x-2 mt-3">
                        <button 
                          onClick={handleSubmitReview}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Submit Review
                        </button>
                        <button 
                          onClick={() => {
                            setShowReviewBox(false)
                            setUserReview('')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-gray-900 font-semibold mb-4">Recent Reviews</h3>
                <div className="flex space-x-4 overflow-x-auto pb-2">
                  {/* User reviews first */}
                  {userReviews.map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm">👤</span>
                        </div>
                        <span className="text-gray-900 text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded-full font-medium">You</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {review.review || review.text}
                      </p>
                    </div>
                  ))}
                  
                  {/* Goodreads reviews */}
                  {goodreadsReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm">📚</span>
                        </div>
                        <span className="text-gray-900 text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded-full font-medium">Goodreads</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-600 ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
                <div className="flex px-6">
                  {(['info', 'social', 'more'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 px-4 font-medium transition-colors relative ${
                        activeTab === tab
                          ? 'text-gray-900'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-3">Description</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-gray-700 leading-relaxed">
                          {googleBooksService.cleanDescription(bookDetail.volumeInfo.description || '') || 'No description available.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Author(s)</h5>
                        <p className="text-gray-600 text-sm">
                          {bookDetail.volumeInfo.authors?.join(', ') || 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Publisher</h5>
                        <p className="text-gray-600 text-sm">
                          {bookDetail.volumeInfo.publisher || 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Published</h5>
                        <p className="text-gray-600 text-sm">
                          {bookDetail.volumeInfo.publishedDate || 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h5 className="text-gray-900 font-medium mb-2">Pages</h5>
                        <p className="text-gray-600 text-sm">
                          {bookDetail.volumeInfo.pageCount ? formatPageCount(bookDetail.volumeInfo.pageCount) : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {bookDetail.volumeInfo.categories && bookDetail.volumeInfo.categories.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-3">Categories</h4>
                        <div className="flex flex-wrap gap-2">
                          {bookDetail.volumeInfo.categories.map((category, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm"
                            >
                              📖 {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'social' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Reading Stats</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-orange-600">{bookStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-orange-700 font-medium">Want to Read</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-green-600">{bookStats['currently-playing'].toLocaleString()}</div>
                          <div className="text-sm text-green-700 font-medium">Reading</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                          <div className="text-2xl font-bold text-blue-600">{bookStats['completed'].toLocaleString()}</div>
                          <div className="text-sm text-blue-700 font-medium">Read</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Formats Available</h4>
                      <div className="space-y-3">
                        {bookDetail.accessInfo?.epub?.isAvailable && (
                          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <BookOpen size={20} className="text-blue-600" />
                            <span className="font-medium text-blue-900">EPUB Available</span>
                          </div>
                        )}
                        {bookDetail.accessInfo?.pdf?.isAvailable && (
                          <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <BookOpen size={20} className="text-red-600" />
                            <span className="font-medium text-red-900">PDF Available</span>
                          </div>
                        )}
                        {bookDetail.saleInfo?.isEbook && (
                          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <BookOpen size={20} className="text-purple-600" />
                            <span className="font-medium text-purple-900">E-book Available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">External Links</h4>
                      <div className="space-y-3">
                        {bookDetail.volumeInfo.infoLink && (
                          <a 
                            href={bookDetail.volumeInfo.infoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on Google Books
                          </a>
                        )}

                        {bookDetail.volumeInfo.previewLink && (
                          <a
                            href={bookDetail.volumeInfo.previewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <Eye size={16} />
                            <span>Preview Book</span>
                            <ExternalLink size={12} />
                          </a>
                        )}

                        {bookDetail.accessInfo?.webReaderLink && (
                          <a
                            href={bookDetail.accessInfo.webReaderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <BookOpen size={16} />
                            <span>Read Online</span>
                            <ExternalLink size={12} />
                          </a>
                        )}

                        {bookDetail.saleInfo?.buyLink && (
                          <a
                            href={bookDetail.saleInfo.buyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-xl transition-colors shadow-sm font-medium"
                          >
                            <Globe size={16} />
                            <span>Buy Book</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* More from Author */}
                    {authorBooks.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">
                          More from {bookDetail.volumeInfo.authors?.[0]}
                        </h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {authorBooks.map((book) => (
                            <div key={book.id} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                              {book.image && (
                                <img
                                  src={book.image}
                                  alt={book.title}
                                  className="w-full h-20 object-cover rounded-lg mb-2 border border-gray-100"
                                />
                              )}
                              <h5 className="text-sm font-medium text-gray-900 truncate mb-1" title={book.title}>
                                {book.title}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                <span className="text-xs text-gray-600">{book.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Similar Books */}
                    {similarBooks.length > 0 && (
                      <div>
                        <h4 className="text-gray-900 font-semibold mb-4">Similar Books</h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2">
                          {similarBooks.map((book) => (
                            <div key={book.id} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm hover:shadow-md">
                              {book.image && (
                                <img
                                  src={book.image}
                                  alt={book.title}
                                  className="w-full h-20 object-cover rounded-lg mb-2 border border-gray-100"
                                />
                              )}
                              <h5 className="text-sm font-medium text-gray-900 truncate mb-1" title={book.title}>
                                {book.title}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-500 fill-current mr-1" />
                                <span className="text-xs text-gray-600">{book.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Info */}
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-4">Additional Information</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">Language:</span>
                            <span className="text-gray-600">
                              {bookDetail.volumeInfo.language || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">ISBN:</span>
                            <span className="text-gray-600">
                              {googleBooksService.getISBN(bookDetail as any) || 'N/A'}
                            </span>
                          </div>
                          {bookDetail.volumeInfo.pageCount && (
                            <div className="flex justify-between col-span-2">
                              <span className="font-medium text-gray-900">Reading Time:</span>
                              <span className="text-gray-600 text-right">
                                {getReadingTime(bookDetail.volumeInfo.pageCount)}
                              </span>
                            </div>
                          )}
                          {bookDetail.saleInfo?.listPrice && (
                            <div className="flex justify-between col-span-2">
                              <span className="font-medium text-gray-900">Price:</span>
                              <span className="text-gray-600 text-right">
                                {bookDetail.saleInfo.listPrice.amount} {bookDetail.saleInfo.listPrice.currencyCode}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-600">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">Book not found</p>
            <p className="text-sm">Unable to load book details. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
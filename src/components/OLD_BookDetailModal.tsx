'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Star, ExternalLink, Calendar, BookOpen, Award, Users, Globe, Eye, Check, TrendingUp } from 'lucide-react'
import { googleBooksService, formatPageCount, formatPublisher, getReadingTime } from '@/services/googleBooksService'
import type { LibraryItem, Review, MediaStatus } from '@/types'

interface BookDetailModalProps {
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
  onDeleteItem,
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

  // 🔧 SIMPLIFIÉ: Même logique que GameDetailModal
  useEffect(() => {
    console.log('📚 Simple status check for bookId:', bookId)
    console.log('📚 Library items:', library.map(item => `${item.id} (${item.title})`))
    
    const libraryItem = library.find(item => item.id === bookId)
    if (libraryItem) {
      console.log('📚 ✅ Found in library:', libraryItem)
      setSelectedStatus(libraryItem.status)
    } else {
      console.log('📚 ❌ Not found in library')
      setSelectedStatus(null)
    }
  }, [bookId, library])

  const fetchBookDetail = async () => {
    if (!bookId) return
    
    setLoading(true)
    try {
      let googleBookId = bookId
      
      if (bookId.startsWith('book-')) {
        googleBookId = bookId.replace('book-', '')
      }
      
      console.log('📚 Fetching book details for ID:', googleBookId)
      
      const data = await googleBooksService.getBookDetails(googleBookId)
      setBookDetail(data as BookDetail)
      
      console.log('📚 Book detail fetched:', data)
      
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

  // 🔧 SIMPLIFIÉ: Même logique que GameDetailModal
  const handleStatusSelect = (status: MediaStatus) => {
    if (!bookDetail) return
    
    console.log('📚 Adding book to library with bookId:', bookId)
    
    const bookItem = {
      id: bookId, // 🔑 UTILISE DIRECTEMENT bookId comme GameDetailModal
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
      case 'want-to-play': return 'bg-orange-600 hover:bg-orange-700 text-white'
      case 'currently-playing': return 'bg-green-600 hover:bg-green-700 text-white'
      case 'completed': return 'bg-blue-600 hover:bg-blue-700 text-white'
      case 'paused': return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      case 'dropped': return 'bg-red-600 hover:bg-red-700 text-white'
      default: return 'bg-gray-600 hover:bg-gray-700 text-white'
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-gray-900 rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : bookDetail ? (
          <>
            {/* Header with gradient background */}
            <div className="relative">
              {/* Background gradient matching game/movie modal */}
              <div className="absolute inset-0 bg-gradient-to-b from-green-600/20 to-gray-900/50" />
              
              {/* Background image blur effect */}
              {googleBooksService.getBestImageURL(bookDetail as any, 'medium') && (
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={googleBooksService.getBestImageURL(bookDetail as any, 'medium')!}
                    alt=""
                    className="w-full h-full object-cover blur-2xl opacity-30"
                  />
                </div>
              )}
              
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2 hover:bg-white/10 rounded-full transition-all backdrop-blur-sm"
              >
                <X size={20} />
              </button>
              
              <div className="relative z-10 p-8">
                <div className="flex items-start space-x-6">
                  <div className="w-32 h-44 rounded-xl shadow-2xl overflow-hidden bg-gray-800 flex-shrink-0 ring-4 ring-white/10">
                    {googleBooksService.getBestImageURL(bookDetail as any, 'medium') ? (
                      <img
                        src={googleBooksService.getBestImageURL(bookDetail as any, 'medium')!}
                        alt={bookDetail.volumeInfo.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700">
                        <BookOpen size={40} className="text-white/70" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">{bookDetail.volumeInfo.title}</h1>
                    {bookDetail.volumeInfo.subtitle && (
                      <h2 className="text-xl text-gray-300 mb-3">{bookDetail.volumeInfo.subtitle}</h2>
                    )}
                    
                    <div className="flex items-center space-x-4 mb-3 text-gray-300">
                      <span className="font-medium">
                        {bookDetail.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                      </span>
                      {bookDetail.volumeInfo.pageCount && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span>{formatPageCount(bookDetail.volumeInfo.pageCount)}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-gray-400 mb-3">
                      {bookDetail.volumeInfo.publisher && (
                        <span>{formatPublisher(bookDetail.volumeInfo.publisher, bookDetail.volumeInfo.publishedDate || '')}</span>
                      )}
                      {bookDetail.volumeInfo.pageCount && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span>{getReadingTime(bookDetail.volumeInfo.pageCount)}</span>
                        </>
                      )}
                    </div>
                    
                    {bookDetail.volumeInfo.averageRating && (
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={18}
                              className={`${
                                star <= bookDetail.volumeInfo.averageRating! ? 'text-yellow-400 fill-current' : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-white font-medium">
                          {bookDetail.volumeInfo.averageRating?.toFixed(1)}/5
                        </span>
                        {bookDetail.volumeInfo.ratingsCount && (
                          <span className="text-gray-400">
                            • {bookDetail.volumeInfo.ratingsCount.toLocaleString()} reviews
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Category badges */}
                    {bookDetail.volumeInfo.categories && bookDetail.volumeInfo.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {bookDetail.volumeInfo.categories.slice(0, 3).map((category, index) => (
                          <span key={index} className="bg-white/10 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={scrollableRef} className="flex-1 overflow-y-auto bg-gray-900">
              {/* Status buttons section */}
              <div className="p-6 bg-gray-800/50 border-b border-gray-700">
                <div className="flex space-x-3 mb-4">
                  {(['want-to-play', 'currently-playing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        if (selectedStatus === status) {
                          if (onDeleteItem) {
                            console.log('🗑️ Removing book with ID:', bookId)
                            onDeleteItem(bookId)
                          }
                          setSelectedStatus(null)
                        } else {
                          handleStatusSelect(status)
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        selectedStatus === status
                          ? `${getStatusColor(status)} shadow-lg transform scale-105`
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {selectedStatus === status && (
                          <Check size={16} className="text-white" />
                        )}
                        <div>
                          <div className="text-sm font-semibold">{getStatusLabel(status)}</div>
                          <div className="text-xs opacity-70">
                            {bookStats[status].toLocaleString()} readers
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Status message */}
                {selectedStatus ? (
                  <div className="text-sm text-green-400 bg-green-900/20 border border-green-800/50 rounded-lg p-3 flex items-center justify-between backdrop-blur-sm">
                    <span className="flex items-center gap-2">
                      <Check size={16} />
                      Added to your library as "{getStatusLabel(selectedStatus)}"
                    </span>
                    <button 
                      onClick={() => {
                        if (onDeleteItem) {
                          console.log('🗑️ Remove button clicked for bookId:', bookId)
                          onDeleteItem(bookId)
                        }
                        setSelectedStatus(null)
                      }}
                      className="text-red-400 hover:text-red-300 text-sm underline"
                    >
                      Remove from library
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                    <span className="flex items-center gap-2">
                      <TrendingUp size={16} />
                      Click a status to add this book to your library
                    </span>
                  </div>
                )}

                {/* User rating */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="text-white font-semibold mb-3">Rate this book</h4>
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
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600 hover:text-yellow-500'
                          }`}
                        />
                      </button>
                    ))}
                    {userRating > 0 && (
                      <span className="text-white ml-2 font-medium">{userRating}/5</span>
                    )}
                  </div>
                  
                  {showReviewBox && (
                    <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                      <label className="text-sm text-gray-300 mb-2 block font-medium">Share your thoughts</label>
                      <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        placeholder="What did you think about this book?"
                        className="w-full h-20 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg resize-none border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
                      />
                      <div className="flex space-x-2 mt-3">
                        <button 
                          onClick={handleSubmitReview}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                        >
                          Submit Review
                        </button>
                        <button 
                          onClick={() => {
                            setShowReviewBox(false)
                            setUserReview('')
                          }}
                          className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="p-6 bg-gray-800/50 border-b border-gray-700">
                <h3 className="text-white font-semibold mb-4">Recent Reviews</h3>
                <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                  {userReviews.map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-green-900/20 rounded-xl p-4 border border-green-800/30 backdrop-blur-sm">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-green-800/50 rounded-full flex items-center justify-center">
                          <Users size={16} className="text-green-400" />
                        </div>
                        <span className="text-white text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-green-400 bg-green-800/30 px-2 py-1 rounded-full font-medium">You</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {review.review || review.text}
                      </p>
                    </div>
                  ))}
                  
                  {goodreadsReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex-shrink-0 w-64 bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                          <BookOpen size={16} className="text-gray-400" />
                        </div>
                        <span className="text-white text-sm font-medium">{review.username}</span>
                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full font-medium">Goodreads</span>
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">{review.rating}/5</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700">
                <div className="flex px-6">
                  {(['info', 'social', 'more'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 px-4 font-medium transition-colors relative ${
                        activeTab === tab
                          ? 'text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full" />
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
                      <h4 className="text-white font-semibold mb-3">Description</h4>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <p className="text-gray-300 leading-relaxed">
                          {googleBooksService.cleanDescription(bookDetail.volumeInfo.description || '') || 'No description available.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={16} className="text-green-400" />
                          <h5 className="text-gray-400 font-medium text-sm">Author(s)</h5>
                        </div>
                        <p className="text-white">
                          {bookDetail.volumeInfo.authors?.join(', ') || 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe size={16} className="text-green-400" />
                          <h5 className="text-gray-400 font-medium text-sm">Publisher</h5>
                        </div>
                        <p className="text-white">
                          {bookDetail.volumeInfo.publisher || 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar size={16} className="text-green-400" />
                          <h5 className="text-gray-400 font-medium text-sm">Published</h5>
                        </div>
                        <p className="text-white">
                          {bookDetail.volumeInfo.publishedDate || 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen size={16} className="text-green-400" />
                          <h5 className="text-gray-400 font-medium text-sm">Pages</h5>
                        </div>
                        <p className="text-white">
                          {bookDetail.volumeInfo.pageCount ? formatPageCount(bookDetail.volumeInfo.pageCount) : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {bookDetail.volumeInfo.categories && bookDetail.volumeInfo.categories.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-3">Categories</h4>
                        <div className="flex flex-wrap gap-2">
                          {bookDetail.volumeInfo.categories.map((category, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800/50 text-gray-300 border border-gray-700 hover:border-green-600 transition-colors cursor-pointer"
                            >
                              <BookOpen size={12} className="mr-1" /> {category}
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
                      <h4 className="text-white font-semibold mb-4">Reading Stats</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-orange-900/20 border border-orange-800/30 p-4 rounded-xl text-center backdrop-blur-sm">
                          <div className="text-2xl font-bold text-orange-400">{bookStats['want-to-play'].toLocaleString()}</div>
                          <div className="text-sm text-orange-300 font-medium">Want to Read</div>
                        </div>
                        <div className="bg-green-900/20 border border-green-800/30 p-4 rounded-xl text-center backdrop-blur-sm">
                          <div className="text-2xl font-bold text-green-400">{bookStats['currently-playing'].toLocaleString()}</div>
                          <div className="text-sm text-green-300 font-medium">Reading</div>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-800/30 p-4 rounded-xl text-center backdrop-blur-sm">
                          <div className="text-2xl font-bold text-blue-400">{bookStats['completed'].toLocaleString()}</div>
                          <div className="text-sm text-blue-300 font-medium">Read</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-4">Formats Available</h4>
                      <div className="space-y-3">
                        {bookDetail.accessInfo?.epub?.isAvailable && (
                          <div className="flex items-center space-x-3 p-4 bg-blue-900/20 rounded-xl border border-blue-800/30">
                            <BookOpen size={20} className="text-blue-400" />
                            <span className="font-medium text-blue-300">EPUB Available</span>
                          </div>
                        )}
                        {bookDetail.accessInfo?.pdf?.isAvailable && (
                          <div className="flex items-center space-x-3 p-4 bg-red-900/20 rounded-xl border border-red-800/30">
                            <BookOpen size={20} className="text-red-400" />
                            <span className="font-medium text-red-300">PDF Available</span>
                          </div>
                        )}
                        {bookDetail.saleInfo?.isEbook && (
                          <div className="flex items-center space-x-3 p-4 bg-purple-900/20 rounded-xl border border-purple-800/30">
                            <BookOpen size={20} className="text-purple-400" />
                            <span className="font-medium text-purple-300">E-book Available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-white font-semibold mb-4">External Links</h4>
                      <div className="space-y-3">
                        {bookDetail.volumeInfo.infoLink && (
                          <a 
                            href={bookDetail.volumeInfo.infoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl font-medium transform hover:scale-105"
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
                            className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl font-medium transform hover:scale-105"
                          >
                            <Eye size={16} />
                            <span>Preview Book</span>
                          </a>
                        )}

                        {bookDetail.accessInfo?.webReaderLink && (
                          <a
                            href={bookDetail.accessInfo.webReaderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl font-medium transform hover:scale-105"
                          >
                            <BookOpen size={16} />
                            <span>Read Online</span>
                          </a>
                        )}

                        {bookDetail.saleInfo?.buyLink && (
                          <a
                            href={bookDetail.saleInfo.buyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl font-medium transform hover:scale-105"
                          >
                            <Globe size={16} />
                            <span>Buy Book</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* More from Author */}
                    {authorBooks.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-4">
                          More from {bookDetail.volumeInfo.authors?.[0]}
                        </h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                          {authorBooks.map((book) => (
                            <div key={book.id} className="flex-shrink-0 w-40 bg-gray-800/50 rounded-xl p-3 border border-gray-700 hover:border-green-800/50 transition-all cursor-pointer hover:bg-gray-800">
                              {book.image && (
                                <img
                                  src={book.image}
                                  alt={book.title}
                                  className="w-full h-48 object-cover rounded-lg mb-2"
                                />
                              )}
                              <h5 className="text-sm font-medium text-white truncate mb-1" title={book.title}>
                                {book.title}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-400 fill-current mr-1" />
                                <span className="text-xs text-gray-400">{book.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Similar Books */}
                    {similarBooks.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-4">Similar Books</h4>
                        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                          {similarBooks.map((book) => (
                            <div key={book.id} className="flex-shrink-0 w-40 bg-gray-800/50 rounded-xl p-3 border border-gray-700 hover:border-green-800/50 transition-all cursor-pointer hover:bg-gray-800">
                              {book.image && (
                                <img
                                  src={book.image}
                                  alt={book.title}
                                  className="w-full h-48 object-cover rounded-lg mb-2"
                                />
                              )}
                              <h5 className="text-sm font-medium text-white truncate mb-1" title={book.title}>
                                {book.title}
                              </h5>
                              <div className="flex items-center">
                                <Star size={12} className="text-yellow-400 fill-current mr-1" />
                                <span className="text-xs text-gray-400">{book.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Info */}
                    <div>
                      <h4 className="text-white font-semibold mb-4">Additional Information</h4>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm">Language</span>
                            <p className="text-white font-medium">
                              {bookDetail.volumeInfo.language || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">ISBN</span>
                            <p className="text-white font-medium">
                              {googleBooksService.getISBN(bookDetail as any) || 'N/A'}
                            </p>
                          </div>
                          {bookDetail.volumeInfo.pageCount && (
                            <div>
                              <span className="text-gray-400 text-sm">Reading Time</span>
                              <p className="text-white font-medium">
                                {getReadingTime(bookDetail.volumeInfo.pageCount)}
                              </p>
                            </div>
                          )}
                          {bookDetail.saleInfo?.listPrice && (
                            <div>
                              <span className="text-gray-400 text-sm">Price</span>
                              <p className="text-white font-medium">
                                {bookDetail.saleInfo.listPrice.amount} {bookDetail.saleInfo.listPrice.currencyCode}
                              </p>
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
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-gray-600" />
            </div>
            <p className="text-lg font-medium text-white mb-2">Book not found</p>
            <p className="text-sm text-gray-400">Unable to load book details. Please try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Star, FileText, ExternalLink, Users, Calendar, List, ArrowRight } from 'lucide-react'
import type { LibraryItem, MediaStatus } from '@/types'
import { userReviewsService, type UserReview } from '@/services/userReviewsService'
import { hardcoverService, type HardcoverReview } from '@/services/hardcoverService'

// Hooks personnalisés
import { useBookDetail } from '@/hooks/useBookDetail'
import { useBookReview } from '@/hooks/useBookReview'

// Composants modulaires
import BookHeader from './BookDetail/BookHeader'
import BookInfoSection from './BookDetail/BookInfoSection'
import StackrLoadingSkeleton from './StackrLoadingSkeleton'
import BookCover from './BookCover'

// Lazy load des modales pour optimiser le chargement initial
const ShareWithFriendsModal = lazy(() => import('./ShareWithFriendsModal'))

// Fonction pour formater HTML des descriptions Google Books
function formatGoogleBooksDescription(htmlDescription: string): string {
  if (!htmlDescription) return ''
  
  try {
    let formattedText = htmlDescription
    
    // Handle self-closing br tags
    formattedText = formattedText.replace(/<br\s*\/?>/gi, '<br class="my-1" />')
    
    // Replace tags with styled versions
    const tagReplacements = [
      { from: /<b\b[^>]*>/gi, to: '<strong class="font-bold">' },
      { from: /<\/b>/gi, to: '</strong>' },
      { from: /<strong\b[^>]*>/gi, to: '<strong class="font-bold">' },
      { from: /<\/strong>/gi, to: '</strong>' },
      { from: /<i\b[^>]*>/gi, to: '<em class="italic">' },
      { from: /<\/i>/gi, to: '</em>' },
      { from: /<em\b[^>]*>/gi, to: '<em class="italic">' },
      { from: /<\/em>/gi, to: '</em>' },
      { from: /<p\b[^>]*>/gi, to: '<div class="mb-3">' },
      { from: /<\/p>/gi, to: '</div>' },
      { from: /<div\b[^>]*>/gi, to: '<div class="mb-2">' },
      { from: /<\/div>/gi, to: '</div>' }
    ]
    
    tagReplacements.forEach(({ from, to }) => {
      formattedText = formattedText.replace(from, to)
    })
    
    // Remove any remaining unknown HTML tags
    formattedText = formattedText.replace(/<(?!\/?(strong|em|br|div)\b)[^>]*>/gi, '')
    
    // Clean up spaces
    formattedText = formattedText.replace(/\s+/g, ' ').trim()
    
    return formattedText
    
  } catch (error) {
    console.error("Error formatting HTML:", error)
    return htmlDescription.replace(/(<([^>]+)>)/gi, "").replace(/\s+/g, ' ').trim()
  }
}

// Composant pour la description formatée
function FormattedDescription({ htmlContent }: { htmlContent: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const formattedContent = formatGoogleBooksDescription(htmlContent)
  
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

interface BookDetailModalV3OptimizedProps {
  isOpen: boolean
  onClose: () => void
  bookId: string
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onDeleteItem?: (id: string) => void
  library: LibraryItem[]
  onBookSelect?: (bookId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
}

// Types pour les données
interface Friend {
  id: number
  name: string
  avatar?: string
  rating?: number
  hasReview?: boolean
  reviewText?: string
}

interface BookSheetData {
  readDate: string
  format: string
  friendsRead: any[]
  personalRating: number
  personalReview: string
  location: string
  mood: string
}

// Constantes externalisées
const MOCK_FRIENDS: Friend[] = [
  { id: 1, name: 'Axel', avatar: '/api/placeholder/32/32' },
  { id: 2, name: 'Maite', avatar: '/api/placeholder/32/32' },
  { id: 3, name: 'Darren', avatar: '/api/placeholder/32/32' },
  { id: 4, name: 'Joshua', avatar: '/api/placeholder/32/32' },
  { id: 5, name: 'Jeremy', avatar: '/api/placeholder/32/32' },
  { id: 6, name: 'Ana', avatar: '/api/placeholder/32/32' },
  { id: 7, name: 'Susete', avatar: '/api/placeholder/32/32' }
]

const FRIENDS_WHO_READ: Friend[] = [
  { id: 2, name: 'Maite', rating: 4, hasReview: true, reviewText: 'Absolutely captivating read! The character development was incredible.' },
  { id: 4, name: 'Joshua', rating: 5, hasReview: true, reviewText: 'One of the best books I\'ve read this year!' },
  { id: 1, name: 'Axel', rating: 4, hasReview: true, reviewText: 'Great storytelling and beautiful prose. Highly recommend!' }
]

export default function BookDetailModalV3Optimized({
  isOpen,
  onClose,
  bookId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onBookSelect,
  onOpenMovieDetail
}: BookDetailModalV3OptimizedProps) {
  // Hooks personnalisés pour la logique métier
  const { bookDetail, loading, error, images, authorBooks, otherEditions } = useBookDetail(bookId)
  const reviewState = useBookReview(bookId)
  
  // États locaux simplifiés
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  // Supprimé: système d'onglets fusionné en une seule page
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  
  // États pour les modales
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [showFriendsWhoRead, setShowFriendsWhoRead] = useState(false)
  const [showProductSheet, setShowProductSheet] = useState(false)
  const [showImagePopup, setShowImagePopup] = useState(false)
  
  // États pour les reviews
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(null)
  const [publicReviews, setPublicReviews] = useState<UserReview[]>([])
  const [popularReviews, setPopularReviews] = useState<HardcoverReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [loadingPopularReviews, setLoadingPopularReviews] = useState(false)
  const [showAllPopularReviews, setShowAllPopularReviews] = useState(false)
  const [expandedPopularReviews, setExpandedPopularReviews] = useState<Set<string>>(new Set())
  
  // États pour les données de livre
  const [bookSheetData, setBookSheetData] = useState<BookSheetData>({
    readDate: '',
    format: '',
    friendsRead: [],
    personalRating: 0,
    personalReview: '',
    location: '',
    mood: ''
  })
  
  // État pour le temps de lecture
  const [readingTime, setReadingTime] = useState<string | null>(null)

  // Effet pour synchroniser le statut avec la bibliothèque
  useEffect(() => {
    const libraryItem = library.find(item => item.id === bookId)
    setSelectedStatus(libraryItem?.status || null)
  }, [bookId, library])

  // Effet pour calculer le temps de lecture
  useEffect(() => {
    if (bookDetail?.pageCount) {
      const avgWordsPerPage = 250
      const avgReadingSpeed = 200 // mots par minute
      const totalWords = bookDetail.pageCount * avgWordsPerPage
      const minutes = Math.round(totalWords / avgReadingSpeed)
      
      if (minutes < 60) {
        setReadingTime(`${minutes}m read`)
      } else {
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60
        setReadingTime(`${hours}h ${remainingMinutes}m read`)
      }
    }
  }, [bookDetail])

  // Mémoisation pour obtenir la meilleure image header
  const getBookHeaderImage = useCallback(() => {
    if (!bookDetail?.imageLinks) {
      return 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1280&h=720&fit=crop&q=80'
    }
    
    // Priorité : Large > Medium > Small > Thumbnail
    if (bookDetail.imageLinks.large) return bookDetail.imageLinks.large
    if (bookDetail.imageLinks.medium) return bookDetail.imageLinks.medium
    if (bookDetail.imageLinks.small) return bookDetail.imageLinks.small
    if (images && images.length > 0) return images[0]
    if (bookDetail.imageLinks.thumbnail) return bookDetail.imageLinks.thumbnail
    return 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1280&h=720&fit=crop&q=80'
  }, [bookDetail, images])

  // Callbacks optimisés
  const handleStatusSelect = useCallback(async (status: MediaStatus) => {
    if (!bookDetail) return

    // Fermer le dropdown immédiatement pour l'UX
    setShowStatusDropdown(false)

    // Gérer la suppression
    if (status === 'remove') {
      // TODO: Implémenter la suppression de la bibliothèque
      setSelectedStatus(null)
      return
    }

    // Préparer les données du livre
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

    // Statuts qui nécessitent un rating/review
    const statusesRequiringReview = ['currently-reading', 'read', 'did-not-finish']
    
    if (statusesRequiringReview.includes(status)) {
      // Ouvrir le prompt de review
      reviewState.setShowReviewBox(true)
      // Stocker le statut temporaire pour l'utiliser après la review
      setSelectedStatus(status)
    } else {
      // Statut simple (want-to-read)
      onAddToLibrary(bookData, status)
      setSelectedStatus(status)
    }
  }, [bookDetail, onAddToLibrary, reviewState])

  // Charger les reviews au montage
  useEffect(() => {
    if (bookId) {
      loadUserReviews()
      loadPopularReviews()
    }
  }, [bookId])

  const loadUserReviews = async () => {
    try {
      setLoadingReviews(true)
      const reviews = await userReviewsService.getPublicReviews('books', bookId)
      setPublicReviews(reviews)
    } catch (error) {
      console.error('Error loading user reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const loadPopularReviews = async () => {
    if (!bookDetail) return
    
    try {
      setLoadingPopularReviews(true)
      const reviews = await hardcoverService.getBookReviews(
        bookDetail.title,
        bookDetail.authors?.[0] || ''
      )
      setPopularReviews(reviews)
    } catch (error) {
      console.error('Error loading popular reviews:', error)
    } finally {
      setLoadingPopularReviews(false)
    }
  }

  // Rendu conditionnel
  if (!isOpen || !bookId) {
    return null
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0f0e17] z-[60] min-h-screen flex items-center justify-center">
        <StackrLoadingSkeleton 
          message="Loading your book..."
          className="flex-1 justify-center"
          theme="green"
          size="medium"
          speed="normal"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0f0e17] z-[60] min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading book</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0f0e17] z-[60] min-h-screen pb-20 font-system overflow-auto">
      {bookDetail ? (
        <>
          {/* Header avec image */}
          <BookHeader
            headerImage={getBookHeaderImage()}
            bookTitle={bookDetail.title}
            onClose={onClose}
          />

          {/* Section d'informations du livre */}
          <BookInfoSection
            bookDetail={bookDetail}
            selectedStatus={selectedStatus}
            showStatusDropdown={showStatusDropdown}
            setShowStatusDropdown={setShowStatusDropdown}
            handleStatusSelect={handleStatusSelect}
            setShowShareWithFriendsModal={setShowShareWithFriendsModal}
            friendsWhoRead={FRIENDS_WHO_READ}
            setShowFriendsWhoRead={setShowFriendsWhoRead}
            setShowProductSheet={setShowProductSheet}
            userRating={reviewState.userRating}
            userReview={reviewState.userReview}
            readingTime={readingTime}
          />

          {/* Contenu principal unifié */}
          <div className="px-6 py-4 relative z-1">
            <div className="space-y-8">
                {/* Your Review - Mobile optimized */}
                {reviewState.userRating > 0 && (
                  <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold text-base">Your review</h3>
                      <button
                        onClick={() => reviewState.setShowReviewBox(true)}
                        className="text-white text-xs font-medium hover:text-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="py-2">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                          U
                        </div>
                        <span className="text-white font-medium text-sm">You</span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3 ml-11">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={`${
                                star <= reviewState.userRating
                                  ? 'text-green-400 fill-current'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs">({reviewState.reviewPrivacy})</span>
                      </div>
                      
                      {reviewState.userReview && (
                        <div className="mb-2">
                          <p className="text-gray-300 text-xs leading-relaxed">
                            {reviewState.userReview}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1 text-gray-400">
                        <span className="text-xs">❤️</span>
                        <span className="text-xs">{Math.floor(Math.random() * 100) + 10} likes</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {bookDetail.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <FormattedDescription htmlContent={bookDetail.description} />
                  </div>
                )}

                {/* Ratings */}
                {bookDetail.averageRating > 0 && (
                  <div className="flex space-x-8 mb-6">
                    <div>
                      <h4 className="text-white font-semibold mb-1">Google Books</h4>
                      <p className="text-gray-300">
                        {bookDetail.averageRating.toFixed(1)}/5
                        {bookDetail.ratingsCount > 0 && (
                          <span className="text-gray-500 text-sm ml-1">
                            ({bookDetail.ratingsCount} ratings)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Détails du livre - Intégré depuis l'onglet Details */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Book Details</h3>
                  <div className="space-y-2 text-sm mb-6">
                    {bookDetail.publisher && (
                      <div className="text-sm flex">
                        <span className="text-gray-400 w-32 flex-shrink-0">Publisher:</span>
                        <span className="text-white">{bookDetail.publisher}</span>
                      </div>
                    )}
                    {bookDetail.publishedDate && (
                      <div className="text-sm flex">
                        <span className="text-gray-400 w-32 flex-shrink-0">Published:</span>
                        <span className="text-white">{bookDetail.publishedDate}</span>
                      </div>
                    )}
                    {bookDetail.pageCount && (
                      <div className="text-sm flex">
                        <span className="text-gray-400 w-32 flex-shrink-0">Pages:</span>
                        <span className="text-white">{bookDetail.pageCount}</span>
                      </div>
                    )}
                    {bookDetail.language && (
                      <div className="text-sm flex">
                        <span className="text-gray-400 w-32 flex-shrink-0">Language:</span>
                        <span className="text-white">{bookDetail.language}</span>
                      </div>
                    )}
                    {bookDetail.isbn13 && (
                      <div className="text-sm flex">
                        <span className="text-gray-400 w-32 flex-shrink-0">ISBN-13:</span>
                        <span className="text-white">{bookDetail.isbn13}</span>
                      </div>
                    )}
                    {bookDetail.isbn10 && (
                      <div className="text-sm flex">
                        <span className="text-gray-400 w-32 flex-shrink-0">ISBN-10:</span>
                        <span className="text-white">{bookDetail.isbn10}</span>
                      </div>
                    )}
                  </div>

                  {/* Catégories/Genres */}
                  {bookDetail.categories && bookDetail.categories.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white font-semibold mb-3">Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {bookDetail.categories.map((category, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-600/20 border border-green-500/30 text-green-400 rounded-full text-sm"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liens externes */}
                  <div>
                    <h4 className="text-white font-semibold mb-3">External Links</h4>
                    <div className="space-y-3">
                      {bookDetail.previewLink && (
                        <a
                          href={bookDetail.previewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-green-400 hover:text-green-300 text-sm"
                        >
                          <ExternalLink size={16} />
                          <span>Preview on Google Books</span>
                        </a>
                      )}
                      {bookDetail.infoLink && (
                        <a
                          href={bookDetail.infoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-green-400 hover:text-green-300 text-sm"
                        >
                          <ExternalLink size={16} />
                          <span>More Info</span>
                        </a>
                      )}
                      {bookDetail.buyLink && (
                        <a
                          href={bookDetail.buyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-green-400 hover:text-green-300 text-sm"
                        >
                          <ExternalLink size={16} />
                          <span>Buy on Google Books</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reviews Section - Populaires + User reviews */}
                <div className="space-y-6">
                  {/* Reviews populaires (Hardcover) */}
                  {(popularReviews.length > 0 || loadingPopularReviews) && (
                    <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                      <div className="mb-4 md:mb-6">
                        <h3 className="text-white font-semibold text-base md:text-lg">Reviews</h3>
                      </div>
                      
                      {loadingPopularReviews ? (
                        <div className="text-gray-400 text-sm">Loading reviews...</div>
                      ) : (
                        <div className="space-y-0">
                          {(showAllPopularReviews ? popularReviews : popularReviews.slice(0, 3)).map((review, index) => (
                            <div key={review.id}>
                              <div className="py-3 md:py-4">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-8 h-8 md:w-9 md:h-9 bg-green-600 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                                    {review.author[0]?.toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-white font-medium text-sm">{review.author}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-gray-400">
                                    <span className="text-xs">💬</span>
                                    <span className="text-xs">{Math.floor(Math.random() * 100) + 10}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between mb-3 ml-11 md:ml-12">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          size={12}
                                          className={`${
                                            star <= review.rating
                                              ? 'text-green-400 fill-current'
                                              : 'text-gray-600'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-gray-500 text-xs">{review.date}</span>
                                </div>
                                
                                {review.text && (
                                  <div className="mb-2">
                                    <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                                      {expandedPopularReviews.has(review.id) 
                                        ? review.fullText || review.text
                                        : review.text.split('.')[0] + (review.text.split('.').length > 1 ? '.' : '')
                                      }
                                      {(review.fullText && review.fullText.length > review.text.split('.')[0].length) && (
                                        <button
                                          onClick={() => {
                                            const newSet = new Set(expandedPopularReviews)
                                            if (newSet.has(review.id)) {
                                              newSet.delete(review.id)
                                            } else {
                                              newSet.add(review.id)
                                            }
                                            setExpandedPopularReviews(newSet)
                                          }}
                                          className="text-gray-400 hover:text-gray-300 ml-1 text-xs"
                                        >
                                          {expandedPopularReviews.has(review.id) ? '...less' : '...more'}
                                        </button>
                                      )}
                                    </p>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1 text-gray-400">
                                    <span className="text-xs">❤️</span>
                                    <span className="text-xs">
                                      {Math.floor(Math.random() * 100) + 10} likes
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {index < (showAllPopularReviews ? popularReviews : popularReviews.slice(0, 3)).length - 1 && (
                                <div className="border-t border-green-400/15 border-dashed my-1"></div>
                              )}
                            </div>
                          ))}
                          
                          {popularReviews.length > 3 && (
                            <div className="mt-4 flex justify-center">
                              <button
                                onClick={() => setShowAllPopularReviews(!showAllPopularReviews)}
                                className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                              >
                                {showAllPopularReviews ? '...less' : '...more'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Autres livres de l'auteur */}
                {authorBooks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      More by {bookDetail.authors?.[0] || 'this author'}
                    </h3>
                    <div className="flex gap-4 pb-4 overflow-x-auto">
                      {authorBooks.slice(0, 8).map((book) => (
                        <div
                          key={book.id}
                          onClick={() => onBookSelect?.(book.id)}
                          className="flex-shrink-0 w-32 bg-gray-800/30 border border-gray-700/30 rounded-xl overflow-hidden hover:border-green-600/50 transition-all cursor-pointer group"
                        >
                          <div className="aspect-[2/3] bg-gray-700">
                            <img
                              src={book.image}
                              alt={book.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          </div>
                          <div className="p-2">
                            <h4 className="text-white font-medium text-xs mb-1 line-clamp-2 leading-tight">
                              {book.title}
                            </h4>
                            <p className="text-gray-400 text-xs">{book.year}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Autres éditions */}
                {otherEditions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Other Editions</h3>
                    <div className="flex gap-4 pb-4 overflow-x-auto">
                      {otherEditions.slice(0, 6).map((edition) => (
                        <div
                          key={edition.id}
                          onClick={() => onBookSelect?.(edition.id)}
                          className="flex-shrink-0 w-32 bg-gray-800/30 border border-gray-700/30 rounded-xl overflow-hidden hover:border-green-600/50 transition-all cursor-pointer group"
                        >
                          <div className="aspect-[2/3] bg-gray-700">
                            <img
                              src={edition.image}
                              alt={edition.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          </div>
                          <div className="p-2">
                            <h4 className="text-white font-medium text-xs mb-1 line-clamp-2 leading-tight">
                              {edition.title}
                            </h4>
                            <div className="text-gray-400 text-xs space-y-1">
                              {edition.year && <p>{edition.year}</p>}
                              {edition.publisher && <p>{edition.publisher}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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

      {/* Friends Who Read Modal */}
      {showFriendsWhoRead && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Friends who read</h3>
            <div className="space-y-4">
              {FRIENDS_WHO_READ.map(friend => (
                <div key={friend.id} className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white font-medium">
                    {friend.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{friend.name}</p>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < (friend.rating || 0) ? 'text-green-400 fill-current' : 'text-gray-600'}
                        />
                      ))}
                    </div>
                    {friend.hasReview && friend.reviewText && (
                      <p className="text-gray-400 text-sm mt-1">{friend.reviewText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowFriendsWhoRead(false)}
              className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Book Sheet Modal */}
      {showProductSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Customize Book Sheet</h3>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Date of Reading</label>
              <input
                type="date"
                value={bookSheetData.readDate}
                onChange={(e) => setBookSheetData(prev => ({ ...prev, readDate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Location</label>
              <input
                type="text"
                value={bookSheetData.location}
                onChange={(e) => setBookSheetData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Home, Library, Park, Coffee shop..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Format</label>
              <select
                value={bookSheetData.format}
                onChange={(e) => setBookSheetData(prev => ({ ...prev, format: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select format...</option>
                <option value="Physical Book">Physical Book</option>
                <option value="E-book">E-book</option>
                <option value="Audiobook">Audiobook</option>
                <option value="PDF">PDF</option>
                <option value="Kindle">Kindle</option>
                <option value="Library Book">Library Book</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Mood While Reading</label>
              <input
                type="text"
                value={bookSheetData.mood}
                onChange={(e) => setBookSheetData(prev => ({ ...prev, mood: e.target.value }))}
                placeholder="e.g., Relaxed, Excited, Curious..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Who did you read with?</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {MOCK_FRIENDS.map(friend => (
                  <label key={friend.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={bookSheetData.friendsRead.includes(friend.id)}
                      onChange={(e) => {
                        setBookSheetData(prev => ({
                          ...prev,
                          friendsRead: e.target.checked
                            ? [...prev.friendsRead, friend.id]
                            : prev.friendsRead.filter(id => id !== friend.id)
                        }))
                      }}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-white text-sm">{friend.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Your Rating</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      star <= bookSheetData.personalRating ? 'text-green-500 fill-current' : 'text-gray-600'
                    }`}
                    onClick={() => setBookSheetData(prev => ({ ...prev, personalRating: star }))}
                  />
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-gray-400 text-sm mb-2 block">Personal Review</label>
              <textarea
                value={bookSheetData.personalReview}
                onChange={(e) => setBookSheetData(prev => ({ ...prev, personalReview: e.target.value }))}
                placeholder="Share your thoughts about this book..."
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProductSheet(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Sauvegarder les données du book sheet
                  localStorage.setItem(`bookSheet-${bookId}`, JSON.stringify(bookSheetData))
                  
                  // Si rating fourni, mettre à jour le review state
                  if (bookSheetData.personalRating > 0) {
                    reviewState.setUserRating(bookSheetData.personalRating)
                  }
                  if (bookSheetData.personalReview) {
                    reviewState.setUserReview(bookSheetData.personalReview)
                  }
                  
                  setShowProductSheet(false)
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de review */}
      {reviewState.showReviewBox && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Rate and Review</h3>
            
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Your Rating</p>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      star <= (reviewState.hoverRating || reviewState.userRating) ? 'text-green-500 fill-current' : 'text-gray-600'
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
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-20"
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
                    className="text-green-600"
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
                    className="text-green-600"
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
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
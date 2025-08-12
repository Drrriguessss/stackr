'use client'
import React, { memo } from 'react'
import { Share, FileText } from 'lucide-react'
import type { BookDetail } from '@/hooks/useBookDetail'
import type { MediaStatus } from '@/types'
import BookCover from '../BookCover'

interface Friend {
  id: number
  name: string
  rating?: number
  hasReview?: boolean
  reviewText?: string
}

interface BookInfoSectionProps {
  bookDetail: BookDetail
  selectedStatus: MediaStatus | null
  showStatusDropdown: boolean
  setShowStatusDropdown: (show: boolean) => void
  handleStatusSelect: (status: MediaStatus) => void
  setShowShareWithFriendsModal: (show: boolean) => void
  friendsWhoRead: Friend[]
  setShowFriendsWhoRead: (show: boolean) => void
  setShowProductSheet: (show: boolean) => void
  userRating: number
  userReview: string
  readingTime?: string
}

const BOOK_STATUSES = [
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'currently-reading', label: 'Currently Reading' },
  { value: 'read', label: 'Read' },
  { value: 'did-not-finish', label: 'Did Not Finish' },
  { value: 'remove', label: 'Remove from Library' }
]

const BookInfoSection = memo((props: BookInfoSectionProps) => {
  const {
    bookDetail,
    selectedStatus,
    showStatusDropdown,
    setShowStatusDropdown,
    handleStatusSelect,
    setShowShareWithFriendsModal,
    friendsWhoRead,
    setShowFriendsWhoRead,
    setShowProductSheet,
    userRating,
    userReview,
    readingTime
  } = props

  const formatStatusForDisplay = (status: MediaStatus | null): string => {
    if (!status) return 'Add to Library'
    const statusConfig = BOOK_STATUSES.find(s => s.value === status)
    return statusConfig ? statusConfig.label : 'Add to Library'
  }

  const getAvailableStatuses = () => BOOK_STATUSES

  return (
    <div className="relative min-h-[240px] overflow-visible">
      {/* Green Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: 'linear-gradient(to bottom, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.3), rgba(21, 128, 61, 0.2), rgba(15, 14, 23, 0.7))',
          zIndex: 1
        }}
      />
      
      {/* Book Info Container */}
      <div className="px-5 py-6 relative z-30">
        {/* Book Thumbnail + Title Section */}
        <div className="flex gap-4 items-start mb-4">
          {/* Book Thumbnail - 100x100 */}
          <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
            <BookCover
              book={{
                id: bookDetail.id,
                image: bookDetail.imageLinks?.thumbnail,
                isbn: bookDetail.isbn13 || bookDetail.isbn10,
                title: bookDetail.title,
                authors: bookDetail.authors
              }}
              className="w-full h-full object-cover"
              showSkeleton={false}
              objectFit="cover"
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
              {readingTime && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{readingTime}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Buttons - full width */}
        <div className="flex space-x-3 mt-3 relative z-50" style={{ zIndex: 100000 }}>
          {/* Status Button */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
            >
              <span>{formatStatusForDisplay(selectedStatus)}</span>
            </button>
            
            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-green-500 rounded-lg shadow-2xl z-[99999]">
                {getAvailableStatuses().map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusSelect(status.value as MediaStatus)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-green-600/20 hover:text-green-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      selectedStatus === status.value ? 'text-green-400 bg-green-600/30' : 'text-gray-300'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Share Button */}
          <button 
            onClick={() => setShowShareWithFriendsModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
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
                {friendsWhoRead.slice(0, 4).map((friend) => (
                  <div
                    key={friend.id}
                    className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                    title={`${friend.name} - ${friend.rating}/5 stars`}
                  >
                    {friend.name.charAt(0)}
                  </div>
                ))}
                {friendsWhoRead.length > 4 && (
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17]">
                    +{friendsWhoRead.length - 4}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowFriendsWhoRead(true)}
              className="text-gray-400 hover:text-green-400 text-sm cursor-pointer"
            >
              View all
            </button>
          </div>
          
          {/* Customize book sheet */}
          <button
            onClick={() => setShowProductSheet(true)}
            className="text-green-400 hover:text-green-300 text-sm flex items-center space-x-1 cursor-pointer"
          >
            <FileText size={14} />
            <span>Customize book sheet</span>
          </button>
        </div>
      </div>
    </div>
  )
})

BookInfoSection.displayName = 'BookInfoSection'

export default BookInfoSection
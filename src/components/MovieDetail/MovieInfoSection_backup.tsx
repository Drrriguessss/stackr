'use client'
import React, { memo, useState, useEffect } from 'react'
import { Share, FileText, Star } from 'lucide-react'
import type { MediaStatus } from '@/types'
import ShareWithFriendsModal from '../ShareWithFriendsModal'

interface MovieDetail {
  imdbID?: string
  Poster: string
  Title: string
  Director: string
  Year: string
  Genre: string
}

interface MovieInfoSectionProps {
  movieDetail: MovieDetail
  selectedStatus: MediaStatus | null
  showStatusDropdown: boolean
  setShowStatusDropdown: (show: boolean) => void
  handleStatusSelect: (status: MediaStatus) => void
  setShowShareWithFriendsModal: (show: boolean) => void
  friendsWhoWatched: Array<{ id: number; name: string; rating: number }>
  setShowFriendsWhoWatchedModal: (show: boolean) => void
  setShowMovieSheet: (show: boolean) => void
  userRating: number
  userReview: string
  setMovieSheetData: (data: any) => void
  onDeleteItem?: (id: string) => void
}

const STATUS_LABELS: Record<MediaStatus, string> = {
  'want-to-watch': 'Want to Watch',
  'watching': 'Watching', 
  'watched': 'Watched',
  'dropped': 'Dropped',
  'want-to-play': 'Want to Play',
  'currently-playing': 'Currently Playing',
  'completed': 'Completed',
  'want-to-read': 'Want to Read',
  'currently-reading': 'Currently Reading',
  'want-to-listen': 'Want to Listen',
  'currently-listening': 'Currently Listening',
  'remove': 'Remove from Library'
}

const BASE_MOVIE_STATUSES: MediaStatus[] = ['want-to-watch', 'watching', 'watched', 'dropped']

const MovieInfoSection = memo(({
  movieDetail,
  selectedStatus,
  showStatusDropdown,
  setShowStatusDropdown,
  handleStatusSelect,
  setShowShareWithFriendsModal,
  friendsWhoWatched,
  setShowFriendsWhoWatchedModal,
  setShowMovieSheet,
  userRating,
  userReview,
  setMovieSheetData,
  onDeleteItem
}: MovieInfoSectionProps) => {
  const fallbackPoster = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80'
  
  // Rating and review states (like game modal)
  const [movieUserRating, setMovieUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [movieUserReview, setMovieUserReview] = useState('')
  const [reviewPrivacy, setReviewPrivacy] = useState<'private' | 'public'>('private')
  const [showInlineRating, setShowInlineRating] = useState(false)
  const [expandedUserReview, setExpandedUserReview] = useState(false)
  
  // Review interaction states (Instagram-style) - Start at zero
  const [userReviewData, setUserReviewData] = useState({
    isLiked: false,
    likesCount: 0,
    commentsCount: 0,
    comments: [] as any[]
  })
  
  // Modal states for comments and sharing
  const [showUserReviewComments, setShowUserReviewComments] = useState(false)
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  
  const movieId = movieDetail.imdbID || movieDetail.Title

  // Helper functions for review system (from game modal)
  const truncateToOneLine = (text: string): string => {
    if (!text) return ''
    if (text.length <= 60) return text
    
    const truncated = text.substring(0, 60)
    const lastSpace = truncated.lastIndexOf(' ')
    
    return lastSpace > 30 ? truncated.substring(0, lastSpace) : truncated
  }

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date()
    const then = new Date(timestamp)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
    return then.toLocaleDateString()
  }

  // Load existing movie review from localStorage
  const loadExistingMovieReview = () => {
    try {
      const stored = localStorage.getItem(`movieReview-${movieId}`)
      if (stored) {
        const reviewData = JSON.parse(stored)
        setMovieUserRating(reviewData.rating || 0)
        setMovieUserReview(reviewData.review || '')
        setReviewPrivacy(reviewData.privacy || 'private')
        
        // Load interaction data
        const interactionData = localStorage.getItem(`movieReviewInteractions-${movieId}`)
        if (interactionData) {
          setUserReviewData(JSON.parse(interactionData))
        }
      }
    } catch (error) {
      console.error('Error loading movie review:', error)
    }
  }

  // Save movie review to localStorage
  const saveMovieReview = () => {
    try {
      const reviewData = {
        rating: movieUserRating,
        review: movieUserReview,
        privacy: reviewPrivacy,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(`movieReview-${movieId}`, JSON.stringify(reviewData))
      
      // Also save interaction data
      localStorage.setItem(`movieReviewInteractions-${movieId}`, JSON.stringify(userReviewData))
    } catch (error) {
      console.error('Error saving movie review:', error)
    }
  }

  const handleSubmitReview = async () => {
    if (!movieDetail || movieUserRating === 0) return
    
    // Save review permanently
    saveMovieReview()
    
    console.log('Saving movie review:', { 
      movieId: movieDetail.imdbID, 
      rating: movieUserRating, 
      review: movieUserReview, 
      privacy: reviewPrivacy 
    })
    
    setShowInlineRating(false)
  }

  // Review interaction handlers
  const handleLikeUserReview = () => {
    setUserReviewData(prev => {
      const updated = {
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
      }
      
      // Save to localStorage
      localStorage.setItem(`movieReviewInteractions-${movieId}`, JSON.stringify(updated))
      return updated
    })
  }

  const handleShareUserReview = () => {
    setShowShareWithFriendsModal(true)
  }

  // Handle submitting a comment
  const handleSubmitComment = () => {
    if (!newComment.trim()) return
    
    const comment = {
      id: Date.now().toString(),
      userId: 'current-user',
      username: 'You',
      text: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false
    }
    
    setUserReviewData(prev => {
      const updated = {
        ...prev,
        comments: [...prev.comments, comment],
        commentsCount: prev.commentsCount + 1
      }
      
      // Save to localStorage
      localStorage.setItem(`movieReviewInteractions-${movieId}`, JSON.stringify(updated))
      return updated
    })
    
    setNewComment('')
  }

  // Load existing review data when movieId changes
  useEffect(() => {
    if (movieId) {
      loadExistingMovieReview()
    }
  }, [movieId])

  return (
    <div className="relative min-h-[240px] overflow-visible">
      <div 
        className="absolute inset-0"
        style={{ 
          background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.4), rgba(126, 58, 242, 0.3), rgba(107, 33, 168, 0.2), rgba(15, 14, 23, 0.7))',
          zIndex: 1
        }}
      />
      
      <div className="px-5 py-6 relative z-30">
        {/* Movie Info */}
        <div className="flex gap-4 items-start mb-4">
          <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
            <img
              src={movieDetail.Poster && movieDetail.Poster !== 'N/A' ? movieDetail.Poster : fallbackPoster}
              alt={movieDetail.Title}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 pt-1">
            <h1 className="text-xl font-bold text-white mb-1 leading-tight">{movieDetail.Title}</h1>
            <p className="text-sm text-gray-400 mb-1">{movieDetail.Director || 'Unknown Director'}</p>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {movieDetail.Year && <span>{movieDetail.Year}</span>}
              {movieDetail.Genre && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{movieDetail.Genre.split(',')[0].trim()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-3 relative z-50">
          <div className="relative flex-1">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
            >
              <span>{selectedStatus ? STATUS_LABELS[selectedStatus] : 'Add to Library'}</span>
            </button>
            
            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                {BASE_MOVIE_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      selectedStatus === status ? 'text-purple-400 bg-purple-600/30' : 'text-gray-300'
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
                {selectedStatus && (
                  <>
                    <div className="border-t border-purple-500/30 my-1" />
                    <button
                      onClick={() => {
                        if (onDeleteItem) {
                          onDeleteItem(movieDetail.imdbID || movieDetail.Title)
                        }
                        setShowStatusDropdown(false)
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors rounded-b-lg"
                    >
                      Remove from Library
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setShowShareWithFriendsModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
          >
            <Share size={16} />
            <span>Share</span>
          </button>
        </div>

        {/* Friends Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Friends who watched:</span>
              <div className="flex -space-x-1">
                {friendsWhoWatched.slice(0, 4).map((friend) => (
                  <div
                    key={friend.id}
                    className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                    title={`${friend.name} - ${friend.rating}/5 stars`}
                  >
                    {friend.name.charAt(0)}
                  </div>
                ))}
                {friendsWhoWatched.length > 4 && (
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17]">
                    +{friendsWhoWatched.length - 4}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowFriendsWhoWatchedModal(true)}
              className="text-gray-400 hover:text-purple-400 text-sm cursor-pointer"
            >
              View all
            </button>
          </div>
          
          <button
            onClick={() => {
              setMovieSheetData((prev: any) => ({
                ...prev,
                personalRating: userRating,
                personalReview: userReview
              }))
              setShowMovieSheet(true)
            }}
            className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer"
          >
            <FileText size={14} />
            <span>Customize movie sheet</span>
          </button>

          {/* Rate this movie section - below customize movie sheet */}
          {(selectedStatus === 'watching' || selectedStatus === 'watched' || showInlineRating) && (
            <div className="mt-4 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 border border-gray-700/50">
              <h3 className="text-white font-semibold text-base mb-4">Rate this movie</h3>
              
              {/* Rating stars */}
              <div className="flex items-center space-x-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`cursor-pointer transition-colors ${
                      star <= (hoverRating || movieUserRating) 
                        ? 'text-purple-500 fill-current' 
                        : 'text-gray-600 hover:text-purple-400'
                    }`}
                    onClick={() => setMovieUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
                {movieUserRating > 0 && (
                  <span className="text-white ml-2 text-sm">{movieUserRating}/5 stars</span>
                )}
              </div>

              {/* Review textarea - only if rating > 0 */}
              {movieUserRating > 0 && (
                <div className="space-y-3">
                  <textarea
                    value={movieUserReview}
                    onChange={(e) => setMovieUserReview(e.target.value)}
                    placeholder="Leave a review (optional)"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20 text-sm"
                  />
                  
                  {/* Privacy buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">Review privacy:</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setReviewPrivacy('private')}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            reviewPrivacy === 'private'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Private
                        </button>
                        <button
                          onClick={() => setReviewPrivacy('public')}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            reviewPrivacy === 'public'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          Public
                        </button>
                      </div>
                    </div>
                    
                    {/* Save button */}
                    <button
                      onClick={handleSubmitReview}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

            {/* Your Review section - Instagram style (permanent once saved) */}
            {movieUserRating > 0 && !showInlineRating && (
              <div className="mt-4 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 border border-gray-700/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-base">Your review</h3>
                  <button
                    onClick={() => setShowInlineRating(true)}
                    className="text-white text-xs font-medium hover:text-gray-300 transition-colors"
                  >
                    Edit
                  </button>
                </div>

                {/* Review content - Instagram style */}
                <div className="py-2">
                  {/* User header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-full flex items-center justify-center text-sm font-medium text-white">
                      U
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium text-sm">You</span>
                        <span className="text-gray-400 text-xs">• {reviewPrivacy}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={`${
                              star <= movieUserRating
                                ? 'text-purple-400 fill-current'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="text-gray-400 text-xs ml-1">{movieUserRating}/5</span>
                      </div>
                    </div>
                  </div>

                  {/* Review text */}
                  {movieUserReview && (
                    <div className="mb-4 ml-13">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {expandedUserReview || movieUserReview.length <= 150 
                          ? movieUserReview 
                          : `${movieUserReview.substring(0, 150)}...`
                        }
                      </p>
                      {movieUserReview.length > 150 && (
                        <button
                          onClick={() => setExpandedUserReview(!expandedUserReview)}
                          className="text-purple-400 text-sm font-medium mt-1 hover:text-purple-300"
                        >
                          {expandedUserReview ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Interaction buttons - Instagram style */}
                  <div className="flex items-center justify-between ml-13">
                    <div className="flex items-center space-x-6">
                      {/* Like button */}
                      <button
                        onClick={handleLikeUserReview}
                        className="flex items-center space-x-1 group"
                      >
                        <div className={`transition-colors ${userReviewData.isLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-red-400'}`}>
                          {userReviewData.isLiked ? '❤️' : '🤍'}
                        </div>
                        <span className="text-gray-400 text-sm">{userReviewData.likesCount}</span>
                      </button>

                      {/* Comment button */}
                      <button
                        onClick={() => setShowUserReviewComments(true)}
                        className="flex items-center space-x-1 group"
                      >
                        <div className="text-gray-400 group-hover:text-blue-400 transition-colors">💬</div>
                        <span className="text-gray-400 text-sm">{userReviewData.commentsCount}</span>
                      </button>

                      {/* Share button */}
                      <button
                        onClick={handleShareUserReview}
                        className="flex items-center space-x-1 group"
                      >
                        <div className="text-gray-400 group-hover:text-green-400 transition-colors">📤</div>
                        <span className="text-gray-400 text-sm">Share</span>
                      </button>
                    </div>

                    {/* Time ago */}
                    <div className="text-gray-500 text-xs">
                      {(() => {
                        try {
                          const stored = localStorage.getItem(`movieReview-${movieId}`)
                          if (stored) {
                            const reviewData = JSON.parse(stored)
                            return formatTimeAgo(reviewData.timestamp || new Date().toISOString())
                          }
                        } catch (error) {
                          console.error('Error getting timestamp:', error)
                        }
                        return 'now'
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

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

    {/* ShareWithFriendsModal */}
    <ShareWithFriendsModal
      isOpen={showShareWithFriendsModal}
      onClose={() => setShowShareWithFriendsModal(false)}
      item={{
        id: movieId,
        type: 'movies',
        title: movieDetail.Title,
        image: movieDetail.Poster !== 'N/A' ? movieDetail.Poster : undefined
      }}
    />
  </>
  )
})

MovieInfoSection.displayName = 'MovieInfoSection'

export default MovieInfoSection
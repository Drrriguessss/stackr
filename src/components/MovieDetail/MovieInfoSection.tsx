'use client'
import React, { memo } from 'react'
import { Share, FileText } from 'lucide-react'
import type { MediaStatus } from '@/types'

interface MovieDetail {
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
  'currently-listening': 'Currently Listening'
}

const MOVIE_STATUSES: MediaStatus[] = ['want-to-watch', 'watching', 'watched', 'dropped']

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
  setMovieSheetData
}: MovieInfoSectionProps) => {
  const fallbackPoster = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=800&h=600&fit=crop&q=80'
  
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
                {MOVIE_STATUSES.map((status) => (
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
        </div>
      </div>
    </div>
  )
})

MovieInfoSection.displayName = 'MovieInfoSection'

export default MovieInfoSection
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
  friendsWhoWatched: Array<{ id: number; name: string; rating: number; avatar?: string }>
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
    <div className="px-6 py-6 relative -mt-16">
      {/* Thumbnail + Basic Info - matching MusicModal layout */}
      <div className="flex gap-4 items-start mb-4 relative z-10">
        {/* Movie Thumbnail - Same size as music modal */}
        <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
          <img
            src={movieDetail.Poster && movieDetail.Poster !== 'N/A' ? movieDetail.Poster : fallbackPoster}
            alt={movieDetail.Title}
            className="w-full h-full object-cover"
            loading="eager"
            style={{ imageRendering: 'crisp-edges', backfaceVisibility: 'hidden' }}
          />
        </div>
        
        {/* Title and Director - Same style as music modal */}
        <div className="flex-1 pt-1">
          <h1 className="text-xl font-bold text-white mb-1 leading-tight">{movieDetail.Title}</h1>
          <p className="text-sm text-gray-400 mb-1">{movieDetail.Director || 'Unknown Director'}</p>
          
          {/* Movie Stats - Same style as music modal */}
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

      {/* Action Buttons - matching MusicModal style */}
      <div className="flex space-x-3 mt-3">
        {/* Status Button */}
        <div className="relative flex-1">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="w-full h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-medium rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 flex items-center justify-center space-x-1 text-xs">
            <span className="truncate">{selectedStatus ? STATUS_LABELS[selectedStatus] : 'Add to Library'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform flex-shrink-0 ${showStatusDropdown ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Dropdown */}
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
              {selectedStatus && (
                <button
                  onClick={() => handleStatusSelect(null as any)}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-600/20 transition-colors last:rounded-b-lg"
                >
                  Remove from Library
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Share Button - matching MusicModal style */}
        <button 
          onClick={() => setShowShareWithFriendsModal(true)}
          className="h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white rounded-lg transition-all duration-200 flex items-center space-x-1 text-xs">
          <Share size={14} />
          <span>Share</span>
        </button>
      </div>

      {/* Friends who watched - EXACTLY LIKE MUSIC MODAL */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">Friends who watched:</span>
            {friendsWhoWatched.length > 0 ? (
              <div className="flex -space-x-1">
                {friendsWhoWatched.slice(0, 4).map((friend) => (
                  <div
                    key={friend.id}
                    className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                    title={`${friend.name} - ${friend.rating}/5 stars`}
                  >
                    {friend.avatar ? (
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.parentElement!.innerHTML = `<div class="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">${friend.name.charAt(0)}</div>`
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">
                        {friend.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
                {friendsWhoWatched.length > 4 && (
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform">
                    +{friendsWhoWatched.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500 text-sm">None</span>
            )}
          </div>
          {friendsWhoWatched.length > 0 && (
            <button
              onClick={() => setShowFriendsWhoWatchedModal(true)}
              className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
            >
              View all
            </button>
          )}
        </div>
        
        {/* Customize movie sheet - LIKE MUSIC MODAL */}
        <button
          onClick={() => {
            setMovieSheetData((prev: any) => ({
              ...prev,
              personalRating: userRating,
              personalReview: userReview
            }))
            setShowMovieSheet(true)
          }}
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer transition-colors"
        >
          <FileText size={14} />
          <span>Customize movie sheet</span>
        </button>
      </div>
    </div>
  )
})

MovieInfoSection.displayName = 'MovieInfoSection'

export default MovieInfoSection
'use client'
import React from 'react'
import { Search, Gamepad2, Film, Book, Music, Sparkles } from 'lucide-react'

interface MediaSelectionModalFixedProps {
  isOpen: boolean
  onClose: () => void
  onSelectMedia: (category: string) => void
}

export default function MediaSelectionModalFixed({
  isOpen,
  onClose,
  onSelectMedia
}: MediaSelectionModalFixedProps) {
  if (!isOpen) return null

  const handleSelectMovieGood = () => {
    console.log('🎬 Movie GOOD button clicked!')
    onSelectMedia('movieGood')
  }

  const handleSelectOther = (category: string) => {
    console.log(`📦 ${category} button clicked`)
    onSelectMedia(category)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <Search size={24} />
              </div>
              <h2 className="text-2xl font-bold">What are you looking for?</h2>
              <Sparkles size={20} className="text-yellow-300" />
            </div>
            <p className="text-blue-100 text-lg">
              Choose a category to get more accurate and relevant results
            </p>
          </div>

          {/* 5 Buttons Grid */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* BUTTON 1: Games */}
              <button
                onClick={() => handleSelectOther('games')}
                className="group relative overflow-hidden rounded-2xl border-2 border-green-200 hover:border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 text-white">
                    <Gamepad2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Games</h3>
                    <p className="text-gray-600 text-sm">Video games, indie, AAA</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">Cyberpunk 2077</span>
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">Elden Ring</span>
                </div>
              </button>

              {/* BUTTON 2: Movies & TV */}
              <button
                onClick={() => handleSelectOther('movies')}
                className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 hover:border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
                    <Film size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Movies & TV</h3>
                    <p className="text-gray-600 text-sm">Films, series, documentaries</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">Inception</span>
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">Breaking Bad</span>
                </div>
              </button>

              {/* BUTTON 3: Books */}
              <button
                onClick={() => handleSelectOther('books')}
                className="group relative overflow-hidden rounded-2xl border-2 border-orange-200 hover:border-orange-300 bg-gradient-to-br from-orange-50 to-red-50 p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-400 to-red-600 text-white">
                    <Book size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Books</h3>
                    <p className="text-gray-600 text-sm">Novels, non-fiction, educational</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">Dune</span>
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">The Hobbit</span>
                </div>
              </button>

              {/* BUTTON 4: Music */}
              <button
                onClick={() => handleSelectOther('music')}
                className="group relative overflow-hidden rounded-2xl border-2 border-purple-200 hover:border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400 to-pink-600 text-white">
                    <Music size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Music</h3>
                    <p className="text-gray-600 text-sm">Albums, artists, soundtracks</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">Pink Floyd</span>
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs">Thriller</span>
                </div>
              </button>

              {/* BUTTON 5: Movie GOOD (THE SPECIAL ONE!) */}
              <button
                onClick={handleSelectMovieGood}
                className="group relative overflow-hidden rounded-2xl border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 via-green-50 to-emerald-50 p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl md:col-span-2"
              >
                {/* Special gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 via-green-200/20 to-emerald-200/20" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                      <Film size={36} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900">
                        🎬 Movie GOOD - TMDB V2
                      </h3>
                      <p className="text-green-600 font-bold text-lg mt-1">
                        ✅ THE WORKING VERSION
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 text-center mb-6 text-lg font-medium">
                    The Movies/TV interface that actually works with TMDB API, search, trending, and full debug info
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-3">
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full border-2 border-green-300 font-bold">
                      ✅ 100% Functional
                    </span>
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full border-2 border-blue-300 font-bold">
                      🎬 TMDB Integration
                    </span>
                    <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full border-2 border-purple-300 font-bold">
                      🔍 Advanced Search
                    </span>
                    <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-full border-2 border-orange-300 font-bold">
                      🔥 Trending Content
                    </span>
                    <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full border-2 border-gray-300 font-bold">
                      🐛 Debug Console
                    </span>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Click here to use the working Movies/TV interface
                    </p>
                  </div>
                </div>
              </button>

            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Choose your media type to start searching
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
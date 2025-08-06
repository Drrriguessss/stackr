'use client'
import React from 'react'
import { Search, Gamepad2, Film, Book, Music, Sparkles } from 'lucide-react'
import type { MediaCategory } from '@/types'

interface MediaSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMedia: (category: MediaCategory) => void
}

const mediaOptions = [
  {
    category: 'games' as MediaCategory,
    icon: Gamepad2,
    title: 'Games',
    description: 'Search for video games, indie titles, AAA releases',
    color: 'from-green-400 to-emerald-600',
    bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
    borderColor: 'border-green-200 hover:border-green-300',
    examples: ['Cyberpunk 2077', 'Hollow Knight', 'Elden Ring']
  },
  {
    category: 'movies' as MediaCategory,
    icon: Film,
    title: 'Movies & TV',
    description: 'Discover films, series, documentaries',
    color: 'from-blue-400 to-indigo-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200 hover:border-blue-300',
    examples: ['Inception', 'Breaking Bad', 'The Office']
  },
  {
    category: 'books' as MediaCategory,
    icon: Book,
    title: 'Books',
    description: 'Find novels, non-fiction, educational books',
    color: 'from-orange-400 to-red-600',
    bgColor: 'bg-gradient-to-br from-orange-50 to-red-50',
    borderColor: 'border-orange-200 hover:border-orange-300',
    examples: ['Dune', 'The Hobbit', 'Sapiens']
  },
  {
    category: 'music' as MediaCategory,
    icon: Music,
    title: 'Music',
    description: 'Explore albums, artists, soundtracks',
    color: 'from-purple-400 to-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
    borderColor: 'border-purple-200 hover:border-purple-300',
    examples: ['The Dark Side of the Moon', 'Thriller', 'Kind of Blue']
  }
]

export default function MediaSelectionModal({
  isOpen,
  onClose,
  onSelectMedia
}: MediaSelectionModalProps) {
  if (!isOpen) return null

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

          {/* Media Options Grid */}
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Movie GOOD Button - Special */}
              <button
                onClick={() => onSelectMedia('movieGood')}
                className="group relative overflow-hidden rounded-2xl border-2 border-green-200 hover:border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-green-400 to-emerald-600" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-600 text-white shadow-lg">
                      <Film size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                        Movie GOOD
                      </h3>
                      <p className="text-green-600 font-medium">TMDB V2 • Test Interface</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    The working Movies/TV interface with TMDB, search, trending, and debug info
                  </p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
                      ✅ Working Interface
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
                      🎬 TMDB Powered
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
                      🐛 Debug Info
                    </span>
                  </div>
                </div>
              </button>

              {mediaOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <button
                    key={option.category}
                    onClick={() => onSelectMedia(option.category)}
                    className={`
                      group relative overflow-hidden rounded-2xl border-2 ${option.borderColor} ${option.bgColor}
                      p-6 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl
                      hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/20
                    `}
                  >
                    {/* Background gradient overlay on hover */}
                    <div className={`
                      absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity
                      bg-gradient-to-br ${option.color}
                    `} />
                    
                    <div className="relative z-10">
                      {/* Icon and Title */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`
                          p-3 rounded-xl bg-gradient-to-br ${option.color} text-white
                          group-hover:scale-110 transition-transform duration-300
                        `}>
                          <IconComponent size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-700">
                            {option.title}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            {option.description}
                          </p>
                        </div>
                      </div>

                      {/* Examples */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Popular examples:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {option.examples.map((example, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-xs font-medium"
                            >
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Arrow indicator */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-600">
                            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Don't worry, you can always search across all categories later
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
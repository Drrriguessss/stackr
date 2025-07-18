'use client'
import { X, Search, Library, Sparkles, Gamepad2, Film, Music, BookOpen } from 'lucide-react'

interface WelcomePopupProps {
  isOpen: boolean
  onClose: () => void
  onOpenSearch: () => void
  onScanLibrary?: () => void
}

export default function WelcomePopup({ 
  isOpen, 
  onClose, 
  onOpenSearch,
  onScanLibrary 
}: WelcomePopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl w-full max-w-md shadow-2xl border border-white/20 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8 text-white">
          {/* Header with Icons */}
          <div className="text-center mb-6">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <Sparkles className="text-yellow-300" size={24} />
              <h1 className="text-2xl font-bold">Welcome to Stackr!</h1>
              <Sparkles className="text-yellow-300" size={24} />
            </div>
            
            {/* Entertainment Icons */}
            <div className="flex justify-center space-x-4 mb-4 opacity-80">
              <Gamepad2 size={20} className="text-green-300" />
              <Film size={20} className="text-blue-300" />
              <Music size={20} className="text-purple-300" />
              <BookOpen size={20} className="text-orange-300" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4 text-center text-white/90">
            <p className="text-lg leading-relaxed">
              Track all your entertainment in one place! Games, movies, music, and books.
            </p>
            
            <p className="text-sm leading-relaxed opacity-90">
              Content you rate, review, or add to your library will automatically be saved here.
            </p>
            
            <p className="text-sm leading-relaxed opacity-90">
              Let's get you started by adding items to your collection.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mt-8">
            <button
              onClick={() => {
                onOpenSearch()
                onClose()
              }}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Search size={18} />
              <span>Search & Add Content</span>
            </button>
            
            {onScanLibrary && (
              <button
                onClick={() => {
                  onScanLibrary()
                  onClose()
                }}
                className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 border border-white/20"
              >
                <Library size={18} />
                <span>Import from Other Apps</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full text-white/80 hover:text-white py-2 px-6 rounded-xl font-medium transition-colors text-sm"
            >
              I'll explore on my own
            </button>
          </div>

          {/* Bottom Tip */}
          <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-start space-x-3">
              <Sparkles size={16} className="text-yellow-300 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/90 leading-relaxed">
                <span className="font-semibold">Pro tip:</span> Use the search to find and add your favorite games, movies, albums, and books. You can track what you want to experience, what you're currently enjoying, and what you've completed!
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Bottom Bar */}
        <div className="h-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400"></div>
      </div>
    </div>
  )
}
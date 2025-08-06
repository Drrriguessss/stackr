'use client'
import React from 'react'
import { Search, Gamepad2 } from 'lucide-react'

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <Search size={24} />
              </div>
              <h2 className="text-2xl font-bold">Search for Games</h2>
            </div>
            <p className="text-green-100 text-lg">
              Click below to search for video games
            </p>
          </div>

          {/* Single Games Button */}
          <div className="p-8">
            <button
              onClick={() => onSelectMedia('games')}
              className="w-full group relative overflow-hidden rounded-2xl border-2 border-green-200 hover:border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 text-white">
                  <Gamepad2 size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Games</h3>
                  <p className="text-gray-600 mt-2">Search for video games, indie titles, AAA releases</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-sm">Cyberpunk 2077</span>
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-sm">Elden Ring</span>
                  <span className="px-3 py-1 bg-white/60 text-gray-700 rounded-full text-sm">Hollow Knight</span>
                </div>
              </div>
            </button>

            {/* Cancel button */}
            <div className="mt-8 text-center">
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
'use client'
import React, { useEffect } from 'react'
import { Search, Gamepad2, AlertCircle } from 'lucide-react'

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
  
  // DEBUG: Log when component mounts/unmounts
  useEffect(() => {
    if (isOpen) {
      console.log('🔴 DEBUG: MediaSelectionModalFixed is OPEN')
      console.log('🔴 DEBUG: This is the FIXED version with only 1 button')
      alert('DEBUG: MediaSelectionModalFixed opened - Should show only 1 button!')
    }
  }, [isOpen])
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* DEBUG BANNER */}
          <div className="bg-red-600 text-white p-4 text-center font-bold">
            <AlertCircle className="inline mr-2" size={20} />
            DEBUG MODE - THIS IS MediaSelectionModalFixed
            <br />
            You should see ONLY 1 button below!
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <Search size={24} />
              </div>
              <h2 className="text-2xl font-bold">ONLY GAMES - SIMPLIFIED VERSION</h2>
            </div>
            <p className="text-green-100 text-lg">
              All other buttons have been removed
            </p>
          </div>

          {/* Single Games Button */}
          <div className="p-8">
            <button
              onClick={() => {
                console.log('🎮 Games button clicked!')
                alert('DEBUG: Games button clicked in MediaSelectionModalFixed')
                onSelectMedia('games')
              }}
              className="w-full group relative overflow-hidden rounded-2xl border-4 border-red-500 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                ONLY BUTTON
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 text-white">
                  <Gamepad2 size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Games (THE ONLY OPTION)</h3>
                  <p className="text-gray-600 mt-2">This is the only button that should appear</p>
                </div>
              </div>
            </button>

            {/* Debug info */}
            <div className="mt-6 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg">
              <p className="text-yellow-800 font-bold text-center">
                ⚠️ If you see more than 1 button, the wrong file is being loaded!
              </p>
            </div>

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
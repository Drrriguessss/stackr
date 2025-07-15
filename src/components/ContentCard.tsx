'use client'
import { useState } from 'react'

export default function ContentCard({ item, category, onAddToLibrary, library = [], onOpenGameDetail }: any) {
  const [showActions, setShowActions] = useState(false)
  
  // ✅ SÉCURITÉ : Vérifier que library existe et est un array
  const safeLibrary = Array.isArray(library) ? library : []
  const isInLibrary = safeLibrary.some((libItem: any) => libItem.id === item.id)

  const handleAdd = (status: string) => {
    onAddToLibrary(item, status)
    setShowActions(false)
  }

  return (
    <div className="group cursor-pointer">
      <div className="relative w-full h-40 bg-gray-900 rounded-lg overflow-hidden">
        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
        
        <div className="absolute top-2 right-2">
          {isInLibrary ? (
            <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              ✓
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center"
              >
                +
              </button>
              {showActions && (
                <div className="absolute top-8 right-0 bg-gray-800 rounded p-2 z-10">
                  <button onClick={() => handleAdd('want-to-play')} className="block text-white text-xs p-1 hover:bg-gray-700 w-full text-left">Want to Play</button>
                  <button onClick={() => handleAdd('currently-playing')} className="block text-white text-xs p-1 hover:bg-gray-700 w-full text-left">Playing</button>
                  <button onClick={() => handleAdd('completed')} className="block text-white text-xs p-1 hover:bg-gray-700 w-full text-left">Completed</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2">
        <h3 className="text-white text-sm font-semibold">{item.title}</h3>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{item.year}</span>
          <span>★ {item.rating}</span>
        </div>
      </div>

      {showActions && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  )
}
'use client'
import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ContentCard from './ContentCard'

interface ContentSectionProps {
  title: string
  items: any[]
  category: string
  onAddToLibrary: (item: any, status: string) => void
  library?: any[]
  onOpenGameDetail?: (gameId: string) => void // ✅ NOUVELLE PROP
}

export default function ContentSection({ title, items, category, onAddToLibrary, library = [], onOpenGameDetail }: ContentSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    
    const scrollAmount = 280 // Largeur d'une carte + gap
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  return (
    <section className="mb-8">
      {/* Header avec titre et flèches */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        
        {/* Flèches de navigation - cachées sur mobile */}
        <div className="hidden sm:flex space-x-2">
          <button
            onClick={() => scroll('left')}
            className={`p-2 rounded-full transition-all duration-200 ${
              showLeftArrow
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
            }`}
            disabled={!showLeftArrow}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scroll('right')}
            className={`p-2 rounded-full transition-all duration-200 ${
              showRightArrow
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
            }`}
            disabled={!showRightArrow}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Conteneur scrollable horizontal */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide"
        >
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-64 sm:w-72">
              <ContentCard
                item={item}
                onAddToLibrary={onAddToLibrary}
                category={category}
                library={library}
                onOpenGameDetail={onOpenGameDetail} // ✅ PASSER LA FONCTION
              />
            </div>
          ))}
        </div>

        {/* Gradient de fin pour indiquer qu'on peut scroller */}
        {showRightArrow && (
          <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-gray-950 to-transparent pointer-events-none hidden sm:block" />
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
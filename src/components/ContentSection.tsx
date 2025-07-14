'use client'
import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ContentCard from './ContentCard'

interface ContentItem {
  id: number
  title: string
  author?: string
  artist?: string
  director?: string
  year: number
  rating: number
  genre: string
}

interface ContentSectionProps {
  title: string
  items: ContentItem[]
  category: string
  onAddToLibrary: (item: ContentItem, status: string) => void
}

export default function ContentSection({ title, items, category, onAddToLibrary }: ContentSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    
    const scrollAmount = 320 // Largeur d'une carte + gap
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  return (
    <section className="mb-12">
      {/* Header avec titre et flèches */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        
        {/* Flèches de navigation */}
        <div className="flex space-x-2">
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
          className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-72">
              <ContentCard
                item={item}
                onAddToLibrary={onAddToLibrary}
                category={category}
              />
            </div>
          ))}
        </div>

        {/* Gradient de fin pour indiquer qu'on peut scroller */}
        {showRightArrow && (
          <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-gray-950 to-transparent pointer-events-none" />
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
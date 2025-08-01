'use client'
import { useState, useEffect } from 'react'

interface Book {
  id: number
  color: string
  width: number
  height: number
  delay: number
  stackPosition: number
}

interface StackrBookStackLoadingProps {
  size?: 'small' | 'medium' | 'large'
  speed?: 'fast' | 'normal' | 'slow'
  loop?: boolean
  onAnimationComplete?: () => void
  theme?: 'green' | 'orange'
}

export default function StackrBookStackLoading({ 
  size = 'medium',
  speed = 'normal',
  loop = false,
  onAnimationComplete,
  theme = 'green'
}: StackrBookStackLoadingProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [stackedBooks, setStackedBooks] = useState<Book[]>([])
  const [animationKey, setAnimationKey] = useState(0)

  const sizeConfig = {
    small: { container: 'w-32 h-20', sLetter: 'text-4xl', bookArea: 'w-16 h-16' },
    medium: { container: 'w-48 h-28', sLetter: 'text-6xl', bookArea: 'w-20 h-20' },
    large: { container: 'w-64 h-36', sLetter: 'text-8xl', bookArea: 'w-24 h-24' }
  }

  const speedConfig = {
    fast: 300,
    normal: 500,
    slow: 800
  }

  const themeConfig = {
    green: {
      sGradient: 'bg-gradient-to-r from-green-400 to-emerald-600',
      sGlow: 'drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]'
    },
    orange: {
      sGradient: 'bg-gradient-to-r from-[#FF6A00] to-[#FFB347]',
      sGlow: 'drop-shadow-[0_0_15px_rgba(255,106,0,0.6)]'
    }
  }

  const bookColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
    '#84cc16', '#f59e0b', '#10b981', '#6366f1'
  ]

  useEffect(() => {
    const delay = speedConfig[speed]
    const numberOfBooks = 6

    // Générer les livres
    const newBooks: Book[] = Array.from({ length: numberOfBooks }, (_, index) => ({
      id: index,
      color: bookColors[index % bookColors.length],
      width: 24 + Math.random() * 16, // Largeurs variées
      height: 32 + Math.random() * 8, // Hauteurs variées
      delay: index * delay,
      stackPosition: index
    }))

    setBooks(newBooks)
    setStackedBooks([])

    // Animation séquentielle des livres qui tombent
    newBooks.forEach((book, index) => {
      setTimeout(() => {
        setStackedBooks(prev => [...prev, book])
        
        // Animation terminée pour le dernier livre
        if (index === newBooks.length - 1) {
          setTimeout(() => {
            onAnimationComplete?.()
            
            if (loop) {
              setTimeout(() => {
                setAnimationKey(prev => prev + 1)
              }, 1500)
            }
          }, 300)
        }
      }, book.delay)
    })
  }, [speed, loop, onAnimationComplete, animationKey])

  return (
    <div className={`relative ${sizeConfig[size].container} mx-auto flex items-center justify-center`}>
      {/* Le S fixe */}
      <div className="flex-1 flex items-center justify-center">
        <div 
          className={`${sizeConfig[size].sLetter} font-bold ${themeConfig[theme].sGradient} bg-clip-text text-transparent ${themeConfig[theme].sGlow} select-none`}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          S
        </div>
      </div>

      {/* Zone des livres qui s'empilent */}
      <div className={`relative ${sizeConfig[size].bookArea} flex items-end justify-center`}>
        {/* Livres qui tombent (animation) */}
        {books.map((book) => {
          const isStacked = stackedBooks.some(sb => sb.id === book.id)
          
          return (
            <div
              key={`book-${book.id}-${animationKey}`}
              className="absolute transition-all duration-700 ease-out"
              style={{
                left: '50%',
                transform: isStacked 
                  ? `translateX(-50%) translateY(${-book.stackPosition * 6}px)` 
                  : 'translateX(-50%) translateY(-400px)',
                width: `${book.width}px`,
                height: `${book.height}px`,
                background: `linear-gradient(135deg, ${book.color}, ${book.color}dd)`,
                borderRadius: '2px',
                boxShadow: `0 2px 8px ${book.color}40`,
                zIndex: 10 - book.stackPosition
              }}
            >
              {/* Détails du livre */}
              <div className="w-full h-1 bg-white/20 mt-1"></div>
              <div className="w-3/4 h-0.5 bg-white/15 mt-1 mx-auto"></div>
              <div className="w-1/2 h-0.5 bg-white/10 mt-1 mx-auto"></div>
            </div>
          )
        })}

        {/* Effet de particules quand un livre atterrit */}
        {stackedBooks.length > 0 && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
            {[...Array(3)].map((_, i) => (
              <div
                key={`particle-${i}-${stackedBooks.length}`}
                className="absolute w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                style={{
                  left: `${-10 + i * 10}px`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '600ms'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
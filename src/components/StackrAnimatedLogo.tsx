'use client'
import { useState, useEffect } from 'react'

interface StackrAnimatedLogoProps {
  size?: 'small' | 'medium' | 'large'
  speed?: 'fast' | 'normal' | 'slow'
  loop?: boolean
  onAnimationComplete?: () => void
}

export default function StackrAnimatedLogo({ 
  size = 'medium',
  speed = 'normal',
  loop = false,
  onAnimationComplete
}: StackrAnimatedLogoProps) {
  const [showSegment, setShowSegment] = useState([false, false, false, false])
  const [animationKey, setAnimationKey] = useState(0)

  const sizeConfig = {
    small: { container: 'w-20 h-20', logo: 'w-16 h-16' },
    medium: { container: 'w-32 h-32', logo: 'w-24 h-24' },
    large: { container: 'w-48 h-48', logo: 'w-36 h-36' }
  }

  const speedConfig = {
    fast: 300,
    normal: 500,
    slow: 800
  }

  // Définir les positions des segments du S
  const sSegments = [
    { x: 20, y: 20, width: 80, height: 15 }, // Segment du haut
    { x: 20, y: 45, width: 60, height: 15 }, // Segment du milieu gauche
    { x: 40, y: 70, width: 60, height: 15 }, // Segment du milieu droit
    { x: 20, y: 95, width: 80, height: 15 }  // Segment du bas
  ]

  useEffect(() => {
    const delay = speedConfig[speed]
    
    // Reset all segments
    setShowSegment([false, false, false, false])
    
    // Animate segments appearing one by one
    const timeouts = sSegments.map((_, index) => 
      setTimeout(() => {
        setShowSegment(prev => {
          const newState = [...prev]
          newState[index] = true
          return newState
        })
        
        // Call completion callback when last segment appears
        if (index === sSegments.length - 1) {
          setTimeout(() => onAnimationComplete?.(), 200)
        }
      }, index * delay)
    )

    // Handle looping
    if (loop) {
      const loopTimeout = setTimeout(() => {
        setAnimationKey(prev => prev + 1)
      }, sSegments.length * delay + 2000)
      return () => {
        timeouts.forEach(clearTimeout)
        clearTimeout(loopTimeout)
      }
    }

    return () => timeouts.forEach(clearTimeout)
  }, [speed, loop, onAnimationComplete, animationKey])

  return (
    <div className={`relative ${sizeConfig[size].container} mx-auto`}>
      {/* Logo S avec segments animés */}
      <div className={`${sizeConfig[size].logo} mx-auto relative`}>
        <div className="relative w-full h-full">
          {/* Segments du S avec gradient vert */}
          {sSegments.map((segment, index) => (
            <div
              key={`segment-${index}-${animationKey}`}
              className={`absolute bg-gradient-to-r from-green-400 to-emerald-600 rounded-sm shadow-lg transition-all duration-500 ${
                showSegment[index] 
                  ? 'opacity-100 scale-100 animate-glow' 
                  : 'opacity-0 scale-75'
              }`}
              style={{
                left: `${(segment.x / 120) * 100}%`,
                top: `${(segment.y / 120) * 100}%`,
                width: `${(segment.width / 120) * 100}%`,
                height: `${(segment.height / 120) * 100}%`,
                transformOrigin: 'center'
              }}
            />
          ))}
          
          {/* Effet de brillance qui s'active quand tous les segments sont là */}
          {showSegment.every(Boolean) && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-shimmer"></div>
          )}
        </div>
      </div>

      {/* Texte "Loading" */}
      <div className="text-center mt-4">
        <span className="text-white text-sm font-medium animate-pulse">
          Loading
        </span>
        <div className="flex justify-center space-x-1 mt-2">
          <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
          <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce animation-delay-200"></div>
          <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce animation-delay-400"></div>
        </div>
      </div>
    </div>
  )
}
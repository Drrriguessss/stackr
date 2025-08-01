'use client'
import { useState, useEffect } from 'react'

interface MediaItem {
  id: number
  type: 'book' | 'game' | 'cd' | 'dvd'
  color: string
  x: number
  y: number
  rotation: number
  delay: number
  finalPosition: { x: number, y: number, width: number, height: number }
}

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
  const [phase, setPhase] = useState<'falling' | 'organizing' | 'transforming' | 'final'>('falling')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [showLogo, setShowLogo] = useState(false)

  const sizeConfig = {
    small: { container: 'w-20 h-20', logo: 'w-16 h-16' },
    medium: { container: 'w-32 h-32', logo: 'w-24 h-24' },
    large: { container: 'w-48 h-48', logo: 'w-36 h-36' }
  }

  const speedConfig = {
    fast: 1.5,
    normal: 3,
    slow: 4.5
  }

  // Définir les positions des segments du S
  const sSegments = [
    { x: 20, y: 20, width: 80, height: 15 }, // Segment du haut
    { x: 20, y: 45, width: 60, height: 15 }, // Segment du milieu gauche
    { x: 40, y: 70, width: 60, height: 15 }, // Segment du milieu droit
    { x: 20, y: 95, width: 80, height: 15 }  // Segment du bas
  ]

  useEffect(() => {
    // Générer les objets média qui tombent
    const items: MediaItem[] = []
    const mediaTypes: MediaItem['type'][] = ['book', 'game', 'cd', 'dvd']
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'
    ]

    for (let i = 0; i < sSegments.length; i++) {
      const segment = sSegments[i]
      const item: MediaItem = {
        id: i,
        type: mediaTypes[i % mediaTypes.length],
        color: colors[i % colors.length],
        x: Math.random() * 200 + 50,
        y: -50 - Math.random() * 100,
        rotation: Math.random() * 360,
        delay: i * 200,
        finalPosition: segment
      }
      items.push(item)
    }

    setMediaItems(items)

    // Séquence d'animation
    const totalDuration = speedConfig[speed] * 1000

    setTimeout(() => setPhase('organizing'), totalDuration * 0.33)
    setTimeout(() => setPhase('transforming'), totalDuration * 0.66)
    setTimeout(() => {
      setPhase('final')
      setShowLogo(true)
      onAnimationComplete?.()
    }, totalDuration)

    if (loop) {
      setTimeout(() => {
        setPhase('falling')
        setShowLogo(false)
        setMediaItems([...items.map(item => ({ ...item, x: Math.random() * 200 + 50, y: -50 - Math.random() * 100 }))])
      }, totalDuration + 2000)
    }
  }, [speed, loop, onAnimationComplete])

  const renderMediaItem = (item: MediaItem) => {
    const baseClasses = "absolute transition-all duration-1000 ease-out shadow-lg"
    const phaseStyles = {
      falling: {
        transform: `translate(${item.x}px, calc(100vh - 100px)) rotate(${item.rotation}deg)`,
        transition: `all ${2000 + item.delay}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
      },
      organizing: {
        transform: `translate(${item.finalPosition.x}px, ${item.finalPosition.y}px) rotate(0deg)`,
        transition: 'all 800ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      },
      transforming: {
        transform: `translate(${item.finalPosition.x}px, ${item.finalPosition.y}px) rotate(0deg) scale(1.1)`,
        filter: 'brightness(1.5)'
      },
      final: {
        transform: `translate(${item.finalPosition.x}px, ${item.finalPosition.y}px) rotate(0deg) scale(1)`,
        background: `linear-gradient(135deg, #10B981, #34D399)`,
        filter: 'none'
      }
    }

    switch (item.type) {
      case 'book':
        return (
          <div
            key={item.id}
            className={baseClasses}
            style={{
              width: phase === 'final' ? `${item.finalPosition.width}px` : '24px',
              height: phase === 'final' ? `${item.finalPosition.height}px` : '32px',
              background: phase === 'final' ? 'linear-gradient(135deg, #10B981, #34D399)' : item.color,
              borderRadius: '2px',
              animationDelay: `${item.delay}ms`,
              ...phaseStyles[phase]
            }}
          >
            {phase !== 'final' && (
              <div className="w-full h-1 bg-white/20 mt-1"></div>
            )}
          </div>
        )

      case 'game':
        return (
          <div
            key={item.id}
            className={baseClasses}
            style={{
              width: phase === 'final' ? `${item.finalPosition.width}px` : '28px',
              height: phase === 'final' ? `${item.finalPosition.height}px` : '28px',
              background: phase === 'final' ? 'linear-gradient(135deg, #10B981, #34D399)' : item.color,
              borderRadius: '4px',
              animationDelay: `${item.delay}ms`,
              ...phaseStyles[phase]
            }}
          >
            {phase !== 'final' && (
              <div className="w-2 h-2 bg-white/30 rounded-full m-1"></div>
            )}
          </div>
        )

      case 'cd':
        return (
          <div
            key={item.id}
            className={baseClasses}
            style={{
              width: phase === 'final' ? `${item.finalPosition.width}px` : '26px',
              height: phase === 'final' ? `${item.finalPosition.height}px` : '26px',
              background: phase === 'final' ? 'linear-gradient(135deg, #10B981, #34D399)' : `conic-gradient(${item.color}, #ffffff, ${item.color})`,
              borderRadius: phase === 'final' ? '2px' : '50%',
              animationDelay: `${item.delay}ms`,
              ...phaseStyles[phase]
            }}
          >
            {phase !== 'final' && (
              <div className="w-2 h-2 bg-gray-800 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            )}
          </div>
        )

      case 'dvd':
        return (
          <div
            key={item.id}
            className={baseClasses}
            style={{
              width: phase === 'final' ? `${item.finalPosition.width}px` : '22px',
              height: phase === 'final' ? `${item.finalPosition.height}px` : '30px',
              background: phase === 'final' ? 'linear-gradient(135deg, #10B981, #34D399)' : `linear-gradient(45deg, ${item.color}, #ffffff)`,
              borderRadius: '2px',
              animationDelay: `${item.delay}ms`,
              ...phaseStyles[phase]
            }}
          >
            {phase !== 'final' && (
              <div className="w-full h-0.5 bg-white/40 mt-4"></div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`relative ${sizeConfig[size].container} mx-auto`}>
      {/* Container pour les objets qui tombent */}
      <div className="absolute inset-0 overflow-hidden">
        {mediaItems.map(renderMediaItem)}
      </div>

      {/* Logo S final */}
      {showLogo && (
        <div className={`${sizeConfig[size].logo} mx-auto mt-2 relative`}>
          <div className="relative w-full h-full animate-pulse">
            {/* Segments du S avec gradient vert */}
            {sSegments.map((segment, index) => (
              <div
                key={`segment-${index}`}
                className="absolute bg-gradient-to-r from-green-400 to-emerald-600 rounded-sm shadow-lg animate-glow"
                style={{
                  left: `${(segment.x / 120) * 100}%`,
                  top: `${(segment.y / 120) * 100}%`,
                  width: `${(segment.width / 120) * 100}%`,
                  height: `${(segment.height / 120) * 100}%`,
                  animationDelay: `${index * 100}ms`
                }}
              />
            ))}
            
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-shimmer"></div>
          </div>
        </div>
      )}

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
'use client'
import { useState, useEffect } from 'react'

interface StackrTextLoadingProps {
  size?: 'small' | 'medium' | 'large'
  speed?: 'fast' | 'normal' | 'slow'
  loop?: boolean
  onAnimationComplete?: () => void
  theme?: 'green' | 'orange'
}

export default function StackrTextLoading({ 
  size = 'medium',
  speed = 'normal',
  loop = false,
  onAnimationComplete,
  theme = 'green'
}: StackrTextLoadingProps) {
  const [fillProgress, setFillProgress] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)

  const sizeConfig = {
    small: { fontSize: 'text-4xl', container: 'w-40 h-16' },
    medium: { fontSize: 'text-6xl', container: 'w-60 h-24' },
    large: { fontSize: 'text-8xl', container: 'w-80 h-32' }
  }

  const speedConfig = {
    fast: 1500,
    normal: 2500,
    slow: 4000
  }

  const themeConfig = {
    green: {
      gradient: 'from-green-400 to-emerald-600',
      glow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]'
    },
    orange: {
      gradient: 'from-[#FF6A00] to-[#FFB347]',
      glow: 'drop-shadow-[0_0_10px_rgba(255,106,0,0.5)]'
    }
  }

  useEffect(() => {
    const duration = speedConfig[speed]
    let startTime: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function pour un effet plus smooth
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      setFillProgress(easedProgress * 100)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Animation terminée
        setTimeout(() => {
          onAnimationComplete?.()
          
          if (loop) {
            // Redémarrer l'animation après une pause
            setTimeout(() => {
              setFillProgress(0)
              setAnimationKey(prev => prev + 1)
            }, 1000)
          }
        }, 200)
      }
    }

    requestAnimationFrame(animate)
  }, [speed, loop, onAnimationComplete, animationKey])

  return (
    <div className={`relative ${sizeConfig[size].container} mx-auto flex items-center justify-center`}>
      {/* Texte de base (gris) */}
      <div 
        className={`absolute inset-0 flex items-center justify-center ${sizeConfig[size].fontSize} font-bold text-gray-600 select-none`}
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        STACKR
      </div>
      
      {/* Texte coloré avec clipping mask */}
      <div 
        className={`absolute inset-0 flex items-center justify-center ${sizeConfig[size].fontSize} font-bold bg-gradient-to-r ${themeConfig[theme].gradient} bg-clip-text text-transparent select-none ${themeConfig[theme].glow}`}
        style={{ 
          fontFamily: 'Inter, system-ui, sans-serif',
          clipPath: `inset(0 ${100 - fillProgress}% 0 0)`
        }}
      >
        STACKR
      </div>
      
      {/* Effet de brillance qui suit le remplissage */}
      {fillProgress > 0 && fillProgress < 100 && (
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white opacity-60 animate-pulse"
          style={{ 
            left: `${fillProgress}%`,
            transform: 'translateX(-50%)',
            boxShadow: `0 0 20px ${theme === 'green' ? 'rgba(16,185,129,0.8)' : 'rgba(255,106,0,0.8)'}`
          }}
        />
      )}
    </div>
  )
}
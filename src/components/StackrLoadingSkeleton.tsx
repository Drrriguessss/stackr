'use client'
import { useState, useEffect } from 'react'

interface StackrLoadingSkeletonProps {
  message?: string
  className?: string
}

export default function StackrLoadingSkeleton({ 
  message = "Loading your music...", 
  className = "" 
}: StackrLoadingSkeletonProps) {
  const [currentDot, setCurrentDot] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDot(prev => (prev + 1) % 3)
    }, 500)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      {/* Logo S serpentant */}
      <div className="relative mb-8">
        {/* S principal avec effet serpent */}
        <div className="relative">
          <svg 
            width="80" 
            height="80" 
            viewBox="0 0 100 100" 
            className="animate-pulse"
          >
            {/* Tracé du S avec effet serpent */}
            <defs>
              <linearGradient id="serpentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.8">
                  <animate 
                    attributeName="stop-opacity" 
                    values="0.3;1;0.3" 
                    dur="2s" 
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="50%" stopColor="#34D399" stopOpacity="1">
                  <animate 
                    attributeName="stop-opacity" 
                    values="1;0.3;1" 
                    dur="2s" 
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor="#059669" stopOpacity="0.8">
                  <animate 
                    attributeName="stop-opacity" 
                    values="0.3;1;0.3" 
                    dur="2s" 
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
              
              {/* Effet de mouvement serpentin */}
              <path id="serpentPath" d="M 20,30 Q 50,10 80,30 T 80,70 Q 50,90 20,70 T 20,30" />
            </defs>
            
            {/* Le S principal */}
            <path
              d="M 70,20 Q 80,15 85,25 Q 85,35 75,35 L 25,35 Q 15,35 15,45 Q 15,55 25,55 L 75,55 Q 85,55 85,65 Q 85,75 75,80 L 25,80 Q 15,80 15,70"
              fill="none"
              stroke="url(#serpentGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              className="drop-shadow-lg"
            >
              {/* Animation serpentine */}
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 50 50;5 50 50;-5 50 50;0 50 50"
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
            
            {/* Particules qui suivent le S */}
            <circle r="3" fill="#10B981" opacity="0.7">
              <animateMotion dur="4s" repeatCount="indefinite">
                <mpath href="#serpentPath" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
            </circle>
            
            <circle r="2" fill="#34D399" opacity="0.5">
              <animateMotion dur="4s" repeatCount="indefinite" begin="1s">
                <mpath href="#serpentPath" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" begin="1s" />
            </circle>
            
            <circle r="2.5" fill="#059669" opacity="0.6">
              <animateMotion dur="4s" repeatCount="indefinite" begin="2s">
                <mpath href="#serpentPath" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" begin="2s" />
            </circle>
          </svg>
          
          {/* Effet de lueur autour du S */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-xl animate-pulse" />
        </div>
        
        {/* Vagues d'énergie qui se propagent */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 border-2 border-green-400/30 rounded-full animate-ping" />
          <div className="absolute w-16 h-16 border-2 border-emerald-400/40 rounded-full animate-ping animation-delay-500" />
          <div className="absolute w-12 h-12 border-2 border-green-500/50 rounded-full animate-ping animation-delay-1000" />
        </div>
      </div>
      
      {/* Texte de chargement avec animation serpentine */}
      <div className="text-center">
        <h3 className="text-white text-lg font-medium mb-2 animate-pulse">
          {message}
        </h3>
        
        {/* Barre de progression serpentine */}
        <div className="relative w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 rounded-full">
            <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* Points animés */}
        <div className="flex items-center justify-center mt-4 space-x-1">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentDot === index 
                  ? 'bg-green-400 scale-125' 
                  : 'bg-gray-600 scale-100'
              }`}
            />
          ))}
        </div>
        
        {/* Message secondaire optionnel */}
        <p className="text-gray-400 text-sm mt-3 animate-pulse">
          Fetching the perfect sound for you
        </p>
      </div>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'

interface StackrLoadingSkeletonProps {
  message?: string
  className?: string
}

export default function StackrLoadingSkeleton({ 
  message = "Loading", 
  className = "" 
}: StackrLoadingSkeletonProps) {
  const [fillLevel, setFillLevel] = useState(0)
  const [fallingItems, setFallingItems] = useState<Array<{id: number, type: 'book' | 'cd', x: number, delay: number}>>([])
  
  useEffect(() => {
    // Animation de remplissage progressif
    const fillInterval = setInterval(() => {
      setFillLevel(prev => (prev >= 100 ? 0 : prev + 2))
    }, 50)
    
    // Générer des items qui tombent
    const itemInterval = setInterval(() => {
      const newItem = {
        id: Date.now(),
        type: Math.random() > 0.5 ? 'book' : 'cd' as 'book' | 'cd',
        x: 30 + Math.random() * 40, // Position X aléatoire dans le S
        delay: 0
      }
      setFallingItems(prev => [...prev.slice(-10), newItem])
    }, 300)
    
    return () => {
      clearInterval(fillInterval)
      clearInterval(itemInterval)
    }
  }, [])

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      {/* Container du S */}
      <div className="relative mb-8">
        <div className="relative w-32 h-32">
          {/* S outline */}
          <svg 
            width="128" 
            height="128" 
            viewBox="0 0 128 128" 
            className="absolute inset-0"
          >
            <defs>
              <linearGradient id="fillGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#6EE7B7" />
              </linearGradient>
              
              <mask id="sMask">
                <path
                  d="M 40,25 Q 55,15 70,15 Q 95,15 95,35 Q 95,50 80,50 L 50,50 Q 35,50 35,65 Q 35,80 50,80 L 80,80 Q 95,80 95,95 Q 95,115 70,115 Q 55,115 40,105"
                  fill="none"
                  stroke="white"
                  strokeWidth="25"
                  strokeLinecap="round"
                />
              </mask>
              
              {/* Définir le pattern de remplissage */}
              <clipPath id="fillClip">
                <rect x="0" y={128 - (128 * fillLevel / 100)} width="128" height={128 * fillLevel / 100} />
              </clipPath>
            </defs>
            
            {/* S vide avec bordure */}
            <path
              d="M 40,25 Q 55,15 70,15 Q 95,15 95,35 Q 95,50 80,50 L 50,50 Q 35,50 35,65 Q 35,80 50,80 L 80,80 Q 95,80 95,95 Q 95,115 70,115 Q 55,115 40,105"
              fill="none"
              stroke="#374151"
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* S qui se remplit avec gradient */}
            <g mask="url(#sMask)" clipPath="url(#fillClip)">
              <rect x="0" y="0" width="128" height="128" fill="url(#fillGradient)" opacity="0.9" />
            </g>
            
            {/* Items qui tombent (livres et CDs) */}
            {fallingItems.map((item, index) => (
              <g key={item.id} opacity={0.8}>
                {item.type === 'book' ? (
                  // Livre simplifié
                  <rect
                    x={item.x}
                    y={0}
                    width="12"
                    height="16"
                    fill="#34D399"
                    rx="1"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from="0 -20"
                      to="0 130"
                      dur="2s"
                      begin={`${index * 0.1}s`}
                      repeatCount="1"
                    />
                  </rect>
                ) : (
                  // CD simplifié
                  <circle
                    cx={item.x + 6}
                    cy={8}
                    r="6"
                    fill="#10B981"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from="0 -20"
                      to="0 130"
                      dur="2s"
                      begin={`${index * 0.1}s`}
                      repeatCount="1"
                    />
                  </circle>
                )}
              </g>
            ))}
          </svg>
          
          {/* Effet de lueur subtile */}
          <div className="absolute inset-0 bg-gradient-to-t from-green-400/10 to-transparent rounded-full blur-2xl" />
        </div>
      </div>
      
      {/* Texte simple */}
      <div className="text-center">
        <h3 className="text-white text-lg font-medium">
          {message}
        </h3>
        
        {/* Indicateur de progression minimaliste */}
        <div className="mt-4 flex items-center justify-center space-x-1">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse animation-delay-500"></div>
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse animation-delay-1000"></div>
        </div>
      </div>
    </div>
  )
}
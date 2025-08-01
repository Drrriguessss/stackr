'use client'
import StackrTextLoading from './StackrTextLoading'

interface StackrLoadingSkeletonTextProps {
  message?: string
  className?: string
  speed?: 'fast' | 'normal' | 'slow'
  size?: 'small' | 'medium' | 'large'
  theme?: 'green' | 'orange'
}

export default function StackrLoadingSkeletonText({ 
  message = "Loading", 
  className = "",
  speed = "normal",
  size = "medium",
  theme = "green"
}: StackrLoadingSkeletonTextProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      <StackrTextLoading 
        size={size}
        speed={speed}
        loop={true}
        theme={theme}
      />
      
      {/* Message personnalisé si fourni */}
      {message && message !== "Loading" && (
        <div className="text-center mt-8">
          <p className={`text-sm font-medium animate-pulse ${
            theme === 'orange' 
              ? 'text-transparent bg-gradient-to-r from-[#FF6A00] to-[#FFB347] bg-clip-text' 
              : 'text-gray-400'
          }`}>
            {message}
          </p>
        </div>
      )}
    </div>
  )
}
'use client'
import StackrBookStackLoading from './StackrBookStackLoading'

interface StackrLoadingSkeletonBooksProps {
  message?: string
  className?: string
  speed?: 'fast' | 'normal' | 'slow'
  size?: 'small' | 'medium' | 'large'
  theme?: 'green' | 'orange'
}

export default function StackrLoadingSkeletonBooks({ 
  message = "Loading", 
  className = "",
  speed = "normal",
  size = "medium",
  theme = "green"
}: StackrLoadingSkeletonBooksProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      <StackrBookStackLoading 
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
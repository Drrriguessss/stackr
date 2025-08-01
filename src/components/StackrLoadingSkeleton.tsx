'use client'
import StackrAnimatedLogo from './StackrAnimatedLogo'

interface StackrLoadingSkeletonProps {
  message?: string
  className?: string
  speed?: 'fast' | 'normal' | 'slow'
  size?: 'small' | 'medium' | 'large'
}

export default function StackrLoadingSkeleton({ 
  message = "Loading", 
  className = "",
  speed = "normal",
  size = "medium"
}: StackrLoadingSkeletonProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      <StackrAnimatedLogo 
        size={size}
        speed={speed}
        loop={true}
      />
      
      {/* Message personnalisé si fourni */}
      {message !== "Loading" && (
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm animate-pulse">
            {message}
          </p>
        </div>
      )}
    </div>
  )
}
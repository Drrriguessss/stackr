'use client'

interface UnifiedLoadingSkeletonProps {
  message?: string
  className?: string
}

export default function UnifiedLoadingSkeleton({ 
  message = "Loading...", 
  className = ""
}: UnifiedLoadingSkeletonProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      {/* Purple spinning circle */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-purple-200 border-opacity-30 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Loading message */}
      <p className="mt-4 text-sm text-gray-400 animate-pulse">
        {message}
      </p>
    </div>
  )
}
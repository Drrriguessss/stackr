'use client'

import React from 'react'

interface SkeletonLoaderProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
}

export default function SkeletonLoader({ 
  className = '', 
  width = '100%', 
  height = '1rem',
  rounded = false
}: SkeletonLoaderProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div 
      className={`bg-gray-200 animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={style}
    />
  )
}

// Pre-built skeleton components for common use cases
export function AvatarSkeleton({ size = 40 }: { size?: number }) {
  return (
    <SkeletonLoader 
      width={size} 
      height={size} 
      rounded 
      className="flex-shrink-0" 
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 space-y-3">
      <SkeletonLoader height="1.5rem" width="60%" />
      <SkeletonLoader height="1rem" width="80%" />
      <SkeletonLoader height="1rem" width="40%" />
    </div>
  )
}

export function MediaCardSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonLoader height="120px" className="rounded-lg" />
      <SkeletonLoader height="1rem" width="80%" />
      <SkeletonLoader height="0.75rem" width="60%" />
    </div>
  )
}
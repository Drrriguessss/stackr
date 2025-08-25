import React, { useState, useEffect } from 'react'

interface ProgressStep {
  id: string
  label: string
  description: string
  duration: number // durée estimée en ms
  icon: string
}

interface ProgressiveLoaderProps {
  steps: ProgressStep[]
  isLoading: boolean
  currentStep?: string
  onComplete?: () => void
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  steps,
  isLoading,
  currentStep,
  onComplete
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setCurrentStepIndex(0)
      setProgress(0)
      setElapsed(0)
      return
    }

    // Simplified progress calculation for mobile compatibility
    const interval = setInterval(() => {
      setElapsed(prev => prev + 200) // Slower updates for mobile
      
      // Simple progress increment
      setProgress(prev => {
        const increment = Math.random() * 3 + 1 // Random slow increment
        return Math.min(prev + increment, 95) // Never reach 100% until done
      })
    }, 200)

    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    if (currentStep) {
      const stepIndex = steps.findIndex(step => step.id === currentStep)
      if (stepIndex !== -1) {
        setCurrentStepIndex(stepIndex)
        setElapsed(0)
      }
    }
  }, [currentStep, steps])

  useEffect(() => {
    if (progress >= 100 && onComplete) {
      onComplete()
    }
  }, [progress, onComplete])

  if (!isLoading) return null

  const currentStepObj = steps[currentStepIndex]
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Cercle de progression */}
      <div className="relative mb-6">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          {/* Cercle de fond */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgb(107 33 168 / 0.2)"
            strokeWidth="3"
          />
          {/* Cercle de progression */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgb(147 51 234)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        
        {/* Pourcentage au centre */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {Math.round(progress)}%
            </div>
            <div className="text-xs text-gray-500">
              {currentStepIndex + 1}/{steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Step actuel */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center mb-2">
          <span className="text-2xl mr-2">{currentStepObj?.icon}</span>
          <h3 className="text-lg font-medium text-white">
            {currentStepObj?.label}
          </h3>
        </div>
        <p className="text-sm text-gray-400 max-w-xs">
          {currentStepObj?.description}
        </p>
      </div>

      {/* Liste des étapes */}
      <div className="space-y-2 w-full max-w-sm">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isPending = index > currentStepIndex

          return (
            <div key={step.id} className={`
              flex items-center p-3 rounded-lg border transition-all duration-300
              ${isCompleted ? 'bg-purple-900/30 border-purple-700/50 text-purple-300' : 
                isCurrent ? 'bg-purple-900/50 border-purple-600 text-purple-200 shadow-lg' :
                'bg-gray-800/30 border-gray-700/30 text-gray-500'}
            `}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-medium
                ${isCompleted ? 'bg-purple-600 text-white' :
                  isCurrent ? 'bg-purple-500 text-white animate-pulse' :
                  'bg-gray-600 text-gray-400'}
              `}>
                {isCompleted ? '✓' : 
                 isCurrent ? step.icon :
                 index + 1}
              </div>
              
              <div className="flex-1">
                <div className="text-sm font-medium">{step.label}</div>
                <div className="text-xs opacity-75">{step.description}</div>
              </div>

              {isCurrent && (
                <div className="ml-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Temps estimé restant */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <div>Estimated time: {Math.max(0, Math.round((20000 - elapsed) / 1000))}s remaining</div>
        <div className="mt-1 text-gray-600">
          Gathering from Reddit, IMDb, Metacritic, Rotten Tomatoes...
        </div>
      </div>
    </div>
  )
}

// Steps prédéfinis pour l'analyse de reviews
export const REVIEW_ANALYSIS_STEPS: ProgressStep[] = [
  {
    id: 'cache-check',
    label: 'Checking Cache',
    description: 'Looking for existing analysis...',
    duration: 500,
    icon: '🗄️'
  },
  {
    id: 'search-reviews',
    label: 'Searching Reviews',
    description: 'Gathering from web sources...',
    duration: 8000,
    icon: '🔍'
  },
  {
    id: 'ai-analysis',
    label: 'AI Analysis',
    description: 'Analyzing sentiment & content...',
    duration: 6000,
    icon: '🤖'
  },
  {
    id: 'formatting',
    label: 'Finalizing',
    description: 'Formatting results...',
    duration: 1000,
    icon: '✨'
  }
]
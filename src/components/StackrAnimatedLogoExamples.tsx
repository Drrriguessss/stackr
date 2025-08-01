'use client'
import { useState } from 'react'
import StackrAnimatedLogo from './StackrAnimatedLogo'

// Composant de démonstration pour tester le logo animé
export default function StackrAnimatedLogoExamples() {
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [selectedSpeed, setSelectedSpeed] = useState<'fast' | 'normal' | 'slow'>('normal')
  const [key, setKey] = useState(0)

  const restartAnimation = () => {
    setKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Stackr Animated Logo</h1>
          <p className="text-gray-400">Interactive demo of the animated Stackr logo with falling media objects</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Size Control */}
            <div>
              <label className="block text-white font-medium mb-2">Size</label>
              <div className="flex space-x-2">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Control */}
            <div>
              <label className="block text-white font-medium mb-2">Speed</label>
              <div className="flex space-x-2">
                {(['fast', 'normal', 'slow'] as const).map(speed => (
                  <button
                    key={speed}
                    onClick={() => setSelectedSpeed(speed)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedSpeed === speed
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {speed.charAt(0).toUpperCase() + speed.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Restart Button */}
            <div className="flex items-end">
              <button
                onClick={restartAnimation}
                className="w-full px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-600 text-white font-medium rounded-md hover:from-green-500 hover:to-emerald-700 transition-all duration-200"
              >
                Restart Animation
              </button>
            </div>
          </div>
        </div>

        {/* Logo Demo Area */}
        <div className="bg-gray-900 rounded-lg p-8 min-h-[500px] flex items-center justify-center">
          <StackrAnimatedLogo
            key={key}
            size={selectedSize}
            speed={selectedSpeed}
            loop={false}
            onAnimationComplete={() => console.log('Animation completed!')}
          />
        </div>

        {/* Usage Examples */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Usage Examples</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-green-400 font-medium mb-2">Basic Usage</h3>
              <pre className="bg-gray-900 rounded p-3 text-gray-300 text-sm overflow-x-auto">
                <code>{`<StackrAnimatedLogo />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-green-400 font-medium mb-2">Custom Size and Speed</h3>
              <pre className="bg-gray-900 rounded p-3 text-gray-300 text-sm overflow-x-auto">
                <code>{`<StackrAnimatedLogo 
  size="large"
  speed="fast"
  loop={true}
  onAnimationComplete={() => console.log('Done!')}
/>`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-green-400 font-medium mb-2">In Loading Screen</h3>
              <pre className="bg-gray-900 rounded p-3 text-gray-300 text-sm overflow-x-auto">
                <code>{`<StackrLoadingSkeleton 
  message="Loading your content..."
  size="medium"
  speed="normal"
/>`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Animation Phases Description */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Animation Phases</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <h3 className="text-white font-medium">Phase 1: Falling (0-33%)</h3>
                </div>
                <p className="text-gray-400 text-sm">Media objects fall from the top with realistic physics, rotation, and bouncing.</p>
              </div>

              <div>
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <h3 className="text-white font-medium">Phase 2: Organizing (33-66%)</h3>
                </div>
                <p className="text-gray-400 text-sm">Objects magically arrange themselves into the S shape positions with smooth transitions.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <h3 className="text-white font-medium">Phase 3: Transforming (66-100%)</h3>
                </div>
                <p className="text-gray-400 text-sm">Objects crystallize and transform into the final green gradient logo segments.</p>
              </div>

              <div>
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <h3 className="text-white font-medium">Phase 4: Final Logo</h3>
                </div>
                <p className="text-gray-400 text-sm">Complete Stackr logo with subtle glow and breathing animation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
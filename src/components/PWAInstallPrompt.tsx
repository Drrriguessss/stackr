'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isSafari, setIsSafari] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true
    if (isInstalled) return

    // Check if user already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    // Detect Safari
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                        !(window as any).MSStream &&
                        !navigator.userAgent.match(/CriOS/i)
    
    const isMacSafari = navigator.userAgent.includes('Safari') && 
                        !navigator.userAgent.includes('Chrome') &&
                        navigator.userAgent.includes('Mac')

    if (isIOSSafari || isMacSafari) {
      setIsSafari(true)
      // Show Safari-specific install prompt after a delay
      setTimeout(() => setShowPrompt(true), 2000)
      return
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('pwainstallable', () => setShowPrompt(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('pwainstallable', () => setShowPrompt(true))
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }
    
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  // Safari-specific install instructions
  if (isSafari) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-3">
            <h3 className="font-semibold text-gray-900 mb-1">Install Stackr</h3>
            <p className="text-sm text-gray-600 mb-3">
              {isIOS 
                ? "To install: Tap the Share button (square with arrow) and select 'Add to Home Screen'"
                : "To install: Click the Share button in Safari and select 'Add to Dock' or 'Add to Home Screen'"
              }
            </p>
            <p className="text-xs text-gray-500">
              This will allow you to use Stackr like a native app with offline support.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    )
  }

  // Standard install prompt for Chrome/Edge/Firefox
  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex-1 mr-3">
          <h3 className="font-semibold text-gray-900 mb-1">Install Stackr</h3>
          <p className="text-sm text-gray-600">
            Add Stackr to your home screen for a better experience with offline support.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleInstall}
          className="flex-1 bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={16} />
          Install App
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Not Now
        </button>
      </div>
    </div>
  )
}
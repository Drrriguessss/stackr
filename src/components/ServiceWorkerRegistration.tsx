'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration)

            // Check for updates periodically
            setInterval(() => {
              registration.update()
            }, 60 * 60 * 1000) // Check every hour

            // Handle updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New content is available
                    if (confirm('New version available! Reload to update?')) {
                      window.location.reload()
                    }
                  }
                })
              }
            })
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError)
          })
      })

      // Handle app install prompt
      let deferredPrompt: any
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault()
        // Stash the event so it can be triggered later
        deferredPrompt = e
        
        // Update UI to show install button
        // You can dispatch a custom event here if needed
        window.dispatchEvent(new CustomEvent('pwainstallable'))
      })

      // Handle successful installation
      window.addEventListener('appinstalled', () => {
        console.log('PWA was installed')
        deferredPrompt = null
      })
    }
  }, [])

  return null
}
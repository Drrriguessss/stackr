// src/app/auth/callback/page.tsx - Page de callback OAuth
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/authService'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔔 [Callback] Starting auth callback processing...')
        console.log('🔔 [Callback] Current URL:', window.location.href)
        console.log('🔔 [Callback] Hash fragment:', window.location.hash)
        console.log('🔔 [Callback] Search params:', window.location.search)
        
        // Vérifier si on a des paramètres OAuth dans l'URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        
        console.log('🔔 [Callback] Hash params:', [...hashParams.entries()])
        console.log('🔔 [Callback] Search params:', [...searchParams.entries()])
        
        // Laisser Supabase traiter automatiquement l'OAuth callback
        // Supabase détecte automatiquement les fragments dans l'URL
        await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1 seconde
        
        // Attendre que Supabase traite l'OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('🔔 [Callback] Session error:', error)
          setStatus('error')
          setMessage('Erreur lors de la récupération de la session.')
          
          setTimeout(() => {
            router.push('/')
          }, 3000)
          return
        }

        if (data.session?.user) {
          console.log('🔔 [Callback] User authenticated:', data.session.user.email)
          setStatus('success')
          setMessage('Connexion réussie! Redirection en cours...')
          
          // Rediriger vers la page principale après 1 seconde
          setTimeout(() => {
            router.push('/')
          }, 1000)
        } else {
          console.log('🔔 [Callback] No session found, retrying...')
          
          // Retry après un délai pour laisser le temps à Supabase
          setTimeout(async () => {
            const user = await AuthService.getCurrentUser()
            if (user) {
              console.log('🔔 [Callback] User found on retry:', user.email)
              setStatus('success')
              setMessage('Connexion réussie! Redirection en cours...')
              setTimeout(() => router.push('/'), 1000)
            } else {
              console.log('🔔 [Callback] Still no user found')
              setStatus('error')
              setMessage('Erreur lors de la connexion. Veuillez réessayer.')
              setTimeout(() => router.push('/'), 3000)
            }
          }, 1000)
        }
      } catch (error) {
        console.error('❌ [Callback] Auth callback error:', error)
        setStatus('error')
        setMessage('Une erreur inattendue s\'est produite.')
        
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Finalisation de la connexion
            </h1>
            <p className="text-gray-600">
              Veuillez patienter pendant que nous finalisons votre connexion...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-green-900 mb-2">
              Connexion réussie!
            </h1>
            <p className="text-green-700">
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-red-900 mb-2">
              Erreur de connexion
            </h1>
            <p className="text-red-700 mb-4">
              {message}
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  )
}
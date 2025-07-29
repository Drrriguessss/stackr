'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing auth callback...')
        
        // Vérifier d'abord les paramètres d'erreur dans l'URL
        const urlParams = new URLSearchParams(window.location.search)
        const errorParam = urlParams.get('error')
        const errorCode = urlParams.get('error_code')
        const errorDescription = urlParams.get('error_description')
        
        if (errorParam) {
          console.error('❌ OAuth error:', { errorParam, errorCode, errorDescription })
          setError(`Erreur d'authentification: ${errorDescription || errorParam}`)
          setIsProcessing(false)
          
          // Rediriger après 3 secondes
          setTimeout(() => {
            router.push('/')
          }, 3000)
          return
        }

        // Essayer de récupérer la session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          throw sessionError
        }

        if (session) {
          console.log('✅ Session found:', session.user)
          
          // Si pas d'email (cas Facebook sans email scope), gérer différemment
          if (!session.user.email) {
            console.log('⚠️ No email in session, Facebook user without email scope')
            // On pourrait rediriger vers une page pour demander l'email
            // Pour l'instant, on continue quand même
          }
          
          router.push('/')
        } else {
          // Vérifier les tokens dans le hash
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken) {
            console.log('✅ Tokens found in URL, setting session...')
            
            const { data: { session: newSession }, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            
            if (setSessionError) {
              throw setSessionError
            }
            
            if (newSession) {
              console.log('✅ Session set successfully')
              router.push('/')
            }
          } else {
            console.error('❌ No session or tokens found')
            setError('Aucune session trouvée')
            setIsProcessing(false)
            
            setTimeout(() => {
              router.push('/')
            }, 3000)
          }
        }
      } catch (error) {
        console.error('❌ Callback error:', error)
        setError('Erreur lors de la connexion')
        setIsProcessing(false)
        
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Connexion en cours...</p>
          </>
        ) : error ? (
          <>
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 text-sm mt-2">Redirection en cours...</p>
          </>
        ) : null}
      </div>
    </div>
  )
}
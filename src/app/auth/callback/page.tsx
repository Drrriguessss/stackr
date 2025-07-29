'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Récupérer la session depuis l'URL
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/?error=auth_failed')
          return
        }

        if (session) {
          console.log('✅ Authentication successful!')
          // Rediriger vers la page principale après connexion réussie
          router.push('/')
        } else {
          // Si pas de session, essayer de récupérer depuis l'URL
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          
          if (accessToken) {
            console.log('✅ Token found, authentication successful!')
            router.push('/')
          } else {
            console.error('No session or token found')
            router.push('/?error=no_session')
          }
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/?error=callback_error')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Connexion en cours...</p>
      </div>
    </div>
  )
}
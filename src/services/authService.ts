// src/services/authService.ts - Service d'authentification avec Supabase

import { supabase } from '@/lib/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  provider?: string
}

export class AuthService {
  
  /**
   * 🔑 Obtenir l'utilisateur connecté actuel
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        provider: user.app_metadata?.provider
      }
    } catch (error) {
      console.error('❌ [Auth] Error getting current user:', error)
      return null
    }
  }

  /**
   * 📧 Connexion avec email/mot de passe
   */
  static async signInWithEmail(email: string, password: string): Promise<{ user: AuthUser | null, error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url,
          provider: 'email'
        }
        return { user: authUser, error: null }
      }

      return { user: null, error: 'Unknown error occurred' }
    } catch (error) {
      return { user: null, error: (error as Error).message }
    }
  }

  /**
   * 📝 Inscription avec email/mot de passe
   */
  static async signUpWithEmail(email: string, password: string, fullName?: string): Promise<{ user: AuthUser | null, error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0]
          }
        }
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: fullName || data.user.email?.split('@')[0],
          avatar: data.user.user_metadata?.avatar_url,
          provider: 'email'
        }
        return { user: authUser, error: null }
      }

      return { user: null, error: 'Registration failed' }
    } catch (error) {
      return { user: null, error: (error as Error).message }
    }
  }

  /**
   * 🔗 Connexion avec Google
   */
  static async signInWithGoogle(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }

  /**
   * 🍎 Connexion avec Apple
   */
  static async signInWithApple(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }

  /**
   * 📘 Connexion avec Facebook
   */
  static async signInWithFacebook(): Promise<{ error: string | null }> {
    try {
      console.log('🔍 Facebook OAuth - Redirect URL:', `${window.location.origin}/auth/callback`)
      console.log('📍 Current origin:', window.location.origin)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false
        }
      })

      if (error) {
        console.error('❌ Facebook OAuth Error:', error)
        return { error: error.message }
      }

      if (data?.url) {
        console.log('🔗 Facebook OAuth URL:', data.url)
        // Analyser l'URL pour débugger
        const url = new URL(data.url)
        console.log('📊 OAuth params:', Object.fromEntries(url.searchParams))
        
        // Rediriger manuellement
        window.location.href = data.url
      }

      console.log('✅ Facebook OAuth initiated successfully')
      return { error: null }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }

  /**
   * 🚪 Déconnexion
   */
  static async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { error: error.message }
      }

      // Nettoyer le localStorage (toutes les clés liées à l'utilisateur)
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('stackr_library_')) {
          localStorage.removeItem(key)
        }
      })
      // Garder aussi pour compatibilité
      localStorage.removeItem('stackr_library')
      
      return { error: null }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }

  /**
   * 🔄 Écouter les changements d'authentification
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [Auth] Auth state changed:', event)
      
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 
                session.user.user_metadata?.name || 
                session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar_url || 
                  session.user.user_metadata?.picture,
          provider: session.user.app_metadata?.provider
        }
        callback(authUser)
      } else {
        callback(null)
      }
    })
  }

  /**
   * 🔍 Vérifier si l'utilisateur est connecté
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session?.user
    } catch {
      return false
    }
  }

  /**
   * 📧 Réinitialisation du mot de passe
   */
  static async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }
}

export default AuthService
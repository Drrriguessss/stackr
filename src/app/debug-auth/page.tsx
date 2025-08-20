'use client'

import { useState } from 'react'
import { AuthService } from '@/services/authService'

export default function DebugAuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkCurrentUser = async () => {
    setIsLoading(true)
    try {
      const user = await AuthService.getCurrentUser()
      setCurrentUser(user)
      setMessage(user ? `✅ Connecté: ${user.email}` : '❌ Non connecté')
    } catch (error) {
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage('❌ Email et mot de passe requis')
      return
    }
    
    setIsLoading(true)
    try {
      const result = await AuthService.signUpWithEmail(email, password, fullName)
      if (result.needsEmailConfirmation) {
        setMessage('📧 Vérifiez votre email pour confirmer votre compte')
      } else if (result.error) {
        setMessage(`❌ Erreur: ${result.error}`)
      } else {
        setMessage('✅ Compte créé et connecté!')
        await checkCurrentUser()
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage('❌ Email et mot de passe requis')
      return
    }
    
    setIsLoading(true)
    try {
      const result = await AuthService.signInWithEmail(email, password)
      if (result.error) {
        setMessage(`❌ Erreur: ${result.error}`)
      } else {
        setMessage('✅ Connecté!')
        await checkCurrentUser()
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await AuthService.signOut()
      setMessage('✅ Déconnecté!')
      setCurrentUser(null)
    } catch (error) {
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await AuthService.signInWithGoogle()
      if (result.error) {
        setMessage(`❌ Erreur Google: ${result.error}`)
      } else {
        setMessage('🔄 Redirection vers Google...')
      }
    } catch (error) {
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">🔐 Debug Auth - localhost</h1>
        
        {/* État actuel */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="font-semibold mb-2">État de connexion:</h2>
          <button
            onClick={checkCurrentUser}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded mb-2 w-full"
          >
            {isLoading ? '⏳ Vérification...' : '🔍 Vérifier utilisateur'}
          </button>
          {currentUser && (
            <div className="text-green-400 text-sm">
              <p>✅ Connecté: {currentUser.email}</p>
              <p>ID: {currentUser.id}</p>
              <p>Provider: {currentUser.provider}</p>
            </div>
          )}
        </div>

        {/* Formulaire de connexion */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nom complet (optionnel)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
          />
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
          />
          
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSignUp}
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              📝 S'inscrire
            </button>
            
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              🔑 Se connecter
            </button>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="bg-red-600 text-white px-4 py-2 rounded w-full"
          >
            🔗 Google OAuth
          </button>

          {currentUser && (
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="bg-red-800 text-white px-4 py-2 rounded w-full"
            >
              🚪 Se déconnecter
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className="bg-gray-900 p-4 rounded text-sm">
            {message}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-900 p-4 rounded text-xs text-gray-400">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Créez un compte test ou connectez-vous avec vos identifiants</li>
            <li>Une fois connecté, retournez à <a href="/" className="text-blue-400 underline">la page principale</a></li>
            <li>Testez le statut "watched" sur un film pour vérifier le fix</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
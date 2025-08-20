'use client'

import { useState, useEffect } from 'react'
import { AuthService } from '@/services/authService'
import { LibraryService } from '@/services/libraryService'

export default function DebugLibraryPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [library, setLibrary] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const checkUserAndLibrary = async () => {
    setIsLoading(true)
    try {
      // 1. Vérifier l'utilisateur actuel
      const user = await AuthService.getCurrentUser()
      setCurrentUser(user)
      
      // 2. Vérifier la bibliothèque
      const lib = await LibraryService.getLibrary()
      setLibrary(lib)
      
      setMessage(`
✅ User: ${user ? user.email : 'Non connecté'}
📚 Library: ${lib.length} items
      `)
      
      console.log('🔍 Debug Library - User:', user)
      console.log('🔍 Debug Library - Library:', lib)
    } catch (error) {
      console.error('Debug Library Error:', error)
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  const testAddToLibrary = async () => {
    if (!currentUser) {
      setMessage('❌ Vous devez être connecté pour tester')
      return
    }

    setIsLoading(true)
    try {
      // Créer un film de test
      const testMovie = {
        id: 'tt0111161', // The Shawshank Redemption
        title: 'The Shawshank Redemption',
        category: 'movies',
        image: 'https://example.com/poster.jpg',
        year: 1994,
        rating: 9.3,
        director: 'Frank Darabont',
        genre: 'Drama',
        runtime: '142 min',
        actors: 'Tim Robbins, Morgan Freeman',
        plot: 'Test movie for debugging',
        language: 'English',
        country: 'USA',
        awards: 'Test',
        type: 'movie'
      }

      console.log('🎬 [DEBUG] Adding test movie to library...')
      const success = await LibraryService.addToLibrary(testMovie, 'watched')
      
      if (success) {
        console.log('🎬 [DEBUG] Movie added successfully!')
        await checkUserAndLibrary() // Refresh
        setMessage(`✅ Film de test ajouté avec statut 'watched'`)
      } else {
        setMessage(`❌ Échec de l'ajout du film`)
      }
    } catch (error) {
      console.error('Test Add Error:', error)
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  const testUpdateStatus = async () => {
    if (!currentUser || library.length === 0) {
      setMessage('❌ Vous devez être connecté et avoir au moins un film')
      return
    }

    setIsLoading(true)
    try {
      const firstMovie = library[0]
      console.log('🎬 [DEBUG] Updating movie status:', firstMovie.id)
      
      const success = await LibraryService.updateLibraryItem(firstMovie.id, {
        status: 'want-to-watch'
      })
      
      if (success) {
        console.log('🎬 [DEBUG] Movie status updated successfully!')
        await checkUserAndLibrary() // Refresh
        setMessage(`✅ Statut du film mis à jour vers 'want-to-watch'`)
      } else {
        setMessage(`❌ Échec de la mise à jour du statut`)
      }
    } catch (error) {
      console.error('Test Update Error:', error)
      setMessage(`❌ Erreur: ${error}`)
    }
    setIsLoading(false)
  }

  const checkSupabaseConnection = async () => {
    setIsLoading(true)
    try {
      const isConnected = await LibraryService.testSupabaseConnection()
      setMessage(`🔗 Supabase: ${isConnected ? '✅ Connecté' : '❌ Déconnecté'}`)
    } catch (error) {
      setMessage(`❌ Erreur Supabase: ${error}`)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    checkUserAndLibrary()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">🔍 Debug Library - Authenticated Users</h1>
        
        {/* État actuel */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="font-semibold mb-4">État actuel:</h2>
          
          <button
            onClick={checkUserAndLibrary}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded mb-4 w-full"
          >
            {isLoading ? '⏳ Vérification...' : '🔍 Vérifier User & Library'}
          </button>

          {currentUser && (
            <div className="text-green-400 text-sm mb-4">
              <p>✅ Utilisateur: {currentUser.email}</p>
              <p>🆔 ID: {currentUser.id}</p>
              <p>🔗 Provider: {currentUser.provider}</p>
            </div>
          )}

          <div className="text-blue-400 text-sm">
            <p>📚 Bibliothèque: {library.length} items</p>
            {library.slice(0, 3).map((item, index) => (
              <div key={index} className="ml-4 text-xs">
                • {item.title} - {item.status} ({item.category})
              </div>
            ))}
          </div>
        </div>

        {/* Tests */}
        <div className="space-y-4">
          <button
            onClick={checkSupabaseConnection}
            disabled={isLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded w-full"
          >
            🔗 Test Connexion Supabase
          </button>

          <button
            onClick={testAddToLibrary}
            disabled={isLoading || !currentUser}
            className="bg-green-600 text-white px-4 py-2 rounded w-full"
          >
            ➕ Test Ajouter Film (Shawshank)
          </button>

          <button
            onClick={testUpdateStatus}
            disabled={isLoading || !currentUser || library.length === 0}
            className="bg-yellow-600 text-white px-4 py-2 rounded w-full"
          >
            🔄 Test Modifier Statut (Premier film)
          </button>
        </div>

        {/* Message de résultat */}
        {message && (
          <div className="bg-gray-900 p-4 rounded text-sm whitespace-pre-line">
            {message}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-900 p-4 rounded text-xs text-gray-400">
          <h3 className="font-semibold mb-2">Instructions de test:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Assurez-vous d'être connecté (utilisez <a href="/debug-auth" className="text-blue-400">/debug-auth</a>)</li>
            <li>Testez la connexion Supabase</li>
            <li>Ajoutez un film de test</li>
            <li>Modifiez son statut</li>
            <li>Vérifiez que les changements persistent</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { AuthService } from '@/services/authService'
import LibraryService from '@/services/libraryService'
import { Trash2, AlertTriangle } from 'lucide-react'

export default function DebugLibraryPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [library, setLibrary] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

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

  const deleteItem = async (itemId: string, title: string) => {
    if (!currentUser) {
      setMessage('❌ Vous devez être connecté pour supprimer')
      return
    }

    const confirmed = confirm(`Supprimer "${title}" de votre bibliothèque ?`)
    if (!confirmed) return

    setDeletingItems(prev => new Set(prev).add(itemId))

    try {
      await LibraryService.deleteItem(itemId)
      setLibrary(prev => prev.filter(item => item.id !== itemId))
      setMessage(`✅ Élément supprimé: ${title} (ID: ${itemId})`)
      console.log(`✅ Deleted item: ${title} (ID: ${itemId})`)
    } catch (error) {
      console.error('Error deleting item:', error)
      setMessage(`❌ Erreur lors de la suppression: ${error}`)
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  // Find problematic movies (like Red, White & Royal Blue 2)
  const problematicMovies = library.filter(item => 
    item.category === 'movies' && 
    (item.title.includes('Red, White & Royal Blue 2') || item.id === '1288115')
  )

  // Find problematic music tracks (like Taylor Swift - Track 1440913923)
  const problematicMusic = library.filter(item => 
    item.category === 'music' && 
    (item.title.includes('Track 1440913923') || 
     item.title.includes('Taylor Swift - Track') ||
     item.id === '1440913923' ||
     item.id === 'track-1440913923')
  )

  // Combine all problematic items
  const allProblematicItems = [...problematicMovies, ...problematicMusic]

  useEffect(() => {
    checkUserAndLibrary()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">🔍 Debug Library - Authenticated Users</h1>
        
        {/* Problematic Items Alert */}
        {allProblematicItems.length > 0 && (
          <div className="bg-red-900 border border-red-700 p-4 rounded">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-red-400 mt-1 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-red-200 mb-2">⚠️ Éléments Problématiques Détectés</h2>
                <p className="text-red-300 text-sm mb-4">
                  Ces éléments ont des problèmes (ne peuvent pas se charger) et doivent être supprimés:
                </p>
                <div className="space-y-3">
                  {allProblematicItems.map(item => (
                    <div key={item.id} className="bg-red-800 rounded p-3 border border-red-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.category === 'movies' ? 'bg-red-600 text-red-100' :
                              item.category === 'music' ? 'bg-purple-600 text-purple-100' :
                              'bg-gray-600 text-gray-100'
                            }`}>
                              {item.category === 'movies' ? '🎬' : item.category === 'music' ? '🎵' : '📁'} {item.category}
                            </span>
                          </div>
                          <h3 className="font-medium text-white">{item.title}</h3>
                          <p className="text-red-200 text-sm">
                            ID: {item.id} | Status: {item.status} | Ajouté: {new Date(item.addedAt).toLocaleDateString()}
                          </p>
                          {item.category === 'music' && (
                            <p className="text-red-300 text-xs mt-1">
                              🎵 Track problématique: ID invalide ou données corrompues
                            </p>
                          )}
                          {item.category === 'movies' && (
                            <p className="text-red-300 text-xs mt-1">
                              🎬 Film problématique: IMDB ID invalide pour film non sorti
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteItem(item.id, item.title)}
                          disabled={deletingItems.has(item.id)}
                          className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deletingItems.has(item.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Suppression...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} />
                              <span>Supprimer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
            {library.slice(0, 5).map((item, index) => (
              <div key={index} className="ml-4 text-xs flex items-center justify-between group">
                <span>• {item.title} - {item.status} ({item.category})</span>
                <button
                  onClick={() => deleteItem(item.id, item.title)}
                  disabled={deletingItems.has(item.id)}
                  className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title={`Supprimer ${item.title}`}
                >
                  {deletingItems.has(item.id) ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-red-400"></div>
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            ))}
            {library.length > 5 && (
              <div className="ml-4 text-xs text-gray-500">... et {library.length - 5} autres items</div>
            )}
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
            <li>Supprimez les films problématiques (en rouge) si ils apparaissent</li>
            <li>Ajoutez un film de test</li>
            <li>Modifiez son statut</li>
            <li>Vérifiez que les changements persistent</li>
          </ol>
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-red-900 rounded border border-red-700">
              <p className="text-red-200 font-semibold">🚨 Éléments Problématiques Connus:</p>
              <div className="space-y-2 mt-2">
                <p className="text-red-300 text-xs">
                  🎬 <strong>"Red, White & Royal Blue 2"</strong> (ID: 1288115) - IMDB ID invalide pour un film non sorti
                </p>
                <p className="text-red-300 text-xs">
                  🎵 <strong>"Taylor Swift - Track 1440913923"</strong> - ID de track invalide ou données corrompues
                </p>
              </div>
              <p className="text-red-200 text-xs mt-2">
                Utilisez les boutons "Supprimer" ci-dessus pour les retirer de votre bibliothèque.
              </p>
            </div>
          </div>
          <div className="mt-2 text-center">
            <a href="/" className="text-blue-400 hover:text-blue-300">← Retour à l'application principale</a>
          </div>
        </div>
      </div>
    </div>
  )
}
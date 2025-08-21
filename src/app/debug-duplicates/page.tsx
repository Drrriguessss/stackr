'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AuthService from '@/services/authService'

interface LibraryItem {
  id: string
  user_id: string
  title: string
  status: string
  added_at: string
  category: string
}

export default function DebugDuplicatesPage() {
  const [allItems, setAllItems] = useState<LibraryItem[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCleaningUp, setIsCleaningUp] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Obtenir l'utilisateur actuel
      const user = await AuthService.getCurrentUser()
      setCurrentUser(user)
      
      // Récupérer tous les éléments de la bibliothèque
      const { data: items, error } = await supabase
        .from('library_items')
        .select('*')
        .order('added_at', { ascending: false })
      
      if (error) {
        console.error('❌ Erreur Supabase:', error)
        return
      }
      
      setAllItems(items || [])
      
      // Analyser les doublons
      const titleGroups: { [key: string]: LibraryItem[] } = {}
      
      items?.forEach(item => {
        const key = `${item.user_id}-${item.title.toLowerCase().trim()}`
        if (!titleGroups[key]) {
          titleGroups[key] = []
        }
        titleGroups[key].push(item)
      })
      
      const foundDuplicates = Object.entries(titleGroups)
        .filter(([_, items]) => items.length > 1)
        .map(([key, items]) => ({
          key,
          title: items[0].title,
          items: items.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())
        }))
      
      setDuplicates(foundDuplicates)
      
    } catch (error) {
      console.error('❌ Erreur générale:', error)
    } finally {
      setLoading(false)
    }
  }

  const cleanupDuplicates = async () => {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les doublons? Cela gardera seulement l\'élément le plus récent pour chaque titre.')) {
      return
    }
    
    setIsCleaningUp(true)
    
    try {
      for (const duplicate of duplicates) {
        const [toKeep, ...toDelete] = duplicate.items
        
        console.log(`Nettoyage de "${duplicate.title}":`)
        console.log(`  Garder: ${toKeep.id} (${toKeep.status}, ${toKeep.added_at})`)
        
        for (const item of toDelete) {
          console.log(`  Supprimer: ${item.id} (${item.status}, ${item.added_at})`)
          
          const { error } = await supabase
            .from('library_items')
            .delete()
            .eq('id', item.id)
            .eq('user_id', item.user_id)
          
          if (error) {
            console.error(`    ❌ Erreur suppression: ${error.message}`)
          } else {
            console.log(`    ✅ Supprimé`)
          }
        }
      }
      
      // Recharger les données
      await loadData()
      
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error)
    } finally {
      setIsCleaningUp(false)
    }
  }

  const getUserItems = (userId: string) => {
    return allItems.filter(item => item.user_id === userId)
  }

  const getUniqueUsers = () => {
    const userIds = [...new Set(allItems.map(item => item.user_id))]
    return userIds
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">🔍 Debug Doublons - Chargement...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Debug Doublons dans la Bibliothèque</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">📚 Total Éléments</h2>
            <p className="text-3xl font-bold text-blue-600">{allItems.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">👥 Utilisateurs</h2>
            <p className="text-3xl font-bold text-green-600">{getUniqueUsers().length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">🔄 Doublons</h2>
            <p className="text-3xl font-bold text-red-600">{duplicates.length}</p>
          </div>
        </div>
        
        {currentUser && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold">👤 Utilisateur actuel: {currentUser.email}</h3>
            <p>ID: {currentUser.id}</p>
            <p>Éléments: {getUserItems(currentUser.id).length}</p>
          </div>
        )}
        
        {duplicates.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">⚠️ Doublons Trouvés</h2>
              <button
                onClick={cleanupDuplicates}
                disabled={isCleaningUp}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isCleaningUp ? 'Nettoyage...' : 'Nettoyer les Doublons'}
              </button>
            </div>
            
            <div className="space-y-4">
              {duplicates.map((duplicate, index) => (
                <div key={duplicate.key} className="border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">🎬 {duplicate.title}</h3>
                  <div className="space-y-2">
                    {duplicate.items.map((item: LibraryItem, itemIndex: number) => (
                      <div 
                        key={item.id} 
                        className={`flex justify-between items-center p-3 rounded ${
                          itemIndex === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        } border`}
                      >
                        <div>
                          <span className={`font-medium ${itemIndex === 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {itemIndex === 0 ? '✅ À GARDER' : '❌ À SUPPRIMER'}
                          </span>
                          <p className="text-sm text-gray-600">
                            ID: {item.id} | Status: {item.status} | Ajouté: {new Date(item.added_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📊 Statistiques par Utilisateur</h2>
          <div className="space-y-4">
            {getUniqueUsers().map(userId => {
              const userItems = getUserItems(userId)
              const statusCounts = userItems.reduce((acc: any, item) => {
                acc[item.status] = (acc[item.status] || 0) + 1
                return acc
              }, {})
              
              return (
                <div key={userId} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">
                    👤 {userId} ({userItems.length} éléments)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <span 
                        key={status}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                      >
                        {status}: {count as number}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
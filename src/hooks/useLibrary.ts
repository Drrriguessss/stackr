// src/hooks/useLibrary.ts - HOOK PERSONNALISÉ POUR LA GESTION DE LA BIBLIOTHÈQUE
import { useState, useEffect, useCallback } from 'react'
import { syncService } from '@/services/syncService'
import type { LibraryItem, MediaStatus } from '@/types'

export function useLibrary() {
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ CHARGER LA BIBLIOTHÈQUE INITIALE
  useEffect(() => {
    const loadInitialLibrary = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('🔄 [useLibrary] Loading initial library...')
        
        const initialLibrary = await syncService.loadLibrary()
        setLibrary(initialLibrary)
        console.log('✅ [useLibrary] Initial library loaded:', initialLibrary.length, 'items')
        
        // Démarrer la synchronisation périodique
        syncService.startPeriodicSync()
        
      } catch (err) {
        console.error('❌ [useLibrary] Failed to load initial library:', err)
        setError(err instanceof Error ? err.message : 'Failed to load library')
      } finally {
        setLoading(false)
      }
    }

    loadInitialLibrary()
  }, [])

  // ✅ S'ABONNER AUX CHANGEMENTS DE SYNCHRONISATION
  useEffect(() => {
    console.log('📡 [useLibrary] Subscribing to sync service...')
    
    const unsubscribe = syncService.subscribe((updatedLibrary) => {
      console.log('🔄 [useLibrary] Received library update:', updatedLibrary.length, 'items')
      setLibrary(updatedLibrary)
    })

    return unsubscribe
  }, [])

  // ✅ AJOUTER UN ITEM À LA BIBLIOTHÈQUE
  const addToLibrary = useCallback(async (item: any, status: MediaStatus): Promise<boolean> => {
    try {
      console.log('➕ [useLibrary] Adding item:', item.title)
      const success = await syncService.addItem(item, status)
      
      if (!success) {
        setError('Failed to add item to library')
      }
      
      return success
    } catch (err) {
      console.error('❌ [useLibrary] Add item error:', err)
      setError(err instanceof Error ? err.message : 'Failed to add item')
      return false
    }
  }, [])

  // ✅ MODIFIER UN ITEM DE LA BIBLIOTHÈQUE
  const updateItem = useCallback(async (itemId: string, updates: Partial<LibraryItem>): Promise<boolean> => {
    try {
      console.log('📝 [useLibrary] Updating item:', itemId)
      const success = await syncService.updateItem(itemId, updates)
      
      if (!success) {
        setError('Failed to update item in library')
      }
      
      return success
    } catch (err) {
      console.error('❌ [useLibrary] Update item error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update item')
      return false
    }
  }, [])

  // ✅ SUPPRIMER UN ITEM DE LA BIBLIOTHÈQUE
  const deleteItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [useLibrary] Deleting item:', itemId)
      const success = await syncService.deleteItem(itemId)
      
      if (!success) {
        setError('Failed to delete item from library')
      }
      
      return success
    } catch (err) {
      console.error('❌ [useLibrary] Delete item error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete item')
      return false
    }
  }, [])

  // ✅ FORCER UNE SYNCHRONISATION MANUELLE
  const forceSync = useCallback(async () => {
    try {
      console.log('🔄 [useLibrary] Forcing manual sync...')
      setLoading(true)
      const freshLibrary = await syncService.loadLibrary()
      setLibrary(freshLibrary)
      console.log('✅ [useLibrary] Manual sync completed')
    } catch (err) {
      console.error('❌ [useLibrary] Manual sync failed:', err)
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // ✅ EFFACER LES ERREURS
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    library,
    loading,
    error,
    addToLibrary,
    updateItem,
    deleteItem,
    forceSync,
    clearError
  }
}
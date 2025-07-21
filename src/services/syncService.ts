// src/services/syncService.ts - NOUVEAU SERVICE DE SYNCHRONISATION TEMPS RÉEL
import { supabase } from '@/lib/supabase'
import type { LibraryItem, MediaStatus } from '@/types'

// Types pour la synchronisation
interface SyncEvent {
  type: 'library_changed'
  action: 'added' | 'updated' | 'deleted'
  item: LibraryItem
  timestamp: number
  deviceId: string
}

class SyncService {
  private static instance: SyncService
  private deviceId: string
  private listeners: ((library: LibraryItem[]) => void)[] = []
  private lastSyncTime: number = 0
  private syncInProgress: boolean = false

  constructor() {
    // Générer un ID unique pour cet appareil/session
    this.deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('🔧 [SyncService] Initialized with deviceId:', this.deviceId)
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  // ✅ S'ABONNER AUX CHANGEMENTS DE BIBLIOTHÈQUE
  subscribe(callback: (library: LibraryItem[]) => void): () => void {
    this.listeners.push(callback)
    console.log('📡 [SyncService] New subscriber added, total:', this.listeners.length)
    
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
      console.log('📡 [SyncService] Subscriber removed, total:', this.listeners.length)
    }
  }

  // ✅ NOTIFIER TOUS LES ABONNÉS
  private notifyListeners(library: LibraryItem[]) {
    console.log('📢 [SyncService] Notifying', this.listeners.length, 'listeners with', library.length, 'items')
    this.listeners.forEach(callback => {
      try {
        callback(library)
      } catch (error) {
        console.error('❌ [SyncService] Error in listener callback:', error)
      }
    })
  }

  // ✅ CHARGER LA BIBLIOTHÈQUE COMPLÈTE
  async loadLibrary(): Promise<LibraryItem[]> {
    try {
      console.log('📚 [SyncService] Loading complete library from Supabase...')
      
      const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .order('added_at', { ascending: false })

      if (error) {
        console.error('❌ [SyncService] Supabase error:', error)
        throw error
      }

      if (!data) {
        console.log('📚 [SyncService] No data returned from Supabase')
        return []
      }

      // Convertir les données Supabase
      const library: LibraryItem[] = data.map(item => ({
        id: item.id,
        title: item.title,
        category: item.category,
        status: item.status,
        addedAt: item.added_at,
        year: item.year,
        rating: item.rating,
        image: item.image,
        author: item.author,
        artist: item.artist,
        director: item.director,
        developer: item.developer,
        genre: item.genre,
        userRating: item.user_rating,
        progress: item.progress,
        notes: item.notes,
        dateStarted: item.date_started,
        dateCompleted: item.date_completed,
        developers: item.developers ? JSON.parse(item.developers) : [],
        publishers: item.publishers ? JSON.parse(item.publishers) : [],
        genres: item.genres ? JSON.parse(item.genres) : [],
        background_image: item.background_image,
        released: item.released,
        type: item.type,
        isMovie: item.is_movie,
        isSeries: item.is_series,
        totalSeasons: item.total_seasons,
        displayTitle: item.display_title,
        overview: item.overview,
        runtime: item.runtime,
        actors: item.actors,
        language: item.language,
        country: item.country,
        awards: item.awards,
        additionalInfo: item.additional_info ? JSON.parse(item.additional_info) : undefined
      }))

      console.log('✅ [SyncService] Loaded', library.length, 'items from Supabase')
      this.lastSyncTime = Date.now()
      
      // Sauvegarder dans localStorage comme backup
      this.saveToLocalStorage(library)
      
      return library

    } catch (error) {
      console.error('❌ [SyncService] Failed to load from Supabase, falling back to localStorage:', error)
      return this.loadFromLocalStorage()
    }
  }

  // ✅ AJOUTER UN ITEM
  async addItem(item: any, status: MediaStatus): Promise<boolean> {
    try {
      if (this.syncInProgress) {
        console.log('⏳ [SyncService] Sync in progress, queuing add operation...')
        await this.waitForSync()
      }

      this.syncInProgress = true
      console.log('➕ [SyncService] Adding item:', item.title)

      const newItem: LibraryItem = {
        id: item.id,
        title: item.title,
        category: item.category,
        status,
        addedAt: new Date().toISOString(),
        year: item.year || new Date().getFullYear(),
        rating: item.rating || 0,
        image: item.image || item.background_image,
        author: item.author,
        artist: item.artist,
        director: item.director,
        developer: item.developer,
        genre: item.genre,
        developers: item.developers || [],
        publishers: item.publishers || [],
        genres: item.genres || [],
        background_image: item.background_image,
        released: item.released,
        type: item.type,
        isMovie: item.isMovie,
        isSeries: item.isSeries,
        totalSeasons: item.totalSeasons,
        displayTitle: item.displayTitle,
        overview: item.overview,
        runtime: item.runtime,
        actors: item.actors,
        language: item.language,
        country: item.country,
        awards: item.awards
      }

      // Ajouter à Supabase
      const { error } = await supabase
        .from('library_items')
        .upsert({
          id: newItem.id,
          title: newItem.title,
          category: newItem.category,
          status: newItem.status,
          added_at: newItem.addedAt,
          year: newItem.year,
          rating: newItem.rating,
          image: newItem.image,
          author: newItem.author,
          artist: newItem.artist,
          director: newItem.director,
          developer: newItem.developer,
          genre: newItem.genre,
          developers: JSON.stringify(newItem.developers),
          publishers: JSON.stringify(newItem.publishers),
          genres: JSON.stringify(newItem.genres),
          background_image: newItem.background_image,
          released: newItem.released,
          type: newItem.type,
          is_movie: newItem.isMovie,
          is_series: newItem.isSeries,
          total_seasons: newItem.totalSeasons,
          display_title: newItem.displayTitle,
          overview: newItem.overview,
          runtime: newItem.runtime,
          actors: newItem.actors,
          language: newItem.language,
          country: newItem.country,
          awards: newItem.awards
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('❌ [SyncService] Failed to add item to Supabase:', error)
        throw error
      }

      console.log('✅ [SyncService] Item added to Supabase successfully')

      // Recharger et synchroniser
      await this.syncAndNotify()
      return true

    } catch (error) {
      console.error('❌ [SyncService] Add item failed:', error)
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  // ✅ MODIFIER UN ITEM
  async updateItem(itemId: string, updates: Partial<LibraryItem>): Promise<boolean> {
    try {
      if (this.syncInProgress) {
        console.log('⏳ [SyncService] Sync in progress, queuing update operation...')
        await this.waitForSync()
      }

      this.syncInProgress = true
      console.log('📝 [SyncService] Updating item:', itemId)

      const updateData: any = {}
      
      if (updates.status) updateData.status = updates.status
      if (updates.userRating !== undefined) updateData.user_rating = updates.userRating
      if (updates.progress !== undefined) updateData.progress = updates.progress
      if (updates.notes !== undefined) updateData.notes = updates.notes
      if (updates.dateStarted) updateData.date_started = updates.dateStarted
      if (updates.dateCompleted) updateData.date_completed = updates.dateCompleted
      if (updates.developer) updateData.developer = updates.developer
      if (updates.director) updateData.director = updates.director

      // Auto-set dates based on status
      if (updates.status === 'currently-playing' && !updateData.date_started) {
        updateData.date_started = new Date().toISOString()
      }
      if (updates.status === 'completed' && !updateData.date_completed) {
        updateData.date_completed = new Date().toISOString()
      }

      const { error } = await supabase
        .from('library_items')
        .update(updateData)
        .eq('id', itemId)

      if (error) {
        console.error('❌ [SyncService] Failed to update item in Supabase:', error)
        throw error
      }

      console.log('✅ [SyncService] Item updated in Supabase successfully')

      // Recharger et synchroniser
      await this.syncAndNotify()
      return true

    } catch (error) {
      console.error('❌ [SyncService] Update item failed:', error)
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  // ✅ SUPPRIMER UN ITEM
  async deleteItem(itemId: string): Promise<boolean> {
    try {
      if (this.syncInProgress) {
        console.log('⏳ [SyncService] Sync in progress, queuing delete operation...')
        await this.waitForSync()
      }

      this.syncInProgress = true
      console.log('🗑️ [SyncService] Deleting item:', itemId)

      const { error } = await supabase
        .from('library_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('❌ [SyncService] Failed to delete item from Supabase:', error)
        throw error
      }

      console.log('✅ [SyncService] Item deleted from Supabase successfully')

      // Recharger et synchroniser
      await this.syncAndNotify()
      return true

    } catch (error) {
      console.error('❌ [SyncService] Delete item failed:', error)
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  // ✅ SYNCHRONISER ET NOTIFIER
  private async syncAndNotify() {
    try {
      const library = await this.loadLibrary()
      this.notifyListeners(library)
    } catch (error) {
      console.error('❌ [SyncService] Sync and notify failed:', error)
    }
  }

  // ✅ DÉMARRER LA SYNCHRONISATION PÉRIODIQUE
  startPeriodicSync() {
    console.log('🔄 [SyncService] Starting periodic sync every 15 seconds')
    
    setInterval(async () => {
      if (!this.syncInProgress) {
        try {
          const library = await this.loadLibrary()
          this.notifyListeners(library)
        } catch (error) {
          console.error('❌ [SyncService] Periodic sync failed:', error)
        }
      }
    }, 15000) // Sync toutes les 15 secondes

    // Sync quand la fenêtre redevient active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.syncInProgress) {
        console.log('👁️ [SyncService] Window became visible, syncing...')
        this.syncAndNotify()
      }
    })

    // Sync quand la fenêtre reçoit le focus
    window.addEventListener('focus', () => {
      if (!this.syncInProgress) {
        console.log('🎯 [SyncService] Window focused, syncing...')
        this.syncAndNotify()
      }
    })
  }

  // ✅ ATTENDRE LA FIN D'UNE SYNCHRONISATION
  private async waitForSync(): Promise<void> {
    let attempts = 0
    while (this.syncInProgress && attempts < 50) { // Max 5 secondes
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
  }

  // ✅ SAUVEGARDER DANS LOCALSTORAGE
  private saveToLocalStorage(library: LibraryItem[]) {
    try {
      localStorage.setItem('stackr_library', JSON.stringify(library))
      console.log('💾 [SyncService] Saved to localStorage:', library.length, 'items')
    } catch (error) {
      console.error('❌ [SyncService] Failed to save to localStorage:', error)
    }
  }

  // ✅ CHARGER DEPUIS LOCALSTORAGE
  private loadFromLocalStorage(): LibraryItem[] {
    try {
      const stored = localStorage.getItem('stackr_library')
      const library = stored ? JSON.parse(stored) : []
      console.log('📂 [SyncService] Loaded from localStorage:', library.length, 'items')
      return library
    } catch (error) {
      console.error('❌ [SyncService] Failed to load from localStorage:', error)
      return []
    }
  }
}

export const syncService = SyncService.getInstance()
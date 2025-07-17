// src/services/libraryService.ts
import { supabase } from '@/lib/supabase'
import type { LibraryItem, MediaStatus } from '@/types'

export class LibraryService {
  // Clé pour localStorage (fallback)
  private static STORAGE_KEY = 'stackr_library'

  // Récupérer la bibliothèque (localStorage en attendant l'auth)
  static async getLibrary(): Promise<LibraryItem[]> {
    try {
      // Pour l'instant on utilise localStorage
      // Une fois l'auth configurée, on utilisera Supabase
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const items = stored ? JSON.parse(stored) : []
      console.log('📚 Library loaded:', items.length, 'items')
      return items
    } catch (error) {
      console.error('❌ Error loading library:', error)
      return []
    }
  }

  // Ajouter à la bibliothèque
  static async addToLibrary(item: any, status: MediaStatus): Promise<boolean> {
    try {
      const library = await this.getLibrary()
      
      // Vérifier si l'item existe déjà
      const existingIndex = library.findIndex(libItem => libItem.id === item.id)
      
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
        genre: item.genre
      }

      if (existingIndex !== -1) {
        // Mettre à jour l'item existant
        library[existingIndex] = { ...library[existingIndex], ...newItem }
        console.log('📝 Updated item in library:', newItem.title)
      } else {
        // Ajouter le nouvel item
        library.unshift(newItem) // unshift pour ajouter en premier
        console.log('➕ Added new item to library:', newItem.title)
      }

      // Sauvegarder
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(library))
      console.log('💾 Library saved! Total items:', library.length)
      return true
    } catch (error) {
      console.error('❌ Error adding to library:', error)
      return false
    }
  }

  // Mettre à jour un item
  static async updateLibraryItem(itemId: string, updates: Partial<LibraryItem>): Promise<boolean> {
    try {
      const library = await this.getLibrary()
      const itemIndex = library.findIndex(item => item.id === itemId)
      
      if (itemIndex === -1) {
        console.warn('⚠️ Item not found for update:', itemId)
        return false
      }

      // Appliquer les mises à jour
      library[itemIndex] = { ...library[itemIndex], ...updates }
      
      // Auto-set dates based on status
      if (updates.status === 'currently-playing' && !library[itemIndex].dateStarted) {
        library[itemIndex].dateStarted = new Date().toISOString()
      }
      if (updates.status === 'completed' && !library[itemIndex].dateCompleted) {
        library[itemIndex].dateCompleted = new Date().toISOString()
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(library))
      console.log('📝 Updated library item:', library[itemIndex].title)
      return true
    } catch (error) {
      console.error('❌ Error updating library item:', error)
      return false
    }
  }

  // Supprimer un item
  static async removeFromLibrary(itemId: string): Promise<boolean> {
    try {
      const library = await this.getLibrary()
      const itemToRemove = library.find(item => item.id === itemId)
      
      if (!itemToRemove) {
        console.warn('⚠️ Item not found for deletion:', itemId)
        return false
      }

      const filteredLibrary = library.filter(item => item.id !== itemId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredLibrary))
      console.log('🗑️ Removed from library:', itemToRemove.title)
      return true
    } catch (error) {
      console.error('❌ Error removing from library:', error)
      return false
    }
  }

  // Statistiques de la bibliothèque
  static async getLibraryStats() {
    try {
      const library = await this.getLibrary()
      const stats = {
        total: library.length,
        byStatus: {} as Record<MediaStatus, number>,
        byCategory: {} as Record<string, number>
      }

      library.forEach(item => {
        // Stats par statut
        stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1
        // Stats par catégorie
        stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1
      })

      console.log('📊 Library stats:', stats)
      return stats
    } catch (error) {
      console.error('❌ Error getting library stats:', error)
      return { total: 0, byStatus: {} as any, byCategory: {} }
    }
  }

  // Test de connexion Supabase (pour le futur)
  static async testSupabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('library_items').select('*').limit(1)
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ Supabase connected but tables not created yet')
        return true
      }
      if (error) {
        console.error('❌ Supabase error:', error.message)
        return false
      }
      console.log('✅ Supabase fully operational!')
      return true
    } catch (error) {
      console.log('ℹ️ Supabase not configured yet, using localStorage')
      return false
    }
  }

  // Fonction pour migrer vers Supabase plus tard
  static async migrateToSupabase(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('ℹ️ No user authenticated for migration')
        return false
      }

      const localLibrary = await this.getLibrary()
      if (localLibrary.length === 0) {
        console.log('ℹ️ No local library to migrate')
        return true
      }

      // TODO: Implémenter la migration une fois l'auth configurée
      console.log('🔄 Migration will be implemented after auth setup')
      return true
    } catch (error) {
      console.error('❌ Migration error:', error)
      return false
    }
  }
}

export default LibraryService
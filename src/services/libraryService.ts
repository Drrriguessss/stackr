// src/services/libraryService.ts
import { supabase } from '@/lib/supabase'
import type { LibraryItem, MediaStatus } from '@/types'

export class LibraryService {
  // Clé pour localStorage (fallback)
  private static STORAGE_KEY = 'stackr_library'

  // Récupérer la bibliothèque (Supabase + fallback localStorage)
  static async getLibrary(): Promise<LibraryItem[]> {
    try {
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        return []
      }

      // Essayer Supabase d'abord
      try {
        const { data, error } = await supabase
          .from('library_items')
          .select('*')
          .order('added_at', { ascending: false })

        if (!error && data) {
          console.log('📚 Library loaded from Supabase:', data.length, 'items')
          
          // Convertir les données Supabase au format LibraryItem
          const convertedItems: LibraryItem[] = data.map(item => ({
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
            genre: item.genre,
            userRating: item.user_rating,
            progress: item.progress,
            notes: item.notes,
            dateStarted: item.date_started,
            dateCompleted: item.date_completed
          }))
          
          // Synchroniser avec localStorage comme backup
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(convertedItems))
          return convertedItems
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase unavailable, using localStorage:', supabaseError)
      }

      // Fallback vers localStorage
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const items = stored ? JSON.parse(stored) : []
      console.log('📚 Library loaded from localStorage:', items.length, 'items')
      return items

    } catch (error) {
      console.error('❌ Error loading library:', error)
      return []
    }
  }

  // Ajouter à la bibliothèque
  static async addToLibrary(item: any, status: MediaStatus): Promise<boolean> {
    try {
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        return false
      }

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

      // Essayer Supabase d'abord
      try {
        const { data, error } = await supabase
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
            genre: newItem.genre
          }, {
            onConflict: 'id'
          })
          .select()

        if (!error) {
          console.log('➕ Added to Supabase:', newItem.title)
          
          // Synchroniser localStorage
          const library = await this.getLibraryFromLocalStorage()
          const existingIndex = library.findIndex(libItem => libItem.id === newItem.id)
          
          if (existingIndex !== -1) {
            library[existingIndex] = newItem
          } else {
            library.unshift(newItem)
          }
          
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(library))
          return true
        } else {
          console.error('Supabase error:', error)
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase unavailable, using localStorage:', supabaseError)
      }

      // Fallback vers localStorage
      const library = await this.getLibraryFromLocalStorage()
      const existingIndex = library.findIndex(libItem => libItem.id === newItem.id)
      
      if (existingIndex !== -1) {
        library[existingIndex] = { ...library[existingIndex], ...newItem }
        console.log('📝 Updated item in localStorage:', newItem.title)
      } else {
        library.unshift(newItem)
        console.log('➕ Added new item to localStorage:', newItem.title)
      }

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
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        return false
      }

      // Essayer Supabase d'abord
      try {
        const updateData: any = {}
        
        // Mapper les champs LibraryItem vers les champs de la base
        if (updates.status) updateData.status = updates.status
        if (updates.userRating !== undefined) updateData.user_rating = updates.userRating
        if (updates.progress !== undefined) updateData.progress = updates.progress
        if (updates.notes !== undefined) updateData.notes = updates.notes
        if (updates.dateStarted) updateData.date_started = updates.dateStarted
        if (updates.dateCompleted) updateData.date_completed = updates.dateCompleted
        
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

        if (!error) {
          console.log('📝 Updated item in Supabase:', itemId)
        } else {
          console.error('Supabase update error:', error)
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase unavailable for update:', supabaseError)
      }

      // Mise à jour localStorage (toujours faire)
      const library = await this.getLibraryFromLocalStorage()
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
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        return false
      }

      // Essayer Supabase d'abord
      try {
        const { error } = await supabase
          .from('library_items')
          .delete()
          .eq('id', itemId)

        if (!error) {
          console.log('🗑️ Removed from Supabase:', itemId)
        } else {
          console.error('Supabase delete error:', error)
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase unavailable for deletion:', supabaseError)
      }

      // Suppression localStorage (toujours faire)
      const library = await this.getLibraryFromLocalStorage()
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

  // Méthode helper pour récupérer uniquement localStorage
  private static async getLibraryFromLocalStorage(): Promise<LibraryItem[]> {
    try {
      if (typeof window === 'undefined') return []
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error reading localStorage:', error)
      return []
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

  // Test de connexion Supabase
  static async testSupabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('library_items').select('count').limit(1)
      
      if (error && error.code === 'PGRST116') {
        console.log('ℹ️ Supabase connected but tables not created yet - run the SQL setup!')
        return false
      }
      if (error) {
        console.error('❌ Supabase error:', error.message)
        return false
      }
      
      console.log('✅ Supabase fully operational!')
      return true
    } catch (error) {
      console.log('ℹ️ Supabase connection failed, using localStorage fallback')
      return false
    }
  }

  // Migrer localStorage vers Supabase
  static async migrateToSupabase(): Promise<boolean> {
    try {
      // Vérifier la connexion Supabase
      const isConnected = await this.testSupabaseConnection()
      if (!isConnected) {
        console.log('ℹ️ Cannot migrate: Supabase not available')
        return false
      }

      // Récupérer les données localStorage
      const localData = localStorage.getItem(this.STORAGE_KEY)
      if (!localData) {
        console.log('ℹ️ No local data to migrate')
        return true
      }

      const localLibrary: LibraryItem[] = JSON.parse(localData)
      if (localLibrary.length === 0) {
        console.log('ℹ️ No local library to migrate')
        return true
      }

      console.log('🔄 Starting migration of', localLibrary.length, 'items...')

      // Migrer chaque item
      let migrated = 0
      for (const item of localLibrary) {
        try {
          const { error } = await supabase
            .from('library_items')
            .upsert({
              id: item.id,
              title: item.title,
              category: item.category,
              status: item.status,
              added_at: item.addedAt,
              year: item.year,
              rating: item.rating,
              image: item.image,
              author: item.author,
              artist: item.artist,
              director: item.director,
              genre: item.genre,
              user_rating: item.userRating,
              progress: item.progress,
              notes: item.notes,
              date_started: item.dateStarted,
              date_completed: item.dateCompleted
            }, {
              onConflict: 'id'
            })
          
          if (!error) {
            migrated++
          } else {
            console.error('Error migrating item:', item.title, error)
          }
        } catch (itemError) {
          console.error('Error migrating item:', item.title, itemError)
        }
      }

      console.log(`✅ Migration completed! ${migrated}/${localLibrary.length} items migrated`)
      return true
    } catch (error) {
      console.error('❌ Migration error:', error)
      return false
    }
  }
}

// Export par défaut de la classe
export default LibraryService
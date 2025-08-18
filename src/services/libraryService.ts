// src/services/libraryService.ts - VERSION COMPLÈTE CORRIGÉE AVEC AUTHENTIFICATION
import { supabase } from '@/lib/supabase'
import { AuthService } from './authService'
import { socialService } from './socialService'
import type { LibraryItem, MediaStatus } from '@/types'

export class LibraryService {
  // Clé pour localStorage (fallback) - sera maintenant user-specific
  private static getStorageKey(userId?: string): string {
    return userId ? `stackr_library_${userId}` : 'stackr_library_guest'
  }

  // ✅ DÉCLENCHER ÉVÉNEMENT PERSONNALISÉ POUR SYNCHRONISATION
  private static notifyLibraryChange(action: 'added' | 'updated' | 'deleted', item?: LibraryItem) {
    const event = new CustomEvent('library-changed', {
      detail: { action, item, timestamp: Date.now() }
    })
    window.dispatchEvent(event)
    console.log('🔔 Library change event dispatched:', action, item?.title)
  }

  // ✅ RÉCUPÉRER LA BIBLIOTHÈQUE FRAÎCHE (FORCE SUPABASE, IGNORE CACHE)
  static async getLibraryFresh(): Promise<LibraryItem[]> {
    try {
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        return []
      }

      // Obtenir l'utilisateur actuel
      const currentUser = await AuthService.getCurrentUser()
      const userId = currentUser?.id
      const storageKey = this.getStorageKey(userId)

      console.log('🔄 [LibraryService] Fetching fresh library from Supabase for user:', userId || 'guest')

      // Forcer le rechargement depuis Supabase (ignorer localStorage)
      let query = supabase
        .from('library_items')
        .select('*')
        .order('added_at', { ascending: false })

      // Filtrer par utilisateur si connecté
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (!error && data) {
        console.log('📚 Fresh library loaded from Supabase:', data.length, 'items')
        
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
          developer: item.developer,
          genre: item.genre,
          userRating: item.user_rating,
          progress: item.progress,
          notes: item.notes,
          dateStarted: item.date_started,
          dateCompleted: item.date_completed,
          
          // Nouvelles propriétés depuis Supabase
          developers: item.developers ? JSON.parse(item.developers) : [],
          publishers: item.publishers ? JSON.parse(item.publishers) : [],
          genres: item.genres ? JSON.parse(item.genres) : [],
          background_image: item.background_image,
          released: item.released,
          
          // Films/séries
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
          
          // Infos additionnelles
          additionalInfo: item.additional_info ? JSON.parse(item.additional_info) : undefined
        }))
        
        // Mettre à jour le cache localStorage avec les données fraîches
        localStorage.setItem(storageKey, JSON.stringify(convertedItems))
        return convertedItems
      } else {
        console.error('🔄 [LibraryService] Supabase error:', error)
        throw new Error('Failed to fetch from Supabase')
      }

    } catch (error) {
      console.error('❌ [LibraryService] Error fetching fresh library:', error)
      
      // Fallback vers localStorage seulement en cas d'erreur
      const stored = localStorage.getItem(storageKey)
      const items = stored ? JSON.parse(stored) : []
      console.log('📚 Fallback to localStorage:', items.length, 'items')
      return items
    }
  }

  // Récupérer la bibliothèque (Supabase + fallback localStorage)
  static async getLibrary(): Promise<LibraryItem[]> {
    try {
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        return []
      }

      // Obtenir l'utilisateur actuel
      const currentUser = await AuthService.getCurrentUser()
      const userId = currentUser?.id
      const storageKey = this.getStorageKey(userId)

      // Essayer Supabase d'abord
      try {
        let query = supabase
          .from('library_items')
          .select('*')
          .order('added_at', { ascending: false })

        // Filtrer par utilisateur si connecté
        if (userId) {
          query = query.eq('user_id', userId)
        }

        const { data, error } = await query

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
            developer: item.developer, // ✅ AJOUTÉ
            genre: item.genre,
            userRating: item.user_rating,
            progress: item.progress,
            notes: item.notes,
            dateStarted: item.date_started,
            dateCompleted: item.date_completed,
            
            // ✅ NOUVELLES PROPRIÉTÉS depuis Supabase
            developers: item.developers ? JSON.parse(item.developers) : [],
            publishers: item.publishers ? JSON.parse(item.publishers) : [],
            genres: item.genres ? JSON.parse(item.genres) : [],
            background_image: item.background_image,
            released: item.released,
            
            // Films/séries
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
            
            // Infos additionnelles
            additionalInfo: item.additional_info ? JSON.parse(item.additional_info) : undefined
          }))
          
          // Synchroniser avec localStorage comme backup
          localStorage.setItem(storageKey, JSON.stringify(convertedItems))
          return convertedItems
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase unavailable, using localStorage:', supabaseError)
      }

      // Fallback vers localStorage
      const stored = localStorage.getItem(storageKey)
      const items = stored ? JSON.parse(stored) : []
      console.log('📚 Library loaded from localStorage:', items.length, 'items')
      return items

    } catch (error) {
      console.error('❌ Error loading library:', error)
      return []
    }
  }

  // ✅ FONCTION ADDTOLIBRARY COMPLÈTEMENT RÉÉCRITE
  static async addToLibrary(item: any, status: MediaStatus): Promise<boolean> {
    try {
      // Vérifier si on est côté client
      if (typeof window === 'undefined') {
        return false
      }

      // Obtenir l'utilisateur actuel
      const currentUser = await AuthService.getCurrentUser()
      const userId = currentUser?.id
      const storageKey = this.getStorageKey(userId)

      // ✅ CRÉER L'ITEM AVEC TOUTES LES DONNÉES API
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
        developer: item.developer, // ✅ Préserver le developer
        genre: item.genre,
        
        // ✅ PRÉSERVER LES DONNÉES COMPLÈTES DE L'API
        developers: item.developers || [], // Array des développeurs RAWG
        publishers: item.publishers || [], // Array des publishers RAWG
        genres: item.genres || [],
        background_image: item.background_image,
        released: item.released,
        
        // Pour les films/séries
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

      // Essayer Supabase d'abord (seulement si utilisateur connecté)
      if (userId) {
        console.log('👤 User authenticated, trying Supabase sync')
        try {
          const { data, error } = await supabase
            .from('library_items')
            .upsert({
            id: newItem.id,
            user_id: userId, // ✅ Ajouter l'ID utilisateur
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
            developer: newItem.developer, // ✅ Ajouter developer
            genre: newItem.genre,
            
            // ✅ NOUVELLES COLONNES Supabase (JSON pour arrays)
            developers: JSON.stringify(newItem.developers),
            publishers: JSON.stringify(newItem.publishers),
            genres: JSON.stringify(newItem.genres),
            background_image: newItem.background_image,
            released: newItem.released,
            
            // Films/séries
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
          .select()

        if (!error) {
          console.log('➕ Added to Supabase with complete data:', newItem.title)
          
          // Synchroniser localStorage
          const library = await this.getLibraryFromLocalStorage(userId)
          const existingIndex = library.findIndex(libItem => libItem.id === newItem.id)
          
          if (existingIndex !== -1) {
            library[existingIndex] = newItem
          } else {
            library.unshift(newItem)
          }
          
          localStorage.setItem(storageKey, JSON.stringify(library))
          
          // Créer une activité sociale
          if (userId) {
            try {
              await socialService.createActivity({
                activity_type: 'library_add',
                item_id: newItem.id,
                item_type: newItem.category as 'games' | 'movies' | 'music' | 'books',
                item_title: newItem.title,
                item_image: newItem.image,
                metadata: {
                  status: newItem.status,
                  rating: newItem.rating
                },
                visibility: 'friends'
              })
            } catch (activityError) {
              console.error('Failed to create activity:', activityError)
            }
          }
          
          // ✅ DÉCLENCHER ÉVÉNEMENT DE SYNCHRONISATION
          this.notifyLibraryChange('added', newItem)
          return true
        } else {
          console.error('Supabase error:', error)
        }
        } catch (supabaseError) {
          console.log('⚠️ Supabase unavailable, using localStorage:', supabaseError)
        }
      } else {
        console.log('👤 User not authenticated, skipping Supabase, using localStorage only')
      }

      // Fallback vers localStorage avec toutes les données
      const library = await this.getLibraryFromLocalStorage(userId)
      const existingIndex = library.findIndex(libItem => libItem.id === newItem.id)
      
      if (existingIndex !== -1) {
        library[existingIndex] = { ...library[existingIndex], ...newItem }
        console.log('📝 Updated item in localStorage with complete data:', newItem.title)
      } else {
        library.unshift(newItem)
        console.log('➕ Added new item to localStorage with complete data:', newItem.title)
      }

      localStorage.setItem(storageKey, JSON.stringify(library))
      console.log('💾 Library saved with complete API data! Total items:', library.length)
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

      // Obtenir l'utilisateur actuel
      const currentUser = await AuthService.getCurrentUser()
      const userId = currentUser?.id
      const storageKey = this.getStorageKey(userId)

      // Essayer Supabase d'abord (seulement si utilisateur connecté)
      if (userId) {
        console.log('👤 User authenticated, trying Supabase update')
        try {
          const updateData: any = {}
        
        // Mapper les champs LibraryItem vers les champs de la base
        if (updates.status) updateData.status = updates.status
        if (updates.userRating !== undefined) updateData.user_rating = updates.userRating
        if (updates.progress !== undefined) updateData.progress = updates.progress
        if (updates.notes !== undefined) updateData.notes = updates.notes
        if (updates.dateStarted) updateData.date_started = updates.dateStarted
        if (updates.dateCompleted) updateData.date_completed = updates.dateCompleted
        if (updates.additionalInfo) updateData.additional_info = JSON.stringify(updates.additionalInfo)
        
        // Auto-set dates based on status
        if (updates.status === 'currently-playing' && !updateData.date_started) {
          updateData.date_started = new Date().toISOString()
        }
        if (updates.status === 'completed' && !updateData.date_completed) {
          updateData.date_completed = new Date().toISOString()
        }

        let query = supabase
          .from('library_items')
          .update(updateData)
          .eq('id', itemId)

        // Filtrer par utilisateur si connecté
        if (userId) {
          query = query.eq('user_id', userId)
        }

        const { error } = await query

        if (!error) {
          console.log('📝 Updated item in Supabase:', itemId)
          
          // Créer une activité sociale pour les changements importants
          if (userId && updates.status) {
            try {
              const library = await this.getLibraryFromLocalStorage(userId)
              const item = library.find(i => i.id === itemId)
              
              if (item) {
                await socialService.createActivity({
                  activity_type: 'status_update',
                  item_id: itemId,
                  item_type: item.category as 'games' | 'movies' | 'music' | 'books',
                  item_title: item.title,
                  item_image: item.image,
                  metadata: {
                    status: updates.status,
                    previous_status: item.status,
                    rating: updates.userRating || item.userRating
                  },
                  visibility: 'friends'
                })
              }
            } catch (activityError) {
              console.error('Failed to create activity:', activityError)
            }
          }
        } else {
          console.error('Supabase update error:', error)
        }
        } catch (supabaseError) {
          console.log('⚠️ Supabase unavailable for update:', supabaseError)
        }
      } else {
        console.log('👤 User not authenticated, skipping Supabase update, using localStorage only')
      }

      // Mise à jour localStorage (toujours faire)
      const library = await this.getLibraryFromLocalStorage(userId)
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

      localStorage.setItem(storageKey, JSON.stringify(library))
      console.log('📝 Updated library item:', library[itemIndex].title)
      
      // ✅ DÉCLENCHER ÉVÉNEMENT DE SYNCHRONISATION
      this.notifyLibraryChange('updated', library[itemIndex])
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

      // Obtenir l'utilisateur actuel
      const currentUser = await AuthService.getCurrentUser()
      const userId = currentUser?.id
      const storageKey = this.getStorageKey(userId)

      // Essayer Supabase d'abord
      try {
        let query = supabase
          .from('library_items')
          .delete()
          .eq('id', itemId)

        // Filtrer par utilisateur si connecté
        if (userId) {
          query = query.eq('user_id', userId)
        }

        const { error } = await query

        if (!error) {
          console.log('🗑️ Removed from Supabase:', itemId)
        } else {
          console.error('Supabase delete error:', error)
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase unavailable for deletion:', supabaseError)
      }

      // Suppression localStorage (toujours faire)
      const library = await this.getLibraryFromLocalStorage(userId)
      const itemToRemove = library.find(item => item.id === itemId)
      
      if (!itemToRemove) {
        console.warn('⚠️ Item not found for deletion:', itemId)
        return false
      }

      const filteredLibrary = library.filter(item => item.id !== itemId)
      localStorage.setItem(storageKey, JSON.stringify(filteredLibrary))
      console.log('🗑️ Removed from library:', itemToRemove.title)
      
      // ✅ DÉCLENCHER ÉVÉNEMENT DE SYNCHRONISATION
      this.notifyLibraryChange('deleted', itemToRemove)
      return true

    } catch (error) {
      console.error('❌ Error removing from library:', error)
      return false
    }
  }

  // Méthode helper pour récupérer uniquement localStorage
  private static async getLibraryFromLocalStorage(userId?: string): Promise<LibraryItem[]> {
    try {
      if (typeof window === 'undefined') return []
      const storageKey = this.getStorageKey(userId)
      const stored = localStorage.getItem(storageKey)
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
      // Obtenir l'utilisateur actuel
      const currentUser = await AuthService.getCurrentUser()
      const userId = currentUser?.id
      
      if (!userId) {
        console.log('ℹ️ Cannot migrate: User not authenticated')
        return false
      }

      // Vérifier la connexion Supabase
      const isConnected = await this.testSupabaseConnection()
      if (!isConnected) {
        console.log('ℹ️ Cannot migrate: Supabase not available')
        return false
      }

      // Récupérer les données localStorage (essayer d'abord l'ancienne clé, puis la nouvelle)
      const storageKey = this.getStorageKey(userId)
      let localData = localStorage.getItem(storageKey)
      
      // Fallback vers l'ancienne clé pour la migration initiale
      if (!localData) {
        localData = localStorage.getItem('stackr_library')
      }
      
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
              user_id: userId, // ✅ Ajouter l'ID utilisateur
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
              developer: item.developer, // ✅ AJOUTÉ
              genre: item.genre,
              user_rating: item.userRating,
              progress: item.progress,
              notes: item.notes,
              date_started: item.dateStarted,
              date_completed: item.dateCompleted,
              
              // ✅ NOUVELLES DONNÉES
              developers: JSON.stringify(item.developers || []),
              publishers: JSON.stringify(item.publishers || []),
              genres: JSON.stringify(item.genres || []),
              background_image: item.background_image,
              released: item.released,
              
              // Films/séries
              type: item.type,
              is_movie: item.isMovie,
              is_series: item.isSeries,
              total_seasons: item.totalSeasons,
              display_title: item.displayTitle,
              overview: item.overview,
              runtime: item.runtime,
              actors: item.actors,
              language: item.language,
              country: item.country,
              awards: item.awards,
              
              additional_info: JSON.stringify(item.additionalInfo || {})
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
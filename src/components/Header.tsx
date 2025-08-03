'use client'
import { useState, useEffect } from 'react'
import { Search, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import SearchModal from './SearchModal'
import { AuthModal } from './AuthModal'
import PushNotificationManager from './PushNotificationManager'
import { AuthService, type AuthUser } from '@/services/authService'
import type { LibraryItem, MediaStatus } from '@/types'

interface HeaderProps {
  onAddToLibrary: (item: any, status: MediaStatus) => void
  library: LibraryItem[]
  onOpenGameDetail?: (gameId: string) => void
}

export default function Header({ onAddToLibrary, library, onOpenGameDetail }: HeaderProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    // Charger l'utilisateur actuel
    const loadUser = async () => {
      const user = await AuthService.getCurrentUser()
      setCurrentUser(user)
    }
    loadUser()

    // Écouter les changements d'authentification
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setCurrentUser(user)
      if (user) {
        setIsAuthModalOpen(false)
      }
    })

    // Fermer le menu utilisateur si on clique ailleurs
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        const target = event.target as Element
        if (!target.closest('.user-menu')) {
          setIsUserMenuOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  const handleSignOut = async () => {
    const { error } = await AuthService.signOut()
    if (!error) {
      setCurrentUser(null)
      setIsUserMenuOpen(false)
      // Optionnel: recharger la page pour vider les données
      window.location.reload()
    }
  }
  
  return (
    <>
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
        </div>
        
        {/* Barre de recherche cliquable - plus subtile */}
        <div className="flex-1 max-w-md mx-8">
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsSearchModalOpen(true)}
          >
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <div className="w-full pl-4 pr-10 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors text-sm">
              <span className="hidden md:inline">Search...</span>
              <span className="md:hidden">Search...</span>
            </div>
          </div>
        </div>
        
        {/* Actions et Profil */}
        <div className="flex items-center space-x-2">
          {/* Notification Manager - Only show if user is authenticated */}
          {currentUser && <PushNotificationManager />}
          
          {/* Profile avec authentification */}
          <div className="relative user-menu">
            {currentUser ? (
              // Utilisateur connecté
              <div className="flex items-center">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  {currentUser.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.name || 'User'} 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {currentUser.name?.charAt(0)?.toUpperCase() || '👤'}
                    </span>
                  )}
                </div>
                <ChevronDown size={16} className="text-gray-500" />
              </button>

              {/* Menu utilisateur */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{currentUser.name}</p>
                    <p className="text-sm text-gray-500">{currentUser.email}</p>
                  </div>
                  
                  <button className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 w-full">
                    <Settings size={16} />
                    Paramètres
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Utilisateur non connecté
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <User size={16} />
              <span className="hidden sm:inline">Se connecter</span>
            </button>
          )}
          </div>
        </div>
      </header>
      
      {/* Modal de recherche */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAddToLibrary={onAddToLibrary}
        onOpenGameDetail={(gameId) => {
          setIsSearchModalOpen(false)
          onOpenGameDetail?.(gameId)
        }}
        library={library}
      />

      {/* Modal d'authentification */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false)
          // L'utilisateur sera mis à jour via onAuthStateChange
        }}
      />
    </>
  )
}
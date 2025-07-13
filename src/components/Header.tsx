'use client'
import { Search, Camera, Bell } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white">Stackr</h1>
          </div>

          {/* Barre de recherche */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-xl px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800">
              <Camera size={20} />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800">
              <Bell size={20} />
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl transition-colors">
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
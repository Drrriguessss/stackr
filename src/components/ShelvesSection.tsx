// @ts-nocheck
'use client'
import { useState } from 'react'
import { Filter, Grid, List, Search, Star, Calendar, Clock, CheckCircle, Heart, Trash2, Edit3, MoreVertical, Plus } from 'lucide-react'
import ContentCard from './ContentCard'

// Interface simple pour les items de la library
interface LibraryItem {
  id: string
  title: string
  category: string
  status: string
  addedAt: string
  [key: string]: any
}

interface ShelvesSectionProps {
  library: LibraryItem[]
  onAddToLibrary: (item: any, status: string) => void
  onUpdateItem?: (id: string, updates: Partial<LibraryItem>) => void
  onDeleteItem?: (id: string) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenSearch?: () => void
}

export default function ShelvesSection({ 
  library, 
  onAddToLibrary, 
  onUpdateItem, 
  onDeleteItem, 
  onOpenGameDetail,
  onOpenSearch 
}: ShelvesSectionProps) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingItem, setEditingItem] = useState<string | null>(null)

  // Filter library by status and search
  const filteredLibrary = library.filter(item => {
    // Status filter
    if (activeFilter !== 'all' && item.status !== activeFilter) return false
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(query) ||
        item.author?.toLowerCase().includes(query) ||
        item.artist?.toLowerCase().includes(query) ||
        item.director?.toLowerCase().includes(query) ||
        item.genre?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  // Get status count
  const getStatusCount = (status: string) => {
    if (status === 'all') return library.length
    return library.filter(item => item.status === status).length
  }

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'want-to-play': return { label: 'Wishlist', color: 'bg-purple-500', icon: <Heart size={14} /> }
      case 'currently-playing': return { label: 'Playing', color: 'bg-blue-500', icon: <Clock size={14} /> }
      case 'completed': return { label: 'Completed', color: 'bg-green-500', icon: <CheckCircle size={14} /> }
      case 'dropped': return { label: 'Dropped', color: 'bg-red-500', icon: <Trash2 size={14} /> }
      case 'paused': return { label: 'Paused', color: 'bg-yellow-500', icon: <Clock size={14} /> }
      default: return { label: status, color: 'bg-gray-500', icon: <Clock size={14} /> }
    }
  }

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'games': return { label: 'Games', icon: '🎮', color: 'text-green-400' }
      case 'movies': return { label: 'Movies', icon: '🎬', color: 'text-blue-400' }
      case 'music': return { label: 'Music', icon: '🎵', color: 'text-purple-400' }
      case 'books': return { label: 'Books', icon: '📚', color: 'text-orange-400' }
      default: return { label: category, icon: '📄', color: 'text-gray-400' }
    }
  }

  const getCreator = (item: LibraryItem) => {
    return item.author || item.artist || item.director || 'Unknown'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const handleStatusChange = (itemId: string, newStatus: string) => {
    if (!onUpdateItem) return
    
    const updates: Partial<LibraryItem> = { status: newStatus as any }
    
    if (newStatus === 'completed' && !library.find(i => i.id === itemId)?.dateCompleted) {
      updates.dateCompleted = new Date().toISOString()
    }
    if (newStatus === 'currently-playing' && !library.find(i => i.id === itemId)?.dateStarted) {
      updates.dateStarted = new Date().toISOString()
    }
    
    onUpdateItem(itemId, updates)
  }

  // Quick Edit Modal Component
  const QuickEditModal = ({ item }: { item: LibraryItem }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-white font-medium">Edit {item.title}</h3>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-gray-300 text-sm mb-2">Status</label>
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(item.id, e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600"
            >
              <option value="want-to-play">Wishlist</option>
              <option value="currently-playing">Playing</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-gray-300 text-sm mb-2">Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onUpdateItem?.(item.id, { rating: star })}
                  className={`p-1 ${(item.rating || 0) >= star ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  <Star size={20} fill={(item.rating || 0) >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {item.status === 'currently-playing' && (
            <div>
              <label className="block text-gray-300 text-sm mb-2">Progress (%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={item.progress || 0}
                onChange={(e) => onUpdateItem?.(item.id, { progress: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="text-center text-gray-400 text-sm mt-1">{item.progress || 0}%</div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end space-x-2">
          <button
            onClick={() => setEditingItem(null)}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
          {onDeleteItem && (
            <button
              onClick={() => {
                onDeleteItem(item.id)
                setEditingItem(null)
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )

  if (library.length === 0) {
    return (
      <section className="mt-12 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Your Shelves</h2>
        </div>
        
        <div className="text-center py-12 bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-700">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-white mb-2">Your shelves are empty</h3>
          <p className="text-gray-400 mb-6">Start adding games, movies, music, and books to track your collection!</p>
          {onOpenSearch && (
            <button 
              onClick={onOpenSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add Your First Item
            </button>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="mt-12 mb-8">
      {/* Header with title and controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          Your Shelves
          <span className="text-lg font-normal text-gray-400 ml-2">
            ({library.length} items)
          </span>
        </h2>
        
        <div className="flex items-center space-x-2">
          {/* Search button */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Search size={16} />
              <span>Add Items</span>
            </button>
          )}
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search your shelves..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All', icon: '📚' },
          { key: 'want-to-play', label: 'Wishlist', icon: '❤️' },
          { key: 'currently-playing', label: 'Playing', icon: '🎮' },
          { key: 'completed', label: 'Completed', icon: '✅' },
          { key: 'paused', label: 'Paused', icon: '⏸️' },
          { key: 'dropped', label: 'Dropped', icon: '🗑️' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            <span className="text-xs opacity-75">
              ({getStatusCount(key)})
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {filteredLibrary.length === 0 ? (
        <div className="text-center py-8 bg-gray-900/30 rounded-xl">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-400">
            {searchQuery 
              ? `No items found for "${searchQuery}"` 
              : `No items found for "${activeFilter === 'all' ? 'all' : activeFilter.replace('-', ' ')}" filter`
            }
          </p>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
              {filteredLibrary.map((item) => (
                <div key={item.id} className="group relative">
                  <ContentCard
                    item={item}
                    category={item.category}
                    onAddToLibrary={onAddToLibrary}
                    library={library}
                    onOpenGameDetail={onOpenGameDetail}
                  />
                  
                  {/* Edit button overlay */}
                  <button
                    onClick={() => setEditingItem(item.id)}
                    className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-3 mb-8">
              {filteredLibrary.map((item) => {
                const statusInfo = getStatusInfo(item.status)
                const categoryInfo = getCategoryInfo(item.category)
                
                return (
                  <div key={item.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
                    <div className="flex items-center space-x-4">
                      {/* Image */}
                      <div className="w-16 h-20 rounded-lg bg-gray-800 flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            {categoryInfo.icon}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-white font-medium">{item.title}</h3>
                            <p className="text-gray-400 text-sm">{getCreator(item)}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-xs ${categoryInfo.color}`}>
                                {categoryInfo.icon} {categoryInfo.label}
                              </span>
                              {item.year && (
                                <>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-400 text-xs">{item.year}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => setEditingItem(item.id)}
                            className="text-gray-400 hover:text-white p-1"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>

                        {/* Status and Progress */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusInfo.color} flex items-center space-x-1`}>
                              {statusInfo.icon}
                              <span>{statusInfo.label}</span>
                            </span>

                            {item.rating && (
                              <div className="flex items-center space-x-1">
                                <Star size={14} className="text-yellow-400" fill="currentColor" />
                                <span className="text-sm text-gray-300">{item.rating}/5</span>
                              </div>
                            )}

                            {item.status === 'currently-playing' && item.progress && (
                              <div className="flex items-center space-x-2">
                                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400">{item.progress}%</span>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-500">
                            Added {formatDate(item.addedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{getStatusCount('want-to-play')}</div>
          <div className="text-sm text-gray-400">Wishlist</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{getStatusCount('currently-playing')}</div>
          <div className="text-sm text-gray-400">Playing</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{getStatusCount('completed')}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{library.length}</div>
          <div className="text-sm text-gray-400">Total Items</div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <QuickEditModal item={filteredLibrary.find(i => i.id === editingItem)!} />
      )}
    </section>
  )
}
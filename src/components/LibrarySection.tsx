'use client'
import { useState } from 'react'
import { Filter, Grid, List, Search, Star, Calendar, Clock, CheckCircle, Heart, Trash2, Edit3, MoreVertical, Plus } from 'lucide-react'
import ContentCard from './ContentCard'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import type { LibraryItem, MediaStatus } from '@/types'

interface LibrarySectionProps {
  library: LibraryItem[]
  onAddToLibrary: (item: any, status: MediaStatus) => void
  onUpdateItem?: (id: string, updates: Partial<LibraryItem>) => void
  onDeleteItem?: (id: string) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenSearch?: () => void
}

export default function LibrarySection({
  library,
  onAddToLibrary,
  onUpdateItem,
  onDeleteItem,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenSearch
}: LibrarySectionProps) {
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
      case 'want-to-play': return { label: 'Wishlist', color: 'status-want', icon: 'Heart' }
      case 'currently-playing': return { label: 'Playing', color: 'status-playing', icon: 'Clock' }
      case 'completed': return { label: 'Completed', color: 'status-completed', icon: 'CheckCircle' }
      case 'dropped': return { label: 'Dropped', color: 'status-dropped', icon: 'Trash2' }
      case 'paused': return { label: 'Paused', color: 'status-paused', icon: 'Clock' }
      default: return { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200', icon: 'Clock' }
    }
  }

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'games': return { label: 'Games', icon: '🎮', color: 'text-green-600' }
      case 'movies': return { label: 'Movies', icon: '🎬', color: 'text-blue-600' }
      case 'music': return { label: 'Music', icon: '🎵', color: 'text-purple-600' }
      case 'books': return { label: 'Books', icon: '📚', color: 'text-orange-600' }
      default: return { label: category, icon: '📄', color: 'text-gray-600' }
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

  const handleStatusChange = (itemId: string, newStatus: MediaStatus) => {
    if (!onUpdateItem) return
    
    const updates: Partial<LibraryItem> = { status: newStatus }

    if (newStatus === 'completed' && !library.find(i => i.id === itemId)?.dateCompleted) {
      updates.dateCompleted = new Date().toISOString()
    }
    if (newStatus === 'currently-playing' && !library.find(i => i.id === itemId)?.dateStarted) {
      updates.dateStarted = new Date().toISOString()
    }

    onUpdateItem(itemId, updates)
  }

  // Fonction pour ouvrir les détails selon le type d'item
  const handleOpenItemDetail = (item: LibraryItem) => {
    if (item.category === 'games' && onOpenGameDetail) {
      onOpenGameDetail(item.id)
    } else if (item.category === 'movies' && onOpenMovieDetail) {
      onOpenMovieDetail(item.id)
    } else if (item.category === 'books' && onOpenBookDetail) {
      onOpenBookDetail(item.id)
    }
    // TODO: Ajouter support pour music plus tard
  }

  // Quick Edit Modal Component
  const QuickEditModal = ({ item }: { item: LibraryItem }) => (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-lg">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-gray-900 font-medium">Edit {item.title}</h3>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-gray-700 text-sm mb-2 font-medium">Status</label>
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(item.id, e.target.value as MediaStatus)}
              className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
            <label className="block text-gray-700 text-sm mb-2 font-medium">Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onUpdateItem?.(item.id, { userRating: star })}
                  className={`p-1 transition-colors ${(item.userRating || 0) >= star ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                >
                  <Star size={20} fill={(item.userRating || 0) >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {item.status === 'currently-playing' && (
            <div>
              <label className="block text-gray-700 text-sm mb-2 font-medium">Progress (%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={item.progress || 0}
                onChange={(e) => onUpdateItem?.(item.id, { progress: parseInt(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <div className="text-center text-gray-600 text-sm mt-1">{item.progress || 0}%</div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end space-x-2">
          <button
            onClick={() => setEditingItem(null)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
          {onDeleteItem && (
            <button
              onClick={() => {
                onDeleteItem(item.id)
                setEditingItem(null)
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
          <h2 className="text-2xl font-bold text-gray-900">Your Library</h2>
        </div>
        
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Your library is empty</h3>
          <p className="text-gray-600 mb-6">Start adding games, movies, music, and books to track your collection!</p>
          {onOpenSearch && (
            <button 
              onClick={onOpenSearch}
              className="btn-primary"
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
        <h2 className="text-2xl font-bold text-gray-900">
          Your Library
          <span className="text-lg font-normal text-gray-500 ml-2">
            ({library.length} items)
          </span>
        </h2>
        
        <div className="flex items-center space-x-2">
          {/* Search button */}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="btn-primary flex items-center space-x-2"
            >
              <Search size={16} />
              <span>Add Items</span>
            </button>
          )}
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
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
          placeholder="Search your library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white text-gray-900 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeFilter === key
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-gray-200'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            <span className="text-xs opacity-75 bg-white/20 px-1.5 py-0.5 rounded">
              ({getStatusCount(key)})
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {filteredLibrary.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-600">
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
                    onOpenMovieDetail={onOpenMovieDetail}
                    onOpenBookDetail={onOpenBookDetail}
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
                  <div key={item.id} className="library-card p-4">
                    <div className="flex items-center space-x-4">
                      {/* Image */}
                      <div 
                        className="w-16 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleOpenItemDetail(item)}
                      >
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
                            <h3 
                              className="text-gray-900 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => handleOpenItemDetail(item)}
                            >
                              {item.title}
                            </h3>
                            <p className="text-gray-600 text-sm">{getCreator(item)}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-xs ${categoryInfo.color}`}>
                                {categoryInfo.icon} {categoryInfo.label}
                              </span>
                              {item.year && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-500 text-xs">{item.year}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => setEditingItem(item.id)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>

                        {/* Status and Progress */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-3">
                            <span className={`status-badge ${statusInfo.color} flex items-center space-x-1`}>
                              {statusInfo.icon === 'Heart' && <Heart size={12} />}
                              {statusInfo.icon === 'Clock' && <Clock size={12} />}
                              {statusInfo.icon === 'CheckCircle' && <CheckCircle size={12} />}
                              {statusInfo.icon === 'Trash2' && <Trash2 size={12} />}
                              <span>{statusInfo.label}</span>
                            </span>

                            {item.userRating && (
                              <div className="flex items-center space-x-1">
                                <Star size={12} className="text-yellow-500" fill="currentColor" />
                                <span className="text-sm text-gray-700">{item.userRating}/5</span>
                              </div>
                            )}

                            {item.status === 'currently-playing' && item.progress && (
                              <div className="flex items-center space-x-2">
                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">{item.progress}%</span>
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
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{getStatusCount('want-to-play')}</div>
          <div className="text-sm text-gray-600">Wishlist</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{getStatusCount('currently-playing')}</div>
          <div className="text-sm text-gray-600">Playing</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{getStatusCount('completed')}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{library.length}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <QuickEditModal item={filteredLibrary.find(i => i.id === editingItem)!} />
      )}
    </section>
  )
}
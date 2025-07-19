import React, { useState, useEffect } from 'react'
import { Search, ChevronDown, Star, Edit3, Calendar, TrendingUp, Hash, User, Clock, X, Plus } from 'lucide-react'

// Types
type MediaCategory = 'games' | 'movies' | 'music' | 'books'
type MediaStatus = 'want-to-play' | 'currently-playing' | 'completed' | 'paused' | 'dropped'
type SortOption = 'date_added' | 'date_updated' | 'title' | 'creator' | 'average_rating' | 'number_of_ratings' | 'release_year'

interface LibraryItem {
  id: string
  title: string
  year: number
  rating?: number
  genre?: string
  category: MediaCategory
  image?: string
  author?: string
  artist?: string
  director?: string
  status: MediaStatus
  addedAt: string
  dateStarted?: string
  dateCompleted?: string
  userRating?: number
  progress?: number
  notes?: string
  numberOfRatings?: number
  dateUpdated?: string
  additionalInfo?: {
    platform?: string
    gamePass?: boolean
    freeToPlay?: boolean
    purchasePrice?: string
    [key: string]: any
  }
}

// Props interface for LibrarySection
interface LibrarySectionProps {
  library?: LibraryItem[]
  onAddToLibrary?: (item: any, status: MediaStatus) => void
  onUpdateItem?: (id: string, updates: Partial<LibraryItem>) => void
  onDeleteItem?: (id: string) => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
  onOpenSearch?: () => void
}

// Sample data
const sampleLibrary: LibraryItem[] = [
  {
    id: '1',
    title: 'Big Data: A Revolution That Will Transform How We Live, Work, and Think',
    author: 'Viktor Mayer-Schönberger',
    year: 2013,
    rating: 4.2,
    userRating: 4,
    genre: 'Technology',
    category: 'books',
    status: 'want-to-play',
    addedAt: '2025-01-15T10:00:00Z',
    dateUpdated: '2025-01-15T10:00:00Z',
    numberOfRatings: 3656,
    image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1374478376i/15815598.jpg'
  },
  {
    id: '2', 
    title: 'The Buddha and the Badass: The Secret Spiritual Art of Succeeding at Work',
    author: 'Vishen Lakhiani',
    year: 2020,
    rating: 3.9,
    userRating: 3,
    genre: 'Business',
    category: 'books',
    status: 'want-to-play',
    addedAt: '2025-01-14T15:30:00Z',
    dateUpdated: '2025-01-14T15:30:00Z',
    numberOfRatings: 1981,
    image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1576509232i/48855821.jpg'
  },
  {
    id: '3',
    title: 'Ori and the Will of the Wisps',
    author: 'Moon Studios',
    year: 2020,
    rating: 4.8,
    userRating: 5,
    genre: 'Platformer',
    category: 'games',
    status: 'completed',
    addedAt: '2025-01-10T12:00:00Z',
    dateUpdated: '2025-01-12T18:00:00Z',
    dateCompleted: '2025-01-12T18:00:00Z',
    numberOfRatings: 12500,
    image: 'https://media.rawg.io/media/games/718/71891291067b8bb23ad6ed6806b83881.jpg',
    additionalInfo: {
      platform: 'Xbox Game Pass',
      gamePass: true,
      freeToPlay: false,
      purchasePrice: 'Game Pass'
    }
  },
  {
    id: '4',
    title: 'The Last of Us Part II',
    author: 'Naughty Dog',
    year: 2020,
    rating: 4.6,
    userRating: 4,
    genre: 'Action-Adventure',
    category: 'games',
    status: 'completed',
    addedAt: '2025-01-08T09:00:00Z',
    dateUpdated: '2025-01-11T20:30:00Z',
    dateCompleted: '2025-01-11T20:30:00Z',
    numberOfRatings: 89000,
    image: 'https://media.rawg.io/media/games/d82/d82990b9c67ba0d2d09d4e6fa88885a7.jpg',
    additionalInfo: {
      platform: 'PlayStation 5',
      gamePass: false,
      freeToPlay: false,
      purchasePrice: '€69.99'
    }
  }
]

const LibrarySection: React.FC<LibrarySectionProps> = ({
  library: propLibrary = [],
  onAddToLibrary,
  onUpdateItem,
  onDeleteItem,
  onOpenGameDetail,
  onOpenMovieDetail,
  onOpenBookDetail,
  onOpenMusicDetail,
  onOpenSearch
}) => {
  // Use prop library or fallback to sample data
  const [library, setLibrary] = useState<LibraryItem[]>(propLibrary.length > 0 ? propLibrary : sampleLibrary)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date_added')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showAddInfoModal, setShowAddInfoModal] = useState<string | null>(null)
  const [showLocalSearchModal, setShowLocalSearchModal] = useState(false)

  // Update library when prop changes
  useEffect(() => {
    if (propLibrary.length > 0) {
      setLibrary(propLibrary)
    }
  }, [propLibrary])

  // Filter and sort logic
  const filteredAndSortedLibrary = React.useMemo(() => {
    let filtered = library.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchable = [
          item.title,
          item.author,
          item.artist,
          item.director,
          item.genre
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchable.includes(query)) return false
      }
      
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) return false
      
      // Status filter
      if (activeStatus !== 'all' && item.status !== activeStatus) return false
      
      return true
    })
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        case 'date_updated':
          return new Date(b.dateUpdated || b.addedAt).getTime() - new Date(a.dateUpdated || a.addedAt).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        case 'creator':
          const aCreator = a.author || a.artist || a.director || ''
          const bCreator = b.author || b.artist || b.director || ''
          return aCreator.localeCompare(bCreator)
        case 'average_rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'number_of_ratings':
          return (b.numberOfRatings || 0) - (a.numberOfRatings || 0)
        case 'release_year':
          return (b.year || 0) - (a.year || 0)
        default:
          return 0
      }
    })
    
    return filtered
  }, [library, searchQuery, activeCategory, activeStatus, sortBy])

  // Grouper les items par catégorie
  const groupedLibrary = React.useMemo(() => {
    const groups: { [key: string]: LibraryItem[] } = {}
    
    filteredAndSortedLibrary.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })
    
    return groups
  }, [filteredAndSortedLibrary])

  // Helper functions
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'games': return '🎮'
      case 'movies': return '🎬'
      case 'music': return '🎵'
      case 'books': return '📚'
      default: return '📚'
    }
  }

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'games': return 'Games'
      case 'movies': return 'Movies'
      case 'music': return 'Music'
      case 'books': return 'Books'
      default: return category
    }
  }

  const getStatusLabel = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'Wishlist'
      case 'currently-playing': return 'In Progress'
      case 'completed': return 'Completed'
      case 'paused': return 'Paused'
      case 'dropped': return 'Dropped'
      default: return status
    }
  }

  const getStatusColor = (status: MediaStatus) => {
    switch (status) {
      case 'want-to-play': return 'bg-orange-100 text-orange-700'
      case 'currently-playing': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      case 'paused': return 'bg-yellow-100 text-yellow-700'
      case 'dropped': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'date_added': return 'Date Added'
      case 'date_updated': return 'Date Updated'
      case 'title': return 'Title'
      case 'creator': return 'Creator'
      case 'average_rating': return 'Average Rating'
      case 'number_of_ratings': return 'Number of Ratings'
      case 'release_year': return 'Release Year'
      default: return 'Date Added'
    }
  }

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case 'date_added': return <Calendar size={14} />
      case 'date_updated': return <Clock size={14} />
      case 'title': return <Hash size={14} />
      case 'creator': return <User size={14} />
      case 'average_rating': return <Star size={14} />
      case 'number_of_ratings': return <TrendingUp size={14} />
      case 'release_year': return <Calendar size={14} />
      default: return <Calendar size={14} />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCreator = (item: LibraryItem) => {
    return item.author || item.artist || item.director || 'Unknown'
  }

  // Modal Components
  const LocalSearchModal = () => {
    if (!showLocalSearchModal) return null
    
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-200 shadow-lg">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 outline-none text-lg"
                autoFocus
              />
              <button
                onClick={() => setShowLocalSearchModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? `Searching for "${searchQuery}" in your library...` : 'Type to search in your library'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const AddInfoModal = ({ item }: { item: LibraryItem }) => {
    const [formData, setFormData] = useState(item.additionalInfo || {})

    if (item.category !== 'games') {
      return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-lg">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-medium">Additional Info - {item.title}</h3>
            </div>
            <div className="p-4">
              <p className="text-gray-600">Feature coming soon for {item.category}!</p>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowAddInfoModal(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-lg">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-gray-900 font-medium">Game Info - {item.title}</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-gray-700 text-sm mb-2 font-medium">Platform</label>
              <select
                value={formData.platform || ''}
                onChange={(e) => setFormData({...formData, platform: e.target.value})}
                className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Platform</option>
                <option value="PlayStation 5">PlayStation 5</option>
                <option value="Xbox Series X/S">Xbox Series X/S</option>
                <option value="Nintendo Switch">Nintendo Switch</option>
                <option value="PC (Steam)">PC (Steam)</option>
                <option value="PC (Epic Games)">PC (Epic Games)</option>
                <option value="Xbox Game Pass">Xbox Game Pass</option>
                <option value="PlayStation Plus">PlayStation Plus</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2 font-medium">Purchase Details</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.gamePass || false}
                    onChange={(e) => setFormData({...formData, gamePass: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Game Pass / Subscription</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.freeToPlay || false}
                    onChange={(e) => setFormData({...formData, freeToPlay: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Free to Play</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2 font-medium">Purchase Price</label>
              <input
                type="text"
                placeholder="e.g. €59.99, Free, Game Pass"
                value={formData.purchasePrice || ''}
                onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
                className="w-full bg-white text-gray-900 rounded-lg px-3 py-2 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex space-x-2">
            <button
              onClick={() => setShowAddInfoModal(null)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onUpdateItem) {
                  onUpdateItem(item.id, { additionalInfo: formData })
                } else {
                  setLibrary(prev => prev.map(libItem => 
                    libItem.id === item.id 
                      ? { ...libItem, additionalInfo: formData }
                      : libItem
                  ))
                }
                setShowAddInfoModal(null)
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header sticky avec titre et icônes */}
      <div className="sticky top-0 z-50 bg-gray-50 border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          {/* Titre avec nombre d'items et icônes */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Your Library</h1>
              <span className="text-lg text-gray-500">
                ({filteredAndSortedLibrary.length} item{filteredAndSortedLibrary.length !== 1 ? 's' : ''})
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Icône recherche locale */}
              <button
                onClick={() => setShowLocalSearchModal(true)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="Search in your library"
              >
                <Search size={20} className="text-gray-600" />
              </button>
              
              {/* Icône ajout global */}
              <button
                onClick={() => {
                  if (onOpenSearch) {
                    onOpenSearch()
                  }
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="Add new items to your library"
              >
                <Plus size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Filtres de catégories et statut */}
          <div className="flex items-center justify-between">
            {/* Boutons de catégories */}
            <div className="flex items-center space-x-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'games', label: 'Games' },
                { key: 'movies', label: 'Movies' },
                { key: 'music', label: 'Music' },
                { key: 'books', label: 'Books' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === key
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Menu déroulant de statut déplacé */}
            <div className="flex items-center space-x-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'games', label: 'Games' },
                { key: 'movies', label: 'Movies' },
                { key: 'music', label: 'Music' },
                { key: 'books', label: 'Books' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === key
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-white">
        {/* Filtres de tri et statut */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            {/* Menu déroulant de statut */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-sm"
              >
                <span>{getStatusLabel(activeStatus as MediaStatus)}</span>
                <ChevronDown size={14} />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-36">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'want-to-play', label: 'Wishlist' },
                    { key: 'currently-playing', label: 'In Progress' },
                    { key: 'completed', label: 'Completed' },
                    { key: 'paused', label: 'Paused' },
                    { key: 'dropped', label: 'Dropped' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveStatus(key)
                        setShowStatusDropdown(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton "Sorted by" */}
            <div className="relative inline-block">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-sm font-medium"
              >
                {getSortIcon(sortBy)}
                <span>Sorted by {getSortLabel(sortBy)}</span>
                <ChevronDown size={14} />
              </button>
              
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                  {[
                    { key: 'date_added', label: 'Date Added', icon: <Calendar size={14} /> },
                    { key: 'date_updated', label: 'Date Updated', icon: <Clock size={14} /> },
                    { key: 'title', label: 'Title', icon: <Hash size={14} /> },
                    { key: 'creator', label: 'Creator', icon: <User size={14} /> },
                    { key: 'average_rating', label: 'Average Rating', icon: <Star size={14} /> },
                    { key: 'number_of_ratings', label: 'Number of Ratings', icon: <TrendingUp size={14} /> },
                    { key: 'release_year', label: 'Release Year', icon: <Calendar size={14} /> }
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSortBy(key as SortOption)
                        setShowSortDropdown(false)
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Liste des items groupés par catégorie */}
        <div className="px-4 sm:px-6 py-4 pb-24">
          {filteredAndSortedLibrary.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No items found.</p>
            </div>
          ) : activeCategory === 'all' ? (
            // Vue "All" - groupée par catégories
            <div className="space-y-8">
              {Object.entries(groupedLibrary).map(([category, items]) => (
                <div key={category}>
                  {/* Titre de catégorie */}
                  <div className="flex items-center space-x-2 mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {getCategoryDisplayName(category)}
                    </h2>
                    <span className="text-gray-500 text-sm">
                      ({items.length})
                    </span>
                  </div>
                  
                  {/* Items de cette catégorie */}
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                        {/* Image */}
                        <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              {getCategoryIcon(item.category)}
                            </div>
                          )}
                        </div>

                        {/* Contenu principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-gray-900 font-semibold text-base leading-tight">
                                {item.title}
                              </h3>
                              <p className="text-gray-600 text-sm mt-1">
                                by {getCreator(item)}
                              </p>
                              
                              {/* Rating */}
                              <div className="flex items-center space-x-3 mt-2">
                                {item.userRating && (
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        size={12}
                                        className={`${
                                          star <= item.userRating! ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                )}
                                
                                {item.rating && (
                                  <div className="text-xs text-gray-500">
                                    avg {item.rating} • {item.numberOfRatings?.toLocaleString()} ratings
                                  </div>
                                )}
                              </div>

                              {/* Meta info */}
                              <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {getStatusLabel(item.status)}
                                </span>
                                <span>{item.year}</span>
                                <span>Added {formatDate(item.addedAt)}</span>
                                
                                {/* Infos additionnelles pour les jeux */}
                                {item.category === 'games' && item.additionalInfo && (
                                  <>
                                    {item.additionalInfo.platform && (
                                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                        {item.additionalInfo.platform}
                                      </span>
                                    )}
                                    {item.additionalInfo.gamePass && (
                                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                                        Game Pass
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Bouton Add Info */}
                            <button
                              onClick={() => setShowAddInfoModal(item.id)}
                              className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors ml-4"
                            >
                              <Edit3 size={12} />
                              <span>Add Info</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Vue catégorie spécifique
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {getCategoryDisplayName(activeCategory)}
                </h2>
                <span className="text-gray-500 text-lg">
                  ({filteredAndSortedLibrary.length})
                </span>
              </div>
              
              <div className="space-y-4">
                {filteredAndSortedLibrary.map((item) => (
                  <div key={item.id} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    {/* Image */}
                    <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          {getCategoryIcon(item.category)}
                        </div>
                      )}
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 font-semibold text-base leading-tight">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            by {getCreator(item)}
                          </p>
                          
                          {/* Rating */}
                          <div className="flex items-center space-x-3 mt-2">
                            {item.userRating && (
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={12}
                                    className={`${
                                      star <= item.userRating! ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                            
                            {item.rating && (
                              <div className="text-xs text-gray-500">
                                avg {item.rating} • {item.numberOfRatings?.toLocaleString()} ratings
                              </div>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                            <span>{item.year}</span>
                            <span>Added {formatDate(item.addedAt)}</span>
                            
                            {/* Infos additionnelles pour les jeux */}
                            {item.category === 'games' && item.additionalInfo && (
                              <>
                                {item.additionalInfo.platform && (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                    {item.additionalInfo.platform}
                                  </span>
                                )}
                                {item.additionalInfo.gamePass && (
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                                    Game Pass
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bouton Add Info */}
                        <button
                          onClick={() => setShowAddInfoModal(item.id)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors ml-4"
                        >
                          <Edit3 size={12} />
                          <span>Add Info</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <LocalSearchModal />
      
      {showAddInfoModal && (
        <AddInfoModal item={library.find(item => item.id === showAddInfoModal)!} />
      )}

      {/* Fermeture des dropdowns en cliquant à l'extérieur */}
      {(showSortDropdown || showStatusDropdown) && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowSortDropdown(false)
            setShowStatusDropdown(false)
          }}
        />
      )}
    </div>
  )
}

export default LibrarySection
'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowLeft,
  Search,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Star,
  Eye,
  Lock,
  Globe,
  Image as ImageIcon,
  Palette,
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Grid,
  List as ListIcon,
  Edit3,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { AuthService, type AuthUser } from '@/services/authService'

interface MediaList {
  id: string
  title: string
  description: string
  image?: string
  color: string
  isPublic: boolean
  authorId: string
  authorName: string
  authorAvatar?: string
  items: MediaItem[]
  likes: number
  comments: number
  isLiked?: boolean
  createdAt: string
  updatedAt: string
}

interface MediaItem {
  id: string
  title: string
  image: string
  category: 'games' | 'movies' | 'books' | 'music'
  rating?: number
  note?: string
}

interface Comment {
  id: string
  authorId: string
  authorName: string
  authorAvatar?: string
  content: string
  createdAt: string
  likes: number
  isLiked?: boolean
}

interface ListsPageProps {
  onBack: () => void
  onOpenGameDetail?: (gameId: string) => void
  onOpenMovieDetail?: (movieId: string) => void
  onOpenBookDetail?: (bookId: string) => void
  onOpenMusicDetail?: (musicId: string) => void
}

export default function ListsPage({ 
  onBack, 
  onOpenGameDetail, 
  onOpenMovieDetail, 
  onOpenBookDetail, 
  onOpenMusicDetail 
}: ListsPageProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [activeTab, setActiveTab] = useState<'discover' | 'my-lists'>('discover')
  const [searchQuery, setSearchQuery] = useState('')
  const [lists, setLists] = useState<MediaList[]>([])
  const [myLists, setMyLists] = useState<MediaList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedList, setSelectedList] = useState<MediaList | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')

  // Sample data
  const sampleLists: MediaList[] = [
    {
      id: '1',
      title: 'Best Indie Games of 2024',
      description: 'My personal collection of the most innovative and creative indie games released this year',
      color: '#3B82F6',
      isPublic: true,
      authorId: '1',
      authorName: 'GameMaster42',
      items: [
        { id: '1', title: 'Pizza Tower', image: 'https://via.placeholder.com/300x400', category: 'games', rating: 5 },
        { id: '2', title: 'Celeste', image: 'https://via.placeholder.com/300x400', category: 'games', rating: 5 },
        { id: '3', title: 'Hades', image: 'https://via.placeholder.com/300x400', category: 'games', rating: 5 },
        { id: '4', title: 'Hollow Knight', image: 'https://via.placeholder.com/300x400', category: 'games', rating: 5 }
      ],
      likes: 156,
      comments: 23,
      isLiked: false,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20'
    },
    {
      id: '2',
      title: 'Cozy Reading List',
      description: 'Perfect books for a rainy day with tea and blankets',
      color: '#F59E0B',
      isPublic: true,
      authorId: '2',
      authorName: 'BookwormBella',
      items: [
        { id: '5', title: 'The Seven Husbands of Evelyn Hugo', image: 'https://via.placeholder.com/300x400', category: 'books', rating: 4 },
        { id: '6', title: 'Beach Read', image: 'https://via.placeholder.com/300x400', category: 'books', rating: 4 }
      ],
      likes: 89,
      comments: 12,
      isLiked: true,
      createdAt: '2024-01-10',
      updatedAt: '2024-01-18'
    },
    {
      id: '3',
      title: 'My Watchlist',
      description: 'Movies I need to watch soon',
      color: '#EF4444',
      isPublic: false,
      authorId: '3',
      authorName: 'You',
      items: [
        { id: '7', title: 'Dune: Part Two', image: 'https://via.placeholder.com/300x400', category: 'movies' },
        { id: '8', title: 'The Batman', image: 'https://via.placeholder.com/300x400', category: 'movies' }
      ],
      likes: 0,
      comments: 0,
      createdAt: '2024-01-12',
      updatedAt: '2024-01-19'
    },
    {
      id: '4',
      title: 'Perfect Saturday Night',
      description: 'The ultimate cozy evening combo: wholesome games, peaceful music, and heartwarming anime',
      color: '#8B5CF6',
      isPublic: true,
      authorId: '4',
      authorName: 'CozyVibes',
      items: [
        { id: '9', title: 'Minami Lane', image: 'https://via.placeholder.com/300x400', category: 'games', rating: 5, note: 'Perfect cozy management game' },
        { id: '10', title: 'Spirited Away', image: 'https://via.placeholder.com/300x400', category: 'movies', rating: 5, note: 'Studio Ghibli magic' },
        { id: '11', title: 'Ludovico Einaudi - Nuvole Bianche', image: 'https://via.placeholder.com/300x400', category: 'music', rating: 5, note: 'Peaceful piano' },
        { id: '12', title: 'A Man Called Ove', image: 'https://via.placeholder.com/300x400', category: 'books', rating: 4, note: 'Heartwarming story' }
      ],
      likes: 234,
      comments: 45,
      isLiked: true,
      createdAt: '2024-01-08',
      updatedAt: '2024-01-22'
    },
    {
      id: '5',
      title: 'Rainy Day Essentials',
      description: 'When the weather is gloomy, these picks will brighten your day',
      color: '#06B6D4',
      isPublic: true,
      authorId: '5',
      authorName: 'RainyDayMood',
      items: [
        { id: '13', title: 'Coffee Talk', image: 'https://via.placeholder.com/300x400', category: 'games', rating: 4, note: 'Brewing stories one cup at a time' },
        { id: '14', title: 'Your Name', image: 'https://via.placeholder.com/300x400', category: 'movies', rating: 5, note: 'Beautiful anime film' },
        { id: '15', title: 'Bon Iver - Re: Stacks', image: 'https://via.placeholder.com/300x400', category: 'music', rating: 4, note: 'Melancholic indie folk' },
        { id: '16', title: 'The Seven Husbands of Evelyn Hugo', image: 'https://via.placeholder.com/300x400', category: 'books', rating: 5, note: 'Captivating Hollywood story' },
        { id: '17', title: 'Unpacking', image: 'https://via.placeholder.com/300x400', category: 'games', rating: 5, note: 'Zen unpacking simulator' },
        { id: '18', title: 'Lofi Hip Hop Radio', image: 'https://via.placeholder.com/300x400', category: 'music', rating: 4, note: 'Perfect background music' }
      ],
      likes: 156,
      comments: 28,
      isLiked: false,
      createdAt: '2024-01-05',
      updatedAt: '2024-01-21'
    }
  ]

  const sampleComments: Comment[] = [
    {
      id: '1',
      authorId: '4',
      authorName: 'IndieGamer99',
      content: 'Great list! I love seeing Pizza Tower getting the recognition it deserves. Have you tried Blasphemous 2?',
      createdAt: '2024-01-20T10:30:00Z',
      likes: 5,
      isLiked: false
    },
    {
      id: '2',
      authorId: '5',
      authorName: 'RetroGamer',
      content: 'Celeste is such an emotional journey. The soundtrack alone makes it worth playing.',
      createdAt: '2024-01-20T14:15:00Z',
      likes: 3,
      isLiked: true
    }
  ]

  useEffect(() => {
    loadUser()
    loadLists()
  }, [])

  const loadUser = async () => {
    const user = await AuthService.getCurrentUser()
    setCurrentUser(user)
  }

  const loadLists = async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLists(sampleLists)
      setMyLists(sampleLists.filter(list => list.authorId === '3'))
      setComments(sampleComments)
      setIsLoading(false)
    }, 1000)
  }

  const handleLikeList = async (listId: string) => {
    setLists(prev => prev.map(list => 
      list.id === listId 
        ? { 
            ...list, 
            isLiked: !list.isLiked,
            likes: list.isLiked ? list.likes - 1 : list.likes + 1
          }
        : list
    ))
  }

  const handleLikeComment = async (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { 
            ...comment, 
            isLiked: !comment.isLiked,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
          }
        : comment
    ))
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return

    const comment: Comment = {
      id: Date.now().toString(),
      authorId: currentUser.id,
      authorName: currentUser.name || 'You',
      content: newComment,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false
    }

    setComments(prev => [...prev, comment])
    setNewComment('')
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'games': return <Gamepad2 size={16} className="text-green-600" />
      case 'movies': return <Film size={16} className="text-blue-600" />
      case 'books': return <BookOpen size={16} className="text-orange-600" />
      case 'music': return <Music size={16} className="text-purple-600" />
      default: return <Star size={16} className="text-gray-600" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const handleItemClick = (item: MediaItem) => {
    const itemId = item.id?.toString() || '1'
    
    switch (item.category) {
      case 'games':
        onOpenGameDetail?.(itemId)
        break
      case 'movies':
        onOpenMovieDetail?.(itemId)
        break
      case 'books':
        onOpenBookDetail?.(itemId)
        break
      case 'music':
        onOpenMusicDetail?.(itemId)
        break
    }
  }

  const renderListCard = (list: MediaList) => (
    <div 
      key={list.id}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedList(list)}
    >
      {/* Header with color bar */}
      <div className="h-2" style={{ backgroundColor: list.color }}></div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900">{list.title}</h3>
              {list.isPublic ? <Globe size={14} className="text-gray-400" /> : <Lock size={14} className="text-gray-400" />}
              {list.authorId === '3' && <Edit3 size={14} className="text-blue-500" />}
            </div>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{list.description}</p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
              <span>by {list.authorName}</span>
              <span>{list.items.length} items</span>
              <span>Updated {getTimeAgo(list.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Preview of first few items */}
        <div className="flex -space-x-2 mb-3">
          {list.items.slice(0, 4).map((item) => (
            <div key={item.id} className="w-8 h-10 rounded bg-gray-200 border-2 border-white overflow-hidden">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            </div>
          ))}
          {list.items.length > 4 && (
            <div className="w-8 h-10 rounded bg-gray-100 border-2 border-white flex items-center justify-center">
              <span className="text-xs text-gray-500">+{list.items.length - 4}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Heart size={16} className={list.isLiked ? 'text-red-500 fill-current' : ''} />
              <span>{list.likes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle size={16} />
              <span>{list.comments}</span>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleLikeList(list.id)
            }}
            className={`p-2 rounded-lg transition-colors ${
              list.isLiked ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <Heart size={16} className={list.isLiked ? 'fill-current' : ''} />
          </button>
        </div>
      </div>
    </div>
  )

  const renderListDetails = (list: MediaList) => (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setSelectedList(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h1 className="text-lg font-semibold">{list.title}</h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {viewMode === 'grid' ? <ListIcon size={20} /> : <Grid size={20} />}
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* List Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="h-2 rounded-t-lg mb-4" style={{ backgroundColor: list.color, marginTop: '-1.5rem', marginLeft: '-1.5rem', marginRight: '-1.5rem' }}></div>
          
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: list.color }}>
              <ListIcon size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{list.title}</h2>
              <p className="text-gray-600 mb-3">{list.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>by {list.authorName}</span>
                <span>{list.items.length} items</span>
                <span className="flex items-center space-x-1">
                  {list.isPublic ? <Globe size={16} /> : <Lock size={16} />}
                  <span>{list.isPublic ? 'Public' : 'Private'}</span>
                </span>
                <span>Updated {getTimeAgo(list.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleLikeList(list.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                list.isLiked 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart size={16} className={list.isLiked ? 'fill-current' : ''} />
              <span>{list.likes}</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Share2 size={16} />
              <span>Share</span>
            </button>
            {list.authorId === '3' && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Edit List
              </button>
            )}
          </div>
        </div>

        {/* List Items */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Items ({list.items.length})</h3>
            {list.authorId === '3' && (
              <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                Add Item
              </button>
            )}
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {list.items.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="aspect-[3/4] bg-gray-200">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center space-x-1 mb-1">
                      {getCategoryIcon(item.category)}
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm truncate">{item.title}</h4>
                    {item.rating && (
                      <div className="flex items-center space-x-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= item.rating!
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {list.items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getCategoryIcon(item.category)}
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                    </div>
                    {item.rating && (
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={`${
                              star <= item.rating!
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">{item.rating}/5</span>
                      </div>
                    )}
                    {item.note && (
                      <p className="text-sm text-gray-600 mt-1">{item.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MessageCircle size={20} className="mr-2 text-blue-600" />
            Comments ({comments.length})
          </h3>

          {/* Add Comment */}
          {currentUser && list.isPublic && (
            <div className="mb-6">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">
                    {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  {comment.authorAvatar ? (
                    <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-gray-600 text-sm font-medium">
                      {comment.authorName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{comment.authorName}</span>
                    <span className="text-sm text-gray-500">{getTimeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">{comment.content}</p>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center space-x-1 text-sm transition-colors ${
                        comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart size={14} className={comment.isLiked ? 'fill-current' : ''} />
                      <span>{comment.likes}</span>
                    </button>
                    <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {comments.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No comments yet</p>
              <p className="text-gray-400 text-sm">Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderCreateListForm = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create New List</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">List Title</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter list title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your list..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex space-x-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Privacy</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create List
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  if (selectedList) {
    return renderListDetails(selectedList)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h1 className="text-lg font-semibold">Lists</h1>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lists by title, author, or content..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'discover' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Discover Lists
          </button>
          <button
            onClick={() => setActiveTab('my-lists')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'my-lists' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Lists ({myLists.length})
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3">Loading lists...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeTab === 'discover' 
              ? lists.filter(list => 
                  list.isPublic && (
                    list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    list.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    list.authorName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                ).map(renderListCard)
              : myLists.filter(list => 
                  list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  list.description.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(renderListCard)
            }
          </div>
        )}

        {/* Empty State */}
        {!isLoading && ((activeTab === 'discover' && lists.length === 0) || (activeTab === 'my-lists' && myLists.length === 0)) && (
          <div className="text-center py-12">
            <ListIcon size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'discover' ? 'No lists found' : 'No lists created yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'discover' 
                ? 'Try adjusting your search or check back later' 
                : 'Create your first list to organize your favorite media'
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create List
            </button>
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {showCreateModal && renderCreateListForm()}
    </div>
  )
}
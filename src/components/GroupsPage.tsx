'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowLeft,
  Search,
  Plus,
  Users,
  Globe,
  Lock,
  MessageCircle,
  Calendar,
  Star,
  Settings,
  Crown,
  Eye,
  Clock,
  Hash,
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Palette,
  Shield,
  Activity
} from 'lucide-react'
import { AuthService, type AuthUser } from '@/services/authService'

interface Group {
  id: string
  name: string
  description: string
  image?: string
  category: 'games' | 'movies' | 'music' | 'books' | 'all'
  subcategory?: string
  access: 'public' | 'private'
  memberCount: number
  lastActivity: string
  isJoined: boolean
  isModerator?: boolean
  isOwner?: boolean
  rules?: string[]
  discussions?: Discussion[]
  currentlyReading?: string[]
  currentlyPlaying?: string[]
  currentlyWatching?: string[]
  currentlyListening?: string[]
  moderators?: User[]
}

interface Discussion {
  id: string
  title: string
  author: string
  authorAvatar?: string
  content: string
  replies: number
  lastReply: string
  isPinned?: boolean
}

interface User {
  id: string
  name: string
  avatar?: string
  role: 'owner' | 'moderator' | 'member'
}

interface GroupsPageProps {
  onBack: () => void
}

export default function GroupsPage({ onBack }: GroupsPageProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [activeTab, setActiveTab] = useState<'discover' | 'joined' | 'create'>('discover')
  const [searchQuery, setSearchQuery] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Sample data
  const sampleGroups: Group[] = [
    {
      id: '1',
      name: 'Indie Game Enthusiasts',
      description: 'Discover and discuss the best indie games from around the world',
      category: 'games',
      subcategory: 'indie games',
      access: 'public',
      memberCount: 1247,
      lastActivity: '2 minutes ago',
      isJoined: false,
      rules: [
        'Be respectful to all members',
        'No spam or self-promotion',
        'Stay on topic - indie games only',
        'Share your discoveries!'
      ],
      discussions: [
        {
          id: '1',
          title: 'What indie game blew your mind this year?',
          author: 'GameMaster42',
          content: 'Looking for recommendations...',
          replies: 23,
          lastReply: '5 minutes ago',
          isPinned: true
        }
      ],
      currentlyPlaying: ['Hades II', 'Pizza Tower', 'Celeste'],
      moderators: [
        { id: '1', name: 'GameMaster42', role: 'owner' },
        { id: '2', name: 'IndieHunter', role: 'moderator' }
      ]
    },
    {
      id: '2',
      name: 'Cozy Book Club',
      description: 'A warm community for lovers of cozy, feel-good literature',
      category: 'books',
      subcategory: 'cozy fiction',
      access: 'public',
      memberCount: 856,
      lastActivity: '15 minutes ago',
      isJoined: true,
      isModerator: true,
      currentlyReading: ['The Seven Husbands of Evelyn Hugo', 'Beach Read'],
      moderators: [
        { id: '3', name: 'BookwormBella', role: 'owner' },
        { id: '4', name: 'CozyReader', role: 'moderator' }
      ]
    },
    {
      id: '3',
      name: 'Film Noir Society',
      description: 'Exploring the shadows and mysteries of classic and modern noir',
      category: 'movies',
      subcategory: 'film noir',
      access: 'private',
      memberCount: 342,
      lastActivity: '1 hour ago',
      isJoined: false,
      currentlyWatching: ['The Maltese Falcon', 'Chinatown', 'Blade Runner 2049']
    },
    {
      id: '4',
      name: 'Lo-Fi Hip Hop Community',
      description: 'Chill beats and study vibes for productivity and relaxation',
      category: 'music',
      subcategory: 'lo-fi hip hop',
      access: 'public',
      memberCount: 2134,
      lastActivity: '30 minutes ago',
      isJoined: true,
      currentlyListening: ['Nujabes - Aruarian Dance', 'Jinsang - Life', 'Idealism - Hiraeth']
    }
  ]

  useEffect(() => {
    loadUser()
    loadGroups()
  }, [])

  const loadUser = async () => {
    const user = await AuthService.getCurrentUser()
    setCurrentUser(user)
  }

  const loadGroups = async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setGroups(sampleGroups)
      setJoinedGroups(sampleGroups.filter(g => g.isJoined))
      setIsLoading(false)
    }, 1000)
  }

  const handleJoinGroup = async (groupId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, isJoined: true, memberCount: group.memberCount + 1 }
        : group
    ))
    
    const joinedGroup = groups.find(g => g.id === groupId)
    if (joinedGroup) {
      setJoinedGroups(prev => [...prev, { ...joinedGroup, isJoined: true }])
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, isJoined: false, memberCount: group.memberCount - 1 }
        : group
    ))
    
    setJoinedGroups(prev => prev.filter(g => g.id !== groupId))
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

  const getTimeAgo = (timeString: string) => {
    return timeString // Simple implementation
  }

  const renderGroupCard = (group: Group) => (
    <div 
      key={group.id}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedGroup(group)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getCategoryIcon(group.category)}
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              {group.access === 'private' && <Lock size={14} className="text-gray-400" />}
              {group.isModerator && <Crown size={14} className="text-yellow-500" />}
            </div>
            <p className="text-gray-600 text-sm mb-3">{group.description}</p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Users size={12} />
                <span>{group.memberCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={12} />
                <span>{group.lastActivity}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Hash size={12} />
                <span>{group.subcategory}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 capitalize">
            {group.category} • {group.access}
          </div>
          
          {group.isJoined ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleLeaveGroup(group.id)
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Joined
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleJoinGroup(group.id)
              }}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderGroupDetails = (group: Group) => (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setSelectedGroup(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h1 className="text-lg font-semibold">{group.name}</h1>
          
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Group Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-start space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              {getCategoryIcon(group.category)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{group.name}</h2>
              <p className="text-gray-600 mb-3">{group.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users size={16} />
                  <span>{group.memberCount.toLocaleString()} members</span>
                </div>
                <div className="flex items-center space-x-1">
                  {group.access === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                  <span className="capitalize">{group.access}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Activity size={16} />
                  <span>Active {group.lastActivity}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {group.isJoined ? (
              <button
                onClick={() => handleLeaveGroup(group.id)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Leave Group
              </button>
            ) : (
              <button
                onClick={() => handleJoinGroup(group.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Join Group
              </button>
            )}
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Share
            </button>
          </div>
        </div>

        {/* Group Rules */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Shield size={20} className="mr-2 text-green-600" />
            Group Rules
          </h3>
          <div className="space-y-2">
            {group.rules?.map((rule, index) => (
              <div key={index} className="flex items-start space-x-3">
                <span className="text-sm text-gray-500 mt-0.5">{index + 1}.</span>
                <p className="text-gray-700 text-sm">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Currently Active */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Eye size={20} className="mr-2 text-blue-600" />
            Currently Active
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.currentlyReading && group.currentlyReading.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <BookOpen size={16} className="mr-2 text-orange-600" />
                  Reading
                </h4>
                <div className="space-y-1">
                  {group.currentlyReading.map((item, index) => (
                    <p key={index} className="text-sm text-gray-600">• {item}</p>
                  ))}
                </div>
              </div>
            )}

            {group.currentlyPlaying && group.currentlyPlaying.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Gamepad2 size={16} className="mr-2 text-green-600" />
                  Playing
                </h4>
                <div className="space-y-1">
                  {group.currentlyPlaying.map((item, index) => (
                    <p key={index} className="text-sm text-gray-600">• {item}</p>
                  ))}
                </div>
              </div>
            )}

            {group.currentlyWatching && group.currentlyWatching.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Film size={16} className="mr-2 text-blue-600" />
                  Watching
                </h4>
                <div className="space-y-1">
                  {group.currentlyWatching.map((item, index) => (
                    <p key={index} className="text-sm text-gray-600">• {item}</p>
                  ))}
                </div>
              </div>
            )}

            {group.currentlyListening && group.currentlyListening.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Music size={16} className="mr-2 text-purple-600" />
                  Listening
                </h4>
                <div className="space-y-1">
                  {group.currentlyListening.map((item, index) => (
                    <p key={index} className="text-sm text-gray-600">• {item}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Discussions */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MessageCircle size={20} className="mr-2 text-blue-600" />
              Discussions
            </h3>
            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              New Discussion
            </button>
          </div>

          <div className="space-y-3">
            {group.discussions?.map((discussion) => (
              <div key={discussion.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {discussion.isPinned && <Star size={14} className="text-yellow-500" />}
                      <h4 className="font-medium text-gray-900">{discussion.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{discussion.content}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>by {discussion.author}</span>
                      <span>{discussion.replies} replies</span>
                      <span>Last reply {discussion.lastReply}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Moderators */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Crown size={20} className="mr-2 text-yellow-600" />
            Moderators
          </h3>
          
          <div className="space-y-3">
            {group.moderators?.map((moderator) => (
              <div key={moderator.id} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {moderator.avatar ? (
                    <img src={moderator.avatar} alt={moderator.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-blue-600 font-medium">{moderator.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{moderator.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{moderator.role}</p>
                </div>
                {moderator.role === 'owner' && <Crown size={16} className="text-yellow-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderCreateGroupForm = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create New Group</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your group..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Media</option>
                  <option value="games">Games</option>
                  <option value="movies">Movies</option>
                  <option value="books">Books</option>
                  <option value="music">Music</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., indie games, sci-fi, etc."
              />
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
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  if (selectedGroup) {
    return renderGroupDetails(selectedGroup)
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
          
          <h1 className="text-lg font-semibold">Groups</h1>
          
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
              placeholder="Search groups by name, category, or topic..."
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
            Discover Groups
          </button>
          <button
            onClick={() => setActiveTab('joined')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'joined' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Groups ({joinedGroups.length})
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3">Loading groups...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeTab === 'discover' 
              ? groups.filter(group => 
                  group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  group.category.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(renderGroupCard)
              : joinedGroups.filter(group => 
                  group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  group.description.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(renderGroupCard)
            }
          </div>
        )}

        {/* Empty State */}
        {!isLoading && ((activeTab === 'discover' && groups.length === 0) || (activeTab === 'joined' && joinedGroups.length === 0)) && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'discover' ? 'No groups found' : 'No groups joined yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'discover' 
                ? 'Try adjusting your search or create a new group' 
                : 'Discover and join groups to connect with like-minded people'
              }
            </p>
            <button
              onClick={() => activeTab === 'discover' ? setShowCreateModal(true) : setActiveTab('discover')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {activeTab === 'discover' ? 'Create Group' : 'Discover Groups'}
            </button>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && renderCreateGroupForm()}
    </div>
  )
}
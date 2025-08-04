'use client'
import { ArrowLeft, Check, Clock, Zap, Users, Star, Sparkles, CheckCircle, Smartphone } from 'lucide-react'

interface RoadmapPageProps {
  onBack: () => void
}

export default function RoadmapPage({ onBack }: RoadmapPageProps) {
  const roadmapPhases = [
    {
      id: 'phase1',
      title: 'Phase 1 - Foundations',
      status: 'completed',
      description: 'Core app structure and basic features',
      items: [
        { text: 'BottomNavigation with Apple design', completed: true },
        { text: 'Movies/Music/Books/Games APIs integration', completed: true },
        { text: 'Discover & Search pages', completed: true },
        { text: 'Content browsing optimization', completed: true },
        { text: 'Responsive design & mobile optimization', completed: true }
      ]
    },
    {
      id: 'phase2', 
      title: 'Phase 2 - Core Features',
      status: 'completed',
      description: 'Essential functionality and data persistence',
      items: [
        { text: 'Database setup with Supabase', completed: true },
        { text: 'Library management system', completed: true },
        { text: 'Content detail modals', completed: true },
        { text: 'Status tracking (Want/Playing/Completed)', completed: true },
        { text: 'Basic recommendation algorithms', completed: true }
      ]
    },
    {
      id: 'phase3',
      title: 'Phase 3 - Enhanced Experience',
      status: 'in-progress', 
      description: 'Improved user experience and mobile features',
      items: [
        { text: 'Progressive Web App (PWA) support', completed: true, isNew: true },
        { text: 'Push notifications system', completed: true },
        { text: 'In-app notifications with real-time updates', completed: true },
        { text: 'User reviews and ratings', completed: true },
        { text: 'Advanced filtering and sorting', completed: true }
      ]
    },
    {
      id: 'phase4',
      title: 'Phase 4 - Social Features',
      status: 'completed', 
      description: 'Connect with friends and share recommendations',
      items: [
        { text: 'User authentication (Google/Apple)', completed: true },
        { text: 'Friend system (add/remove friends)', completed: true },
        { text: 'Friend Recommendations with personal messages', completed: true },
        { text: 'Activity Feed (see friends\' activities)', completed: true },
        { text: 'Public profiles and sharing', completed: true }
      ]
    },
    {
      id: 'phase5',
      title: 'Phase 5 - Advanced Features',
      status: 'future',
      description: 'Premium features and platform expansion',
      items: [
        { text: 'AI-powered smart recommendations', completed: false },
        { text: 'Advanced analytics dashboard', completed: false },
        { text: 'Custom themes and personalization', completed: false },
        { text: 'Groups & Communities with discussions', completed: true },
        { text: 'Native mobile apps (iOS/Android)', completed: false },
        { text: 'Public API for developers', completed: false }
      ]
    },
    {
      id: 'phase6',
      title: 'Phase 6 - Community Features & Lists',
      status: 'completed',
      description: 'Community features and content organization',
      items: [
        { text: 'Custom Lists with mixed media types', completed: true, isNew: true },
        { text: 'List sharing, likes, and comments system', completed: true, isNew: true },
        { text: 'Profile pages with public/private sections', completed: true, isNew: true },
        { text: 'Friends system with search and management', completed: true, isNew: true },
        { text: 'Avatar system with Google Photos integration', completed: true, isNew: true },
        { text: 'Book Detail Modal: Awards & Recognition section', completed: true, isNew: true },
        { text: 'Book Detail Modal: Movie/TV/Series adaptations section', completed: true, isNew: true },
        { text: 'Book Detail Modal: Book quotes and memorable citations', completed: true, isNew: true },
        { text: 'Book Detail Modal: Local bookstore finder with Claude AI suggestions', completed: false, isNew: true },
        { text: 'Amazon Affiliate integration across all product pages for monetization', completed: false, isNew: true },
        { text: 'Music Detail Modal: Shazam integration for instant music recognition', completed: false, isNew: true },
        { text: 'Music Detail Modal: Direct Spotify/Apple Music playback integration', completed: false, isNew: true },
        { text: 'Enhanced Spotify & Apple Music account linking', completed: false, isNew: true },
        { text: 'Audio visualizer with live waveform animation synced to beat', completed: false, isNew: true },
        { text: 'Dynamic color variations based on music rhythm & BPM', completed: false, isNew: true },
        { text: 'Rewards system for active users (badges, points, exclusive content)', completed: false },
        { text: 'Enhanced profile with Top 5 lists and statistics', completed: true },
        { text: 'AI recommendation engine based on listening/viewing patterns', completed: false },
        { text: 'Live chat rooms for media discussions (like Chinese platforms)', completed: false, isNew: true },
        { text: 'Music listening parties organization feature', completed: false },
        { text: '"Favorite" status for music tracks & albums (beyond want/listened)', completed: false, isNew: true }
      ]
    },
    {
      id: 'phase7',
      title: 'Phase 7 - Advanced Community Features',
      status: 'in-progress',
      description: 'Advanced community and content features',
      items: [
        { text: 'Book Detail Modal: Awards & Recognition section', completed: true, isNew: true },
        { text: 'Book Detail Modal: Movie/TV/Series adaptations section', completed: true, isNew: true },
        { text: 'Book Detail Modal: Book quotes and memorable citations', completed: true, isNew: true },
        { text: 'Groups with search, create, join functionality', completed: true, isNew: true },
        { text: 'Group discussions and mini-forum features', completed: true, isNew: true },
        { text: 'Currently reading/playing/listening tracking in groups', completed: true, isNew: true },
        { text: 'Group moderation system with roles', completed: true, isNew: true },
        { text: 'Book Detail Modal: Local bookstore finder with Claude AI suggestions', completed: false, isNew: true },
        { text: 'Amazon Affiliate integration across all product pages for monetization', completed: false, isNew: true },
        { text: 'Music Detail Modal: Shazam integration for instant music recognition', completed: false, isNew: true },
        { text: 'Music Detail Modal: Direct Spotify/Apple Music playback integration', completed: false, isNew: true },
        { text: 'Enhanced Spotify & Apple Music account linking', completed: false, isNew: true },
        { text: 'Audio visualizer with live waveform animation synced to beat', completed: false, isNew: true },
        { text: 'Dynamic color variations based on music rhythm & BPM', completed: false, isNew: true },
        { text: 'AI recommendation engine based on listening/viewing patterns', completed: false },
        { text: 'Live chat rooms for media discussions (like Chinese platforms)', completed: false, isNew: true },
        { text: 'Music listening parties organization feature', completed: false },
        { text: '"Favorite" status for music tracks & albums (beyond want/listened)', completed: false, isNew: true }
      ]
    },
    {
      id: 'phase8',
      title: 'Phase 8 - Gamification & Achievements',
      status: 'planned',
      description: 'Badge system and user engagement features',
      items: [
        { text: 'Achievement system with collectible badges', completed: false, isNew: true },
        { text: 'Progress animations when adding media to library', completed: false, isNew: true },
        { text: 'Milestone celebrations (100 movies watched, 50 books read)', completed: false, isNew: true },
        { text: 'Leaderboards and rankings among friends', completed: false, isNew: true },
        { text: 'Seasonal challenges and limited-time events', completed: false, isNew: true },
        { text: 'Badge showcase on user profile', completed: false, isNew: true },
        { text: 'Streak tracking (daily activity, reviews)', completed: false, isNew: true },
        { text: 'Experience points and user levels', completed: false, isNew: true }
      ]
    }
  ]

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { 
          color: 'bg-green-50 border-green-200 text-green-700',
          icon: <CheckCircle size={16} className="text-green-600" />,
          label: 'Completed'
        }
      case 'in-progress':
        return {
          color: 'bg-blue-50 border-blue-200 text-blue-700', 
          icon: <Zap size={16} className="text-blue-600" />,
          label: 'In Progress'
        }
      case 'planned':
        return {
          color: 'bg-orange-50 border-orange-200 text-orange-700', 
          icon: <Clock size={16} className="text-orange-600" />,
          label: 'Planned'
        }
      case 'future':
        return {
          color: 'bg-gray-50 border-gray-200 text-gray-700',
          icon: <Star size={16} className="text-gray-600" />,
          label: 'Future'
        }
      default:
        return {
          color: 'bg-gray-50 border-gray-200 text-gray-700',
          icon: <Clock size={16} className="text-gray-600" />,
          label: 'Unknown'
        }
    }
  }

  const calculateProgress = (items: any[]) => {
    const completed = items.filter(item => item.completed).length
    return Math.round((completed / items.length) * 100)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-3"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Roadmap</h1>
            <p className="text-sm text-gray-500">Track Stackr's development progress</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-24">
        {/* Overview Stats */}
        <div className="px-4 py-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Development Overview</h2>
              <p className="text-gray-600 text-sm">
                Building Stackr step by step. Track our progress and see what's coming next.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="text-lg font-bold text-green-600">
                  {roadmapPhases.reduce((acc, phase) => 
                    acc + phase.items.filter(item => item.completed).length, 0
                  )}
                </div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="text-lg font-bold text-blue-600">
                  {roadmapPhases.reduce((acc, phase) => 
                    acc + phase.items.filter(item => !item.completed).length, 0
                  )}
                </div>
                <div className="text-xs text-gray-600">Remaining</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="text-lg font-bold text-gray-900">{roadmapPhases.length}</div>
                <div className="text-xs text-gray-600">Phases</div>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Phases */}
        <div className="px-4 py-6 space-y-6">
          {roadmapPhases.map((phase, phaseIndex) => {
            const statusInfo = getStatusInfo(phase.status)
            const progress = calculateProgress(phase.items)
            
            return (
              <div key={phase.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Phase Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{phase.title}</h3>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>
                    {(phase.status === 'in-progress' || phase.status === 'completed') && (
                      <div className="text-sm font-medium text-green-600">{progress}%</div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{phase.description}</p>
                  
                  {/* Progress Bar */}
                  {(phase.status === 'in-progress' || phase.status === 'completed') && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          phase.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Phase Items */}
                <div className="p-4">
                  <div className="space-y-3">
                    {phase.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          item.completed 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}>
                          {item.completed && <Check size={12} className="text-white" />}
                        </div>
                        
                        <div className="flex-1 flex items-center space-x-2">
                          <span className={`text-sm ${
                            item.completed 
                              ? 'text-gray-500 line-through' 
                              : 'text-gray-900'
                          }`}>
                            {item.text}
                          </span>
                          {item.isNew && (
                            <div className="flex items-center space-x-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              {item.text.includes('PWA') ? <Smartphone size={10} /> : <Sparkles size={10} />}
                              <span>New</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Note */}
        <div className="px-4 py-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-start space-x-3">
              <Users size={20} className="text-gray-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Community Driven</h4>
                <p className="text-sm text-gray-600">
                  This roadmap evolves based on user feedback and community needs. 
                  Got suggestions? We'd love to hear them!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
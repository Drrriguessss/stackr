'use client'
import { ArrowLeft, Check, Clock, Zap, Users, Star, Sparkles } from 'lucide-react'

interface RoadmapPageProps {
  onBack: () => void
}

export default function RoadmapPage({ onBack }: RoadmapPageProps) {
  const roadmapPhases = [
    {
      id: 'phase1',
      title: 'Phase 1 - Foundations',
      status: 'in-progress',
      description: 'Core app structure and basic features',
      items: [
        { text: 'BottomNavigation with Apple design', completed: true },
        { text: 'Movies/Music/Books APIs integration', completed: false },
        { text: 'Discover & Search pages', completed: false },
        { text: 'Content browsing optimization', completed: false }
      ]
    },
    {
      id: 'phase2', 
      title: 'Phase 2 - Core Features',
      status: 'planned',
      description: 'Essential functionality and data persistence',
      items: [
        { text: 'Database setup with Supabase', completed: false },
        { text: 'User authentication (Google/Apple)', completed: false },
        { text: 'Advanced Library features', completed: false },
        { text: 'Basic recommendation algorithms', completed: false },
        { text: 'User stats and analytics', completed: false }
      ]
    },
    {
      id: 'phase3',
      title: 'Phase 3 - Social Features', 
      status: 'planned',
      description: 'Connect with friends and share recommendations',
      items: [
        { text: 'Friend system (add/remove friends)', completed: false },
        { text: 'Friend Recommendations with personal messages', completed: false, isNew: true },
        { text: 'Activity Feed (see friends\' activities)', completed: false },
        { text: 'Groups & Communities', completed: false },
        { text: 'Public profiles', completed: false }
      ]
    },
    {
      id: 'phase4',
      title: 'Phase 4 - Advanced Social',
      status: 'future', 
      description: 'Rich social interactions and community features',
      items: [
        { text: 'Reviews & Ratings system', completed: false },
        { text: 'Challenges between friends', completed: false },
        { text: 'Social stats and comparisons', completed: false },
        { text: 'Collaborative lists', completed: false },
        { text: 'Comments & Discussions', completed: false }
      ]
    },
    {
      id: 'phase5',
      title: 'Phase 5 - Pro Features',
      status: 'future',
      description: 'Advanced features and platform expansion',
      items: [
        { text: 'AI-powered recommendations', completed: false },
        { text: 'Advanced analytics dashboard', completed: false },
        { text: 'Custom themes and personalization', completed: false },
        { text: 'Native mobile apps (iOS/Android)', completed: false },
        { text: 'Public API for developers', completed: false }
      ]
    }
  ]

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in-progress':
        return { 
          color: 'bg-green-50 border-green-200 text-green-700',
          icon: <Zap size={16} className="text-green-600" />,
          label: 'In Progress'
        }
      case 'planned':
        return {
          color: 'bg-blue-50 border-blue-200 text-blue-700', 
          icon: <Clock size={16} className="text-blue-600" />,
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
                <div className="text-lg font-bold text-gray-900">5</div>
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
                    {phase.status === 'in-progress' && (
                      <div className="text-sm font-medium text-green-600">{progress}%</div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{phase.description}</p>
                  
                  {/* Progress Bar */}
                  {phase.status === 'in-progress' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
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
                              <Sparkles size={10} />
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
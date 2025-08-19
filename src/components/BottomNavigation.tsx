'use client'
import { useState } from 'react'
import { Rss, Library, Compass, Search, MoreHorizontal } from 'lucide-react'

interface BottomNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const mainTabs = [
    { id: 'feed', label: 'Feed', icon: Rss },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
  ]

  const moreMenuItems = [
    { id: 'profile', label: 'Profile', description: 'Manage your account settings' },
    { id: 'friends', label: 'Friends', description: 'Connect with other users' },
    { id: 'groups', label: 'Groups', description: 'Join communities' },
    { id: 'lists', label: 'Lists', description: 'Create custom collections' },
    { id: 'roadmap', label: 'Roadmap', description: 'See what\'s coming next' },
    { id: 'contact', label: 'Contact Us', description: 'Get help and support' },
    { id: 'signout', label: 'Sign Out', description: '', isDanger: true },
  ]

  const handleTabClick = (tabId: string) => {
    if (tabId === 'more') {
      setShowMoreMenu(true)
    } else {
      onTabChange(tabId)
      setShowMoreMenu(false)
    }
  }

  const handleMoreItemClick = (itemId: string) => {
    console.log(`Clicked: ${itemId}`)
    setShowMoreMenu(false)
    
    // Callback pour navigation vers les pages
    if (onTabChange) {
      onTabChange(itemId)
    }
  }

  const TabButton = ({ tab, isActive, onClick }: { tab: any, isActive: boolean, onClick: () => void }) => {
    const Icon = tab.icon
    
    return (
      <button
        onClick={onClick}
        className={`flex items-center justify-center py-3 px-2 min-w-0 flex-1 transition-all duration-200 relative ${
          isActive 
            ? 'text-white' 
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <div className={`transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
          {/* Icône agrandie */}
          <Icon 
            size={24} 
            className={`transition-all duration-300 ${
              isActive ? 'stroke-2' : 'stroke-1.5'
            }`}
          />
        </div>
      </button>
    )
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black px-4 py-2 z-40">
        <div className="flex items-center justify-center max-w-md mx-auto">
          {mainTabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => handleTabClick(tab.id)}
            />
          ))}
          
          {/* More Button */}
          <button
            onClick={() => handleTabClick('more')}
            className="flex items-center justify-center py-3 px-2 min-w-0 flex-1 text-gray-400 hover:text-white transition-all duration-200"
          >
            <div className="transition-all duration-300 scale-100 hover:scale-110">
              <MoreHorizontal 
                size={24} 
                className="stroke-1.5"
              />
            </div>
          </button>
        </div>
      </div>

      {/* More Menu Overlay */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 transition-all duration-300"
            onClick={() => setShowMoreMenu(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50 animate-slide-up border-t border-gray-100">
            {/* Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-8 h-1 bg-gray-200 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-xl font-semibold text-black">More</h3>
            </div>

            {/* Menu Items */}
            <div className="px-4 py-2 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {moreMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMoreItemClick(item.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 text-left group ${
                      item.isDanger ? 'hover:bg-red-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className={`font-medium ${item.isDanger ? 'text-red-600' : 'text-black'}`}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div className={`transition-colors ${
                      item.isDanger 
                        ? 'text-red-400 group-hover:text-red-600' 
                        : 'text-gray-300 group-hover:text-gray-500'
                    }`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Safe Area for iPhone */}
            <div className="h-6 bg-white" />
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  )
}
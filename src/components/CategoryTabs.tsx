'use client'

interface CategoryTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  const tabs = [
    { id: 'games', name: 'Games', shortName: 'Games', emoji: '🎮' },
    { id: 'movies', name: 'Movies/Series', shortName: 'Movies', emoji: '🎬' },
    { id: 'music', name: 'Music', shortName: 'Music', emoji: '🎵' },
    { id: 'books', name: 'Books', shortName: 'Books', emoji: '📚' },
  ]

  return (
    <div className="flex space-x-1 bg-gray-50 p-1 rounded-xl mb-8 border border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 text-center text-sm sm:text-base flex items-center justify-center space-x-2 ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200 font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <span className="text-base">{tab.emoji}</span>
          <div>
            {/* Affiche le nom court sur mobile, nom complet sur desktop */}
            <span className="sm:hidden">{tab.shortName}</span>
            <span className="hidden sm:inline">{tab.name}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
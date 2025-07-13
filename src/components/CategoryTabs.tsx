'use client'

interface CategoryTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  const tabs = [
    { id: 'games', name: 'Games', shortName: 'Games' },
    { id: 'movies', name: 'Movies/Series', shortName: 'Movies' },
    { id: 'music', name: 'Music', shortName: 'Music' },
    { id: 'books', name: 'Books', shortName: 'Books' },
  ]

  return (
    <div className="flex space-x-1 bg-gray-800 p-1 rounded-xl mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 text-center text-sm sm:text-base ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-lg font-semibold'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {/* Affiche le nom court sur mobile, nom complet sur desktop */}
          <span className="sm:hidden">{tab.shortName}</span>
          <span className="hidden sm:inline">{tab.name}</span>
        </button>
      ))}
    </div>
  )
}
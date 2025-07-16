'use client'

interface CategoryTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  const tabs = [
    { id: 'books', name: 'Books' },
    { id: 'games', name: 'Games' },
    { id: 'movies', name: 'Movies' },
    { id: 'music', name: 'Music' },
  ]

  return (
    <div className="flex space-x-8 mb-8 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`pb-3 text-base font-medium transition-colors relative ${
            activeTab === tab.id
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.name}
          {/* Soulignement pour l'onglet actif */}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
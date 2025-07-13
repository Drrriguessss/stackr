'use client'
import { useState } from 'react'

interface CategoryTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  const tabs = [
    { id: 'games', name: 'Games' },
    { id: 'movies', name: 'Movies/Series' },
    { id: 'music', name: 'Music' },
    { id: 'books', name: 'Books' },
  ]

  return (
    <div className="flex space-x-1 bg-gray-800 p-1 rounded-xl mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 text-center ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-lg font-semibold'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {tab.name}
        </button>
      ))}
    </div>
  )
}
'use client'
import { useState } from 'react'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import ContentCard from '@/components/ContentCard'
import { sampleContent, ContentItem } from '@/data/sampleContent'

export default function Home() {
  const [activeTab, setActiveTab] = useState('games')
  const [userLibrary, setUserLibrary] = useState<Array<ContentItem & { status: string }>>([])

  const handleAddToLibrary = (item: ContentItem, status: string) => {
    const libraryItem = {
      ...item,
      status,
      addedAt: new Date().toISOString(),
    }
    
    setUserLibrary(prev => {
      const existing = prev.find(lib => lib.id === item.id)
      if (existing) {
        return prev.map(lib => lib.id === item.id ? { ...lib, status } : lib)
      }
      return [...prev, libraryItem]
    })
    
    // Feedback avec les nouveaux labels
    const statusLabels = {
      games: { want: 'Want to Play', current: 'Currently Playing', completed: 'Completed' },
      movies: { want: 'Want to Watch', current: 'Currently Watching', completed: 'Watched' },
      music: { want: 'Want to Listen', completed: 'Listened to' },
      books: { want: 'Want to Read', current: 'Currently Reading', completed: 'Read' }
    }
    
    const categoryLabels = statusLabels[activeTab as keyof typeof statusLabels] || {}
    const statusLabel = categoryLabels[status as keyof typeof categoryLabels] || status
    
    console.log(`✅ "${item.title}" → ${statusLabel}`)
  }

  const currentContent = sampleContent[activeTab as keyof typeof sampleContent] || []

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Section Popular this week */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Popular this week</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {currentContent.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                category={activeTab}
                onAddToLibrary={handleAddToLibrary}
              />
            ))}
          </div>
        </section>

        {/* Section Your Library (si il y a des items) */}
        {userLibrary.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-8">Your Library</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userLibrary.slice(0, 6).map((item) => {
                // Obtenir le bon label selon la catégorie
                const getStatusLabel = (status: string, originalCategory: string) => {
                  const statusMappings = {
                    games: { want: 'Want to Play', current: 'Currently Playing', completed: 'Completed' },
                    movies: { want: 'Want to Watch', current: 'Currently Watching', completed: 'Watched' },
                    music: { want: 'Want to Listen', completed: 'Listened to' },
                    books: { want: 'Want to Read', current: 'Currently Reading', completed: 'Read' }
                  }
                  
                  // Détecter la catégorie originale de l'item
                  let category = originalCategory
                  if (item.author) category = 'books'
                  else if (item.artist) category = 'music'
                  else if (item.director) category = 'movies'
                  else category = 'games'
                  
                  const mapping = statusMappings[category as keyof typeof statusMappings] || {}
                  return mapping[status as keyof typeof mapping] || status
                }

                return (
                  <div key={`lib-${item.id}`} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <h3 className="text-white font-semibold mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {item.author || item.artist || item.director}
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'want' ? 'bg-gray-700 text-gray-200' :
                      item.status === 'current' ? 'bg-blue-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {getStatusLabel(item.status, activeTab)}
                    </span>
                  </div>
                )
              })}
            </div>
            
            {userLibrary.length > 6 && (
              <div className="text-center mt-6">
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition-colors">
                  View All ({userLibrary.length})
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
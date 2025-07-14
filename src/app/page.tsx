'use client'
import { useState } from 'react'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import ContentCard from '@/components/ContentCard'
import { sampleContent } from '@/data/sampleContent'

export default function Home() {
  const [activeTab, setActiveTab] = useState('games')
  const [library, setLibrary] = useState<any[]>([])

  // Fonction pour ajouter du contenu à la bibliothèque
  const handleAddToLibrary = (item: any, status: string) => {
    const newItem = {
      ...item,
      status,
      addedAt: new Date().toISOString()
    }
    
    setLibrary(prev => {
      const exists = prev.find(libItem => libItem.id === item.id)
      if (exists) {
        return prev.map(libItem => 
          libItem.id === item.id 
            ? { ...libItem, status, addedAt: new Date().toISOString() }
            : libItem
        )
      }
      return [...prev, newItem]
    })
    
    console.log('Added to library:', newItem)
  }

  // Obtenir le contenu actuel selon l'onglet
  const getCurrentContent = () => {
    switch (activeTab) {
      case 'games':
        return sampleContent.games
      case 'movies':
        return sampleContent.movies
      case 'music':
        return sampleContent.music
      case 'books':
        return sampleContent.books
      default:
        return sampleContent.games
    }
  }

  const currentContent = getCurrentContent()

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header avec recherche */}
      <Header onAddToLibrary={handleAddToLibrary} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Navigation par catégories */}
        <CategoryTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Section Popular this week */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Popular this week</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {currentContent.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onAddToLibrary={handleAddToLibrary}
                category={activeTab}
              />
            ))}
          </div>
        </section>

        {/* Section Your Library */}
        {library.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Your Library</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {library
                .filter(item => item.category === activeTab || !item.category)
                .map((item) => (
                  <div key={`library-${item.id}`} className="relative">
                    <ContentCard
                      item={item}
                      onAddToLibrary={handleAddToLibrary}
                      category={activeTab}
                    />
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {item.status}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
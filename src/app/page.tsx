'use client'
import { useState } from 'react'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import ContentSection from '@/components/ContentSection'
import { sampleContent } from '@/data/sampleContent'

export default function Home() {
  const [activeTab, setActiveTab] = useState('games')
  const [library, setLibrary] = useState<any[]>([])

  const handleAddToLibrary = (item: any, status: string) => {
    const newItem = {
      ...item,
      status,
      addedAt: new Date().toISOString(),
      // Garder la catégorie de l'item si elle existe, sinon utiliser activeTab
      category: item.category || activeTab
    }
    
    console.log('Adding to library:', newItem)
    console.log('Current library:', library)
    
    setLibrary(prev => {
      const exists = prev.find((libItem: any) => libItem.id === item.id)
      if (exists) {
        return prev.map((libItem: any) => 
          libItem.id === item.id 
            ? { ...libItem, status, addedAt: new Date().toISOString() }
            : libItem
        )
      }
      const newLibrary = [...prev, newItem]
      console.log('New library:', newLibrary)
      return newLibrary
    })
  }

  // Configuration des sections par catégorie
  const getSections = () => {
    const allContent = getCurrentContent()
    
    // Diviser le contenu en 3 sections de 2 items chacune
    const popularItems = allContent.slice(0, 2)
    const topRatedItems = allContent.slice(2, 4) 
    const editorPicksItems = allContent.slice(4, 6)

    const sectionConfig = {
      games: [
        { title: 'Popular this week', items: popularItems },
        { title: 'Top rated of all time', items: topRatedItems },
        { title: "Editor's Choice", items: editorPicksItems }
      ],
      movies: [
        { title: 'Popular this week', items: popularItems },
        { title: 'Highly rated', items: topRatedItems },
        { title: 'Staff picks', items: editorPicksItems }
      ],
      music: [
        { title: 'Popular this week', items: popularItems },
        { title: 'Top albums', items: topRatedItems },
        { title: 'Hidden gems', items: editorPicksItems }
      ],
      books: [
        { title: 'Popular this week', items: popularItems },
        { title: 'Bestsellers', items: topRatedItems },
        { title: 'Must reads', items: editorPicksItems }
      ]
    }

    return sectionConfig[activeTab as keyof typeof sectionConfig] || sectionConfig.games
  }

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'games': return sampleContent.games
      case 'movies': return sampleContent.movies
      case 'music': return sampleContent.music
      case 'books': return sampleContent.books
      default: return sampleContent.games
    }
  }

  const sections = getSections()

  return (
    <div className="min-h-screen bg-gray-950">
      <Header onAddToLibrary={handleAddToLibrary} />
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <CategoryTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Sections horizontales scrollables */}
        <div className="space-y-6 sm:space-y-8">
          {sections.map((section, index) => (
            <ContentSection
              key={`${activeTab}-${index}`}
              title={section.title}
              items={section.items}
              category={activeTab}
              onAddToLibrary={handleAddToLibrary}
              library={library}
            />
          ))}
        </div>

        {/* Section Your Library */}
        {library.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <ContentSection
              title="Your Library"
              items={library.filter((item: any) => item.category === activeTab)}
              category={activeTab}
              onAddToLibrary={handleAddToLibrary}
              library={library}
            />
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import ContentSection from '@/components/ContentSection'
import { sampleContent } from '@/data/sampleContent'
import { discoverSections, sectionData } from '@/data/discoverConfig'

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
      // Éviter les doublons
      const exists = prev.find(libItem => libItem.id === item.id)
      if (exists) {
        // Mettre à jour le statut si l'item existe déjà
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

  // Obtenir le contenu selon les IDs configurés
  const getContentByIds = (ids: number[]) => {
    const allContent = {
      games: sampleContent.games,
      movies: sampleContent.movies,
      music: sampleContent.music,
      books: sampleContent.books
    }

    const currentContent = allContent[activeTab as keyof typeof allContent] || []
    
    return ids
      .map(id => currentContent.find(item => item.id === id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
  }

  // Obtenir les sections pour l'onglet actuel
  const getCurrentSections = () => {
    const sections = discoverSections[activeTab as keyof typeof discoverSections] || []
    const data = sectionData[activeTab as keyof typeof sectionData] || {}
    
    return sections.map(section => ({
      ...section,
      items: getContentByIds(data[section.id as keyof typeof data] || [])
    }))
  }

  const currentSections = getCurrentSections()

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

        {/* Sections de découverte */}
        <div className="space-y-8">
          {currentSections.map((section) => (
            <ContentSection
              key={section.id}
              title={section.title}
              items={section.items}
              category={activeTab}
              onAddToLibrary={handleAddToLibrary}
            />
          ))}
        </div>

        {/* Section Your Library (si la bibliothèque n'est pas vide) */}
        {library.length > 0 && (
          <div className="mt-16">
            <ContentSection
              title="Your Library"
              items={library.filter(item => item.category === activeTab || !item.category)}
              category={activeTab}
              onAddToLibrary={handleAddToLibrary}
            />
          </div>
        )}
      </div>
    </div>
  )
}
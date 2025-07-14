'use client'
import { useState } from 'react'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import ContentSection from '@/components/ContentSection'
import ShelvesSection from '@/components/ShelvesSection'
import GameDetailModal from '@/components/GameDetailModal'
import SearchModal from '@/components/SearchModal'
import { sampleContent } from '@/data/sampleContent'

export default function Home() {
  const [activeTab, setActiveTab] = useState('games')
  const [library, setLibrary] = useState<any[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  // User reviews state - now per game
  const [userReviews, setUserReviews] = useState<{[gameId: number]: any[]}>({})

  const handleAddToLibrary = (item: any, status: string) => {
    const newItem = {
      ...item,
      status,
      addedAt: new Date().toISOString(),
      // Garder la catégorie de l'item si elle existe, sinon utiliser activeTab
      category: item.category || activeTab
    }
    
    setLibrary(prev => {
      const exists = prev.find((libItem: any) => libItem.id === item.id)
      if (exists) {
        return prev.map((libItem: any) => 
          libItem.id === item.id 
            ? { ...libItem, status, addedAt: new Date().toISOString() }
            : libItem
        )
      }
      return [...prev, newItem]
    })
  }

  // Fonction pour mettre à jour un item dans la library
  const handleUpdateItem = (id: string, updates: any) => {
    setLibrary(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, ...updates }
          : item
      )
    )
  }

  // Fonction pour supprimer un item de la library
  const handleDeleteItem = (id: string) => {
    setLibrary(prev => prev.filter(item => item.id !== id))
  }

  // Fonction pour ouvrir fiche produit
  const handleOpenGameDetail = (gameId: string) => {
    setSelectedGameId(gameId)
  }

  // Fonction pour ouvrir la recherche
  const handleOpenSearch = () => {
    setIsSearchOpen(true)
  }

  // Handle review submission - now saves per game
  const handleReviewSubmit = (reviewData: any) => {
    if (!selectedGameId) return;
    
    const newReview = {
      id: Date.now(),
      username: "CurrentUser", // In real app, get from auth
      rating: reviewData.rating,
      review: reviewData.review,
      date: new Date().toISOString().split('T')[0]
    };
    
    setUserReviews(prev => ({
      ...prev,
      [parseInt(selectedGameId)]: [...(prev[parseInt(selectedGameId)] || []), newReview]
    }));
  };

  // Generate unique Google reviews for each game
  const generateGoogleReviews = (gameId: number) => {
    const reviewTemplates = [
      { rating: 5, text: "Amazing game! Hours of entertainment.", author: "John D." },
      { rating: 4, text: "Great graphics and smooth gameplay.", author: "Sarah M." },
      { rating: 5, text: "Best game I've played this year!", author: "Mike R." },
      { rating: 3, text: "Good but could use more content.", author: "Lisa K." },
      { rating: 4, text: "Solid experience overall.", author: "Tom B." },
      { rating: 5, text: "Addictive and well-designed.", author: "Emma W." },
      { rating: 4, text: "Fun gameplay with minor issues.", author: "David L." },
      { rating: 5, text: "Exceeded my expectations!", author: "Anna S." },
      { rating: 4, text: "Worth the money, great value.", author: "Chris P." },
      { rating: 3, text: "Decent game, nothing special.", author: "Nina T." }
    ];
    
    // Use gameId as seed for consistent but unique reviews per game
    const seed = gameId;
    const selectedReviews = [];
    
    for (let i = 0; i < 10; i++) {
      const index = (seed + i * 17) % reviewTemplates.length;
      selectedReviews.push({
        ...reviewTemplates[index],
        id: i + 1,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    
    return selectedReviews;
  };

  // Configuration des sections par catégorie
  const getSections = () => {
    const allContent = getCurrentContent()
    
    // Diviser en 3 sections de 4 items chacune
    const popularItems = allContent.slice(0, 4)
    const topRatedItems = allContent.slice(4, 8) 
    const editorPicksItems = allContent.slice(0, 4) // Réutiliser les premiers pour variety

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
      <Header 
        onAddToLibrary={handleAddToLibrary} 
        library={library}
        onOpenGameDetail={handleOpenGameDetail}
      />
      
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
              onOpenGameDetail={handleOpenGameDetail}
            />
          ))}
        </div>

        {/* Section Your Shelves avec filtres */}
        <ShelvesSection 
          library={library}
          onAddToLibrary={handleAddToLibrary}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onOpenGameDetail={handleOpenGameDetail}
          onOpenSearch={handleOpenSearch}
        />
      </div>

      {/* Modal fiche produit */}
      <GameDetailModal
        isOpen={!!selectedGameId}
        onClose={() => setSelectedGameId(null)}
        gameId={selectedGameId || ''}
        onAddToLibrary={handleAddToLibrary}
        library={library}
        userReviews={selectedGameId ? userReviews[parseInt(selectedGameId)] || [] : []}
        googleReviews={selectedGameId ? generateGoogleReviews(parseInt(selectedGameId)) : []}
        onReviewSubmit={handleReviewSubmit}
      />

      {/* Modal de recherche */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenGameDetail={handleOpenGameDetail}
      />
    </div>
  )
}
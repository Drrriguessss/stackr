'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'
import CategoryTabs from '@/components/CategoryTabs'
import ContentSection from '@/components/ContentSection'
import LibrarySection from '@/components/LibrarySection'
import GameDetailModal from '@/components/GameDetailModal'
import SearchModal from '@/components/SearchModal'
import { sampleContent } from '@/data/sampleContent'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import type { LibraryItem, Review, MediaCategory, MediaStatus, ContentItem } from '@/types'

export default function Home() {
  const [activeTab, setActiveTab] = useState<MediaCategory>('games') // Commencer par Games par défaut
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // User reviews state - now per game
  const [userReviews, setUserReviews] = useState<{[gameId: number]: Review[]}>({})

  // Fonction corrigée pour ajouter à la bibliothèque
  const handleAddToLibrary = (item: any, status: MediaStatus) => {
    // Normaliser l'ID pour éviter les doublons
    const normalizedId = normalizeId(item.id)
    
    const newItem: LibraryItem = {
      id: normalizedId,
      title: item.title,
      category: item.category || activeTab,
      status,
      addedAt: new Date().toISOString(),
      year: item.year || new Date().getFullYear(),
      rating: item.rating || 0,
      image: item.image || item.background_image,
      author: item.author,
      artist: item.artist,
      director: item.director,
      genre: item.genre
    }

    setLibrary(prev => {
      // Rechercher avec l'ID normalisé pour éviter les doublons
      const existingIndex = prev.findIndex((libItem: LibraryItem) => 
        idsMatch(libItem.id, normalizedId)
      )
      
      if (existingIndex !== -1) {
        // Mettre à jour l'item existant
        const updated = [...prev]
        updated[existingIndex] = { 
          ...updated[existingIndex], 
          status, 
          addedAt: new Date().toISOString() 
        }
        return updated
      }
      
      // Ajouter nouvel item
      return [...prev, newItem]
    })
  }

  // Fonction pour mettre à jour un item dans la library
  const handleUpdateItem = (id: string, updates: Partial<LibraryItem>) => {
    setLibrary(prev =>
      prev.map(item =>
        idsMatch(item.id, id)
          ? { ...item, ...updates }
          : item
      )
    )
  }

  // Fonction pour supprimer un item de la library
  const handleDeleteItem = (id: string) => {
    setLibrary(prev => prev.filter(item => !idsMatch(item.id, id)))
  }

  // Fonction pour ouvrir fiche produit
  const handleOpenGameDetail = (gameId: string) => {
    // Normaliser l'ID pour la modal aussi
    const normalizedGameId = normalizeId(gameId)
    setSelectedGameId(normalizedGameId)
  }

  // Fonction pour ouvrir la recherche
  const handleOpenSearch = () => {
    setIsSearchOpen(true)
  }

  // Handle review submission - now saves per game
  const handleReviewSubmit = (reviewData: any) => {
    if (!selectedGameId) return;
    
    const newReview: Review = {
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

  // Generate unique Steam reviews for each game
  const generateSteamReviews = (gameId: number): Review[] => {
    // Base de reviews templates plus variées et réalistes
    const reviewTemplates = [
      { rating: 5, text: "Absolutely incredible! Best game I've played this year. The graphics and gameplay are top-notch.", author: "SteamMaster", helpful: 124 },
      { rating: 4, text: "Great storyline and graphics. Minor bugs but overall excellent experience.", author: "GameReviewer", helpful: 89 },
      { rating: 5, text: "Perfect RPG experience. Hours of entertainment guaranteed. Highly recommended!", author: "RPGLover", helpful: 156 },
      { rating: 3, text: "Good but could use more content. Worth it on sale, not at full price.", author: "CasualGamer", helpful: 45 },
      { rating: 4, text: "Solid experience overall. Great value for money. Some performance issues on older hardware.", author: "ValueHunter", helpful: 78 }
    ];

    // Utiliser gameId comme seed pour des reviews cohérentes mais uniques par jeu
    const seed = gameId;
    const selectedReviews = [];
    
    // Générer 5 reviews par jeu selon l'ID
    const numReviews = 5;

    for (let i = 0; i < numReviews; i++) {
      // Algorithme de sélection pseudo-aléatoire basé sur gameId
      const index = (seed * 17 + i * 23 + gameId * 7) % reviewTemplates.length;
      const template = reviewTemplates[index];
      
      // Varier légèrement les reviews selon le jeu
      const gameSpecificVariations = {
        helpful: Math.max(1, template.helpful + (seed * i % 50) - 25), // Varie de -25 à +25
        daysAgo: (seed * i * 3) % 180 + 1, // 1-180 jours
      };
      
      selectedReviews.push({
        id: `steam_${gameId}_${i}`,
        username: template.author,
        rating: template.rating,
        text: template.text,
        helpful: gameSpecificVariations.helpful,
        date: new Date(Date.now() - gameSpecificVariations.daysAgo * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0],
        platform: 'Steam'
      });
    }

    // Trier par nombre de "helpful" votes décroissant
    return selectedReviews.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
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

    return sectionConfig[activeTab] || sectionConfig.games
  }

  const getCurrentContent = (): ContentItem[] => {
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
    <div className="min-h-screen bg-white">
      {/* Header fixe avec arrière-plan gris */}
      <div className="sticky top-0 z-50 bg-gray-50 border-b border-gray-200">
        {/* Barre de recherche étendue */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex-1 max-w-2xl mx-auto">
            <div 
              className="relative cursor-pointer"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <div className="w-full pl-4 pr-10 py-3 bg-white hover:bg-gray-50 rounded-lg text-gray-500 transition-colors text-sm border border-gray-200 shadow-sm">
                <span>Search...</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center ml-4">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">👤</span>
              </div>
            </button>
          </div>
        </div>

        {/* Onglets de catégories répartis sur toute la largeur */}
        <div className="px-4 sm:px-6">
          <CategoryTabs 
            activeTab={activeTab} 
            onTabChange={(tab) => setActiveTab(tab as MediaCategory)} 
          />
        </div>
      </div>
      
      {/* Contenu scrollable */}
      <div className="bg-white">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
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

          {/* Section Your Library avec filtres */}
          <LibrarySection 
            library={library}
            onAddToLibrary={handleAddToLibrary}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onOpenGameDetail={handleOpenGameDetail}
            onOpenSearch={handleOpenSearch}
          />
        </div>
      </div>

      {/* Modal fiche produit */}
      <GameDetailModal
        isOpen={!!selectedGameId}
        onClose={() => setSelectedGameId(null)}
        gameId={selectedGameId || ''}
        onAddToLibrary={handleAddToLibrary}
        library={library}
        userReviews={selectedGameId ? userReviews[parseInt(selectedGameId)] || [] : []}
        googleReviews={selectedGameId ? generateSteamReviews(parseInt(selectedGameId)) : []}
        onReviewSubmit={handleReviewSubmit}
      />

      {/* Modal de recherche */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddToLibrary={handleAddToLibrary}
        onOpenGameDetail={handleOpenGameDetail}
        library={library}
      />
    </div>
  )
}
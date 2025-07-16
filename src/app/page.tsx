'use client'
import { useState } from 'react'
import Header from '@/components/Header'
import CategoryTabs from '@/components/CategoryTabs'
import ContentSection from '@/components/ContentSection'
import LibrarySection from '@/components/LibrarySection'
import GameDetailModal from '@/components/GameDetailModal'
import SearchModal from '@/components/SearchModal'
import { sampleContent } from '@/data/sampleContent'
import { normalizeId, idsMatch } from '@/utils/idNormalizer'
import type { LibraryItem, Review, MediaCategory, MediaStatus } from '@/types'

export default function Home() {
  const [activeTab, setActiveTab] = useState<MediaCategory>('games')
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // User reviews state - now per game
  const [userReviews, setUserReviews] = useState<{[gameId: number]: Review[]}>({})

  // ✅ FONCTION CORRIGÉE - Normalisation des IDs avec types stricts
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

  // ✅ Generate unique Steam reviews for each game - AMÉLIORÉ
  const generateSteamReviews = (gameId: number): Review[] => {
    // Base de reviews templates plus variées et réalistes
    const reviewTemplates = [
      { rating: 5, text: "Absolutely incredible! Best game I've played this year. The graphics and gameplay are top-notch.", author: "SteamMaster", helpful: 124 },
      { rating: 4, text: "Great storyline and graphics. Minor bugs but overall excellent experience.", author: "GameReviewer", helpful: 89 },
      { rating: 5, text: "Perfect RPG experience. Hours of entertainment guaranteed. Highly recommended!", author: "RPGLover", helpful: 156 },
      { rating: 3, text: "Good but could use more content. Worth it on sale, not at full price.", author: "CasualGamer", helpful: 45 },
      { rating: 4, text: "Solid experience overall. Great value for money. Some performance issues on older hardware.", author: "ValueHunter", helpful: 78 },
      { rating: 5, text: "Addictive and well-designed. Can't stop playing! Lost track of time multiple times.", author: "GameAddict", helpful: 201 },
      { rating: 4, text: "Fun gameplay with minor issues. Recommended for fans of the genre.", author: "FairReviewer", helpful: 67 },
      { rating: 5, text: "Exceeded my expectations! This is a masterpiece in every sense.", author: "CriticPro", helpful: 312 },
      { rating: 4, text: "Worth the money, great value. Some performance issues but nothing game-breaking.", author: "TechGamer", helpful: 91 },
      { rating: 3, text: "Decent game, nothing special. Average experience, might appeal to some.", author: "NeutralPlayer", helpful: 23 },
      { rating: 5, text: "Outstanding graphics and sound design! Immersive experience from start to finish.", author: "AudioVisual", helpful: 145 },
      { rating: 4, text: "Engaging story, well-crafted characters. Some pacing issues but overall great.", author: "StoryLover", helpful: 98 },
      { rating: 5, text: "Revolutionary gameplay mechanics. This game is a real game changer!", author: "InnovateFan", helpful: 267 },
      { rating: 2, text: "Disappointing. Had high expectations based on trailers but fell short.", author: "LetDown", helpful: 34 },
      { rating: 4, text: "Great multiplayer experience with friends. Solo play is also enjoyable.", author: "MultiPlayer", helpful: 112 },
      { rating: 5, text: "Best graphics I've ever seen in a game. Runs smoothly on high settings.", author: "VisualFan", helpful: 189 },
      { rating: 3, text: "Okay game, but gets repetitive after a while. Could use more variety.", author: "Gets0ld", helpful: 56 },
      { rating: 4, text: "Challenging and rewarding. Worth the grind if you're patient.", author: "Grinder", helpful: 87 },
      { rating: 5, text: "Emotional rollercoaster. Amazing storytelling that kept me hooked.", author: "EmotionalG", helpful: 234 },
      { rating: 4, text: "Good optimization, runs smooth on my setup. Minor UI issues but nothing major.", author: "TechCheck", helpful: 76 }
    ];

    // Utiliser gameId comme seed pour des reviews cohérentes mais uniques par jeu
    const seed = gameId;
    const selectedReviews = [];
    
    // Générer 8-12 reviews par jeu selon l'ID
    const numReviews = 8 + (seed % 5);

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
    return selectedReviews.sort((a, b) => b.helpful! - a.helpful!);
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
          onTabChange={(tab) => setActiveTab(tab as MediaCategory)} 
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
/**
 * Types TypeScript centralisés pour toute l'application
 * Assure la cohérence des types et évite la duplication
 */

// Types de base pour les médias
export type MediaCategory = 'games' | 'movies' | 'music' | 'books'
export type MediaStatus = 'want-to-play' | 'currently-playing' | 'completed' | 'paused' | 'dropped'

// Interface pour les items de contenu (recherche, sections, etc.)
export interface ContentItem {
  id: string
  title: string
  year: number
  rating?: number
  genre?: string
  category: MediaCategory
  image?: string
  
  // Créateurs selon le type de média
  author?: string      // Pour les livres
  artist?: string      // Pour la musique
  director?: string    // Pour les films
  
  // Données spécifiques aux jeux (RAWG API)
  background_image?: string
  developers?: Array<{ name: string }>
  genres?: Array<{ name: string }>
  released?: string
  
  // Propriété alternative pour les noms
  name?: string
  
  // NOUVELLES PROPRIÉTÉS pour films/séries
  type?: string        // 'movie' ou 'series'
  isMovie?: boolean    // true si c'est un film
  isSeries?: boolean   // true si c'est une série TV
  totalSeasons?: number // Nombre de saisons pour les séries
  displayTitle?: string // Titre avec indication "(TV Series)" si nécessaire
  overview?: string    // Synopsis/description
  runtime?: string     // Durée
  actors?: string      // Acteurs principaux
  language?: string    // Langue
  country?: string     // Pays
  awards?: string      // Récompenses
}

// Interface pour les items dans la bibliothèque utilisateur
export interface LibraryItem extends ContentItem {
  status: MediaStatus
  addedAt: string
  dateStarted?: string
  dateCompleted?: string
  userRating?: number    // Note utilisateur (1-5)
  progress?: number      // Progression en % (0-100)
  notes?: string         // Notes personnelles
}

// Interface pour les résultats de recherche
export interface SearchResult extends ContentItem {
  // Hérite de ContentItem avec toutes les nouvelles propriétés
}

// Interface pour les reviews/critiques
export interface Review {
  id: string | number
  username: string
  rating: number
  text?: string
  review?: string  // Alias pour text
  date: string
  helpful?: number
  platform?: string
}

// Options de statut pour les popups
export interface StatusOption {
  value: MediaStatus
  label: string
}
// src/types/index.ts - TYPES COMPLETS AVEC TRENDING ET categoryLabel
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
  developer?: string   // ✅ Pour les jeux
  
  // ✅ NOUVELLES PROPRIÉTÉS POUR LES JEUX
  background_image?: string
  developers?: Array<{ name: string }>
  publishers?: Array<{ name: string }>  // ✅ AJOUTÉ
  genres?: Array<{ name: string }>
  platforms?: Array<{ platform: { name: string } }>
  released?: string
  
  // Propriété alternative pour les noms
  name?: string
  
  // PROPRIÉTÉS pour films/séries
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

  // PROPRIÉTÉS pour Discover Page
  subtitle?: string    // Sous-titre pour hero section
  description?: string // Description détaillée
  trending?: string    // Pourcentage de tendance ex: "+25%"
  status?: 'new' | 'trending' | 'hot' | 'featured' // ✅ MODIFIÉ - Badge status avec 'featured'
  callToAction?: string // Texte du bouton d'action
  categoryLabel?: string // ✅ AJOUTÉ - Label de catégorie pour hero
  
  // ✅ NOUVELLES PROPRIÉTÉS POUR LE TRENDING
  stats?: {
    trending?: string   // Tendance ex: "+15%"
    users?: string      // Nombre d'utilisateurs ex: "2.5M"
    engagement?: string // Engagement ex: "92%"
    completion?: string // Pourcentage de completion ex: "85%"
    sources?: number    // Nombre de sources de données
  }

  // ✅ PROPRIÉTÉS SUPPLÉMENTAIRES POUR LES JEUX
  description_raw?: string
  metacritic?: number
  esrb_rating?: { name: string }
  tags?: Array<{ name: string }>
  rating_count?: number
  parent_platforms?: Array<{ platform: { name: string } }>
  website?: string
  stores?: Array<{ store: { name: string }, url: string }>
  screenshots?: Array<{ image: string }>

  // ✅ PROPRIÉTÉS SUPPLÉMENTAIRES POUR LA MUSIQUE
  trackCount?: number
  copyright?: string
  collectionPrice?: number
  currency?: string
  collectionViewUrl?: string
  artistViewUrl?: string
  collectionType?: string

  // ✅ PROPRIÉTÉS SUPPLÉMENTAIRES POUR LES LIVRES
  isbn?: string
  pageCount?: number
  publishedDate?: string
  publisher?: string
  previewLink?: string
  infoLink?: string
  canonicalVolumeLink?: string
  isEbook?: boolean
  buyLink?: string
  price?: string
  webReaderLink?: string
  epubAvailable?: boolean
  pdfAvailable?: boolean
}

// ✅ Interface pour les résultats de recherche (hérite de ContentItem)
export interface SearchResult extends ContentItem {
  // Hérite de toutes les propriétés de ContentItem
  // Pas besoin d'ajouter d'autres propriétés spécifiques
}

// Interface pour les items dans la bibliothèque utilisateur
export interface LibraryItem {
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
  developer?: string   // ✅ Pour les jeux
  
  // ✅ NOUVELLES PROPRIÉTÉS POUR LES JEUX
  background_image?: string
  developers?: Array<{ name: string }>
  publishers?: Array<{ name: string }>  // ✅ AJOUTÉ
  genres?: Array<{ name: string }>
  released?: string
  
  // Propriété alternative pour les noms
  name?: string
  
  // PROPRIÉTÉS pour films/séries
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

  // Propriétés spécifiques à la bibliothèque
  status: MediaStatus
  addedAt: string
  dateStarted?: string
  dateCompleted?: string
  userRating?: number    // Note utilisateur (1-5)
  progress?: number      // Progression en % (0-100)
  notes?: string         // Notes personnelles
  additionalInfo?: {     // ✅ Infos supplémentaires pour les jeux
    platform?: string
    gamePass?: boolean
    freeToPlay?: boolean
    purchasePrice?: string
    [key: string]: any
  }
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

// ✅ NOUVEAUX TYPES POUR LE SYSTÈME DE TRENDING

// Interface pour les données de trending brutes
export interface TrendingData {
  source: string
  category: MediaCategory
  items: Array<{
    title: string
    rank?: number
    trending_score?: number
    release_year?: number
    additional_data?: any
  }>
  last_updated: string
  freshness_score: number // 0-100, basé sur la fraîcheur des données
}

// Interface pour le contenu trending traité
export interface TrendingContent {
  item: ContentItem
  trending_score: number
  sources: string[] // Sources qui mentionnent cet item
  freshness: number
  boost_factors: string[] // Raisons du boost (nouveau, viral, etc.)
}

// Interface pour les résultats de scraping
export interface ScrapingResult {
  success: boolean
  data: any[]
  error?: string
  source: string
  timestamp: number
  freshness_score: number
}

// Interface pour les sources de trending
export interface TrendingSource {
  name: string
  url: string
  category: MediaCategory
  scraper: (html: string) => any[]
  enabled: boolean
  priority: number // 1-5, 5 = highest priority
}

// Types pour les filtres de catégorie
export type CategoryFilter = 'games' | 'movies' | 'music' | 'books'

// Interface pour les sections de catégorie dans DiscoverPage
export interface CategorySection {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  color: string
  items: ContentItem[]
  loading: boolean
}

// Interface pour la section "For You"
export interface ForYouSection {
  items: ContentItem[]
  reasoning: string
  loading: boolean
}

// Interface pour les statistiques de debug du trending
export interface DebugStats {
  cache_stats: any
  scraping_status: any
  last_update: string
  active_sources: number
  total_items: number
  freshness_average: number
}

// Types pour les couleurs des sections
export interface ColorClasses {
  bg: string
  border: string
  text: string
  accent: string
}
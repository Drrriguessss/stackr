// Types spécifiques pour la musique avec distinction claire Single vs Album

export interface MusicTrack {
  // Données essentielles
  trackId: number
  trackName: string
  artistName: string
  artistId: number
  
  // Album parent
  collectionId: number
  collectionName: string
  
  // Métadonnées track
  trackTimeMillis?: number
  trackNumber?: number
  trackPrice?: number
  previewUrl?: string
  
  // Images et medias
  artworkUrl30?: string
  artworkUrl60?: string
  artworkUrl100?: string
  
  // Informations supplémentaires
  releaseDate?: string
  primaryGenreName?: string
  country?: string
  currency?: string
  
  // API flags
  wrapperType: 'track'
  kind: 'song'
}

export interface MusicAlbum {
  // Données essentielles
  collectionId: number
  collectionName: string
  artistName: string
  artistId: number
  
  // Métadonnées album
  collectionType: 'Album'
  trackCount?: number
  collectionPrice?: number
  copyright?: string
  
  // Images
  artworkUrl30?: string
  artworkUrl60?: string
  artworkUrl100?: string
  
  // Informations
  releaseDate?: string
  primaryGenreName?: string
  country?: string
  currency?: string
  
  // Links
  collectionViewUrl?: string
  artistViewUrl?: string
  
  // API flags
  wrapperType: 'collection'
}

// Type unifié pour l'app
export interface AppMusicItem {
  id: string // Format: 'track-123' ou 'album-456'
  type: 'single' | 'album'
  title: string
  artist: string
  year: number
  genre: string
  image: string
  
  // Spécifique aux singles
  duration?: string // "3:45"
  albumId?: string // ID de l'album parent
  albumTitle?: string // Nom de l'album parent
  
  // Spécifique aux albums
  trackCount?: number
  totalDuration?: string // "45:30"
  
  // Métadonnées communes
  rating?: number
  description?: string
  category: 'music'
}

// Interface pour les détails de page produit
export interface MusicDetailData {
  // Info de base
  id: string
  type: 'single' | 'album'
  title: string
  artist: string
  image: string
  releaseDate: string
  genre: string
  
  // Single specific
  duration?: string
  parentAlbum?: {
    id: string
    title: string
    year: number
  }
  
  // Album specific
  trackCount?: number
  totalDuration?: string
  tracks?: Array<{
    number: number
    name: string
    duration: string
  }>
  
  // Communes
  description: string
  rating: number
  youtubeVideoId?: string
  previewUrl?: string
}

export type MusicSearchResult = MusicTrack | MusicAlbum
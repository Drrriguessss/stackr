// Service musical refactorisé avec distinction claire Single vs Album
import type { MusicTrack, MusicAlbum, AppMusicItem, MusicDetailData, MusicSearchResult } from '@/types/musicTypes'

export class MusicServiceV2 {
  private readonly baseURL = '/api/itunes' // Utiliser notre API route pour éviter CORS
  
  /**
   * 🔍 RECHERCHE MIXTE - Albums ET Singles
   */
  async searchMusic(query: string, limit: number = 20): Promise<AppMusicItem[]> {
    console.log('🎵 [V2] Searching music:', query)
    
    try {
      // Recherche séparée pour albums et tracks
      const [albums, tracks] = await Promise.all([
        this.searchAlbums(query, Math.floor(limit / 2)),
        this.searchTracks(query, Math.floor(limit / 2))
      ])
      
      // Convertir et mélanger les résultats
      const albumItems = albums.map(album => this.convertAlbumToAppItem(album))
      const trackItems = tracks.map(track => this.convertTrackToAppItem(track))
      
      const allItems = [...albumItems, ...trackItems]
      console.log(`🎵 [V2] Found ${albumItems.length} albums + ${trackItems.length} tracks`)
      
      return allItems.slice(0, limit)
      
    } catch (error) {
      console.error('🎵 [V2] Search error:', error)
      return []
    }
  }
  
  /**
   * 🎵 RECHERCHE ALBUMS UNIQUEMENT
   */
  private async searchAlbums(query: string, limit: number): Promise<MusicAlbum[]> {
    const url = `${this.baseURL}?` + new URLSearchParams({
      endpoint: 'search',
      term: query,
      media: 'music',
      entity: 'album',
      limit: limit.toString(),
      country: 'US'
    })
    
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    
    if (!response.ok) {
      throw new Error(`Albums search failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    return data.results.filter((item: any) => 
      item.wrapperType === 'collection' && 
      item.collectionType === 'Album'
    )
  }
  
  /**
   * 🎤 RECHERCHE TRACKS/SINGLES UNIQUEMENT
   */
  private async searchTracks(query: string, limit: number): Promise<MusicTrack[]> {
    const url = `${this.baseURL}?` + new URLSearchParams({
      endpoint: 'search',
      term: query,
      media: 'music',
      entity: 'song',
      limit: limit.toString(),
      country: 'US'
    })
    
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    
    if (!response.ok) {
      throw new Error(`Tracks search failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    return data.results.filter((item: any) => 
      item.wrapperType === 'track' && 
      item.kind === 'song'
    )
  }
  
  /**
   * 📀 RÉCUPÉRER DÉTAILS D'UN ALBUM
   */
  async getAlbumDetails(albumId: string): Promise<MusicDetailData | null> {
    console.log('🎵 [V2] Getting album details:', albumId)
    
    try {
      const cleanId = albumId.replace('album-', '')
      
      const response = await fetch(
        `${this.baseURL}?endpoint=lookup&id=${cleanId}&entity=album`,
        { signal: AbortSignal.timeout(8000) }
      )
      
      if (!response.ok) {
        throw new Error(`Album lookup failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        throw new Error('Album not found')
      }
      
      const album = data.results[0] as MusicAlbum
      
      return {
        id: `album-${album.collectionId}`,
        type: 'album',
        title: album.collectionName,
        artist: album.artistName,
        image: this.getBestImageUrl(album.artworkUrl100, album.artworkUrl60, album.artworkUrl30),
        releaseDate: album.releaseDate || '',
        genre: album.primaryGenreName || 'Music',
        trackCount: album.trackCount || 0,
        totalDuration: this.estimateAlbumDuration(album.trackCount || 0),
        description: `${album.collectionName} by ${album.artistName} - ${album.primaryGenreName} album with ${album.trackCount} tracks.`,
        rating: 4.0 + Math.random() * 1.0,
        youtubeVideoId: undefined // Albums n'ont jamais de vidéos
      }
      
    } catch (error) {
      console.error('🎵 [V2] Album details error:', error)
      return null
    }
  }
  
  /**
   * 🎤 RÉCUPÉRER DÉTAILS D'UN TRACK/SINGLE
   */
  async getTrackDetails(trackId: string): Promise<MusicDetailData | null> {
    console.log('🎵 [V2] Getting track details:', trackId)
    
    try {
      const cleanId = trackId.replace('track-', '')
      
      const response = await fetch(
        `${this.baseURL}?endpoint=lookup&id=${cleanId}&entity=song`,
        { signal: AbortSignal.timeout(8000) }
      )
      
      if (!response.ok) {
        throw new Error(`Track lookup failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        throw new Error('Track not found')
      }
      
      const track = data.results[0] as MusicTrack
      
      // 🔥 VALIDATION CRITIQUE: Vérifier que le titre existe
      if (!track.trackName || track.trackName.trim() === '') {
        console.error(`🎵 [ERROR] Track ${cleanId} has no title:`, track)
        // Utiliser un titre par défaut basé sur l'artiste et l'ID
        track.trackName = track.artistName ? `${track.artistName} - Track ${cleanId}` : `Untitled Track ${cleanId}`
        console.log(`🎵 [FALLBACK] Using fallback title: ${track.trackName}`)
      }
      
      // Vérifier aussi l'ID du track
      if (!track.trackId) {
        console.error(`🎵 [ERROR] Track has no ID, using cleanId:`, cleanId)
        track.trackId = parseInt(cleanId) || 0
      }
      
      // 🔧 FIX: Toujours utiliser le trackId d'iTunes pour la cohérence
      // Si on a reçu track-123 et iTunes renvoie trackId=456, on garde track-456
      const consistentId = track.trackId ? `track-${track.trackId}` : `track-${cleanId}`
      console.log(`🎵 [ID CHECK] Input: ${trackId}, iTunes trackId: ${track.trackId}, Using: ${consistentId}`)
      
      return {
        id: consistentId,
        type: 'single',
        title: track.trackName,
        artist: track.artistName || 'Unknown Artist',
        image: this.getBestImageUrl(track.artworkUrl100, track.artworkUrl60, track.artworkUrl30),
        releaseDate: track.releaseDate || '',
        genre: track.primaryGenreName || 'Music',
        duration: this.formatTrackDuration(track.trackTimeMillis),
        parentAlbum: {
          id: `album-${track.collectionId}`,
          title: track.collectionName || 'Unknown Album',
          year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : 0
        },
        description: `"${track.trackName}" by ${track.artistName || 'Unknown Artist'} - Single from the album "${track.collectionName || 'Unknown Album'}"`,
        rating: 4.0 + Math.random() * 1.0,
        youtubeVideoId: await this.findTrackVideo(track.artistName || '', track.trackName),
        previewUrl: track.previewUrl
      }
      
    } catch (error) {
      console.error('🎵 [V2] Track details error:', error)
      return null
    }
  }
  
  /**
   * 🔄 CONVERTIR ALBUM VERS FORMAT APP
   */
  private convertAlbumToAppItem(album: MusicAlbum): AppMusicItem {
    return {
      id: `album-${album.collectionId}`,
      type: 'album',
      title: album.collectionName,
      artist: album.artistName,
      year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : 0,
      genre: album.primaryGenreName || 'Music',
      image: this.getBestImageUrl(album.artworkUrl100, album.artworkUrl60, album.artworkUrl30),
      trackCount: album.trackCount || 0,
      totalDuration: this.estimateAlbumDuration(album.trackCount || 0),
      category: 'music',
      rating: 4.0 + Math.random() * 1.0,
      description: `${album.collectionName} by ${album.artistName}`
    }
  }
  
  /**
   * 🔄 CONVERTIR TRACK VERS FORMAT APP
   */
  private convertTrackToAppItem(track: MusicTrack): AppMusicItem {
    // Validation et fallback pour les données manquantes
    const safeTrackName = track.trackName || `Untitled Track ${track.trackId || 'Unknown'}`
    const safeArtistName = track.artistName || 'Unknown Artist'
    const safeTrackId = track.trackId || Date.now() // Utiliser timestamp si pas d'ID
    
    if (!track.trackName) {
      console.warn(`🎵 [WARN] Track ${track.trackId} has no name, using fallback:`, safeTrackName)
    }
    
    return {
      id: `track-${safeTrackId}`,
      type: 'single',
      title: safeTrackName,
      artist: safeArtistName,
      year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : 0,
      genre: track.primaryGenreName || 'Music',
      image: this.getBestImageUrl(track.artworkUrl100, track.artworkUrl60, track.artworkUrl30),
      duration: this.formatTrackDuration(track.trackTimeMillis),
      albumId: `album-${track.collectionId}`,
      albumTitle: track.collectionName || 'Unknown Album',
      category: 'music',
      rating: 4.0 + Math.random() * 1.0,
      description: `"${safeTrackName}" by ${safeArtistName}`
    }
  }
  
  /**
   * 🖼️ OBTENIR MEILLEURE URL D'IMAGE
   */
  private getBestImageUrl(...urls: (string | undefined)[]): string {
    for (const url of urls) {
      if (url) {
        return url.replace('100x100', '400x400')
                 .replace('60x60', '400x400')
                 .replace('30x30', '400x400')
      }
    }
    return 'https://via.placeholder.com/400x400/1a1a1a/ffffff?text=Music'
  }
  
  /**
   * ⏱️ FORMATER DURÉE DE TRACK
   */
  private formatTrackDuration(milliseconds?: number): string {
    if (!milliseconds) return '3:30'
    
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  /**
   * ⏱️ ESTIMER DURÉE D'ALBUM
   */
  private estimateAlbumDuration(trackCount: number): string {
    if (!trackCount) return '45:00'
    
    const avgTrackMinutes = 3.5
    const totalMinutes = Math.round(trackCount * avgTrackMinutes)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:00`
    }
    return `${totalMinutes}:00`
  }
  
  /**
   * 🎬 ALBUMS N'ONT PAS DE VIDÉOS - FONCTION SUPPRIMÉE
   * Les albums affichent uniquement des photos
   */
  
  /**
   * 🎵 RÉCUPÉRER DÉTAILS GÉNÉRIQUES - Router function for MusicDetailModalV4
   */
  async getMusicDetails(musicId: string): Promise<MusicDetailData | null> {
    console.log('🎵 [V2] Getting music details for ID:', musicId)
    
    // 🔧 IMPORTANT: Normaliser l'ID d'entrée
    let normalizedId = musicId
    
    if (musicId.startsWith('album-')) {
      const result = await this.getAlbumDetails(musicId)
      console.log('🎵 [V2] Album details result ID:', result?.id)
      return result
    } else if (musicId.startsWith('track-')) {
      const result = await this.getTrackDetails(musicId)
      console.log('🎵 [V2] Track details result ID:', result?.id)
      return result
    } else if (/^\d+$/.test(musicId)) {
      // Handle legacy IDs without prefix - try as track first, then album
      console.log('🎵 [V2] Legacy ID format detected, trying as track first:', musicId)
      try {
        const trackResult = await this.getTrackDetails(`track-${musicId}`)
        if (trackResult) {
          console.log('🎵 [V2] Legacy ID resolved as track, final ID:', trackResult.id)
          return trackResult
        }
      } catch (error) {
        console.log('🎵 [V2] Not a track, trying as album:', musicId)
      }
      
      try {
        const albumResult = await this.getAlbumDetails(`album-${musicId}`)
        if (albumResult) {
          console.log('🎵 [V2] Legacy ID resolved as album, final ID:', albumResult.id)
          return albumResult
        }
      } catch (error) {
        console.log('🎵 [V2] Not an album either:', musicId)
      }
      
      console.error('🎵 [V2] Could not resolve legacy ID:', musicId)
      return null
    } else {
      console.error('🎵 [V2] Invalid music ID format:', musicId)
      return null
    }
  }

  /**
   * 🎬 RECHERCHE DE VIDÉO YOUTUBE ROBUSTE
   * Utilise le nouveau système de validation basé sur les trailers
   */
  private async findTrackVideo(artist: string, trackName: string): Promise<string | undefined> {
    console.log(`🎬 [V2] Recherche vidéo robuste pour: "${trackName}" by ${artist}`)
    
    try {
      // Safe check for undefined values
      if (!artist || !trackName) {
        console.log(`🎬 [V2] ❌ Artist ou track name manquant:`, { artist, trackName })
        return undefined
      }
      
      // Utiliser le nouveau service de vidéos musicales
      const { musicVideoService } = await import('./musicVideoService')
      const video = await musicVideoService.getMusicVideo(artist, trackName)
      
      if (video && video.isEmbeddable) {
        console.log(`🎬 [V2] ✅ Vidéo validée trouvée: ${video.videoId}`)
        return video.videoId
      }
      
      console.log(`🎬 [V2] ❌ Aucune vidéo embeddable pour: "${trackName}" by ${artist}`)
      return undefined
      
    } catch (error) {
      console.error(`🎬 [V2] Erreur recherche vidéo:`, error)
      return undefined // Fallback vers photos
    }
  }
}

export const musicServiceV2 = new MusicServiceV2()
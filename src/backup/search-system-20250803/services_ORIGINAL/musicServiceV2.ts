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
      
      return {
        id: `track-${track.trackId}`,
        type: 'single',
        title: track.trackName,
        artist: track.artistName,
        image: this.getBestImageUrl(track.artworkUrl100, track.artworkUrl60, track.artworkUrl30),
        releaseDate: track.releaseDate || '',
        genre: track.primaryGenreName || 'Music',
        duration: this.formatTrackDuration(track.trackTimeMillis),
        parentAlbum: {
          id: `album-${track.collectionId}`,
          title: track.collectionName,
          year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : 0
        },
        description: `"${track.trackName}" by ${track.artistName} - Single from the album "${track.collectionName}"`,
        rating: 4.0 + Math.random() * 1.0,
        youtubeVideoId: await this.findTrackVideo(track.artistName, track.trackName),
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
    return {
      id: `track-${track.trackId}`,
      type: 'single',
      title: track.trackName,
      artist: track.artistName,
      year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : 0,
      genre: track.primaryGenreName || 'Music',
      image: this.getBestImageUrl(track.artworkUrl100, track.artworkUrl60, track.artworkUrl30),
      duration: this.formatTrackDuration(track.trackTimeMillis),
      albumId: `album-${track.collectionId}`,
      albumTitle: track.collectionName,
      category: 'music',
      rating: 4.0 + Math.random() * 1.0,
      description: `"${track.trackName}" by ${track.artistName}`
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
   * 🎬 RECHERCHE DE VIDÉO YOUTUBE ROBUSTE
   * Utilise le nouveau système de validation basé sur les trailers
   */
  private async findTrackVideo(artist: string, track: string): Promise<string | undefined> {
    console.log(`🎬 [V2] Recherche vidéo robuste pour: "${track}" by ${artist}`)
    
    try {
      // Utiliser le nouveau service de vidéos musicales
      const { musicVideoService } = await import('./musicVideoService')
      const video = await musicVideoService.getMusicVideo(artist, track)
      
      if (video && video.isEmbeddable) {
        console.log(`🎬 [V2] ✅ Vidéo validée trouvée: ${video.videoId}`)
        return video.videoId
      }
      
      console.log(`🎬 [V2] ❌ Aucune vidéo embeddable pour: "${track}" by ${artist}`)
      return undefined
      
    } catch (error) {
      console.error(`🎬 [V2] Erreur recherche vidéo:`, error)
      return undefined // Fallback vers photos
    }
  }
}

export const musicServiceV2 = new MusicServiceV2()
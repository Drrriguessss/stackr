class FanartService {
  private readonly apiKey = process.env.NEXT_PUBLIC_FANART_API_KEY || ''
  private readonly movieBaseUrl = 'https://webservice.fanart.tv/v3/movies'
  private readonly musicBaseUrl = 'https://webservice.fanart.tv/v3/music'

  async getMovieImages(imdbId: string) {
    if (!this.apiKey) {
      console.warn('🎨 [Fanart] API key not configured')
      return null
    }

    try {
      console.log(`🎨 [Fanart] Fetching HD images for IMDB: ${imdbId}`)
      
      const response = await fetch(`${this.movieBaseUrl}/${imdbId}?api_key=${this.apiKey}`, {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`🎨 [Fanart] No images found for ${imdbId}`)
          return null
        }
        if (response.status === 401) {
          console.warn(`🎨 [Fanart] API key unauthorized - please register at https://fanart.tv/get-an-api-key/`)
          return null
        }
        console.warn(`🎨 [Fanart] API error ${response.status} - falling back to other image sources`)
        return null
      }

      const data = await response.json()
      
      if (!data || Object.keys(data).length === 0) {
        console.log(`🎨 [Fanart] Empty response for ${imdbId}`)
        return null
      }

      // Sort images by likes (quality indicator)
      const sortByLikes = (images: any[]) => 
        images?.sort((a, b) => (b.likes || 0) - (a.likes || 0)) || []

      const result = {
        // Movie backgrounds - 1920x1080 HD minimum, perfect for headers
        backgrounds: sortByLikes(data.moviebackground)?.map(img => img.url) || [],
        
        // Movie banners - 1000x185px for headers
        banners: sortByLikes(data.moviebanner)?.map(img => img.url) || [],
        
        // HD Posters - up to 2000x3000
        posters: sortByLikes(data.movieposter)?.map(img => img.url) || [],
        
        // HD ClearART - logos + characters with transparency
        clearart: sortByLikes(data.hdmovieclearart)?.map(img => img.url) || [],
        
        // Movie thumbs - good for thumbnails
        thumbs: sortByLikes(data.moviethumb)?.map(img => img.url) || []
      }

      console.log(`🎨 [Fanart] Found: ${result.backgrounds.length} backgrounds, ${result.posters.length} posters`)
      return result

    } catch (error) {
      console.error('🎨 [Fanart] API error:', error)
      return null
    }
  }

  // Get the best header image (prioritizing backgrounds over banners)
  async getBestHeaderImage(imdbId: string): Promise<string | null> {
    const images = await this.getMovieImages(imdbId)
    
    if (!images) return null
    
    // Priority: backgrounds (perfect 16:9) > banners > posters
    if (images.backgrounds.length > 0) {
      return images.backgrounds[0] // Best rated background
    }
    
    if (images.banners.length > 0) {
      return images.banners[0] // Best rated banner
    }
    
    if (images.posters.length > 0) {
      return images.posters[0] // Best rated poster as fallback
    }
    
    return null
  }

  // Get gallery images (mix of backgrounds and thumbs)
  async getGalleryImages(imdbId: string): Promise<string[]> {
    const images = await this.getMovieImages(imdbId)
    
    if (!images) return []
    
    // Combine different image types for gallery
    const gallery = [
      ...images.backgrounds,
      ...images.thumbs,
      ...images.posters.slice(0, 3) // Only first 3 posters
    ]
    
    return gallery.slice(0, 12) // Limit to 12 images
  }

  // ========== MUSIC ARTIST METHODS ==========
  
  async getArtistImages(musicBrainzId: string) {
    if (!this.apiKey) {
      console.warn('🎨 [Fanart] API key not configured for music')
      return null
    }

    try {
      console.log(`🎨 [Fanart] Fetching HD images for artist MBID: ${musicBrainzId}`)
      
      const response = await fetch(`${this.musicBaseUrl}/${musicBrainzId}?api_key=${this.apiKey}`, {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`🎨 [Fanart] No images found for artist ${musicBrainzId}`)
          return null
        }
        if (response.status === 401) {
          console.warn(`🎨 [Fanart] API key unauthorized`)
          return null
        }
        console.warn(`🎨 [Fanart] API error ${response.status} for artist`)
        return null
      }

      const data = await response.json()
      
      if (!data || Object.keys(data).length === 0) {
        console.log(`🎨 [Fanart] Empty response for artist ${musicBrainzId}`)
        return null
      }

      // Sort images by likes (quality indicator)
      const sortByLikes = (images: any[]) => 
        images?.sort((a, b) => (b.likes || 0) - (a.likes || 0)) || []

      const result = {
        // Artist backgrounds - HD wallpapers
        backgrounds: sortByLikes(data.artistbackground)?.map(img => img.url) || [],
        
        // Artist thumbs - square thumbnails
        thumbs: sortByLikes(data.artistthumb)?.map(img => img.url) || [],
        
        // Music logos - artist/band logos
        logos: sortByLikes(data.musiclogo)?.map(img => img.url) || [],
        
        // HD logos
        hdlogos: sortByLikes(data.hdmusiclogo)?.map(img => img.url) || [],
        
        // Music banners
        banners: sortByLikes(data.musicbanner)?.map(img => img.url) || [],
        
        // Album covers (if available)
        albumcovers: sortByLikes(data.albumcover)?.map(img => img.url) || []
      }

      console.log(`🎨 [Fanart] Found for artist: ${result.backgrounds.length} backgrounds, ${result.thumbs.length} thumbs, ${result.logos.length} logos`)
      return result

    } catch (error) {
      console.error('🎨 [Fanart] API error for artist:', error)
      return null
    }
  }

  // Get artist gallery images for music modal
  async getArtistGalleryImages(musicBrainzId: string): Promise<string[]> {
    const images = await this.getArtistImages(musicBrainzId)
    
    if (!images) return []
    
    // Combine different image types for gallery (similar to movie gallery)
    const gallery = [
      ...images.backgrounds.slice(0, 6),  // First 6 backgrounds
      ...images.thumbs.slice(0, 4),       // First 4 thumbs
      ...images.albumcovers.slice(0, 2)   // First 2 album covers if available
    ]
    
    return gallery.slice(0, 12) // Limit to 12 images
  }

  // Search for artist by name (requires MusicBrainz API integration)
  async searchArtistByName(artistName: string): Promise<string | null> {
    try {
      // Search MusicBrainz for artist MBID
      const searchUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Stackr/1.0 (https://stackr.app)'
        }
      })
      
      if (!response.ok) {
        console.warn(`🎨 [MusicBrainz] Search failed for ${artistName}`)
        return null
      }
      
      const data = await response.json()
      
      if (data.artists && data.artists.length > 0) {
        const mbid = data.artists[0].id
        console.log(`🎨 [MusicBrainz] Found MBID ${mbid} for ${artistName}`)
        return mbid
      }
      
      return null
    } catch (error) {
      console.error('🎨 [MusicBrainz] Search error:', error)
      return null
    }
  }
}

export const fanartService = new FanartService()
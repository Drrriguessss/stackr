class FanartService {
  private readonly apiKey = process.env.NEXT_PUBLIC_FANART_API_KEY || ''
  private readonly baseUrl = 'https://webservice.fanart.tv/v3/movies'

  async getMovieImages(imdbId: string) {
    if (!this.apiKey) {
      console.warn('🎨 [Fanart] API key not configured')
      return null
    }

    try {
      console.log(`🎨 [Fanart] Fetching HD images for IMDB: ${imdbId}`)
      
      const response = await fetch(`${this.baseUrl}/${imdbId}?api_key=${this.apiKey}`, {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`🎨 [Fanart] No images found for ${imdbId}`)
          return null
        }
        throw new Error(`HTTP ${response.status}`)
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
}

export const fanartService = new FanartService()
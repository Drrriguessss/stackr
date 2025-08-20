// Streaming service using TMDB Watch Providers API (powered by JustWatch)
export interface StreamingProvider {
  logo_path: string
  provider_id: number
  provider_name: string
  display_priority: number
}

export interface WatchProviders {
  id: number
  results: {
    [countryCode: string]: {
      link: string
      flatrate?: StreamingProvider[]  // Streaming services
      rent?: StreamingProvider[]      // Rental services  
      buy?: StreamingProvider[]       // Purchase services
    }
  }
}

export interface AffiliateLink {
  provider: string
  name: string
  url: string
  type: 'streaming' | 'rent' | 'buy'
  logo: string
  priority: number
}

class StreamingService {
  private readonly tmdbApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
  private readonly baseURL = 'https://api.themoviedb.org/3'
  private readonly imageBaseURL = 'https://image.tmdb.org/t/p/original'
  
  // Your affiliate tags for different services
  private readonly affiliateTags = {
    amazon: 'drrriguessss-20',
    apple: 'drrriguessss', // Apple affiliate ID
    google: 'drrriguessss', // Google Play affiliate
    rakuten: 'drrriguessss', // Rakuten TV
    microsoft: 'drrriguessss' // Microsoft Store
  }

  /**
   * Get streaming providers for a movie
   */
  /**
   * Quality filter for streaming providers
   */
  private isProviderReliable(provider: StreamingProvider, movieTitle?: string): boolean {
    const providerName = provider.provider_name.toLowerCase()
    const title = movieTitle?.toLowerCase() || ''
    
    // List of commonly unreliable or outdated providers
    const unreliableProviders = [
      'tubi', 'crackle', 'imdb tv', 'pluto tv', 'the roku channel',
      'xumo', 'filmrise', 'popcornflix', 'hoopla', 'kanopy'
    ]
    
    // Skip free ad-supported platforms that often have licensing issues
    if (unreliableProviders.some(unreliable => providerName.includes(unreliable))) {
      console.log(`🚫 Filtering out unreliable provider: ${provider.provider_name}`)
      return false
    }
    
    // Special case: Apple TV often has incorrect data
    if (providerName.includes('apple')) {
      // Known content that is NOT on Apple TV (despite TMDB data)
      const notOnAppleTV = [
        'dexter', 'breaking bad', 'game of thrones', 'friends', 'the office',
        'dune', 'dune: part one', 'avatar', 'top gun', 'spider-man'
      ]
      if (notOnAppleTV.some(item => title.includes(item))) {
        console.log(`🚫 Filtering out Apple TV for "${movieTitle}" - known to be incorrect`)
        return false
      }
    }
    
    // Prefer major streaming platforms
    const majorPlatforms = [
      'netflix', 'amazon', 'apple', 'google', 'disney', 'hulu', 
      'hbo', 'paramount', 'peacock', 'showtime', 'starz', 'vudu', 'microsoft'
    ]
    
    const isMajorPlatform = majorPlatforms.some(major => providerName.includes(major))
    if (!isMajorPlatform) {
      console.log(`⚠️ Minor platform detected: ${provider.provider_name}`)
    }
    
    console.log(`✅ Provider ${provider.provider_name} passed quality filter for "${movieTitle}"`)
    return true
  }

  /**
   * Convert IMDB ID to TMDB ID
   */
  private async convertImdbToTmdb(imdbId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/find/${imdbId}?api_key=${this.tmdbApiKey}&external_source=imdb_id`,
        { signal: AbortSignal.timeout(8000) }
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      const movie = data.movie_results?.[0] || data.tv_results?.[0]
      
      if (movie?.id) {
        console.log(`🔄 Converted IMDB ${imdbId} → TMDB ${movie.id}`)
        return movie.id.toString()
      }
      
      return null
    } catch (error) {
      console.error('IMDB to TMDB conversion failed:', error)
      return null
    }
  }

  async getMovieProviders(movieId: string, country: string = 'US', movieTitle?: string): Promise<AffiliateLink[]> {
    try {
      let tmdbId = movieId
      
      // Convert IMDB ID to TMDB ID if needed
      if (movieId.startsWith('tt')) {
        console.log(`🎬 IMDB ID detected: ${movieId}, converting to TMDB...`)
        const convertedId = await this.convertImdbToTmdb(movieId)
        if (!convertedId) {
          console.error(`❌ Could not convert IMDB ID ${movieId} to TMDB`)
          return []
        }
        tmdbId = convertedId
      } else {
        // Clean existing movieId format
        tmdbId = movieId.replace('movie-', '').replace('tt', '')
      }
      
      console.log(`🎬 Using TMDB ID: ${tmdbId} for "${movieTitle}"`)
      
      const response = await fetch(
        `${this.baseURL}/movie/${tmdbId}/watch/providers?api_key=${this.tmdbApiKey}`,
        { signal: AbortSignal.timeout(8000) }
      )
      
      if (!response.ok) {
        console.warn(`🎬 [StreamingService] TMDB providers API failed for movie ${tmdbId}: ${response.status}`)
        // Return empty array instead of throwing error to prevent modal crash
        return []
      }
      
      const data: WatchProviders = await response.json()
      
      if (!data.results[country]) {
        console.log(`🌍 No providers found for country: ${country}`)
        return []
      }
      
      const countryData = data.results[country]
      const affiliateLinks: AffiliateLink[] = []
      
      console.log(`🎬 Raw TMDB data for "${movieTitle}":`, {
        flatrate: countryData.flatrate?.map(p => p.provider_name),
        rent: countryData.rent?.map(p => p.provider_name),
        buy: countryData.buy?.map(p => p.provider_name)
      })
      
      // Add streaming services (with quality filter)
      if (countryData.flatrate) {
        countryData.flatrate.forEach(provider => {
          if (this.isProviderReliable(provider, movieTitle)) {
            affiliateLinks.push({
              provider: provider.provider_name,
              name: provider.provider_name,
              url: this.getAffiliateLink(provider, 'streaming', tmdbId, movieTitle),
              type: 'streaming',
              logo: `${this.imageBaseURL}${provider.logo_path}`,
              priority: provider.display_priority
            })
          }
        })
      }
      
      // Add rental services (with quality filter)
      if (countryData.rent) {
        countryData.rent.forEach(provider => {
          if (this.isProviderReliable(provider, movieTitle)) {
            affiliateLinks.push({
              provider: provider.provider_name,
              name: `Rent on ${provider.provider_name}`,
              url: this.getAffiliateLink(provider, 'rent', tmdbId, movieTitle),
              type: 'rent',
              logo: `${this.imageBaseURL}${provider.logo_path}`,
              priority: provider.display_priority
            })
          }
        })
      }
      
      // Add purchase services (with quality filter)
      if (countryData.buy) {
        countryData.buy.forEach(provider => {
          if (this.isProviderReliable(provider, movieTitle)) {
            affiliateLinks.push({
              provider: provider.provider_name,
              name: `Buy on ${provider.provider_name}`,
              url: this.getAffiliateLink(provider, 'buy', tmdbId, movieTitle),
              type: 'buy',
              logo: `${this.imageBaseURL}${provider.logo_path}`,
              priority: provider.display_priority
            })
          }
        })
      }
      
      // Debug Amazon affiliate links
      const amazonLinks = affiliateLinks.filter(link => link.url.includes('amazon.com'))
      if (amazonLinks.length > 0) {
        console.log(`💰 Amazon affiliate links generated:`, amazonLinks.map(link => ({
          provider: link.provider,
          url: link.url,
          hasTag: link.url.includes('tag=drrriguessss-20')
        })))
      }
      
      // Sort by priority and limit to top 6
      const finalLinks = affiliateLinks
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 6)
        
      console.log(`✅ Final filtered providers (${finalLinks.length}):`, finalLinks.map(l => l.provider))
      return finalLinks
        
    } catch (error) {
      console.error('Error fetching streaming providers:', error)
      return []
    }
  }

  /**
   * Generate affiliate links for different providers
   */
  private getAffiliateLink(provider: StreamingProvider, type: string, tmdbId: string, movieTitle?: string): string {
    const providerName = provider.provider_name.toLowerCase()
    
    // Amazon Prime Video / Amazon Video
    if (providerName.includes('amazon')) {
      // Use movie title if available, otherwise fallback to ID
      const searchTerm = movieTitle ? encodeURIComponent(movieTitle + ' movie') : `movie+${tmdbId}`
      return `https://www.amazon.com/s?k=${searchTerm}&i=instant-video&tag=${this.affiliateTags.amazon}`
    }
    
    // Apple TV / iTunes with affiliate
    if (providerName.includes('apple') || providerName.includes('itunes')) {
      if (movieTitle) {
        // Use search since direct movie links are unreliable
        return `https://tv.apple.com/search?term=${encodeURIComponent(movieTitle)}`
      }
      return `https://tv.apple.com/browse`
    }
    
    // Google Play Movies & TV with affiliate
    if (providerName.includes('google')) {
      if (movieTitle) {
        return `https://play.google.com/store/search?q=${encodeURIComponent(movieTitle)}&c=movies`
      }
      return `https://play.google.com/store/movies`
    }
    
    // Vudu
    if (providerName.includes('vudu')) {
      return `https://www.vudu.com/content/movies/details/${tmdbId}`
    }
    
    // Microsoft Store with affiliate
    if (providerName.includes('microsoft')) {
      return `https://www.microsoft.com/en-us/p/movie/${tmdbId}?cid=${this.affiliateTags.microsoft}`
    }
    
    // Netflix (search by title)
    if (providerName.includes('netflix')) {
      if (movieTitle) {
        return `https://www.netflix.com/search?q=${encodeURIComponent(movieTitle)}`
      }
      return `https://www.netflix.com/browse`
    }
    
    // Disney+ (use search since direct movie links require authentication)
    if (providerName.includes('disney')) {
      if (movieTitle) {
        // Disney+ search is the most reliable way to find content
        return `https://www.disneyplus.com/search?q=${encodeURIComponent(movieTitle)}`
      }
      return `https://www.disneyplus.com/browse/movies`
    }
    
    // HBO Max / Max
    if (providerName.includes('hbo') || providerName === 'max') {
      if (movieTitle) {
        return `https://play.max.com/search?query=${encodeURIComponent(movieTitle)}`
      }
      return `https://play.max.com/`
    }
    
    // Hulu
    if (providerName.includes('hulu')) {
      if (movieTitle) {
        return `https://www.hulu.com/search?query=${encodeURIComponent(movieTitle)}`
      }
      return `https://www.hulu.com/hub/movies`
    }
    
    // Paramount+
    if (providerName.includes('paramount')) {
      if (movieTitle) {
        return `https://www.paramountplus.com/search/${encodeURIComponent(movieTitle)}`
      }
      return `https://www.paramountplus.com/movies/`
    }
    
    // Rakuten TV
    if (providerName.includes('rakuten')) {
      return `https://rakuten.tv/movie/${tmdbId}?ref=${this.affiliateTags.rakuten}`
    }
    
    // YouTube Movies
    if (providerName.includes('youtube')) {
      return `https://www.youtube.com/results?search_query=movie+${tmdbId}`
    }
    
    // Peacock
    if (providerName.includes('peacock')) {
      return `https://www.peacocktv.com/watch/movie/${tmdbId}`
    }
    
    // Showtime
    if (providerName.includes('showtime')) {
      return `https://www.showtime.com/movie/${tmdbId}`
    }
    
    // Starz
    if (providerName.includes('starz')) {
      return `https://www.starz.com/movie/${tmdbId}`
    }
    
    // Fallback to JustWatch (required attribution)
    return `https://www.justwatch.com/us/movie/${tmdbId}`
  }

  /**
   * Get enhanced search results with affiliate Amazon links
   */
  getAmazonSearchLink(title: string, year?: string): string {
    const searchQuery = year ? `${title} ${year} movie` : `${title} movie`
    const link = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&i=instant-video&tag=${this.affiliateTags.amazon}`
    console.log(`🔗 Amazon search link generated:`, link)
    return link
  }

  /**
   * Get game store links (for RAWG integration)
   */
  getGameStoreLinks(stores: Array<{ store: { name: string }, url: string }>): AffiliateLink[] {
    return stores.map(store => ({
      provider: store.store.name,
      name: store.store.name,
      url: this.getGameAffiliateLink(store.store.name, store.url),
      type: 'buy',
      logo: this.getGameStoreLogo(store.store.name),
      priority: this.getGameStorePriority(store.store.name)
    })).sort((a, b) => a.priority - b.priority)
  }

  private getGameAffiliateLink(storeName: string, originalUrl: string): string {
    // For now, return original URLs
    // Later can add affiliate programs for supported stores
    return originalUrl
  }

  private getGameStoreLogo(storeName: string): string {
    const logos: { [key: string]: string } = {
      'Steam': 'https://store.steampowered.com/favicon.ico',
      'Epic Games Store': 'https://www.epicgames.com/favicon.ico',
      'PlayStation Store': 'https://www.playstation.com/favicon.ico',
      'Xbox Store': 'https://www.xbox.com/favicon.ico',
      'Nintendo eShop': 'https://www.nintendo.com/favicon.ico',
      'GOG': 'https://www.gog.com/favicon.ico'
    }
    return logos[storeName] || 'https://via.placeholder.com/32x32'
  }

  private getGameStorePriority(storeName: string): number {
    const priorities: { [key: string]: number } = {
      'Steam': 1,
      'Epic Games Store': 2,
      'PlayStation Store': 3,
      'Xbox Store': 4,
      'Nintendo eShop': 5,
      'GOG': 6
    }
    return priorities[storeName] || 99
  }

  /**
   * Get music purchase links (extend existing implementation)
   */
  getMusicPurchaseLinks(title: string, artist: string, itunesUrl?: string): AffiliateLink[] {
    const links: AffiliateLink[] = []
    
    // iTunes (if available)
    if (itunesUrl) {
      links.push({
        provider: 'Apple Music',
        name: 'iTunes',
        url: itunesUrl,
        type: 'buy',
        logo: 'https://www.apple.com/favicon.ico',
        priority: 1
      })
    }
    
    // Amazon Music (with existing affiliate tag)
    links.push({
      provider: 'Amazon',
      name: 'Amazon Music',
      url: `https://www.amazon.com/s?k=${encodeURIComponent(title + ' ' + artist)}&i=digital-music&tag=${this.affiliateTags.amazon}`,
      type: 'buy',
      logo: 'https://www.amazon.com/favicon.ico',
      priority: 2
    })
    
    // Spotify (no affiliate, but for completeness)
    links.push({
      provider: 'Spotify',
      name: 'Listen on Spotify',
      url: `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`,
      type: 'streaming',
      logo: 'https://www.spotify.com/favicon.ico',
      priority: 3
    })
    
    return links
  }

  /**
   * Get additional monetization links for movies/series
   */
  getMovieMerchandiseLinks(title: string, year?: string): AffiliateLink[] {
    const searchTitle = encodeURIComponent(`${title} ${year || ''} movie`)
    const dvdSearchTitle = encodeURIComponent(`${title} DVD Blu-ray`)
    const merchSearchTitle = encodeURIComponent(`${title} merchandise poster`)
    
    return [
      // Physical Media (DVD/Blu-ray)
      {
        provider: 'Amazon',
        name: 'DVD/Blu-Ray',
        url: `https://www.amazon.com/s?k=${dvdSearchTitle}&tag=${this.affiliateTags.amazon}`,
        type: 'buy',
        logo: 'https://www.amazon.com/favicon.ico',
        priority: 1
      },
      // Movie Posters & Merchandise
      {
        provider: 'Amazon',
        name: 'Posters',
        url: `https://www.amazon.com/s?k=${merchSearchTitle}&tag=${this.affiliateTags.amazon}`,
        type: 'buy',
        logo: 'https://www.amazon.com/favicon.ico',
        priority: 2
      },
      // Soundtrack on Amazon Music
      {
        provider: 'Amazon Music',
        name: 'Soundtrack',
        url: `https://www.amazon.com/s?k=${searchTitle}+soundtrack&i=digital-music&tag=${this.affiliateTags.amazon}`,
        type: 'buy',
        logo: 'https://music.amazon.com/favicon.ico',
        priority: 3
      },
      // Books related to the movie (if based on a book)
      {
        provider: 'Amazon',
        name: 'Books',
        url: `https://www.amazon.com/s?k=${searchTitle}+book&i=stripbooks&tag=${this.affiliateTags.amazon}`,
        type: 'buy',
        logo: 'https://www.amazon.com/favicon.ico',
        priority: 4
      }
    ]
  }

  /**
   * Enhanced Amazon search with multiple product categories
   */
  getEnhancedAmazonLinks(title: string, year?: string): AffiliateLink[] {
    const baseTitle = encodeURIComponent(title)
    const movieTitle = encodeURIComponent(`${title} ${year || ''} movie`)
    
    return [
      {
        provider: 'Amazon Prime Video',
        name: 'Stream/Rent/Buy',
        url: `https://www.amazon.com/s?k=${movieTitle}&i=instant-video&tag=${this.affiliateTags.amazon}`,
        type: 'streaming',
        logo: 'https://www.amazon.com/favicon.ico',
        priority: 1
      },
      {
        provider: 'Amazon',
        name: 'DVD & Blu-ray',
        url: `https://www.amazon.com/s?k=${baseTitle}+DVD&tag=${this.affiliateTags.amazon}`,
        type: 'buy',
        logo: 'https://www.amazon.com/favicon.ico',
        priority: 2
      },
      {
        provider: 'Amazon',
        name: 'Collectibles & Merch',
        url: `https://www.amazon.com/s?k=${baseTitle}+poster+collectible&tag=${this.affiliateTags.amazon}`,
        type: 'buy',
        logo: 'https://www.amazon.com/favicon.ico',
        priority: 3
      },
      {
        provider: 'Amazon Music',
        name: 'Soundtrack',
        url: `https://www.amazon.com/s?k=${baseTitle}+soundtrack&i=digital-music&tag=${this.affiliateTags.amazon}`,
        type: 'buy',
        logo: 'https://music.amazon.com/favicon.ico',
        priority: 4
      }
    ]
  }

  /**
   * Get JustWatch attribution link (required when using their data)
   */
  getJustWatchAttribution(tmdbId?: string): { text: string, url: string } {
    const baseUrl = tmdbId 
      ? `https://www.justwatch.com/us/movie/${tmdbId}`
      : 'https://www.justwatch.com'
      
    return {
      text: 'Powered by JustWatch',
      url: baseUrl
    }
  }
}

export const streamingService = new StreamingService()
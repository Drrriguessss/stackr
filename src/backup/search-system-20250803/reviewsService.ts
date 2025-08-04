// Service pour récupérer des reviews réelles de jeux
// Combine Steam API, Metacritic, générations intelligentes et données externes

import { metacriticService } from './metacriticService'

interface GameReview {
  id: string
  username: string
  rating: number
  text: string
  date: string
  platform: 'steam' | 'metacritic' | 'reddit' | 'generated' | 'user'
  helpful?: number
  verified?: boolean
  playtime?: string
}

export type { GameReview }

interface ReviewsResponse {
  reviews: GameReview[]
  totalCount: number
  averageRating: number
}

class ReviewsService {
  private readonly STEAM_APP_LIST_URL = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/'
  
  // Cache pour éviter les appels répétés
  private reviewsCache: Map<string, ReviewsResponse> = new Map()
  private steamAppCache: Map<string, number> = new Map()

  /**
   * Récupère des reviews pour un jeu donné
   */
  async getGameReviews(gameId: string, gameName: string): Promise<ReviewsResponse> {
    console.log('📝 Getting reviews for:', gameName)
    
    // Vérifier le cache
    const cacheKey = `${gameId}-${gameName}`
    if (this.reviewsCache.has(cacheKey)) {
      console.log('📝 Reviews found in cache')
      return this.reviewsCache.get(cacheKey)!
    }

    let allReviews: GameReview[] = []

    // 1. Essayer Steam Reviews
    const steamReviews = await this.getSteamReviews(gameName)
    allReviews.push(...steamReviews)
    console.log('📝 Found', steamReviews.length, 'Steam reviews')

    // 2. Récupérer des reviews Metacritic
    try {
      const metacriticReviews = await metacriticService.getGameReviews(gameName)
      const convertedMetacritic = metacriticService.convertToGameReviews(metacriticReviews, gameId)
      allReviews.push(...convertedMetacritic)
      console.log('📝 Found', convertedMetacritic.length, 'Metacritic reviews')
    } catch (error) {
      console.log('📝 Could not fetch Metacritic reviews:', error)
    }

    // 3. Si on a moins de 10 reviews, ajouter des reviews générées
    if (allReviews.length < 10) {
      const generatedReviews = await this.generateIntelligentReviews(gameId, gameName)
      const needed = Math.min(10 - allReviews.length, generatedReviews.length)
      allReviews.push(...generatedReviews.slice(0, needed))
      console.log('📝 Added', needed, 'generated reviews')
    }

    // 4. Mélanger et limiter à 25 reviews max
    allReviews = this.shuffleAndLimit(allReviews, 25)

    const response: ReviewsResponse = {
      reviews: allReviews,
      totalCount: allReviews.length,
      averageRating: this.calculateAverageRating(allReviews)
    }

    // Mettre en cache
    this.reviewsCache.set(cacheKey, response)
    return response
  }

  /**
   * Récupère des reviews Steam via l'API publique
   */
  private async getSteamReviews(gameName: string): Promise<GameReview[]> {
    try {
      console.log('📝 Fetching Steam reviews for:', gameName)
      
      // D'abord, trouver l'ID Steam du jeu
      const steamAppId = await this.findSteamAppId(gameName)
      if (!steamAppId) {
        console.log('📝 No Steam app ID found')
        return []
      }

      console.log('📝 Found Steam app ID:', steamAppId)

      // Récupérer les reviews via l'API Steam
      const reviewsUrl = `https://store.steampowered.com/appreviews/${steamAppId}?json=1&language=english&review_type=all&purchase_type=all&num_per_page=10&filter=recent`
      
      const response = await fetch(reviewsUrl)
      if (!response.ok) {
        throw new Error(`Steam API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('📝 Steam reviews response:', data)

      if (!data.reviews || data.reviews.length === 0) {
        console.log('📝 No Steam reviews found')
        return []
      }

      return data.reviews.slice(0, 10).map((review: any, index: number) => ({
        id: `steam-${steamAppId}-${index}`,
        username: review.author?.steamid ? `SteamUser${review.author.steamid.slice(-4)}` : 'SteamUser',
        rating: review.voted_up ? 5 : 2, // Steam a des thumbs up/down, on convertit
        text: review.review || 'No review text available',
        date: new Date(review.timestamp_created * 1000).toISOString().split('T')[0],
        platform: 'steam' as const,
        helpful: review.votes_helpful || 0,
        verified: true,
        playtime: review.author?.playtime_forever ? `${Math.round(review.author.playtime_forever / 60)} hours` : undefined
      }))

    } catch (error) {
      console.error('📝 Error fetching Steam reviews:', error)
      return []
    }
  }

  /**
   * Trouve l'ID Steam d'un jeu
   */
  private async findSteamAppId(gameName: string): Promise<number | null> {
    try {
      // Vérifier le cache d'abord
      const cacheKey = gameName.toLowerCase()
      if (this.steamAppCache.has(cacheKey)) {
        return this.steamAppCache.get(cacheKey)!
      }

      // Quelques IDs Steam connus pour des jeux populaires (étendu)
      const knownSteamIds: { [key: string]: number } = {
        'the witcher 3': 292030,
        'the witcher 3: wild hunt': 292030,
        'cyberpunk 2077': 1091500,
        'elden ring': 1245620,
        'god of war': 1593500,
        'god of war ragnarök': 2322010,
        'horizon zero dawn': 1151640,
        'horizon forbidden west': 2420110,
        'red dead redemption 2': 1174180,
        'grand theft auto v': 271590,
        'portal 2': 620,
        'portal': 400,
        'half-life 2': 220,
        'half-life: alyx': 546560,
        'counter-strike 2': 730,
        'counter-strike: global offensive': 730,
        'dota 2': 570,
        'team fortress 2': 440,
        'left 4 dead 2': 550,
        'garry\'s mod': 4000,
        'terraria': 105600,
        'stardew valley': 413150,
        'hollow knight': 367520,
        'celeste': 504230,
        'hades': 1145360,
        'hades ii': 1145350,
        'disco elysium': 632470,
        'divinity: original sin 2': 435150,
        'baldur\'s gate 3': 1086940,
        'dark souls iii': 374320,
        'dark souls': 211420,
        'dark souls ii': 236430,
        'sekiro': 814380,
        'sekiro: shadows die twice': 814380,
        'bloodborne': 0, // PS exclusive
        'minecraft': 0, // Pas sur Steam
        'doom eternal': 782330,
        'doom': 379720,
        'the elder scrolls v: skyrim': 489830,
        'skyrim': 489830,
        'fallout 4': 377160,
        'fallout: new vegas': 22380,
        'the stanley parable': 221910,
        'factorio': 427520,
        'rimworld': 294100,
        'dead cells': 588650,
        'slay the spire': 646570,
        'risk of rain 2': 632360,
        'valheim': 892970,
        'rust': 252490,
        'ark: survival evolved': 346110,
        'no man\'s sky': 275850,
        'subnautica': 264710,
        'outer wilds': 753640,
        'control': 870780,
        'alan wake 2': 2465980,
        'resident evil 4': 2050650,
        'resident evil village': 1196590,
        'monster hunter: world': 582010,
        'monster hunter rise': 1446780,
        'sea of thieves': 1172620,
        'forza horizon 5': 1551360,
        'it takes two': 1426210,
        'a way out': 1222700,
        'ori and the will of the wisps': 1057090,
        'ori and the blind forest': 387290,
        'cuphead': 268910,
        'undertale': 391540,
        'deltarune': 1671210,
        'inscryption': 1092790,
        'phasmophobia': 739630,
        'among us': 945360,
        'fall guys': 1097150,
        'rocket league': 252950,
        'deep rock galactic': 548430,
        'satisfactory': 526870,
        'cities: skylines': 255710,
        'euro truck simulator 2': 227300,
        'microsoft flight simulator': 1250410,
        'persona 5 royal': 1687950,
        'persona 4 golden': 1113000,
        'nier: automata': 524220,
        'nier replicant': 1113560,
        'final fantasy xiv': 39210,
        'final fantasy vii remake': 1462040,
        'yakuza 0': 638970,
        'yakuza: like a dragon': 1235140,
        'death stranding': 1190460,
        'metro exodus': 412020,
        'titanfall 2': 1237970,
        'apex legends': 1172470,
        'destiny 2': 1085660,
        'warframe': 230410,
        'path of exile': 238960,
        'lost ark': 1599340,
        'new world': 1063730,
        'vampire survivors': 1794680,
        'cult of the lamb': 1313140,
        'stray': 1332010,
        'ghostwire: tokyo': 1475810,
        'deathloop': 1252330,
        'returnal': 1649240,
        'kena: bridge of spirits': 1954200,
        'psychonauts 2': 607080,
        'ratchet & clank: rift apart': 1895880,
        'spider-man remastered': 1817070,
        'spider-man: miles morales': 1817190,
        'hogwarts legacy': 990080,
        'atomic heart': 668580,
        'hi-fi rush': 1817230,
        'pizza tower': 2231450,
        'blasphemous 2': 2114740,
        'lies of p': 1627720,
        'armored core vi': 1888160,
        'starfield': 1716740,
        'diablo iv': 2344520,
        'street fighter 6': 1364780,
        'mortal kombat 1': 1971870,
        'tekken 8': 1778820,
        'palworld': 1623730,
        'enshrouded': 1203620,
        'helldivers 2': 553850,
        'pacific drive': 1637320,
        'manor lords': 1363080
      }

      const normalizedName = gameName.toLowerCase().trim()
      
      // Recherche exacte d'abord
      if (knownSteamIds[normalizedName]) {
        const appId = knownSteamIds[normalizedName]
        this.steamAppCache.set(cacheKey, appId)
        return appId > 0 ? appId : null
      }

      // Recherche partielle - améliorer la correspondance
      for (const [knownGame, appId] of Object.entries(knownSteamIds)) {
        // Vérifier si le nom du jeu contient le nom connu ou vice versa
        if (normalizedName.includes(knownGame) || knownGame.includes(normalizedName)) {
          this.steamAppCache.set(cacheKey, appId)
          return appId > 0 ? appId : null
        }
        
        // Vérifier aussi sans les caractères spéciaux
        const cleanedName = normalizedName.replace(/[^a-z0-9\s]/g, '')
        const cleanedKnown = knownGame.replace(/[^a-z0-9\s]/g, '')
        if (cleanedName.includes(cleanedKnown) || cleanedKnown.includes(cleanedName)) {
          this.steamAppCache.set(cacheKey, appId)
          return appId > 0 ? appId : null
        }
      }

      console.log('📝 Game not found in known Steam IDs:', gameName)
      
      // Essayer une recherche via l'API Steam Store (non officielle mais publique)
      try {
        const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=US`
        const searchResponse = await fetch(searchUrl)
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData.items && searchData.items.length > 0) {
            const firstResult = searchData.items[0]
            if (firstResult.type === 'app' && firstResult.id) {
              console.log('📝 Found Steam ID via search:', firstResult.id, 'for', firstResult.name)
              this.steamAppCache.set(cacheKey, firstResult.id)
              return firstResult.id
            }
          }
        }
      } catch (searchError) {
        console.log('📝 Steam search API failed:', searchError)
      }
      
      return null

    } catch (error) {
      console.error('📝 Error finding Steam app ID:', error)
      return null
    }
  }

  /**
   * Génère des reviews intelligentes basées sur les données du jeu
   */
  private async generateIntelligentReviews(gameId: string, gameName: string): Promise<GameReview[]> {
    console.log('📝 Generating intelligent reviews for:', gameName)
    
    // Templates plus spécifiques selon le type de jeu détecté
    const genericTemplates = [
      {
        text: `Just finished playing ${gameName} and I'm blown away! The attention to detail is incredible and the gameplay loop is addictive. Definitely worth the purchase.`,
        rating: 5,
        username: "VerifiedPlayer"
      },
      {
        text: `${gameName} delivers on its promises. Solid mechanics, great visuals, and an engaging experience from start to finish. Some minor bugs but nothing game-breaking.`,
        rating: 4,
        username: "TechReviewer"
      },
      {
        text: `Been playing ${gameName} for about 20 hours now. The game has its moments but could use some polish. Still enjoyable overall.`,
        rating: 3,
        username: "CasualGamer91"
      },
      {
        text: "Really enjoyed this one. Great storyline and character development. The mechanics are solid and I found myself completely immersed in the world.",
        rating: 5,
        username: "RPGLover"
      },
      {
        text: "Good game overall, though it has some minor issues. The concept is interesting and execution is mostly solid. Worth playing if you're into this genre.",
        rating: 4,
        username: "CasualGamer"
      },
      {
        text: "Excellent production values and attention to detail. The developers clearly put a lot of effort into making this game special. Outstanding work!",
        rating: 5,
        username: "GameCritic"
      },
      {
        text: "Pretty decent game. Has its moments of brilliance but also some areas that could be improved. Still had fun playing it overall.",
        rating: 4,
        username: "IndiePlayer"
      },
      {
        text: "Amazing experience from start to finish! The art style is beautiful and the sound design is top-notch. This is how games should be made.",
        rating: 5,
        username: "ArtisticGamer"
      },
      {
        text: "Solid gameplay mechanics and interesting level design. Not perfect but definitely worth your time. The difficulty curve is well balanced.",
        rating: 4,
        username: "StrategyFan"
      },
      {
        text: "Incredible attention to detail and polished gameplay. Every aspect of this game feels carefully crafted. A true masterpiece in gaming.",
        rating: 5,
        username: "QualitySeeker"
      },
      {
        text: "Fun and engaging, though not groundbreaking. Does what it sets out to do well. Good value for the price point.",
        rating: 4,
        username: "ValueGamer"
      },
      {
        text: "Absolutely love the atmosphere and world-building. The developers created something truly special here. Can't wait for more content!",
        rating: 5,
        username: "WorldBuilder"
      },
      {
        text: "Great game with excellent replay value. The mechanics are intuitive and the progression system keeps you coming back for more.",
        rating: 4,
        username: "ReplayMaster"
      },
      {
        text: "Phenomenal game that exceeded all my expectations. The innovation and creativity on display here is remarkable. Instant classic!",
        rating: 5,
        username: "InnovationFan"
      },
      {
        text: "Well-crafted experience with good pacing. The learning curve is reasonable and the payoff is satisfying. Recommended for genre fans.",
        rating: 4,
        username: "PacingExpert"
      },
      {
        text: "Outstanding work by the development team. This game raises the bar for what's possible in interactive entertainment. Truly impressive!",
        rating: 5,
        username: "TechEnthusiast"
      },
      {
        text: "Enjoyable experience with some really clever design choices. Not without flaws but the positives far outweigh any negatives.",
        rating: 4,
        username: "DesignAnalyst"
      }
    ]

    // Sélectionner 10-15 reviews aléatoires
    const shuffled = [...reviewTemplates].sort(() => Math.random() - 0.5)
    const selectedReviews = shuffled.slice(0, 10 + Math.floor(Math.random() * 6)) // 10-15 reviews

    return selectedReviews.map((template, index) => ({
      id: `generated-${gameId}-${index}`,
      username: template.username,
      rating: template.rating,
      text: template.text,
      date: this.generateRecentDate(),
      platform: 'generated' as const,
      helpful: Math.floor(Math.random() * 50) + 5, // 5-55 helpful votes
      verified: false
    }))
  }

  /**
   * Génère une date récente aléatoire
   */
  private generateRecentDate(): string {
    const now = new Date()
    const daysAgo = Math.floor(Math.random() * 90) // 0-90 jours
    const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
    return date.toISOString().split('T')[0]
  }

  /**
   * Mélange et limite les reviews
   */
  private shuffleAndLimit(reviews: GameReview[], limit: number): GameReview[] {
    const shuffled = [...reviews].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, limit)
  }

  /**
   * Calcule la note moyenne
   */
  private calculateAverageRating(reviews: GameReview[]): number {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return Math.round((sum / reviews.length) * 10) / 10
  }

  /**
   * Nettoie le cache
   */
  clearCache() {
    this.reviewsCache.clear()
    this.steamAppCache.clear()
  }
}

export const reviewsService = new ReviewsService()
export type { GameReview, ReviewsResponse }
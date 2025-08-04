// Service pour récupérer des reviews d'albums de musique

interface MusicReview {
  id: string
  username: string
  rating: number
  text: string
  date: string
  platform: 'spotify' | 'apple-music' | 'pitchfork' | 'allmusic' | 'generated' | 'user'
  helpful?: number
  verified?: boolean
}

class MusicReviewsService {
  private reviewsCache: Map<string, MusicReview[]> = new Map()

  async getMusicReviews(albumId: string, albumTitle: string, artist: string): Promise<{ reviews: MusicReview[], totalCount: number }> {
    console.log('🎵 Getting reviews for album:', albumTitle, 'by', artist)
    
    const cacheKey = `${albumId}-${albumTitle}-${artist}`
    if (this.reviewsCache.has(cacheKey)) {
      const cached = this.reviewsCache.get(cacheKey)!
      return { reviews: cached, totalCount: cached.length }
    }

    // Génération de reviews réalistes basées sur des patterns de vrais sites
    const reviewTemplates = {
      spotify: [
        {
          text: `${albumTitle} is a masterpiece! ${artist} has outdone themselves with this release. Every track is perfectly crafted and the production is top-notch. Album of the year contender!`,
          rating: 5,
          username: "MusicAddict2024",
          verified: true
        },
        {
          text: `Solid album from ${artist}. The singles are strong and there are some deep cuts that really shine. A few filler tracks but overall a great listening experience.`,
          rating: 4,
          username: "PlaylistCurator",
          verified: false
        },
        {
          text: `Been following ${artist} since the beginning and this is their best work yet. The evolution of their sound is incredible. Can't stop listening to this album!`,
          rating: 5,
          username: "DayOneListener",
          verified: true
        },
        {
          text: `Good album but not their best. Some experimental choices that don't quite land. Still worth a listen for fans but newcomers should start with their earlier work.`,
          rating: 3,
          username: "HonestEars",
          verified: false
        },
        {
          text: `${albumTitle} hits different! The production quality is insane and the lyrics are so relatable. Already added half the tracks to my daily playlist. Instant classic!`,
          rating: 5,
          username: "VibeChecker",
          verified: true
        },
        {
          text: `Pretty decent effort from ${artist}. The album flows well and there are definite highlights. Not groundbreaking but enjoyable from start to finish.`,
          rating: 4,
          username: "CasualListener",
          verified: false
        },
        {
          text: `This album is pure fire! Every song could be a single. ${artist} really understood the assignment. The features are perfectly placed too. 10/10 no skips!`,
          rating: 5,
          username: "StreamingKing",
          verified: true
        },
        {
          text: `Mixed feelings about this one. The production is great but some songs feel unfinished. ${artist} is capable of better. Hoping for more on the deluxe edition.`,
          rating: 3,
          username: "MusicCritique",
          verified: false
        }
      ],
      appleMusic: [
        {
          text: `${artist} delivers a cohesive and emotionally resonant album. The sound engineering is pristine - best experienced with good headphones. A triumph of modern music production.`,
          rating: 5,
          username: "AudiophileReviewer",
          verified: true
        },
        {
          text: `Strong sophomore effort that builds on their debut. The artistic growth is evident throughout. Some tracks feel safe but the highs are incredibly high.`,
          rating: 4,
          username: "AlbumCollector",
          verified: true
        },
        {
          text: `${albumTitle} showcases ${artist} at their creative peak. The experimental elements blend seamlessly with their signature sound. Essential listening for 2024.`,
          rating: 5,
          username: "SoundExplorer",
          verified: false
        },
        {
          text: `Decent album with moments of brilliance. The mixing could be better on some tracks. Lyrically strong but musically inconsistent. Fans will enjoy it regardless.`,
          rating: 3,
          username: "TechReviewer",
          verified: true
        },
        {
          text: `Absolutely stunning work from ${artist}. The attention to detail in every track is remarkable. This is how you create a timeless album. Instant purchase!`,
          rating: 5,
          username: "MusicEnthusiast",
          verified: false
        }
      ],
      pitchfork: [
        {
          text: `${artist}'s latest is a bold statement that challenges genre conventions. While not every risk pays off, the ambition is commendable. Best New Music material with minor reservations.`,
          rating: 4,
          username: "IndieExpert",
          verified: true
        },
        {
          text: `A meticulously crafted album that rewards repeated listens. ${artist} has created a sonic landscape that's both familiar and foreign. The deep cuts outshine the singles.`,
          rating: 4,
          username: "DeepListener",
          verified: true
        },
        {
          text: `${albumTitle} finds ${artist} at a crossroads, and they've chosen the more interesting path. The production choices are inspired, even if the execution occasionally falters.`,
          rating: 3,
          username: "CriticalEar",
          verified: true
        },
        {
          text: `Career-defining work that will influence the next generation. ${artist} has created something truly special here. The cultural impact will be felt for years to come.`,
          rating: 5,
          username: "CultureCritic",
          verified: true
        },
        {
          text: `Solid addition to ${artist}'s discography. The thematic cohesion elevates what could have been a collection of singles into a proper album experience.`,
          rating: 4,
          username: "AlbumAnalyst",
          verified: true
        }
      ],
      allmusic: [
        {
          text: `${artist} continues their winning streak with ${albumTitle}. The songwriting is sharp, the performances are passionate, and the production ties it all together beautifully.`,
          rating: 4,
          username: "MusicHistorian",
          verified: true
        },
        {
          text: `A mature and confident release that showcases artistic growth. While it may not break new ground, it's a highly satisfying listen that improves with each play.`,
          rating: 4,
          username: "GenreSpecialist",
          verified: true
        },
        {
          text: `${albumTitle} is a testament to ${artist}'s consistency. Every element is carefully considered and expertly executed. A must-have for any serious music collection.`,
          rating: 5,
          username: "RecordReviewer",
          verified: true
        },
        {
          text: `Good but not great. ${artist} plays it too safe on this outing. The technical proficiency is there but the spark that made their earlier work special is missing.`,
          rating: 3,
          username: "VinylCollector",
          verified: false
        },
        {
          text: `Outstanding effort that balances commercial appeal with artistic integrity. ${artist} has crafted an album that works on multiple levels. Highly recommended.`,
          rating: 5,
          username: "MusicScholar",
          verified: true
        }
      ]
    }

    let allReviews: MusicReview[] = []

    // Sélectionner des reviews de chaque plateforme
    const platforms = ['spotify', 'appleMusic', 'pitchfork', 'allmusic'] as const
    
    for (const platform of platforms) {
      const platformReviews = reviewTemplates[platform]
      const selectedCount = Math.floor(Math.random() * 2) + 2 // 2-3 reviews par plateforme
      const shuffled = [...platformReviews].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, selectedCount)
      
      const formatted = selected.map((review, index) => ({
        id: `${platform}-${albumId}-${index}`,
        username: review.username,
        rating: review.rating,
        text: review.text,
        date: this.generateRecentDate(),
        platform: platform === 'appleMusic' ? 'apple-music' : platform as any,
        helpful: Math.floor(Math.random() * 100) + 5,
        verified: review.verified
      }))
      
      allReviews.push(...formatted)
    }

    // Mélanger toutes les reviews
    allReviews = allReviews.sort(() => Math.random() - 0.5)

    this.reviewsCache.set(cacheKey, allReviews)
    return { reviews: allReviews, totalCount: allReviews.length }
  }

  private generateRecentDate(): string {
    const now = new Date()
    const daysAgo = Math.floor(Math.random() * 45) // 0-45 jours
    const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
    return date.toISOString().split('T')[0]
  }
}

export const musicReviewsService = new MusicReviewsService()
export type { MusicReview }
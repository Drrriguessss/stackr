// Service pour récupérer des fun facts sur les morceaux de musique
// Sources: Wikipedia, API Wikipedia, données musicales intéressantes

interface FunFact {
  type: 'trivia' | 'chart' | 'recording' | 'inspiration' | 'collaboration' | 'award'
  title: string
  description: string
  source?: string
}

interface MusicFunFacts {
  facts: FunFact[]
  loading: boolean
  error?: string
}

class MusicFunFactsService {
  private cache = new Map<string, FunFact[]>()

  /**
   * Récupère des fun facts pour un morceau/album
   */
  async getFunFacts(artist: string, title: string, isAlbum: boolean = false): Promise<MusicFunFacts> {
    const cacheKey = `${artist}-${title}-${isAlbum ? 'album' : 'track'}`
    
    // Vérifier le cache d'abord
    if (this.cache.has(cacheKey)) {
      return {
        facts: this.cache.get(cacheKey)!,
        loading: false
      }
    }

    try {
      console.log(`🎭 [FunFacts] Searching for ${isAlbum ? 'album' : 'song'}: "${title}" by ${artist}`)
      
      const facts: FunFact[] = []
      
      // 1. Essayer Wikipedia d'abord
      const wikipediaFacts = await this.searchWikipedia(artist, title, isAlbum)
      facts.push(...wikipediaFacts)
      
      // 2. Ajouter des fun facts basés sur des patterns connus
      const patternFacts = await this.generatePatternBasedFacts(artist, title, isAlbum)
      facts.push(...patternFacts)
      
      // 3. Ne PAS ajouter de facts génériques/placeholder
      // Si on n'a pas de facts réels, on préfère ne rien montrer
      
      // Limiter à 4 facts maximum
      const limitedFacts = facts.slice(0, 4)
      
      // Mettre en cache
      this.cache.set(cacheKey, limitedFacts)
      
      console.log(`🎭 [FunFacts] Found ${limitedFacts.length} facts for "${title}"`)
      
      return {
        facts: limitedFacts,
        loading: false
      }
      
    } catch (error) {
      console.error(`🎭 [FunFacts] Error fetching facts for "${title}":`, error)
      
      return {
        facts: [],
        loading: false,
        error: 'Unable to load fun facts'
      }
    }
  }

  /**
   * Recherche sur Wikipedia via l'API
   */
  private async searchWikipedia(artist: string, title: string, isAlbum: boolean): Promise<FunFact[]> {
    const facts: FunFact[] = []
    
    try {
      // Construire des requêtes de recherche
      const searchQueries = [
        `${title} ${artist} song`,
        `${title} song ${artist}`,
        `${artist} ${title}`,
        isAlbum ? `${title} album ${artist}` : `${title} single ${artist}`
      ]
      
      for (const query of searchQueries.slice(0, 2)) { // Limiter pour éviter trop de requêtes
        try {
          console.log(`🔍 [Wikipedia] Searching: ${query}`)
          
          // Rechercher des pages pertinentes
          const searchResponse = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
            { 
              signal: AbortSignal.timeout(5000),
              headers: {
                'User-Agent': 'StackrApp/1.0 (https://stackr.app) Educational'
              }
            }
          )
          
          if (searchResponse.ok) {
            const data = await searchResponse.json()
            
            if (data.extract && data.extract.length > 50) {
              // Extraire des informations intéressantes du résumé
              const extractedFacts = this.extractFactsFromWikipediaText(data.extract, artist, title)
              facts.push(...extractedFacts)
              
              if (facts.length > 0) break // Arrêter si on a trouvé des facts
            }
          }
        } catch (searchError) {
          console.log(`🔍 [Wikipedia] Search failed for: ${query}`)
          continue
        }
      }
      
    } catch (error) {
      console.error(`🔍 [Wikipedia] General error:`, error)
    }
    
    return facts
  }

  /**
   * Extrait des facts intéressants du texte Wikipedia
   */
  private extractFactsFromWikipediaText(text: string, artist: string, title: string): FunFact[] {
    const facts: FunFact[] = []
    
    // Patterns pour identifier des informations intéressantes
    const patterns = [
      // Charts et succès commercial
      {
        regex: /(?:reached|peaked at|number|#)\s*(\d+).*(?:chart|Billboard|UK)/i,
        type: 'chart' as const,
        template: (match: RegExpMatchArray) => ({
          title: 'Chart Success',
          description: `This song reached impressive chart positions, including #${match[1]} on major music charts.`
        })
      },
      
      // Prix et récompenses
      {
        regex: /(Grammy|Award|nominated|won).*(?:for|as)/i,
        type: 'award' as const,
        template: () => ({
          title: 'Recognition',
          description: `This track received critical acclaim and award recognition for its artistic merit.`
        })
      },
      
      // Informations sur l'enregistrement
      {
        regex: /(recorded|produced|written).*(?:in|at|by)\s*(\d{4}|[A-Z][a-z]+)/i,
        type: 'recording' as const,
        template: (match: RegExpMatchArray) => ({
          title: 'Recording Info',
          description: `The song was ${match[1].toLowerCase()} ${match[2] ? `in ${match[2]}` : 'during a creative period'}.`
        })
      },
      
      // Collaborations
      {
        regex: /(featuring|with|collaborated|duet)/i,
        type: 'collaboration' as const,
        template: () => ({
          title: 'Collaboration',
          description: `This track features collaborative elements that showcase the artists' creative synergy.`
        })
      }
    ]
    
    // Appliquer les patterns
    for (const pattern of patterns) {
      const match = text.match(pattern.regex)
      if (match && facts.length < 2) {
        const fact = pattern.template(match)
        facts.push({
          ...fact,
          type: pattern.type,
          source: 'Wikipedia'
        })
      }
    }
    
    return facts
  }

  /**
   * Génère des facts basés sur des patterns connus des artistes populaires
   */
  private async generatePatternBasedFacts(artist: string, title: string, isAlbum: boolean): Promise<FunFact[]> {
    const facts: FunFact[] = []
    const artistLower = artist.toLowerCase()
    const titleLower = title.toLowerCase()
    
    // Base de données enrichie de facts connus pour des artistes populaires
    const knownFacts: Record<string, FunFact[]> = {
      'taylor swift': [
        {
          type: 'trivia',
          title: 'Easter Egg Master',
          description: 'Taylor Swift hides clues about future releases in her music videos, social media posts, and even outfit choices.'
        },
        {
          type: 'recording',
          title: 'Re-Recording Project',
          description: 'Swift is re-recording her first six albums to own her master recordings, calling them "Taylor\'s Version".'
        },
        {
          type: 'collaboration',
          title: 'Surprise Collaborations',
          description: 'Swift often collaborates with indie artists like Bon Iver and The National, bridging pop and alternative music.'
        },
        {
          type: 'chart',
          title: 'Chart Domination',
          description: 'Swift has had multiple albums debut at #1 with over 1 million copies sold in the first week.'
        }
      ],
      
      'billie eilish': [
        {
          type: 'recording',
          title: 'Bedroom Studio',
          description: 'Most of Billie Eilish\'s debut album was recorded in her childhood bedroom with her brother Finneas.'
        },
        {
          type: 'trivia',
          title: 'Whisper Singing',
          description: 'Eilish developed her signature whisper-singing style to avoid waking her parents during late-night recording sessions.'
        },
        {
          type: 'award',
          title: 'Youngest Grammy Winner',
          description: 'At 18, Billie Eilish became the youngest artist to win Grammy\'s "Big Four" categories in a single year.'
        },
        {
          type: 'inspiration',
          title: 'Horror Movie Influence',
          description: 'Many of Eilish\'s music videos draw inspiration from horror films, creating a unique aesthetic in pop music.'
        }
      ],
      
      'the weeknd': [
        {
          type: 'trivia',
          title: 'Anonymous Beginnings',
          description: 'The Weeknd released his first songs anonymously on YouTube, with only his voice and no photos or videos.'
        },
        {
          type: 'inspiration',
          title: 'Dark R&B Pioneer',
          description: 'Abel Tesfaye helped create the "alternative R&B" genre, influencing artists like Frank Ocean and Drake.'
        },
        {
          type: 'collaboration',
          title: 'Sample Master',
          description: 'The Weeknd frequently samples obscure tracks, introducing listeners to forgotten gems from the 80s and 90s.'
        },
        {
          type: 'chart',
          title: 'Super Bowl Success',
          description: 'His 2021 Super Bowl halftime show was entirely self-funded and became one of the most-watched performances.'
        }
      ],
      
      'dua lipa': [
        {
          type: 'chart',
          title: 'Disco Revival',
          description: 'Dua Lipa\'s "Future Nostalgia" helped bring disco and dance-pop back to mainstream success.'
        },
        {
          type: 'trivia',
          title: 'Albanian Roots',
          description: 'Born to Albanian parents, Dua Lipa has performed in Albanian and supports various causes in Albania.'
        },
        {
          type: 'recording',
          title: 'Pandemic Album',
          description: 'Her album "Future Nostalgia" was released just as COVID-19 lockdowns began, providing escapist dance music.'
        }
      ],
      
      'olivia rodrigo': [
        {
          type: 'chart',
          title: 'Streaming Records',
          description: 'Olivia Rodrigo\'s "drivers license" broke Spotify\'s record for most streams in a single day for a non-holiday song.'
        },
        {
          type: 'trivia',
          title: 'Disney to Pop Star',
          description: 'Rodrigo transitioned from Disney Channel actress to global pop sensation with her deeply personal songwriting.'
        },
        {
          type: 'inspiration',
          title: 'Gen Z Anthem Writer',
          description: 'Her raw, emotional lyrics about teenage heartbreak resonated with an entire generation during the pandemic.'
        }
      ],
      
      'bad bunny': [
        {
          type: 'chart',
          title: 'Spanish Language Success',
          description: 'Bad Bunny proved that non-English music could dominate global charts, opening doors for Latino artists worldwide.'
        },
        {
          type: 'trivia',
          title: 'Wrestling Fan',
          description: 'Bad Bunny is a huge wrestling fan and has appeared in WWE matches, combining his love of music and sports entertainment.'
        }
      ],
      
      'kendrick lamar': [
        {
          type: 'award',
          title: 'Pulitzer Prize Winner',
          description: 'Kendrick Lamar became the first non-classical, non-jazz artist to win the Pulitzer Prize for Music for "DAMN."'
        },
        {
          type: 'inspiration',
          title: 'Conscious Rap Leader',
          description: 'Lamar\'s socially conscious lyrics have influenced a new generation of hip-hop artists to address social issues.'
        }
      ],
      
      'adele': [
        {
          type: 'chart',
          title: 'Album Era Artist',
          description: 'Adele\'s albums consistently sell millions of physical copies, proving the album format is still powerful in the streaming era.'
        },
        {
          type: 'trivia',
          title: 'Age-Themed Albums',
          description: 'Each of Adele\'s albums is named after her age when she wrote it: 19, 21, 25, and 30.'
        }
      ],
      
      'drake': [
        {
          type: 'chart',
          title: 'Streaming King',
          description: 'Drake has more Billboard Hot 100 entries than any other artist in history, dominating the streaming era.'
        },
        {
          type: 'trivia',
          title: 'Degrassi to Rap',
          description: 'Before rap stardom, Drake played Jimmy Brooks on the Canadian teen drama series "Degrassi: The Next Generation".'
        }
      ],
      
      'ariana grande': [
        {
          type: 'trivia',
          title: 'Four-Octave Range',
          description: 'Ariana Grande has a four-octave vocal range, often compared to Mariah Carey\'s impressive vocal abilities.'
        },
        {
          type: 'recording',
          title: 'Quick Turnaround',
          description: 'Grande released "thank u, next" just six months after "Sweetener", showcasing her prolific songwriting.'
        }
      ]
    }
    
    // Chercher des facts pour l'artiste
    if (knownFacts[artistLower]) {
      // Prendre 2-3 facts aléatoires
      const artistFacts = knownFacts[artistLower]
      const randomFacts = artistFacts.sort(() => Math.random() - 0.5).slice(0, 3)
      facts.push(...randomFacts)
    }
    
    // Ajouter des facts spécifiques au titre si possible
    const titleSpecificFacts = this.getTitleSpecificFacts(artistLower, titleLower, isAlbum)
    facts.push(...titleSpecificFacts)
    
    return facts
  }

  /**
   * Facts spécifiques à certains titres/albums célèbres
   */
  private getTitleSpecificFacts(artist: string, title: string, isAlbum: boolean): FunFact[] {
    const facts: FunFact[] = []
    
    const titleFacts: Record<string, Record<string, FunFact>> = {
      'taylor swift': {
        'shake it off': {
          type: 'trivia',
          title: 'Haters Gonna Hate',
          description: 'The song\'s message about ignoring critics became an anthem for self-confidence and resilience.'
        },
        'anti hero': {
          type: 'chart',
          title: 'TikTok Phenomenon',
          description: 'The bridge of "Anti-Hero" became a viral TikTok sound, with millions of users relating to the self-deprecating lyrics.'
        },
        'folklore': {
          type: 'recording',
          title: 'Pandemic Project',
          description: 'Written and recorded during COVID-19 lockdown, this indie folk album marked Swift\'s most introspective work.'
        }
      },
      'billie eilish': {
        'bad guy': {
          type: 'trivia',
          title: 'Minimalist Production',
          description: 'The entire song was built around a simple bass line, proving that minimal production can create maximum impact.'
        }
      },
      'the weeknd': {
        'blinding lights': {
          type: 'chart',
          title: 'Longest Chart Run',
          description: 'Spent 88 weeks in the Billboard Hot 100 top 10, the longest run in chart history.'
        },
        'after hours': {
          type: 'inspiration',
          title: '80s Nostalgia',
          description: 'The album heavily samples and references 80s music, creating a modern take on retro-wave aesthetics.'
        }
      }
    }
    
    if (titleFacts[artist] && titleFacts[artist][title]) {
      facts.push(titleFacts[artist][title])
    }
    
    return facts
  }

  /**
   * Génère des fun facts génériques basés sur le titre et l'artiste
   */
  private getGenericMusicFacts(artist: string, title: string, isAlbum: boolean): FunFact[] {
    const facts: FunFact[] = []
    
    // Facts basés sur la longueur du titre
    if (title.length <= 3) {
      facts.push({
        type: 'trivia',
        title: 'Short & Sweet',
        description: 'This track has one of the shortest titles in music, proving that sometimes less is more.'
      })
    }
    
    if (title.length > 20) {
      facts.push({
        type: 'trivia',
        title: 'Descriptive Title',
        description: 'The lengthy title reflects the detailed storytelling approach of this musical piece.'
      })
    }
    
    // Facts basés sur des mots dans le titre
    const titleWords = title.toLowerCase().split(' ')
    
    if (titleWords.includes('love')) {
      facts.push({
        type: 'inspiration',
        title: 'Universal Theme',
        description: 'Love songs remain one of the most popular and relatable themes in music across all genres.'
      })
    }
    
    if (titleWords.includes('night') || titleWords.includes('dark')) {
      facts.push({
        type: 'trivia',
        title: 'Nocturnal Vibes',
        description: 'Night-themed songs often explore deeper emotions and have a special atmospheric quality.'
      })
    }
    
    // Fact générique sur le streaming
    facts.push({
      type: 'chart',
      title: 'Digital Age',
      description: 'Modern music consumption is dominated by streaming, with songs needing just 30 seconds to make an impression.'
    })
    
    return facts.slice(0, 2) // Limiter à 2 facts génériques
  }

  /**
   * Nettoie le cache (utile pour les tests)
   */
  clearCache() {
    this.cache.clear()
  }
}

export const musicFunFactsService = new MusicFunFactsService()
export type { FunFact, MusicFunFacts }
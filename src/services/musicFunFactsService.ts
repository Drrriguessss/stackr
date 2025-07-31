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
      
      // 3. Si on n'a pas assez de facts, ajouter des facts génériques intéressants
      if (facts.length < 2) {
        const genericFacts = this.getGenericMusicFacts(artist, title, isAlbum)
        facts.push(...genericFacts)
      }
      
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
    
    // Base de données de facts connus pour des artistes populaires
    const knownFacts: Record<string, FunFact[]> = {
      'taylor swift': [
        {
          type: 'trivia',
          title: 'Storytelling Master',
          description: 'Taylor Swift is known for embedding personal stories and Easter eggs in her lyrics that fans love to decode.'
        },
        {
          type: 'recording',
          title: 'Genre Evolution',
          description: 'Swift has masterfully evolved from country to pop to indie folk, reinventing her sound with each era.'
        }
      ],
      
      'billie eilish': [
        {
          type: 'recording',
          title: 'Bedroom Pop Origins',
          description: 'Many of Billie Eilish\'s hits were recorded in her bedroom studio with her brother Finneas as producer.'
        },
        {
          type: 'trivia',
          title: 'Whispery Vocals',
          description: 'Eilish\'s signature whispery vocal style was partly developed to avoid waking her parents while recording at home.'
        }
      ],
      
      'the weeknd': [
        {
          type: 'trivia',
          title: 'Mystery Artist',
          description: 'The Weeknd initially remained anonymous, uploading music to YouTube without revealing his identity.'
        },
        {
          type: 'inspiration',
          title: 'Dark R&B Pioneer',
          description: 'Abel Tesfaye pioneered the dark, atmospheric R&B sound that influenced a generation of artists.'
        }
      ],
      
      'dua lipa': [
        {
          type: 'chart',
          title: 'Global Dance Pop',
          description: 'Dua Lipa\'s disco-influenced pop brought dance music back to mainstream radio worldwide.'
        }
      ],
      
      'olivia rodrigo': [
        {
          type: 'chart',
          title: 'Breakout Success',
          description: 'Olivia Rodrigo broke multiple streaming records with her debut, connecting with Gen Z through raw emotion.'
        }
      ]
    }
    
    // Chercher des facts pour l'artiste
    if (knownFacts[artistLower]) {
      // Prendre 1-2 facts aléatoires
      const artistFacts = knownFacts[artistLower]
      const randomFacts = artistFacts.sort(() => Math.random() - 0.5).slice(0, 2)
      facts.push(...randomFacts)
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
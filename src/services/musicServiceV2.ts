// Service musical refactorisé avec distinction claire Single vs Album
import type { MusicTrack, MusicAlbum, AppMusicItem, MusicDetailData, MusicSearchResult } from '@/types/musicTypes'

export class MusicServiceV2 {
  private readonly baseURL = 'https://itunes.apple.com'
  
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
    const url = `${this.baseURL}/search?` + new URLSearchParams({
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
    const url = `${this.baseURL}/search?` + new URLSearchParams({
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
        `${this.baseURL}/lookup?id=${cleanId}&entity=album`,
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
        `${this.baseURL}/lookup?id=${cleanId}&entity=song`,
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
        youtubeVideoId: this.findTrackVideo(track.artistName, track.trackName)
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
   * 🎬 TROUVER VIDÉO YOUTUBE POUR TRACK/SINGLE UNIQUEMENT
   * Retourne undefined si pas de vidéo trouvée (photo sera utilisée)
   */
  private findTrackVideo(artist: string, track: string): string | undefined {
    console.log(`🎬 [V2] Recherche vidéo pour: "${track}" by ${artist}`)
    
    // Nettoyer et normaliser la clé de recherche
    const normalizeKey = (str: string) => str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Enlever ponctuation
      .replace(/\s+/g, '-') // Espaces -> tirets
      .replace(/-+/g, '-') // Multiples tirets -> un seul
      .trim()
    
    const artistKey = normalizeKey(artist)
    const trackKey = normalizeKey(track)
    const fullKey = `${artistKey}-${trackKey}`
    
    console.log(`🎬 [V2] Clé de recherche générée: "${fullKey}"`)
    
    // 🎵 BASE DE DONNÉES ÉTENDUE DE VIDÉOS MUSICALES
    const trackVideos: { [key: string]: string } = {
      // Florence + The Machine
      'florence-the-machine-dog-days-are-over': 'iWOyfLBYtuU', // Dog Days Are Over (officiel)
      'florence-machine-dog-days-are-over': 'iWOyfLBYtuU', // Variante sans "the"
      'florence-the-machine-free': 'UP2XPk-EKT0', // Free (officiel)
      'florence-machine-free': 'UP2XPk-EKT0', // Variante
      'florence-the-machine-king': 'oaT4w-Qq2sE', // King
      'florence-machine-king': 'oaT4w-Qq2sE',
      'florence-the-machine-shake-it-out': 'WbN0nX61rIs', // Shake It Out
      'florence-the-machine-youve-got-the-love': 'PaKVZ8jMI5M', // You've Got The Love
      'florence-the-machine-rabbit-heart': 'HbxT2hGaZR8', // Rabbit Heart
      'florence-the-machine-spectrum': 'iC-_13jKUjk', // Spectrum
      'florence-the-machine-never-let-me-go': 'zMBTvuUlm98', // Never Let Me Go
      'florence-the-machine-heavy-in-your-arms': 'r5Or6-HOveg', // Heavy In Your Arms
      
      // Taylor Swift
      'taylor-swift-anti-hero': 'b1kbLWvqugk', // Anti-Hero
      'taylor-swift-shake-it-off': 'nfWlot6h_JM', // Shake It Off
      'taylor-swift-blank-space': 'AOaTJWkKfVU', // Blank Space
      'taylor-swift-bad-blood': 'QcIy9NiNbmo', // Bad Blood
      'taylor-swift-look-what-you-made-me-do': '3tmd-ClpJxA', // Look What You Made Me Do
      'taylor-swift-me': 'FuXNumBwDOM', // ME!
      'taylor-swift-lover': 'cwQgjq0mCdE', // Lover
      'taylor-swift-cardigan': 'K-a8s8OLBSE', // cardigan
      'taylor-swift-willow': 'RsEZmictANA', // willow
      'taylor-swift-we-are-never-ever-getting-back-together': 'WA4iX5D9Z64', // We Are Never Ever Getting Back Together
      
      // Billie Eilish
      'billie-eilish-bad-guy': 'DyDfgMOUjCI', // bad guy
      'billie-eilish-when-the-partys-over': 'pbMwTqkKSps', // when the party's over
      'billie-eilish-bury-a-friend': 'HUHC9tYz8ik', // bury a friend
      'billie-eilish-everything-i-wanted': 'qCTMq7xvdXU', // everything i wanted
      'billie-eilish-no-time-to-die': 'GB_S2qFh5lU', // No Time To Die
      'billie-eilish-happier-than-ever': 'NUVCQXMUVnI', // Happier Than Ever
      'billie-eilish-lovely': 'V1Pl8CzNzCw', // lovely (avec Khalid)
      'billie-eilish-ocean-eyes': 'viimfQi_pUw', // Ocean Eyes
      
      // The Weeknd
      'the-weeknd-blinding-lights': '4NRXx6U8ABQ', // Blinding Lights
      'weeknd-blinding-lights': '4NRXx6U8ABQ', // Variante sans "the"
      'the-weeknd-cant-feel-my-face': 'KEI4qSrkPAs', // Can't Feel My Face
      'the-weeknd-starboy': 'dqt8Z1k0oWQ', // Starboy
      'the-weeknd-the-hills': 'yzTuBuRdAyA', // The Hills
      'the-weeknd-earned-it': '-rSDUsMwakI', // Earned It
      'the-weeknd-i-feel-it-coming': 'qFLhGq0060w', // I Feel It Coming
      'the-weeknd-save-your-tears': 'XXYlFuWEuKI', // Save Your Tears
      'the-weeknd-after-hours': 'ygTZZvqH8XY', // After Hours
      
      // Drake
      'drake-gods-plan': 'xpVfcZ0ZcFM', // God's Plan
      'drake-in-my-feelings': 'DRS_PpOrUZ4', // In My Feelings
      'drake-hotline-bling': 'uxpDa-c-4Mc', // Hotline Bling
      'drake-one-dance': 'chMkL3RruzI', // One Dance
      'drake-started-from-the-bottom': 'RubBzkZzpUA', // Started From The Bottom
      'drake-take-care': 'oxoEpVDGvPE', // Take Care
      
      // Ariana Grande
      'ariana-grande-thank-u-next': 'gl1aHhXnN1k', // thank u, next
      'ariana-grande-7-rings': 'QYh6mYIJG2Y', // 7 rings
      'ariana-grande-positions': 'tcYodQoapMg', // positions
      'ariana-grande-breathin': 'kN0iD0pI3o0', // breathin
      'ariana-grande-no-tears-left-to-cry': 'ffxKSjUwKdU', // no tears left to cry
      'ariana-grande-god-is-a-woman': 'kHLHSlExFis', // God is a woman
      'ariana-grande-side-to-side': 'SXiSVQZLje8', // Side To Side
      'ariana-grande-dangerous-woman': '9WbCfHutDSE', // Dangerous Woman
      'ariana-grande-problem': 'iS1g8G_njx8', // Problem
      'ariana-grande-break-free': 'L8eRzOYhLuw', // Break Free
      
      // Dua Lipa
      'dua-lipa-levitating': 'TUVcZfQe-Kw', // Levitating
      'dua-lipa-dont-start-now': 'oygrmJFKYZY', // Don't Start Now
      'dua-lipa-new-rules': 'k2qgadSvNyU', // New Rules
      'dua-lipa-physical': '9HDEHj2yzew', // Physical
      'dua-lipa-be-the-one': 'VRJmcxCrAOA', // Be The One
      'dua-lipa-idgaf': 'Mgfe5tIwOj0', // IDGAF
      'dua-lipa-cold-heart': 'qFfnlYbFEiE', // Cold Heart (avec Elton John)
      
      // Harry Styles
      'harry-styles-watermelon-sugar': 'E07s5ZYygMg', // Watermelon Sugar
      'harry-styles-golden': 'P3cffdsEXXw', // Golden
      'harry-styles-adore-you': 'RvYgAVEWyVM', // Adore You
      'harry-styles-as-it-was': 'H5v3kku4y6Q', // As It Was
      'harry-styles-sign-of-the-times': 'qN4ooNx77u0', // Sign of the Times
      'harry-styles-treat-people-with-kindness': '6-wKWXOLApA', // Treat People With Kindness
      'harry-styles-falling': 'BqAcVEAgf1E', // Falling
      'harry-styles-lights-up': 'PJWLhRhUcBc', // Lights Up
      
      // Olivia Rodrigo
      'olivia-rodrigo-drivers-license': 'ZmDBbnmKpqQ', // drivers license
      'olivia-rodrigo-good-4-u': 'gNi_6U5Pm_o', // good 4 u
      'olivia-rodrigo-deja-vu': 'BjDebmqFRuc', // deja vu
      'olivia-rodrigo-traitor': 'hhFOEUcgIHg', // traitor
      'olivia-rodrigo-vampire': 'RlPNh_PBZb4', // vampire
      'olivia-rodrigo-get-him-back': 'GiEyI2pVim8', // get him back!
      
      // Bad Bunny
      'bad-bunny-dakiti': 'f7F2yam_vks', // DAKITI
      'bad-bunny-yo-perreo-sola': 'GtSRKwDCaZM', // Yo Perreo Sola
      'bad-bunny-safaera': 'p7FeQdFTyoI', // SAFAERA
      'bad-bunny-la-cancion': 'J9UDfHrpOQo', // LA CANCIÓN
      'bad-bunny-vete': 'MZiCz32dqNc', // VETE
      'bad-bunny-si-veo-a-tu-mama': 'RG_ZKUAbPNw', // SI VEO A TU MAMÁ
      
      // Ed Sheeran
      'ed-sheeran-shape-of-you': 'JGwWNGJdvx8', // Shape of You
      'ed-sheeran-perfect': '2Vv-BfVoq4g', // Perfect
      'ed-sheeran-thinking-out-loud': 'lp-EO5I60KA', // Thinking Out Loud
      'ed-sheeran-photograph': 'nSDgHBxUbVQ', // Photograph
      'ed-sheeran-castle-on-the-hill': 'K0ibBPhiaG0', // Castle on the Hill
      'ed-sheeran-bad-habits': 'orJSJGHjBLI', // Bad Habits
      'ed-sheeran-shivers': 'Il0S8BoucSA', // Shivers
      
      // Adele
      'adele-hello': 'YQHsXMglC9A', // Hello
      'adele-someone-like-you': 'hLQl3WQQoQ0', // Someone Like You
      'adele-rolling-in-the-deep': 'rYEDA3JcQqw', // Rolling in the Deep
      'adele-set-fire-to-the-rain': 'FlsBObg-1BQ', // Set Fire to the Rain
      'adele-when-we-were-young': 'DDWKuo3gXMQ', // When We Were Young
      'adele-easy-on-me': 'X-yIEMduRXk', // Easy On Me
      'adele-oh-my-god': 'KbJNft-7D_M', // Oh My God
      
      // Bruno Mars
      'bruno-mars-uptown-funk': 'OPf0YbXqDm0', // Uptown Funk
      'bruno-mars-24k-magic': 'UqyT8IEBkvY', // 24K Magic
      'bruno-mars-thats-what-i-like': 'PMivT7MJ41M', // That's What I Like
      'bruno-mars-just-the-way-you-are': 'LjhCEhWiKXk', // Just The Way You Are
      'bruno-mars-grenade': 'SR6iYWJxHqs', // Grenade
      'bruno-mars-count-on-me': 'CwfoyVa980U', // Count On Me
      'bruno-mars-when-i-was-your-man': 'ekzHIouo8Q4', // When I Was Your Man
      'bruno-mars-locked-out-of-heaven': 'e-fA-gBCkj0', // Locked Out Of Heaven
      
      // Justin Bieber
      'justin-bieber-sorry': 'fRh_vgS2dFE', // Sorry
      'justin-bieber-love-yourself': 'oyEuk8j8imI', // Love Yourself
      'justin-bieber-what-do-you-mean': 'DK_0jXPuIr0', // What Do You Mean?
      'justin-bieber-baby': 'kffacxfA7G4', // Baby
      'justin-bieber-somebody-to-love': 'eP4eqhWc7sI', // Somebody to Love
      'justin-bieber-never-say-never': '_Z5-P9v3F8w', // Never Say Never
      'justin-bieber-boyfriend': '4GuqB1BQVr4', // Boyfriend
      'justin-bieber-as-long-as-you-love-me': '0zGcUoRlhmw', // As Long As You Love Me
      'justin-bieber-peaches': 'tQ0yjYUFKAE', // Peaches
      'justin-bieber-stay': '4-gJJkOO-_M', // Stay (avec The Kid LAROI)
      
      // Rihanna
      'rihanna-umbrella': 'CvBfHwUxHIk', // Umbrella
      'rihanna-diamonds': 'lWA2pjMjpBs', // Diamonds
      'rihanna-work': 'HL1UzIK-flA', // Work
      'rihanna-we-found-love': 'tg00YEETFzg', // We Found Love
      'rihanna-only-girl': 'pa14VNsdSYM', // Only Girl (In The World)
      'rihanna-whats-my-name': 'U0CGsw6h60k', // What's My Name?
      'rihanna-rude-boy': 'e82VE8UtW8A', // Rude Boy
      'rihanna-disturbia': 'E1mU6h4Xdxc', // Disturbia
      'rihanna-dont-stop-the-music': 'yd8jh9QYfEs', // Don't Stop the Music
      
      // Beyoncé
      'beyonce-crazy-in-love': 'ViwtNLUqkMY', // Crazy in Love
      'beyonce-single-ladies': '4m1EFMoRFvY', // Single Ladies
      'beyonce-halo': 'bnVUHWCynig', // Halo
      'beyonce-irreplaceable': '2EwViQxSJJQ', // Irreplaceable
      'beyonce-drunk-in-love': 'p1JPKLa-Ofc', // Drunk in Love
      'beyonce-formation': 'WDZJPJV__bQ', // Formation
      'beyonce-sorry': 'QxsmWxxouIM', // Sorry
      'beyonce-hold-up': 'PeonBmeFR8o', // Hold Up
      
      // Kanye West / Ye
      'kanye-west-stronger': 'PsO6ZnUZI0g', // Stronger
      'ye-stronger': 'PsO6ZnUZI0g', // Variante
      'kanye-west-gold-digger': 'gOsM-DYAEhY', // Gold Digger
      'kanye-west-heartless': 'Co0tTeuUVhU', // Heartless
      'kanye-west-power': 'L53gjP-TtGE', // POWER
      'kanye-west-runaway': 'C6CJQ_hnm24', // Runaway
      'kanye-west-all-of-the-lights': 'HAfFfqiYLp0', // All Of The Lights
      
      // Post Malone
      'post-malone-circles': 'wXhTHyIgQ_U', // Circles
      'post-malone-sunflower': '3OPZWHTndKc', // Sunflower
      'post-malone-rockstar': 'UceaB4D0jpo', // rockstar
      'post-malone-congratulations': 'SC4xMk98Pdc', // Congratulations
      'post-malone-psycho': 'au2n7VVGv_c', // Psycho
      'post-malone-better-now': 'UYwF-jdcVjY' // Better Now
    }
    
    // Rechercher la vidéo
    const videoId = trackVideos[fullKey]
    
    if (videoId) {
      console.log(`🎬 [V2] ✅ Vidéo trouvée: ${videoId}`)
      return videoId
    }
    
    // Essayer quelques variantes communes
    const variants = [
      fullKey.replace('the-', ''), // Enlever "the"
      fullKey.replace('-the-', '-'), // Enlever "the" au milieu
      fullKey.replace('-and-', '-'), // Remplacer "and" par rien
      fullKey.replace('-and-', '-n-'), // "and" -> "n"
    ]
    
    for (const variant of variants) {
      const variantVideo = trackVideos[variant]
      if (variantVideo) {
        console.log(`🎬 [V2] ✅ Vidéo trouvée via variante "${variant}": ${variantVideo}`)
        return variantVideo
      }
    }
    
    console.log(`🎬 [V2] ❌ Aucune vidéo trouvée pour: "${fullKey}"`)
    console.log(`🎬 [V2] 📸 Utilisation de la photo à la place`)
    return undefined // Pas de vidéo = utiliser la photo
  }
}

export const musicServiceV2 = new MusicServiceV2()
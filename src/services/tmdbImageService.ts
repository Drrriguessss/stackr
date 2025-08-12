class TMDbImageService {
  private readonly apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
  private readonly baseUrl = 'https://api.themoviedb.org/3'
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p'

  async getMovieImages(imdbId: string) {
    try {
      if (!this.apiKey) {
        console.warn('🎬 [TMDb] API key not configured')
        return { headerImage: null, galleryImages: [] }
      }

      console.log('🎬 [TMDb] Fetching HD images for IMDB ID:', imdbId)
      
      // 1. Convertir IMDB ID en TMDB ID (méthode optimisée)
      const findResponse = await fetch(
        `${this.baseUrl}/find/${imdbId}?api_key=${this.apiKey}&external_source=imdb_id`
      )
      
      if (!findResponse.ok) {
        console.error('🎬 [TMDb] Find API error:', findResponse.status)
        return { headerImage: null, galleryImages: [] }
      }
      
      const findData = await findResponse.json()
      
      if (!findData.movie_results || findData.movie_results.length === 0) {
        console.warn('🎬 [TMDb] No movie found for IMDB ID:', imdbId)
        return { headerImage: null, galleryImages: [] }
      }
      
      const tmdbId = findData.movie_results[0].id
      console.log('🎬 [TMDb] Found TMDB ID:', tmdbId)
      
      // 2. Récupérer les détails du film, images ET vidéos en parallèle
      const [movieDetails, imagesData, videosData] = await Promise.all([
        fetch(`${this.baseUrl}/movie/${tmdbId}?api_key=${this.apiKey}`).then(r => r.json()),
        fetch(`${this.baseUrl}/movie/${tmdbId}/images?api_key=${this.apiKey}`).then(r => r.json()),
        fetch(`${this.baseUrl}/movie/${tmdbId}/videos?api_key=${this.apiKey}`).then(r => r.json())
      ])
      
      console.log('🎬 [TMDb] Media found:', {
        backdrops: imagesData.backdrops?.length || 0,
        posters: imagesData.posters?.length || 0,
        videos: videosData.results?.length || 0
      })
      
      // 3. Priorité pour header : backdrop ULTRA HD > poster HD
      let headerImage = null
      
      // Essayer d'abord les backdrops (format banner 16:9, parfait pour header)
      if (imagesData.backdrops && imagesData.backdrops.length > 0) {
        console.log(`🎬 [TMDb] Processing ${imagesData.backdrops.length} backdrops for best quality`)
        
        // Filtrer et trier par qualité ULTRA HD : largeur > note > ratio 16:9 parfait
        const sortedBackdrops = imagesData.backdrops
          .filter((img: any) => {
            // Critères de qualité élevés
            const hasGoodWidth = img.width >= 1920  // Minimum Full HD
            const hasGoodRatio = img.aspect_ratio >= 1.5 && img.aspect_ratio <= 2.0  // Format header
            const hasDecentVote = (img.vote_average || 0) >= 5 || img.vote_count === 0  // Pas de votes très négatifs
            
            return hasGoodWidth && hasGoodRatio && hasDecentVote
          })
          .sort((a: any, b: any) => {
            // Priorité 1: Ultra haute résolution d'abord (4K > 2K > Full HD)
            if (b.width !== a.width) return b.width - a.width
            
            // Priorité 2: Score de qualité combiné (note × votes)
            const scoreA = (a.vote_average || 5) * Math.log10((a.vote_count || 1) + 1)
            const scoreB = (b.vote_average || 5) * Math.log10((b.vote_count || 1) + 1)
            if (Math.abs(scoreB - scoreA) > 0.1) return scoreB - scoreA
            
            // Priorité 3: Ratio parfait 16:9 (1.778)
            const idealRatio = 1.778
            const ratioA = Math.abs(a.aspect_ratio - idealRatio)
            const ratioB = Math.abs(b.aspect_ratio - idealRatio)
            return ratioA - ratioB
          })
        
        if (sortedBackdrops.length > 0) {
          const bestBackdrop = sortedBackdrops[0]
          
          // Sélection intelligente de la résolution
          let resolution = 'original'
          if (bestBackdrop.width >= 3840) {
            resolution = 'original'  // 4K et plus : garder l'original
          } else if (bestBackdrop.width >= 1920) {
            resolution = 'w1280'     // Full HD : optimiser à 1280
          } else {
            resolution = 'w1280'     // Autres : standardiser à 1280
          }
          
          headerImage = `${this.imageBaseUrl}/${resolution}${bestBackdrop.file_path}`
          
          console.log(`🎬 [TMDb] ✨ ULTRA HD backdrop selected:`)
          console.log(`  📐 Resolution: ${bestBackdrop.width}x${bestBackdrop.height} (${resolution})`)
          console.log(`  📊 Quality: ${bestBackdrop.vote_average?.toFixed(1) || 'N/A'}/10 (${bestBackdrop.vote_count || 0} votes)`)
          console.log(`  🖼️ Ratio: ${bestBackdrop.aspect_ratio?.toFixed(3) || 'N/A'} (ideal: 1.778)`)
          console.log(`  🔗 URL: ${headerImage}`)
        } else {
          console.log('🎬 [TMDb] ⚠️  No Ultra HD backdrops found, trying standard quality...')
          
          // Fallback : critères moins stricts
          const fallbackBackdrops = imagesData.backdrops
            .filter((img: any) => img.width >= 1280)  // Minimum HD
            .sort((a: any, b: any) => b.width - a.width)
          
          if (fallbackBackdrops.length > 0) {
            const fallbackBackdrop = fallbackBackdrops[0]
            headerImage = `${this.imageBaseUrl}/w1280${fallbackBackdrop.file_path}`
            console.log(`🎬 [TMDb] 📺 Standard HD backdrop: ${fallbackBackdrop.width}x${fallbackBackdrop.height}`)
          }
        }
      }
      // Fallback sur backdrop de base du film si pas d'images custom
      else if (movieDetails.backdrop_path) {
        headerImage = `${this.imageBaseUrl}/w1280${movieDetails.backdrop_path}`
      }
      // Dernier fallback sur poster HD si vraiment pas de backdrop
      else if (movieDetails.poster_path) {
        headerImage = `${this.imageBaseUrl}/w780${movieDetails.poster_path}`
      }
      
      // 4. Images pour galerie (mix backdrops + posters de qualité)
      const galleryImages: string[] = []
      
      // Ajouter backdrops HD (format paysage, parfait pour galerie)
      if (imagesData.backdrops) {
        const qualityBackdrops = imagesData.backdrops
          .filter((img: any) => img.width >= 1280 && img.vote_average >= 0) // Filtrer les images de qualité
          .sort((a: any, b: any) => {
            // Trier par largeur puis popularité
            if (b.width !== a.width) return b.width - a.width
            return (b.vote_average * b.vote_count) - (a.vote_average * a.vote_count)
          })
          .slice(0, 6) // Moins d'images mais de meilleure qualité
          .map((img: any) => `${this.imageBaseUrl}/w1280${img.file_path}`)
        galleryImages.push(...qualityBackdrops)
      }
      
      // Ajouter quelques posters HD de qualité (seulement les meilleurs)
      if (imagesData.posters) {
        const qualityPosters = imagesData.posters
          .filter((img: any) => img.width >= 780 && img.vote_average >= 5) // Standards plus élevés
          .sort((a: any, b: any) => {
            if (b.width !== a.width) return b.width - a.width
            return (b.vote_average * b.vote_count) - (a.vote_average * a.vote_count)
          })
          .slice(0, 3) // Encore moins de posters
          .map((img: any) => `${this.imageBaseUrl}/w780${img.file_path}`)
        galleryImages.push(...qualityPosters)
      }
      
      // 5. Extraire trailer officiel YouTube
      let trailer = null
      if (videosData.results && videosData.results.length > 0) {
        // Priorité aux trailers officiels YouTube
        const officialTrailer = videosData.results.find((video: any) => 
          video.type === 'Trailer' && 
          video.site === 'YouTube' &&
          video.official === true
        )
        
        // Fallback sur n'importe quel trailer YouTube
        const anyTrailer = videosData.results.find((video: any) => 
          video.type === 'Trailer' && 
          video.site === 'YouTube'
        )
        
        const selectedTrailer = officialTrailer || anyTrailer
        
        if (selectedTrailer) {
          trailer = {
            url: `https://www.youtube.com/embed/${selectedTrailer.key}`,
            provider: 'youtube',
            title: selectedTrailer.name,
            official: selectedTrailer.official || false
          }
          console.log(`🎬 [TMDb] Found ${trailer.official ? 'official' : 'unofficial'} trailer: ${trailer.title}`)
        }
      }
      
      console.log(`🎬 [TMDb] Final result: headerImage=${headerImage ? 'YES' : 'NO'}, galleryImages=${galleryImages.length}, trailer=${trailer ? 'YES' : 'NO'}`)
      
      return { 
        headerImage, 
        galleryImages,
        trailer,
        // Maintenir compatibilité avec l'ancien format
        posterHD: imagesData.posters?.[0] 
          ? `${this.imageBaseUrl}/w780${imagesData.posters[0].file_path}`
          : null,
        backdropHD: headerImage,
        backdrops: galleryImages
      }
    } catch (error) {
      console.error('🎬 [TMDb] Error fetching images:', error)
      return { headerImage: null, galleryImages: [] }
    }
  }

  // Méthode pour obtenir différentes tailles d'image
  getImageUrl(imagePath: string, size: 'w300' | 'w500' | 'w780' | 'w1280' | 'original' = 'w1280') {
    return `${this.imageBaseUrl}/${size}${imagePath}`
  }

  /**
   * Base d'images manuelles Ultra HD pour les films populaires
   * URLs d'images de très haute qualité pour les films qui posent problème
   */
  private getKnownHighQualityImage(imdbId: string): string | null {
    const knownImages: { [key: string]: string } = {
      // Films mentionnés comme problématiques
      'tt7286456': 'https://image.tmdb.org/t/p/original/uozb2VeD87YmhoUP1RrGWfzuCrr.jpg', // The Hustle (2019)
      'tt0773262': 'https://image.tmdb.org/t/p/original/xSBJrXKbVOaRpKKS0bLT5PgvC8I.jpg', // Dexter (2006-2013)
      'tt13443470': 'https://image.tmdb.org/t/p/original/9PFonBhy4cQy7Jz20NpMygczOkv.jpg', // Wednesday (2022)
      
      // Films récents populaires souvent problématiques
      'tt15677150': 'https://image.tmdb.org/t/p/original/hhvbKxZJOcOzgJsZ8ibeUfzfVze.jpg', // Jurassic World Rebirth (2025)
      'tt10954984': 'https://image.tmdb.org/t/p/original/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Ant-Man 3 (2023)
      'tt9114286': 'https://image.tmdb.org/t/p/original/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', // Black Panther 2 (2022)
      'tt11138512': 'https://image.tmdb.org/t/p/original/5YZbUmjbMa3ClvSW1Wj2JYp7WUf.jpg', // The Nun 2 (2023)
      
      // Classiques avec des images de mauvaise qualité sur certains services
      'tt0103064': 'https://image.tmdb.org/t/p/original/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg', // Terminator 2 (1991)
      'tt0133093': 'https://image.tmdb.org/t/p/original/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', // The Matrix (1999)
      'tt0111161': 'https://image.tmdb.org/t/p/original/9cqNxx0GxF0bflyCy3FpPiy3BXd.jpg', // The Shawshank Redemption (1994)
      'tt0068646': 'https://image.tmdb.org/t/p/original/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', // The Godfather (1972)
      'tt0109830': 'https://image.tmdb.org/t/p/original/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', // Forrest Gump (1994)
      
      // Films Marvel récents
      'tt10872600': 'https://image.tmdb.org/t/p/original/1E5baAaEse26fej7uHcjOgEE2t2.jpg', // Spider-Man: No Way Home (2021)
      'tt9376612': 'https://image.tmdb.org/t/p/original/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg', // Shang-Chi (2021)
      'tt9032400': 'https://image.tmdb.org/t/p/original/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', // Eternals (2021)
      
      // Films d'horreur populaires
      'tt8332922': 'https://image.tmdb.org/t/p/original/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg', // A Quiet Place 2 (2020)
      'tt7349950': 'https://image.tmdb.org/t/p/original/4xNe8S5jdPOcM1oF6TKVvpjwMJ3.jpg', // IT Chapter Two (2019)
      'tt6966692': 'https://image.tmdb.org/t/p/original/aQvJ5WPzZgYVDrxLX4R6cLJCEaQ.jpg', // Green Book (2018)
    }

    const normalizedId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`
    const imageUrl = knownImages[normalizedId]
    
    if (imageUrl) {
      console.log(`🎬 [TMDb] ✨ Using curated Ultra HD image for ${imdbId}:`, imageUrl)
      return imageUrl
    }
    
    return null
  }

  /**
   * Vérifie d'abord la base d'images manuelles avant les APIs
   */
  async getOptimizedMovieImages(imdbId: string) {
    // 1. D'abord essayer les images manuelles curées
    const curatedImage = this.getKnownHighQualityImage(imdbId)
    if (curatedImage) {
      return {
        headerImage: curatedImage,
        galleryImages: [curatedImage], // Pour l'instant, une seule image mais de très haute qualité
        trailer: null,
        posterHD: curatedImage,
        backdropHD: curatedImage,
        backdrops: [curatedImage]
      }
    }

    // 2. Sinon utiliser la méthode normale
    return this.getMovieImages(imdbId)
  }
}

export const tmdbImageService = new TMDbImageService()
'use client'
import { useState, useEffect, useCallback } from 'react'
import { omdbService } from '@/services/omdbService'
import { optimalMovieAPI } from '@/services/optimalMovieAPI'
import { movieCache } from '@/services/movieCache'
import { tmdbImageService } from '@/services/tmdbImageService'
import { fanartService } from '@/services/fanartService'
import { imageService } from '@/services/imageService'
import { trailerService } from '@/services/trailerService'
import { tmdbReviewsService, type ProcessedReview } from '@/services/tmdbReviewsService'

interface MovieDetail {
  imdbID: string
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Actors: string
  Plot: string
  Poster: string
  imdbRating: string
  Metascore: string
  Type: string
  Ratings?: Array<{
    Source: string
    Value: string
  }>
}

interface MediaData {
  images: string[]
  trailer: { url: string; provider: string } | null
  headerImage: string | null
}

export function useMovieDetail(movieId: string, mediaType: 'movie' | 'tv' = 'movie') {
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaData, setMediaData] = useState<MediaData>({
    images: [],
    trailer: null,
    headerImage: null
  })
  const [directorMovies, setDirectorMovies] = useState<any[]>([])
  const [movieReviews, setMovieReviews] = useState<ProcessedReview[]>([])

  const resolveImdbId = useCallback(async (id: string): Promise<string> => {
    let imdbId = id
    
    if (!id.startsWith('tt') && !id.startsWith('movie-')) {
      console.log('🔄 Converting TMDB ID to IMDB ID:', id)
      
      let convertedId = await optimalMovieAPI.getIMDbId(id, mediaType)
      if (!convertedId && mediaType === 'movie') {
        convertedId = await optimalMovieAPI.getIMDbId(id, 'tv')
      }
      
      if (convertedId) {
        imdbId = convertedId
        console.log('✅ Converted to IMDB ID:', imdbId)
      } else {
        throw new Error('Could not find IMDB ID for this movie/TV show')
      }
    }
    
    if (id.startsWith('movie-')) {
      imdbId = id.replace('movie-', '')
    }
    
    return imdbId
  }, [mediaType])

  const loadMediaData = useCallback(async (movieId: string, movieTitle: string, movieYear?: string, moviePoster?: string) => {
    try {
      console.log('🎨 Loading media for:', movieTitle)
      
      const [trailerResult, tmdbResult, fanartResult, galleryResult] = await Promise.allSettled([
        trailerService.getMovieTrailer(movieId, movieTitle, movieYear),
        tmdbImageService.getOptimizedMovieImages(movieId),
        fanartService.getMovieImages(movieId),
        imageService.getMovieGallery(movieTitle, 10)
      ])
      
      const trailerData = trailerResult.status === 'fulfilled' ? trailerResult.value : null
      const tmdbImages = tmdbResult.status === 'fulfilled' ? tmdbResult.value : null
      const fanartImages = fanartResult.status === 'fulfilled' ? fanartResult.value : null
      const gallery = galleryResult.status === 'fulfilled' ? galleryResult.value : []
      
      let headerImage = null
      
      if (fanartImages?.backgrounds?.[0]) {
        headerImage = fanartImages.backgrounds[0]
      } else if (tmdbImages?.headerImage) {
        headerImage = tmdbImages.headerImage
      } else if (moviePoster && moviePoster !== 'N/A') {
        headerImage = moviePoster
      } else if (Array.isArray(gallery) && gallery.length > 0 && gallery[0]) {
        headerImage = gallery[0]
      } else {
        headerImage = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80'
      }
      
      const galleryImages = []
      
      if (fanartImages?.backgrounds) {
        galleryImages.push(...fanartImages.backgrounds.slice(0, 6))
      }
      if (tmdbImages?.galleryImages) {
        galleryImages.push(...tmdbImages.galleryImages.slice(0, 8))
      }
      if (Array.isArray(gallery)) {
        galleryImages.push(...gallery.filter(img => img && !img.includes('N/A')).slice(0, 5))
      }
      
      const finalImages = [...new Set(galleryImages)].slice(0, 15)
      
      let finalTrailer = trailerData
      if (finalTrailer?.provider === 'none' || finalTrailer?.videoId === 'none') {
        finalTrailer = null
      }
      
      setMediaData({
        images: finalImages,
        trailer: finalTrailer,
        headerImage: headerImage
      })
      
      movieCache.set(movieId, { 
        media: { 
          images: finalImages, 
          trailer: finalTrailer, 
          headerImage: headerImage 
        } 
      }, 'MEDIA')
      
    } catch (error) {
      console.error('🎨 Error loading media:', error)
      const emergencyImage = 'https://images.unsplash.com/photo-1489599328877-4e9ad908160a?w=1280&h=720&fit=crop&q=80'
      setMediaData({
        headerImage: emergencyImage,
        images: [emergencyImage],
        trailer: null
      })
    }
  }, [])

  const loadDirectorMovies = useCallback(async (director: string, currentMovieId: string) => {
    try {
      console.log('🎬 Loading movies by director:', director)
      
      const searchResults = await omdbService.searchMovies(director)
      const relevantResults = searchResults
        .filter(movie => 
          movie.imdbID !== currentMovieId && 
          movie.Director && 
          movie.Director.toLowerCase().includes(director.toLowerCase())
        )
        .slice(0, 6)
      
      const movies = relevantResults.map(movie => omdbService.convertToAppFormat(movie))
      setDirectorMovies(movies)
      movieCache.set(movieId, { directorMovies: movies }, 'DIRECTOR_MOVIES')
      
    } catch (error) {
      console.error('Error loading director movies:', error)
      setDirectorMovies([])
    }
  }, [movieId])

  const loadMovieReviews = useCallback(async (movieTitle: string, year?: string) => {
    try {
      const reviews = await tmdbReviewsService.getMovieReviews(movieTitle, year)
      setMovieReviews(reviews)
      movieCache.set(movieId, { reviews }, 'REVIEWS')
    } catch (error) {
      console.error('Error loading movie reviews:', error)
      setMovieReviews([])
    }
  }, [movieId])

  const fetchMovieDetail = useCallback(async () => {
    if (!movieId) return
    
    console.log('🚀 Starting loading for:', movieId)
    setLoading(true)
    setError(null)
    
    try {
      const cachedData = movieCache.get(movieId)
      if (cachedData?.movieDetail) {
        console.log('⚡ Using cached movie data')
        setMovieDetail(cachedData.movieDetail)
        
        if (cachedData.media) {
          setMediaData({
            images: cachedData.media.images || [],
            trailer: cachedData.media.trailer || null,
            headerImage: cachedData.media.headerImage || null
          })
        }
        if (cachedData.directorMovies) setDirectorMovies(cachedData.directorMovies)
        if (cachedData.reviews) setMovieReviews(cachedData.reviews)
        
        setLoading(false)
        return
      }

      const imdbId = await resolveImdbId(movieId)
      const movieData = await omdbService.getMovieDetails(imdbId)
      
      if (movieData) {
        setMovieDetail(movieData)
        movieCache.set(movieId, { movieDetail: movieData }, 'MOVIE_DETAIL')
        
        await Promise.all([
          loadMediaData(movieId, movieData.Title, movieData.Year, movieData.Poster),
          movieData.Director && movieData.Director !== 'N/A' 
            ? loadDirectorMovies(movieData.Director, imdbId)
            : Promise.resolve(),
          loadMovieReviews(movieData.Title, movieData.Year)
        ])
      }
    } catch (err) {
      console.error('❌ Error loading movie:', err)
      setError(err instanceof Error ? err.message : 'Failed to load movie details')
    } finally {
      setLoading(false)
    }
  }, [movieId, resolveImdbId, loadMediaData, loadDirectorMovies, loadMovieReviews])

  useEffect(() => {
    if (movieId) {
      fetchMovieDetail()
    }
  }, [movieId, fetchMovieDetail])

  return {
    movieDetail,
    loading,
    error,
    mediaData,
    directorMovies,
    movieReviews,
    refetch: fetchMovieDetail
  }
}
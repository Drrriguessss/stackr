'use client'
import { useState, useEffect, useCallback } from 'react'
import { googleBooksService } from '@/services/googleBooksService'

export interface BookDetail {
  id: string
  title: string
  authors: string[]
  description: string
  publishedDate: string
  pageCount: number
  categories: string[]
  averageRating: number
  ratingsCount: number
  language: string
  publisher: string
  isbn10: string
  isbn13: string
  imageLinks: {
    thumbnail: string
    small: string
    medium: string
    large: string
    extraLarge?: string
  }
  previewLink: string
  infoLink: string
  buyLink: string
  subtitle?: string
  // Digital availability info
  isEbook?: boolean
  epubAvailable?: boolean
  pdfAvailable?: boolean
  webReaderLink?: string
  price?: string
}

interface UseBookDetailReturn {
  bookDetail: BookDetail | null
  loading: boolean
  error: string | null
  images: string[]
  authorBooks: any[]
  otherEditions: any[]
  refetch: () => Promise<void>
}

// Cache simple pour éviter les requêtes répétées
const bookCache = new Map<string, { data: BookDetail; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useBookDetail(bookId: string): UseBookDetailReturn {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [authorBooks, setAuthorBooks] = useState<any[]>([])
  const [otherEditions, setOtherEditions] = useState<any[]>([])

  const loadBookDetail = useCallback(async () => {
    if (!bookId) return
    
    console.log('🔄 Loading book detail for ID:', bookId)

    try {
      setLoading(true)
      setError(null)

      // Vérifier le cache
      const cachedBook = bookCache.get(bookId)
      const now = Date.now()
      
      if (cachedBook && (now - cachedBook.timestamp) < CACHE_TTL) {
        setBookDetail(cachedBook.data)
        setLoading(false)
        return
      }

      // Charger les détails du livre
      console.log('📖 Calling googleBooksService.getBookDetails for:', bookId)
      const detail = await googleBooksService.getBookDetails(bookId)
      console.log('📖 Book detail response:', detail)
      
      if (!detail) {
        console.log('❌ Book not found for ID:', bookId)
        setError('Book not found')
        return
      }

      // Transformer les données pour correspondre à l'interface BookDetail
      const volumeInfo = detail.volumeInfo
      const saleInfo = detail.saleInfo
      const accessInfo = detail.accessInfo

      // Extraire les ISBN
      const isbn10 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || ''
      const isbn13 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || ''

      const bookDetailData: BookDetail = {
        id: detail.id,
        title: volumeInfo.title || '',
        authors: volumeInfo.authors || [],
        description: volumeInfo.description || '',
        publishedDate: volumeInfo.publishedDate || '',
        pageCount: volumeInfo.pageCount || 0,
        categories: volumeInfo.categories || [],
        averageRating: volumeInfo.averageRating || 0,
        ratingsCount: volumeInfo.ratingsCount || 0,
        language: volumeInfo.language || '',
        publisher: volumeInfo.publisher || '',
        isbn10,
        isbn13,
        imageLinks: {
          thumbnail: volumeInfo.imageLinks?.thumbnail || '',
          small: volumeInfo.imageLinks?.small || volumeInfo.imageLinks?.thumbnail || '',
          medium: volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.small || volumeInfo.imageLinks?.thumbnail || '',
          large: volumeInfo.imageLinks?.large || volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.small || volumeInfo.imageLinks?.thumbnail || '',
          extraLarge: volumeInfo.imageLinks?.extraLarge
        },
        previewLink: volumeInfo.previewLink || '',
        infoLink: volumeInfo.infoLink || '',
        buyLink: saleInfo?.buyLink || '',
        subtitle: volumeInfo.subtitle,
        // Digital availability info
        isEbook: saleInfo?.isEbook || false,
        epubAvailable: accessInfo?.epub?.isAvailable || false,
        pdfAvailable: accessInfo?.pdf?.isAvailable || false,
        webReaderLink: accessInfo?.webReaderLink || '',
        price: saleInfo?.listPrice ? `${saleInfo.listPrice.amount} ${saleInfo.listPrice.currencyCode}` : undefined
      }

      setBookDetail(bookDetailData)
      
      // Mettre en cache
      bookCache.set(bookId, { data: bookDetailData, timestamp: now })

      // Collecter toutes les images disponibles
      const availableImages: string[] = []
      if (bookDetailData.imageLinks.large) availableImages.push(bookDetailData.imageLinks.large)
      if (bookDetailData.imageLinks.medium) availableImages.push(bookDetailData.imageLinks.medium)
      if (bookDetailData.imageLinks.small) availableImages.push(bookDetailData.imageLinks.small)
      if (bookDetailData.imageLinks.thumbnail) availableImages.push(bookDetailData.imageLinks.thumbnail)
      setImages([...new Set(availableImages)]) // Supprimer les doublons

      // Charger en parallèle les livres de l'auteur et autres éditions
      if (bookDetailData.authors && bookDetailData.authors.length > 0) {
        Promise.all([
          loadAuthorBooks(bookDetailData.authors[0], bookDetailData.id),
          loadOtherEditions(bookDetailData.title, bookDetailData.id)
        ]).catch(error => {
          console.error('Error loading additional data:', error)
        })
      }

    } catch (err) {
      console.error('Error loading book details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load book details')
    } finally {
      setLoading(false)
    }
  }, [bookId])

  const loadAuthorBooks = async (author: string, currentBookId: string) => {
    try {
      const books = await googleBooksService.searchBooks(`inauthor:"${author}"`, 12)
      // Filtrer le livre actuel et limiter à 8 livres
      const filteredBooks = books
        .filter(book => book.id !== currentBookId)
        .slice(0, 8)
        .map(book => ({
          id: book.id,
          title: book.volumeInfo.title,
          image: book.volumeInfo.imageLinks?.thumbnail || book.volumeInfo.imageLinks?.smallThumbnail,
          year: book.volumeInfo.publishedDate ? new Date(book.volumeInfo.publishedDate).getFullYear() : null,
          rating: book.volumeInfo.averageRating || 0
        }))
      
      setAuthorBooks(filteredBooks)
    } catch (error) {
      console.error('Error loading author books:', error)
      setAuthorBooks([])
    }
  }

  const loadOtherEditions = async (title: string, currentBookId: string) => {
    try {
      // Rechercher d'autres éditions en utilisant le titre exact
      const cleanTitle = title.replace(/[^\w\s]/gi, '') // Nettoyer les caractères spéciaux
      const books = await googleBooksService.searchBooks(`intitle:"${cleanTitle}"`, 8)
      
      // Filtrer le livre actuel et les doublons
      const filteredBooks = books
        .filter(book => book.id !== currentBookId)
        .slice(0, 6)
        .map(book => ({
          id: book.id,
          title: book.volumeInfo.title,
          image: book.volumeInfo.imageLinks?.thumbnail || book.volumeInfo.imageLinks?.smallThumbnail,
          year: book.volumeInfo.publishedDate ? new Date(book.volumeInfo.publishedDate).getFullYear() : null,
          publisher: book.volumeInfo.publisher || 'Unknown',
          language: book.volumeInfo.language || 'Unknown'
        }))
      
      setOtherEditions(filteredBooks)
    } catch (error) {
      console.error('Error loading other editions:', error)
      setOtherEditions([])
    }
  }

  const refetch = useCallback(async () => {
    // Supprimer du cache et recharger
    bookCache.delete(bookId)
    await loadBookDetail()
  }, [bookId, loadBookDetail])

  useEffect(() => {
    if (bookId) {
      loadBookDetail()
    } else {
      setBookDetail(null)
      setImages([])
      setAuthorBooks([])
      setOtherEditions([])
    }
  }, [bookId, loadBookDetail])

  return {
    bookDetail,
    loading,
    error,
    images,
    authorBooks,
    otherEditions,
    refetch
  }
}
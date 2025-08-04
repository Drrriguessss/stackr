// BookCoverManager - Système de fallback intelligent pour les couvertures de livres

interface ImageAPI {
  name: string
  getUrl: (isbn: string, title?: string, author?: string) => string
  extractImage: (data: any, isbn?: string, title?: string, author?: string) => string | null
  priority: number
}

export class BookCoverManager {
  private apis: ImageAPI[]
  private cache: Map<string, string>
  private failedUrls: Set<string>

  constructor() {
    this.cache = new Map()
    this.failedUrls = new Set()
    
    this.apis = [
      {
        name: 'google_enhanced',
        priority: 1,
        getUrl: (isbn, title, author) => '',
        extractImage: (data, isbn, title, author) => {
          // Utiliser l'image Google Books existante mais l'optimiser
          if (data && typeof data === 'string' && data.includes('books.google.com')) {
            return this.enhanceGoogleBooksImage(data)
          }
          return null
        }
      },
      {
        name: 'openlibrary_direct',
        priority: 2,
        getUrl: (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
        extractImage: (data, isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
      },
      {
        name: 'openlibrary_api',
        priority: 3,
        getUrl: (isbn) => `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
        extractImage: (data, isbn) => {
          if (data && typeof data === 'object') {
            return data[`ISBN:${isbn}`]?.cover?.large || null
          }
          return null
        }
      }
    ]
  }

  // Fonction principale pour obtenir une couverture
  async getBookCover(bookData: any): Promise<string> {
    const { id, image, isbn, title, authors } = bookData
    const author = authors?.[0] || ''
    
    // Clé de cache unique avec ID du livre pour éviter les collisions
    const cacheKey = `${id || 'no-id'}-${isbn || 'no-isbn'}-${title || 'no-title'}-${author || 'no-author'}`

    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      console.log(`📚 Cache HIT for: ${title} (${cacheKey})`)
      return this.cache.get(cacheKey)!
    }
    
    console.log(`📚 Cache MISS for: ${title} (${cacheKey})`)

    // Si on a déjà une image Google Books, l'optimiser d'abord
    if (image && image.includes('books.google.com')) {
      const enhanced = this.enhanceGoogleBooksImage(image)
      if (await this.validateImage(enhanced)) {
        this.cache.set(cacheKey, enhanced)
        return enhanced
      }
    }

    // Essayer les APIs de fallback dans l'ordre de priorité
    for (const api of this.apis) {
      try {
        if (api.name === 'google_enhanced') continue // Déjà testé

        const imageUrl = await this.tryAPI(api, isbn, title, author)
        if (imageUrl && await this.validateImage(imageUrl)) {
          this.cache.set(cacheKey, imageUrl)
          return imageUrl
        }
      } catch (error) {
        console.warn(`📚 API ${api.name} failed:`, error)
        continue
      }
    }

    // Fallback final : placeholder généré
    const placeholder = this.generatePlaceholder(title, author)
    this.cache.set(cacheKey, placeholder)
    return placeholder
  }

  // Optimiser les URLs Google Books
  private enhanceGoogleBooksImage(thumbnailUrl: string): string {
    if (!thumbnailUrl || !thumbnailUrl.includes('books.google.com')) {
      return thumbnailUrl
    }

    let enhancedUrl = thumbnailUrl
      .replace('zoom=1', 'zoom=0')     // Plus grande taille
      .replace('zoom=5', 'zoom=0')     // Alternative
      .replace('&edge=curl', '')       // Enlever l'effet de page
      .replace('img=1', 'img=1')       // Garder le format image
      .replace('-S.jpg', '-L.jpg')     // Taille large
      .replace('w=128', 'w=400')       // Largeur plus grande
      .replace('h=192', 'h=600')       // Hauteur plus grande

    // Alternative: utiliser l'API de couverture directe si possible
    const bookId = this.extractBookId(thumbnailUrl)
    if (bookId) {
      enhancedUrl = `https://books.google.com/books/publisher/content/images/frontcover/${bookId}?fife=w400-h600&source=gbs_api`
    }

    return enhancedUrl
  }

  private extractBookId(url: string): string | null {
    const match = url.match(/id=([^&]+)/)
    return match ? match[1] : null
  }

  // Essayer une API spécifique
  private async tryAPI(api: ImageAPI, isbn?: string, title?: string, author?: string): Promise<string | null> {
    if (!isbn && api.name.includes('isbn')) return null

    if (api.name === 'openlibrary_direct') {
      // Test direct sans appel API
      return api.extractImage(null, isbn)
    }

    const url = api.getUrl(isbn || '', title, author)
    if (!url) return null

    try {
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (!response.ok) return null

      if (api.name === 'openlibrary_api') {
        const data = await response.json()
        return api.extractImage(data, isbn, title, author)
      }

      return api.extractImage(response.url, isbn, title, author)
    } catch (error) {
      return null
    }
  }

  // Valider qu'une image existe et est valide
  private async validateImage(url: string): Promise<boolean> {
    if (this.failedUrls.has(url)) return false

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // Éviter les images trop petites (probablement des placeholders d'erreur)
        const isValid = img.width > 50 && img.height > 50
        if (!isValid) {
          this.failedUrls.add(url)
        }
        resolve(isValid)
      }
      img.onerror = () => {
        this.failedUrls.add(url)
        resolve(false)
      }
      
      // Timeout de 3 secondes
      setTimeout(() => {
        this.failedUrls.add(url)
        resolve(false)
      }, 3000)
      
      img.src = url
    })
  }

  // Générer un placeholder personnalisé avec titre/auteur
  private generatePlaceholder(title?: string, author?: string): string {
    // Créer un SVG placeholder plutôt qu'un canvas pour de meilleures performances
    const svg = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="600" fill="url(#grad1)" />
        <text x="200" y="250" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
              fill="white" text-anchor="middle" style="word-wrap: break-word;">
          ${(title || 'Titre non disponible').substring(0, 50)}
        </text>
        <text x="200" y="350" font-family="Arial, sans-serif" font-size="18" 
              fill="rgba(255,255,255,0.8)" text-anchor="middle">
          ${(author || 'Auteur inconnu').substring(0, 30)}
        </text>
      </svg>
    `
    
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  // Nettoyer le cache (à appeler périodiquement)
  public clearCache(): void {
    this.cache.clear()
    this.failedUrls.clear()
  }
}

// Instance singleton
export const bookCoverManager = new BookCoverManager()
/**
 * Utilitaire pour normaliser les IDs et éviter la duplication de code
 */

export const normalizeId = (id: string): string => {
  if (!id) return ''
  return id.toString().replace(/^(game-|movie-|music-|book-)/, '')
}

export const addCategoryPrefix = (id: string, category: string): string => {
  const normalizedId = normalizeId(id)
  const prefixes = {
    games: 'game-',
    movies: 'movie-',
    music: 'music-',
    books: 'book-'
  }
  
  const prefix = prefixes[category as keyof typeof prefixes] || ''
  return `${prefix}${normalizedId}`
}

export const idsMatch = (id1: string, id2: string): boolean => {
  return normalizeId(id1) === normalizeId(id2)
}
// src/data/similarGamesMapping.ts - Manual mapping for similar games

/**
 * Manual mapping of similar games when RAWG API doesn't provide accurate results
 * Key: Steam App ID or RAWG Game ID
 * Value: Array of Steam App IDs for similar games
 */
export const similarGamesMapping: Record<string, string[]> = {
  // Minami Lane (Steam App ID: 977750, RAWG ID: 871520)
  '977750': [
    '597169', // Shop Tycoon: Prepare Your Wallet
    '25212',  // Hot Spring Story 2
    '816441', // Urbek City Builder Prologue
    '1057090', // Hidden Through Time 2: Myths and Magic
    '1234567', // Urbo: Dream One (placeholder)
    '1345678', // Can't Live Without Electricity (placeholder)
    '1456789', // Thriving City: Song (placeholder)
    '1567890'  // Let's School (placeholder)
  ],
  '871520': [ // RAWG ID for Minami Lane
    '597169', // Shop Tycoon: Prepare Your Wallet
    '25212',  // Hot Spring Story 2
    '816441', // Urbek City Builder Prologue
    '1057090', // Hidden Through Time 2: Myths and Magic
    '1234567', // Urbo: Dream One (placeholder)
    '1345678', // Can't Live Without Electricity (placeholder)
    '1456789', // Thriving City: Song (placeholder)
    '1567890'  // Let's School (placeholder)
  ],
  
  // Add more mappings as needed
  // Example for other popular games:
  '1086940': [ // Baldur's Gate 3
    '394310',  // Divinity: Original Sin 2
    '435150',  // Divinity: Original Sin Enhanced Edition
    '1145350', // Hades
    '230230'   // War for the Overworld
  ],
  
  '1245620': [ // Elden Ring
    '374320',  // Dark Souls III
    '570940',  // Dark Souls: Remastered
    '814380',  // Sekiro: Shadows Die Twice
    '367500'   // Hollow Knight
  ]
}

/**
 * Get similar game IDs for a given game ID
 */
export function getSimilarGameIds(gameId: string): string[] {
  const cleanId = gameId.toString()
  return similarGamesMapping[cleanId] || []
}

/**
 * Check if a game has manual similar games mapping
 */
export function hasSimilarGamesMapping(gameId: string): boolean {
  const cleanId = gameId.toString()
  return cleanId in similarGamesMapping
}

/**
 * Add a new similar games mapping
 */
export function addSimilarGamesMapping(gameId: string, similarIds: string[]): void {
  similarGamesMapping[gameId] = similarIds
}

export default similarGamesMapping
// Configuration des sections de découverte
export interface DiscoverSection {
  id: string
  title: string
  type: 'manual' | 'api' | 'algorithm'
  endpoint?: string
}

export const discoverSections = {
  games: [
    {
      id: 'popular',
      title: 'Popular this week',
      type: 'manual' as const,
    },
    {
      id: 'top-rated',
      title: 'Top rated of all time',
      type: 'manual' as const,
    },
    {
      id: 'editor-picks',
      title: "Editor's Choice",
      type: 'manual' as const,
    }
  ],
  movies: [
    {
      id: 'popular',
      title: 'Popular this week',
      type: 'manual' as const,
    },
    {
      id: 'top-rated',
      title: 'Highly rated',
      type: 'manual' as const,
    },
    {
      id: 'editor-picks',
      title: 'Staff picks',
      type: 'manual' as const,
    }
  ],
  music: [
    {
      id: 'popular',
      title: 'Popular this week',
      type: 'manual' as const,
    },
    {
      id: 'top-albums',
      title: 'Top albums',
      type: 'manual' as const,
    },
    {
      id: 'editor-picks',
      title: 'Hidden gems',
      type: 'manual' as const,
    }
  ],
  books: [
    {
      id: 'popular',
      title: 'Popular this week',
      type: 'manual' as const,
    },
    {
      id: 'bestsellers',
      title: 'Bestsellers',
      type: 'manual' as const,
    },
    {
      id: 'editor-picks',
      title: 'Must reads',
      type: 'manual' as const,
    }
  ]
}

// Données curées pour chaque section (MVP)
export const sectionData = {
  games: {
    popular: [1, 2, 6], // IDs des jeux populaires cette semaine
    'top-rated': [3, 1, 4], // IDs des jeux les mieux notés
    'editor-picks': [6, 5, 2] // IDs choisis par l'équipe
  },
  movies: {
    popular: [7, 10, 12],
    'top-rated': [8, 9, 12],
    'editor-picks': [11, 8, 7]
  },
  music: {
    popular: [14, 18, 16],
    'top-albums': [15, 16, 13],
    'editor-picks': [17, 13, 14]
  },
  books: {
    popular: [22, 23, 20],
    bestsellers: [21, 24, 20],
    'editor-picks': [24, 19, 21]
  }
}

// Futures catégories (pour référence)
export const futureSections = {
  games: [
    'New releases',
    'Trending indies', 
    'Similar to what you played',
    'Coming soon',
    'Free to play hits',
    'VR experiences',
    'Retro classics'
  ],
  movies: [
    'Because you watched [X]',
    'New on streaming',
    'Award winners',
    'Critically acclaimed',
    'Hidden gems',
    'International cinema',
    'Documentaries'
  ],
  music: [
    'Similar artists',
    'New releases',
    'Chill vibes',
    'Workout beats',
    'Discover weekly',
    'Genre deep dive',
    'Throwback hits'
  ],
  books: [
    'Recommended for you',
    'Award winners', 
    'New bestsellers',
    'Similar to books you read',
    'Page turners',
    'Literary fiction',
    'Non-fiction gems'
  ]
}
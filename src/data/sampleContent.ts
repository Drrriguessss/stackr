export interface ContentItem {
  id: number
  title: string
  author?: string
  artist?: string
  director?: string
  year: number
  rating: number
  genre: string
}

export const sampleContent = {
  games: [
    {
      id: 1,
      title: 'Elden Ring',
      author: 'FromSoftware',
      year: 2022,
      rating: 4.8,
      genre: 'Action RPG'
    },
    {
      id: 2, 
      title: 'Cyberpunk 2077',
      author: 'CD Projekt RED',
      year: 2020,
      rating: 4.1,
      genre: 'RPG'
    },
    {
      id: 3,
      title: 'The Witcher 3: Wild Hunt',
      author: 'CD Projekt RED', 
      year: 2015,
      rating: 4.9,
      genre: 'RPG'
    },
    {
      id: 4,
      title: 'God of War',
      author: 'Santa Monica Studio',
      year: 2018,
      rating: 4.7,
      genre: 'Action Adventure'
    },
    {
      id: 5,
      title: 'Spider-Man 2',
      author: 'Insomniac Games',
      year: 2023,
      rating: 4.6,
      genre: 'Action Adventure'
    },
    {
      id: 6,
      title: 'Baldur\'s Gate 3',
      author: 'Larian Studios',
      year: 2023,
      rating: 4.9,
      genre: 'RPG'
    }
  ],
  
  movies: [
    {
      id: 7,
      title: 'Dune',
      director: 'Denis Villeneuve',
      year: 2021,
      rating: 4.2,
      genre: 'Sci-Fi'
    },
    {
      id: 8,
      title: 'Inception',
      director: 'Christopher Nolan',
      year: 2010,
      rating: 4.8,
      genre: 'Sci-Fi'
    },
    {
      id: 9,
      title: 'Interstellar',
      director: 'Christopher Nolan',
      year: 2014,
      rating: 4.7,
      genre: 'Sci-Fi Drama'
    },
    {
      id: 10,
      title: 'The Batman',
      director: 'Matt Reeves',
      year: 2022,
      rating: 4.3,
      genre: 'Action'
    },
    {
      id: 11,
      title: 'Top Gun: Maverick',
      director: 'Joseph Kosinski',
      year: 2022,
      rating: 4.5,
      genre: 'Action'
    },
    {
      id: 12,
      title: 'Everything Everywhere All at Once',
      director: 'Daniels',
      year: 2022,
      rating: 4.6,
      genre: 'Sci-Fi Comedy'
    }
  ],

  music: [
    {
      id: 13,
      title: 'Random Access Memories',
      artist: 'Daft Punk',
      year: 2013,
      rating: 4.5,
      genre: 'Electronic'
    },
    {
      id: 14,
      title: 'After Hours',
      artist: 'The Weeknd',
      year: 2020,
      rating: 4.3,
      genre: 'R&B'
    },
    {
      id: 15,
      title: 'Abbey Road',
      artist: 'The Beatles',
      year: 1969,
      rating: 4.9,
      genre: 'Rock'
    },
    {
      id: 16,
      title: 'good kid, m.A.A.d city',
      artist: 'Kendrick Lamar',
      year: 2012,
      rating: 4.8,
      genre: 'Hip Hop'
    },
    {
      id: 17,
      title: 'Blond',
      artist: 'Frank Ocean',
      year: 2016,
      rating: 4.4,
      genre: 'R&B'
    },
    {
      id: 18,
      title: 'Folklore',
      artist: 'Taylor Swift',
      year: 2020,
      rating: 4.2,
      genre: 'Indie Folk'
    }
  ],

  books: [
    {
      id: 19,
      title: 'The Silent Patient',
      author: 'Alex Michaelides',
      year: 2019,
      rating: 4.2,
      genre: 'Thriller'
    },
    {
      id: 20,
      title: 'Dune',
      author: 'Frank Herbert',
      year: 1965,
      rating: 4.6,
      genre: 'Sci-Fi'
    },
    {
      id: 21,
      title: '1984',
      author: 'George Orwell',
      year: 1949,
      rating: 4.8,
      genre: 'Dystopian'
    },
    {
      id: 22,
      title: 'It Starts with Us',
      author: 'Colleen Hoover',
      year: 2022,
      rating: 4.1,
      genre: 'Romance'
    },
    {
      id: 23,
      title: 'The Love Hypothesis',
      author: 'Ali Hazelwood',
      year: 2021,
      rating: 4.0,
      genre: 'Romance'
    },
    {
      id: 24,
      title: 'Project Hail Mary',
      author: 'Andy Weir',
      year: 2021,
      rating: 4.7,
      genre: 'Sci-Fi'
    }
  ]
}
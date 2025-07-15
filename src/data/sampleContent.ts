export interface ContentItem {
  id: string
  title: string
  name?: string
  author?: string
  artist?: string
  director?: string
  year: number
  rating: number
  genre: string
  image?: string
  background_image?: string
  released?: string
  developers?: Array<{name: string}>
  genres?: Array<{name: string}>
  category?: string
}

export const sampleContent = {
  games: [
    {
      id: '22511',
      title: 'Elden Ring',
      name: 'Elden Ring',
      author: 'FromSoftware',
      year: 2022,
      rating: 4.8,
      genre: 'Action RPG',
      image: 'https://media.rawg.io/media/games/5eb/5eb49eb2fa0738fdb5bacea557b1bc57.jpg',
      background_image: 'https://media.rawg.io/media/games/5eb/5eb49eb2fa0738fdb5bacea557b1bc57.jpg',
      released: '2022-02-25',
      developers: [{ name: 'FromSoftware' }],
      genres: [{ name: 'RPG' }, { name: 'Action' }],
      category: 'games'
    },
    {
      id: '41494',
      title: 'Cyberpunk 2077',
      name: 'Cyberpunk 2077',
      author: 'CD Projekt RED',
      year: 2020,
      rating: 4.1,
      genre: 'RPG',
      image: 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg',
      background_image: 'https://media.rawg.io/media/games/26d/26d4437715bee60138dab4a7c8c59c92.jpg',
      released: '2020-12-10',
      developers: [{ name: 'CD PROJEKT RED' }],
      genres: [{ name: 'RPG' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '3328',
      title: 'The Witcher 3: Wild Hunt',
      name: 'The Witcher 3: Wild Hunt',
      author: 'CD Projekt RED', 
      year: 2015,
      rating: 4.9,
      genre: 'RPG',
      image: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg',
      background_image: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg',
      released: '2015-05-18',
      developers: [{ name: 'CD PROJEKT RED' }],
      genres: [{ name: 'RPG' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '58175',
      title: 'God of War',
      name: 'God of War',
      author: 'Santa Monica Studio',
      year: 2018,
      rating: 4.7,
      genre: 'Action Adventure',
      image: 'https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg',
      background_image: 'https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg',
      released: '2018-04-20',
      developers: [{ name: 'Santa Monica Studio' }],
      genres: [{ name: 'Action' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '622492',
      title: 'Spider-Man 2',
      name: 'Spider-Man 2',
      author: 'Insomniac Games',
      year: 2023,
      rating: 4.6,
      genre: 'Action Adventure',
      image: 'https://media.rawg.io/media/games/709/709bf81f874ce5d25d625b37b014cb63.jpg',
      background_image: 'https://media.rawg.io/media/games/709/709bf81f874ce5d25d625b37b014cb63.jpg',
      released: '2023-10-20',
      developers: [{ name: 'Insomniac Games' }],
      genres: [{ name: 'Action' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '422',
      title: 'Baldurs Gate 3',
      name: 'Baldurs Gate 3',
      author: 'Larian Studios',
      year: 2023,
      rating: 4.9,
      genre: 'RPG',
      image: 'https://media.rawg.io/media/games/699/69993db1cfcaf895c8b22603ee1aae62.jpg',
      background_image: 'https://media.rawg.io/media/games/699/69993db1cfcaf895c8b22603ee1aae62.jpg',
      released: '2023-08-03',
      developers: [{ name: 'Larian Studios' }],
      genres: [{ name: 'RPG' }, { name: 'Strategy' }],
      category: 'games'
    },
    {
      id: '28',
      title: 'Red Dead Redemption 2',
      name: 'Red Dead Redemption 2',
      author: 'Rockstar Games',
      year: 2018,
      rating: 4.8,
      genre: 'Action Adventure',
      image: 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg',
      background_image: 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg',
      released: '2018-10-26',
      developers: [{ name: 'Rockstar Studios' }],
      genres: [{ name: 'Action' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '326243',
      title: 'Zelda: Tears of the Kingdom',
      name: 'The Legend of Zelda: Tears of the Kingdom',
      author: 'Nintendo',
      year: 2023,
      rating: 4.9,
      genre: 'Adventure',
      image: 'https://media.rawg.io/media/games/8d9/8d92b2b6b28c5497f7a52049e6d0e95d.jpg',
      background_image: 'https://media.rawg.io/media/games/8d9/8d92b2b6b28c5497f7a52049e6d0e95d.jpg',
      released: '2023-05-12',
      developers: [{ name: 'Nintendo EPD' }],
      genres: [{ name: 'Adventure' }, { name: 'Puzzle' }],
      category: 'games'
    }
  ],
  
  movies: [
    {
      id: 'dune-2021',
      title: 'Dune',
      director: 'Denis Villeneuve',
      year: 2021,
      rating: 4.2,
      genre: 'Sci-Fi',
      image: 'https://image.tmdb.org/t/p/w500/d5NuKzxEfgLAE6twC18pSnWnOzw.jpg',
      category: 'movies'
    },
    {
      id: 'inception',
      title: 'Inception',
      director: 'Christopher Nolan',
      year: 2010,
      rating: 4.8,
      genre: 'Sci-Fi',
      image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      category: 'movies'
    },
    {
      id: 'interstellar',
      title: 'Interstellar',
      director: 'Christopher Nolan',
      year: 2014,
      rating: 4.7,
      genre: 'Sci-Fi Drama',
      image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      category: 'movies'
    },
    {
      id: 'the-batman',
      title: 'The Batman',
      director: 'Matt Reeves',
      year: 2022,
      rating: 4.3,
      genre: 'Action',
      image: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
      category: 'movies'
    },
    {
      id: 'top-gun-maverick',
      title: 'Top Gun: Maverick',
      director: 'Joseph Kosinski',
      year: 2022,
      rating: 4.5,
      genre: 'Action',
      image: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
      category: 'movies'
    },
    {
      id: 'everything-everywhere',
      title: 'Everything Everywhere All at Once',
      director: 'Daniels',
      year: 2022,
      rating: 4.6,
      genre: 'Sci-Fi Comedy',
      image: 'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
      category: 'movies'
    },
    {
      id: 'avatar-2',
      title: 'Avatar: The Way of Water',
      director: 'James Cameron',
      year: 2022,
      rating: 4.4,
      genre: 'Sci-Fi',
      image: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
      category: 'movies'
    },
    {
      id: 'oppenheimer',
      title: 'Oppenheimer',
      director: 'Christopher Nolan',
      year: 2023,
      rating: 4.7,
      genre: 'Drama',
      image: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      category: 'movies'
    }
  ],

  music: [
    {
      id: 'random-access-memories',
      title: 'Random Access Memories',
      artist: 'Daft Punk',
      year: 2013,
      rating: 4.5,
      genre: 'Electronic',
      image: 'https://images.genius.com/2b3eafa25e5fb5bb0ab8f73ab9d09634.1000x1000x1.jpg',
      category: 'music'
    },
    {
      id: 'after-hours',
      title: 'After Hours',
      artist: 'The Weeknd',
      year: 2020,
      rating: 4.3,
      genre: 'R&B',
      image: 'https://images.genius.com/a9922ad23c21e6a2b6f97e65c5c2ea2b.1000x1000x1.jpg',
      category: 'music'
    },
    {
      id: 'abbey-road',
      title: 'Abbey Road',
      artist: 'The Beatles',
      year: 1969,
      rating: 4.9,
      genre: 'Rock',
      image: 'https://images.genius.com/aeeef7f8b02c67a7f27a8f5e7e2fc439.1000x1000x1.jpg',
      category: 'music'
    },
    {
      id: 'good-kid-maad-city',
      title: 'good kid, m.A.A.d city',
      artist: 'Kendrick Lamar',
      year: 2012,
      rating: 4.8,
      genre: 'Hip Hop',
      image: 'https://images.genius.com/abd8db8081e5daed5d833bdece4a6e0e.1000x1000x1.jpg',
      category: 'music'
    },
    {
      id: 'blond',
      title: 'Blond',
      artist: 'Frank Ocean',
      year: 2016,
      rating: 4.4,
      genre: 'R&B',
      image: 'https://images.genius.com/76e4c6b6cc6c81ac6fe45eae25ddc1a6.1000x1000x1.jpg',
      category: 'music'
    },
    {
      id: 'folklore',
      title: 'Folklore',
      artist: 'Taylor Swift',
      year: 2020,
      rating: 4.2,
      genre: 'Indie Folk',
      image: 'https://images.genius.com/fb9e8d5997d6df7794ae60fc1df2b3a5.1000x1000x1.jpg',
      category: 'music'
    },
    {
      id: 'astroworld',
      title: 'Astroworld',
      artist: 'Travis Scott',
      year: 2018,
      rating: 4.3,
      genre: 'Hip Hop',
      image: 'https://images.genius.com/d842b9a63b5d30b5ce7bb85f6be86e19.1000x1000x1.jpg',
      category: 'music'
    },
    {
      id: 'sour',
      title: 'SOUR',
      artist: 'Olivia Rodrigo',
      year: 2021,
      rating: 4.1,
      genre: 'Pop',
      image: 'https://images.genius.com/53b8d0c0df2e45c6ce8b23fa5e8e8fce.1000x1000x1.jpg',
      category: 'music'
    }
  ],

  books: [
    {
      id: 'the-silent-patient',
      title: 'The Silent Patient',
      author: 'Alex Michaelides',
      year: 2019,
      rating: 4.2,
      genre: 'Thriller',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1582398159i/40097951.jpg',
      category: 'books'
    },
    {
      id: 'dune-book',
      title: 'Dune',
      author: 'Frank Herbert',
      year: 1965,
      rating: 4.6,
      genre: 'Sci-Fi',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg',
      category: 'books'
    },
    {
      id: '1984',
      title: '1984',
      author: 'George Orwell',
      year: 1949,
      rating: 4.8,
      genre: 'Dystopian',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1532714506i/40961427.jpg',
      category: 'books'
    },
    {
      id: 'it-starts-with-us',
      title: 'It Starts with Us',
      author: 'Colleen Hoover',
      year: 2022,
      rating: 4.1,
      genre: 'Romance',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1628449804i/58784475.jpg',
      category: 'books'
    },
    {
      id: 'the-love-hypothesis',
      title: 'The Love Hypothesis',
      author: 'Ali Hazelwood',
      year: 2021,
      rating: 4.0,
      genre: 'Romance',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1611937942i/56732449.jpg',
      category: 'books'
    },
    {
      id: 'project-hail-mary',
      title: 'Project Hail Mary',
      author: 'Andy Weir',
      year: 2021,
      rating: 4.7,
      genre: 'Sci-Fi',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1597695864i/54493401.jpg',
      category: 'books'
    },
    {
      id: 'where-crawdads-sing',
      title: 'Where the Crawdads Sing',
      author: 'Delia Owens',
      year: 2018,
      rating: 4.5,
      genre: 'Fiction',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1582135294i/36809135.jpg',
      category: 'books'
    },
    {
      id: 'atomic-habits',
      title: 'Atomic Habits',
      author: 'James Clear',
      year: 2018,
      rating: 4.6,
      genre: 'Self-Help',
      image: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg',
      category: 'books'
    }
  ]
}
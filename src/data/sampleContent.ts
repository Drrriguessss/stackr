// src/data/sampleContent.ts - DONNÉES CORRIGÉES avec vrais IDs RAWG
export const sampleContent = {
  games: [
    {
      id: '3498', // VRAI ID RAWG pour GTA V
      title: 'Grand Theft Auto V',
      name: 'Grand Theft Auto V',
      background_image: 'https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg',
      released: '2013-09-17',
      rating: 4.47,
      developers: [{ name: 'Rockstar North' }],
      genres: [{ name: 'Action' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '4200', // VRAI ID RAWG pour Portal 2
      title: 'Portal 2',
      name: 'Portal 2',
      background_image: 'https://media.rawg.io/media/games/2ba/2bac0e87cf45e5b508f227d281c9252a.jpg',
      released: '2011-04-18',
      rating: 4.62,
      developers: [{ name: 'Valve Corporation' }],
      genres: [{ name: 'Puzzle' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '3328', // VRAI ID RAWG pour The Witcher 3
      title: 'The Witcher 3: Wild Hunt',
      name: 'The Witcher 3: Wild Hunt',
      background_image: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg',
      released: '2015-05-18',
      rating: 4.66,
      developers: [{ name: 'CD PROJEKT RED' }],
      genres: [{ name: 'RPG' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '28', // VRAI ID RAWG pour Red Dead Redemption 2
      title: 'Red Dead Redemption 2',
      name: 'Red Dead Redemption 2',
      background_image: 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg',
      released: '2018-10-26',
      rating: 4.59,
      developers: [{ name: 'Rockstar Studios' }],
      genres: [{ name: 'Action' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '22511', // VRAI ID RAWG pour Elden Ring
      title: 'Elden Ring',
      name: 'Elden Ring',
      background_image: 'https://media.rawg.io/media/games/5eb/5eb49eb2fa0738fdb5bacea557b1bc57.jpg',
      released: '2022-02-25',
      rating: 4.34,
      developers: [{ name: 'FromSoftware' }],
      genres: [{ name: 'RPG' }, { name: 'Action' }],
      category: 'games'
    },
    {
      id: '1030', // VRAI ID RAWG pour Limbo
      title: 'Limbo',
      name: 'Limbo',
      background_image: 'https://media.rawg.io/media/games/942/9424d6bb763dc38d9378b488603c87fa.jpg',
      released: '2010-07-21',
      rating: 4.14,
      developers: [{ name: 'Playdead' }],
      genres: [{ name: 'Puzzle' }, { name: 'Adventure' }],
      category: 'games'
    },
    {
      id: '3939', // VRAI ID RAWG pour PAYDAY 2
      title: 'PAYDAY 2',
      name: 'PAYDAY 2',
      background_image: 'https://media.rawg.io/media/games/73e/73eecb8909e0c39fb246f457b5d6cbbe.jpg',
      released: '2013-08-13',
      rating: 3.51,
      developers: [{ name: 'Overkill Software' }],
      genres: [{ name: 'Action' }, { name: 'Shooter' }],
      category: 'games'
    },
    {
      id: '58175', // VRAI ID RAWG pour God of War (2018)
      title: 'God of War',
      name: 'God of War',
      background_image: 'https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg',
      released: '2018-04-20',
      rating: 4.58,
      developers: [{ name: 'Santa Monica Studio' }],
      genres: [{ name: 'Action' }, { name: 'Adventure' }],
      category: 'games'
    }
  ],
  movies: [
    {
      id: 'movie-1',
      title: 'Spider-Man: No Way Home',
      director: 'Jon Watts',
      year: 2021,
      rating: 4.5,
      genre: 'Action',
      image: 'https://m.media-amazon.com/images/M/MV5BZWMyYzFjYTYtNTRjYi00OGExLWE2YzgtOGRmYjAxZTU3NzBiXkEyXkFqcGdeQXVyMzQ0MzA0NTM@._V1_SX300.jpg',
      category: 'movies'
    },
    {
      id: 'movie-2',
      title: 'Dune',
      director: 'Denis Villeneuve',
      year: 2021,
      rating: 4.3,
      genre: 'Sci-Fi',
      image: 'https://m.media-amazon.com/images/M/MV5BN2FjNmEyNWMtYzM0ZS00NjIyLTg5YzYtYThlMGVjNzE1OGViXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
      category: 'movies'
    }
  ],
  music: [
    {
      id: 'music-1',
      title: 'Folklore',
      artist: 'Taylor Swift',
      year: 2020,
      rating: 4.8,
      genre: 'Pop',
      image: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8b/5e/6f/8b5e6f7a-8c9b-9d7e-8b5e-6f7a8c9b9d7e/source/100x100bb.jpg',
      category: 'music'
    }
  ],
  books: [
    {
      id: 'book-1',
      title: 'Dune',
      author: 'Frank Herbert',
      year: 1965,
      rating: 4.6,
      genre: 'Science Fiction',
      image: 'https://books.google.com/books/content?id=B1hSG45JCX4C&printsec=frontcover&img=1&zoom=1&source=gbs_api',
      category: 'books'
    }
  ]
}

// CSS GLOBAL FIXES - à ajouter dans globals.css
/* Masquer les barres de défilement sur desktop */
@media (min-width: 768px) {
  /* Masquer scrollbar pour Chrome, Safari, Edge */
  ::-webkit-scrollbar {
    display: none;
  }
  
  /* Masquer scrollbar pour Firefox */
  * {
    scrollbar-width: none;
  }
  
  /* Garder la fonctionnalité de scroll */
  .horizontal-scroll {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .horizontal-scroll::-webkit-scrollbar {
    display: none;
  }
}

/* Fix pour le popup de statut */
.status-popup {
  z-index: 9999 !important;
  position: fixed !important;
  background: rgba(17, 24, 39, 0.95) !important;
  backdrop-filter: blur(8px) !important;
  border: 1px solid rgba(75, 85, 99, 0.5) !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

/* Améliorer la visibilité des éléments de scroll horizontal */
.horizontal-scroll {
  scroll-behavior: smooth;
}

/* Fix pour les cards en hover */
.content-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
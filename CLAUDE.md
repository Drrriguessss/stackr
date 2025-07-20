# CLAUDE.md - Stackr Project Documentation

## Project Overview
**Stackr** is a modern media tracking application built with Next.js that allows users to discover, organize, and track their consumption of games, movies, music, and books. The app features intelligent trending discovery, personalized recommendations, and comprehensive library management.

## Tech Stack
- **Framework**: Next.js 15.3.5 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Icons**: Lucide React
- **Database**: Supabase (with local storage fallback)
- **Analytics**: Vercel Analytics
- **Development**: Next.js with Turbopack

## Core Features

### 1. Multi-Media Tracking
- **Games**: Track gaming progress with status (want-to-play, currently-playing, completed)
- **Movies**: Manage watchlist and viewing history
- **Music**: Track albums and listening progress
- **Books**: Reading lists and completion tracking

### 2. Intelligent Discovery System
- **Trending Intelligence**: Real-time trending content from multiple sources
- **Dynamic Hero Section**: Auto-rotating trending content with live data
- **Smart Filtering**: Category-based content filtering
- **Personalized Recommendations**: "For You" section based on library analysis (requires 10+ items)

### 3. Library Management
- **Status Tracking**: Multiple status options per media type
- **Progress Tracking**: Percentage completion for various media
- **User Ratings**: 1-5 star rating system
- **Personal Notes**: Custom notes for each item
- **Supabase Integration**: Cloud sync with local storage fallback

### 4. Search & External APIs
- **Multi-Source Search**: Integrated search across all media types
- **Real-time Results**: Dynamic search with API integration
- **Detailed Modals**: Comprehensive item details with reviews

## Project Structure

```
stackr/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main application entry point
│   │   ├── layout.tsx            # Root layout with global styles
│   │   └── globals.css           # Global CSS styles
│   ├── components/
│   │   ├── DiscoverPage.tsx      # Intelligent trending discovery page
│   │   ├── LibrarySection.tsx    # User library management
│   │   ├── SearchModal.tsx       # Global search functionality
│   │   ├── ContentSection.tsx    # Content display sections
│   │   ├── ContentCard.tsx       # Individual content item cards
│   │   ├── CategoryTabs.tsx      # Media category navigation
│   │   ├── Header.tsx            # App header component
│   │   ├── BottomNavigation.tsx  # Mobile-friendly bottom nav
│   │   ├── WelcomePopup.tsx      # First-time user experience
│   │   ├── RoadmapPage.tsx       # Feature roadmap display
│   │   └── [Media]DetailModal.tsx # Detail modals for each media type:
│   │       ├── GameDetailModal.tsx
│   │       ├── MovieDetailModal.tsx
│   │       ├── BookDetailModal.tsx
│   │       └── MusicDetailModal.tsx
│   ├── services/
│   │   ├── libraryService.ts         # Supabase + local storage management
│   │   ├── trendingDiscoveryService.ts # Intelligent trending system
│   │   ├── rawgService.ts            # RAWG API for games
│   │   ├── omdbService.ts            # OMDB API for movies
│   │   ├── googleBooksService.ts     # Google Books API
│   │   └── musicService.ts           # iTunes API for music
│   ├── data/
│   │   └── sampleContent.ts      # Fallback sample data
│   ├── lib/
│   │   └── supabase.ts           # Supabase client configuration
│   ├── types/
│   │   └── index.ts              # Comprehensive TypeScript definitions
│   └── utils/
│       └── idNormalizer.ts       # ID normalization utilities
├── public/                       # Static assets
├── package.json                  # Dependencies and scripts
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── next.config.ts               # Next.js configuration
```

## Key Components and Their Locations

### Main Application (`src/app/page.tsx`)
- **Primary entry point** for the application
- **State management** for all major app features
- **Content loading** from external APIs with fallbacks
- **Library management** integration
- **Navigation** between different app sections

### Discovery System (`src/components/DiscoverPage.tsx`)
- **Trending intelligence** with auto-refresh
- **Hero section** with auto-rotating content
- **Category filtering** and smart recommendations
- **For You section** with library-based analysis

### Library Management (`src/components/LibrarySection.tsx`)
- **CRUD operations** for user library
- **Status management** for different media types
- **Progress tracking** and rating system

### External API Services (`src/services/`)
- **`rawgService.ts`**: RAWG API integration for games data
- **`omdbService.ts`**: OMDB API for movie/TV data
- **`googleBooksService.ts`**: Google Books API integration
- **`musicService.ts`**: iTunes API for music/album data
- **`trendingDiscoveryService.ts`**: Advanced trending intelligence system
- **`libraryService.ts`**: Supabase integration with local storage fallback

### Type Definitions (`src/types/index.ts`)
- **Comprehensive interfaces** for all media types
- **Library item definitions** with status tracking
- **Trending system types** for intelligent discovery
- **Review and rating interfaces**

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## API Integrations

### Games (RAWG API)
- **Popular games**, top-rated, new releases
- **Game details** including screenshots, platforms, genres
- **Steam reviews** simulation for enhanced UX

### Movies/TV (OMDB API)
- **Movie search** and details
- **IMDB integration** for ratings and reviews
- **TV series** support with season tracking

### Books (Google Books API)
- **Fiction and non-fiction** categorization
- **Book details** including descriptions, authors
- **Goodreads-style reviews** simulation

### Music (iTunes API)
- **Album search** and details
- **Artist information** and track listings
- **Music community reviews** simulation

## Database Schema (Supabase)

### library_items table
- **id**: Primary key
- **user_id**: User identifier
- **title**: Media title
- **category**: Media type (games/movies/music/books)
- **status**: Current status (want-to-play, currently-playing, completed, etc.)
- **rating**: User rating (1-5 stars)
- **progress**: Completion percentage
- **notes**: Personal notes
- **added_at**: Timestamp
- **updated_at**: Timestamp

## Key Features by File Location

### Navigation & Layout
- **Bottom Navigation**: `src/components/BottomNavigation.tsx`
- **Category Tabs**: `src/components/CategoryTabs.tsx`
- **Header**: `src/components/Header.tsx`

### Content Discovery
- **Trending Page**: `src/components/DiscoverPage.tsx:line_116` (loadTrendingContent)
- **Search Functionality**: `src/components/SearchModal.tsx`
- **Content Sections**: `src/components/ContentSection.tsx`

### Library Management
- **Add to Library**: `src/app/page.tsx:line_254` (handleAddToLibrary)
- **Update Items**: `src/app/page.tsx:line_298` (handleUpdateItem)
- **Library Service**: `src/services/libraryService.ts`

### Trending Intelligence
- **Trending Service**: `src/services/trendingDiscoveryService.ts`
- **Auto-refresh**: `src/components/DiscoverPage.tsx:line_125`
- **Hero Rotation**: `src/components/DiscoverPage.tsx:line_130`

### External API Integration
- **Games API**: `src/services/rawgService.ts`
- **Movies API**: `src/services/omdbService.ts`
- **Books API**: `src/services/googleBooksService.ts`
- **Music API**: `src/services/musicService.ts`

## Common Tasks and Where to Find Code

### Adding New Media Types
1. **Update types**: `src/types/index.ts` - Add new MediaCategory
2. **Create service**: `src/services/[newMedia]Service.ts`
3. **Add detail modal**: `src/components/[NewMedia]DetailModal.tsx`
4. **Update main page**: `src/app/page.tsx` - Add loading and handling functions

### Modifying Library Functionality
- **Library operations**: `src/services/libraryService.ts`
- **UI components**: `src/components/LibrarySection.tsx`
- **Status management**: `src/app/page.tsx:line_255` (handleAddToLibrary)

### Customizing Trending System
- **Trending logic**: `src/services/trendingDiscoveryService.ts`
- **Hero display**: `src/components/DiscoverPage.tsx:line_242` (renderIntelligentHero)
- **Auto-rotation**: `src/components/DiscoverPage.tsx:line_130`

### Styling and UI Changes
- **Global styles**: `src/app/globals.css`
- **Tailwind config**: `tailwind.config.js`
- **Component styles**: Individual component files with Tailwind classes

## Environment Variables
- **Supabase URL**: For database connection
- **Supabase Anon Key**: For authentication
- **API Keys**: For external service integrations (RAWG, OMDB, etc.)

## Testing & Quality
- **TypeScript**: Full type safety across the application
- **ESLint**: Code quality and consistency
- **Next.js**: Built-in optimizations and best practices

This documentation provides Claude with comprehensive knowledge of the Stackr project structure, features, and code organization for efficient future assistance.
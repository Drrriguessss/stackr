// YouTube service for board game videos
// Note: This requires a YouTube Data API v3 key
// For now, we'll simulate the API response structure

export interface YouTubeVideo {
  id: string
  title: string
  channel: string
  thumbnail: string
  url: string
  type: 'rules' | 'review' | 'gameplay' | 'strategy' | 'unboxing' | 'other'
  publishedAt: string
  duration?: string
  viewCount?: string
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

const categorizeVideo = (title: string): YouTubeVideo['type'] => {
  const titleLower = title.toLowerCase()
  if (titleLower.includes('how to play') || titleLower.includes('rules')) return 'rules'
  if (titleLower.includes('review')) return 'review'
  if (titleLower.includes('playthrough') || titleLower.includes('gameplay')) return 'gameplay'
  if (titleLower.includes('strategy') || titleLower.includes('tips')) return 'strategy'
  if (titleLower.includes('unboxing')) return 'unboxing'
  return 'other'
}

// Filter videos to ensure they actually match the game name
const isVideoRelevant = (videoTitle: string, gameName: string): boolean => {
  const titleLower = videoTitle.toLowerCase()
  const gameNameLower = gameName.toLowerCase()
  
  // Remove common board game suffixes that might confuse matching
  const cleanGameName = gameNameLower
    .replace(/\s*(board\s*game|game)\s*$/i, '')
    .replace(/\s*3d\s*/i, ' ')
    .trim()
  
  // Check if the video title contains the exact game name or significant parts
  const gameWords = cleanGameName.split(/\s+/).filter(word => word.length > 2)
  
  // For games with multiple words, require at least 2 main words to match
  if (gameWords.length >= 2) {
    const matchedWords = gameWords.filter(word => titleLower.includes(word))
    return matchedWords.length >= Math.min(2, gameWords.length)
  }
  
  // For single word games, require exact match or very close match
  return titleLower.includes(cleanGameName) || 
         titleLower.includes(gameNameLower) ||
         gameWords.every(word => titleLower.includes(word))
}

export const fetchYouTubeVideos = async (gameName: string): Promise<YouTubeVideo[]> => {
  // OPTIMIZATION: Single query instead of 4 to save API quota
  // YouTube search costs 100 units per request!
  const optimizedQuery = `"${gameName}" board game (how to play OR review OR gameplay OR strategy)`
  
  const videos: YouTubeVideo[] = []
  
  // If no API key, return mock data for testing
  if (!YOUTUBE_API_KEY) {
    console.log('No YouTube API key found, returning mock data for:', gameName)
    return getMockVideos(gameName)
  }
  
  // Make single optimized search instead of 4 separate searches
  const searchQueries = [optimizedQuery]
  
  for (const query of searchQueries) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=medium&order=relevance&maxResults=10&key=${YOUTUBE_API_KEY}`
      )
      
      if (!response.ok) {
        if (response.status === 403) {
          console.warn('YouTube API 403 - falling back to mock data for:', gameName)
          return getMockVideos(gameName)
        }
        throw new Error(`YouTube API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      const processedVideos: YouTubeVideo[] = data.items
        .filter((item: any) => isVideoRelevant(item.snippet.title, gameName))
        .map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium.url,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          type: categorizeVideo(item.snippet.title),
          publishedAt: item.snippet.publishedAt
        }))
      
      videos.push(...processedVideos)
    } catch (error) {
      console.warn('YouTube API error for query:', query, error)
      // If this is the first query and we got an error, return mock data
      if (query === searchQueries[0]) {
        console.log('Falling back to mock data due to API failure')
        return getMockVideos(gameName)
      }
    }
  }
  
  // Remove duplicates and limit results
  const uniqueVideos = videos.filter((video, index, self) => 
    index === self.findIndex(v => v.id === video.id)
  )
  
  return uniqueVideos.slice(0, 12) // Limit to 12 videos total
}

// Mock data for testing when no API key is available
const getMockVideos = (gameName: string): YouTubeVideo[] => {
  // Generate YouTube-compatible thumbnail URLs using game name
  const createThumbnail = (type: string, color: string) => {
    // Use actual YouTube logo and colors for better mobile compatibility
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="180" fill="${color}"/>
        <rect x="120" y="60" width="80" height="60" rx="8" fill="white" opacity="0.9"/>
        <polygon points="145,75 145,105 165,90" fill="${color}"/>
        <text x="160" y="140" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">${type}</text>
      </svg>
    `)}`
  }

  return [
    {
      id: 'mock-rules-1',
      title: `${gameName} - How to Play Rules & Setup`,
      channel: 'Watch It Played',
      thumbnail: createThumbnail('How to Play', '#2563eb'),
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent('"' + gameName + '" how to play board game')}`,
      type: 'rules',
      publishedAt: '2023-01-15T10:00:00Z'
    },
    {
      id: 'mock-review-1',
      title: `${gameName} Review - Is It Worth It?`,
      channel: 'Dice Tower',
      thumbnail: createThumbnail('Review', '#16a34a'),
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent('"' + gameName + '" review board game')}`,
      type: 'review',
      publishedAt: '2023-02-10T14:30:00Z'
    },
    {
      id: 'mock-gameplay-1',
      title: `${gameName} Complete Playthrough`,
      channel: 'GameNight!',
      thumbnail: createThumbnail('Gameplay', '#7c3aed'),
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent('"' + gameName + '" playthrough board game')}`,
      type: 'gameplay',
      publishedAt: '2023-03-05T16:45:00Z'
    },
    {
      id: 'mock-strategy-1',
      title: `${gameName} Strategy Guide & Tips`,
      channel: 'Board Game Strategy',
      thumbnail: createThumbnail('Strategy', '#ea580c'),
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent('"' + gameName + '" strategy board game')}`,
      type: 'strategy',
      publishedAt: '2023-03-20T12:15:00Z'
    },
    {
      id: 'mock-unboxing-1',
      title: `${gameName} Unboxing & Components Overview`,
      channel: 'Unbox Board Games',
      thumbnail: createThumbnail('Unboxing', '#db2777'),
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent('"' + gameName + '" unboxing board game')}`,
      type: 'unboxing',
      publishedAt: '2023-04-01T09:30:00Z'
    }
  ]
}

export const getVideoTypeLabel = (type: YouTubeVideo['type']): string => {
  switch (type) {
    case 'rules': return 'How to Play'
    case 'review': return 'Review'
    case 'gameplay': return 'Gameplay'
    case 'strategy': return 'Strategy'
    case 'unboxing': return 'Unboxing'
    default: return 'Video'
  }
}

export const getVideoTypeColor = (type: YouTubeVideo['type']): string => {
  switch (type) {
    case 'rules': return 'bg-blue-600'
    case 'review': return 'bg-green-600'
    case 'gameplay': return 'bg-purple-600'
    case 'strategy': return 'bg-orange-600'
    case 'unboxing': return 'bg-pink-600'
    default: return 'bg-gray-600'
  }
}
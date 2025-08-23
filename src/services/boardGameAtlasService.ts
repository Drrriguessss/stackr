// Board Game Atlas API Service
// API Documentation: https://www.boardgameatlas.com/api/docs

interface BoardGameAtlasGame {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  thumb_url?: string;
  images?: {
    thumb?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  // Additional media that might contain component images, gameplay photos, etc.
  description_preview?: string;
  components?: string[];
  rules_url?: string;
  official_url?: string;
  reddit_all_time_count?: number;
  
  // Media and visual content
  image_components?: string[];  // Component images
  image_gameplay?: string[];    // Gameplay photos
  image_rules?: string[];        // Rules and player aids
  image_setup?: string[];        // Setup photos
  
  // Additional images from the API
  additional_images?: Array<{
    url: string;
    caption?: string;
    type?: 'component' | 'gameplay' | 'rules' | 'setup' | 'other';
  }>;
}

interface BoardGameAtlasSearchResponse {
  games: BoardGameAtlasGame[];
  count: number;
}

class BoardGameAtlasService {
  private readonly BASE_URL = 'https://api.boardgameatlas.com/api';
  // Free tier client_id - you should replace this with your own
  // Get one at: https://www.boardgameatlas.com/api/docs/apps
  private readonly CLIENT_ID = 'JLBr5npPhV'; // This is a demo key, replace with your own
  
  /**
   * Search for a game by name to get its Board Game Atlas ID
   */
  async searchGame(name: string): Promise<BoardGameAtlasGame | null> {
    try {
      console.log('🎲 [BGA] Searching Board Game Atlas for:', name);
      
      const params = new URLSearchParams({
        name: name,
        client_id: this.CLIENT_ID,
        limit: '1',
        fuzzy_match: 'true'
      });
      
      const response = await fetch(`${this.BASE_URL}/search?${params}`);
      
      if (!response.ok) {
        console.error('🎲 [BGA] API error:', response.status);
        return null;
      }
      
      const data: BoardGameAtlasSearchResponse = await response.json();
      
      if (data.games && data.games.length > 0) {
        console.log('🎲 [BGA] Found game:', data.games[0].name);
        return data.games[0];
      }
      
      console.log('🎲 [BGA] No games found');
      return null;
    } catch (error) {
      console.error('🎲 [BGA] Search error:', error);
      return null;
    }
  }
  
  /**
   * Get detailed game information including all available images
   */
  async getGameDetails(gameId: string): Promise<BoardGameAtlasGame | null> {
    try {
      console.log('🎲 [BGA] Fetching details for game ID:', gameId);
      
      const params = new URLSearchParams({
        ids: gameId,
        client_id: this.CLIENT_ID
      });
      
      const response = await fetch(`${this.BASE_URL}/search?${params}`);
      
      if (!response.ok) {
        console.error('🎲 [BGA] API error:', response.status);
        return null;
      }
      
      const data: BoardGameAtlasSearchResponse = await response.json();
      
      if (data.games && data.games.length > 0) {
        const game = data.games[0];
        console.log('🎲 [BGA] Game details loaded:', game.name);
        
        // Log available image data for debugging
        console.log('🎲 [BGA] Available images:', {
          main_image: game.image_url,
          thumb: game.thumb_url,
          images_object: game.images,
          additional: game.additional_images
        });
        
        return game;
      }
      
      return null;
    } catch (error) {
      console.error('🎲 [BGA] Details error:', error);
      return null;
    }
  }
  
  /**
   * Get game images and media from Board Game Atlas
   * This will attempt to find various types of game images
   */
  async getGameImages(gameName: string): Promise<{
    mainImage?: string;
    thumbnail?: string;
    componentImages: string[];
    gameplayPhotos: string[];
    rulesImages: string[];
    setupPhotos: string[];
    allImages: string[];
  }> {
    const result = {
      mainImage: undefined as string | undefined,
      thumbnail: undefined as string | undefined,
      componentImages: [] as string[],
      gameplayPhotos: [] as string[],
      rulesImages: [] as string[],
      setupPhotos: [] as string[],
      allImages: [] as string[]
    };
    
    try {
      // First search for the game
      const game = await this.searchGame(gameName);
      
      if (!game) {
        console.log('🎲 [BGA] Game not found in Board Game Atlas');
        return result;
      }
      
      // Get detailed information
      const details = await this.getGameDetails(game.id);
      
      if (!details) {
        return result;
      }
      
      // Extract main images
      result.mainImage = details.image_url;
      result.thumbnail = details.thumb_url;
      
      // Collect all available images
      const allImages: string[] = [];
      
      if (details.image_url) allImages.push(details.image_url);
      if (details.thumb_url && details.thumb_url !== details.image_url) {
        allImages.push(details.thumb_url);
      }
      
      // Check for images object with different sizes
      if (details.images) {
        if (details.images.original) allImages.push(details.images.original);
        if (details.images.large) allImages.push(details.images.large);
        if (details.images.medium) allImages.push(details.images.medium);
        if (details.images.small) allImages.push(details.images.small);
      }
      
      // Check for categorized images (these fields might not exist yet in the API)
      if (details.image_components) {
        result.componentImages = details.image_components;
        allImages.push(...details.image_components);
      }
      
      if (details.image_gameplay) {
        result.gameplayPhotos = details.image_gameplay;
        allImages.push(...details.image_gameplay);
      }
      
      if (details.image_rules) {
        result.rulesImages = details.image_rules;
        allImages.push(...details.image_rules);
      }
      
      if (details.image_setup) {
        result.setupPhotos = details.image_setup;
        allImages.push(...details.image_setup);
      }
      
      // Check for additional images with categories
      if (details.additional_images && Array.isArray(details.additional_images)) {
        details.additional_images.forEach(img => {
          if (img.url) {
            allImages.push(img.url);
            
            // Categorize based on type if available
            switch (img.type) {
              case 'component':
                result.componentImages.push(img.url);
                break;
              case 'gameplay':
                result.gameplayPhotos.push(img.url);
                break;
              case 'rules':
                result.rulesImages.push(img.url);
                break;
              case 'setup':
                result.setupPhotos.push(img.url);
                break;
            }
          }
        });
      }
      
      // Remove duplicates
      result.allImages = [...new Set(allImages)];
      
      console.log('🎲 [BGA] Found images:', {
        total: result.allImages.length,
        components: result.componentImages.length,
        gameplay: result.gameplayPhotos.length,
        rules: result.rulesImages.length,
        setup: result.setupPhotos.length
      });
      
      return result;
    } catch (error) {
      console.error('🎲 [BGA] Error getting game images:', error);
      return result;
    }
  }
}

export const boardGameAtlasService = new BoardGameAtlasService();
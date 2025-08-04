// Test complet de l'API RAWG pour diagnostiquer les images
// Ce fichier sert uniquement au debug - pas utilisé en production

export async function testRAWGAPI() {
  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  
  console.log('🔍 === AUDIT COMPLET API RAWG ===')
  console.log('🔍 API Key available:', !!RAWG_API_KEY)
  
  if (!RAWG_API_KEY) {
    console.error('❌ Pas de clé API RAWG!')
    return
  }

  // Test avec un jeu populaire (The Witcher 3)
  const gameId = '3328' // The Witcher 3: Wild Hunt
  
  try {
    // 1. Test du détail du jeu
    console.log('\n🎮 === TEST 1: DÉTAILS DU JEU ===')
    const gameResponse = await fetch(`https://api.rawg.io/api/games/${gameId}?key=${RAWG_API_KEY}`)
    console.log('Status:', gameResponse.status)
    
    if (gameResponse.ok) {
      const gameData = await gameResponse.json()
      console.log('✅ Game data structure:')
      console.log('- Name:', gameData.name)
      console.log('- Background image:', gameData.background_image)
      console.log('- Screenshots array exists:', !!gameData.screenshots)
      console.log('- Screenshots count:', gameData.screenshots?.length || 0)
      
      if (gameData.screenshots && gameData.screenshots.length > 0) {
        console.log('- First screenshot:', gameData.screenshots[0])
      }
    }

    // 2. Test de l'endpoint screenshots
    console.log('\n📸 === TEST 2: ENDPOINT SCREENSHOTS ===')
    const screenshotsResponse = await fetch(`https://api.rawg.io/api/games/${gameId}/screenshots?key=${RAWG_API_KEY}`)
    console.log('Status:', screenshotsResponse.status)
    
    if (screenshotsResponse.ok) {
      const screenshotsData = await screenshotsResponse.json()
      console.log('✅ Screenshots data:')
      console.log('- Results count:', screenshotsData.results?.length || 0)
      console.log('- Structure:', screenshotsData)
      
      if (screenshotsData.results && screenshotsData.results.length > 0) {
        console.log('- First screenshot URL:', screenshotsData.results[0].image)
        console.log('- Image dimensions:', {
          width: screenshotsData.results[0].width,
          height: screenshotsData.results[0].height
        })
      }
    } else {
      const errorText = await screenshotsResponse.text()
      console.log('❌ Screenshots error:', errorText)
    }

    // 3. Test de l'endpoint movies (trailers/vidéos)
    console.log('\n🎬 === TEST 3: ENDPOINT MOVIES ===')
    const moviesResponse = await fetch(`https://api.rawg.io/api/games/${gameId}/movies?key=${RAWG_API_KEY}`)
    console.log('Status:', moviesResponse.status)
    
    if (moviesResponse.ok) {
      const moviesData = await moviesResponse.json()
      console.log('✅ Movies data:')
      console.log('- Results count:', moviesData.results?.length || 0)
      console.log('- Structure:', moviesData)
    }

    // 4. Test de l'endpoint additions (DLCs, etc.)
    console.log('\n🎯 === TEST 4: ENDPOINT ADDITIONS ===')
    const additionsResponse = await fetch(`https://api.rawg.io/api/games/${gameId}/additions?key=${RAWG_API_KEY}`)
    console.log('Status:', additionsResponse.status)
    
    if (additionsResponse.ok) {
      const additionsData = await additionsResponse.json()
      console.log('- Additions count:', additionsData.results?.length || 0)
    }

    // 5. Test avec un autre jeu (Cyberpunk 2077)
    console.log('\n🤖 === TEST 5: AUTRE JEU (CYBERPUNK 2077) ===')
    const cyberpunkId = '41494'
    const cyberpunkScreenshots = await fetch(`https://api.rawg.io/api/games/${cyberpunkId}/screenshots?key=${RAWG_API_KEY}`)
    
    if (cyberpunkScreenshots.ok) {
      const cyberpunkData = await cyberpunkScreenshots.json()
      console.log('✅ Cyberpunk screenshots count:', cyberpunkData.results?.length || 0)
      if (cyberpunkData.results?.[0]) {
        console.log('- First image:', cyberpunkData.results[0].image)
      }
    }

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error)
  }
  
  console.log('\n🔍 === FIN DE L\'AUDIT ===')
}

// Test direct des endpoints avec différents jeux populaires
export async function testPopularGamesImages() {
  const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || ''
  
  const popularGames = [
    { id: '3328', name: 'The Witcher 3' },
    { id: '28', name: 'Red Dead Redemption 2' },
    { id: '4200', name: 'Portal 2' },
    { id: '5286', name: 'Tomb Raider' },
    { id: '13536', name: 'Portal' }
  ]

  console.log('\n🎮 === TEST JEUX POPULAIRES ===')
  
  for (const game of popularGames) {
    console.log(`\n--- ${game.name} (ID: ${game.id}) ---`)
    
    try {
      const response = await fetch(`https://api.rawg.io/api/games/${game.id}/screenshots?key=${RAWG_API_KEY}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ${data.results?.length || 0} screenshots trouvés`)
        
        if (data.results?.[0]) {
          const firstImage = data.results[0]
          console.log(`📸 Première image: ${firstImage.image}`)
          console.log(`📐 Dimensions: ${firstImage.width}x${firstImage.height}`)
        }
      } else {
        console.log(`❌ Erreur ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Erreur: ${error}`)
    }
  }
}
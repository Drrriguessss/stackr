// Test script pour Assassin's Creed search
const testAssassinsCreed = async () => {
  // Simulation de l'API RAWG pour voir ce qui pourrait arriver
  const apiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY || '8f2b7f31fcae25fa1b71d9f62b2c8d69' // fallback key
  
  console.log('🎮 Testing Assassin\'s Creed search...')
  
  // Test différents termes de recherche
  const searchTerms = [
    'assassin\'s creed shadows',
    'assassins creed shadows',
    'assassin creed shadows',
    'shadows assassin',
    'assassin\'s creed',
    'assassins creed'
  ]
  
  for (const term of searchTerms) {
    console.log(`\n🔍 Testing: "${term}"`)
    try {
      const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(term)}&page_size=5`
      console.log('URL:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        console.log(`✅ Found ${data.results.length} results:`)
        data.results.forEach((game, i) => {
          const year = game.released ? new Date(game.released).getFullYear() : 'No date'
          console.log(`  ${i+1}. ${game.name} (${year})`)
        })
      } else {
        console.log(`❌ No results for "${term}"`)
      }
      
      // Check if any 2025 games
      const games2025 = data.results ? data.results.filter(g => {
        const year = g.released ? new Date(g.released).getFullYear() : 0
        return year === 2025
      }) : []
      
      if (games2025.length > 0) {
        console.log(`🆕 2025 games found: ${games2025.length}`)
      }
      
    } catch (error) {
      console.error(`❌ Error testing "${term}":`, error.message)
    }
    
    // Pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

testAssassinsCreed().catch(console.error)
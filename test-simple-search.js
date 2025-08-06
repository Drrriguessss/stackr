// Test script pour vérifier si l'API RAWG fonctionne
const testSimpleSearch = async () => {
  const apiKey = '8f2b7f31fcae25fa1b71d9f62b2c8d69'
  
  console.log('🎮 Testing simple searches...')
  
  // Test avec des jeux connus
  const searchTerms = ['mario', 'zelda', 'cyberpunk', 'minecraft']
  
  for (const term of searchTerms) {
    console.log(`\n🔍 Testing: "${term}"`)
    try {
      const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(term)}&page_size=3`
      
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`HTTP Error: ${response.status} - ${response.statusText}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.error(`API Error:`, data.error)
        continue
      }
      
      if (data.results && data.results.length > 0) {
        console.log(`✅ Found ${data.results.length} results:`)
        data.results.forEach((game, i) => {
          const year = game.released ? new Date(game.released).getFullYear() : 'No date'
          console.log(`  ${i+1}. ${game.name} (${year})`)
        })
      } else {
        console.log(`❌ No results for "${term}"`)
      }
      
    } catch (error) {
      console.error(`❌ Network error for "${term}":`, error.message)
    }
    
    // Pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 300))
  }
}

testSimpleSearch().catch(console.error)
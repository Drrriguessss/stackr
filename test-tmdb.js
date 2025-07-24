// Test simple pour vérifier la clé API TMDB
const TMDB_API_KEY = "d627b5234a242947d749a34f0290abe3"
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

async function testTMDBAPI() {
  console.log('🎬 Testing TMDB API...')
  console.log('API Key:', TMDB_API_KEY)
  
  try {
    // Test 1: Trending movies
    const trendingUrl = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=en-US`
    console.log('\n📡 Testing trending movies endpoint:')
    console.log('URL:', trendingUrl)
    
    const trendingResponse = await fetch(trendingUrl)
    console.log('Status:', trendingResponse.status)
    
    if (trendingResponse.ok) {
      const trendingData = await trendingResponse.json()
      console.log('✅ Trending movies SUCCESS!')
      console.log('Results count:', trendingData.results?.length || 0)
      if (trendingData.results?.length > 0) {
        console.log('First movie:', trendingData.results[0].title)
        console.log('Release date:', trendingData.results[0].release_date)
      }
    } else {
      const errorData = await trendingResponse.text()
      console.log('❌ Trending movies FAILED!')
      console.log('Error:', errorData)
    }

    // Test 2: Popular movies
    const popularUrl = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    console.log('\n📡 Testing popular movies endpoint:')
    console.log('URL:', popularUrl)
    
    const popularResponse = await fetch(popularUrl)
    console.log('Status:', popularResponse.status)
    
    if (popularResponse.ok) {
      const popularData = await popularResponse.json()
      console.log('✅ Popular movies SUCCESS!')
      console.log('Results count:', popularData.results?.length || 0)
      if (popularData.results?.length > 0) {
        console.log('First movie:', popularData.results[0].title)
        console.log('Vote average:', popularData.results[0].vote_average)
      }
    } else {
      const errorData = await popularResponse.text()
      console.log('❌ Popular movies FAILED!')
      console.log('Error:', errorData)
    }

    // Test 3: API Account info (to verify key validity)
    const accountUrl = `${TMDB_BASE_URL}/account?api_key=${TMDB_API_KEY}`
    console.log('\n📡 Testing account endpoint (key validation):')
    
    const accountResponse = await fetch(accountUrl)
    console.log('Status:', accountResponse.status)
    
    if (accountResponse.ok) {
      console.log('✅ API Key is VALID!')
    } else {
      const errorData = await accountResponse.text()
      console.log('❌ API Key validation FAILED!')
      console.log('Error:', errorData)
    }

  } catch (error) {
    console.log('💥 Test failed with exception:', error.message)
  }
}

// Run the test
testTMDBAPI()
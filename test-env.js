// Test pour vérifier les variables d'environnement Next.js
console.log('🔧 Testing Next.js environment variables...')
console.log('NODE_ENV:', process.env.NODE_ENV)

// Simuler l'environnement Next.js
const envLocal = require('fs').readFileSync('.env.local', 'utf8')
console.log('\n📄 .env.local content:')
console.log(envLocal)

// Parser les variables
const envVars = {}
envLocal.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=')
    envVars[key] = value.replace(/"/g, '')
  }
})

console.log('\n🔑 Parsed environment variables:')
console.log('NEXT_PUBLIC_TMDB_API_KEY:', envVars.NEXT_PUBLIC_TMDB_API_KEY)
console.log('NEXT_PUBLIC_RAWG_API_KEY:', envVars.NEXT_PUBLIC_RAWG_API_KEY)

// Test avec la variable d'environnement
const TMDB_API_KEY = envVars.NEXT_PUBLIC_TMDB_API_KEY
console.log('\n🎬 Testing with environment variable...')
console.log('API Key from env:', TMDB_API_KEY)

if (TMDB_API_KEY) {
  console.log('✅ TMDB API key is configured!')
} else {
  console.log('❌ TMDB API key is NOT configured!')
}
'use client'

export default function DebugEnv() {
  const envVars = {
    NEXT_PUBLIC_TMDB_API_KEY: process.env.NEXT_PUBLIC_TMDB_API_KEY,
    NEXT_PUBLIC_RAWG_API_KEY: process.env.NEXT_PUBLIC_RAWG_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_YOUTUBE_API_KEY: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">🔍 Environment Debug</h1>
      
      <div className="space-y-4">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="bg-gray-800 p-4 rounded">
            <div className="font-mono text-sm">
              <span className="text-blue-400">{key}:</span>
              <span className="ml-2 text-green-400">{value || 'NOT SET'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-sm text-gray-400">
        Current URL: {typeof window !== 'undefined' ? window.location.href : 'Server'}
      </div>
    </div>
  )
}
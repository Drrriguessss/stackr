import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  const invidiousInstances = [
    'https://invidious.privacydev.net',
    'https://iv.ggtyler.dev', 
    'https://invidious.lunar.icu'
  ]

  for (const instance of invidiousInstances) {
    try {
      const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (error) {
      console.log(`YouTube search instance ${instance} failed:`, error.message)
      continue
    }
  }
  
  return NextResponse.json({ error: 'All instances failed' }, { status: 503 })
}
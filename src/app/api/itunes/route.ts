// API route pour contourner les problèmes CORS avec iTunes
import { NextRequest, NextResponse } from 'next/server'

const ITUNES_BASE_URL = 'https://itunes.apple.com'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint') || 'search'
    
    // Construire l'URL iTunes avec tous les paramètres de requête
    const itunesParams = new URLSearchParams()
    
    // Copier tous les paramètres sauf 'endpoint'
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'endpoint') {
        itunesParams.append(key, value)
      }
    }
    
    const itunesUrl = `${ITUNES_BASE_URL}/${endpoint}?${itunesParams.toString()}`
    
    console.log('🎵 [iTunes API] Proxying request to:', itunesUrl)
    
    // Faire la requête vers iTunes
    const response = await fetch(itunesUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Stackr-Music-App/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 secondes timeout
    })
    
    if (!response.ok) {
      console.error('🎵 [iTunes API] Error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `iTunes API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    console.log('🎵 [iTunes API] Success:', data.results?.length || 0, 'results')
    
    // Retourner les données avec les headers CORS corrects
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=300', // Cache pendant 5 minutes
      },
    })
    
  } catch (error) {
    console.error('🎵 [iTunes API] Proxy error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch from iTunes API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Support pour les requêtes OPTIONS (preflight CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
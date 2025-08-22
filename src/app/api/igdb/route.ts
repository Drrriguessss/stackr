import { NextRequest, NextResponse } from 'next/server'

const IGDB_BASE_URL = 'https://api.igdb.com/v4'
const IGDB_CLIENT_ID = process.env.NEXT_PUBLIC_IGDB_CLIENT_ID || ''
const IGDB_ACCESS_TOKEN = process.env.NEXT_PUBLIC_IGDB_ACCESS_TOKEN || ''

export async function POST(request: NextRequest) {
  try {
    const { endpoint, body } = await request.json()
    
    if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'IGDB credentials not configured' },
        { status: 500 }
      )
    }

    console.log(`🎮 [IGDB API Route] Proxying request to: ${endpoint}`)
    console.log(`🎮 [IGDB API Route] Request body:`, body)

    const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain', // IGDB uses text/plain for the body
      },
      body: body // Send the IGDB query as plain text
    })

    if (!response.ok) {
      console.error(`🎮 [IGDB API Route] Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`🎮 [IGDB API Route] Error details:`, errorText)
      
      return NextResponse.json(
        { error: `IGDB API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`🎮 [IGDB API Route] Success! Returning ${data.length || 0} results`)
    
    return NextResponse.json(data)

  } catch (error) {
    console.error('🎮 [IGDB API Route] Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
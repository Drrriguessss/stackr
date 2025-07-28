import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    
    if (!term) {
      return NextResponse.json({ error: 'Missing term parameter' }, { status: 400 })
    }
    
    console.log(`🎮 [Steam Search Proxy] Searching for: ${term}`)
    
    // Construct Steam search URL
    const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=US`
    
    // Fetch from Steam with proper headers
    const steamResponse = await fetch(steamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    
    if (!steamResponse.ok) {
      console.log(`🎮 [Steam Search Proxy] Steam API error: ${steamResponse.status}`)
      return NextResponse.json(
        { error: `Steam API error: ${steamResponse.status}` }, 
        { status: steamResponse.status }
      )
    }
    
    const data = await steamResponse.json()
    
    console.log(`🎮 [Steam Search Proxy] Found ${data.items?.length || 0} search results`)
    
    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
    
  } catch (error) {
    console.error('🎮 [Steam Search Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to search Steam' }, 
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
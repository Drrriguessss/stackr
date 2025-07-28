import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('appId')
    const filter = searchParams.get('filter') || 'recent'
    const numPerPage = searchParams.get('numPerPage') || '20'
    
    if (!appId) {
      return NextResponse.json({ error: 'Missing appId parameter' }, { status: 400 })
    }
    
    console.log(`🎮 [Steam API Proxy] Fetching reviews for appId: ${appId}, filter: ${filter}`)
    
    // Construct Steam API URL
    const steamUrl = `https://store.steampowered.com/appreviews/${appId}?json=1&num_per_page=${numPerPage}&filter=${filter}&language=english&purchase_type=all`
    
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
      console.log(`🎮 [Steam API Proxy] Steam API error: ${steamResponse.status}`)
      return NextResponse.json(
        { error: `Steam API error: ${steamResponse.status}` }, 
        { status: steamResponse.status }
      )
    }
    
    const data = await steamResponse.json()
    
    console.log(`🎮 [Steam API Proxy] Successfully fetched ${data.reviews?.length || 0} reviews`)
    
    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
    
  } catch (error) {
    console.error('🎮 [Steam API Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Steam reviews' }, 
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
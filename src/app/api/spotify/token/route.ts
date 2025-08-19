// API Route to exchange authorization code for access token
import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID'
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'YOUR_SPOTIFY_CLIENT_SECRET'

export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json()

    if (!code || !redirect_uri) {
      return NextResponse.json(
        { error: 'Missing code or redirect_uri' },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Spotify token exchange error:', error)
      return NextResponse.json(
        { error: 'Failed to exchange token' },
        { status: response.status }
      )
    }

    const tokens = await response.json()
    
    return NextResponse.json(tokens)
  } catch (error) {
    console.error('Error in Spotify token exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
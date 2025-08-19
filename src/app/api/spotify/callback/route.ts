// API Route to handle Spotify OAuth callback
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // If there's an error from Spotify
  if (error) {
    console.error('Spotify OAuth error:', error)
    // Redirect to app with error
    return NextResponse.redirect(new URL('/?spotify_error=' + error, request.url))
  }

  // If we have a code, redirect to the app to handle the token exchange
  if (code && state) {
    // Redirect to the app with the code and state
    const redirectUrl = new URL('/', request.url)
    redirectUrl.searchParams.set('spotify_code', code)
    redirectUrl.searchParams.set('spotify_state', state)
    
    return NextResponse.redirect(redirectUrl)
  }

  // No code or state, redirect to app with error
  return NextResponse.redirect(new URL('/?spotify_error=missing_code', request.url))
}
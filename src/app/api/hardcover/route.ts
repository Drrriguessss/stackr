import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { query, variables } = await request.json()
    
    // Appel à l'API Hardcover depuis le serveur (pas de CORS)
    const response = await fetch('https://api.hardcover.app/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    })
    
    if (!response.ok) {
      console.error('Hardcover API error:', response.status)
      return NextResponse.json(
        { error: `Hardcover API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error calling Hardcover API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from Hardcover API' },
      { status: 500 }
    )
  }
}
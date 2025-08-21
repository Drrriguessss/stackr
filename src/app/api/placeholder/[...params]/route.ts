// API placeholder endpoint for generating placeholder images
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  try {
    const [width, height] = params.params || ['200', '200']
    
    // Simple SVG placeholder generator
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
          ${width}×${height}
        </text>
      </svg>
    `
    
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    console.error('Placeholder API error:', error)
    return NextResponse.json({ error: 'Failed to generate placeholder' }, { status: 500 })
  }
}
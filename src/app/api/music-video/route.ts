// API route pour les vidéos musicales robustes
import { NextRequest, NextResponse } from 'next/server'
import { musicVideoService } from '@/services/musicVideoService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const artist = searchParams.get('artist')
    const track = searchParams.get('track')
    
    if (!artist || !track) {
      return NextResponse.json(
        { error: 'Missing artist or track parameter' },
        { status: 400 }
      )
    }
    
    console.log(`🎵 [API] Getting music video for: "${track}" by ${artist}`)
    
    const video = await musicVideoService.getMusicVideo(artist, track)
    
    if (!video) {
      console.log(`🎵 [API] No video found for: "${track}" by ${artist}`)
      return NextResponse.json({
        error: 'No video found',
        searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${track} official music video`)}`
      }, { status: 404 })
    }
    
    console.log(`🎵 [API] ✅ Video found:`, {
      provider: video.provider,
      isEmbeddable: video.isEmbeddable,
      hasVideoId: !!video.videoId
    })
    
    return NextResponse.json({
      videoId: video.videoId,
      provider: video.provider,
      url: video.url,
      embedUrl: video.embedUrl,
      title: video.title,
      isEmbeddable: video.isEmbeddable,
      fallbackReason: video.fallbackReason
    })
    
  } catch (error) {
    console.error('🎵 [API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get music video' },
      { status: 500 }
    )
  }
}
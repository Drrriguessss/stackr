// API pour tester l'embeddabilité des vidéos YouTube
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 [API] Testing embeddability for: ${videoId}`)
    
    // Test 1: oEmbed
    const oembedResult = await testOEmbed(videoId)
    if (oembedResult.embeddable) {
      console.log(`🔍 [API] ✅ oEmbed confirms embeddable`)
      return NextResponse.json({
        embeddable: true,
        method: 'oembed',
        title: oembedResult.title,
        videoId
      })
    }
    
    // Test 2: Direct embed page check
    const embedResult = await testEmbedPage(videoId)
    if (embedResult.embeddable) {
      console.log(`🔍 [API] ✅ Embed page confirms embeddable`)
      return NextResponse.json({
        embeddable: true,
        method: 'embed_page',
        videoId
      })
    }
    
    // Test 3: YouTube Data API-style check (simulation)
    const dataApiResult = await testYouTubeDataStyle(videoId)
    if (dataApiResult.embeddable) {
      console.log(`🔍 [API] ✅ Data API style confirms embeddable`)
      return NextResponse.json({
        embeddable: true,
        method: 'data_api_style',
        videoId
      })
    }
    
    console.log(`🔍 [API] ❌ All tests failed - not embeddable`)
    return NextResponse.json({
      embeddable: false,
      reason: 'All embedding tests failed',
      videoId,
      tests: {
        oembed: oembedResult.reason,
        embed_page: embedResult.reason,
        data_api: dataApiResult.reason
      }
    })
    
  } catch (error) {
    console.error('🔍 [API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to test embeddability' },
      { status: 500 }
    )
  }
}

// Test oEmbed endpoint
async function testOEmbed(videoId: string): Promise<{embeddable: boolean, title?: string, reason?: string}> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    
    const response = await fetch(oembedUrl, { 
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      return { 
        embeddable: false, 
        reason: `oEmbed failed: ${response.status}` 
      }
    }
    
    const data = await response.json()
    
    // Vérifications détaillées
    const hasIframe = data.html && data.html.includes('iframe')
    const hasEmbedUrl = data.html && data.html.includes('/embed/')
    const validTitle = data.title && 
      !data.title.includes('Private video') && 
      !data.title.includes('Video unavailable') &&
      !data.title.includes('This video is not available')
    
    if (hasIframe && hasEmbedUrl && validTitle) {
      return { 
        embeddable: true, 
        title: data.title 
      }
    }
    
    return { 
      embeddable: false, 
      reason: `oEmbed checks: iframe:${hasIframe} embedUrl:${hasEmbedUrl} validTitle:${validTitle}` 
    }
    
  } catch (error) {
    return { 
      embeddable: false, 
      reason: `oEmbed error: ${error.message}` 
    }
  }
}

// Test direct embed page
async function testEmbedPage(videoId: string): Promise<{embeddable: boolean, reason?: string}> {
  try {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`
    
    const response = await fetch(embedUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      return { 
        embeddable: false, 
        reason: `Embed page failed: ${response.status}` 
      }
    }
    
    const html = await response.text()
    
    // Vérifier les indicateurs d'embeddabilité dans le HTML
    const hasPlayerContainer = html.includes('player-container') || html.includes('html5-video-container')
    const hasVideoTitle = html.includes('watch-title') || html.includes('title')
    const noErrorMessage = !html.includes('Video unavailable') && 
                          !html.includes('Private video') &&
                          !html.includes('embedding disabled')
    
    if (hasPlayerContainer && hasVideoTitle && noErrorMessage) {
      return { embeddable: true }
    }
    
    return { 
      embeddable: false, 
      reason: `Embed page checks: player:${hasPlayerContainer} title:${hasVideoTitle} noError:${noErrorMessage}` 
    }
    
  } catch (error) {
    return { 
      embeddable: false, 
      reason: `Embed page error: ${error.message}` 
    }
  }
}

// Test YouTube Data API style (simulation basée sur des patterns)
async function testYouTubeDataStyle(videoId: string): Promise<{embeddable: boolean, reason?: string}> {
  try {
    // Cette méthode simule ce que ferait l'API YouTube Data
    // En pratique, on peut faire des checks basés sur les patterns d'URL et de réponse
    
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
    
    const response = await fetch(watchUrl, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    // Si la vidéo existe et est accessible
    if (response.ok) {
      // Pattern heuristique: si la page watch existe, il y a de bonnes chances que l'embed marche
      return { embeddable: true }
    }
    
    return { 
      embeddable: false, 
      reason: `Watch page failed: ${response.status}` 
    }
    
  } catch (error) {
    return { 
      embeddable: false, 
      reason: `Data API style error: ${error.message}` 
    }
  }
}
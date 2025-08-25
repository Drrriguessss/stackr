import { NextRequest, NextResponse } from 'next/server'
import { reviewCache } from '@/lib/reviewCache'

const TAVILY_API_KEY = process.env.NEXT_PUBLIC_TAVILY_API_KEY || ''
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const { movieTitle, year, selectedSources } = await request.json()
    
    if (!movieTitle) {
      return NextResponse.json(
        { error: 'Movie title is required' },
        { status: 400 }
      )
    }

    // Check cache first
    const cachedResult = reviewCache.get(movieTitle, year)
    if (cachedResult) {
      return NextResponse.json({
        summary: cachedResult,
        cached: true
      })
    }

    // Check if API keys are configured
    if (!TAVILY_API_KEY || !GROQ_API_KEY) {
      console.error('🔴 [API] Missing API keys - Tavily:', !!TAVILY_API_KEY, 'Groq:', !!GROQ_API_KEY)
      return NextResponse.json(
        { error: 'Review analysis service is temporarily unavailable' },
        { status: 503 }
      )
    }

    // Use selected sources or fallback to default
    const defaultSources = [
      'reddit.com',
      'metacritic.com',
      'rottentomatoes.com',
      'imdb.com',
      'letterboxd.com',
      'rogerebert.com',
      'variety.com',
      'hollywoodreporter.com',
      'theguardian.com',
      'empireonline.com'
    ]
    
    const sourcesToUse = selectedSources && selectedSources.length > 0 ? selectedSources : defaultSources
    
    // Step 1: Search for reviews with Tavily
    console.log('🔍 [API] Searching reviews for:', movieTitle, 'with sources:', sourcesToUse, '| Date:', new Date().toISOString())
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout
    
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `"${movieTitle}"${year ? ` ${year}` : ''} movie reviews metacritic rotten tomatoes imdb reddit discussion critics`,
        search_depth: 'advanced',
        max_results: 10,
        include_answer: true,
        include_raw_content: false,
        include_domains: sourcesToUse
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!tavilyResponse.ok) {
      console.error('🔍 [API] Tavily error:', tavilyResponse.status)
      return NextResponse.json(
        { error: 'Failed to search for reviews' },
        { status: 500 }
      )
    }

    const tavilyData = await tavilyResponse.json()
    const searchResults = tavilyData.results || []
    
    if (searchResults.length === 0) {
      return NextResponse.json({
        summary: null,
        error: 'No reviews found for this movie'
      })
    }

    // Step 2: Format results for Groq
    const formattedContent = searchResults.map((result: any, index: number) => 
      `Source ${index + 1} (${result.url}):\n${result.content}\n`
    ).join('\n---\n')

    // Step 3: Analyze with Groq
    console.log('🤖 [API] Analyzing with Groq')
    
    const groqController = new AbortController()
    const groqTimeoutId = setTimeout(() => groqController.abort(), 20000) // 20 second timeout
    
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a professional movie critic analyst. Provide concise, balanced analysis based on the reviews provided. Always respond in valid JSON format.'
          },
          {
            role: 'user',
            content: `You are a movie critic analyst. Analyze these reviews for the movie "${movieTitle}" and provide a structured summary.

${formattedContent}

Please provide:
1. A concise 8-10 line summary of the overall critical and audience reception
2. List of PROS (strengths) - max 5 bullet points
3. List of CONS (weaknesses) - max 5 bullet points
4. Overall sentiment (positive, mixed, or negative)

Format your response as JSON with this exact structure:
{
  "summary": "Your 8-10 line summary here",
  "pros": ["Pro 1", "Pro 2", ...],
  "cons": ["Con 1", "Con 2", ...],
  "overallSentiment": "positive/mixed/negative"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
      signal: groqController.signal
    })
    
    clearTimeout(groqTimeoutId)

    if (!groqResponse.ok) {
      console.error('🤖 [API] Groq error:', groqResponse.status)
      const errorText = await groqResponse.text()
      console.error('🤖 [API] Groq error details:', errorText)
      return NextResponse.json(
        { error: 'Failed to analyze reviews' },
        { status: 500 }
      )
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices[0]?.message?.content
    
    if (!content) {
      return NextResponse.json(
        { error: 'No analysis generated' },
        { status: 500 }
      )
    }

    try {
      const parsed = JSON.parse(content)
      
      // Extract sources
      const sourceUrls: string[] = []
      searchResults.forEach((result: any) => {
        try {
          const url = new URL(result.url)
          const domain = url.hostname.replace('www.', '')
          if (!sourceUrls.includes(domain)) {
            sourceUrls.push(domain)
          }
        } catch {}
      })

      const result = {
        summary: parsed.summary || 'No summary available',
        pros: parsed.pros || [],
        cons: parsed.cons || [],
        overallSentiment: parsed.overallSentiment || 'mixed',
        sources: sourceUrls.slice(0, 5),
        generatedAt: new Date().toISOString()
      }

      // Cache the result
      reviewCache.set(movieTitle, result, year)

      return NextResponse.json({
        summary: result
      })
    } catch (parseError) {
      console.error('🤖 [API] Parse error:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('🔴 [API] Review summary error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 408 }
        )
      }
      
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Unable to connect to external services. Please try again later.' },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
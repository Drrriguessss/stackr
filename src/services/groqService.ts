// Service pour analyser et résumer les reviews avec Groq AI

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || ''

export interface ReviewSummary {
  summary: string
  pros: string[]
  cons: string[]
  overallSentiment: 'positive' | 'mixed' | 'negative'
  sources: string[]
  generatedAt: string
}

export const groqService = {
  async analyzeReviews(movieTitle: string, reviewsContent: string): Promise<ReviewSummary | null> {
    try {
      console.log('🤖 [Groq] Analyzing reviews for:', movieTitle)
      
      const prompt = `You are a movie critic analyst. Analyze these reviews for the movie "${movieTitle}" and provide a structured summary.

${reviewsContent}

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

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768', // Fast and good for analysis
          messages: [
            {
              role: 'system',
              content: 'You are a professional movie critic analyst. Provide concise, balanced analysis based on the reviews provided. Always respond in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent output
          max_tokens: 2000,
          response_format: { type: "json_object" }
        })
      })

      if (!response.ok) {
        console.error('🤖 [Groq] API Error:', response.status)
        const errorText = await response.text()
        console.error('🤖 [Groq] Error details:', errorText)
        throw new Error(`Groq API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('🤖 [Groq] Analysis complete')
      
      // Parse the response
      const content = data.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in Groq response')
      }

      try {
        const parsed = JSON.parse(content)
        
        // Extract sources from the original content
        const sourceUrls: string[] = []
        const urlRegex = /https?:\/\/[^\s)]+/g
        const matches = reviewsContent.match(urlRegex)
        if (matches) {
          // Get unique domains
          const uniqueDomains = [...new Set(matches.map(url => {
            try {
              return new URL(url).hostname.replace('www.', '')
            } catch {
              return url
            }
          }))]
          sourceUrls.push(...uniqueDomains.slice(0, 5)) // Max 5 sources
        }

        return {
          summary: parsed.summary || 'No summary available',
          pros: parsed.pros || [],
          cons: parsed.cons || [],
          overallSentiment: parsed.overallSentiment || 'mixed',
          sources: sourceUrls,
          generatedAt: new Date().toISOString()
        }
      } catch (parseError) {
        console.error('🤖 [Groq] Parse error:', parseError)
        // Try to extract some useful info even if JSON parsing fails
        return {
          summary: content.substring(0, 500),
          pros: [],
          cons: [],
          overallSentiment: 'mixed',
          sources: [],
          generatedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('🤖 [Groq] Analysis error:', error)
      return null
    }
  },

  // Get a quick summary without full analysis
  async getQuickSummary(content: string): Promise<string> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Faster model for quick summaries
          messages: [
            {
              role: 'user',
              content: `Summarize this in 2-3 sentences: ${content.substring(0, 1000)}`
            }
          ],
          temperature: 0.5,
          max_tokens: 200
        })
      })

      const data = await response.json()
      return data.choices[0]?.message?.content || 'Summary not available'
    } catch (error) {
      console.error('🤖 [Groq] Quick summary error:', error)
      return 'Unable to generate summary'
    }
  }
}
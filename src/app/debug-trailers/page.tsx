'use client'
import { useEffect, useState } from 'react'
import { newTrailerService } from '@/services/newTrailerService'

export default function DebugTrailersPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [testing, setTesting] = useState(false)

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  useEffect(() => {
    // Override console.log to capture logs
    const originalLog = console.log
    const originalError = console.error
    
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setLogs(prev => [...prev, `LOG: ${message}`])
      originalLog(...args)
    }
    
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      setLogs(prev => [...prev, `ERROR: ${message}`])
      originalError(...args)
    }
    
    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  const testSingleGame = async (gameName: string) => {
    if (testing) return
    
    setTesting(true)
    setLogs([])
    
    addLog(`🎬 Testing trailer for: ${gameName}`)
    
    try {
      const trailer = await newTrailerService.getGameTrailer('test-id', gameName)
      
      addLog(`✅ Trailer result:`)
      addLog(`  - Provider: ${trailer.provider}`)
      addLog(`  - Is Embeddable: ${trailer.isEmbeddable}`)
      addLog(`  - Video ID: ${trailer.videoId}`)
      addLog(`  - Title: ${trailer.title || 'No title'}`)
      addLog(`  - URL: ${trailer.url}`)
      addLog(`  - Embed URL: ${trailer.embedUrl || 'No embed URL'}`)
      addLog(`  - Fallback Reason: ${trailer.fallbackReason || 'None'}`)
      
    } catch (error) {
      addLog(`❌ Error testing ${gameName}: ${error.message}`)
      addLog(`Stack trace: ${error.stack}`)
    } finally {
      setTesting(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🐛 Debug Trailers System</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'The Witcher 3',
              'Hollow Knight', 
              'Cuphead',
              'Hades',
              'Dead Cells',
              'A Hat in Time',
              'Super Mario Bros',
              'Unknown Game XYZ'
            ].map(game => (
              <button
                key={game}
                onClick={() => testSingleGame(game)}
                disabled={testing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm transition-colors"
              >
                {testing ? '...' : game}
              </button>
            ))}
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={clearLogs}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Live Debug Logs</h2>
            <span className="text-sm text-gray-400">{logs.length} entries</span>
          </div>
          
          <div className="bg-black rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Click a game button above to start testing...</p>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.includes('ERROR:') ? 'text-red-400' :
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('🎬') ? 'text-blue-400' :
                    'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">🔍 Debugging Guide</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Known games</strong> should show "Provider: youtube" and "Is Embeddable: true"</li>
            <li>• <strong>Unknown games</strong> should attempt Invidious search then fallback to placeholder</li>
            <li>• <strong>Errors</strong> should be caught and result in placeholder trailers</li>
            <li>• <strong>All tests</strong> should complete without crashing</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'
import { fixNotificationsTable } from '@/utils/fixDatabase'

export default function FixDatabasePage() {
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleFix = async () => {
    setIsFixing(true)
    setResult('Checking database...')
    
    try {
      const result = await fixNotificationsTable()
      setResult(result.message)
      
      if (result.needsManualFix) {
        setResult(result.message + '\n\nSQL to run manually:\nALTER TABLE notifications ADD COLUMN from_user_id UUID REFERENCES auth.users(id);')
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`)
    }
    
    setIsFixing(false)
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Fix Database</h1>
        
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Issue:</h2>
          <p className="text-gray-700 mb-4">
            The notifications table is missing the from_user_id column, 
            which prevents friend requests from working.
          </p>
          
          <h2 className="text-lg font-semibold mb-2">Fix:</h2>
          <p className="text-gray-700">
            This will add the missing from_user_id column to the notifications table.
          </p>
        </div>

        <button
          onClick={handleFix}
          disabled={isFixing}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
        >
          {isFixing ? 'Fixing...' : 'Fix Database'}
        </button>

        {result && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import SimpleNotificationTest from '@/components/SimpleNotificationTest'

export default function DebugNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug Notifications</h1>
          <p className="text-gray-600">Test and debug the notification system</p>
        </div>
        
        <SimpleNotificationTest />
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
            <li>Make sure you're signed in</li>
            <li>Add at least one friend (use the "Find Friends" option in the Feed)</li>
            <li>Click "Run Full Test" to test the entire notification flow</li>
            <li>Check the log for any errors or issues</li>
            <li>If tests pass but notifications still don't work, check your browser console (F12)</li>
          </ol>
        </div>
        
        <div className="text-center">
          <a 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  )
}
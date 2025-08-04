'use client'

import { useState, useEffect } from 'react'
import { Bell, TestTube, Users, Send } from 'lucide-react'
import { notificationService } from '@/services/notificationService'
import { socialService } from '@/services/socialService'
import { AuthService } from '@/services/authService'

export default function NotificationDebug() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const user = await AuthService.getCurrentUser()
    setCurrentUser(user)
    
    if (user) {
      const notifs = await notificationService.getNotifications(user.id)
      setNotifications(notifs)
      
      const friendsList = await socialService.getFriends()
      setFriends(friendsList)
    }
  }

  const testNotificationCreation = async () => {
    if (!currentUser || friends.length === 0) {
      addTestResult('❌ Need user and friends to test')
      return
    }

    const testFriend = friends[0]
    addTestResult('🧪 Testing notification creation...')

    try {
      const result = await notificationService.createRecommendationNotification(
        testFriend.friend_id,
        'Test User',
        'Test Movie',
        'movies',
        'test123',
        'https://example.com/image.jpg',
        currentUser.id
      )
      
      if (result) {
        addTestResult('✅ Notification created successfully')
        loadData() // Refresh data
      } else {
        addTestResult('❌ Notification creation failed')
      }
    } catch (error) {
      addTestResult(`❌ Error: ${error}`)
    }
  }

  const testMediaSharing = async () => {
    if (!currentUser || friends.length === 0) {
      addTestResult('❌ Need user and friends to test')
      return
    }

    const testFriend = friends[0]
    addTestResult('🧪 Testing media sharing...')

    try {
      const result = await socialService.shareMediaWithFriend(
        testFriend.friend_id,
        {
          id: 'test456',
          type: 'movies',
          title: 'Test Movie via Sharing',
          image: 'https://example.com/test.jpg'
        },
        'Check this out!'
      )
      
      if (result) {
        addTestResult('✅ Media sharing successful')
        loadData() // Refresh data
      } else {
        addTestResult('❌ Media sharing failed')
      }
    } catch (error) {
      addTestResult(`❌ Error: ${error}`)
    }
  }

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearResults = () => {
    setTestResults([])
  }

  if (!currentUser) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please sign in to test notifications</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg space-y-6">
      <div className="flex items-center space-x-2">
        <TestTube className="text-blue-600" size={24} />
        <h2 className="text-xl font-semibold">Notification System Debug</h2>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Bell className="text-blue-600" size={20} />
            <span className="font-medium">Notifications</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{notifications.length}</p>
          <p className="text-sm text-blue-600">
            {notifications.filter(n => !n.read).length} unread
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="text-green-600" size={20} />
            <span className="font-medium">Friends</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{friends.length}</p>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Send className="text-purple-600" size={20} />
            <span className="font-medium">User ID</span>
          </div>
          <p className="text-xs text-purple-700 font-mono">{currentUser.id.slice(0, 8)}...</p>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={testNotificationCreation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Test Notification Creation
        </button>

        <button
          onClick={testMediaSharing}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Test Media Sharing
        </button>

        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Refresh Data
        </button>

        <button
          onClick={clearResults}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-3">Test Results:</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-3">Recent Notifications:</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.slice(0, 5).map((notification, index) => (
              <div key={index} className="text-sm bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Type: {notification.type} | Read: {notification.read ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
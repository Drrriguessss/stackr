'use client'

import { useState, useEffect } from 'react'
import { Bell, TestTube, Users, Send, AlertCircle } from 'lucide-react'
import { notificationService } from '@/services/notificationService'
import { socialService } from '@/services/socialService'
import { AuthService } from '@/services/authService'
import { supabase } from '@/lib/supabase'

export default function SimpleNotificationTest() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [testLog, setTestLog] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const user = await AuthService.getCurrentUser()
    setCurrentUser(user)
    log(`✅ User loaded: ${user?.email || 'Not signed in'}`)
  }

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[NotificationTest] ${message}`)
  }

  const clearLog = () => {
    setTestLog([])
  }

  const runFullTest = async () => {
    if (!currentUser) {
      log('❌ User not signed in')
      return
    }

    setIsRunning(true)
    clearLog()
    
    try {
      // Test 1: Check database connection
      log('🧪 Testing database connection...')
      const { data: dbTest } = await supabase.from('notifications').select('count').limit(1)
      log('✅ Database connection works')

      // Test 2: Check friends
      log('🧪 Checking friends...')
      const friends = await socialService.getFriends()
      log(`📊 Found ${friends.length} friends`)
      
      if (friends.length === 0) {
        log('⚠️ No friends found - you need friends to test sharing')
        setIsRunning(false)
        return
      }

      const testFriend = friends[0]
      log(`👥 Testing with friend: ${testFriend.display_name} (${testFriend.friend_id.slice(0, 8)}...)`)

      // Test 3: Create notification directly
      log('🧪 Creating test notification...')
      const notificationResult = await notificationService.createRecommendationNotification(
        testFriend.friend_id,
        'Test User',
        'Test Movie',
        'movies',
        'test123',
        'https://via.placeholder.com/150',
        currentUser.id
      )
      
      if (notificationResult) {
        log('✅ Notification created successfully')
      } else {
        log('❌ Notification creation failed')
      }

      // Test 4: Check if notification exists
      log('🧪 Checking if notification was saved...')
      const notifications = await notificationService.getNotifications(testFriend.friend_id, 5)
      log(`📊 Friend has ${notifications.length} total notifications`)
      
      const recentNotif = notifications.find(n => n.message.includes('Test Movie'))
      if (recentNotif) {
        log('✅ Test notification found in database')
        log(`📝 Notification: ${recentNotif.message}`)
      } else {
        log('❌ Test notification not found in database')
      }

      // Test 5: Test media sharing flow
      log('🧪 Testing media sharing flow...')
      const shareResult = await socialService.shareMediaWithFriend(
        testFriend.friend_id,
        {
          id: 'test456',
          type: 'movies',
          title: 'Test Movie via Sharing',
          image: 'https://via.placeholder.com/150'
        },
        'Check this out!'
      )
      
      if (shareResult) {
        log('✅ Media sharing completed')
      } else {
        log('❌ Media sharing failed')
      }

      // Test 6: Check RLS policies
      log('🧪 Testing RLS policies...')
      const { data: rlsTest, error: rlsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .limit(1)
      
      if (rlsError) {
        log(`❌ RLS policy error: ${rlsError.message}`)
      } else {
        log('✅ RLS policies working')
      }

      log('🎉 Test completed!')

    } catch (error) {
      log(`❌ Test failed: ${error}`)
      console.error('Full test error:', error)
    }
    
    setIsRunning(false)
  }

  const testDatabaseStructure = async () => {
    log('🧪 Testing database structure...')
    
    try {
      // Test basic access to notifications table
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(1)
      
      if (error) {
        log(`❌ Cannot access notifications table: ${error.message}`)
        log(`❌ Error code: ${error.code}`)
        log(`❌ Error details: ${error.details}`)
      } else {
        log('✅ Can access notifications table')
        
        // Test insertion permission
        const testData = {
          user_id: currentUser.id,
          type: 'media_shared',
          title: 'Test notification',
          message: 'This is a test',
          read: false
        }
        
        const { data: insertData, error: insertError } = await supabase
          .from('notifications')
          .insert(testData)
          .select()
        
        if (insertError) {
          log(`❌ Cannot insert into notifications table: ${insertError.message}`)
          log(`❌ Insert error code: ${insertError.code}`)
        } else {
          log('✅ Can insert into notifications table')
          
          // Clean up test notification
          if (insertData && insertData[0]) {
            await supabase
              .from('notifications')
              .delete()
              .eq('id', insertData[0].id)
            log('✅ Test notification cleaned up')
          }
        }
      }
    } catch (error) {
      log(`❌ Database structure error: ${error}`)
    }
  }

  if (!currentUser) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertCircle className="text-yellow-600" size={20} />
          <p className="text-yellow-800">Please sign in to test notifications</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg space-y-6">
      <div className="flex items-center space-x-2">
        <TestTube className="text-blue-600" size={24} />
        <h2 className="text-xl font-semibold">Simple Notification Test</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={runFullTest}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isRunning ? 'Running...' : 'Run Full Test'}
        </button>

        <button
          onClick={testDatabaseStructure}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Check Database
        </button>

        <button
          onClick={clearLog}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Clear Log
        </button>
      </div>

      {testLog.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-3">Test Log:</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto text-sm font-mono">
            {testLog.map((log, index) => (
              <div 
                key={index} 
                className={`p-2 rounded ${
                  log.includes('❌') ? 'bg-red-100 text-red-800' :
                  log.includes('✅') ? 'bg-green-100 text-green-800' :
                  log.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                  'bg-white'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'

// Configure web-push with VAPID keys only if they exist
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:stackr@example.com',
    vapidPublicKey,
    vapidPrivateKey
  )
}

export async function POST(request: NextRequest) {
  try {
    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured - VAPID keys missing' },
        { status: 503 }
      )
    }

    const { targetUserId, notification, relatedUserId, relatedMediaId } = await request.json()

    if (!targetUserId || !notification) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user wants this type of notification
    const { data: shouldSend } = await supabase.rpc('should_send_notification', {
      target_user_id: targetUserId,
      notification_type: notification.type
    })

    if (!shouldSend) {
      return NextResponse.json(
        { message: 'User has disabled this notification type' },
        { status: 200 }
      )
    }

    // Get user's active push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase.rpc(
      'get_user_push_subscriptions',
      { target_user_id: targetUserId }
    )

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
      return NextResponse.json(
        { error: 'Failed to fetch user subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'User has no active push subscriptions' },
        { status: 200 }
      )
    }

    // Prepare notification payload
    const payload = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192.png',
      badge: notification.badge || '/icons/icon-96.png',
      image: notification.image,
      data: {
        ...notification.data,
        timestamp: Date.now(),
        url: notification.data?.url || '/'
      },
      actions: notification.actions || [
        {
          action: 'view',
          title: 'Voir'
        },
        {
          action: 'dismiss',
          title: 'Fermer'
        }
      ],
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200]
    }

    // Send notifications to all user's devices
    const notificationPromises = subscriptions.map(async (subscription: any) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }

        const result = await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          {
            urgency: 'normal',
            TTL: 24 * 60 * 60, // 24 hours
          }
        )

        // Log successful notification
        await supabase.from('notification_logs').insert({
          user_id: targetUserId,
          subscription_id: subscription.subscription_id,
          notification_type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          delivery_status: 'sent',
          related_user_id: relatedUserId,
          related_media_id: relatedMediaId
        })

        return { success: true, subscription_id: subscription.subscription_id }

      } catch (error: any) {
        console.error(`Failed to send notification to subscription ${subscription.subscription_id}:`, error)

        // Log failed notification
        await supabase.from('notification_logs').insert({
          user_id: targetUserId,
          subscription_id: subscription.subscription_id,
          notification_type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          delivery_status: 'failed',
          error_message: error.message,
          related_user_id: relatedUserId,
          related_media_id: relatedMediaId
        })

        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 413) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.subscription_id)
        }

        return { success: false, subscription_id: subscription.subscription_id, error: error.message }
      }
    })

    const results = await Promise.all(notificationPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Notification sent to ${successCount} devices, ${failureCount} failed`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    })

  } catch (error) {
    console.error('Error in send-push-notification API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to validate notification data
function validateNotification(notification: any): boolean {
  return (
    notification &&
    typeof notification.title === 'string' &&
    typeof notification.body === 'string' &&
    typeof notification.type === 'string'
  )
}
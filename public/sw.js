// Service Worker for Stackr PWA
const CACHE_NAME = 'stackr-v1';
const urlsToCache = [
  '/',
  '/icon.svg',
  '/manifest.json'
];

// Dynamic cache for API responses
const API_CACHE_NAME = 'stackr-api-v1';
const API_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    cacheFirstStrategy(request)
  );
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page if available
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    throw error;
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  // Only cache GET requests for APIs too
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback to cache for API requests
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const cachedData = await cachedResponse.json();
      const cacheTime = new Date(cachedResponse.headers.get('date')).getTime();
      const now = Date.now();
      
      // Check if cache is still fresh
      if (now - cacheTime < API_CACHE_MAX_AGE) {
        return cachedResponse;
      }
    }
    throw error;
  }
}

// Background fetch and cache update
async function fetchAndCache(request, cache) {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.log('Background fetch failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  if (!event.data) {
    console.log('[SW] No data in push event');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('[SW] Push notification data:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-96.png',
      image: data.image,
      vibrate: data.vibrate || [200, 100, 200],
      data: data.data || {},
      actions: data.actions || [
        {
          action: 'view',
          title: 'Voir'
        },
        {
          action: 'dismiss',
          title: 'Fermer'
        }
      ],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      tag: data.data?.type || 'stackr-notification',
      timestamp: data.data?.timestamp || Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('[SW] Notification shown successfully');
          // Log that notification was displayed
          return fetch('/api/notification-delivered', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: Date.now(),
              type: data.data?.type,
              status: 'displayed'
            })
          }).catch(err => console.log('[SW] Failed to log notification delivery:', err));
        })
        .catch(err => {
          console.error('[SW] Failed to show notification:', err);
        })
    );
  } catch (error) {
    console.error('[SW] Error processing push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  if (action === 'dismiss') {
    // Just close the notification
    return;
  }
  
  // Default action or 'view' action
  const url = notificationData.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if Stackr is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing window and navigate to the content
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: notificationData,
              action: action,
              url: url
            });
            return;
          }
        }
        
        // Open new window if none exists
        return clients.openWindow(url);
      })
      .then(() => {
        // Log notification click
        return fetch('/api/notification-clicked', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: Date.now(),
            type: notificationData.type,
            action: action,
            url: url
          })
        }).catch(err => console.log('[SW] Failed to log notification click:', err));
      })
      .catch(err => {
        console.error('[SW] Error handling notification click:', err);
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  
  const notificationData = event.notification.data || {};
  
  // Log notification dismissal
  fetch('/api/notification-dismissed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: Date.now(),
      type: notificationData.type
    })
  }).catch(err => console.log('[SW] Failed to log notification dismissal:', err));
});
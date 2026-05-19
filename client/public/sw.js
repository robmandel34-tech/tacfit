const CACHE_NAME = 'tacfit-v5';
const urlsToCache = [
  '/manifest.json',
  '/generated-icon.png'
];

self.addEventListener('install', function(event) {
  // Take over immediately so the new SW replaces the old (broken) one.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache).catch(function() {});
      })
  );
});

self.addEventListener('fetch', function(event) {
  const req = event.request;
  const url = new URL(req.url);

  // Only ever touch GETs to our own origin.
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Never intercept anything that isn't a tiny set of truly static assets.
  // In particular: never touch HTML navigations, Vite dev modules
  // (`/src/...`, `/@vite/...`, `/@react-refresh`, `/@fs/...`, `/node_modules/...`),
  // hashed bundles, or API calls. Caching those between deploys causes two
  // copies of React to load and breaks hooks ("dispatcher.useRef is null").
  if (
    req.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/uploads/')
  ) {
    return;
  }

  // Cache-first for the small whitelist of stable static files.
  const allowed = ['/manifest.json', '/generated-icon.png'];
  if (!allowed.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(req).then(function(response) {
      return response || fetch(req);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      // Drop every old cache (including the broken tacfit-v4 dev-module cache).
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of any already-open tabs so they stop using the old SW.
      self.clients.claim(),
    ])
  );
});

// Push notification event listener
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (error) {
    console.error('Error parsing push data:', error);
    notificationData = {
      title: 'TacFit Update',
      body: event.data.text(),
      icon: '/generated-icon.png',
      badge: '/generated-icon.png'
    };
  }

  const title = notificationData.title || 'TacFit';
  const options = {
    body: notificationData.body || 'New update available',
    icon: notificationData.icon || '/generated-icon.png',
    badge: notificationData.badge || '/generated-icon.png',
    tag: notificationData.tag || 'tacfit-notification',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Handle action clicks
  if (event.action) {
    console.log('Notification action clicked:', event.action);
    
    switch (event.action) {
      case 'view':
        event.waitUntil(
          clients.openWindow(event.notification.data.url || '/')
        );
        break;
      case 'dismiss':
        // Just close, no action needed
        break;
      default:
        console.log('Unknown action:', event.action);
    }
    return;
  }
  
  // Default click behavior - open the app
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // App is open, focus it and navigate if needed
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        
        // App is not open, open it
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle offline actions when connection is restored
  return new Promise((resolve) => {
    console.log('Background sync triggered');
    resolve();
  });
}
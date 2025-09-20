const CACHE_NAME = 'radio-adamowo-v3';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './script/audioPlayer.js',
  './script/chatSimulator.js',  // Ensure consistent forward slashes
  './script/pwa.js',
  './playlist.json',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js',
  'https://fonts.googleapis.com/css2?family=Special+Elite&display=swap'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Fetch event - network with offline fallbacks
self.addEventListener('fetch', (event) => {
  // Offline SPA-style fallback for navigations
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for known assets, else network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'https://public-frontend-cos.metadl.com/mgx/img/favicon.png',
      badge: 'https://public-frontend-cos.metadl.com/mgx/img/favicon.png',
      vibrate: [100, 50, 100],
      data: { dateOfArrival: Date.now(), primaryKey: 1 }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
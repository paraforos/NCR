const CACHE_NAME = 'aspis-ncr-v2.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/aspis_logo.png',
  '/Roboto-Regular.ttf'
];

// Εγκατάσταση Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ενεργοποίηση και καθαρισμός παλαιών caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Στρατηγική: Stale-While-Revalidate για ταχύτερη απόκριση
self.addEventListener('fetch', (event) => {
  // Παράκαμψη για Chrome extensions και μη GET αιτήματα
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Αποθήκευση στη cache μόνο αν η απόκριση είναι έγκυρη
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Αν αποτύχει το δίκτυο, επιστρέφουμε τη cache
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
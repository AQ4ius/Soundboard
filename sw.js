// AQSound Board Service Worker (Offline Audio PWA)
const CACHE_NAME = 'aqsound-offline-v1';
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './sounds-data.js',
    './sounds.json',
    './AQSoundboard_Logo.png',
    './favicon.png',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Precaching core soundboard assets...');
            for (const asset of PRECACHE_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn('[SW] Precache non-critical skip:', asset, err);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Clearing outdated cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only cache GET requests and same-origin / local audio assets
    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // Skip cross-origin external analytics / APIs that cannot be served offline
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            // If asset is found in cache, return cached version
            if (cachedResponse) {
                // Fetch fresh in background for non-audio static assets (stale-while-revalidate)
                if (!url.pathname.match(/\.(mp3|wav|ogg|aac|m4a|flac)$/i)) {
                    fetch(request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                        }
                    }).catch(() => { /* Offline fallback is already returned */ });
                }
                return cachedResponse;
            }

            // Otherwise fetch from network and dynamically cache
            return fetch(request).then((networkResponse) => {
                // Only cache full 200 responses
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            }).catch((err) => {
                // Offline fallback for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                throw err;
            });
        })
    );
});

// AQSound Board Service Worker (Offline Audio PWA v2)
const CACHE_NAME = 'aqsound-offline-v2';
const APP_SHELL = [
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
            console.log('[SW] Precaching app shell...');
            for (const asset of APP_SHELL) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn('[SW] Precache skip:', asset, err);
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
                        console.log('[SW] Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Helper: Handle HTTP 206 Partial Content for cached audio
async function returnRangeResponse(request, fullResponse) {
    const rangeHeader = request.headers.get('range');
    if (!rangeHeader) {
        return fullResponse;
    }

    try {
        const arrayBuffer = await fullResponse.clone().arrayBuffer();
        const total = arrayBuffer.byteLength;
        const matches = rangeHeader.match(/bytes=(\d+)-(\d+)?/);

        if (!matches) {
            return fullResponse;
        }

        const start = parseInt(matches[1], 10);
        const end = matches[2] ? parseInt(matches[2], 10) : total - 1;

        if (start >= total || end >= total) {
            return new Response(null, {
                status: 416,
                statusText: 'Range Not Satisfiable',
                headers: {
                    'Content-Range': `bytes */${total}`
                }
            });
        }

        const slicedBuffer = arrayBuffer.slice(start, end + 1);
        const contentType = fullResponse.headers.get('content-type') || 'audio/mpeg';

        return new Response(slicedBuffer, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
                'Content-Type': contentType,
                'Content-Range': `bytes ${start}-${end}/${total}`,
                'Content-Length': String(slicedBuffer.byteLength),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (e) {
        console.warn('[SW] Range slicing failed, returning full response:', e);
        return fullResponse;
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;
    if (url.origin !== self.location.origin) return;

    const isAudio = url.pathname.match(/\.(mp3|wav|ogg|aac|m4a|flac)$/i);

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);

        // Match against URL href, pathname, or request
        const cachedResponse = await cache.match(url.href) || 
                               await cache.match(url.pathname) || 
                               await cache.match(request);

        if (cachedResponse) {
            if (isAudio) {
                return returnRangeResponse(request, cachedResponse);
            }
            // For non-audio static assets, refresh cache in background if online
            fetch(request).then((networkRes) => {
                if (networkRes && networkRes.status === 200) {
                    cache.put(request, networkRes);
                }
            }).catch(() => {});
            return cachedResponse;
        }

        // Not yet in cache: fetch from network
        try {
            if (isAudio) {
                // Request full audio stream without Range header so we can store the complete 200 response
                const cleanHeaders = new Headers(request.headers);
                cleanHeaders.delete('range');
                const fullRequest = new Request(url.href, {
                    method: 'GET',
                    headers: cleanHeaders,
                    credentials: request.credentials
                });

                const networkResponse = await fetch(fullRequest);
                if (networkResponse && networkResponse.status === 200) {
                    await cache.put(url.href, networkResponse.clone());
                    // Also key by relative pathname
                    try { await cache.put(url.pathname.replace(/^\//, ''), networkResponse.clone()); } catch (e) {}
                    return returnRangeResponse(request, networkResponse);
                }
                return networkResponse;
            }

            const networkResponse = await fetch(request);
            if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        } catch (fetchErr) {
            // Offline fallback
            if (request.mode === 'navigate') {
                const fallback = await cache.match('./index.html');
                if (fallback) return fallback;
            }
            throw fetchErr;
        }
    })());
});

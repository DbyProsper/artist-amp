const CACHE_VERSION = 'musicinsta-light-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const IMAGE_LIMIT = 80;

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('musicinsta-') && !name.startsWith(CACHE_VERSION)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(key => cache.delete(key)));
}

async function cacheFirst(request, cacheName, limit) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (limit) void trim(cacheName, limit);
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Audio and video are intentionally excluded: caching large media files can
  // fill the device and download content the listener never chose to play.
  if (request.destination === 'audio' || request.destination === 'video') return;

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, IMAGE_LIMIT).catch(() => fetch(request)));
    return;
  }

  if (url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || request.destination === 'font' || request.destination === 'style' || request.destination === 'script')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE).catch(() => fetch(request)));
  }
});

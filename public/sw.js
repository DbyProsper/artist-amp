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

// FCM delivers standards-based Web Push events to this same worker. Keeping
// push and caching in one worker avoids competing registrations for `/`.
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { notification: { body: event.data.text() } }; }
  const data = payload.data || {};
  const notification = payload.notification || payload.webpush?.notification || {};
  const title = notification.title || `MusicInsta ${data.callType || ''} call`.trim();
  const options = {
    body: notification.body || `${data.callerName || 'A MusicInsta user'} is calling`,
    icon: notification.icon || '/MusicInsta_Logo.png',
    badge: notification.badge || '/favicon.ico',
    image: notification.image,
    tag: notification.tag || (data.callId ? `musicinsta-call-${data.callId}` : 'musicinsta-notification'),
    requireInteraction: notification.requireInteraction ?? data.type === 'incoming_call',
    renotify: true,
    data: { ...data, ...(notification.data || {}), url: data.url || notification.data?.url || '/messages' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/messages', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});

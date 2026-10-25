/* مُنجز service worker: precache the whole app so it opens with no connection.
   Bump VERSION whenever any file below changes — the app then offers "تحديث". */
const VERSION = 'munjiz-1.3.0';
const FILES = [
  './', 'index.html', 'i18n.js', 'core.js', 'app.js', 'manifest.webmanifest',
  'fonts/naskh-ar.woff2', 'fonts/naskh-la.woff2',
  'fonts/ruqaa-700-ar.woff2', 'fonts/ruqaa-700-la.woff2', 'fonts/kalam-700.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // app pages (any query, e.g. ?new=1) → the cached shell
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});

// tapping a reminder opens (or focuses) the app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all[0]) return all[0].focus();
    return self.clients.openWindow('./');
  })());
});

// Offline support: cache the app shell, serve from cache first, refresh in the background.
const CACHE = 'rotation-lab-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './js/app.js', './js/data.js', './js/sprites.js', './js/expr.js', './js/build.js',
  './fonts/pixelify-sans-latin-400-normal.woff2', './fonts/pixelify-sans-latin-600-normal.woff2',
  './fonts/vt323-latin-400-normal.woff2', './fonts/press-start-2p-latin-400-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r && r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});

// Offline support. Online: always fetch the latest file first (so updates show on the next visit) and keep a copy.
// Offline (or if the network fails): serve the saved copy. Only same-origin GET requests are handled or cached.
const CACHE = 'physics-lens-v21';
const FILES = ['./', './index.html', './manifest.webmanifest', './js/app.js', './js/data.js', './js/expr.js', './js/build.js', './js/recognize.js', './js/field.js', './js/torque.js', './js/setup.js', './js/tools.js', './js/connect.js', './js/knowns.js', './js/toolkit.js', './js/algebra.js', './js/systems.js', './js/packs/index.js', './js/packs/mech.js',
  './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(r => { if (r && r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
  );
});

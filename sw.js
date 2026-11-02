/* Çevrimdışı oynamak için basit service worker: önce ağ, olmazsa önbellek. */
const CACHE = 'tac-ve-hancer-v2';
const FILES = ['./', './index.html', './css/style.css', './js/data.js', './js/geo.js', './js/engine.js', './js/world.js', './js/actions.js', './js/events.js', './js/map.js', './js/battle.js', './js/ui.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});

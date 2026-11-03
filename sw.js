/* Crown & Dagger — service worker.
   İnternet varken her dosyayı sunucudan taze çeker (oyun her açılışta kendiliğinden güncellenir);
   internet yoksa son indirilen sürümle çevrimdışı çalışır. */
const CACHE = 'crown-dagger-v7';
const FILES = ['./', './index.html', './css/style.css', './js/i18n.js', './js/icons.js', './js/data.js', './js/prefs.js', './js/geo.js', './js/engine.js', './js/world.js', './js/provinces.js', './js/actions.js', './js/realm.js', './js/events.js', './js/dialogue.js', './js/audience.js', './js/map.js', './js/battle.js', './js/portrait.js', './js/ui.js', './js/ui2.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

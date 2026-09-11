const CACHE_NAME = 'doc-mtop-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// App shell: siempre sirve del cache primero, así abre sin internet.
// Los envíos a la API (fetch a Apps Script) NO se cachean, viajan directo a la red.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // deja pasar llamadas a Apps Script

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

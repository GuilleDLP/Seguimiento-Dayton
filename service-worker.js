const CACHE_NAME = 'seguimiento-dayton-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png',
  './auth.js',
  './github-config.js',
  './github-sync.js',
  './admin-panel.js',
  'https://unpkg.com/xlsx/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js'
];

// Instala el service worker y guarda en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activa el nuevo service worker y limpia viejas cachés
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});

// Intercepta las solicitudes y responde desde caché si está disponible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});

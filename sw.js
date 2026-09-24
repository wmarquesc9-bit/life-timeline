const CACHE_NAME = 'timeline-cache-v3';
const urlsToCache = [
  './index.html',
  './style.css?v=18',
  './app.js',
  './data.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

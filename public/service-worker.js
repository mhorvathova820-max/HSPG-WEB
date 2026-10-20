'use strict';

const CACHE_NAME = 'holub-public-shell-v1';
const PUBLIC_ASSETS = [
  '/',
  '/css/holub30-style.css',
  '/css/admin-cockpit.css',
  '/manifest.webmanifest',
  '/icons/cockpit.svg',
  '/dist/holub30-visualizer.bundle.js',
  '/dist/hbot-core.bundle.js',
  '/dist/admin-core.bundle.js',
  '/dist/admin-core.bundle.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname === '/admin-cockpit.html') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  if (!PUBLIC_ASSETS.includes(requestUrl.pathname)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});

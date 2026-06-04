const SW_VERSION = 'v1.1.0';
const SHELL_CACHE = `shell-${SW_VERSION}`;
const STATIC_CACHE = `static-${SW_VERSION}`;
const SAFE_API_CACHE = `safe-api-${SW_VERSION}`;

const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/offline.html', '/icons/pwa-icon.svg', '/icons/pwa-maskable.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, STATIC_CACHE, SAFE_API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const networkFirst = async (request, fallbackCache, fallbackUrl) => {
  try {
    const response = await fetch(request);
    const cache = await caches.open(fallbackCache);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    throw new Error('Network and cache failed');
  }
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response?.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || networkPromise;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/offline.html'));
    return;
  }

  if (sameOrigin && ['style', 'script', 'font', 'image'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const livePath = /\/(stage|live|event|notification|auth|login)/i.test(url.pathname);

    if (livePath) {
      event.respondWith(networkFirst(request, SAFE_API_CACHE));
      return;
    }

    event.respondWith(staleWhileRevalidate(request, SAFE_API_CACHE));
  }
});

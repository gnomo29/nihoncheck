/**
 * NihonCheck — service worker (app shell).
 * Cambia CACHE_NAME al actualizar recursos precacheados.
 */
const CACHE_NAME = 'nihoncheck-v2';

const SHELL_ASSETS = [
  './',
  './index.html',
  './diagnostico.html',
  './styles.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/romajiConverter.js',
  './js/preguntas.js',
  './js/lecciones.js',
  './js/temas.js',
  './js/rutaPersonalizada.js',
  './js/motorAdaptativo.js',
  './js/resultados.js',
  './js/nihoncheck.js',
  './js/srs.js',
  './js/vistaRepaso.js',
  './js/estadisticas.js',
  './js/interfazTest.js',
  './js/kanjiStrokeViewer.js',
  './js/lookupClient.js',
  './js/firebaseAuth.js',
  './js/firestorePerfilAdapter.js',
  './js/app.js',
  './js/diagnostico.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isShellAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path.endsWith('.html') || path === '/' || path.endsWith('/')) return true;
  if (path.endsWith('.css')) return true;
  if (path.endsWith('.js') && path.includes('/js/')) return true;
  if (path.endsWith('.png') && path.includes('/icons/')) return true;
  if (path.endsWith('/manifest.json')) return true;
  return false;
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isShellAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

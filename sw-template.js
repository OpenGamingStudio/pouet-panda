// Service worker de Pouet Panda, généré au build par vite.config.ts (la version est l'empreinte du build).
// Pas de précache : on met en cache à la volée les requêtes de la page (script, style, police, image, navigation).
const CACHE = 'pouet-panda-@@VERSION@@';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Purge des caches des versions précédentes.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pouet-panda-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache d'abord ; sinon réseau, et on garde la réponse. Hors ligne, une navigation retombe sur la page d'entrée.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const nav = req.mode === 'navigate';
      const hit = await cache.match(req, { ignoreSearch: nav });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok && res.type === 'basic') await cache.put(nav ? new URL(req.url).pathname : req, res.clone());
        return res;
      } catch (e) {
        return (nav && (await cache.match(new URL(req.url).pathname))) || Response.error();
      }
    }),
  );
});

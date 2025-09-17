const CACHE = "elvora-v1";
const ASSETS = ["/", "/styles.css", "/app.js", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);
      try {
        const fresh = await fetch(e.request);
        if (fresh && fresh.ok) {
          const c = await caches.open(CACHE);
          c.put(e.request, fresh.clone());
        }
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});

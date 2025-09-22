const VERSION = "elvora-v1";
const PRECACHE = [
  "/",                 // root
  "/index.html",
  "/styles.css",
  "/offline.html",
  "/hubs/inventory/index.html",
  "/pwa/manifest.json"
];

// Instalacija: precache osnovnih resursa
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Aktivacija: očisti stare cacheve
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== VERSION ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

// Strategije:
// 1) HTML → Network-first, pa cache, pa offline fallback
// 2) CSS/JS → Cache-first (brzo i offline)
// 3) Ostalo → Try network, fallback cache
self.addEventListener("fetch", (e) => {
  const rq = e.request;
  const url = new URL(rq.url);

  if (rq.mode === "navigate" || rq.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(rq).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(rq, copy));
        return res;
      }).catch(async () => {
        const cached = await caches.match(rq);
        return cached || caches.match("/offline.html");
      })
    );
    return;
  }

  if (rq.destination === "style" || rq.destination === "script") {
    e.respondWith(
      caches.match(rq).then(cached => {
        if (cached) return cached;
        return fetch(rq).then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(rq, copy));
          return res;
        });
      })
    );
    return;
  }

  // default: network first, fallback cache
  e.respondWith(
    fetch(rq).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(rq, copy));
      return res;
    }).catch(() => caches.match(rq))
  );
});

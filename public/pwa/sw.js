const VERSION = "elvora-v3";
const PRECACHE = [
  "/", "/index.html", "/styles.css",
  "/hubs/inventory/index.html",
  "/legal/index.html", "/consent/index.html",
  "/offline.html", "/pwa/manifest.json"
];

// skipWaiting poruka iz stranice (za update banner)
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// Instalacija: precache osnovnih resursa
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)));
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

// HTML = network-first; CSS/JS = cache-first; ostalo = network-first + cache fallback
self.addEventListener("fetch", (e) => {
  const rq = e.request;
  const accept = rq.headers.get("accept") || "";

  // HTML
  if (rq.mode === "navigate" || accept.includes("text/html")) {
    e.respondWith(
      fetch(rq).then(res => {
        caches.open(VERSION).then(c => c.put(rq, res.clone()));
        return res;
      }).catch(async () => {
        const cached = await caches.match(rq);
        return cached || caches.match("/offline.html");
      })
    );
    return;
  }

  // CSS/JS
  if (rq.destination === "style" || rq.destination === "script") {
    e.respondWith(
      caches.match(rq).then(cached => {
        if (cached) return cached;
        return fetch(rq).then(res => {
          caches.open(VERSION).then(c => c.put(rq, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // Ostalo (slike itd.): network-first, cache fallback
  e.respondWith(
    fetch(rq).then(res => {
      caches.open(VERSION).then(c => c.put(rq, res.clone()));
      return res;
    }).catch(() => caches.match(rq))
  );
});

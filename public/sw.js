self.addEventListener("install",e=>{e.waitUntil(caches.open("elvora-v1").then(c=>c.addAll(["/","/styles.css","/app.js","/manifest.webmanifest","/app/hub.html","/app/scanner.html"]))); self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!=="elvora-v1").map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener("fetch",e=>{ if(e.request.method!=="GET") return; e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });


















/* Elvora SW: simple stale-while-revalidate for JSON/API */
self.addEventListener("fetch", (e)=>{
  const u = new URL(e.request.url);
  if(u.pathname.endsWith(".json") || u.pathname.startsWith("/api/")){
    e.respondWith((async()=>{
      const cache = await caches.open("api-cache");
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then(r=>{ cache.put(e.request,r.clone()); return r; }).catch(()=>cached);
      return cached || network;
    })());
  }
});





self.addEventListener("install",e=>{e.waitUntil(caches.open("elvora-v1").then(c=>c.addAll(["/","/styles.css","/app.js","/manifest.webmanifest","/app/hub.html","/app/scanner.html"]))); self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!=="elvora-v1").map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener("fetch",e=>{ if(e.request.method!=="GET") return; e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });











const CACHE = 'elvora-v' + (new Date()).toISOString().replace(/\D/g,'').slice(0,12);
const PRECACHE = ['/', '/index.html', '/status.html', '/offline.html', '/manifest.webmanifest', '/shared/elvora.css'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil((async()=>{for (const k of await caches.keys()) if (k!==CACHE) await caches.delete(k)})()); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const r=e.request; if(r.method!=='GET') return;
  const a=r.headers.get('accept')||'';
  if (a.includes('text/html')) { e.respondWith(fetch(r).catch(()=>caches.match('/offline.html'))); return; }
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{ const c=res.clone(); caches.open(CACHE).then(x=>x.put(r,c)); return res; })));
});
/* Elvora • Event Core (offline-first) */
(function(){
  // === Elvora Integrity Layer (instanceId + clientHash) ===
  const INSTANCE_KEY = "elvora.instanceId";

  function getInstanceId(){
    let id = localStorage.getItem(INSTANCE_KEY);
    if(!id){
      id = "ELV-" + (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)));
      localStorage.setItem(INSTANCE_KEY, id);
    }
    return id;
  }

  async function sha256Hex(str){
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  async function enrichEvent(evt){
    const instanceId = getInstanceId();
    const payloadJson = JSON.stringify(evt.payload ?? {});
    const base = [evt.id, evt.ts, evt.type, evt.action, instanceId, payloadJson].join("|");
    const clientHash = await sha256Hex(base);
    return { ...evt, instanceId, clientHash };
  }
  const KEY = "ev.core.queue";
  const MAX = 5000;
  const SENT_KEY = "ev.core.sent";
  const SENT_MAX = 200;

  // hardening knobs
  const BATCH = 200;        // max events per request
  const BACKOFF_MIN = 3000; // 3s
  const BACKOFF_MAX = 120000; // 2min

  const bus = new Map(); // type -> Set(fn)

  let flushing = false;
  let retryMs = 0;
  let retryTimer = null;

  function rid(){ return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8); }
  function nowIso(){ return new Date().toISOString(); }

  function loadQ(){
    try{ return JSON.parse(localStorage.getItem(KEY)||"[]"); }catch{ return []; }
  }
  function saveQ(q){
    if(q.length>MAX) q.length = MAX;
    localStorage.setItem(KEY, JSON.stringify(q));
  }

  function loadSent(){
    try{ return JSON.parse(localStorage.getItem(SENT_KEY)||"[]"); }catch{ return []; }
  }
  function saveSent(arr){
    if(arr.length>SENT_MAX) arr.length=SENT_MAX;
    localStorage.setItem(SENT_KEY, JSON.stringify(arr));
  }
  function pushSent(events){
    const arr = loadSent();
    events.forEach(e=>arr.unshift(e));
    saveSent(arr);
  }

  function on(type, fn){
    if(!bus.has(type)) bus.set(type, new Set());
    bus.get(type).add(fn);
    return ()=>off(type, fn);
  }
  function off(type, fn){
    const s = bus.get(type); if(!s) return;
    s.delete(fn); if(!s.size) bus.delete(type);
  }
  function emitLocal(evt){
    const s = bus.get(evt.type);
    if(s) s.forEach(fn=>{ try{ fn(evt); }catch{} });
  }

  async function emit(){
    const evt = {
      id: rid(),
      ts: nowIso(),
      type,
      action,
      payload: payload ?? {},
      meta: meta ?? {}
    };
    const q = loadQ();
    const enriched = await enrichEvent(evt);
    q.unshift(enriched);     // newest first
    saveQ(q);
    emitLocal(enriched);
    // opportunistic flush
    flushSoon(0);
    return enriched;
  }

  function clearRetry(){
    retryMs = 0;
    if(retryTimer){ clearTimeout(retryTimer); retryTimer = null; }
  }
  function nextBackoff(){
    retryMs = retryMs ? Math.min(BACKOFF_MAX, retryMs * 2) : BACKOFF_MIN;
    return retryMs;
  }
  function flushSoon(ms){
    try{
      if(!navigator.onLine) return;
      if(retryTimer){ return; } // already scheduled
      retryTimer = setTimeout(()=>{
        retryTimer = null;
        flush().catch(()=>{});
      }, Math.max(0, ms|0));
    }catch{}
  }

  async function flush(){
    if(flushing) return { ok:true, sent:0, note:"flush_in_progress" };
    if(!navigator.onLine) return { ok:false, sent:0, error:"offline" };

    flushing = true;
    let sentTotal = 0;

    try{
      while(true){
        const q = loadQ();
        if(!q.length) { clearRetry(); return { ok:true, sent:sentTotal }; }

        // q is newest-first; send oldest-first in batches
        const take = Math.min(BATCH, q.length);
        const slice = q.slice(q.length - take);  // last = oldest chunk (still newer->older inside slice)
        const toSend = slice.slice().reverse();  // oldest->newer

        const res = await fetch("/api/events",{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ batch:true, events: toSend })
        });
        if(!res.ok) throw new Error("HTTP "+res.status);

        // remove sent items (the last 'take' elements)
        q.splice(q.length - take, take);
        saveQ(q);
        pushSent(toSend);

        sentTotal += take;
        clearRetry();

        // continue loop to drain remaining queue in batches
        if(!q.length) return { ok:true, sent:sentTotal };
      }
    }catch(e){
      // schedule retry with backoff
      const ms = nextBackoff();
      flushSoon(ms);
      return { ok:false, sent:sentTotal, error:String(e && (e.message||e)) , retryInMs: ms };
    }finally{
      flushing = false;
    }
  }

  function queue(){ return loadQ(); }
  function clear(){ saveQ([]); clearRetry(); }

  addEventListener("online", ()=>{ flushSoon(0); });
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") flushSoon(0); });

  window.ElvoraEvents = { emit, on, off, flush, queue, clear,
    sent(){ try{ return JSON.parse(localStorage.getItem(SENT_KEY)||"[]"); }catch{ return []; } }
  };
})();




/* Shared skener: HID (USB kao tipkovnica) + BarcodeDetector ako postoji */
(function(){
  let buf="", lastTs=0, lastCode="", lastScan=0;
  const DEBOUNCE=80, DUP=2500;

  const CACHE_KEY="elvora_ean_cache_v1";
  const memCache = new Map();

  function loadCache(){
    try{
      const o = JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");
      for(const k of Object.keys(o)) memCache.set(k, o[k]);
    }catch{}
  }
  function saveCache(){
    try{
      const o={};
      for(const [k,v] of memCache.entries()) o[k]=v;
      localStorage.setItem(CACHE_KEY, JSON.stringify(o));
    }catch{}
  }
  loadCache();

  function normCode(x){
    const s = (x||"").toString().trim();
    // EAN/UPC/Code128 često dođe kao broj/string; QR može biti bilo što
    const digits = s.replace(/\D/g,"");
    // ako je čisti broj i dovoljno dugačak, tretiramo kao EAN/UPC
    if(digits.length>=8 && digits.length<=14 && digits.length===s.length) return digits;
    return s;
  }

  async function lookupName(raw){
    const code = normCode(raw);
    if(!code) return {code:"", name:""};

    // QR / non-numeric: samo prikaži sadržaj
    if(!/^\d{8,14}$/.test(code)){
      return { code, name:"QR / kod" };
    }

    // cache
    if(memCache.has(code)){
      return { code, name: memCache.get(code) || "Nepoznato" };
    }

    // remote lookup (Open Food Facts). Ako ne radi / nema mreže -> fallback
    try{
      const url = "https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(code) + ".json";
      const r = await fetch(url, {method:"GET"});
      if(r.ok){
        const j = await r.json();
        const nm =
          (j && j.product && (j.product.product_name || j.product.product_name_hr || j.product.product_name_en)) ||
          (j && j.product && j.product.generic_name) ||
          "Nepoznato";
        memCache.set(code, nm);
        saveCache();
        return { code, name: nm };
      }
    }catch{}

    memCache.set(code, "Nepoznato");
    saveCache();
    return { code, name: "Nepoznato" };
  }

  async function onScan(source, raw){
    const now=Date.now();
    const code = normCode(raw);
    if(!code) return;

    if(code===lastCode && now-lastScan<DUP) return;
    lastCode=code; lastScan=now;

    flash("Skenirano ("+source+"): "+code+" …");
    const res = await lookupName(code);
    const label = res.name ? (" • " + res.name) : "";
    flash("Skenirano ("+source+"): "+res.code + label);
  }

  // HID (USB tipkovnica) skener
  addEventListener("keydown", async (e)=>{
    const now=Date.now();
    if(now-lastTs>DEBOUNCE) buf="";
    lastTs=now;

    if(e.key==="Enter"){
      const code=buf.trim();
      buf="";
      if(!code) return;
      await onScan("HID", code);
    } else if(e.key.length===1){
      buf+=e.key;
    }
  });

  // Kamera scan
  async function camScan(){
    if(!('BarcodeDetector' in window)) return flash("Ovaj browser nema BarcodeDetector.");
    const vd=document.createElement("video");
    vd.playsInline=true;
    vd.muted=true;
    vd.setAttribute("playsinline","");
    document.body.appendChild(vd);

    const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    vd.srcObject=s;
    await vd.play();

    const det=new BarcodeDetector({formats:['ean_13','ean_8','code_128','qr_code']});

    const loop=async()=>{
      try{
        const cs=await det.detect(vd);
        if(cs.length){
          const v = cs[0].rawValue;
          await onScan("cam", v);
        }
      }catch{}
      requestAnimationFrame(loop);
    };
    loop();
  }

  // expose minimal API (ako ti treba izvana)
  window.ElvoraWarehouseCamScan = camScan;

  function flash(m){
    let t=document.getElementById("toast");
    if(!t){
      t=document.createElement("div");
      t.id="toast";
      t.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:20px;background:#0e141b;border:1px solid #1d2a36;color:#e6eef7;padding:10px 14px;border-radius:10px;z-index:9999;box-shadow:0 6px 26px rgba(0,0,0,.5);max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      document.body.appendChild(t);
    }
    t.textContent=m;
    clearTimeout(t._x);
    t._x=setTimeout(()=>t.remove(),1700);
  }
})();

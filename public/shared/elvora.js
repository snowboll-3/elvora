/* i18n util (HR/EN) + store */
window.ElvoraStore = {
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); },
  get(k,def){ try{ return JSON.parse(localStorage.getItem(k)) ?? def; }catch{ return def; } },
  del(k){ localStorage.removeItem(k); }
};
window.ElvoraI18n = (function(){
  let lang = localStorage.getItem("elvora.lang") || "hr";
  let dict = {};
  async function load(){
    try{
      const res = await fetch(`/i18n/${lang}.json`);
      dict = await res.json();
    }catch{ dict = {}; }
  }
  function t(key, fallback){ return (dict[key] ?? fallback ?? key); }
  async function setLang(l){ lang = l; localStorage.setItem("elvora.lang", l); await load(); location.reload(); }
  function getLang(){ return lang; }
  return { load, t, setLang, getLang };
})();

/* Shared HID + cam skener */
(function(){
  let buf="", lastTs=0, lastCode="", lastScan=0; const DEBOUNCE=80, DUP=2500;
  addEventListener("keydown",e=>{
    const now=Date.now(); if(now-lastTs>DEBOUNCE) buf=""; lastTs=now;
    if(e.key==="Enter"){ const code=buf.trim(); buf=""; if(!code) return;
      if(code===lastCode && now-lastScan<DUP) return; lastCode=code; lastScan=now;
      toast("Skenirano (HID): "+code);
      window.dispatchEvent(new CustomEvent("elvora:scan",{detail:{code,src:"HID"}}));
    } else if(e.key.length===1){ buf+=e.key; }
  });
  async function camScan(){
    if(!('BarcodeDetector' in window)) return toast("Ovaj preglednik nema BarcodeDetector.");
    const vd=document.createElement("video"); vd.playsInline=true; vd.muted=true; vd.style.cssText="width:100%;max-width:680px;border-radius:12px;display:block;margin:10px auto";
    document.body.appendChild(vd);
    const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    vd.srcObject=s; await vd.play();
    const det=new BarcodeDetector({formats:['ean_13','ean_8','code_128','qr_code']});
    const loop=async()=>{ try{ const cs=await det.detect(vd); if(cs.length){ const v=cs[0].rawValue; toast("Skenirano (cam): "+v); window.dispatchEvent(new CustomEvent("elvora:scan",{detail:{code:v,src:"CAM"}})); } }catch{} requestAnimationFrame(loop); }; loop();
  }
  function toast(m){ let t=document.getElementById("toast"); if(!t){ t=document.createElement("div"); t.id="toast";
    t.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:20px;background:#0e141b;border:1px solid #1d2a36;color:#e6eef7;padding:10px 14px;border-radius:10px;z-index:9999;box-shadow:0 6px 26px rgba(0,0,0,.5)";
    document.body.appendChild(t);} t.textContent=m; clearTimeout(t._x); t._x=setTimeout(()=>t.remove(),1700); }
  window.ElvoraCamScan = camScan; window.ElvoraToast = toast;
})();

// Load Event Core
(function(){var s=document.createElement('script');s.src='/shared/event-core.js';document.head.appendChild(s);})();

// Load Event Core
(function(){var s=document.createElement('script');s.src='/shared/event-core.js';document.head.appendChild(s);})();

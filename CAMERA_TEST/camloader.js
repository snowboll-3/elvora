(function(){
  const L = (()=>{let e=document.getElementById("camx-log"); if(!e){ e=document.createElement("pre");
    e.id="camx-log"; e.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;max-height:28vh;overflow:auto;background:#111;color:#0f0;padding:6px;border-radius:8px;font-size:12px;z-index:999999;opacity:.95";
    document.body.appendChild(e);} return e;})();
  const log=(...a)=>{const s=a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' '); console.debug(s); L.textContent+=s+"\n"; L.scrollTop=L.scrollHeight;};
  const beep=(ms=120,f=880)=>{try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();const o=c.createOscillator();const g=c.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(c.destination);g.gain.value=.07;o.start();o.stop(c.currentTime+ms/1000);}catch(e){}};

  let v=document.querySelector("video"); if(!v){ v=document.createElement("video"); v.autoplay=true; v.playsInline=true; v.muted=true; v.style.width="100%"; (document.querySelector("#stage")||document.body).prepend(v); }
  const p=v.parentElement; if(p) p.style.position="relative";

  let frame=document.getElementById("camx-frame");
  if(!frame){ frame=document.createElement("div"); frame.id="camx-frame";
    frame.style.cssText="position:absolute;inset:8% 6%;border:6px solid #FFC107;border-radius:12px;pointer-events:none;transition:border-color .12s";
    (p||document.body).appendChild(frame);
  }
  const scanning=()=>frame.style.borderColor="#FFC107";
  const success =()=>{frame.style.borderColor="#4CAF50"; beep();};

  let track=null, raf=null, running=false, zxingReader=null;

  async function tryAF(){
    try{
      if(!track) return;
      const c = track.getCapabilities ? track.getCapabilities() : {};
      log("Caps", c);
      if(c.focusMode && c.focusMode.includes("continuous")){
        await track.applyConstraints({ advanced:[{ focusMode:"continuous" }]});
        log("AF: continuous");
      } else if(c.focusMode && c.focusMode.includes("single-shot")){
        await track.applyConstraints({ advanced:[{ focusMode:"single-shot" }]});
        log("AF: single-shot");
      }
      if(c.zoom && typeof c.zoom.max!=='undefined'){
        const t = Math.min(c.zoom.max, (c.zoom.min||1) + (c.zoom.max - (c.zoom.min||1))*0.3);
        await track.applyConstraints({ advanced:[{ zoom: t }]});
        log("Zoom", t);
      }
    }catch(e){ log("AF fail", e.name||e); }
  }

  function waitForStream(){
    if(v.srcObject && v.srcObject.getVideoTracks){
      track = v.srcObject.getVideoTracks()[0];
      tryAF();
    } else {
      setTimeout(waitForStream, 200);
    }
  }

  function loadScript(src){
    return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  }

  async function ensureCamera(){
    if(v.srcObject) return;
    if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){
      log("getUserMedia not available"); return;
    }
    try{
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720} }, audio:false
      });
      v.srcObject = stream; await v.play();
    }catch(e){ log("gUM", e.name, e.message); }
  }

  async function startScan(){
    running = true;
    scanning();

    if('BarcodeDetector' in window){
      const det = new BarcodeDetector({ formats:["ean_13","ean_8","code_128","qr_code","upc_a","upc_e","code_39","itf"] });
      const tick = async ()=>{
        if(!running) return;
        try{
          const r = await det.detect(v);
          if(r && r.length){ onCode(String(r[0].rawValue)); return; }
        }catch(e){}
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      log("Scan: native");
    } else {
      try{
        if(!window.ZXing) await loadScript("https://unpkg.com/@zxing/browser@0.1.4");
        zxingReader = new ZXing.BrowserMultiFormatReader();
        await zxingReader.decodeFromVideoDevice(null, v, (result, err)=>{ if(result){ onCode(result.getText()); } });
        log("Scan: ZXing");
      }catch(e){ log("ZXing fail", e.message||e); }
    }
  }

  function stopScan(){
    running=false; cancelAnimationFrame(raf);
    if(zxingReader){ try{ zxingReader.reset(); }catch(e){} }
  }

  async function onCode(val){
    stopScan(); success(); log("CODE", val);
    setTimeout(()=>runOCR(val), 400);
  }

  async function runOCR(last){
    scanning();
    try{
      if(!window.Tesseract){ await loadScript("https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js"); }
      const c=document.createElement("canvas"), ctx=c.getContext("2d");
      const vw=v.videoWidth||1280, vh=v.videoHeight||720, ch=(vh*0.32)|0, cy=((vh-ch)/2)|0;
      c.width=vw; c.height=ch; ctx.drawImage(v,0,cy,vw,ch,0,0,vw,ch);
      const r = await Tesseract.recognize(c, "eng", { tessedit_char_whitelist:"0123456789./- ", classify_bln_numeric_mode:1 });
      const t = (r.data.text||"").replace(/\s+/g," "); log("OCR", t.slice(0,120));
      const m = t.match(/(\b\d{1,2}[.\-\/]\s?\d{1,2}[.\-\/]\s?\d{2,4}\b)/);
      if(m){ let s=m[1].replace(/\s/g,''); let parts=s.split(/[.\-\/]/).map(x=>x.padStart(2,'0'));
        let [d,mo,y]=parts; if(y.length===2) y="20"+y; log("DATE", `${d}.${mo}.${y}.`); }
      success();
    }catch(e){ log("OCR fail", e.message||e); }
  }

  const startBtn = [...document.querySelectorAll("button")].find(b=>/start\s*kamera/i.test(b.textContent||""));
  if(startBtn){ startBtn.addEventListener("click", async ()=>{ await ensureCamera(); waitForStream(); startScan(); }, { once:false }); }
  v.addEventListener("play", ()=>{ waitForStream(); startScan(); }, { once:true });
  ensureCamera();
  log("CamPatch loader injected");
})();
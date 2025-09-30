/* Shared skener: HID (USB kao tipkovnica) + BarcodeDetector ako postoji */
(function(){
  let buf="", lastTs=0, lastCode="", lastScan=0; const DEBOUNCE=80, DUP=2500;
  addEventListener("keydown",e=>{
    const now=Date.now(); if(now-lastTs>DEBOUNCE) buf=""; lastTs=now;
    if(e.key==="Enter"){ const code=buf.trim(); buf=""; if(!code) return;
      if(code===lastCode && now-lastScan<DUP) return; lastCode=code; lastScan=now;
      flash("Skenirano (HID): "+code);
    } else if(e.key.length===1){ buf+=e.key; }
  });
  async function camScan(){
    if(!('BarcodeDetector' in window)) return flash("Ovaj browser nema BarcodeDetector.");
    const vd=document.createElement("video"); vd.playsInline=true; document.body.appendChild(vd);
    const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}); vd.srcObject=s; await vd.play();
    const det=new BarcodeDetector({formats:['ean_13','ean_8','code_128','qr_code']});
    const loop=async()=>{ try{ const cs=await det.detect(vd); if(cs.length) flash("Skenirano (cam): "+cs[0].rawValue); }catch{} requestAnimationFrame(loop); }; loop();
  }
  function flash(m){ let t=document.getElementById("toast"); if(!t){ t=document.createElement("div"); t.id="toast";
    t.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:20px;background:#0e141b;border:1px solid #1d2a36;color:#e6eef7;padding:10px 14px;border-radius:10px;z-index:9999;box-shadow:0 6px 26px rgba(0,0,0,.5)";
    document.body.appendChild(t);} t.textContent=m; clearTimeout(t._x); t._x=setTimeout(()=>t.remove(),1700); }
  window.ElvoraCamScan = camScan;
})();

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const statusEl = document.getElementById("st");
const codeEl = document.getElementById("code");
const nameEl = document.getElementById("name");
const whenEl = document.getElementById("when");
const noteEl = document.getElementById("note");
const startBtn = document.getElementById("startBtn");

let stream=null, reader=null, devices=[], currentDeviceId=null;
let lastCode=null, lastAt=0, soundOn=true, audioCtx=null;

const MODE = { value: "ADD" };
document.querySelectorAll("input[name='mode']").forEach(r=>{
  r.addEventListener("change", ()=>{ MODE.value = r.value; });
});

function beep(){
  if (!soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type="sine"; o.frequency.value=880; g.gain.value=0.0001;
    o.connect(g); g.connect(audioCtx.destination);
    const t=audioCtx.currentTime;
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.15,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.00001,t+0.18);
    o.stop(t+0.2);
    if(navigator.vibrate) navigator.vibrate(50);
  }catch{}
}
function flash(){ overlay.classList.remove("flash"); void overlay.offsetWidth; overlay.classList.add("flash"); }
function setStatus(msg, ok=true){ statusEl.textContent=msg; statusEl.className= ok?'value ok':'value bad'; }


const EAN_CACHE_KEY="elvora_ean_cache_v1";
function readEanCache(){ try{ return JSON.parse(localStorage.getItem(EAN_CACHE_KEY)||"{}"); }catch{ return {}; } }
function writeEanCache(o){ try{ localStorage.setItem(EAN_CACHE_KEY, JSON.stringify(o||{})); }catch{} }

async function lookupName(code){
  const ean = String(code||"").trim();
  if(!ean) return "—";

  const cache = readEanCache();
  if(cache[ean]) return cache[ean];

  const ctrl = ("AbortController" in window) ? new AbortController() : null;
  const t = setTimeout(()=>{ try{ ctrl && ctrl.abort(); }catch{} }, 2500);

  try{
    const url = "https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(ean) + ".json";
    const r = await fetch(url, { method:"GET", cache:"no-store", signal: ctrl ? ctrl.signal : undefined });

    clearTimeout(t);

    if(r && r.ok){
      const j = await r.json();
      if(j && j.status === 1 && j.product){
        const name =
          j.product.product_name ||
          j.product.product_name_hr ||
          j.product.product_name_en ||
          j.product.generic_name ||
          "Nepoznato";

        cache[ean]=name;
        writeEanCache(cache);
        return name;
      }
    }
  }catch(e){
    clearTimeout(t);
  }

  cache[ean]="Nepoznato";
  writeEanCache(cache);
  return "Nepoznato";
}
async function listCameras(){
  try{
    const all=await navigator.mediaDevices.enumerateDevices();
    devices=all.filter(d=>d.kind==='videoinput');
  }catch(e){ devices=[]; }
  return devices;
}
async function startCamera(pref=null){
  await stopCamera();
  try{
    setStatus("Pokrećem kameru…");
    const constraints = pref
      ? { video:{ deviceId:{ exact: pref }}, audio:false }
      : { video:{ facingMode:{ ideal:'environment' }, width:{ ideal:1280 }, height:{ ideal:720 }}, audio:false };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject=stream; await video.play();
    currentDeviceId = (stream.getVideoTracks()[0]||{}).getSettings().deviceId || pref || null;
    setStatus("Kamera pokrenuta ?");
    noteEl.textContent="Ciljaj barkod u zeleni okvir.";
    await startScanning();
  }catch(e){
    setStatus(e.name+": "+e.message,false);
    noteEl.textContent="Provjeri dopuštenja za kameru i da nije u upotrebi drugdje.";
  }
}
async function stopCamera(){
  try{
    if(reader){ await reader.reset(); reader=null; }
    if(video) video.pause();
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
    setStatus("Kamera zaustavljena");
  }catch{}
}
async function switchCamera(){
  const cams = await listCameras();
  if(!cams.length){ setStatus("Nema dodatnih kamera",false); return; }
  if(!currentDeviceId){ await startCamera(); return; }
  const idx = cams.findIndex(d=>d.deviceId===currentDeviceId);
  const next = cams[(idx+1)%cams.length];
  await startCamera(next.deviceId);
}

async function startScanning(){
  try{
    const { BarcodeFormat, DecodeHintType } = ZXingBrowser;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.CODE_128 // “novi” + fallback
    ]);
    reader = new ZXingBrowser.BrowserMultiFormatReader(hints);

    await reader.decodeFromVideoDevice(currentDeviceId||null, video, async (result, err)=>{
      if(result){
        const code = result.getText();
        const now = Date.now();
        if(code!==lastCode || (now-lastAt)>1500){
          lastCode=code; lastAt=now;
          onScan(code);
        }
      }else if(err && !(err instanceof ZXingBrowser.NotFoundException)){
        setStatus("Greška dekodiranja", false);
      }
    });
  }catch(e){
    setStatus("Skeniranje nije pokrenuto: "+e.message,false);
  }
}

async function onScan(code){
  codeEl.textContent=code;
  setStatus("Očitano ✅");
  flash(); beep();

  const ts = new Date();
  whenEl.textContent = ts.toLocaleString();

  nameEl.textContent = "Tražim…";
  const name = await lookupName(code);
  nameEl.textContent = name;

  // journal entry
  const entry = { id: String(ts.getTime()), mode: MODE.value, code, name, ts: ts.getTime(), qty: 1 };
  const j = readJournal();
  j.unshift(entry);
  saveJournal(j.slice(0,200));
  renderJournal();
}

function readJournal(){
  try{ return JSON.parse(localStorage.getItem("sl_journal")||"[]"); }catch(_){ return []; }
}
function saveJournal(j){ localStorage.setItem("sl_journal", JSON.stringify(j)); }
function readCatalog(){
  try{ return JSON.parse(localStorage.getItem("sl_catalog")||"{}"); }catch(_){ return {}; }
}
function saveCatalog(c){ localStorage.setItem("sl_catalog", JSON.stringify(c)); }

function renderJournal(){
  const rows = readJournal();
  listEl.innerHTML = rows.map(r=>`
    <div class="item">
      <div>
        <p class="ititle">${r.name||"—"}</p>
        <div class="imeta">${r.mode} · Kod: ${r.code} · Količina: <span class="qty">${r.qty}</span></div>
        <div class="imeta">Vrijeme: ${new Date(r.ts).toLocaleString()}</div>
      </div>
      <div>
        <button class="btn ghost" onclick="inc('${r.id}',1)">+1</button>
        <button class="btn ghost" onclick="inc('${r.id}',-1)">-1</button>
        <button class="btn ghost" onclick="delItem('${r.id}')">Obriši</button>
      </div>
    </div>
  `).join("");
}

window.inc = function(id,delta){
  const j = readJournal();
  const i = j.findIndex(x=>x.id===id);
  if(i===-1) return;
  j[i].qty = Math.max(1, (j[i].qty||1)+delta);
  saveJournal(j); renderJournal();
};
window.delItem = function(id){
  const j = readJournal().filter(x=>x.id!==id);
  saveJournal(j); renderJournal();
};

startBtn.addEventListener("click", async ()=>{ await listCameras(); await startCamera(); });
renderJournal(); setStatus("Spremno"); codeEl.textContent="—"; nameEl.textContent="—"; });

document.addEventListener("visibilitychange", async ()=>{
  if(document.hidden){ await stopCamera(); }
});

renderJournal();

if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)){
  setStatus('Preglednik ne podržava kameru (getUserMedia).', false);
  noteEl.textContent = 'Pokušaj s modernim preglednikom (Chrome, Edge, Safari).';
}









// --- ELVORA CAMERA DEBUG OVERLAY ---
(function(){
  function show(msg){
    try{
      var el = document.getElementById('note') || document.getElementById('st') || document.body;
      var p = document.getElementById('__err');
      if(!p){ p = document.createElement('pre'); p.id='__err'; p.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;max-height:35vh;overflow:auto;background:rgba(0,0,0,.85);color:#ff5d5d;padding:10px;border-radius:12px;z-index:99999;font-size:12px;white-space:pre-wrap;'; document.body.appendChild(p); }
      p.textContent = String(msg);
    }catch(e){}
  }
  window.addEventListener('error', function(e){ show('JS ERROR: ' + (e.message||e.type) + (e.filename? ('\n' + e.filename + ':' + e.lineno):'')); });
  window.addEventListener('unhandledrejection', function(e){ show('PROMISE ERROR: ' + (e.reason && (e.reason.message||e.reason) || 'unknown')); });
  try{ show('DEBUG: camera.js loaded'); }catch(e){}
})();


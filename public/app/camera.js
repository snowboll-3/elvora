const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const statusEl = document.getElementById("status");
const codeEl = document.getElementById("code");
const nameEl = document.getElementById("name");
const whenEl = document.getElementById("when");
const noteEl = document.getElementById("note");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const switchBtn = document.getElementById("switchBtn");
const soundBtn = document.getElementById("soundBtn");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const listEl = document.getElementById("list");

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
    setStatus("Kamera pokrenuta ✅");
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

function onScan(code){
  codeEl.textContent=code;
  setStatus("Očitano ✅");
  flash(); beep();

  const ts = new Date();
  whenEl.textContent = ts.toLocaleString();

  // lokalni katalog (učenje)
  const catalog = readCatalog();
  let name = catalog[code] || "";
  if(!name){
    const guess = prompt("Molim unesite točan naziv proizvoda:", "");
    if(guess && guess.trim().length){
      name = guess.trim();
      catalog[code] = name;
      saveCatalog(catalog);
    }else{
      name = "—";
    }
  }
  nameEl.textContent = name;

  // journal entry
  const entry = {
    id: String(ts.getTime()),
    mode: MODE.value, // ADD/USE
    code,
    name,
    qty: 1,
    ts: ts.toISOString()
  };
  const journal = readJournal();
  journal.unshift(entry);
  saveJournal(journal);
  renderJournal();

    // event → Event Core (offline-first)
  ev("SCANNER", MODE.value, { code, name, qty: 1, ts: entry.ts }, { hub:"scanner", source:"camera.js" });

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
        <button class="btn ghost" onclick="inc('${r.id}',-1)">−1</button>
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
stopBtn.addEventListener("click", stopCamera);
switchBtn.addEventListener("click", switchCamera);
soundBtn.addEventListener("click", ()=>{
  soundOn=!soundOn;
  soundBtn.textContent = (soundOn?'🔊':'🔈') + " Zvuk: " + (soundOn?"ON":"OFF");
});
sendBtn.addEventListener("click", ()=>{
  const j = readJournal();
  if(!j.length){ alert("Dnevnik je prazan."); return; }
  alert("📤 Poslano u Hladnjak (mock). U praksi: API za spremanje.\nStavke: "+j.length);
  // nakon slanja možeš odlučiti: očistiti ili ostaviti
});
clearBtn.addEventListener("click", ()=>{ saveJournal([]); renderJournal(); setStatus("Spremno"); codeEl.textContent="—"; nameEl.textContent="—"; });

document.addEventListener("visibilitychange", async ()=>{
  if(document.hidden){ await stopCamera(); }
});

renderJournal();

if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)){
  setStatus('Preglednik ne podržava kameru (getUserMedia).', false);
  noteEl.textContent = 'Pokušaj s modernim preglednikom (Chrome, Edge, Safari).';
}


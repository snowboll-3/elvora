/* ELVORA CAMERA V1 — stable engine (clean-room) */

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");

const stEl = document.getElementById("st");
const codeEl = document.getElementById("code");
const nameEl = document.getElementById("name");
const whenEl = document.getElementById("when");

const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnSwitch = document.getElementById("btnSwitch");
const btnTorch = document.getElementById("btnTorch");
const btnSound = document.getElementById("btnSound");

let stream=null, currentTrack=null, devices=[], deviceIndex=0;
let scanning=false, lastCode=null, lastAt=0;
let soundOn=true;
let detector=null, zxingReader=null;

const CACHE_KEY="elvora_ean_cache_v3";
const memGood = new Map(); // session last-good names

function setStatus(msg, type="warn"){
  stEl.textContent = msg;
  stEl.className = "v " + (type || "warn");
}
function beep(){
  if(!soundOn) return;
  try{
    const ac=new (window.AudioContext||window.webkitAudioContext)();
    const o=ac.createOscillator(); const g=ac.createGain();
    o.type="sine"; o.frequency.value=900;
    o.connect(g); g.connect(ac.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+0.15);
    setTimeout(()=>ac.close(),200);
    if(navigator.vibrate) navigator.vibrate(50);
  }catch{}
}
function readCache(){ try{return JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");}catch{return{}} }
function writeCache(o){ try{localStorage.setItem(CACHE_KEY,JSON.stringify(o||{}));}catch{} }

function normalizeCode(raw){
  // uzmi samo znamenke (EAN/UPC)
  const s = String(raw||"").trim();
  const digits = s.replace(/\D+/g,'');
  return digits;
}
function isValidCodeDigits(d){
  // dopusti 8, 12, 13, 14 (EAN-8 / UPC-A / EAN-13 / GTIN-14)
  return d.length===8 || d.length===12 || d.length===13 || d.length===14;
}

async function fetchOffName(ean, timeoutMs=2500){
  const ctrl = ("AbortController" in window) ? new AbortController() : null;
  const t = setTimeout(()=>{ try{ ctrl && ctrl.abort(); }catch{} }, timeoutMs);

  try{
    const url = "https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(ean) + ".json";
    const r = await fetch(url, { cache:"no-store", signal: ctrl ? ctrl.signal : undefined });
    clearTimeout(t);

    if(!r || !r.ok) return { ok:false, kind:"net" };
    const j = await r.json();
    if(j && j.status===1 && j.product){
      const name = (j.product.product_name || j.product.product_name_en || j.product.generic_name || "").trim();
      if(name) return { ok:true, name };
      return { ok:false, kind:"noname" };
    }
    return { ok:false, kind:"notfound" };
  }catch{
    clearTimeout(t);
    return { ok:false, kind:"net" };
  }
}

async function lookupNameStable(ean){
  // 1) cache (local + session)
  const cache = readCache();
  if(memGood.has(ean)) return memGood.get(ean);
  if(cache[ean]){ memGood.set(ean, cache[ean]); return cache[ean]; }

  // 2) OFF lookup s retry
  const first = await fetchOffName(ean, 2500);
  if(first.ok){
    cache[ean]=first.name; writeCache(cache);
    memGood.set(ean, first.name);
    return first.name;
  }

  // retry only for network
  if(first.kind==="net"){
    const second = await fetchOffName(ean, 3000);
    if(second.ok){
      cache[ean]=second.name; writeCache(cache);
      memGood.set(ean, second.name);
      return second.name;
    }
    // ako imamo bilo kakav stari naziv, vrati njega (ne ruši UI)
    if(memGood.has(ean)) return memGood.get(ean);
    if(cache[ean]) return cache[ean];
    return "Greška mreže";
  }

  // not found / no name
  if(first.kind==="notfound") return "Nije u katalogu";
  if(first.kind==="noname") return "Nije u katalogu";
  return "Nije u katalogu";
}

async function listCameras(){
  const all=await navigator.mediaDevices.enumerateDevices();
  devices=all.filter(d=>d.kind==="videoinput");
  btnSwitch.disabled = devices.length<2;
}

async function startCamera(){
  try{
    setStatus("Pokrećem…","warn");
    const deviceId=devices[deviceIndex]?.deviceId;
    const constraints=deviceId?
      {video:{deviceId:{exact:deviceId}},audio:false}:
      {video:{facingMode:{ideal:"environment"}},audio:false};

    stream=await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject=stream;
    currentTrack=stream.getVideoTracks()[0];
    await video.play();

    if(btnStop) if(btnStop) btnStop.disabled=false;
    btnTorch.disabled=!(currentTrack.getCapabilities?.().torch);
    scanning=true;

    initDetector();
    loopScan();

    setStatus("Spremno","ok");
  }catch{
    setStatus("Kamera greška","bad");
  }
}

async function stopCamera(){
  scanning=false;
  if(stream){ stream.getTracks().forEach(t=>t.stop()); }
  if(btnStop) if(btnStop) btnStop.disabled=true;
  setStatus("Zaustavljeno","warn");
}

async function switchCamera(){
  deviceIndex=(deviceIndex+1)%devices.length;
  await stopCamera();
  await startCamera();
}

async function toggleTorch(){
  try{
    const cap=currentTrack.getCapabilities();
    if(cap.torch){
      const state=currentTrack.getSettings().torch||false;
      await currentTrack.applyConstraints({advanced:[{torch:!state}]});
    }
  }catch{}
}

function initDetector(){
  if("BarcodeDetector" in window){
    detector=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","code_128","qr_code"]});
  }else{
    loadZXing();
  }
}
async function loadZXing(){
  if(window.ZXingBrowser) return;
  const s=document.createElement("script");
  s.src=window.__ELVORA_ZXING_URL;
  s.onload=()=>{ zxingReader=new ZXingBrowser.BrowserMultiFormatReader(); };
  document.body.appendChild(s);
}

async function loopScan(){
  if(!scanning) return;
  try{
    if(detector){
      const codes=await detector.detect(video);
      if(codes.length) handleCode(codes[0].rawValue);
    }else if(zxingReader){
      const res=await zxingReader.decodeOnceFromVideoDevice(undefined,video);
      if(res) handleCode(res.getText());
    }
  }catch{}
  requestAnimationFrame(loopScan);
}

async function handleCode(raw){
  const now=Date.now();
  const code = normalizeCode(raw);

  // ignoriraj loše/kratko očitanje
  if(!isValidCodeDigits(code)){
    // ali pokaži barem kod ako je nešto očitao
    if(code && code.length>=6){
      codeEl.textContent = code;
      whenEl.textContent = new Date().toLocaleString("hr-HR");
      nameEl.textContent = "—";
      setStatus("Loše očitanje","warn");
    }
    return;
  }

  if(code===lastCode && now-lastAt<1500) return;
  lastCode=code; lastAt=now;

  beep();
  codeEl.textContent=code;
  whenEl.textContent=new Date().toLocaleString("hr-HR");

  nameEl.textContent="Tražim…";
  const name = await lookupNameStable(code);
  nameEl.textContent = name;
  setStatus("Spremno","ok");
}

btnStart.addEventListener("click",async()=>{ await listCameras(); await startCamera(); });
if(btnStop) if(btnStop) btnStop.addEventListener("click",stopCamera);
btnSwitch.addEventListener("click",switchCamera);
btnTorch.addEventListener("click",toggleTorch);
////btnSound.addEventListener("click",()=>{ soundOn=!soundOn; btnSound.textContent="Zvuk: "+(soundOn?"ON":"OFF"); });

document.addEventListener("visibilitychange",()=>{ if(document.hidden) stopCamera(); });
setStatus("Spremno","warn");






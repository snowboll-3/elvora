/* ELVORA CAMERA V1 - stable engine + scan frame */

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");

const stEl = document.getElementById("st");
const codeEl = document.getElementById("code");
const nameEl = document.getElementById("name");
const whenEl = document.getElementById("when");

const btnStart = document.getElementById("btnStart");
const btnSwitch = document.getElementById("btnSwitch");
const btnTorch = document.getElementById("btnTorch");

let stream = null, currentTrack = null, devices = [], deviceIndex = 0;
let scanning = false, lastCode = null, lastAt = 0;

let detector = null, zxingReader = null;

const CACHE_KEY = "elvora_ean_cache_v3";
const memGood = new Map();

function beepOk(){
  try{
    const A = window.AudioContext || window.webkitAudioContext;
    if(!A) return;
    const ac = new A();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = 1100;
    o.connect(g);
    g.connect(ac.destination);
    g.gain.setValueAtTime(0.001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);
    o.start();
    o.stop(ac.currentTime + 0.10);
    setTimeout(() => { try{ ac.close(); }catch{} }, 180);
  }catch{}
}

function setStatus(msg, type="warn"){
  stEl.textContent = msg;
  stEl.className = "v " + (type || "warn");
}

function readCache(){ try{ return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); }catch{ return {}; } }
function writeCache(o){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify(o || {})); }catch{} }

function normalizeCode(raw){
  const s = String(raw || "").trim();
  return s.replace(/\D+/g, "");
}
function isValidCodeDigits(d){
  return d.length === 8 || d.length === 12 || d.length === 13 || d.length === 14;
}

function resizeOverlay(){
  const r = video.getBoundingClientRect();
  overlay.width = Math.max(1, Math.floor(r.width));
  overlay.height = Math.max(1, Math.floor(r.height));
}

function drawScanFrame(){
  if(!overlay.width || !overlay.height) resizeOverlay();
  const w = overlay.width, h = overlay.height;

  ctx.clearRect(0, 0, w, h);

  const m = Math.round(Math.min(w, h) * 0.12);
  const x = m, y = m;
  const sw = w - m * 2;
  const sh = h - m * 2;
  const L = Math.round(Math.min(sw, sh) * 0.14);

  ctx.strokeStyle = "#39d98a";
  ctx.lineWidth = 4;

  ctx.beginPath(); ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + sw - L, y); ctx.lineTo(x + sw, y); ctx.lineTo(x + sw, y + L); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + sh - L); ctx.lineTo(x, y + sh); ctx.lineTo(x + L, y + sh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + sw - L, y + sh); ctx.lineTo(x + sw, y + sh); ctx.lineTo(x + sw, y + sh - L); ctx.stroke();

  requestAnimationFrame(drawScanFrame);
}

async function fetchOffName(ean, timeoutMs=2500){
  const ctrl = ("AbortController" in window) ? new AbortController() : null;
  const t = setTimeout(() => { try{ if(ctrl) ctrl.abort(); }catch{} }, timeoutMs);

  try{
    const url = "https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(ean) + ".json";
    const r = await fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined });
    clearTimeout(t);

    if(!r || !r.ok) return { ok:false, kind:"net" };
    const j = await r.json();

    if(j && j.status === 1 && j.product){
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
  const cache = readCache();
  if(memGood.has(ean)) return memGood.get(ean);
  if(cache[ean]){
    memGood.set(ean, cache[ean]);
    return cache[ean];
  }

  const first = await fetchOffName(ean, 2500);
  if(first.ok){
    cache[ean] = first.name;
    writeCache(cache);
    memGood.set(ean, first.name);
    return first.name;
  }

  if(first.kind === "net"){
    const second = await fetchOffName(ean, 3000);
    if(second.ok){
      cache[ean] = second.name;
      writeCache(cache);
      memGood.set(ean, second.name);
      return second.name;
    }
    if(cache[ean]) return cache[ean];
    return "Greska mreze";
  }

  return "Nije u katalogu";
}

async function listCameras(){
  const all = await navigator.mediaDevices.enumerateDevices();
  devices = all.filter(d => d.kind === "videoinput");
  if(btnSwitch) btnSwitch.disabled = devices.length < 2;
}

async function startCamera(){
  try{
    setStatus("Pokrecem...", "warn");

    const deviceId = devices[deviceIndex]?.deviceId;
    const constraints = deviceId
      ? { video: { deviceId: { exact: deviceId } }, audio: false }
      : { video: { facingMode: { ideal: "environment" } }, audio: false };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    currentTrack = stream.getVideoTracks()[0];
    await video.play();

    resizeOverlay();
    drawScanFrame();

    if(btnTorch) btnTorch.disabled = !(currentTrack.getCapabilities?.().torch);
    scanning = true;

    initDetector();
    loopScan();

    setStatus("Spremno", "ok");
  }catch(err){
    setStatus("Greska kamere", "bad");
    throw err;
  }
}

async function switchCamera(){
  if(!devices.length) return;
  deviceIndex = (deviceIndex + 1) % devices.length;
  scanning = false;
  try{ if(stream) stream.getTracks().forEach(t => t.stop()); }catch{}
  await startCamera();
}

async function toggleTorch(){
  try{
    const cap = currentTrack.getCapabilities();
    if(cap.torch){
      const state = currentTrack.getSettings().torch || false;
      await currentTrack.applyConstraints({ advanced:[{ torch: !state }] });
    }
  }catch{}
}

function initDetector(){
  if("BarcodeDetector" in window){
    detector = new BarcodeDetector({ formats:["ean_13","ean_8","upc_a","code_128","qr_code"] });
  }else{
    loadZXing();
  }
}

async function loadZXing(){
  if(window.ZXingBrowser) return;
  const s = document.createElement("script");
  s.src = window.__ELVORA_ZXING_URL;
  s.onload = () => { zxingReader = new ZXingBrowser.BrowserMultiFormatReader(); };
  document.body.appendChild(s);
}

async function loopScan(){
  if(!scanning) return;
  try{
    if(detector){
      const codes = await detector.detect(video);
      if(codes.length) handleCode(codes[0].rawValue);
    }else if(zxingReader){
      const res = await zxingReader.decodeOnceFromVideoDevice(undefined, video);
      if(res) handleCode(res.getText());
    }
  }catch{}
  setTimeout(loopScan, 250);
}

async function handleCode(raw){
  const now = Date.now();
  const code = normalizeCode(raw);

  if(!isValidCodeDigits(code)){
    if(code && code.length >= 6){
      codeEl.textContent = code;
      whenEl.textContent = new Date().toLocaleString("hr-HR");
      nameEl.textContent = "-";
      setStatus("Lose ocitanje", "warn");
    }
    return;
  }

  if(code === lastCode && now - lastAt < 2000) return;
  lastCode = code;
  lastAt = now;

  codeEl.textContent = code;
  whenEl.textContent = new Date().toLocaleString("hr-HR");

  nameEl.textContent = "Trazim...";
  const name = await lookupNameStable(code);
  nameEl.textContent = name ? decodeURIComponent(escape(name)) : "Nije u katalogu";

  try{ if(navigator.vibrate) navigator.vibrate(60); }catch{}
  beepOk();
  setStatus("Spremno", "ok");
}

if(btnStart){
  btnStart.addEventListener("click", async () => {
    await listCameras();
    await startCamera();
  });
}
if(btnSwitch) btnSwitch.addEventListener("click", switchCamera);
if(btnTorch) btnTorch.addEventListener("click", toggleTorch);

window.addEventListener("resize", resizeOverlay);

document.addEventListener("visibilitychange", () => {
  if(document.hidden){
    scanning = false;
    try{ if(stream) stream.getTracks().forEach(t => t.stop()); }catch{}
  }
});

setStatus("Spremno", "warn");

(() => {
  try{ if(btnStart) btnStart.remove(); }catch{}
  function toast(msg){
    try{
      const t = document.getElementById("toast");
      if(t) t.textContent = msg || "";
    }catch{}
  }
  async function go(){
    try{
      await listCameras();
      toast("");
      await startCamera();
    }catch(e){
      const n = (e && e.name) || "";
      if(n === "NotAllowedError" || n === "SecurityError"){
        toast("Dodirni ekran za pokretanje kamere.");
        const once = async () => {
          document.removeEventListener("touchstart", once, true);
          document.removeEventListener("click", once, true);
          try{
            await listCameras();
            toast("");
            await startCamera();
          }catch{}
        };
        document.addEventListener("touchstart", once, { capture:true, once:true });
        document.addEventListener("click", once, { capture:true, once:true });
        return;
      }
      toast((e && e.message) ? e.message : "Greska kamere");
    }
  }
  window.addEventListener("load", go);
})();





/* ELVORA CAMERA V1 — clean-room engine */

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");

const stEl = document.getElementById("st");
const codeEl = document.getElementById("code");
const nameEl = document.getElementById("name");
const whenEl = document.getElementById("when");
const toastEl = document.getElementById("toast");

const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnSwitch = document.getElementById("btnSwitch");
const btnTorch = document.getElementById("btnTorch");
const btnSound = document.getElementById("btnSound");

let stream=null, currentTrack=null, devices=[], deviceIndex=0;
let scanning=false, lastCode=null, lastAt=0;
let soundOn=true;
let detector=null, zxingReader=null;

const CACHE_KEY="elvora_ean_cache_v2";

function setStatus(msg, type="warn"){
  stEl.textContent=msg;
  stEl.className="v "+(type||"warn");
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

async function lookupName(ean){
  const cache=readCache();
  if(cache[ean]) return cache[ean];

  try{
    const r=await fetch("https://world.openfoodfacts.org/api/v2/product/"+encodeURIComponent(ean)+".json",{cache:"no-store"});
    const j=await r.json();
    if(j.status===1 && j.product){
      const name=j.product.product_name||j.product.product_name_en||j.product.generic_name||"—";
      cache[ean]=name; writeCache(cache);
      return name;
    }
    return "Nije u katalogu";
  }catch{
    return "Greška mreže";
  }
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

    btnStop.disabled=false;
    btnTorch.disabled=!(currentTrack.getCapabilities?.().torch);
    scanning=true;

    initDetector();
    loopScan();

    setStatus("Spremno","ok");
  }catch(e){
    setStatus("Kamera greška","bad");
  }
}

async function stopCamera(){
  scanning=false;
  if(stream){ stream.getTracks().forEach(t=>t.stop()); }
  btnStop.disabled=true;
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

async function handleCode(code){
  const now=Date.now();
  if(code===lastCode && now-lastAt<1500) return;
  lastCode=code; lastAt=now;

  beep();
  codeEl.textContent=code;
  whenEl.textContent=new Date().toLocaleString("hr-HR");

  nameEl.textContent="Tražim…";
  const name=await lookupName(code);
  nameEl.textContent=name;
}

btnStart.addEventListener("click",async()=>{ await listCameras(); await startCamera(); });
btnStop.addEventListener("click",stopCamera);
btnSwitch.addEventListener("click",switchCamera);
btnTorch.addEventListener("click",toggleTorch);
btnSound.addEventListener("click",()=>{ soundOn=!soundOn; btnSound.textContent="Zvuk: "+(soundOn?"ON":"OFF"); });

document.addEventListener("visibilitychange",()=>{ if(document.hidden) stopCamera(); });

setStatus("Spremno","warn");

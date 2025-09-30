/* Elvora • voice.js – Send voice note (local cache + push stub) */
const VK="elvora.voice.notes";
const q=()=>{try{return JSON.parse(localStorage.getItem(VK)||"[]")}catch{return[]}};
const s=(rows)=>localStorage.setItem(VK,JSON.stringify(rows));
export async function recordAndSend(){
  if(!navigator.mediaDevices?.getUserMedia) return alert("No mic");
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  const rec = new MediaRecorder(stream); const chunks=[];
  rec.ondataavailable=(e)=>chunks.push(e.data);
  rec.onstop=()=>{
    const blob=new Blob(chunks,{type:"audio/webm"}); const url=URL.createObjectURL(blob);
    const rows=q(); rows.unshift({ts:new Date().toISOString(),url,lenSec:null, status:"SENT_LOCAL"});
    s(rows);
    if("Notification" in window){ if(Notification.permission==="default"){Notification.requestPermission().catch(()=>{});} if(Notification.permission==="granted"){ new Notification("Voice note sent",{body:"Check Devices/Operations",icon:"/assets/icon-192.png"}) } }
    // TODO: upload blob to backend; store returned URL + duration
  };
  rec.start(); setTimeout(()=>rec.stop(), 60000); // max 60s
}
export function injectButton(){
  if(document.getElementById("voice-note-btn")) return;
  const b=document.createElement("button"); b.id="voice-note-btn"; b.textContent="Send voice note";
  b.className="btn"; b.style.position="fixed"; b.style.right="16px"; b.style.bottom="16px"; b.style.zIndex="9999";
  b.onclick=()=>recordAndSend(); document.body.appendChild(b);
}
document.addEventListener("DOMContentLoaded", ()=>injectButton());
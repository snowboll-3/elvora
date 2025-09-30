/* Elvora • help.js – global SOS button */
const HK="elvora.help.events";
const q=()=>{try{return JSON.parse(localStorage.getItem(HK)||"[]")}catch{return[]}};
const s=(rows)=>localStorage.setItem(HK,JSON.stringify(rows));
function send(evt){ const rows=q(); rows.unshift({ts:new Date().toISOString(),evt}); if(rows.length>2000)rows.length=2000; s(rows); if("Notification" in window){ if(Notification.permission==="granted") new Notification("HELP / SOS",{body:evt,icon:"/assets/icon-192.png"}); else Notification.requestPermission(); } alert("HELP logged: "+evt); }
function ui(){
  if(document.getElementById("sos-btn")) return;
  const wrap=document.createElement("div"); wrap.id="sos-btn"; wrap.style.cssText="position:fixed;left:16px;bottom:16px;display:flex;gap:8px;z-index:9999";
  [["🔥","Fire"],["🧪","Chemical"],["⛽","Gas"]].forEach(([i,l])=>{ const b=document.createElement("button"); b.className="btn"; b.textContent=i+" "+l; b.onclick=()=>send(l); wrap.appendChild(b); });
  document.body.appendChild(wrap);
}
document.addEventListener("DOMContentLoaded", ui);
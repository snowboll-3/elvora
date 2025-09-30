/* Elvora • move.js – Mark for Move / Shelf move (local-first) */
const LS_KEY="elvora.move.queue";
const q=()=>{try{return JSON.parse(localStorage.getItem(LS_KEY)||"[]")}catch{return[]}};
const s=(rows)=>localStorage.setItem(LS_KEY,JSON.stringify(rows));
export function markForMove(sku,fromLoc,toLoc){const rows=q(); rows.unshift({ts:new Date().toISOString(),sku,from:fromLoc||null,to:toLoc||null,status:"PENDING"}); if(rows.length>5000)rows.length=5000; s(rows); pingUI();}
export function completeMove(index){const rows=q(); if(rows[index]){rows[index].status="DONE"; s(rows); pingUI();}}
export function clearMoves(){s([]); pingUI();}
export function getMoves(){return q();}
function pingUI(){window.dispatchEvent(new CustomEvent("elvora:move:changed"));}

/* Optional voice command "Premjesti <naziv/sku> na policu <N>"  */
export function enableVoiceCommands(toggle=true){
  if(!toggle || !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
  const SR = window.SpeechRecognition||window.webkitSpeechRecognition; const sr=new SR();
  sr.lang="hr-HR"; sr.continuous=true; sr.interimResults=false; sr.onresult=(e)=>{
    const t = e.results[e.results.length-1][0].transcript.trim().toLowerCase();
    const m = t.match(/premjesti\s+(.+?)\s+na\s+policu\s+(\d+)/); // "premjesti mlijeko na policu 2"
    if(m){ const prod=m[1]; const shelf=m[2]; markForMove(prod,null,"Shelf-"+shelf); }
  };
  sr.start();
}
const wh_hq = document.getElementById("wh_hq");
const wh_std = document.getElementById("wh_std");
const mk_hq = document.getElementById("mk_hq");
const mk_std = document.getElementById("mk_std");
const citiesEl = document.getElementById("cities");
const grid = document.getElementById("grid");

document.getElementById("gen").addEventListener("click", render);
document.getElementById("save").addEventListener("click", save);
document.getElementById("clear").addEventListener("click", () => {
  localStorage.removeItem("sl_setup");
  alert("Obrisano (lokalno).");
});

function pad(n,len){ return String(n).padStart(len,"0"); }
function norm(s){
  // ukloni dijakritike i sve osim slova
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z]/g,"");
}
function cityCode(name){
  const n = norm(name||"").toUpperCase();
  return (n.slice(0,3) || "XXX");
}
function parseCities(){
  const list = (citiesEl.value||"")
    .split(/\r?\n/)
    .map(s=>s.trim())
    .filter(Boolean);
  return list.length ? list : ["Zagreb","Split","Rijeka","Osijek"];
}

// raspodjela round-robin, + lokalni brojači po gradu i tipu
function generate(){
  const nWhHq = parseInt(wh_hq.value||0,10);
  const nWh   = parseInt(wh_std.value||0,10);
  const nMkHq = parseInt(mk_hq.value||0,10);
  const nMk   = parseInt(mk_std.value||0,10);
  const CITIES = parseCities();

  const counters = {
    // per-city counters: { ZAG:{ wh:3, mk:10, hqW:1, hqM:2 }, SPL:{...}, ... }
  };
  function nextSeq(cityCode, key){
    counters[cityCode] = counters[cityCode] || { wh:0, mk:0, hqW:0, hqM:0 };
    counters[cityCode][key] += 1;
    return counters[cityCode][key];
  }

  const out = [];
  let ci = 0;

  // WH HQ
  for(let i=0;i<nWhHq;i++){
    const city = CITIES[ci % CITIES.length]; ci++;
    const c = cityCode(city);
    const seq = nextSeq(c, "hqW");
    out.push({
      id:`WH-HQ-${c}-${pad(seq,2)}`,
      type:"hqW",
      name:`Glavno skladište ${pad(seq,2)}`,
      city
    });
  }
  // WH standard
  for(let i=0;i<nWh;i++){
    const city = CITIES[ci % CITIES.length]; ci++;
    const c = cityCode(city);
    const seq = nextSeq(c, "wh");
    out.push({
      id:`WH-${c}-${pad(seq,3)}`,
      type:"wh",
      name:`Skladište ${pad(seq,3)}`,
      city
    });
  }
  // MK HQ
  for(let i=0;i<nMkHq;i++){
    const city = CITIES[ci % CITIES.length]; ci++;
    const c = cityCode(city);
    const seq = nextSeq(c, "hqM");
    out.push({
      id:`MK-HQ-${c}-${pad(seq,3)}`,
      type:"hqM",
      name:`Flagship trgovina ${pad(seq,3)}`,
      city
    });
  }
  // MK standard
  for(let i=0;i<nMk;i++){
    const city = CITIES[ci % CITIES.length]; ci++;
    const c = cityCode(city);
    const seq = nextSeq(c, "mk");
    out.push({
      id:`MK-${c}-${pad(seq,4)}`,
      type:"mk",
      name:`Trgovina ${pad(seq,4)}`,
      city
    });
  }

  return out;
}

function label(t){
  if(t==="hqW") return "Skladište HQ";
  if(t==="wh")  return "Skladište";
  if(t==="hqM") return "Trgovina HQ";
  return "Trgovina";
}

function render(){
  const slots = generate();
  grid.innerHTML = slots.map(s => `
    <div class="slot">
      <h3>${s.id}</h3>
      <div>
        <span class="tag ${s.type}">${label(s.type)}</span>
      </div>
      <div class="meta">Grad: <b>${s.city}</b> &middot; Naziv: ${s.name}</div>
    </div>
  `).join("");

  // spremi u memory (da App kasnije može učitati)
  window.__SLOTS__ = slots;
  window.__SCAN__  = { twoD: true, ean: true };
  window.__CITIES__ = parseCities();
}

function save(){
  if(!window.__SLOTS__){ alert("Prvo klikni Generiraj."); return; }
  const data = {
    slots: window.__SLOTS__,
    scan: window.__SCAN__,
    cities: window.__CITIES__,
    saved_at: new Date().toISOString()
  };
  localStorage.setItem("sl_setup", JSON.stringify(data));
  alert("Spremili smo (lokalno). App će ovo moći učitati.");
}

// auto-load iz localStorage (ako postoji)
(function(){
  try{
    const raw = localStorage.getItem("sl_setup");
    if(!raw) return;
    const j = JSON.parse(raw);

    // Prebaci gradove u textarea (ako postoje)
    if (Array.isArray(j.cities) && j.cities.length){
      citiesEl.value = j.cities.join("\n");
    }

    // Pokušaj procijeniti brojeve iz postojećih slotova
    const counts = { wh_hq:0, wh:0, mk_hq:0, mk:0 };
    (j.slots||[]).forEach(s=>{
      if(/^WH-HQ-/.test(s.id)) counts.wh_hq++;
      else if(/^WH-/.test(s.id)) counts.wh++;
      else if(/^MK-HQ-/.test(s.id)) counts.mk_hq++;
      else if(/^MK-/.test(s.id)) counts.mk++;
    });
    if(counts.wh_hq) wh_hq.value = counts.wh_hq;
    if(counts.wh)    wh_std.value = counts.wh;
    if(counts.mk_hq) mk_hq.value = counts.mk_hq;
    if(counts.mk)    mk_std.value = counts.mk;

    render();
  }catch(e){}
})();

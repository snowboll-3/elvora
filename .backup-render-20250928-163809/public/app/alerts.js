const listEl = document.getElementById("list");
const fltEl = document.getElementById("flt");
const refreshBtn = document.getElementById("refresh");

let SLOTS = [];
let DATA = []; // alerts

function loadSlots(){
  try{
    const raw = localStorage.getItem("sl_setup");
    if(!raw) return [];
    const j = JSON.parse(raw);
    return Array.isArray(j.slots) ? j.slots : [];
  }catch(e){ return []; }
}

function genMockAlerts(){
  // Demo: AI signalizira gdje reagirati (iz SLOTS biramo par lokacija)
  const items = [];
  const pick = (arr, n)=>arr.sort(()=>0.5-Math.random()).slice(0, Math.min(n, arr.length));
  const sample = pick(SLOTS, 12);

  const kinds = ["low","expiry","surge","over"];
  const products = ["Mlijeko 1L","Jaja","Jogurt","Rio Mare Tuna","Kruh","Cedevita","Coca-Cola 0.5L","Voda 1.5L","Sir Gauda","Maslac"];

  sample.forEach((s,i)=>{
    const kind = kinds[i % kinds.length];
    const prod = products[i % products.length];
    const qty  = kind==="low" ? (Math.floor(Math.random()*3)+1) : (Math.floor(Math.random()*12)+3);
    const days = kind==="expiry" ? [10,5,3][Math.floor(Math.random()*3)] : null;
    items.push({
      id: `${s.id}::${kind}::${prod}`,
      kind,
      site_id: s.id,
      city: s.city || "-",
      product: prod,
      qty,
      days
    });
  });
  return items;
}

function label(kind){
  if(kind==="low") return "Niska zaliha";
  if(kind==="expiry") return "Istek roka";
  if(kind==="surge") return "Nagla potrošnja";
  if(kind==="over") return "Prevelika zaliha";
  return kind;
}
function tagCls(kind){ return kind==="low"?"low":kind==="expiry"?"expiry":kind==="surge"?"surge":"over"; }

function render(){
  const flt = fltEl.value;
  const rows = DATA.filter(x => flt==="all" ? true : x.kind===flt);

  listEl.innerHTML = rows.map(r => {
    const subtitle = r.kind==="expiry"
      ? `Rok ${r.days} dana · Predmet: ${r.product}`
      : (r.kind==="low"
          ? `Samo ${r.qty} kom · Predmet: ${r.product}`
          : (r.kind==="surge"
              ? `Skok potrošnje · Predmet: ${r.product}`
              : `Višak zalihe · Predmet: ${r.product}`));
    return `
      <div class="card">
        <div>
          <p class="title">${label(r.kind)} — <span>${r.site_id}</span></p>
          <div class="meta">Grad: <b>${r.city}</b></div>
          <div class="tags"><span class="tag ${tagCls(r.kind)}">${label(r.kind)}</span></div>
          <div class="meta" style="margin-top:6px">${subtitle}</div>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="openSite('${encodeURIComponent(r.site_id)}')">Otvori</button>
          <button class="btn ghost" onclick="draft('${encodeURIComponent(r.site_id)}','${encodeURIComponent(r.product)}')">Draft</button>
          <button class="btn ghost" onclick="snooze('${r.id}')">Snooze</button>
          <button class="btn ghost" onclick="resolve('${r.id}')">Resolve</button>
        </div>
      </div>
    `;
  }).join("");
}

window.openSite = function(siteId){
  alert("Otvori detalje: " + decodeURIComponent(siteId) + "\n\n(u praksi: /enterprise/channel.html?id=...)");
};
window.draft = function(siteId, product){
  alert("AI kreira draft narudžbu za: " + decodeURIComponent(siteId) + " · " + decodeURIComponent(product) + "\n\n(u praksi: POST /api/orders/draft)");
};
window.snooze = function(id){
  DATA = DATA.filter(x=>x.id!==id).concat([{...DATA.find(x=>x.id===id), id: id+"::snoozed"}]);
  render();
};
window.resolve = function(id){
  DATA = DATA.filter(x=>x.id!==id);
  render();
};

fltEl.addEventListener("change", render);
refreshBtn.addEventListener("click", init);

function init(){
  SLOTS = loadSlots();
  DATA = genMockAlerts();
  render();
}
init();

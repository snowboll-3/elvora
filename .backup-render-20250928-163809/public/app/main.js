const panel = document.getElementById("panel");
const btnWH = document.getElementById("btnWH");
const btnMK = document.getElementById("btnMK");

// Helper za kartice s metrikama
function metricCard(title, lines=[]){
  return `
    <div class="card2">
      <h3 style="margin:0 0 6px 0">${title}</h3>
      <div class="hint">${lines.join("<br/>")}</div>
    </div>
  `;
}

function renderWarehouse(){
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="ribbon wh" title="Pulsirajuća pomoć – slijedi zelenu traku"></div>
    <div class="row"><div class="label">Mod</div><div class="value"><span class="badge">Warehouse</span></div></div>
    <div class="row"><div class="label">Brzi start</div><div>
      <button class="btn primary" onclick="alert('Camera → ADD (prijem)')">📷 ADD (Prijem)</button>
      <button class="btn ghost" onclick="alert('Camera → USE (izdavanje)')">📷 USE (Izdavanje)</button>
      <span class="hint">Scan SSCC/2D → Qty → Expiry OCR → Confirm</span>
    </div></div>
    <div class="grid" style="margin-top:8px">
      ${metricCard("Stanje", ["Artikli: 12.430", "Palete: 1.842", "Niske zalihe: 37"])}
      ${metricCard("ASN & Transferi", ["Otvoreni ASN: 5", "Transferi u tijeku: 3", "Zakašnjelo: 1"])}
      ${metricCard("AI Izvještaj", ["Predviđena potrošnja: +6.2%", "Risk od isteka: 14 artikala", "Prijedlog narudžbe: 3 drafta"])}
    </div>
    <div style="margin-top:12px">
      <a class="btn ghost" href="/enterprise/golub-channels.html">🏷 Kanali (GOLUB)</a>
      <button class="btn ghost" onclick="alert('Chat s auto-prijevodom')">💬 Chat (auto-translate)</button>
      <button class="btn ghost" onclick="alert('Admin seats & codes')">🪪 Licencije</button>
    </div>
  `;
}

function renderMarket(){
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="ribbon mk" title="Pulsirajuća pomoć – slijedi narančastu traku"></div>
    <div class="row"><div class="label">Mod</div><div class="value"><span class="badge">Market</span></div></div>
    <div class="row"><div class="label">Brzi start</div><div>
      <button class="btn primary" onclick="alert('Camera → ADD (dopuna)')">📷 ADD (Dopuna)</button>
      <button class="btn ghost" onclick="alert('Camera → USE (prodaja/potrošnja)')">📷 USE (Potrošnja)</button>
      <span class="hint">Scan → Qty chips → (Expiry) → Confirm</span>
    </div></div>
    <div class="grid" style="margin-top:8px">
      ${metricCard("Police", ["Artikli na polici: 1.238", "Niske zalihe: 18", "Kritično: 6"])}
      ${metricCard("Dnevni sažetak", ["Potrošnja danas: 427", "Novi prijemi: 2", "Draft narudžbe: 1"])}
      ${metricCard("AI Prijedlog", ["Premjesti 12 × Cola iz Skladišta A", "Narudžba mlijeka za sutra", "Rizik isteka: 4 artikla"])}
    </div>
  `;
}

btnWH.addEventListener("click", renderWarehouse);
btnMK.addEventListener("click", renderMarket);

// Ako želiš da se odmah prikaže jedan mod po defaultu, odkomentiraj:
// renderMarket();
// renderWarehouse();

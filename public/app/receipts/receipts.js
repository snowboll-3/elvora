import { createClient } from "https://unpkg.com/@supabase/supabase-js@2/dist/esm/index.js";

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = sel => document.querySelector(sel);
const file = $("#file");
const mailId = $("#mailId");
const btnParse = $("#btnParse");
const out = $("#out");
const tbody = $("#tbody");
const summary = $("#summary");
const dest = $("#dest");
const btnCommit = $("#btnCommit");
const msg = $("#msg");

let parsed = null;

btnParse.onclick = async () => {
  msg.textContent = "";
  const fd = new FormData();
  if (file.files[0]) fd.append("file", file.files[0]);
  if (mailId.value.trim()) fd.append("mail_id", mailId.value.trim());

  // secure call via Supabase Edge Function (requires session or anon if allowed)
  const { data: { session } } = await sb.auth.getSession();
  const headers = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

  const r = await fetch(`${SUPABASE_URL}/functions/v1/receipts`, { method:"POST", headers, body: fd });
  if (!r.ok) { msg.textContent = "Greška pri analizi primke."; return; }
  parsed = await r.json();  // { items:[{name,ean,qty,uom,lot,exp}], totals:{...}, receipt_id }
  render(parsed);
};

function render(data){
  out.style.display = "block";
  tbody.innerHTML = "";
  let total = 0;
  (data.items||[]).forEach(it=>{
    total += Number(it.qty||0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td contenteditable="true">${it.name||""}</td>
      <td contenteditable="true">${it.ean||""}</td>
      <td contenteditable="true">${it.qty||0}</td>
      <td contenteditable="true">${it.uom||"kom"}</td>
      <td contenteditable="true">${it.lot||""}</td>
      <td contenteditable="true">${it.exp||""}</td>`;
    tbody.appendChild(tr);
  });
  summary.textContent = `Ukupno stavki: ${(data.items||[]).length} • Ukupna količina: ${total}`;
}

btnCommit.onclick = async () => {
  if (!parsed) return;
  // pokupi eventualno ručno korigirane stavke iz tablice:
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const items = rows.map(r=>{
    const tds = r.querySelectorAll("td");
    return {
      name: tds[0].textContent.trim(),
      ean:  tds[1].textContent.trim(),
      qty:  Number(tds[2].textContent.trim()||0),
      uom:  tds[3].textContent.trim()||"kom",
      lot:  tds[4].textContent.trim()||null,
      exp:  tds[5].textContent.trim()||null
    };
  });

  const { data: { user } } = await sb.auth.getUser();
  const market_id = null; // TODO: dohvat iz konteksta ili izbora
  const payload = { receipt_id: parsed.receipt_id, dest: dest.value, items, market_id };

  const { data, error } = await sb.functions.invoke("receipts", { body: payload, headers: {} });
  if (error) { msg.innerHTML = `<span class="warn">Knjiženje nije uspjelo.</span>`; return; }
  msg.innerHTML = `<span class="ok">Knjiženo (${dest.value}). Ref: ${data?.move_id||"-"}</span>`;
};
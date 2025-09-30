(() => {
  // --- DEMO STATE ---
  const state = {
    soldToday: 0,
    items: [
      { sku: "8004030044009", name: "Rio Mare Tuna 4×", cat: "Hrana", expiry: "2025-10-02", qty: 20 },
      { sku: "HR-EGGS-10", name: "Jaja M (10 kom)", cat: "Mliječno", expiry: "2025-09-15", qty: 30, egg: true },
      { sku: "HR-IPA-033", name: "Pivo IPA 0.33L", cat: "Pića", expiry: "2025-09-27", qty: 120 },
      { sku: "3859881859877", name: "Sok Naranca 1L", cat: "Pića", expiry: "2025-10-12", qty: 42 },
      { sku: "8000500310428", name: "Nutella 350g", cat: "Hrana", expiry: "2026-01-05", qty: 15 },
    ],
    learnMap: {} // auto-učenje (sku -> canonical name)
  };

  const $ = sel => document.querySelector(sel);
  const .\public\pro\pro-style.css = sel => Array.from(document.querySelectorAll(sel));

  const tbody = #tbody;
  const kpiStock = #kpiStock;
  const kpiSold = #kpiSold;
  const kpiAlerts = #kpiAlerts;
  const alertsBox = #alerts;
  const snack = #snack;

  const filterCat = #filterCat;
  const search = #search;

  // --- HELPERS ---
  const daysTo = (iso) => {
    if (!iso) return 9999;
    const d = new Date(iso);
    const diff = (d - new Date()) / (1000*60*60*24);
    return Math.floor(diff);
  };
  const statusOf = (item) => {
    const d = daysTo(item.expiry);
    if (d <= 3 || item.qty <= 2) return { cls: "bad", label: "CRVENO – hitno" };
    if (d <= 10 || item.qty <= 5) return { cls: "warn", label: "ŽUTO – pripazi" };
    return { cls: "ok", label: "ZELENO – na lageru" };
  };
  const showSnack = (text) => {
    snack.textContent = text;
    snack.classList.add("show");
    setTimeout(()=> snack.classList.remove("show"), 2000);
  };

  // --- RENDER ---
  function renderKPIs(){
    const total = state.items.reduce((s, it) => s + it.qty, 0);
    const alerts = state.items.filter(it => statusOf(it).cls !== "ok").length;
    kpiStock.textContent = total;
    kpiSold.textContent = state.soldToday;
    kpiAlerts.textContent = alerts;
  }

  function renderAlerts(){
    alertsBox.innerHTML = "";
    const list = [...state.items]
      .map(it => ({it, st: statusOf(it)}))
      .filter(x => x.st.cls !== "ok")
      .sort((a,b) => {
        // redoslijed: CRVENO, ŽUTO; unutar grupe po najbližem roku
        const rank = { bad: 0, warn: 1, ok: 2 };
        const r = rank[a.st.cls] - rank[b.st.cls];
        if (r !== 0) return r;
        return daysTo(a.it.expiry) - daysTo(b.it.expiry);
      });

    list.forEach(({it, st}) => {
      const d = daysTo(it.expiry);
      const div = document.createElement("div");
      div.className = lert ;
      div.innerHTML = 
        <div>
          <div><strong></strong> <span class="pill"></span></div>
          <div style="font-size:.9rem;color:#cbd5e1">Rok:  • Količina:  •  dana</div>
        </div>
        <div class="badge "></div>
      ;
      alertsBox.appendChild(div);
    });
  }

  function renderTable(){
    // filteri
    const q = (search.value || "").toLowerCase();
    const cat = filterCat.value;

    // jaja uvijek prva
    const eggs = state.items.filter(it => /(^|\s)(jaja|egg|eggs)(\s|$)/i.test(it.name) || it.egg);
    const others = state.items.filter(it => !eggs.includes(it));

    const order = [...eggs, ...others];

    tbody.innerHTML = "";
    order.forEach(it => {
      if (cat && it.cat !== cat) return;
      if (q && !(it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q))) return;

      const st = statusOf(it);
      const tr = document.createElement("tr");
      if (it.egg) tr.className = "eggRow";
      tr.innerHTML = 
        <td></td>
        <td> </td>
        <td></td>
        <td></td>
        <td></td>
        <td><span class="badge "></span></td>
        <td>
          <button class="btn small" data-act="minus" data-sku="">−</button>
          <button class="btn small ghost" data-act="plus" data-sku="">+</button>
        </td>
      ;
      tbody.appendChild(tr);
    });
  }

  function renderAll(){
    renderKPIs();
    renderAlerts();
    renderTable();
  }

  // --- ACTIONS ---
  // demo: uvoz fakture (simulira parsiranje PDF/EDI i ažuriranje zalihe)
  function importInvoiceDemo(){
    // primjer: 2 artikla, automatski učenje naziva
    const invoice = [
      { sku: "HR-EGGS-10", name: "JAJA M(10)", qty: 20, expiry: "2025-09-29", cat: "Mliječno" },
      { sku: "HR-IPA-033", name: "PIVO IPA 0.33", qty: 48, expiry: "2025-10-05", cat: "Pića" }
    ];
    invoice.forEach(row => {
      const it = state.items.find(x => x.sku === row.sku);
      if (it){
        it.qty += row.qty;
        it.expiry = row.expiry || it.expiry;
        if (row.name && (!state.learnMap[row.sku] || state.learnMap[row.sku] !== row.name)){
          state.learnMap[row.sku] = row.name; // “učenje” naziva iz fakture
        }
      } else {
        state.items.push({
          sku: row.sku,
          name: row.name,
          cat: row.cat || "Ostalo",
          expiry: row.expiry || null,
          qty: row.qty,
          egg: /(^|\s)(jaja|egg|eggs)(\s|$)/i.test(row.name)
        });
      }
    });
    showSnack("📄 Faktura uvezena");
    renderAll();
  }

  // demo: POS prodaja (smanji količinu)
  function posSaleDemo(){
    const basket = [
      { sku: "HR-IPA-033", qty: 6 },
      { sku: "8004030044009", qty: 2 }
    ];
    basket.forEach(s => {
      const it = state.items.find(x => x.sku === s.sku);
      if (it) it.qty = Math.max(0, it.qty - s.qty);
    });
    state.soldToday += basket.reduce((s, r)=>s+r.qty, 0);
    showSnack("🧾 POS prodaja izvršena");
    renderAll();
  }

  // demo: ručna dopuna
  function restockDemo(){
    const toAdd = [
      { sku: "HR-EGGS-10", qty: 10, expiry: "2025-10-10" }
    ];
    toAdd.forEach(r => {
      const it = state.items.find(x => x.sku === r.sku);
      if (it){
        it.qty += r.qty;
        it.expiry = r.expiry || it.expiry;
      }
    });
    showSnack("📦 Dopuna zaprimljena");
    renderAll();
  }

  // tablica +/- akcije
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const sku = btn.getAttribute("data-sku");
    const it = state.items.find(x => x.sku === sku);
    if (!it) return;
    const act = btn.getAttribute("data-act");
    if (act === "minus") it.qty = Math.max(0, it.qty - 1);
    if (act === "plus") it.qty += 1;
    renderAll();
  });

  // filteri
  filterCat.addEventListener("change", renderTable);
  search.addEventListener("input", renderTable);

  // gumbi
  document.getElementById("btnImport").onclick = importInvoiceDemo;
  document.getElementById("btnSale").onclick = posSaleDemo;
  document.getElementById("btnRestock").onclick = restockDemo;

  // init
  renderAll();
})();

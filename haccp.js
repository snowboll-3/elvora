(() => {
  // Simple mock: zones with safe ranges (°C). Replace with live API later.
  const zones = [
    { id:"Ambient",  target:"+18°C", min: 15, max: 25 },
    { id:"Chilled",  target:"+4°C",  min: 0,  max: 5  },
    { id:"Frozen",   target:"-18°C", min:-25, max:-15 }
  ];

  function colorFor(t, z){
    if(t < z.min || t > z.max) return "red";
    const span = z.max - z.min;
    const near = Math.max(z.min + 0.15*span, z.max - 0.15*span);
    if(t <= near && t >= z.min || t >= near && t <= z.max) return "amber";
    return "green";
  }

  const $zones = document.getElementById("zones");
  const $alerts = document.getElementById("alerts");
  const $tbl = document.getElementById("tbl");

  function row(m){
    return `<tr>
      <td>${m.time}</td>
      <td>${m.zone}</td>
      <td>${m.temp.toFixed(1)}°C</td>
      <td>${m.status.toUpperCase()}</td>
    </tr>`;
  }

  function renderMeasureTable(measures){
    $tbl.innerHTML = `<thead><tr><th>Time</th><th>Zone</th><th>Temp</th><th>Status</th></tr></thead>
                      <tbody>${measures.map(row).join("")}</tbody>`;
  }

  function renderZones(measures){
    $zones.innerHTML = zones.map(z => {
      const latest = measures.filter(m=>m.zone===z.id).slice(-1)[0];
      const c = latest?.status || "green";
      const badge = c==="red"?"🔴":(c==="amber"?"🟡":"🟢");
      return `<div class="zone">
        <div class="zone-head">
          <span class="dot ${c}"></span>
          <strong>${z.id}</strong>
          <span class="muted">Target ${z.target}</span>
        </div>
        <div class="zone-body">
          <div>Current: <b>${latest?latest.temp.toFixed(1):"—"}°C</b></div>
          <div>Spec: ${z.min}…${z.max}°C</div>
          <div>Status: ${badge} ${c.toUpperCase()}</div>
        </div>
      </div>`;
    }).join("");
  }

  function renderAlerts(measures){
    const out = [];
    for(const z of zones){
      const latest = measures.filter(m=>m.zone===z.id).slice(-1)[0];
      if(!latest) continue;
      if(latest.status==="amber"){
        out.push(`🟡 ${z.id}: temp ${latest.temp.toFixed(1)}°C blizu granice — preporuka: dodatno praćenje / check vrata.`);
      }
      if(latest.status==="red"){
        out.push(`🔴 ${z.id}: temp ${latest.temp.toFixed(1)}°C izvan specifikacije — premjestiti robu / servis komore / eskalacija.`);
      }
    }
    $alerts.innerHTML = out.length ? out.map(a=>`<li>${a}</li>`).join("") : "<li>🟢 Nema aktivnih upozorenja.</li>";
  }

  // generate mock data stream
  const measures = [];
  function tick(){ try{ if(window.elvoraBusy) window.elvoraBusy(true);
    const t = new Date().toLocaleTimeString();
    for(const z of zones){
      // base temps
      let base = (z.id==="Ambient") ? 21 : (z.id==="Chilled" ? 4 : -18);
      // add a small random drift
      const drift = (Math.random()-0.5) * (z.id==="Ambient"?2:1.2);
      const temp = base + drift;
      const status = colorFor(temp, z);
      measures.push({time:t, zone:z.id, temp, status});
    }
    // keep last 50
    while(measures.length>50) measures.shift();
    renderZones(measures);
    renderMeasureTable(measures.slice().reverse());
    renderAlerts(measures);
  }

  tick();
  setInterval(tick, 4500); try{ if(window.elvoraBusy) window.elvoraBusy(false);}catch(e){}
})();


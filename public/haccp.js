(() => {
  import("/shared/events.js").catch(()=>{}); // ensure Event Core is registered (window.ElvoraEvents)

  function ev(type, action, payload, meta){
    try{
      if(window.ElvoraEvents && typeof window.ElvoraEvents.emit==="function"){
        window.ElvoraEvents.emit(type, action, payload, meta);
      }
    }catch{}
  }

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

  // emit only on status changes to avoid event spam
  const lastStatus = new Map(); // zone -> "green|amber|red"

  function tick(){
    try{ if(window.elvoraBusy) window.elvoraBusy(true);

      const iso = new Date().toISOString();
      const t = new Date().toLocaleTimeString();

      for(const z of zones){
        // base temps
        let base = (z.id==="Ambient") ? 21 : (z.id==="Chilled" ? 4 : -18);
        // add a small random drift
        const drift = (Math.random()-0.5) * (z.id==="Ambient"?2:1.2);
        const temp = base + drift;
        const status = colorFor(temp, z);

        measures.push({time:t, zone:z.id, temp, status});

        // Always log measurement to Event Core (structured journal)
        ev("HACCP","MEASUREMENT", clean({
          zone: z.id,
          temp: Number(temp.toFixed(2)),
          status,
          spec: { min:z.min, max:z.max, target:z.target },
          ts: iso
        }), { hub:"haccp",
          source: "haccp.js"
        });

        // Emit alert only when status changes into amber/red or back to green
        const prev = lastStatus.get(z.id);
        if(prev !== status){
          lastStatus.set(z.id, status);

          if(status==="amber"){
            ev("HACCP","ALERT_NEAR_LIMIT", clean({
              zone: z.id,
              temp: Number(temp.toFixed(2)),
              status,
              ts: iso
            }), { hub:"haccp",
              source:"haccp.js"
            });
          } else if(status==="red"){
            ev("HACCP","ALERT_OUT_OF_SPEC", clean({
              zone: z.id,
              temp: Number(temp.toFixed(2)),
              status,
              ts: iso
            }), { hub:"haccp",
              source:"haccp.js"
            });
          } else if(status==="green" && (prev==="amber" || prev==="red")){
            ev("HACCP","RECOVERY_OK", clean({
              zone: z.id,
              from: prev,
              temp: Number(temp.toFixed(2)),
              ts: iso
            }), { hub:"haccp",
              source:"haccp.js"
            });
          }
        }
      }

      // keep last 50
      while(measures.length>50) measures.shift();
      renderZones(measures);
      renderMeasureTable(measures.slice().reverse());
      renderAlerts(measures);

    } finally {
      try{ if(window.elvoraBusy) window.elvoraBusy(false); }catch(e){}
    }
  }

  tick();
  setInterval(tick, 4500);
})();





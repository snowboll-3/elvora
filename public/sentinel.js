(() => {
  const API = "http://localhost:3035";
  const KEY = "gps-dev-local-123";

  // ---- state ----
  const queue = [];
  const seen = new Set(); // dedupe po id
  let idx = 0;

  // ---- UI ----
  const el = document.createElement("div");
  el.id = "elvora-sentinel";
  el.style.cssText = 
    position: fixed; inset: 0; z-index: 99999;
    display: none;
    background: rgba(11,15,20,.72);
    backdrop-filter: blur(10px);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  ;

  el.innerHTML = 
    <div id="sv-card" style="
      position:absolute; left:50%; top:18%;
      transform:translateX(-50%);
      width:min(560px, calc(100vw - 24px));
      background: rgba(11,15,20,.92);
      border: 1px solid rgba(25,181,255,.35);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,.45);
      overflow:hidden;
    ">
      <div style="padding:14px 14px 10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <div style="width:10px; height:10px; border-radius:999px; background:#39d98a;"></div>
          <div style="color:#9fb0c6; font-size:12px; letter-spacing:.08em; text-transform:uppercase;">
            Sentinel Vision • OPEN
          </div>
        </div>
        <button id="sv-close" style="
          background:transparent; border:1px solid rgba(159,176,198,.25);
          color:#9fb0c6; border-radius:10px; padding:6px 10px; cursor:pointer;
        ">Zatvori</button>
      </div>

      <div style="padding:0 14px 14px;">
        <div id="sv-title" style="color:#fff; font-size:18px; font-weight:700; line-height:1.2;">—</div>
        <div id="sv-meta" style="margin-top:6px; color:#9fb0c6; font-size:12px;">—</div>

        <div style="margin-top:12px; display:flex; gap:10px; align-items:center; justify-content:space-between;">
          <div id="sv-counter" style="color:#9fb0c6; font-size:12px;">0 / 0</div>
          <div style="display:flex; gap:8px;">
            <button id="sv-prev" style="background:rgba(159,176,198,.10); border:1px solid rgba(159,176,198,.18); color:#fff; border-radius:12px; padding:10px 12px; cursor:pointer;">
              ◀
            </button>
            <button id="sv-ack" style="background:rgba(57,217,138,.16); border:1px solid rgba(57,217,138,.55); color:#fff; border-radius:12px; padding:10px 12px; cursor:pointer;">
              ACK
            </button>
            <button id="sv-next" style="background:rgba(159,176,198,.10); border:1px solid rgba(159,176,198,.18); color:#fff; border-radius:12px; padding:10px 12px; cursor:pointer;">
              ▶
            </button>
          </div>
        </div>

        <div style="margin-top:10px; color:#9fb0c6; font-size:12px;">
          Swipe: <b style="color:#fff;">lijevo/desno</b> mijenja incident • Swipe <b style="color:#fff;">gore</b> = ACK
        </div>
      </div>
    </div>
  ;

  document.body.appendChild(el);

  const  = el.querySelector("#sv-title");
  const   = el.querySelector("#sv-meta");
  const    = el.querySelector("#sv-counter");
  const  = el.querySelector("#sv-close");
  const   = el.querySelector("#sv-prev");
  const -1  = el.querySelector("#sv-next");
  const    = el.querySelector("#sv-ack");
  const   = el.querySelector("#sv-card");

  function show() { el.style.display = "block"; }
  function hide() { el.style.display = "none"; }

  function current() { return queue[idx] || null; }

  function render() {
    const it = current();
    if (!it) {
      .textContent = "Nema OPEN incidenata";
      .textContent  = "";
      .textContent   = "0 / 0";
      return;
    }
    .textContent = it.summary || "(no summary)";
    .textContent  = severity:  • opened_at:  • id: ;
    .textContent   = ${idx + 1} / ;
    show();
  }

  function pushIncident(it) {
    if (!it || !it.id) return;
    if (seen.has(it.id)) return;
    seen.add(it.id);
    queue.push(it);
    idx = queue.length - 1;
    render();
  }

  async function ackCurrent() {
    const it = current();
    if (!it) return;
    try {
      const r = await fetch(${API}/api/incidents/ack, {
        method: "POST",
        headers: { "content-type":"application/json" },
        body: JSON.stringify({ id: it.id })
      });
      if (!r.ok) return;

      // ukloni iz queue
      const removed = queue.splice(idx, 1)[0];
      if (removed?.id) seen.delete(removed.id);
      if (idx >= queue.length) idx = Math.max(0, queue.length - 1);

      if (queue.length === 0) hide();
      else render();
    } catch {}
  }

  // buttons
  .onclick = hide;
  .onclick = () => { if (queue.length) { idx = (idx - 1 + queue.length) % queue.length; render(); } };
  -1.onclick = () => { if (queue.length) { idx = (idx + 1) % queue.length; render(); } };
  .onclick  = ackCurrent;

  // swipe
  let sx=0, sy=0, dragging=false;
  .addEventListener("pointerdown", (e) => { dragging=true; sx=e.clientX; sy=e.clientY; .setPointerCapture(e.pointerId); });
  .addEventListener("pointerup", async (e) => {
    if (!dragging) return;
    dragging=false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;

    if (Math.abs(dy) > 60 && dy < 0) { await ackCurrent(); return; } // swipe up = ACK
    if (Math.abs(dx) > 60) {
      if (dx > 0) -1.click(); else .click();
    }
  });

  // SSE connect
  function connect() {
    // EventSource ne podržava custom header, pa koristimo fetch stream (SSE) ručno
    fetch(${API}/api/incidents/stream, { headers: { "x-elvora-key": KEY } })
      .then(res => {
        if (!res.ok) return;
        const reader = res.body.getReader();
        const dec = new TextDecoder("utf-8");
        let buf = "";

        function pump() {
          return reader.read().then(({done, value}) => {
            if (done) return;
            buf += dec.decode(value, { stream:true });

            // SSE parsing (minimal)
            let idxSep;
            while ((idxSep = buf.indexOf("\n\n")) !== -1) {
              const chunk = buf.slice(0, idxSep);
              buf = buf.slice(idxSep + 2);

              let eventType = "message";
              let data = "";
              chunk.split("\n").forEach(line => {
                if (line.startsWith("event:")) eventType = line.slice(6).trim();
                if (line.startsWith("data:"))  data += line.slice(5).trim();
              });

              if (eventType === "incident") {
                try { pushIncident(JSON.parse(data)); } catch {}
              }
            }
            return pump();
          });
        }
        return pump();
      })
      .catch(() => {});
  }

  // start
  connect();
})();
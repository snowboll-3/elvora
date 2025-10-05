(() => {
  const c = document.getElementById("heroNetwork");
  if (!c) return;
  const ctx = c.getContext("2d");

  let w, h, DPR = Math.max(1, window.devicePixelRatio || 1);
  const NODES = 120;                // broj čvorova
  const LINK_DIST = 170;            // max udaljenost za liniju
  const SPEED = 0.18;               // brzina kretanja
  const BLUE = "rgba(25,181,255,";  // baza boje

  const nodes = [];

  function resize(){
    const rect = c.parentElement.getBoundingClientRect();
    w = Math.floor(rect.width);
    h = Math.floor(Math.max(rect.height, 520));
    c.width  = Math.floor(w * DPR);
    c.height = Math.floor(h * DPR);
    c.style.width  = w + "px";
    c.style.height = h + "px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  function init(){
    nodes.length = 0;
    for (let i=0;i<NODES;i++){
      nodes.push({
        x: Math.random()*w,
        y: Math.random()*h,
        vx: (Math.random()*2-1)*SPEED,
        vy: (Math.random()*2-1)*SPEED,
        r: 1.3 + Math.random()*1.7
      });
    }
  }

  function step(){
    ctx.clearRect(0,0,w,h);

    // linije
    for (let i=0;i<nodes.length;i++){
      const a = nodes[i];
      for (let j=i+1;j<nodes.length;j++){
        const b = nodes[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const d = Math.hypot(dx,dy);
        if (d < LINK_DIST){
          const alpha = 1 - d/LINK_DIST;
          ctx.strokeStyle = BLUE + (0.25*alpha) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }

    // točkice
    for (const n of nodes){
      ctx.fillStyle = BLUE + "0.95)";
      ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();

      // glow
      const g = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,8);
      g.addColorStop(0, BLUE + "0.45)");
      g.addColorStop(1, "rgba(25,181,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x,n.y,8,0,Math.PI*2); ctx.fill();

      // pomak
      n.x += n.vx; n.y += n.vy;
      if (n.x < -10) n.x = w+10; if (n.x > w+10) n.x = -10;
      if (n.y < -10) n.y = h+10; if (n.y > h+10) n.y = -10;
    }
    requestAnimationFrame(step);
  }

  function boot(){
    resize(); init(); step();
  }
  window.addEventListener("resize", () => { resize(); init(); });
  // opet pokreni kad se tab vrati u fokus, sprječava "zamrzavanje"
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { resize(); init(); } });

  // čekaj da se fontovi/komponenta stabiliziraju
  setTimeout(boot, 50);
})();

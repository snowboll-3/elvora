(() => {
  document.getElementById("y").textContent = new Date().getFullYear();
  const cvs = document.getElementById("bg"); if(!cvs) return;
  const ctx = cvs.getContext("2d");
  let w,h,stars;
  function resize(){ w=cvs.width=innerWidth; h=cvs.height=innerHeight; stars=Array.from({length:140},()=>({x:Math.random()*w,y:Math.random()*h,z:0.2+Math.random()*1.4})) }
  resize(); addEventListener("resize",resize);
  (function tick(){ ctx.clearRect(0,0,w,h); for(const s of stars){ s.y+=0.3+s.z; if(s.y>h) s.y=0; ctx.fillStyle='rgba(127,225,255,'+(0.5*s.z)+')'; ctx.fillRect(s.x,s.y,2,2);} requestAnimationFrame(tick) })();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js'); }
})();

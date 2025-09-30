/**
 * Jednostavna command palette (Ctrl/⌘+K).
 * Komande su primjer – prilagodi ih svom appu.
 */
(function(){
  const style = document.createElement("style");
  style.textContent = `
  .cp-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:none;z-index:9998}
  .cp{position:fixed;left:50%;top:15%;transform:translateX(-50%);width:min(720px,92vw);background:#0f1420;border:1px solid #2b3340;border-radius:12px;display:none;z-index:9999}
  .cp input{width:100%;box-sizing:border-box;padding:14px 16px;background:#0b0f14;border:0;color:#e7ebf0;font:16px system-ui}
  .cp ul{list-style:none;margin:0;padding:8px;max-height:50vh;overflow:auto}
  .cp li{padding:10px 14px;cursor:pointer;border-radius:8px}
  .cp li:hover,.cp li:focus{background:#1a2230}
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement("div"); backdrop.className="cp-backdrop";
  const root = document.createElement("div"); root.className="cp";
  const input = document.createElement("input"); input.placeholder="Type a command…";
  const list = document.createElement("ul");
  root.appendChild(input); root.appendChild(list);
  document.body.appendChild(backdrop); document.body.appendChild(root);

  const commands = [
    { id:"scan", label:"Start Scan", run(){ location.href="/?action=scan"; } },
    { id:"inventory", label:"Open Inventory", run(){ location.href="/?view=inventory"; } },
    { id:"report", label:"Open Reports", run(){ location.href="/?view=reports"; } },
    { id:"export", label:"Export All (ZIP)", run(){ location.href="/api/export"; } },
    { id:"health", label:"Health Check", async run(){ location.href="/api/health"; } }
  ];

  function open() {
    backdrop.style.display="block"; root.style.display="block";
    input.value=""; render(commands); input.focus();
  }
  function close() { backdrop.style.display="none"; root.style.display="none"; }

  function render(items) {
    list.innerHTML="";
    items.forEach(c=>{
      const li=document.createElement("li"); li.tabIndex=0; li.textContent=c.label;
      li.addEventListener("click",()=>{ close(); c.run(); });
      li.addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ close(); c.run(); }});
      list.appendChild(li);
    });
  }
  input.addEventListener("input",()=>{
    const q=input.value.toLowerCase();
    const filtered=commands.filter(c=>c.label.toLowerCase().includes(q));
    render(filtered);
  });
  backdrop.addEventListener("click", close);
  window.addEventListener("keydown",(e)=>{
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if ((isMac && e.metaKey && e.key.toLowerCase()==="k") || (!isMac && e.ctrlKey && e.key.toLowerCase()==="k")) {
      e.preventDefault(); (root.style.display==="block") ? close() : open();
    }
    if (e.key==="Escape" && root.style.display==="block") close();
  });
})();

(()=> {
  function toast(msg){
    try{
      let t=document.getElementById("elv_toast");
      if(!t){ t=document.createElement("div"); t.id="elv_toast"; t.style.cssText="position:fixed;right:14px;bottom:14px;background:rgba(0,0,0,.7);color:#fff;padding:10px 12px;border-radius:10px;border:1px solid #2b3b55;z-index:9999"; document.body.appendChild(t); }
      t.textContent=msg; t.style.opacity="1"; setTimeout(()=>t.style.opacity="0.0",1800);
    }catch(e){ alert(msg); }
  }
  document.addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-action]"); if(!btn) return;
    toast("Action: "+btn.getAttribute("data-action"));
  });
})();

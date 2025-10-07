(()=>{ 
  document.addEventListener("click",e=>{
    if(e.target && e.target.id==="testPush"){
      if(!("Notification" in window)){ alert("Browser notifikacije nisu podržane."); return; }
      Notification.requestPermission().then(p=>{
        if(p!=="granted"){ alert("Dopustite notifikacije u pregledniku."); return; }
        new Notification("Elvora", { body:"Test notifikacija uspješna 🚀", icon:"/assets/icon-192.png" });
      });
    }
  });
})();

/* Elvora • event-core.js (alias)
   This file is kept for backward compatibility.
   Canonical implementation is in /shared/events.js.
*/
(function(){
  try{
    // Load canonical Event Core if not already loaded
    if(!(window.ElvoraEvents && typeof window.ElvoraEvents.emit==="function")){
      var s=document.createElement("script");
      s.src="/shared/events.js";
      s.async=true;
      document.head.appendChild(s);
    }
  }catch{}
})();

(() => {
  const $ = s=>document.querySelector(s);
  $("#btnMagic")?.addEventListener("click",()=>{
    const e=$("#email")?.value?.trim();
    alert(e?("Magic link poslan na: "+e):"Upiši e-mail.");
  });
  $("#btnLogin")?.addEventListener("click",()=>{
    const e=$("#email")?.value?.trim(), otp=$("#otp")?.value?.trim();
    alert(e?("Prijava: "+e+(otp?(" (kod "+otp+")"):"")):"Upiši e-mail.");
  });
  $("#btnRestore")?.addEventListener("click",()=>{
    const c=$("#restoreCode")?.value?.trim();
    alert(c?("Obnova pokrenuta za kod: "+c):"Upiši kod za obnovu.");
    // TODO: fetch('/api/restore', {method:'POST', body: JSON.stringify({code:c})})
  });
})();

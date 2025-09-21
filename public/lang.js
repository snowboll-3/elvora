window.ElvoraI18N=(function(){
  let dict={}, lang=(localStorage.getItem("lang")||navigator.language||"en").slice(0,2);
  async function load(){
    try{
      const r=await fetch("/i18n.json"); dict=await r.json();
    }catch(e){ dict={}; }
    apply();
  }
  function t(k){ return (dict[lang]&&dict[lang][k])|| (dict.en&&dict.en[k]) || k; }
  function set(l){ lang=l; localStorage.setItem("lang",l); apply(); }
  function apply(){
    document.querySelectorAll("[data-t]").forEach(el=>el.textContent=t(el.getAttribute("data-t")));
    document.documentElement.setAttribute("lang",lang);
  }
  return {load,set,t};
})();
document.addEventListener("DOMContentLoaded",()=>ElvoraI18N.load());

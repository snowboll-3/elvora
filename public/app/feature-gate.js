(async()=>{
  try{
    const res = await fetch('/features.json?t='+Date.now()).catch(()=>null);
    const feat = res && res.ok ? await res.json() : { has_ai_receipts:false }; // default bez licence
    const has = !!feat.has_ai_receipts;

    // Svi elementi koji traže AI Primke
    document.querySelectorAll('[data-feature=""ai_receipts""]').forEach(el=>{
      if (has) {
        el.classList.remove('locked');
        // ostavi postojeći href ako postoji; ako nema, stavi placeholder na pravu stranicu kada je implementiramo
        if (!el.getAttribute('href')) el.setAttribute('href','/app/receipts/index.html');
      } else {
        el.classList.add('locked');
        // preusmjeri na promo ako korisnik nema licencu
        el.setAttribute('href','/promo/ai-receipts.html');
      }
    });
  }catch(e){ console.warn('feature-gate', e); }
})();
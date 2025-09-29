;(()=>{try{
  const ABS=/^(https?:)?\/\//; const isAbs=s=>ABS.test(s)||s.startsWith('/')||s.startsWith('data:'); const ver=Date.now();
  // IMG -> /assets/<file>?v=ver
  document.querySelectorAll('img[src]').forEach(img=>{
    const s=img.getAttribute('src')||'';
    if(!isAbs(s)&&/\.[a-z0-9]{3,4}($|\?)/i.test(s)){
      const f=s.split('/').pop().toLowerCase();
      img.src='/assets/'+f+'?v='+ver;
    }
  });
  // inline background-image -> /assets/<file>?v=ver
  document.querySelectorAll('[style*="background-image"]').forEach(el=>{
    const m=(el.style.backgroundImage||'').match(/url\(["']?([^"')]+)["']?\)/i);
    if(m){
      const s=m[1];
      if(!isAbs(s)){
        const f=s.split('/').pop().toLowerCase();
        el.style.backgroundImage=url(/assets/?v=2025.09.29.172024);
      }
    }
  });
  // Hub pločice -> navigacija
  const map=new Map([
    ['početna','/app/home.html'],['home','/app/home.html'],
    ['poslovni','/app/business.html'],['business','/app/business.html'],
    ['skladište','/app/inventory.html'],['inventory','/app/inventory.html'],
    ['logistika','/app/logistics.html'],['logistics','/app/logistics.html'],
    ['ljekarna','/app/pharmacy.html'],['pharma','/app/pharmacy.html'],
    ['operacije','/app/operations.html'],['operations','/app/operations.html'],
    ['postavke','/app/settings.html'],['settings','/app/settings.html']
  ]);
  const norm=s=>(s||'').toLowerCase();
  Array.from(document.querySelectorAll('a,button,[role="button"],.card,li,div,section,article,h2,h3,h4')).forEach(el=>{
    const t=norm(el.textContent);
    for (const [k,href] of map.entries()){
      if (t.includes(k)&&!el.dataset.wired){
        el.style.cursor='pointer';
        el.dataset.wired='1';
        el.addEventListener('click',()=>location.href=href,{once:true});
        break;
      }
    }
  });
}catch(e){console&&console.warn('main.js init',e);}})();
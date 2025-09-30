(()=> {
  const DICT = {
    hr: {
      t_hub_title: "Elvora · Hub",
      nav_product: "Proizvod",
      h_hub: "Hub",
      grp_core: "Osnovno",
      grp_tools: "Alati",
      card_home: "Home (Hladnjak)",
      badge_3d: "3D Hladnjak",
      desc_home: "Kućni skener + pregled hladnjaka.",
      card_market: "Market Hub",
      badge_planogram: "Planogram",
      desc_market: "Police, backroom i mini-skladište.",
      card_pharmacy: "Pharmacy Hub",
      badge_coldchain: "Cold chain",
      desc_pharmacy: "Lot/rok, HACCP, recall i audit.",
      card_warehouse: "Warehouse Hub",
      badge_docks: "Rampe & Dokovi",
      desc_warehouse: "Kapacitet, rampe i 3D navigacija.",
      card_venue: "Venue Hub",
      badge_sites: "Lokacije",
      desc_venue: "Hoteli/kafići/eventi: opskrba + HACCP.",
      desc_haccp: "Zone i alarmi, CSV/PDF export.",
      card_scanner: "Web skener",
      desc_scanner: "Kamera + OCR, OFF lookup.",
      card_settings: "Postavke",
      desc_settings: "Prijava/obnova, uređaji i senzori.",
      card_devices: "Uređaji",
      desc_devices: "Pregled i upravljanje uređajima."
    },
    en: {
      t_hub_title: "Elvora · Hub",
      nav_product: "Product",
      h_hub: "Hub",
      grp_core: "Core",
      grp_tools: "Tools",
      card_home: "Home (Fridge)",
      badge_3d: "3D Fridge",
      desc_home: "Household scanner + fridge overview.",
      card_market: "Market Hub",
      badge_planogram: "Planogram",
      desc_market: "Shelves, backroom and in-store stock.",
      card_pharmacy: "Pharmacy Hub",
      badge_coldchain: "Cold chain",
      desc_pharmacy: "LOT/expiry, HACCP, recalls and audit.",
      card_warehouse: "Warehouse Hub",
      badge_docks: "Docks & Ramps",
      desc_warehouse: "Capacity, docks and 3D navigation.",
      card_venue: "Venue Hub",
      badge_sites: "Sites",
      desc_venue: "Hotels/cafés/events: supply + HACCP.",
      desc_haccp: "Zones and alerts, CSV/PDF export.",
      card_scanner: "Web Scanner",
      desc_scanner: "Camera + OCR, OFF lookup.",
      card_settings: "Settings",
      desc_settings: "Auth/restore, devices and sensors.",
      card_devices: "Devices",
      desc_devices: "Manage and monitor devices."
    }
  };

  function applyI18n(lang){
    const dict = DICT[lang] || DICT.hr;
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const k = el.getAttribute("data-i18n");
      if(dict[k]) el.textContent = dict[k];
    });
    // update <html lang=…>
    document.documentElement.setAttribute("lang", lang);
    // button label
    const btn = document.getElementById("langBtn");
    if(btn) btn.textContent = (lang==="hr" ? "EN" : "HR");
    localStorage.setItem("elvoraLang", lang);
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    const saved = localStorage.getItem("elvoraLang") || "hr";
    applyI18n(saved);
    const btn = document.getElementById("langBtn");
    if(btn){
      btn.addEventListener("click", ()=>{
        const cur = localStorage.getItem("elvoraLang") || "hr";
        applyI18n(cur==="hr" ? "en" : "hr");
      });
    }
  });
})();
;(()=>{  // extend dict (Product)
  if(!window.DICT_EXT) window.DICT_EXT={};
  window.DICT_EXT.prod = {
    hr: {
      prod_title:"Elvora · Product",
      nav_hub:"Hub", nav_product:"Proizvod",
      prod_h2:"Što Elvora nudi",
      prod_intro:"AI Scan • Track • Predict. Elvora je PWA koja objedinjuje skeniranje, HACCP, logistiku i 3D prikaze skladišta/marketâ.",
      p_demo:"Demo vizual", p_video_hint:"Ovdje ide kratki 30–60s video ili 3D animacija.",
      t_scan:"Sken", t_ocr:"OCR", t_3d:"3D", t_planogram:"Planogram", t_pos:"POS", t_backroom:"Backroom",
      t_exp:"Rok", t_recall:"Recall", t_docks:"Rampe", t_capacity:"Kapacitet",
      t_hotels:"Hoteli", t_cafes:"Kafići", t_events:"Eventi",
      p_home_h:"Home (Hladnjak)", p_home_1:"Skeniranje bar/QR koda + OCR naziva i roka.", p_home_2:"3D pregled hladnjaka s policama i pregradama.", p_home_3:"Praćenje rokova – AI upozorenja i list za bacanje.",
      p_market_h:"Market Hub", p_market_1:"3D layout polica + backroom mini-skladište.", p_market_2:"Automatsko upozorenje na out-of-stock i isteke.", p_market_3:"Sync s POS-om i brzi zadaci za osoblje.",
      p_pharma_h:"Pharmacy Hub", p_pharma_1:"Sken LOT/batch, provjera roka i serije.", p_pharma_2:"Cold-chain nadzor (chilled/frozen) s alarmima.", p_pharma_3:"Recall alati i audit trail.",
      p_wh_h:"Warehouse Hub", p_wh_1:"AI raspored utovara/istovara po rampama.", p_wh_2:"Kontrola tonaže po vozilu i upozorenja.", p_wh_3:"3D navigacija vozila do točne rampe.",
      p_venue_h:"Venue Hub", p_venue_1:"Više lokacija (grad/objekt) s vlastitim bojama/oznakama.", p_venue_2:"Zadaci i obavijesti timu na jeziku radnika.", p_venue_3:"HACCP zone i eksport PDF izvješća.",
      back_hub:"← Natrag na Hub"
    },
    en: {
      prod_title:"Elvora · Product",
      nav_hub:"Hub", nav_product:"Product",
      prod_h2:"What Elvora offers",
      prod_intro:"AI Scan • Track • Predict. A PWA unifying scanning, HACCP, logistics and 3D warehouse/market views.",
      p_demo:"Demo visual", p_video_hint:"Place a short 30–60s video or 3D animation here.",
      t_scan:"Scan", t_ocr:"OCR", t_3d:"3D", t_planogram:"Planogram", t_pos:"POS", t_backroom:"Backroom",
      t_exp:"Expiry", t_recall:"Recall", t_docks:"Docks", t_capacity:"Capacity",
      t_hotels:"Hotels", t_cafes:"Cafés", t_events:"Events",
      p_home_h:"Home (Fridge)", p_home_1:"Scan bar/QR + OCR name/expiry.", p_home_2:"3D fridge view with shelves.", p_home_3:"Expiry tracking with AI alerts and discard list.",
      p_market_h:"Market Hub", p_market_1:"3D shelves + backroom stock.", p_market_2:"Auto out-of-stock & expiry alerts.", p_market_3:"POS sync and quick staff tasks.",
      p_pharma_h:"Pharmacy Hub", p_pharma_1:"Scan LOT/batch and expiry.", p_pharma_2:"Cold-chain monitoring with alerts.", p_pharma_3:"Recall tools and audit trail.",
      p_wh_h:"Warehouse Hub", p_wh_1:"AI dock/slot scheduling for load/unload.", p_wh_2:"Vehicle weight control with warnings.", p_wh_3:"3D navigation to the exact ramp.",
      p_venue_h:"Venue Hub", p_venue_1:"Multi-site (city/venue) with custom colors and tags.", p_venue_2:"Tasks/alerts to staff in their language.", p_venue_3:"HACCP zones and PDF export.",
      back_hub:"← Back to Hub"
    }
  };

  document.addEventListener("DOMContentLoaded", ()=>{
    // spajamo dodatne ključeve u postojeći rječnik (ako ga koristiš)
    if(window.DICT && window.DICT_EXT && window.DICT_EXT.prod){
      for(const lang of Object.keys(window.DICT_EXT.prod)){
        window.DICT[lang] = Object.assign({}, window.DICT[lang]||{}, window.DICT_EXT.prod[lang]);
      }
    }
    // auto primijeni na ovoj stranici
    const cur = localStorage.getItem("elvoraLang") || "hr";
    if(window.applyI18n) window.applyI18n(cur);
  });
})();

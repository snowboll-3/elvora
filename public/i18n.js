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

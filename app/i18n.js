/* ultra-light i18n: auto detektira jezik i vraća tekstove */
window.i18n=(function(){
  const M = {
    hr:{scan_date:"Skenirajte datum",unknown:"Nepoznat proizvod",added:"Dodano u hladnjak",expiry:"Rok trajanja"},
    en:{scan_date:"Scan the date",unknown:"Unknown product",added:"Added to fridge",expiry:"Expiry"},
    de:{scan_date:"Datum scannen",unknown:"Unbekanntes Produkt",added:"Zum Kühlschrank hinzugefügt",expiry:"MHD"},
    it:{scan_date:"Scansiona la data",unknown:"Prodotto sconosciuto",added:"Aggiunto al frigo",expiry:"Scadenza"},
    es:{scan_date:"Escanear la fecha",unknown:"Producto desconocido",added:"Añadido al frigorífico",expiry:"Caducidad"},
  };
  const pick = (code)=> (M[code]||M[code?.split('-')[0]]||M.en);
  const L = pick(navigator.language);
  return (k)=>L[k]||k;
})();

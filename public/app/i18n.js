export const I18N = {
  en: { scan_date: "Scan the expiry date", name: "Name", time: "Time", expiry: "Expiry", unknown: "Unknown product", ok:"OK" },
  hr: { scan_date: "Skenirajte datum roka", name: "Naziv", time: "Vrijeme", expiry: "Rok trajanja", unknown: "Nepoznat proizvod", ok:"U redu" },
  de: { scan_date: "Haltbarkeitsdatum scannen", name: "Name", time: "Zeit", expiry: "Ablaufdatum", unknown: "Unbekanntes Produkt", ok:"OK" },
  it: { scan_date: "Scansiona la data di scadenza", name: "Nome", time: "Ora", expiry: "Scadenza", unknown: "Prodotto sconosciuto", ok:"OK" },
  es: { scan_date: "Escanea la fecha de caducidad", name: "Nombre", time: "Hora", expiry: "Caducidad", unknown: "Producto desconocido", ok:"OK" }
};
const lang = (navigator.language || 'en').split('-')[0].toLowerCase();
export const t = (k) => (I18N[lang]?.[k] ?? I18N.en[k] ?? k);

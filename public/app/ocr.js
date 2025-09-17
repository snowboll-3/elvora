/**
 * Lightweight OCR za datume roka. Lazy-load Tesseract.js s CDN-a.
 * CSP mora dozvoliti https://cdn.jsdelivr.net (vidi _headers ispod).
 */
let tPromise = null;
async function loadTesseract() {
  if (!tPromise) {
    tPromise = (async () => {
      const mod = await import("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
      // CDN putevi za workere i jezike (en + hr)
      const corePath = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js";
      const worker = await mod.createWorker({
        corePath,
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0_best"
      });
      await worker.loadLanguage("eng+hrv");
      await worker.initialize("eng+hrv");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789./-",
        preserve_interword_spaces: "1"
      });
      return worker;
    })();
  }
  return tPromise;
}

/**
 * ocrDate(imageBitmap | HTMLImageElement | HTMLCanvasElement)
 * Vraća string i grubu normalizaciju (YYYY-MM-DD ako je moguće).
 */
export async function ocrDate(img) {
  const worker = await loadTesseract();
  const { data } = await worker.recognize(img);
  const raw = (data?.text || "").trim();
  const norm = normalizeDate(raw);
  return { raw, norm };
}

function normalizeDate(s) {
  const str = s.replace(/\s+/g, " ").toLowerCase();
  // 3 glavna formata: dd.mm.yyyy, yyyy-mm-dd, dd/mm/yy
  const m1 = str.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);
  const m2 = str.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  let y,m,d;
  if (m2) { y=+m2[1]; m=+m2[2]; d=+m2[3]; }
  else if (m1) {
    d=+m1[1]; m=+m1[2]; y=+m1[3]; if (y<100) y+=2000;
  }
  if (y && m>=1 && m<=12 && d>=1 && d<=31) {
    return `${y.toString().padStart(4,"0")}-${m.toString().padStart(2,"0")}-${d.toString().padStart(2,"0")}`;
  }
  return null;
}

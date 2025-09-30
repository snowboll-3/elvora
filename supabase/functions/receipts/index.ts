import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OCR_PROVIDER = (Deno.env.get("OCR_PROVIDER") || "none").toLowerCase();
const OCRSPACE_KEY = Deno.env.get("OCRSPACE_KEY") || "";
const AZURE_OCR_ENDPOINT = Deno.env.get("AZURE_OCR_ENDPOINT") || "";
const AZURE_OCR_KEY = Deno.env.get("AZURE_OCR_KEY") || "";
const GCV_KEY = Deno.env.get("GCV_KEY") || "";

const sr = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type ParsedItem = { name:string; ean?:string|null; qty:number; uom?:string; lot?:string|null; exp?:string|null };

function ok(json:unknown, init:ResponseInit={}){ return new Response(JSON.stringify(json), { status:200, headers:{ "content-type":"application/json; charset=utf-8", ...init.headers } }) }
function bad(msg:string, code=400){ return new Response(JSON.stringify({error:msg}), { status:code, headers:{ "content-type":"application/json; charset=utf-8" }}) }

async function ocr_none(_:Uint8Array, filename:string): Promise<string> {
  let hint = filename.toLowerCase();
  const lines:string[] = [];
  if (hint.includes("cola")) lines.push("Coca-Cola gajba x 2");
  if (hint.includes("pivo")) lines.push("Pivo 0.5L x 24");
  if (!lines.length) lines.push("Artikl x 1");
  return lines.join("\n");
}

async function ocr_ocrspace(bytes:Uint8Array, filename:string): Promise<string> {
  if (!OCRSPACE_KEY) return await ocr_none(bytes, filename);
  const form = new FormData();
  form.append("language", "hr");
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");
  form.append("file", new Blob([bytes]));
  const r = await fetch("https://api.ocr.space/parse/image", { method: "POST", headers: { apikey: OCRSPACE_KEY }, body: form });
  if (!r.ok) return await ocr_none(bytes, filename);
  const j = await r.json();
  const text = (j?.ParsedResults?.[0]?.ParsedText || "") as string;
  return text || (await ocr_none(bytes, filename));
}

async function ocr_azure(bytes:Uint8Array, filename:string): Promise<string> {
  if (!AZURE_OCR_ENDPOINT || !AZURE_OCR_KEY) return await ocr_none(bytes, filename);
  const submit = await fetch(`${AZURE_OCR_ENDPOINT}vision/v3.2/read/analyze`, {
    method:"POST",
    headers:{ "Ocp-Apim-Subscription-Key": AZURE_OCR_KEY, "Content-Type":"application/octet-stream" },
    body: bytes
  });
  if (!submit.ok) return await ocr_none(bytes, filename);
  const op = submit.headers.get("operation-location");
  if (!op) return await ocr_none(bytes, filename);
  let text = "";
  for (let i=0;i<15;i++){
    await new Promise(r=>setTimeout(r, 800));
    const st = await fetch(op, { headers:{ "Ocp-Apim-Subscription-Key": AZURE_OCR_KEY }});
    if (!st.ok) break;
    const j = await st.json();
    const s = j?.status;
    if (s === "succeeded") {
      const lines = j?.analyzeResult?.readResults?.flatMap((p:any)=>p.lines?.map((l:any)=>l.text)||[]) || [];
      text = lines.join("\n");
      break;
    }
    if (s === "failed") break;
  }
  return text || (await ocr_none(bytes, filename));
}

async function ocr_gcv(bytes:Uint8Array, filename:string): Promise<string> {
  if (!GCV_KEY) return await ocr_none(bytes, filename);
  const r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GCV_KEY}`, {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body: JSON.stringify({ requests:[{ image:{ content: btoa(String.fromCharCode(...bytes)) }, features:[{ type:"TEXT_DETECTION" }] }] })
  });
  if (!r.ok) return await ocr_none(bytes, filename);
  const j = await r.json();
  const text = j?.responses?.[0]?.fullTextAnnotation?.text || j?.responses?.[0]?.textAnnotations?.[0]?.description || "";
  return text || (await ocr_none(bytes, filename));
}

async function runOCR(bytes:Uint8Array, filename:string){
  switch (OCR_PROVIDER) {
    case "ocrspace": return await ocr_ocrspace(bytes, filename);
    case "azure":    return await ocr_azure(bytes, filename);
    case "gcv":      return await ocr_gcv(bytes, filename);
    default:         return await ocr_none(bytes, filename);
  }
}

function parseLines(raw:string): ParsedItem[] {
  const out: ParsedItem[] = [];
  const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for (const ln of lines) {
    let m = ln.match(/^(.+?)\s*[xX×]\s*([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Zčćšđž\.]+)?$/);
    if (!m) m = ln.match(/^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s*(kom|gajba|pak|ks)$/i);
    if (m) {
      const name = (m[1]||"").replace(/\s{2,}/g," ").trim();
      const qty  = Number((m[2]||"0").replace(",",".")) || 0;
      const uom  = (m[3]||"kom").toLowerCase();
      if (name && qty>0) out.push({ name, qty, uom, ean:null, lot:null, exp:null });
      continue;
    }
    if (ln.length>3 && !/total|ukupno|pdv|račun|broj/i.test(ln)) {
      out.push({ name: ln, qty: 1, uom:"kom", ean:null, lot:null, exp:null });
    }
  }
  const merged: Record<string, ParsedItem> = {};
  for (const it of out) {
    const k = it.name.toLowerCase();
    if (!merged[k]) merged[k] = { ...it };
    else merged[k].qty += it.qty;
  }
  return Object.values(merged).slice(0, 200);
}

serve(async (req) => {
  if (req.method !== "POST") return bad("Method Not Allowed", 405);

  let file: File | null = null;
  let mail_id: string | null = null;
  let bodyJson: any = null;

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    file = form.get("file") as File | null;
    mail_id = (form.get("mail_id") as string) || null;
  } else {
    try { bodyJson = await req.json(); } catch {}
  }

  if (bodyJson?.items && bodyJson?.dest) {
    const dest = String(bodyJson.dest);
    const market_id = bodyJson.market_id ?? null;

    const mh = await sr.from("moves").insert({ market_id, dest }).select("id").single();
    if (mh.error) return bad("Move header error");
    const move_id = mh.data.id;

    const mlines = (bodyJson.items as any[]).map(it => ({
      move_id,
      ean: it.ean||null,
      name: it.name||null,
      qty: Number(it.qty||0),
      uom: it.uom||"kom",
      lot: it.lot||null,
      exp: it.exp ? new Date(it.exp) : null
    }));
    const ins = await sr.from("move_lines").insert(mlines);
    if (ins.error) return bad("Move lines error");

    return ok({ move_id });
  }

  let storagePath:string|null = null;
  let text = "";
  if (file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = (file.name||"").toLowerCase().endsWith(".pdf") ? "pdf":"jpg";
    const key = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const up = await sr.storage.from("receipts").upload(key, bytes, { contentType: file.type || (ext==="pdf"?"application/pdf":"image/jpeg"), upsert:false });
    if (up.error) return bad("Upload failed");
    storagePath = key;
    text = await runOCR(bytes, file.name||key);
  } else if (mail_id) {
    text = `Primka iz e-maila ${mail_id}\nCoca-Cola gajba x 2\nLed kocke x 1\n`;
  } else {
    return bad("No input (file or mail_id missing)");
  }

  const items = parseLines(text);
  if (items.length === 0) items.push({ name:"Stavka", qty:1, uom:"kom", ean:null, lot:null, exp:null });

  const ins = await sr.from("receipts").insert({ source_path: storagePath, mail_id }).select("id").single();
  if (ins.error) return bad("DB error");
  const receipt_id = ins.data.id;

  const lines = items.map(x=>({ receipt_id, name:x.name, ean:x.ean||null, qty:x.qty, uom:x.uom||"kom", lot:x.lot||null, exp: x.exp? new Date(x.exp): null }));
  await sr.from("receipt_lines").insert(lines);

  return ok({ receipt_id, items, ocr_provider: OCR_PROVIDER });
});
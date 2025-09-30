/**
 * Deno Edge Function: /functions/v1/receipts
 * POST (multipart/form-data ili JSON)
 * - prima file (foto/pdf) ili mail_id (ID proslijeđenog e-maila)
 * - sprema u Storage (bucket: receipts)
 * - "best-effort" parsing: GS1/QR + heuristika linija "Naziv x Količina"
 * - vraća { receipt_id, items:[{name,ean,qty,uom,lot,exp}], totals:{} }
 * - ako dođe body.dest + items => knjiži u moves (create move + move_lines)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sr = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function ok(json:unknown, init:ResponseInit={}){ return new Response(JSON.stringify(json), { status:200, headers:{ "content-type":"application/json", ...init.headers } }) }
function bad(msg:string, code=400){ return new Response(JSON.stringify({error:msg}), { status:code, headers:{ "content-type":"application/json" }}) }

serve(async (req) => {
  if (req.method !== "POST") return bad("Method Not Allowed", 405);

  let file: File | null = null;
  let mail_id: string | null = null;
  let bodyJson: any = null;

  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    file = form.get("file") as File | null;
    mail_id = (form.get("mail_id") as string) || null;
  } else {
    try { bodyJson = await req.json(); } catch {}
  }

  // 1) Ingest (Storage)
  let storagePath: string | null = null;
  if (file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "jpg";
    const key = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const up = await sr.storage.from("receipts").upload(key, bytes, { contentType: file.type || (ext==="pdf"?"application/pdf":"image/jpeg"), upsert: false });
    if (up.error) return bad("Upload failed");
    storagePath = key;
  }

  // 2) Parse (best-effort)
  // TODO: priključiti pravi OCR provider (Vision/Azure/Tesseract). Za sada heuristika.
  const items = [
    // primjer: mapiramo gajbe/kasete ako je prepoznato u subjectu/filename-u itd.
  ];
  // Ako nema OCR-a: pokušaj GS1/QR iz naziva
  if (file?.name) {
    const n = file.name.toLowerCase();
    if (n.includes("cola")) items.push({ name:"Coca-Cola gajba", ean:"HR-GAJBA-COCA", qty: 2, uom:"gajba", lot:null, exp:null });
    if (n.includes("pivo")) items.push({ name:"Pivo 0.5L", ean:"3850000000000", qty:24, uom:"kom", lot:null, exp:null });
  }
  if (items.length===0) {
    // fallback demo: jedna stavka, urediva na klijentu
    items.push({ name:"Stavka", ean:"", qty:1, uom:"kom", lot:null, exp:null });
  }

  // 3) Zapiši receipt
  const ins = await sr.from("receipts").insert({ source_path: storagePath, mail_id }).select("id").single();
  if (ins.error) return bad("DB error");
  const receipt_id = ins.data.id;

  // bulk lines draft
  const lines = items.map((x:any)=>({ receipt_id, name:x.name, ean:x.ean, qty:x.qty, uom:x.uom, lot:x.lot, exp: x.exp ? new Date(x.exp) : null }));
  await sr.from("receipt_lines").insert(lines);

  // Ako je došao JSON zahtjev za knjiženje (druga faza iz UI-a)
  if (bodyJson?.items && bodyJson?.dest) {
    const dest = bodyJson.dest as string; // SKLADISTE | SANK
    const market_id = bodyJson.market_id || null;

    // kreiraj move header
    const mh = await sr.from("moves").insert({ market_id, dest }).select("id").single();
    if (mh.error) return bad("Move header error");
    const move_id = mh.data.id;

    const mlines = (bodyJson.items as any[]).map(it => ({
      move_id, ean: it.ean||null, name: it.name||null, qty: Number(it.qty||0), uom: it.uom||"kom", lot: it.lot||null, exp: it.exp? new Date(it.exp): null
    }));
    await sr.from("move_lines").insert(mlines);

    return ok({ move_id, receipt_id });
  }

  return ok({ receipt_id, items, totals:{ count: items.length } });
});
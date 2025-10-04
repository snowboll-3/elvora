import express from "express";
import morgan from "morgan";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const DATA = "./data";
const RECEIPTS = path.join(DATA, "receipts.json");
const KEYS = path.join(DATA, "keys");
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(KEYS, { recursive: true });
if (!fs.existsSync(RECEIPTS)) fs.writeFileSync(RECEIPTS, "[]");

const PUB = path.join(KEYS, "public.pem");
const PRIV = path.join(KEYS, "private.pem");
if (!fs.existsSync(PRIV) || !fs.existsSync(PUB)) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  fs.writeFileSync(PRIV, privateKey.export({ type: "pkcs8", format: "pem" }));
  fs.writeFileSync(PUB, publicKey.export({ type: "spki", format: "pem" }));
}
const pubPem = fs.readFileSync(PUB, "utf8");
const privPem = fs.readFileSync(PRIV, "utf8");

const API_KEY = process.env.API_KEY || "DEMO-KEY-123";
const KID = process.env.KEY_ID || "ELV-P256-1";

function auth(req, res, next) {
  if ((req.headers["x-api-key"] || "") !== API_KEY) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}
function load(){ return JSON.parse(fs.readFileSync(RECEIPTS,"utf8")); }
function save(a){ fs.writeFileSync(RECEIPTS, JSON.stringify(a,null,2)); }

function sign(obj){
  const s = crypto.createSign("SHA256").update(JSON.stringify(obj)).end().sign(privPem);
  return s.toString("base64");
}
function verify(obj, sigB64){
  return crypto.createVerify("SHA256").update(JSON.stringify(obj)).end().verify(pubPem, Buffer.from(sigB64,"base64"));
}

app.get("/health", (req,res)=> res.json({ ok:true, ts:new Date().toISOString() }) );

app.post("/scan", auth, (req,res)=>{
  const { sku, lot, location, device_id, ts } = req.body || {};
  if(!sku || !location) return res.status(400).json({ ok:false, error:"missing fields (sku, location)" });
  const rec = {
    receipt_id: "RCP-" + Date.now(),
    ver: 1, kid: KID,
    sku, lot: lot || null, location,
    device_id: device_id || "unknown",
    ts: ts || new Date().toISOString()
  };
  const sig = sign(rec);
  const item = { ...rec, sig };
  const all = load(); all.push(item); save(all);
  return res.json({ ok:true, receipt:item, public_key_pem: pubPem });
});

app.get("/verify", (req,res)=>{
  const id = req.query.id;
  if(!id) return res.status(400).json({ ok:false, error:"missing id" });
  const all = load();
  const found = all.find(x => x.receipt_id === id);
  if(!found) return res.json({ ok:false, valid:false });
  const { sig, ...plain } = found;
  return res.json({ ok:true, valid: verify(plain, sig), kid: KID, receipt: found });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log("TransitSeal server on :"+PORT));

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// serve public (scan.html)
app.use(express.static(require('path').join(__dirname,'public')));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath){
    try{
      if(filePath.endsWith('.js'))  res.setHeader('Content-Type','application/javascript; charset=utf-8');
      if(filePath.endsWith('.css')) res.setHeader('Content-Type','text/css; charset=utf-8');
      if(filePath.endsWith('.html'))res.setHeader('Content-Type','text/html; charset=utf-8');
    }catch(_){}
  }
}));
// Test API endpoint
app.get('/api/ping', (req, res) => {
  res.json({ message: "? ShelfLife server radi!" });
});

app.post("/api/events", (req, res) => {
  try{
    const crypto = require("crypto");
    const ua = req.headers["user-agent"] || "";
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString().split(",")[0].trim();
    const serverTs = new Date().toISOString();
    const body = req.body || {};

    // Fix encoding artifact: "Â°" -> "°"
    const deepFix = (v) => {
      if (v === null || v === undefined) return v;
      if (typeof v === "string") return v.replace(/\u00C2\u00B0/g, "\u00B0");
      if (Array.isArray(v)) return v.map(deepFix);
      if (typeof v === "object") {
        const o = {};
        for (const k of Object.keys(v)) o[k] = deepFix(v[k]);
        return o;
      }
      return v;
    };

    const incomingRaw = (body && body.batch && Array.isArray(body.events)) ? body.events : [body];
    const incoming = incomingRaw.map(deepFix);

    // server hash: SHA256 over stable string
    // IMPORTANT: client must send clientHash computed over the same base string.
    function baseString(e){
      const id = (e.id ?? "") + "";
      const ts = (e.ts ?? "") + "";
      const type = (e.type ?? "") + "";
      const action = (e.action ?? "") + "";
      const instanceId = (e.instanceId ?? "") + "";
      const clientHash = (e.clientHash ?? "") + "";
      // payload is included in hash, but will NOT be stored centrally
      const payloadJson = JSON.stringify(e.payload ?? {});
      return [id, ts, type, action, instanceId, payloadJson].join("|");
    }
    function sha256Hex(s){
      return crypto.createHash("sha256").update(s, "utf8").digest("hex");
    }

    const accepted = [];
    let received = 0;
    let rejected = 0;

    for(const e of incoming){
      received++;
      if(!e || typeof e !== "object") { rejected++; continue; }

      const id = (e.id ?? "") + "";
      const ts = (e.ts ?? "") + "";
      const type = (e.type ?? "") + "";
      const action = (e.action ?? "") + "";
      const instanceId = (e.instanceId ?? "") + "";
      const clientHash = (e.clientHash ?? "") + "";

      if(!id || !ts || !type || !action || !instanceId || !clientHash){ rejected++; continue; }

      const serverHash = sha256Hex(baseString(e));
      if(serverHash !== clientHash){
        rejected++;
        continue;
      }

      // HASH-ONLY CENTRAL RECORD (append-only)
      accepted.push({
        id, ts, type, action, instanceId,
        clientHash, serverHash,
        serverTs, ip, ua
      });
    }

    const dir = path.join(__dirname, "data");
    try{ fs.mkdirSync(dir, { recursive: true }); }catch(_){}

    const file = path.join(dir, "events.ndjson");
    if(accepted.length){
      const lines = accepted.map(x => JSON.stringify(x)).join("\n") + "\n";
      fs.appendFileSync(file, lines, "utf8");
    }

    res.json({ ok:true, stored: accepted.length, received, rejected });
  }catch(e){
    res.status(500).json({ ok:false, error: String(e && (e.message||e)) });
  }
});
// Start server
app.listen(PORT, () => {
  console.log("? Server radi na http://localhost:" + PORT);
});







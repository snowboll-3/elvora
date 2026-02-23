const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// serve public website + app
app.use(require('express').static(require('path').join(__dirname,'public')));
app.use(express.json({ limit: '1mb' }));

require('fs').existsSync('.env') && require('fs').readFileSync('.env','utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^([^=]+)=(.*)$/);if(m)process.env[m[1]]=m[2];});
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const LOG_PATH = path.join(DATA_DIR, 'events.ndjson');

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.get('/health', (_req, res) => res.json({ ok: true }));


app.get('/api/events/read', (req, res) => {
  const expected = process.env.EVENTS_READ_KEY;
  const provided = req.headers['x-events-read-key'];
  if (!expected || provided !== expected) {
    return res.status(401).json({ ok:false, error:'unauthorized' });
  }

  const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, 'data', 'events.ndjson');

  if (!fs.existsSync(logPath)) {
    return res.json({ ok:true, count:0, events:[] });
  }

  const all = fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const slice = all.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    const crypto = require('crypto');
  const verified = slice.map(e => {
    try {
      const payloadStr = JSON.stringify(e.payload ?? null);
      const verifyHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
      return Object.assign({}, e, { verifyHash, hashOk: (e.serverHash === verifyHash) });
    } catch {
      return Object.assign({}, e, { verifyHash: null, hashOk: false });
    }
  });

  res.json({ ok:true, count:verified.length, events:verified });
});
// Event Core: append-only NDJSON
app.post('/api/events', (req, res) => {
  const expectedKey = process.env.EVENTS_WRITE_KEY;
  const providedKey = req.headers['x-events-key'];
  if (!expectedKey || providedKey !== expectedKey) { return res.status(401).json({ ok:false, error:'unauthorized' }); }
  ensureDataDir();

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '';
  const ua = req.headers['user-agent'] || '';
  const serverTs = Date.now();

  const body = req.body || {};
  const clientHash = (body.clientHash || '').toString();
  const payload = body.payload ?? body; // dopuštamo i direktan payload

  // canonical stringify (stabilno)
  const payloadStr = JSON.stringify(payload);
  const serverHash = sha256Hex(payloadStr);

  const record = {
    v: 1,
    serverTs,
    ip,
    ua,
    type: body.type || payload?.type || 'event',
    payload,
    clientHash: clientHash || null,
    serverHash
  };

  fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n', { encoding: 'utf8' });
  res.json({ ok: true, serverTs, serverHash });
});

// Catch-all (Express v5 safe)
app.get(/.*/, (_req, res) => res.status(404).send('Not Found'));

app.listen(PORT, () => {
  console.log(`✅ Server radi na http://localhost:${PORT}`);
});






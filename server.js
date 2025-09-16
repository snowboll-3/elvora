const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Test API endpoint
app.get('/api/ping', (req, res) => {
  res.json({ message: "✅ ShelfLife server radi!" });
});

// Start server
app.listen(PORT, () => {
  console.log("✅ Server radi na http://localhost:" + PORT);
});
app.post("/api/events", (req, res) => {
  try{
    console.log("EVENT:", req.body);
  }catch(_){}
  res.json({ ok: true });
});

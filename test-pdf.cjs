const express = require('express');
const multer = require('multer');
const request = require('supertest');
const fs = require('fs');

const app = express();
const upload = multer();

app.post("/api/extract-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') {
      const pdf = require('pdf-parse');
      try {
        const result = await pdf(req.file.buffer);
        res.json({ success: true, text: result.text });
      } catch (e) {
        res.status(500).json({ error: "PDF parser error: " + e.message });
      }
    } else {
      res.json({ success: true, text: "Not a PDF" });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function run() {
  fs.writeFileSync('dummy.pdf', '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const res = await request(app)
    .post('/api/extract-text')
    .attach('file', 'dummy.pdf');
  console.log(res.status, res.body);
}
run();

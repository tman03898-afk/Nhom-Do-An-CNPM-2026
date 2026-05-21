const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_FILE = path.join(__dirname, '..', 'data', 'leads.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

ensureDataFile();

router.post('/zalo', (req, res) => {
  try {
    const { phone = '', roomId = null, source = 'zalo_button' } = req.body || {};

    if (!phone) {
      return res.status(400).json({ ok: false, message: 'phone is required' });
    }

    const leads = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || [];
    const newLead = {
      id: Date.now(),
      phone,
      roomId,
      source,
      createdAt: new Date().toISOString(),
    };
    leads.push(newLead);
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf8');

    console.log('New Zalo lead saved:', newLead);
    return res.json({ ok: true, lead: newLead });
  } catch (err) {
    console.error('Error saving lead', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;

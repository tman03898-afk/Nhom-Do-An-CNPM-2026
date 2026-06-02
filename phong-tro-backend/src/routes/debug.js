const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Health check — kiểm tra kết nối DB (chỉ admin)
router.get('/debug/db', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 as ok');
    return res.json({ ok: true, db: true, rows: result.rows });
  } catch (err) {
    console.error('DB debug error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, db: false, message: 'Database connection failed', error: err && err.message });
  }
});

module.exports = router;

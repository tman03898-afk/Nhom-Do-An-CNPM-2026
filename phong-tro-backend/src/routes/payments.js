const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureEnumType, ensureUsersTable, ensureTenantsTable, ensureRoomsTable } = require('./_dbHelpers');

const router = express.Router();

// Cấu hình multer để upload file
const uploadsDir = path.join(__dirname, '../../uploads/payment-proofs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `payment-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif) hoặc PDF'));
    }
  }
});

async function getEnumLabels(typeName) {
  const result = await pool.query(
    `SELECT e.enumlabel
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = $1`,
    [typeName]
  );
  return new Set(result.rows.map((row) => String(row.enumlabel)));
}

function resolveTransferMethodLabel(labels) {
  if (labels.has('BANK_TRANSFER')) return 'BANK_TRANSFER';
  if (labels.has('TRANSFER')) return 'TRANSFER';
  return 'CASH';
}

function resolveMethodValue(rawMethod, labels) {
  const input = String(rawMethod || '').toUpperCase();
  const transferLabel = resolveTransferMethodLabel(labels);
  if (input === 'BANK_TRANSFER' || input === 'TRANSFER') return transferLabel;
  if (input === 'CASH' && labels.has('CASH')) return 'CASH';
  if (input === 'ZALO_PAY' && labels.has('ZALO_PAY')) return 'ZALO_PAY';
  if (input === 'MOMO' && labels.has('MOMO')) return 'MOMO';
  if (input === 'OTHER' && labels.has('OTHER')) return 'OTHER';
  return transferLabel;
}

async function ensureInvoicesTableMinimal() {
  // invoices.js also creates this; keep minimal dependency here.
  await ensureEnumType('invoice_status', ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED']);
  // Không tạo lại bảng invoices vì đã tồn tại với schema khác
  // Chỉ đảm bảo enum type tồn tại
  // Approve payment cập nhật updated_at — nhiều DB cũ không có cột này.
  await pool.query(
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  );
}

/** Khớp nhãn enum thực tế (UNPAID/PARTIAL/PAID vs DRAFT/ISSUED/PAID…). */
async function resolveInvoicePaidStatusValue() {
  const labels = await getEnumLabels('invoice_status');
  if (labels.has('PAID')) return 'PAID';
  if (labels.has('ISSUED')) return 'ISSUED';
  return 'PAID';
}

async function ensurePaymentsTable() {
  await ensureEnumType('payment_method', ['BANK_TRANSFER', 'CASH', 'ZALO_PAY', 'MOMO', 'OTHER']);
  await ensureEnumType('payment_status', ['PENDING', 'APPROVED', 'REJECTED']);
  const methodLabels = await getEnumLabels('payment_method');
  const transferMethodLabel = resolveTransferMethodLabel(methodLabels);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL DEFAULT 0,
      method payment_method NOT NULL DEFAULT '${transferMethodLabel}',
      proof_url TEXT,
      status payment_status NOT NULL DEFAULT 'PENDING',
      paid_at TIMESTAMPTZ,
      recorded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at)`);

  // Backward-compatible migration for older schemas.
  const columnsResult = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payments'`
  );
  const columns = new Set(columnsResult.rows.map((row) => row.column_name));

  if (!columns.has('amount')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0`);
  }
  if (!columns.has('method')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS method payment_method NOT NULL DEFAULT '${transferMethodLabel}'`);
  }
  if (!columns.has('proof_url')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url TEXT`);
  }
  if (!columns.has('status')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS status payment_status NOT NULL DEFAULT 'PENDING'`);
  }
  if (!columns.has('paid_at')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);
  }
  if (!columns.has('updated_at')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }
  if (!columns.has('created_at')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }
  if (!columns.has('note')) {
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT`);
  }

  if (columns.has('amount_paid')) {
    await pool.query(
      `UPDATE payments
       SET amount = COALESCE(NULLIF(amount, 0), amount_paid, 0)
       WHERE amount IS NULL OR amount = 0`
    );
  }
  if (columns.has('payment_date')) {
    await pool.query(
      `UPDATE payments
       SET paid_at = COALESCE(paid_at, payment_date)`
    );
  }
  if (columns.has('payment_method')) {
    const cashLabel = methodLabels.has('CASH') ? 'CASH' : transferMethodLabel;
    const zaloLabel = methodLabels.has('ZALO_PAY') ? 'ZALO_PAY' : transferMethodLabel;
    const momoLabel = methodLabels.has('MOMO') ? 'MOMO' : transferMethodLabel;
    const otherLabel = methodLabels.has('OTHER') ? 'OTHER' : transferMethodLabel;
    await pool.query(
      `UPDATE payments
       SET method = CASE UPPER(payment_method::text)
         WHEN 'TRANSFER' THEN '${transferMethodLabel}'::payment_method
         WHEN 'BANK_TRANSFER' THEN '${transferMethodLabel}'::payment_method
         WHEN 'CASH' THEN '${cashLabel}'::payment_method
         WHEN 'ZALO_PAY' THEN '${zaloLabel}'::payment_method
         WHEN 'MOMO' THEN '${momoLabel}'::payment_method
         ELSE '${otherLabel}'::payment_method
       END
       WHERE method IS NULL OR method = '${transferMethodLabel}'::payment_method`
    );
  }
}

/** Legacy DB uses amount_paid + payment_method; newer schema uses amount + method. Populate whichever exists. */
async function insertPendingTenantPayment(poolRef, payload) {
  const columnsResult = await poolRef.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payments'`
  );
  const cols = new Set(columnsResult.rows.map((row) => row.column_name));

  const { invoiceId, amount, normalizedMethod, proofUrl, recordedBy, note } = payload;

  const fragments = [];
  const push = (col, val, cast = '') => {
    fragments.push({ col, val, cast });
  };

  push('invoice_id', invoiceId);

  if (cols.has('amount') && cols.has('amount_paid')) {
    push('amount', amount);
    push('amount_paid', amount);
  } else if (cols.has('amount')) {
    push('amount', amount);
  } else if (cols.has('amount_paid')) {
    push('amount_paid', amount);
  }

  if (cols.has('method') && cols.has('payment_method')) {
    push('method', normalizedMethod, '::payment_method');
    push('payment_method', normalizedMethod, '::payment_method');
  } else if (cols.has('method')) {
    push('method', normalizedMethod, '::payment_method');
  } else if (cols.has('payment_method')) {
    push('payment_method', normalizedMethod, '::payment_method');
  }

  if (cols.has('proof_url')) {
    push('proof_url', proofUrl);
  }

  if (cols.has('status')) {
    push('status', 'PENDING', '::payment_status');
  }

  if (cols.has('recorded_by')) {
    push('recorded_by', recordedBy);
  }

  if (cols.has('note')) {
    push('note', note);
  }

  const columnSql = fragments.map((f) => f.col).join(', ');
  const placeholders = fragments.map((f, idx) => `$${idx + 1}${f.cast}`).join(', ');
  const values = fragments.map((f) => f.val);

  const sql = `
    INSERT INTO payments (${columnSql})
    VALUES (${placeholders})
    RETURNING *
  `;

  return poolRef.query(sql, values);
}

router.get('/admin/payments', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTableMinimal();
    await ensurePaymentsTable();

    const result = await pool.query(
      `SELECT
         p.payment_id,
         COALESCE(p.amount, p.amount_paid, 0) AS amount,
         COALESCE(p.method::text, p.payment_method::text, 'CASH') AS method,
         p.proof_url,
         COALESCE(p.status, 'PENDING') AS status,
         p.paid_at,
         p.note,
         p.created_at,
         p.updated_at,
         i.invoice_id,
         i.total_amount AS invoice_total_amount,
         i.status AS invoice_status,
         u.user_id,
         u.full_name,
         u.email,
         r.room_id,
         r.room_number
       FROM payments p
       JOIN invoices i ON i.invoice_id = p.invoice_id
       JOIN tenants t ON t.tenant_id = i.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN contracts c ON c.contract_id = i.contract_id
       LEFT JOIN rooms r ON r.room_id = c.room_id
       ORDER BY p.payment_id DESC`
    );

    return res.json({ ok: true, payments: result.rows });
  } catch (err) {
    console.error('List payments error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

// Endpoint upload file minh chứng thanh toán
router.post('/tenant/payments/upload', requireAuth, requireTenant, upload.single('proof'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'Vui lòng chọn file minh chứng' });
    }

    const fileUrl = `/uploads/payment-proofs/${req.file.filename}`;
    return res.json({ 
      ok: true, 
      file_url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Upload payment proof error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/tenant/payments', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTableMinimal();
    await ensurePaymentsTable();

    const { invoice_id, amount, method, proof_url, note } = req.body || {};
    const invoiceId = Number(invoice_id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ ok: false, message: 'invoice_id is required' });
    }

    const tenantInvoice = await pool.query(
      `SELECT i.invoice_id, i.total_amount
       FROM users u
       JOIN tenants t ON t.user_id = u.user_id
       JOIN invoices i ON i.tenant_id = t.tenant_id
       WHERE u.user_id = $1 AND i.invoice_id = $2
       LIMIT 1`,
      [req.auth.sub, invoiceId]
    );
    if (tenantInvoice.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'invoice not found' });
    }
    if (!proof_url || !String(proof_url).trim()) {
      return res.status(400).json({ ok: false, message: 'proof_url is required' });
    }

    const duplicateCheck = await pool.query(
      `SELECT payment_id, status
       FROM payments
       WHERE invoice_id = $1
       ORDER BY payment_id DESC
       LIMIT 1`,
      [invoiceId]
    );
    if (duplicateCheck.rowCount > 0) {
      const latest = duplicateCheck.rows[0];
      if (latest.status === 'PENDING') {
        return res.status(409).json({ ok: false, message: 'payment confirmation is already pending approval' });
      }
      if (latest.status === 'APPROVED') {
        return res.status(409).json({ ok: false, message: 'invoice payment is already approved' });
      }
    }

    const amt = amount === undefined || amount === null ? Number(tenantInvoice.rows[0].total_amount || 0) : Number(amount);
    const methodLabels = await getEnumLabels('payment_method');
    const normalizedMethod = resolveMethodValue(method, methodLabels);

    const result = await insertPendingTenantPayment(pool, {
      invoiceId,
      amount: Number.isFinite(amt) ? amt : 0,
      normalizedMethod,
      proofUrl: String(proof_url),
      recordedBy: req.auth.sub,
      note: note ? String(note) : null,
    });

    return res.status(201).json({ ok: true, payment: result.rows[0] });
  } catch (err) {
    console.error('Create payment error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/payments', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTableMinimal();
    await ensurePaymentsTable();

    const result = await pool.query(
      `SELECT
         p.payment_id,
         p.invoice_id,
         p.amount,
         p.method,
         p.proof_url,
         p.status,
         p.paid_at,
         p.note,
         p.created_at,
         p.updated_at
       FROM users u
       JOIN tenants t ON t.user_id = u.user_id
       JOIN invoices i ON i.tenant_id = t.tenant_id
       JOIN payments p ON p.invoice_id = i.invoice_id
       WHERE u.user_id = $1
       ORDER BY p.payment_id DESC`,
      [req.auth.sub]
    );

    return res.json({ ok: true, payments: result.rows });
  } catch (err) {
    console.error('Tenant payments error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/payments/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTableMinimal();
    await ensurePaymentsTable();

    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid payment id' });
    }

    await client.query('BEGIN');
    const payment = await client.query(
      `SELECT payment_id, invoice_id, COALESCE(status, 'PENDING') AS status FROM payments WHERE payment_id = $1 FOR UPDATE`,
      [paymentId]
    );
    if (payment.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'payment not found' });
    }
    const payStatus = String(payment.rows[0].status ?? '').toUpperCase();
    if (payStatus !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'payment is not pending' });
    }

    const invoicePaidStatus = await resolveInvoicePaidStatusValue();

    await client.query(
      `UPDATE payments
       SET status = 'APPROVED'::payment_status, recorded_by = $2, updated_at = NOW()
       WHERE payment_id = $1`,
      [paymentId, req.auth.sub]
    );
    await client.query(
      `UPDATE invoices
       SET status = $1::invoice_status, updated_at = NOW()
       WHERE invoice_id = $2`,
      [invoicePaidStatus, payment.rows[0].invoice_id]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'payment approved' });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {}
    console.error('Approve payment error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  } finally {
    client.release();
  }
});

router.post('/admin/payments/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTableMinimal();
    await ensurePaymentsTable();

    const paymentId = Number(req.params.id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid payment id' });
    }

    const result = await pool.query(
      `UPDATE payments
       SET status = 'REJECTED'::payment_status, recorded_by = $2, updated_at = NOW()
       WHERE payment_id = $1
       RETURNING payment_id`,
      [paymentId, req.auth.sub]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'payment not found' });
    }

    return res.json({ ok: true, message: 'payment rejected' });
  } catch (err) {
    console.error('Reject payment error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;


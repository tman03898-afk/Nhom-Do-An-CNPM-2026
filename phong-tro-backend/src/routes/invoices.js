const express = require('express');

const pool = require('../config/db');
const { requireAuth, requireAdmin, requireTenant } = require('../middleware/auth');
const { ensureEnumType, ensureRoomsTable, ensureUsersTable, ensureTenantsTable, formatCalendarDateString } = require('./_dbHelpers');
const paymentsRoute = require('./payments');
const {
  sumAllRecurringExtrasForTenant,
  ensureTenantServiceSubscriptionsTable,
  listAllSubscriptionLinesForTenant,
} = require('./_subscriptionFees');
const { once } = require('./_schemaCache');

const router = express.Router();

async function ensureInvoicesTable() {
  return once('schema:invoices', async () => {
  // Hợp nhất mọi nhãn đã dùng (invoices + payments) để ALTER TYPE bổ sung khi DB cũ thiếu (vd. CANCELLED).
  await ensureEnumType('invoice_status', [
    'UNPAID',
    'PARTIAL',
    'PAID',
    'DRAFT',
    'ISSUED',
    'OVERDUE',
    'CANCELLED',
  ]);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      contract_id INTEGER NOT NULL,
      billing_month DATE NOT NULL,
      rent_amount NUMERIC NOT NULL DEFAULT 0,
      electricity_amount NUMERIC NOT NULL DEFAULT 0,
      water_amount NUMERIC NOT NULL DEFAULT 0,
      other_fees_amount NUMERIC NOT NULL DEFAULT 0,
      total_amount NUMERIC NOT NULL DEFAULT 0,
      due_date DATE NOT NULL,
      status invoice_status NOT NULL DEFAULT 'UNPAID',
      created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Current DB may not have created_at/updated_at, add created_at for stable API responses.
  await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)`);
  await pool.query(
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electricity_breakdown JSONB`
  );
  await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS utility_meter_snapshot JSONB`);
  await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS water_breakdown JSONB`);
});
}

function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return formatCalendarDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

router.get('/admin/invoices', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Promise.all([
      ensureUsersTable(),
      ensureRoomsTable(),
      ensureTenantsTable(),
      ensureInvoicesTable(),
      paymentsRoute.ensurePaymentsTable(),
    ]);

    const result = await pool.query(
      `SELECT
         i.invoice_id,
         i.rent_amount,
         EXTRACT(MONTH FROM i.billing_month)::int AS period_month,
         EXTRACT(YEAR FROM i.billing_month)::int AS period_year,
         i.electricity_amount,
         i.water_amount,
         i.other_fees_amount,
         i.total_amount,
         i.due_date,
         i.status,
         i.created_at,
         COALESCE(
           lp.paid_at,
           CASE
             WHEN UPPER(TRIM(i.status::text)) = 'PAID'
               THEN COALESCE(i.updated_at, i.created_at, i.due_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
           END
         ) AS payment_paid_at,
         t.tenant_id,
         u.user_id,
         COALESCE(u.full_name, '') AS full_name,
         COALESCE(u.email, '') AS email,
         COALESCE(r_contract.room_number, r_tenant.room_number) AS room_number
       FROM invoices i
       JOIN tenants t ON t.tenant_id = i.tenant_id
       LEFT JOIN users u ON u.user_id = t.user_id
       LEFT JOIN contracts c ON c.contract_id = i.contract_id
       LEFT JOIN rooms r_contract ON r_contract.room_id = c.room_id
       LEFT JOIN rooms r_tenant ON r_tenant.room_id = t.room_id
       LEFT JOIN LATERAL (
         SELECT p.paid_at
         FROM payments p
         WHERE p.invoice_id = i.invoice_id
           AND COALESCE(p.status::text, '') = 'APPROVED'
         ORDER BY p.payment_id DESC
         LIMIT 1
       ) lp ON TRUE
       ORDER BY i.invoice_id DESC`
    );

    return res.json({ ok: true, invoices: result.rows });
  } catch (err) {
    console.error('List invoices error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/admin/invoices/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTable();
    await paymentsRoute.ensurePaymentsTable();

    const invoiceId = Number(req.params.id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid invoice id' });
    }

    const result = await pool.query(
      `SELECT
         i.invoice_id,
         EXTRACT(MONTH FROM i.billing_month)::int AS period_month,
         EXTRACT(YEAR FROM i.billing_month)::int AS period_year,
         i.rent_amount,
         i.electricity_amount,
         i.electricity_breakdown,
         i.water_breakdown,
         i.utility_meter_snapshot,
         i.water_amount,
         i.other_fees_amount,
         i.total_amount,
         i.due_date,
         i.status,
         i.created_at,
         COALESCE(
           lp.paid_at,
           CASE
             WHEN UPPER(TRIM(i.status::text)) = 'PAID'
               THEN COALESCE(i.updated_at, i.created_at, i.due_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
           END
         ) AS payment_paid_at,
         t.tenant_id,
         COALESCE(u.full_name, '') AS full_name,
         COALESCE(u.email, '') AS email,
         COALESCE(r_contract.room_number, r_tenant.room_number) AS room_number
       FROM invoices i
       JOIN tenants t ON t.tenant_id = i.tenant_id
       LEFT JOIN users u ON u.user_id = t.user_id
       LEFT JOIN contracts c ON c.contract_id = i.contract_id
       LEFT JOIN rooms r_contract ON r_contract.room_id = c.room_id
       LEFT JOIN rooms r_tenant ON r_tenant.room_id = t.room_id
       LEFT JOIN LATERAL (
         SELECT p.paid_at
         FROM payments p
         WHERE p.invoice_id = i.invoice_id
           AND COALESCE(p.status::text, '') = 'APPROVED'
         ORDER BY p.payment_id DESC
         LIMIT 1
       ) lp ON TRUE
       WHERE i.invoice_id = $1
       LIMIT 1`,
      [invoiceId]
    );

    if (!result.rowCount) return res.json({ ok: true, invoice: null });

    const row = result.rows[0];
    const { ensureServicesTable } = require('./services');
    await ensureServicesTable();
    await ensureTenantServiceSubscriptionsTable();
    // Dùng năm/tháng từ billing_month (EXTRACT), không dùng String(Date) — slice(0,10) sẽ thành "Thu May 01" và làm lỗi ::date.
    const bmKey = formatCalendarDateString(Number(row.period_year), Number(row.period_month), 1);
    const subscription_services = bmKey
      ? await listAllSubscriptionLinesForTenant(row.tenant_id, bmKey)
      : [];
    const subscription_fees_subtotal = subscription_services.reduce((acc, s) => acc + Number(s.monthly_price || 0), 0);
    const otherFeesNum = Number(row.other_fees_amount || 0);
    const other_fees_manual = Math.max(0, Math.round((otherFeesNum - subscription_fees_subtotal) * 100) / 100);

    const invoice = {
      ...row,
      subscription_services,
      subscription_fees_subtotal,
      other_fees_manual,
    };
    return res.json({ ok: true, invoice });
  } catch (err) {
    console.error('Get invoice error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.post('/admin/invoices', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTable();
    await ensureTenantServiceSubscriptionsTable();

    const {
      tenant_id,
      room_id,
      period_month,
      period_year,
      rent_amount,
      services_amount,
      due_date,
      status,
    } = req.body || {};

    const month = Number(period_month);
    const year = Number(period_year);
    const due = normalizeDate(due_date);

    if (!tenant_id || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || !due) {
      return res.status(400).json({ ok: false, message: 'tenant_id, period_month, period_year, due_date are required' });
    }

    const billingMonth = formatCalendarDateString(year, month, 1);
    if (!billingMonth) {
      return res.status(400).json({ ok: false, message: 'invalid period_month / period_year' });
    }
    const rent = Number(rent_amount || 0);
    const manualOther = Number(services_amount || 0);
    const subscriptionFees = await sumAllRecurringExtrasForTenant(Number(tenant_id), billingMonth);
    const otherFees = manualOther + subscriptionFees;
    const total = rent + otherFees;

    // contract_id is required in current schema
    let contractId = null;
    if (room_id) {
      const contractRes = await pool.query(
        `SELECT contract_id
         FROM contracts
         WHERE tenant_id = $1 AND room_id = $2
         ORDER BY contract_id DESC
         LIMIT 1`,
        [Number(tenant_id), Number(room_id)]
      );
      contractId = contractRes.rowCount ? Number(contractRes.rows[0].contract_id) : null;
    } else {
      const contractRes = await pool.query(
        `SELECT contract_id
         FROM contracts
         WHERE tenant_id = $1
         ORDER BY contract_id DESC
         LIMIT 1`,
        [Number(tenant_id)]
      );
      contractId = contractRes.rowCount ? Number(contractRes.rows[0].contract_id) : null;
    }

    if (!contractId) {
      return res.status(400).json({ ok: false, message: 'contract not found for tenant/room' });
    }

    const dup = await pool.query(
      `SELECT invoice_id, status::text AS status
       FROM invoices
       WHERE tenant_id = $1 AND billing_month = $2::date
       LIMIT 1`,
      [Number(tenant_id), billingMonth]
    );
    if (dup.rowCount > 0) {
      const ex = dup.rows[0];
      return res.status(409).json({
        ok: false,
        message: `Đã có hóa đơn kỳ ${String(month).padStart(2, '0')}/${year} cho tenant này (#${ex.invoice_id}, ${ex.status}). Chọn tháng/năm khác (thường là kỳ tiếp theo) hoặc sửa hóa đơn hiện có.`,
        existing_invoice_id: ex.invoice_id,
      });
    }

    const rawStatus = String(status || '').toUpperCase();
    const allowed = ['UNPAID', 'PARTIAL', 'PAID'];
    const finalStatus = allowed.includes(rawStatus) ? rawStatus : 'UNPAID';

    const result = await pool.query(
      `INSERT INTO invoices
        (contract_id, tenant_id, billing_month, rent_amount, electricity_amount, water_amount, other_fees_amount, total_amount, due_date, status, created_by)
       VALUES
        ($1, $2, $3::date, $4, 0, 0, $5, $6, $7::date, $8::invoice_status, $9)
       RETURNING invoice_id, tenant_id, contract_id, billing_month, rent_amount, electricity_amount, water_amount, other_fees_amount, total_amount, due_date, status, created_at`,
      [
        contractId,
        Number(tenant_id),
        billingMonth,
        rent,
        otherFees,
        total,
        due,
        finalStatus,
        req.auth?.sub || null,
      ]
    );

    return res.status(201).json({ ok: true, invoice: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, message: 'invoice for that tenant and period already exists' });
    }
    console.error('Create invoice error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.put('/admin/invoices/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTable();

    const invoiceId = Number(req.params.id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid invoice id' });
    }

    const allowed = [
      'rent_amount',
      'electricity_amount',
      'water_amount',
      'other_fees_amount',
      'due_date',
      'status',
    ];
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ ok: false, message: 'no valid fields provided for update' });
    }

    const values = [];
    const setClauses = entries.map(([key, value], idx) => {
      if (key === 'due_date') {
        const d = normalizeDate(value);
        values.push(d);
        return `${key} = $${idx + 1}::date`;
      }
      if (key === 'status') {
        values.push(String(value));
        return `${key} = $${idx + 1}::invoice_status`;
      }
      values.push(value);
      return `${key} = $${idx + 1}`;
    });

    // Recompute total always from components.
    const totalClause = `, total_amount =
      COALESCE(rent_amount,0) + COALESCE(electricity_amount,0) + COALESCE(water_amount,0) + COALESCE(other_fees_amount,0)`;

    values.push(invoiceId);

    const result = await pool.query(
      `UPDATE invoices
       SET ${setClauses.join(', ')}${totalClause}
       WHERE invoice_id = $${values.length}
       RETURNING invoice_id, tenant_id, contract_id, billing_month, rent_amount, electricity_amount, water_amount, other_fees_amount, total_amount, due_date, status, created_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'invoice not found' });
    }

    return res.json({ ok: true, invoice: result.rows[0] });
  } catch (err) {
    console.error('Update invoice error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/invoices/:id', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTable();
    await paymentsRoute.ensurePaymentsTable();

    const invoiceId = Number(req.params.id);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ ok: false, message: 'invalid invoice id' });
    }

    const result = await pool.query(
      `SELECT
         i.invoice_id,
         EXTRACT(MONTH FROM i.billing_month)::int AS period_month,
         EXTRACT(YEAR FROM i.billing_month)::int AS period_year,
         i.rent_amount,
         i.electricity_amount,
         i.electricity_breakdown,
         i.water_breakdown,
         i.utility_meter_snapshot,
         i.water_amount,
         i.other_fees_amount,
         i.total_amount,
         i.due_date,
         i.status,
         i.created_at,
         COALESCE(
           lp.paid_at,
           CASE
             WHEN UPPER(TRIM(i.status::text)) = 'PAID'
               THEN COALESCE(i.updated_at, i.created_at, i.due_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
           END
         ) AS payment_paid_at,
         t.tenant_id,
         COALESCE(r_contract.room_number, r_tenant.room_number) AS room_number
       FROM invoices i
       JOIN tenants t ON t.tenant_id = i.tenant_id
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN contracts c ON c.contract_id = i.contract_id
       LEFT JOIN rooms r_contract ON r_contract.room_id = c.room_id
       LEFT JOIN rooms r_tenant ON r_tenant.room_id = t.room_id
       LEFT JOIN LATERAL (
         SELECT p.paid_at
         FROM payments p
         WHERE p.invoice_id = i.invoice_id
           AND COALESCE(p.status::text, '') = 'APPROVED'
         ORDER BY p.payment_id DESC
         LIMIT 1
       ) lp ON TRUE
       WHERE i.invoice_id = $1 AND u.user_id = $2
       LIMIT 1`,
      [invoiceId, req.auth.sub]
    );

    if (!result.rowCount) {
      return res.json({ ok: true, invoice: null });
    }

    const row = result.rows[0];
    const { ensureServicesTable } = require('./services');
    await ensureServicesTable();
    await ensureTenantServiceSubscriptionsTable();
    const bmKey = formatCalendarDateString(Number(row.period_year), Number(row.period_month), 1);
    const subscription_services = bmKey
      ? await listAllSubscriptionLinesForTenant(row.tenant_id, bmKey)
      : [];
    const subscription_fees_subtotal = subscription_services.reduce((acc, s) => acc + Number(s.monthly_price || 0), 0);
    const otherFeesNum = Number(row.other_fees_amount || 0);
    const other_fees_manual = Math.max(0, Math.round((otherFeesNum - subscription_fees_subtotal) * 100) / 100);

    const invoice = {
      ...row,
      subscription_services,
      subscription_fees_subtotal,
      other_fees_manual,
    };
    return res.json({ ok: true, invoice });
  } catch (err) {
    console.error('Tenant get invoice error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

router.get('/tenant/invoices', requireAuth, requireTenant, async (req, res) => {
  try {
    await ensureUsersTable();
    await ensureRoomsTable();
    await ensureTenantsTable();
    await ensureInvoicesTable();
    await paymentsRoute.ensurePaymentsTable();

    const result = await pool.query(
      `SELECT
         i.invoice_id,
         i.rent_amount,
         EXTRACT(MONTH FROM i.billing_month)::int AS period_month,
         EXTRACT(YEAR FROM i.billing_month)::int AS period_year,
         i.electricity_amount,
         i.electricity_breakdown,
         i.water_breakdown,
         i.utility_meter_snapshot,
         i.water_amount,
         i.other_fees_amount,
         i.total_amount,
         i.due_date,
         i.status,
         i.created_at,
         COALESCE(
           lp.paid_at,
           CASE
             WHEN UPPER(TRIM(i.status::text)) = 'PAID'
               THEN COALESCE(i.updated_at, i.created_at, i.due_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
           END
         ) AS payment_paid_at,
         COALESCE(r_contract.room_number, r_tenant.room_number) AS room_number
       FROM users u
       JOIN tenants t ON t.user_id = u.user_id
       JOIN invoices i ON i.tenant_id = t.tenant_id
       LEFT JOIN contracts c ON c.contract_id = i.contract_id
       LEFT JOIN rooms r_contract ON r_contract.room_id = c.room_id
       LEFT JOIN rooms r_tenant ON r_tenant.room_id = t.room_id
       LEFT JOIN LATERAL (
         SELECT p.paid_at
         FROM payments p
         WHERE p.invoice_id = i.invoice_id
           AND COALESCE(p.status::text, '') = 'APPROVED'
         ORDER BY p.payment_id DESC
         LIMIT 1
       ) lp ON TRUE
       WHERE u.user_id = $1
       ORDER BY i.invoice_id DESC`,
      [req.auth.sub]
    );

    return res.json({ ok: true, invoices: result.rows });
  } catch (err) {
    console.error('Tenant invoices error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

module.exports = router;
module.exports.ensureInvoicesTable = ensureInvoicesTable;


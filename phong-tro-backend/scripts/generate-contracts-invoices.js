#!/usr/bin/env node
const pool = require('../src/config/db');

async function ensureEnumType(typeName, values) {
  const escaped = values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
        CREATE TYPE ${typeName} AS ENUM (${escaped});
      END IF;
    END$$;
  `);
}

async function ensureContractsTable() {
  await ensureEnumType('contract_status', ['ACTIVE', 'EXPIRED', 'TERMINATED']);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contracts (
      contract_id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      room_id INTEGER NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      rent_price NUMERIC NOT NULL DEFAULT 0,
      deposit NUMERIC NOT NULL DEFAULT 0,
      status contract_status NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureInvoicesTable() {
  await ensureEnumType('invoice_status', ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED']);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(room_id) ON DELETE SET NULL,
      period_month INTEGER NOT NULL,
      period_year INTEGER NOT NULL,
      rent_amount NUMERIC NOT NULL DEFAULT 0,
      services_amount NUMERIC NOT NULL DEFAULT 0,
      total_amount NUMERIC NOT NULL DEFAULT 0,
      due_date DATE NOT NULL,
      status invoice_status NOT NULL DEFAULT 'ISSUED',
      note TEXT,
      created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, period_month, period_year)
    )
  `);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function main() {
  try {
    await ensureContractsTable();
    await ensureInvoicesTable();

    const tenantsRes = await pool.query(
      `SELECT t.tenant_id, t.room_id, u.user_id, u.full_name, u.email, r.price, r.room_number
       FROM tenants t
       JOIN users u ON u.user_id = t.user_id
       JOIN rooms r ON r.room_id = t.room_id
       WHERE t.room_id IS NOT NULL`
    );

    if (tenantsRes.rowCount === 0) {
      console.log('No tenants with assigned rooms found.');
      await pool.end();
      return;
    }

    const now = new Date();
    const adminRes = await pool.query(`SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    const adminId = adminRes.rowCount ? adminRes.rows[0].user_id : null;

      // Inspect contract table columns to pick compatible insert fields
      const contractColsRes = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'contracts'`
      );
      const contractCols = contractColsRes.rows.map((r) => r.column_name);

      // Detect whether contracts.tenant_id references tenants(tenant_id) or users(user_id)
      const fkRes = await pool.query(
        `SELECT kcu.column_name, ccu.table_name AS foreign_table_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'contracts' AND kcu.column_name = 'tenant_id'`
      );
      const contractTenantFkTable = fkRes.rowCount ? fkRes.rows[0].foreign_table_name : null;

      // Detect invoices tenant FK similarly
      const invFkRes = await pool.query(
        `SELECT kcu.column_name, ccu.table_name AS foreign_table_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'invoices' AND kcu.column_name = 'tenant_id'`
      );
      const invoiceTenantFkTable = invFkRes.rowCount ? invFkRes.rows[0].foreign_table_name : null;

    for (const t of tenantsRes.rows) {
      console.log(`\nProcessing tenant ${t.tenant_id} (${t.email}) - room ${t.room_number}`);

      // create contract if none active
      const activeRes = await pool.query(
        `SELECT 1 FROM contracts WHERE tenant_id = $1 AND status = 'ACTIVE' LIMIT 1`,
        [t.tenant_id]
      );

      let contractId = null;
      if (activeRes.rowCount === 0) {
        const start = new Date();
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);

        const rent = t.price || 0;

        // Some deployments may not have rent_price/deposit columns on contracts table.
        // Try to insert without those columns to be compatible.
        let insertC;
        const createdBy = adminId || t.user_id || null;
          // Build insert dynamically depending on which rent/deposit column exists
          const hasRentPrice = contractCols.includes('rent_price');
          const hasMonthlyRent = contractCols.includes('monthly_rent');
          const hasDeposit = contractCols.includes('deposit');

          const insertFields = ['tenant_id', 'room_id', 'start_date', 'end_date', 'status', 'created_by'];
          // choose tenant id value according to FK target table
          const tenantValueForContracts = contractTenantFkTable === 'users' ? t.user_id : t.tenant_id;
          const values = [tenantValueForContracts, t.room_id, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10), 'ACTIVE', createdBy];

          if (hasRentPrice) {
            insertFields.splice(4, 0, 'rent_price');
            values.splice(4, 0, t.price || 0);
          } else if (hasMonthlyRent) {
            insertFields.splice(4, 0, 'monthly_rent');
            values.splice(4, 0, t.price || 0);
          }

          if (hasDeposit) {
            // put deposit after rent-like column and set deposit equal to rent to satisfy constraints
            const idx = insertFields.indexOf(hasRentPrice || hasMonthlyRent ? (hasRentPrice ? 'rent_price' : 'monthly_rent') : 'start_date') + 1;
            insertFields.splice(idx, 0, 'deposit');
            values.splice(idx, 0, t.price || 0);
          }

          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          const insertSql = `INSERT INTO contracts (${insertFields.join(', ')}) VALUES (${placeholders}) RETURNING contract_id, start_date, end_date`;

          try {
            insertC = await pool.query(insertSql, values);
          } catch (err) {
            // if any unexpected error, rethrow
            throw err;
          }

        contractId = insertC.rows[0].contract_id;
        console.log('  Created contract', insertC.rows[0]);

        // mark room as RENTED
        await pool.query(`UPDATE rooms SET status = 'RENTED' WHERE room_id = $1`, [t.room_id]);
      } else {
        console.log('  Active contract already exists, skipping contract creation.');
      }

      // Inspect invoice table columns
      const invoiceColsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'`);
      const invoiceCols = invoiceColsRes.rows.map((r) => r.column_name);

      // determine contract id for this tenant (may be created above or existing active one)
      let contractIdForTenant = contractId;
      if (!contractIdForTenant) {
        const tenantValueForContracts = contractTenantFkTable === 'users' ? t.user_id : t.tenant_id;
        const existingC = await pool.query(`SELECT contract_id FROM contracts WHERE tenant_id = $1 AND status = 'ACTIVE' LIMIT 1`, [tenantValueForContracts]);
        if (existingC.rowCount > 0) contractIdForTenant = existingC.rows[0].contract_id;
      }

      // create invoices for current month and next 2 months
      for (let i = 0; i < 3; i++) {
        const target = addMonths(now, i);
        const month = target.getMonth() + 1;
        const year = target.getFullYear();

        const due = new Date(year, month - 1, 5); // 5th of that month
        const rent = t.price || 0;
        const services = 0;
        const total = Number(rent) + Number(services);

        try {
          // build invoice insert compatible with current schema
          const invFields = [];
          const invValues = [];

          // tenant id mapping depending on FK
          const tenantValueForInvoices = invoiceTenantFkTable === 'users' ? t.user_id : t.tenant_id;
          invFields.push('tenant_id'); invValues.push(tenantValueForInvoices);

          if (invoiceCols.includes('room_id')) { invFields.push('room_id'); invValues.push(t.room_id); }
          // handle contract_id: only insert if available or nullable
          if (invoiceCols.includes('contract_id')) {
            if (contractIdForTenant) {
              invFields.push('contract_id'); invValues.push(contractIdForTenant);
            } else {
              const colInfo = await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='invoices' AND column_name='contract_id'`);
              const isNullable = colInfo.rowCount ? colInfo.rows[0].is_nullable === 'YES' : true;
              if (isNullable) {
                invFields.push('contract_id'); invValues.push(null);
              } else {
                console.log('  Skipping invoice: invoices.contract_id is required but no contract_id available for tenant', t.tenant_id);
                continue;
              }
            }
          }
          // prefer billing_month/billing_year if present
          const monthField = invoiceCols.includes('billing_month') ? 'billing_month' : invoiceCols.includes('period_month') ? 'period_month' : invoiceCols.includes('month') ? 'month' : null;
          const yearField = invoiceCols.includes('billing_year') ? 'billing_year' : invoiceCols.includes('period_year') ? 'period_year' : invoiceCols.includes('year') ? 'year' : null;
          if (monthField) {
            invFields.push(monthField);
            if (monthField === 'billing_month') {
              // billing_month is a DATE representing the month (use first day)
              invValues.push(new Date(year, month - 1, 1).toISOString().slice(0, 10));
            } else {
              invValues.push(month);
            }
          }
          if (yearField) { invFields.push(yearField); invValues.push(year); }
          if (invoiceCols.includes('rent_amount')) { invFields.push('rent_amount'); invValues.push(rent); }
          if (invoiceCols.includes('services_amount')) { invFields.push('services_amount'); invValues.push(services); }
          if (invoiceCols.includes('total_amount')) { invFields.push('total_amount'); invValues.push(total); }
          if (invoiceCols.includes('due_date')) { invFields.push('due_date'); invValues.push(due.toISOString().slice(0,10)); }
          if (invoiceCols.includes('status')) {
            // check if enum contains 'ISSUED'
            let hasIssued = false;
            try {
              const enumRes = await pool.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'invoice_status'`);
              const labels = enumRes.rows.map(r => r.enumlabel);
              hasIssued = labels.includes('ISSUED');
            } catch (e) {
              hasIssued = false;
            }
            if (hasIssued) {
              invFields.push('status'); invValues.push('ISSUED');
            }
          }
          if (invoiceCols.includes('created_by')) {
            const createdByForInvoice = adminId || t.user_id;
            invFields.push('created_by'); invValues.push(createdByForInvoice);
          }

          const invPlaceholders = invValues.map((_, idx) => `$${idx + 1}`).join(', ');
          const invSql = `INSERT INTO invoices (${invFields.join(', ')}) VALUES (${invPlaceholders}) RETURNING invoice_id, ${invoiceCols.includes('period_month') ? 'period_month' : 'invoice_id'}, ${invoiceCols.includes('period_year') ? 'period_year' : 'invoice_id'}, ${invoiceCols.includes('total_amount') ? 'total_amount' : 'invoice_id'}, ${invoiceCols.includes('due_date') ? 'due_date' : 'invoice_id'}`;

          const invRes = await pool.query(invSql, invValues);
          console.log('  Created invoice', invRes.rows[0]);
        } catch (err) {
          if (err && err.code === '23505') {
            console.log(`  Invoice for ${month}/${year} already exists, skipping.`);
          } else {
            console.error('  Error creating invoice:', err.message || err);
          }
        }
      }
    }

    await pool.end();
    console.log('\nDone.');
  } catch (err) {
    console.error('Script error:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
const pool = require('../src/config/db');

let minimist;
try { minimist = require('minimist'); } catch (e) {
  console.error('Missing dependency: minimist. Run `npm i minimist` in phong-tro-backend');
  process.exit(1);
}

function parseArgs() {
  const args = minimist(process.argv.slice(2));
  return {
    past: Number(args.past || 0),
    future: Number(args.future || 2),
    createContracts: args.createContracts !== false,
    months: args.months ? Number(args.months) : null,
    dry: !!args.dry,
  };
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function detectTableColumns(table) {
  const res = await pool.query(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1`, [table]);
  return res.rows.reduce((acc, r) => { acc[r.column_name] = r.is_nullable; return acc }, {});
}

async function getEnumLabels(typeName) {
  try {
    const res = await pool.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = $1`, [typeName]);
    return res.rows.map(r => r.enumlabel);
  } catch (e) {
    return [];
  }
}

async function getFkTarget(table, column) {
  const fkRes = await pool.query(
    `SELECT ccu.table_name AS foreign_table_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1 AND kcu.column_name = $2`,
    [table, column]
  );
  return fkRes.rowCount ? fkRes.rows[0].foreign_table_name : null;
}

async function main() {
  const opts = parseArgs();
  console.log('Options:', opts);

  try {
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
    const monthsToCreate = opts.months || (opts.past + opts.future + 1);

    const contractCols = await detectTableColumns('contracts');
    const invoiceCols = await detectTableColumns('invoices');
    const contractTenantFk = await getFkTarget('contracts', 'tenant_id');
    const invoiceTenantFk = await getFkTarget('invoices', 'tenant_id');
    const invoiceStatusLabels = await getEnumLabels('invoice_status');

    const adminRes = await pool.query(`SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    const adminId = adminRes.rowCount ? adminRes.rows[0].user_id : null;

    for (const t of tenantsRes.rows) {
      console.log(`\nTenant ${t.tenant_id} (${t.email}) room ${t.room_number}`);

      // ensure contract
      let contractId = null;
      const tenantValueForContracts = contractTenantFk === 'users' ? t.user_id : t.tenant_id;
      const activeC = await pool.query(`SELECT contract_id FROM contracts WHERE tenant_id = $1 AND status = 'ACTIVE' LIMIT 1`, [tenantValueForContracts]);
      if (activeC.rowCount > 0) {
        contractId = activeC.rows[0].contract_id;
        console.log('  Found active contract', contractId);
      } else if (opts.createContracts) {
        const start = addMonths(now, -1);
        const end = addMonths(start, 12);
        const rent = t.price || 0;
        const createdBy = adminId || t.user_id || null;

        const fields = [];
        const values = [];

        fields.push('tenant_id'); values.push(tenantValueForContracts);
        if (contractCols['room_id'] !== undefined) { fields.push('room_id'); values.push(t.room_id); }
        fields.push('start_date'); values.push(start.toISOString().slice(0,10));
        fields.push('end_date'); values.push(end.toISOString().slice(0,10));

        if (contractCols['rent_price'] !== undefined) { fields.push('rent_price'); values.push(rent); }
        else if (contractCols['monthly_rent'] !== undefined) { fields.push('monthly_rent'); values.push(rent); }
        if (contractCols['deposit'] !== undefined) { fields.push('deposit'); values.push(rent); }

        fields.push('status'); values.push('ACTIVE');
        if (contractCols['created_by'] !== undefined) { fields.push('created_by'); values.push(createdBy); }

        const placeholders = values.map((_,i)=>`$${i+1}`).join(', ');
        const sql = `INSERT INTO contracts (${fields.join(',')}) VALUES (${placeholders}) RETURNING contract_id`;
        if (opts.dry) { console.log('  DRY RUN contract insert:', sql, values); }
        else {
          const res = await pool.query(sql, values);
          contractId = res.rows[0].contract_id;
          console.log('  Created contract', contractId);
          await pool.query(`UPDATE rooms SET status = 'RENTED' WHERE room_id = $1`, [t.room_id]);
        }
      }

      // create invoices for a range: past .. future
      const startOffset = -opts.past;
      const endOffset = opts.future;
      for (let off = startOffset; off <= endOffset; off++) {
        const target = addMonths(now, off);
        const month = target.getMonth() + 1;
        const year = target.getFullYear();
        const due = new Date(year, month - 1, 5);
        const rent = t.price || 0;
        const services = 0;
        const total = Number(rent) + Number(services);

        // build invoice fields
        const invFields = [];
        const invValues = [];
        const tenantValueForInvoices = invoiceTenantFk === 'users' ? t.user_id : t.tenant_id;
        invFields.push('tenant_id'); invValues.push(tenantValueForInvoices);
        if (invoiceCols['room_id'] !== undefined) { invFields.push('room_id'); invValues.push(t.room_id); }
        if (invoiceCols['contract_id'] !== undefined) {
          const contractIdNullable = invoiceCols['contract_id']; // 'YES' or 'NO'
          if (contractId) { invFields.push('contract_id'); invValues.push(contractId); }
          else if (contractIdNullable === 'NO') { console.log('  Skipping invoice: contract_id required and missing'); continue; }
          else { invFields.push('contract_id'); invValues.push(null); }
        }

        if (invoiceCols['billing_month'] !== undefined) { invFields.push('billing_month'); invValues.push(new Date(year, month-1, 1).toISOString().slice(0,10)); }
        else { if (invoiceCols['period_month'] !== undefined) { invFields.push('period_month'); invValues.push(month); } if (invoiceCols['period_year'] !== undefined) { invFields.push('period_year'); invValues.push(year); } }

        if (invoiceCols['rent_amount'] !== undefined) { invFields.push('rent_amount'); invValues.push(rent); }
        if (invoiceCols['services_amount'] !== undefined) { invFields.push('services_amount'); invValues.push(services); }
        if (invoiceCols['total_amount'] !== undefined) { invFields.push('total_amount'); invValues.push(total); }
        if (invoiceCols['due_date'] !== undefined) { invFields.push('due_date'); invValues.push(due.toISOString().slice(0,10)); }
        if (invoiceCols['status'] !== undefined) {
          const statusVal = invoiceStatusLabels.includes('ISSUED') ? 'ISSUED' : (invoiceStatusLabels[0] || null);
          if (statusVal) { invFields.push('status'); invValues.push(statusVal); }
        }
        if (invoiceCols['created_by'] !== undefined) { invFields.push('created_by'); invValues.push(adminId || t.user_id); }

        const placeholders = invValues.map((_,i)=>`$${i+1}`).join(', ');
        const sql = `INSERT INTO invoices (${invFields.join(',')}) VALUES (${placeholders}) RETURNING invoice_id`;
        if (opts.dry) { console.log('  DRY RUN invoice insert:', sql, invValues); }
        else {
          try {
            const r = await pool.query(sql, invValues);
            console.log('  Created invoice', r.rows[0].invoice_id, `for ${month}/${year}`);
          } catch (err) {
            if (err && err.code === '23505') { console.log('  Invoice exists, skipping'); }
            else { console.error('  Error creating invoice:', err.message || err); }
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

#!/usr/bin/env node
const pool = require('../src/config/db');

async function main() {
  try {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position
    `);
    console.log('Columns:');
    console.table(cols.rows);

    const fks = await pool.query(`
      SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'invoices' AND tc.constraint_type = 'FOREIGN KEY'
    `);
    console.log('Foreign keys:');
    console.table(fks.rows);

    const enums = await pool.query(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'invoice_status'
    `).catch(()=>({rowCount:0, rows:[]}));
    console.log('Enum invoice_status values:');
    console.table(enums.rows);

    const constraints = await pool.query(`
      SELECT conname, contype::text, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      WHERE conrelid = 'invoices'::regclass
    `).catch(()=>({rowCount:0, rows:[]}));
    console.log('Constraints:');
    console.table(constraints.rows);

    await pool.end();
  } catch (err) {
    console.error('Error describing invoices:', err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

main();

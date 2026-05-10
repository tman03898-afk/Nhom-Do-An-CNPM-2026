#!/usr/bin/env node
/* eslint-disable no-console */
const pool = require('../src/config/db');

async function columnExists(table, column) {
  const r = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name=$1
      AND column_name=$2
    LIMIT 1
  `.trim(),
    [table, column]
  );
  return r.rowCount > 0;
}

async function tableExists(table) {
  const r = await pool.query(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name=$1
      AND table_type='BASE TABLE'
    LIMIT 1
  `.trim(),
    [table]
  );
  return r.rowCount > 0;
}

async function dropForeignKeysOnColumn(table, column) {
  const r = await pool.query(
    `
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.constraint_schema = kcu.constraint_schema
    WHERE tc.constraint_schema='public'
      AND tc.table_name=$1
      AND tc.constraint_type='FOREIGN KEY'
      AND kcu.column_name=$2
  `.trim(),
    [table, column]
  );

  for (const row of r.rows) {
    const name = row.constraint_name;
    console.log(`- Dropping FK ${table}.${column}: ${name}`);
    await pool.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}"`);
  }
}

async function main() {
  console.log('Starting DB migration 2026-05-05...');

  // 1) invoices.tenant_id -> tenants.tenant_id
  if (await tableExists('invoices')) {
    if (await columnExists('invoices', 'tenant_id')) {
      console.log('Updating FK: invoices.tenant_id -> tenants.tenant_id');
      await dropForeignKeysOnColumn('invoices', 'tenant_id');

      // Ensure referenced table exists
      if (!(await tableExists('tenants'))) {
        throw new Error('Table tenants does not exist; cannot add FK invoices.tenant_id -> tenants.tenant_id');
      }

      // Add FK if missing
      await pool.query(
        `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname='public'
              AND t.relname='invoices'
              AND c.contype='f'
              AND c.conname='fk_invoices_tenant_id_tenants'
          ) THEN
            ALTER TABLE invoices
              ADD CONSTRAINT fk_invoices_tenant_id_tenants
              FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
          END IF;
        END $$;
      `.trim()
      );
    } else {
      console.log('Skipping invoices FK update: column invoices.tenant_id not found.');
    }
  } else {
    console.log('Skipping invoices FK update: table invoices not found.');
  }

  // 2) Unique: only one ACTIVE contract per room
  if (await tableExists('contracts')) {
    console.log("Creating partial unique index: contracts(room_id) WHERE status='ACTIVE'");
    await pool.query(
      `
      CREATE UNIQUE INDEX IF NOT EXISTS ux_contracts_active_room
        ON contracts (room_id)
        WHERE status = 'ACTIVE'::contract_status
    `.trim()
    );
  } else {
    console.log('Skipping partial unique index: table contracts not found.');
  }

  // 3) notifications: drop body
  if (await tableExists('notifications')) {
    if (await columnExists('notifications', 'body')) {
      console.log('Dropping column notifications.body');
      await pool.query(`ALTER TABLE notifications DROP COLUMN IF EXISTS body`);
    } else {
      console.log('Skipping drop notifications.body: column not found.');
    }
  } else {
    console.log('Skipping notifications alteration: table not found.');
  }

  // 4) Drop services table
  if (await tableExists('services')) {
    console.log('Dropping table services (CASCADE)');
    await pool.query(`DROP TABLE IF EXISTS services CASCADE`);
  } else {
    console.log('Skipping drop services: table not found.');
  }

  console.log('DB migration 2026-05-05 done.');
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);
    try {
      await pool.end();
    } catch (e) {}
    process.exitCode = 1;
  });


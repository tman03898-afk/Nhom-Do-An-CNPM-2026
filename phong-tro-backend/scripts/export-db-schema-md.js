#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

function mdCode(v) {
  if (v === null || v === undefined) return '';
  return '`' + String(v).replace(/`/g, '\\`') + '`';
}

function mdCell(v) {
  if (v === null || v === undefined || v === '') return '';
  // Avoid breaking tables with newlines.
  return String(v).replace(/\r?\n/g, ' ').trim();
}

async function getTables() {
  const r = await pool.query(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
  `.trim()
  );
  return r.rows.map((x) => x.table_name);
}

async function getEstimatedRowsByTable() {
  const r = await pool.query(
    `
    SELECT c.relname AS table_name,
           GREATEST(COALESCE(c.reltuples, 0), 0)::bigint AS estimated_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname ASC
  `.trim()
  );
  const map = new Map();
  for (const row of r.rows) map.set(row.table_name, Number(row.estimated_rows) || 0);
  return map;
}

async function getPrimaryKeyColumns() {
  const r = await pool.query(
    `
    SELECT
      ccu.table_name,
      ccu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.constraint_schema = 'public'
  `.trim()
  );

  const map = new Map(); // table -> Set(columns)
  for (const row of r.rows) {
    if (!map.has(row.table_name)) map.set(row.table_name, new Set());
    map.get(row.table_name).add(row.column_name);
  }
  return map;
}

async function getForeignKeys() {
  const r = await pool.query(
    `
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_schema = 'public'
    ORDER BY tc.table_name, kcu.ordinal_position
  `.trim()
  );

  const map = new Map(); // `${table}.${col}` -> `${refTable}.${refCol}`
  for (const row of r.rows) {
    map.set(
      `${row.table_name}.${row.column_name}`,
      `${row.foreign_table_name}.${row.foreign_column_name}`
    );
  }
  return map;
}

async function getColumnsForTable(tableName) {
  const r = await pool.query(
    `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position ASC
  `.trim(),
    [tableName]
  );

  return r.rows.map((row) => {
    const isEnumLike =
      row.data_type === 'USER-DEFINED' &&
      row.udt_name &&
      !['geometry', 'geography'].includes(String(row.udt_name));

    return {
      column_name: row.column_name,
      type: isEnumLike ? row.udt_name : row.data_type,
      nullable: String(row.is_nullable).toUpperCase() === 'YES',
      default: row.column_default,
    };
  });
}

async function main() {
  const tables = await getTables();
  const estimatedRows = await getEstimatedRowsByTable();
  const pkColsByTable = await getPrimaryKeyColumns();
  const fkRefByColumn = await getForeignKeys();

  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push('# Database Schema Current');
  lines.push('');
  lines.push(
    `Schema duoi day duoc xuat tu database PostgreSQL hien tai cua du an tai thoi diem \`${today}\`.`
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Table | Estimated rows |');
  lines.push('| --- | ---: |');
  for (const t of tables) {
    lines.push(`| ${mdCode(t)} | ${estimatedRows.get(t) ?? 0} |`);
  }

  for (const t of tables) {
    lines.push('');
    lines.push(`## ${t}`);
    lines.push('');
    lines.push('| Column | Type | Nullable | Key | Reference | Default |');
    lines.push('| --- | --- | --- | --- | --- | --- |');

    const cols = await getColumnsForTable(t);
    const pkCols = pkColsByTable.get(t) || new Set();

    for (const c of cols) {
      const key = pkCols.has(c.column_name) ? 'PK' : '';
      const ref = fkRefByColumn.get(`${t}.${c.column_name}`) || '';
      lines.push(
        `| ${mdCode(c.column_name)} | ${mdCode(mdCell(c.type))} | ${
          c.nullable ? 'Yes' : 'No'
        } | ${key ? mdCode(key) : ''} | ${ref ? mdCode(ref) : ''} | ${
          c.default ? mdCode(mdCell(c.default)) : ''
        } |`
      );
    }
  }

  lines.push('');

  const outPath = path.resolve(__dirname, '..', 'DB_SCHEMA_CURRENT.md');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath}`);
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


const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30_000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5_000),
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('PostgreSQL connection error:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
  } else {
    console.log('PostgreSQL connected successfully.');
    release();
  }
});

module.exports = pool;

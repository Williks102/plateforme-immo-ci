/**
 * Migration Sprint 2 & 3
 * Usage: DATABASE_URL=... node scripts/migrate-s2s3.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath   = join(__dirname, '..', 'migrate-sprint2-sprint3.sql');
const sql       = readFileSync(sqlPath, 'utf8');

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

try {
  await pool.query(sql);
  console.log('✅ Migration Sprint 2 & 3 appliquée avec succès.');
} catch (err) {
  console.error('❌ Erreur migration:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}

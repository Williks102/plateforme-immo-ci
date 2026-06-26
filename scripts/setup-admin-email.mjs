/**
 * Configure le compte admin email.
 * Usage : node scripts/setup-admin-email.mjs
 * Vars requises : DATABASE_URL (dans .env.local ou l'env)
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const bcrypt  = require('bcryptjs');
const { Pool } = pg;

// Charger .env.local manuellement
try {
  const env = readFileSync('.env.local', 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch { /* .env.local absent, on continue avec les vars existantes */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL manquante');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false,
});

// --- Config admin ---
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@immoci.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
// --------------------

async function run() {
  const client = await pool.connect();
  try {
    // 1. Migration schema
    const sql = readFileSync('migrate-email-auth.sql', 'utf-8');
    await client.query(sql);
    console.log('OK migration schema');

    // 2. Hash du mot de passe admin
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // 3. Insérer ou mettre à jour l'admin
    const r = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) WHERE email IS NOT NULL
       DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
       RETURNING id`,
      [ADMIN_EMAIL, hash]
    );
    console.log(`OK Admin configuré : ${ADMIN_EMAIL} (id: ${r.rows[0].id})`);
    console.log(`   Mot de passe    : ${ADMIN_PASSWORD}`);
    console.log('   Changez-le après la première connexion !');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });

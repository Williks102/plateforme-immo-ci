-- Migration : passage de l'auth OTP/phone vers email + password
-- Exécuter via : node scripts/run-migration.mjs

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Rendre phone optionnel
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Index unique sur email (NULL ignoré automatiquement par PostgreSQL)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)
  WHERE email IS NOT NULL;

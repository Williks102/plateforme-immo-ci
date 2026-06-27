-- ============================================================
-- MIGRATION SPRINT 2 + 3
-- Exécuter : node scripts/migrate-s2s3.mjs
-- ============================================================

-- === SPRINT 2 ===

-- 2FA TOTP admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled  BOOLEAN NOT NULL DEFAULT FALSE;

-- KYC propriétaires
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status        VARCHAR(20) NOT NULL DEFAULT 'unverified'
  CHECK (kyc_status IN ('unverified','id_submitted','verified','rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_url  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_reviewed_at   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_reviewed_by   UUID REFERENCES users(id);

-- Avis clients
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);

-- Mettre à jour avg_rating / review_count depuis la table reviews
CREATE OR REPLACE FUNCTION refresh_listing_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE listings SET
    avg_rating   = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE listing_id = NEW.listing_id AND is_visible),
    review_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = NEW.listing_id AND is_visible)
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_refresh_rating ON reviews;
CREATE TRIGGER trg_refresh_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION refresh_listing_rating();

-- === SPRINT 3 ===

-- Table d'audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID NOT NULL REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_id);

-- Photos avec pHash pour détection doublons
CREATE TABLE IF NOT EXISTS listing_photos (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  phash      BIGINT,
  position   SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rotation des secrets
CREATE TABLE IF NOT EXISTS secret_rotations (
  secret_name  VARCHAR(100) PRIMARY KEY,
  last_rotated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_by   UUID REFERENCES users(id),
  notes        TEXT
);
INSERT INTO secret_rotations (secret_name) VALUES
  ('NEXTAUTH_SECRET'),
  ('PAYMENT_WEBHOOK_SECRET'),
  ('WHATSAPP_API_TOKEN'),
  ('CLOUDINARY_API_SECRET'),
  ('SMS_PROVIDER_API_KEY')
ON CONFLICT DO NOTHING;

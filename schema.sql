-- ============================================================
-- SCHEMA PostgreSQL + PostGIS — Plateforme Immobilière CI
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone           VARCHAR(20) NOT NULL UNIQUE,
  full_name       VARCHAR(120),
  email           VARCHAR(255),
  whatsapp_number VARCHAR(20),
  avatar_url      TEXT,
  role            VARCHAR(20) NOT NULL DEFAULT 'client'
                    CHECK (role IN ('client', 'proprietaire', 'admin')),
  is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
  banned_at       TIMESTAMPTZ,
  ban_reason      TEXT,
  kyc_status      VARCHAR(20) NOT NULL DEFAULT 'unverified'
                    CHECK (kyc_status IN ('unverified', 'id_submitted', 'verified', 'rejected')),
  kyc_document_url  TEXT,
  kyc_reviewed_at   TIMESTAMPTZ,
  kyc_reviewed_by   UUID REFERENCES users(id),
  totp_secret     TEXT,
  totp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role  ON users(role);

-- ============================================================
-- OTP CODES
-- ============================================================
CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       VARCHAR(20) NOT NULL,
  code        CHAR(6)     NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone, used, expires_at);

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES users(id),
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  type            VARCHAR(20) NOT NULL DEFAULT 'saisonnier'
                    CHECK (type IN ('saisonnier', 'longue_duree')),
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  quartier        VARCHAR(100),
  commune         VARCHAR(100),
  adresse_indicative TEXT,
  prix_nuitee     NUMERIC(12,2),
  nb_chambres     SMALLINT DEFAULT 1,
  nb_salles_bain  SMALLINT DEFAULT 1,
  -- Équipements
  has_generator   BOOLEAN NOT NULL DEFAULT FALSE,
  has_water_pump  BOOLEAN NOT NULL DEFAULT FALSE,
  has_split_ac    BOOLEAN NOT NULL DEFAULT FALSE,
  has_wifi        BOOLEAN NOT NULL DEFAULT FALSE,
  has_parking     BOOLEAN NOT NULL DEFAULT FALSE,
  has_pool        BOOLEAN NOT NULL DEFAULT FALSE,
  -- Localisation
  location        GEOMETRY(Point, 4326),
  -- Vérification
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  -- Modération
  rejection_reason TEXT,
  -- Médias (tableau d'URLs)
  photos          TEXT[] DEFAULT '{}',
  -- Stats (dénormalisé pour performance)
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_owner  ON listings(owner_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_commune ON listings(commune);
CREATE INDEX idx_listings_location ON listings USING GIST(location);

-- ============================================================
-- LISTING PHOTOS (table dédiée pour Sprint 3)
-- ============================================================
CREATE TABLE listing_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  phash       BIGINT,
  position    SMALLINT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AVAILABILITY BLOCKS
-- Contrainte GIST : impossible d'insérer deux blocs qui se chevauchent
-- pour le même listing — filet de sécurité contre la double réservation
-- ============================================================
CREATE TABLE availability_blocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      VARCHAR(50) NOT NULL DEFAULT 'booking'
                CHECK (reason IN ('booking', 'owner_block', 'maintenance')),
  booking_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlap EXCLUDE USING GIST (
    listing_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  )
);

CREATE INDEX idx_avail_listing ON availability_blocks(listing_id);

-- Fonction de vérification de disponibilité
CREATE OR REPLACE FUNCTION check_availability(
  p_listing_id UUID,
  p_check_in   DATE,
  p_check_out  DATE
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM availability_blocks
    WHERE listing_id = p_listing_id
      AND daterange(start_date, end_date, '[)') && daterange(p_check_in, p_check_out, '[)')
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id              UUID NOT NULL REFERENCES listings(id),
  client_id               UUID NOT NULL REFERENCES users(id),
  check_in                DATE NOT NULL,
  check_out               DATE NOT NULL,
  -- Prix snapshot au moment de la réservation (immuable)
  prix_nuitee_snapshot    NUMERIC(12,2) NOT NULL,
  total_price             NUMERIC(12,2) NOT NULL,
  commission_platform     NUMERIC(12,2) NOT NULL,
  montant_proprietaire    NUMERIC(12,2) NOT NULL,
  -- Statut
  status                  VARCHAR(30) NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                              'pending', 'paid', 'checked_in',
                              'checked_out', 'disbursed_to_owner',
                              'cancelled', 'flagged_fraud'
                            )),
  -- Dates clés
  paid_at                 TIMESTAMPTZ,
  checked_in_at           TIMESTAMPTZ,
  checked_out_at          TIMESTAMPTZ,
  disbursed_at            TIMESTAMPTZ,
  -- Métadonnées
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_listing ON bookings(listing_id);
CREATE INDEX idx_bookings_client  ON bookings(client_id);
CREATE INDEX idx_bookings_status  ON bookings(status);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID NOT NULL REFERENCES bookings(id),
  provider            VARCHAR(50) NOT NULL DEFAULT 'paiementpro',
  provider_tx_id      TEXT UNIQUE,
  amount              NUMERIC(12,2) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'initiated'
                        CHECK (status IN ('initiated', 'success', 'failed', 'refunded')),
  webhook_payload     JSONB,
  webhook_received_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_provider_tx ON payments(provider_tx_id);

-- ============================================================
-- PAYMENT CALLBACK TOKENS (sécurité PaiementPro sans HMAC)
-- ============================================================
CREATE TABLE payment_callback_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(id),
  token       UUID NOT NULL UNIQUE,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_callback_tokens_token   ON payment_callback_tokens(token);
CREATE INDEX idx_callback_tokens_booking ON payment_callback_tokens(booking_id);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id),
  listing_id  UUID NOT NULL REFERENCES listings(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_listing ON reviews(listing_id);

-- Trigger pour mettre à jour avg_rating sur listings
CREATE OR REPLACE FUNCTION update_listing_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE listings SET
    avg_rating   = (SELECT AVG(rating) FROM reviews WHERE listing_id = NEW.listing_id AND is_visible = TRUE),
    review_count = (SELECT COUNT(*)    FROM reviews WHERE listing_id = NEW.listing_id AND is_visible = TRUE)
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_listing_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_listing_rating();

-- ============================================================
-- AUDIT LOGS (Sprint 3 — créé dès maintenant pour forward compat)
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID NOT NULL REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   UUID,
  metadata    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_target ON audit_logs(target_id);

-- ============================================================
-- SECRET ROTATIONS (Sprint 3)
-- ============================================================
CREATE TABLE secret_rotations (
  secret_name  VARCHAR(100) PRIMARY KEY,
  last_rotated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_by   UUID REFERENCES users(id),
  notes        TEXT
);

INSERT INTO secret_rotations (secret_name) VALUES
  ('NEXTAUTH_SECRET'),
  ('PAYMENT_WEBHOOK_SECRET'),
  ('WHATSAPP_API_TOKEN'),
  ('DO_SPACES_SECRET'),
  ('SMS_PROVIDER_API_KEY');

-- ============================================================
-- VUE : listings publiés avec coordonnées
-- ============================================================
CREATE OR REPLACE VIEW v_published_listings AS
SELECT
  l.id, l.owner_id, l.title, l.description,
  l.commune, l.quartier, l.adresse_indicative,
  l.prix_nuitee, l.remise_semaine_pct, l.remise_mois_pct,
  l.nb_chambres, l.nb_salles_bain,
  l.has_generator, l.has_water_pump, l.has_split_ac,
  l.has_wifi, l.has_parking, l.has_pool,
  l.is_verified, l.avg_rating, l.review_count,
  l.photos,
  ST_X(l.location) AS lng,
  ST_Y(l.location) AS lat,
  l.created_at
FROM listings l
WHERE l.status = 'published';

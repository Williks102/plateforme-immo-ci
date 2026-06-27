-- Sprint 4 : tarifs dégressifs
-- À exécuter sur la base Render via le dashboard PostgreSQL ou psql

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS remise_semaine_pct SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_mois_pct    SMALLINT NOT NULL DEFAULT 0;

-- Contraintes de cohérence
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_remise_semaine') THEN
    ALTER TABLE listings ADD CONSTRAINT chk_remise_semaine CHECK (remise_semaine_pct >= 0 AND remise_semaine_pct <= 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_remise_mois') THEN
    ALTER TABLE listings ADD CONSTRAINT chk_remise_mois CHECK (remise_mois_pct >= 0 AND remise_mois_pct <= 70);
  END IF;
END $$;

-- Snapshot de la remise appliquée dans chaque réservation
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS remise_appliquee_pct SMALLINT NOT NULL DEFAULT 0;

-- Recréer la vue pour inclure les nouvelles colonnes
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


-- 1. Extension required for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Clean up legacy tables from the deprecated Facility/Booking implementation
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS bookings_facility_lnk CASCADE;
DROP TABLE IF EXISTS bookings_requester_lnk CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS facilities_managers_lnk CASCADE;
DROP TABLE IF EXISTS facility_blackouts CASCADE;
DROP TABLE IF EXISTS facility_blackouts_facility_lnk CASCADE;
DROP TABLE IF EXISTS components_facility_booking_rules CASCADE;

-- 3. Ensure required foreign key helper columns exist on current tables
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS infrastructure_id INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE infrastructure_blackouts ADD COLUMN IF NOT EXISTS infrastructure_id INTEGER;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- 4. Synchronisation triggers to keep helper columns in sync with Strapi link tables
CREATE OR REPLACE FUNCTION sync_reservation_infrastructure_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE reservations
    SET infrastructure_id = NEW.infrastructure_id
    WHERE id = NEW.reservation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reservations
    SET infrastructure_id = NULL
    WHERE id = OLD.reservation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_reservation_infrastructure ON reservations_infrastructure_lnk;
CREATE TRIGGER trigger_sync_reservation_infrastructure
AFTER INSERT OR UPDATE OR DELETE ON reservations_infrastructure_lnk
FOR EACH ROW EXECUTE FUNCTION sync_reservation_infrastructure_id();

CREATE OR REPLACE FUNCTION sync_reservation_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE reservations
    SET user_id = NEW.user_id
    WHERE id = NEW.reservation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reservations
    SET user_id = NULL
    WHERE id = OLD.reservation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_reservation_user ON reservations_user_lnk;
CREATE TRIGGER trigger_sync_reservation_user
AFTER INSERT OR UPDATE OR DELETE ON reservations_user_lnk
FOR EACH ROW EXECUTE FUNCTION sync_reservation_user_id();

CREATE OR REPLACE FUNCTION sync_blackout_infrastructure_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE infrastructure_blackouts
    SET infrastructure_id = NEW.infrastructure_id
    WHERE id = NEW.infrastructure_blackout_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE infrastructure_blackouts
    SET infrastructure_id = NULL
    WHERE id = OLD.infrastructure_blackout_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_blackout_infrastructure ON infrastructure_blackouts_infrastructure_lnk;
CREATE TRIGGER trigger_sync_blackout_infrastructure
AFTER INSERT OR UPDATE OR DELETE ON infrastructure_blackouts_infrastructure_lnk
FOR EACH ROW EXECUTE FUNCTION sync_blackout_infrastructure_id();

CREATE OR REPLACE FUNCTION sync_device_token_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE device_tokens
    SET user_id = NEW.user_id
    WHERE id = NEW.device_token_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE device_tokens
    SET user_id = NULL
    WHERE id = OLD.device_token_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_device_token_user ON device_tokens_user_lnk;
CREATE TRIGGER trigger_sync_device_token_user
AFTER INSERT OR UPDATE OR DELETE ON device_tokens_user_lnk
FOR EACH ROW EXECUTE FUNCTION sync_device_token_user_id();

-- 5. Backfill helper columns for existing data
UPDATE reservations r
SET infrastructure_id = l.infrastructure_id
FROM reservations_infrastructure_lnk l
WHERE r.id = l.reservation_id;

UPDATE reservations r
SET user_id = l.user_id
FROM reservations_user_lnk l
WHERE r.id = l.reservation_id;

UPDATE infrastructure_blackouts b
SET infrastructure_id = l.infrastructure_id
FROM infrastructure_blackouts_infrastructure_lnk l
WHERE b.id = l.infrastructure_blackout_id;

UPDATE device_tokens dt
SET user_id = l.user_id
FROM device_tokens_user_lnk l
WHERE dt.id = l.device_token_id;

-- 6. Hard overlap constraint on confirmed reservations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservation_no_overlap'
  ) THEN
    ALTER TABLE reservations
    ADD CONSTRAINT reservation_no_overlap
    EXCLUDE USING gist (
      infrastructure_id WITH =,
      tsrange(start_time, end_time) WITH &&
    ) WHERE (etat_reservation = 'confirmed');
  END IF;
END $$;

-- 7. Prevent overlaps between infrastructure blackouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_blackout_no_overlap'
  ) THEN
    ALTER TABLE infrastructure_blackouts
    ADD CONSTRAINT infrastructure_blackout_no_overlap
    EXCLUDE USING gist (
      infrastructure_id WITH =,
      tsrange(start_at, end_at) WITH &&
    );
  END IF;
END $$;

-- 8. Performance indexes aligned with the new schema
CREATE INDEX IF NOT EXISTS idx_reservations_infra_start ON reservations(infrastructure_id, start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_infra_status ON reservations(infrastructure_id, etat_reservation);
CREATE INDEX IF NOT EXISTS idx_reservations_user_status ON reservations(user_id, etat_reservation);
CREATE INDEX IF NOT EXISTS idx_infra_blackouts_start ON infrastructure_blackouts(infrastructure_id, start_at);
CREATE INDEX IF NOT EXISTS idx_tokens_user_enabled ON device_tokens(user_id, enabled);

-- ============================================================================
-- CacaoScan migrate_to_v2.sql
-- Upgrades an EXISTING dual-model (variety+quality) schema → single 5-class schema
-- Run once in Supabase SQL Editor. Backup first.
-- After this, run/refresh security-schema.sql
-- ============================================================================

BEGIN;

-- ---------- 1. MACHINES ----------
-- IF NOT EXISTS does not add missing columns on an older machines table.
CREATE TABLE IF NOT EXISTS machines (
  machine_id TEXT PRIMARY KEY,
  master_pin TEXT NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade pre-v2 machines rows/columns (common cause of 42703 on created_at)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS master_pin TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure every row has a pin before we rely on NOT NULL semantics in pair_machine
UPDATE machines SET master_pin = '000000' WHERE master_pin IS NULL OR master_pin = '';
UPDATE machines SET created_at = NOW() WHERE created_at IS NULL;

DO $$
BEGIN
  ALTER TABLE machines ALTER COLUMN master_pin SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'machines.master_pin NOT NULL skip: %', SQLERRM;
END $$;

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view registered machines" ON machines;
DROP POLICY IF EXISTS "Authenticated users can view machine status" ON machines;

CREATE POLICY "Authenticated users can view machine status"
  ON machines FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE machines FROM anon, authenticated;
GRANT SELECT (machine_id, is_online, last_heartbeat, created_at) ON TABLE machines TO authenticated;
GRANT ALL ON TABLE machines TO service_role;

CREATE OR REPLACE FUNCTION pair_machine(p_machine_id TEXT, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM machines
    WHERE machine_id = p_machine_id AND master_pin = p_pin
  ) INTO ok;

  IF ok AND auth.uid() IS NOT NULL THEN
    UPDATE profiles
    SET linked_machine_id = p_machine_id, updated_at = NOW()
    WHERE id = auth.uid();
  END IF;

  RETURN ok;
END;
$$;

GRANT EXECUTE ON FUNCTION pair_machine(TEXT, TEXT) TO authenticated;

-- ---------- 2. PROFILES.linked_machine_id FK ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'linked_machine_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN linked_machine_id TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_linked_machine_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_linked_machine_id_fkey
      FOREIGN KEY (linked_machine_id) REFERENCES machines(machine_id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'profiles FK skip: %', SQLERRM;
END $$;

-- ---------- 3. BATCHES.machine_id + generated counters ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batches' AND column_name = 'machine_id'
  ) THEN
    ALTER TABLE batches ADD COLUMN machine_id TEXT REFERENCES machines(machine_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop old stored counters that will become GENERATED (safe to re-run)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'batches'
      AND column_name = 'export_grade_count'
      AND COALESCE(is_generated, 'NEVER') <> 'ALWAYS'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'batches'
      AND column_name = 'export_grade_count'
  ) THEN
    ALTER TABLE batches DROP COLUMN IF EXISTS export_grade_count;
    ALTER TABLE batches
      ADD COLUMN export_grade_count INTEGER GENERATED ALWAYS AS (
        criollo_count + forastero_count + trinitario_count
      ) STORED;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'batches'
      AND column_name = 'total_beans'
      AND COALESCE(is_generated, 'NEVER') <> 'ALWAYS'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'batches'
      AND column_name = 'total_beans'
  ) THEN
    ALTER TABLE batches DROP COLUMN IF EXISTS total_beans;
    ALTER TABLE batches
      ADD COLUMN total_beans INTEGER GENERATED ALWAYS AS (
        criollo_count + forastero_count + trinitario_count + needs_drying_count + rejected_count
      ) STORED;
  END IF;
END $$;

-- ---------- 4. CLASSIFICATIONS rebuild ----------
-- Rename old table, create new, migrate quality-first (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'classifications'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'classifications' AND column_name = 'variety'
  ) THEN
    ALTER TABLE classifications RENAME TO classifications_legacy_v1;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  operational_class TEXT NOT NULL CHECK (
    operational_class IN ('Criollo', 'Forastero', 'Trinitario', 'Needs_Drying', 'Rejected')
  ),
  confidence REAL NOT NULL DEFAULT 0.0,
  gate_actuated INTEGER NOT NULL CHECK (gate_actuated BETWEEN 1 AND 5),
  derived_grade TEXT NOT NULL CHECK (
    derived_grade IN ('Export Grade', 'High Moisture', 'Defect / Reject')
  ),
  image_url TEXT,
  model_version TEXT DEFAULT 'YOLOv8n-640-v1.0',
  classified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate once from legacy dual-model table (skip if already empty/migrated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'classifications_legacy_v1'
  ) AND NOT EXISTS (SELECT 1 FROM classifications LIMIT 1) THEN
    INSERT INTO classifications (
      id, batch_id, operational_class, confidence, gate_actuated, derived_grade, image_url, classified_at
    )
    SELECT
      id,
      batch_id,
      CASE
        WHEN lower(quality) IN ('rejected') THEN 'Rejected'
        WHEN lower(quality) IN ('needs_drying', 'needs drying') THEN 'Needs_Drying'
        WHEN lower(variety) = 'criollo' THEN 'Criollo'
        WHEN lower(variety) = 'forastero' THEN 'Forastero'
        WHEN lower(variety) = 'trinitario' THEN 'Trinitario'
        ELSE 'Rejected'
      END AS operational_class,
      COALESCE(NULLIF(quality_confidence, 0), variety_confidence, 0) AS confidence,
      CASE
        WHEN lower(quality) IN ('rejected') THEN 1
        WHEN lower(quality) IN ('needs_drying', 'needs drying') THEN 2
        WHEN lower(variety) = 'criollo' THEN 3
        WHEN lower(variety) = 'forastero' THEN 4
        WHEN lower(variety) = 'trinitario' THEN 5
        ELSE 1
      END AS gate_actuated,
      CASE
        WHEN lower(quality) IN ('rejected') THEN 'Defect / Reject'
        WHEN lower(quality) IN ('needs_drying', 'needs drying') THEN 'High Moisture'
        ELSE 'Export Grade'
      END AS derived_grade,
      image_url,
      classified_at
    FROM classifications_legacy_v1;
  END IF;
END $$;

ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own classifications" ON classifications;
DROP POLICY IF EXISTS "System can insert classifications" ON classifications;
DROP POLICY IF EXISTS "Users can insert own classifications" ON classifications;

CREATE POLICY "Users can view own classifications"
  ON classifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batches
      WHERE batches.id = classifications.batch_id
        AND batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own classifications"
  ON classifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches
      WHERE batches.id = classifications.batch_id
        AND batches.user_id = auth.uid()
    )
  );

-- Realtime: drop old membership if needed, add new
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE classifications_legacy_v1;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE classifications;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_classifications_batch_id ON classifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_classifications_class ON classifications(operational_class);

CREATE OR REPLACE FUNCTION bump_batch_counters_from_classification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE batches SET
    criollo_count = criollo_count + CASE WHEN NEW.operational_class = 'Criollo' THEN 1 ELSE 0 END,
    forastero_count = forastero_count + CASE WHEN NEW.operational_class = 'Forastero' THEN 1 ELSE 0 END,
    trinitario_count = trinitario_count + CASE WHEN NEW.operational_class = 'Trinitario' THEN 1 ELSE 0 END,
    needs_drying_count = needs_drying_count + CASE WHEN NEW.operational_class = 'Needs_Drying' THEN 1 ELSE 0 END,
    rejected_count = rejected_count + CASE WHEN NEW.operational_class = 'Rejected' THEN 1 ELSE 0 END
  WHERE id = NEW.batch_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_batch_counters ON classifications;
CREATE TRIGGER trg_bump_batch_counters
  AFTER INSERT ON classifications
  FOR EACH ROW
  EXECUTE FUNCTION bump_batch_counters_from_classification();

-- Keep legacy for a short audit window; drop manually when confident:
-- DROP TABLE classifications_legacy_v1;

COMMIT;

-- ============================================================================
-- CacaoScan Database Schema v2.0 (canonical — fresh projects)
-- Single-pass 5-class YOLOv8 · Capstone 2
-- Run in Supabase SQL Editor on an EMPTY public schema, then run security-schema.sql
-- Existing projects: use migrate_to_v2.sql instead
-- ============================================================================

-- ============================================
-- 1. MACHINES (create first — breaks circular FK)
-- ============================================
CREATE TABLE IF NOT EXISTS machines (
  machine_id TEXT PRIMARY KEY,
  master_pin TEXT NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- Status visible; master_pin protected via column grants + RPC (see below)
CREATE POLICY "Authenticated users can view machine status"
  ON machines FOR SELECT
  TO authenticated
  USING (true);

-- Column-level: authenticated cannot read master_pin
REVOKE ALL ON TABLE machines FROM anon, authenticated;
GRANT SELECT (machine_id, is_online, last_heartbeat, created_at) ON TABLE machines TO authenticated;
GRANT ALL ON TABLE machines TO service_role;

-- Pairing RPC — verifies PIN without exposing it
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

-- ============================================
-- 2. PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  farm_location TEXT NOT NULL DEFAULT 'Zamboanga City, Philippines',
  role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
  contact_number TEXT DEFAULT '',
  linked_machine_id TEXT REFERENCES machines(machine_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, farm_location, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'farm_location', 'Zamboanga City'),
    'farmer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 3. BATCHES
-- ============================================
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id TEXT REFERENCES machines(machine_id) ON DELETE SET NULL,
  batch_name TEXT NOT NULL,
  harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_bean_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),

  criollo_count INTEGER NOT NULL DEFAULT 0,
  forastero_count INTEGER NOT NULL DEFAULT 0,
  trinitario_count INTEGER NOT NULL DEFAULT 0,
  needs_drying_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,

  export_grade_count INTEGER GENERATED ALWAYS AS (
    criollo_count + forastero_count + trinitario_count
  ) STORED,
  total_beans INTEGER GENERATED ALWAYS AS (
    criollo_count + forastero_count + trinitario_count + needs_drying_count + rejected_count
  ) STORED,

  duration_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches"
  ON batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own batches"
  ON batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches"
  ON batches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own batches"
  ON batches FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE batches;

-- ============================================
-- 4. CLASSIFICATIONS (single 5-class model)
-- Gate map: 1=Rejected@36 2=Needs_Drying@42 3=Criollo@48 4=Forastero@54 5=Trinitario@60
-- ============================================
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

ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own classifications"
  ON classifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batches
      WHERE batches.id = classifications.batch_id
        AND batches.user_id = auth.uid()
    )
  );

-- Mobile app inserts while user session is active
CREATE POLICY "Users can insert own classifications"
  ON classifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches
      WHERE batches.id = classifications.batch_id
        AND batches.user_id = auth.uid()
    )
  );

-- Edge / Python gateway must use service_role key (bypasses RLS)
COMMENT ON TABLE classifications IS
  '5-class bean events. Client inserts with user JWT; machine gateway uses service_role.';

ALTER PUBLICATION supabase_realtime ADD TABLE classifications;

CREATE INDEX IF NOT EXISTS idx_classifications_batch_id ON classifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_classifications_class ON classifications(operational_class);

-- Keep batch ledger counters in sync when a bean event is inserted
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

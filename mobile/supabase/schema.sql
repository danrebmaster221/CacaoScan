-- CacaoScan Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ============================================
-- 1. PROFILES TABLE (for role-based access)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  farm_location TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
  contact_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read/update their own profile, admins can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, farm_location, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'farm_location', ''),
    'farmer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. BATCHES TABLE (sorting sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  target_bean_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),

  -- Variety counters
  criollo_count INTEGER NOT NULL DEFAULT 0,
  forastero_count INTEGER NOT NULL DEFAULT 0,
  trinitario_count INTEGER NOT NULL DEFAULT 0,

  -- Quality counters
  export_grade_count INTEGER NOT NULL DEFAULT 0,
  needs_drying_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,

  -- Throughput
  total_beans INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Users can only access their own batches
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

-- Enable realtime for live counters
ALTER PUBLICATION supabase_realtime ADD TABLE batches;

-- ============================================
-- 3. CLASSIFICATIONS TABLE (individual bean results)
-- ============================================
CREATE TABLE IF NOT EXISTS classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,

  -- Model A: Variety
  variety TEXT NOT NULL CHECK (variety IN ('criollo', 'forastero', 'trinitario')),
  variety_confidence REAL NOT NULL DEFAULT 0,

  -- Model B: Quality
  quality TEXT NOT NULL CHECK (quality IN ('export_grade', 'needs_drying', 'rejected')),
  quality_confidence REAL NOT NULL DEFAULT 0,

  classified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Users can access classifications through their batch ownership
CREATE POLICY "Users can view own classifications"
  ON classifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM batches
      WHERE batches.id = classifications.batch_id
      AND batches.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert classifications"
  ON classifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batches
      WHERE batches.id = classifications.batch_id
      AND batches.user_id = auth.uid()
    )
  );

-- Enable realtime for live classification feed
ALTER PUBLICATION supabase_realtime ADD TABLE classifications;

-- ============================================================
-- Migration: AI blood-loss columns + training/simulation tables
-- Sprint 9 — Infrastructure & Dual Mode
-- ============================================================

-- ── AI columns on vital_signs ────────────────────────────────
ALTER TABLE vital_signs
  ADD COLUMN IF NOT EXISTS blood_loss_ai_estimate INTEGER,
  ADD COLUMN IF NOT EXISTS blood_loss_confidence  REAL,
  ADD COLUMN IF NOT EXISTS blood_loss_ai_method   TEXT;

COMMENT ON COLUMN vital_signs.blood_loss_ai_estimate IS 'AI-estimated blood loss in mL';
COMMENT ON COLUMN vital_signs.blood_loss_confidence  IS 'Confidence score 0-1 from AI model';
COMMENT ON COLUMN vital_signs.blood_loss_ai_method   IS 'Method used: camera, vitals, combined';

-- ── Training scenarios (pre-built + AI-generated) ────────────
CREATE TABLE IF NOT EXISTS training_scenarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  difficulty    TEXT NOT NULL DEFAULT 'beginner'
                CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  scenario_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Training sessions (user attempts at scenarios) ───────────
CREATE TABLE IF NOT EXISTS training_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id   UUID REFERENCES training_scenarios(id) ON DELETE SET NULL,
  score         JSONB DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- ── Training videos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  emotive_step  TEXT CHECK (emotive_step IN (
                  'early_detection', 'massage', 'oxytocin',
                  'txa', 'iv_fluids', 'escalation', 'general'
                )),
  source_type   TEXT NOT NULL DEFAULT 'bundled'
                CHECK (source_type IN ('bundled', 'supabase', 'youtube')),
  source_url    TEXT,
  asset_key     TEXT,
  duration_secs INTEGER,
  thumbnail_url TEXT,
  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_videos    ENABLE ROW LEVEL SECURITY;

-- Scenarios: readable by all authenticated users
CREATE POLICY "Authenticated users can read active scenarios"
  ON training_scenarios FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Scenarios: admins/supervisors can manage
CREATE POLICY "Admins and supervisors can manage scenarios"
  ON training_scenarios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- Sessions: users can manage their own
CREATE POLICY "Users can manage own training sessions"
  ON training_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Sessions: supervisors/admins can view all
CREATE POLICY "Supervisors can view all training sessions"
  ON training_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- Videos: readable by all authenticated users
CREATE POLICY "Authenticated users can read active videos"
  ON training_videos FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Videos: admins can manage
CREATE POLICY "Admins can manage training videos"
  ON training_videos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_training_sessions_user
  ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_scenario
  ON training_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_training_videos_step
  ON training_videos(emotive_step);

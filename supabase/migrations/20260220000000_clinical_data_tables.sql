-- Phase 3: Risk Assessment & Clinical Data
-- Creates maternal_profiles, vital_signs, and sync_queue tables

-- ============================================================
-- TABLE: maternal_profiles
-- Patient records tied to deliveries with AWHONN risk factors
-- ============================================================
CREATE TABLE public.maternal_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id               UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  unit_id                   UUID REFERENCES public.units(id) ON DELETE SET NULL,
  created_by                UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Demographics
  patient_id                TEXT,                -- Hospital/facility patient ID
  age                       INTEGER NOT NULL,

  -- Pregnancy info
  gravida                   INTEGER DEFAULT 1,   -- Total pregnancies
  parity                    INTEGER DEFAULT 0,   -- Previous births
  gestational_age_weeks     INTEGER,

  -- AWHONN Medium-Risk Factors
  is_multiple_gestation     BOOLEAN DEFAULT false,
  has_prior_cesarean        BOOLEAN DEFAULT false,
  has_placenta_previa       BOOLEAN DEFAULT false,
  has_large_fibroids        BOOLEAN DEFAULT false,
  has_anemia                BOOLEAN DEFAULT false,   -- Hct <30% / Hb <10
  has_pph_history           BOOLEAN DEFAULT false,   -- 1 previous PPH
  has_intraamniotic_infection BOOLEAN DEFAULT false,

  -- AWHONN High-Risk Factors
  has_severe_anemia         BOOLEAN DEFAULT false,   -- Hb <8
  has_coagulopathy          BOOLEAN DEFAULT false,
  has_severe_pph_history    BOOLEAN DEFAULT false,   -- >1 PPH or >1500mL
  has_placenta_accreta      BOOLEAN DEFAULT false,
  has_active_bleeding       BOOLEAN DEFAULT false,
  has_morbid_obesity        BOOLEAN DEFAULT false,

  -- Lab values
  hemoglobin_level          DECIMAL(4,1),            -- g/dL

  -- Computed risk
  risk_level                TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_score                INTEGER DEFAULT 0,

  -- Case lifecycle
  delivery_time             TIMESTAMPTZ,
  status                    TEXT DEFAULT 'pre_delivery' CHECK (status IN ('pre_delivery', 'active', 'monitoring', 'closed')),
  outcome                   TEXT CHECK (outcome IN ('normal', 'pph_resolved', 'referred', 'death')),
  notes                     TEXT,

  -- Sync tracking
  is_synced                 BOOLEAN DEFAULT false,
  local_id                  TEXT,              -- Client-generated UUID for offline

  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_maternal_profiles_facility ON public.maternal_profiles(facility_id);
CREATE INDEX idx_maternal_profiles_unit ON public.maternal_profiles(unit_id);
CREATE INDEX idx_maternal_profiles_created_by ON public.maternal_profiles(created_by);
CREATE INDEX idx_maternal_profiles_status ON public.maternal_profiles(status);
CREATE INDEX idx_maternal_profiles_local_id ON public.maternal_profiles(local_id);

-- ============================================================
-- TABLE: vital_signs
-- Time-series vital sign entries with shock index
-- ============================================================
CREATE TABLE public.vital_signs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maternal_profile_id       UUID NOT NULL REFERENCES public.maternal_profiles(id) ON DELETE CASCADE,
  recorded_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Core vitals
  heart_rate                INTEGER,             -- bpm
  systolic_bp               INTEGER,             -- mmHg
  diastolic_bp              INTEGER,             -- mmHg
  temperature               DECIMAL(4,1),        -- °C
  respiratory_rate          INTEGER,             -- breaths/min
  spo2                      INTEGER,             -- % oxygen saturation

  -- Computed hemodynamic indicator
  shock_index               DECIMAL(3,1),        -- HR / systolic_bp

  -- Blood loss tracking
  estimated_blood_loss      INTEGER DEFAULT 0,   -- mL (cumulative)
  blood_loss_method         TEXT CHECK (blood_loss_method IN ('visual', 'drape', 'weighed')),

  -- Sync tracking
  is_synced                 BOOLEAN DEFAULT false,
  local_id                  TEXT,

  recorded_at               TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_vital_signs_profile ON public.vital_signs(maternal_profile_id);
CREATE INDEX idx_vital_signs_recorded_at ON public.vital_signs(recorded_at);
CREATE INDEX idx_vital_signs_local_id ON public.vital_signs(local_id);

-- ============================================================
-- TABLE: sync_queue
-- Offline-first operation queue
-- ============================================================
CREATE TABLE public.sync_queue (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name                TEXT NOT NULL,
  record_id                 TEXT NOT NULL,        -- Local UUID
  operation                 TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  payload                   JSONB NOT NULL,
  retry_count               INTEGER DEFAULT 0,
  max_retries               INTEGER DEFAULT 5,
  status                    TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  error_message             TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  synced_at                 TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX idx_sync_queue_table ON public.sync_queue(table_name);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.maternal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- ---- maternal_profiles ----

-- Staff can view profiles in their facility
CREATE POLICY "Staff can view maternal profiles in their facility"
  ON public.maternal_profiles FOR SELECT
  USING (
    facility_id IN (
      SELECT p.facility_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Staff can create maternal profiles
CREATE POLICY "Staff can create maternal profiles"
  ON public.maternal_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin')
    )
  );

-- Staff can update their own created profiles
CREATE POLICY "Staff can update maternal profiles they created"
  ON public.maternal_profiles FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('supervisor', 'admin')
    )
  );

-- Admin can delete
CREATE POLICY "Admin can delete maternal profiles"
  ON public.maternal_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- vital_signs ----

-- Staff can view vitals for profiles in their facility
CREATE POLICY "Staff can view vital signs in their facility"
  ON public.vital_signs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE mp.id = vital_signs.maternal_profile_id
      AND (mp.facility_id = p.facility_id OR p.role = 'admin')
    )
  );

-- Staff can insert vital signs
CREATE POLICY "Staff can record vital signs"
  ON public.vital_signs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin')
    )
  );

-- Staff can update their own recorded vitals
CREATE POLICY "Staff can update their own vital signs"
  ON public.vital_signs FOR UPDATE
  USING (
    recorded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('supervisor', 'admin')
    )
  );

-- ---- sync_queue ----

-- Users can manage their own sync queue entries
CREATE POLICY "Users can manage their own sync queue"
  ON public.sync_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGER for maternal_profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_maternal_profiles_updated_at
  BEFORE UPDATE ON public.maternal_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

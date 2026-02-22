-- Phase 3b: E-MOTIVE Checklist
-- Tracks completion of WHO E-MOTIVE bundle steps per maternal case

CREATE TABLE public.emotive_checklists (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maternal_profile_id       UUID NOT NULL REFERENCES public.maternal_profiles(id) ON DELETE CASCADE,
  performed_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- E — Early detection & response
  early_detection_done      BOOLEAN DEFAULT false,
  early_detection_time      TIMESTAMPTZ,
  early_detection_notes     TEXT,

  -- M — Uterine Massage
  massage_done              BOOLEAN DEFAULT false,
  massage_time              TIMESTAMPTZ,
  massage_notes             TEXT,

  -- O — Oxytocin
  oxytocin_done             BOOLEAN DEFAULT false,
  oxytocin_time             TIMESTAMPTZ,
  oxytocin_dose             TEXT,
  oxytocin_notes            TEXT,

  -- T — Tranexamic Acid (TXA)
  txa_done                  BOOLEAN DEFAULT false,
  txa_time                  TIMESTAMPTZ,
  txa_dose                  TEXT,
  txa_notes                 TEXT,

  -- I — IV Fluids
  iv_fluids_done            BOOLEAN DEFAULT false,
  iv_fluids_time            TIMESTAMPTZ,
  iv_fluids_volume          TEXT,
  iv_fluids_notes           TEXT,

  -- V/E — Escalation
  escalation_done           BOOLEAN DEFAULT false,
  escalation_time           TIMESTAMPTZ,
  escalation_notes          TEXT,

  -- Sync tracking
  is_synced                 BOOLEAN DEFAULT false,
  local_id                  TEXT,

  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_emotive_profile ON public.emotive_checklists(maternal_profile_id);
CREATE INDEX idx_emotive_local_id ON public.emotive_checklists(local_id);

-- Auto-update updated_at
CREATE TRIGGER update_emotive_updated_at
  BEFORE UPDATE ON public.emotive_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.emotive_checklists ENABLE ROW LEVEL SECURITY;

-- Staff can view checklists for profiles in their facility
CREATE POLICY "Staff can view emotive checklists in their facility"
  ON public.emotive_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE mp.id = emotive_checklists.maternal_profile_id
      AND (mp.facility_id = p.facility_id OR p.role = 'admin')
    )
  );

-- Staff can create emotive checklists
CREATE POLICY "Staff can create emotive checklists"
  ON public.emotive_checklists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin')
    )
  );

-- Staff can update checklists they created, supervisors/admins can update any
CREATE POLICY "Staff can update emotive checklists"
  ON public.emotive_checklists FOR UPDATE
  USING (
    performed_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('supervisor', 'admin')
    )
  );

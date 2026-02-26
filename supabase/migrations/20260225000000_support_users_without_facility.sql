-- Migration: Support normal users without facility assignment and update case events policies
-- Allow normal users to create and access profiles even without facility_id
-- Also add the missing case events policies that should run after the table is created

-- ============================================
-- CASE EVENTS POLICIES (should run after emergency_and_timeline migration)
-- ============================================

-- Update the existing policies to support users without facility
DROP POLICY IF EXISTS "Staff can view events for their facility" ON public.case_events;

CREATE POLICY "Staff can view events for their facility"
  ON public.case_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = case_events.maternal_profile_id
      AND (
        -- Facility match (for staff with facility)
        (
          mp.facility_id IS NOT NULL 
          AND mp.facility_id IN (
            SELECT p.facility_id FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.facility_id IS NOT NULL
          )
        )
        OR mp.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Staff can insert events" ON public.case_events;

CREATE POLICY "Staff can insert events"
  ON public.case_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin', 'user')
    )
  );

-- ============================================
-- UPDATE MATERNAL PROFILES POLICIES FOR USERS WITHOUT FACILITY
-- ============================================

-- Update the SELECT policy to handle users without facility_id
DROP POLICY IF EXISTS "Staff can view maternal profiles in their facility" ON public.maternal_profiles;

CREATE POLICY "Staff can view maternal profiles in their facility"
  ON public.maternal_profiles FOR SELECT
  USING (
    -- User's facility matches profile's facility (for staff with facility)
    (
      facility_id IS NOT NULL 
      AND facility_id IN (
        SELECT p.facility_id FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.facility_id IS NOT NULL
      )
    )
    OR
    -- Admin has access to all
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR
    -- User created this profile (for unassigned staff and normal users)
    created_by = auth.uid()
  );

-- ============================================
-- UPDATE VITAL SIGNS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Staff can view vital signs in their facility" ON public.vital_signs;

CREATE POLICY "Staff can view vital signs in their facility"
  ON public.vital_signs FOR SELECT
  USING (
    -- Allow viewing vitals if user can access the parent profile
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = vital_signs.maternal_profile_id
      AND (
        -- Facility match (for staff with facility)
        (
          mp.facility_id IS NOT NULL 
          AND mp.facility_id IN (
            SELECT p.facility_id FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.facility_id IS NOT NULL
          )
        )
        OR mp.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

-- ============================================
-- UPDATE EMOTIVE CHECKLISTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Staff can view emotive checklists in their facility" ON public.emotive_checklists;

CREATE POLICY "Staff can view emotive checklists in their facility"
  ON public.emotive_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = emotive_checklists.maternal_profile_id
      AND (
        -- Facility match (for staff with facility)
        (
          mp.facility_id IS NOT NULL 
          AND mp.facility_id IN (
            SELECT p.facility_id FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.facility_id IS NOT NULL
          )
        )
        OR mp.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

-- ============================================
-- ALLOW NULL FACILITY_ID IN MATERNAL_PROFILES
-- ============================================

-- Ensure facility_id can be null for normal users
ALTER TABLE public.maternal_profiles 
ALTER COLUMN facility_id DROP NOT NULL;

-- Add a comment to clarify the design
COMMENT ON COLUMN public.maternal_profiles.facility_id IS 
'Facility ID - can be null for normal users without facility assignment';
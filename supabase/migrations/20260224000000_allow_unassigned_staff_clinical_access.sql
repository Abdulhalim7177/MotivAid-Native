-- Migration: Allow users to view their own created profiles
-- This ensures staff without unit assignment can still access their cases
-- Also grants clinical access to normal users (role = 'user')

-- ============================================
-- MATERNAL PROFILES POLICIES
-- ============================================

-- Update the INSERT policy to include normal users
DROP POLICY IF EXISTS "Staff can create maternal profiles" ON public.maternal_profiles;

CREATE POLICY "Staff can create maternal profiles"
  ON public.maternal_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin', 'user')
    )
  );

-- Update the SELECT policy to also allow viewing own created profiles
DROP POLICY IF EXISTS "Staff can view maternal profiles in their facility" ON public.maternal_profiles;

CREATE POLICY "Staff can view maternal profiles in their facility"
  ON public.maternal_profiles FOR SELECT
  USING (
    -- User's facility matches profile's facility
    facility_id IN (
      SELECT p.facility_id FROM public.profiles p WHERE p.id = auth.uid()
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

-- Update the UPDATE policy to include normal users
DROP POLICY IF EXISTS "Staff can update maternal profiles they created" ON public.maternal_profiles;

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

-- ============================================
-- VITAL SIGNS POLICIES
-- ============================================

-- Simplified: Allow any authenticated staff to view vitals for profiles they can access
DROP POLICY IF EXISTS "Staff can view vital signs in their facility" ON public.vital_signs;

CREATE POLICY "Staff can view vital signs in their facility"
  ON public.vital_signs FOR SELECT
  USING (
    -- Allow viewing vitals if user can access the parent profile
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = vital_signs.maternal_profile_id
      AND (
        mp.facility_id IN (SELECT p.facility_id FROM public.profiles p WHERE p.id = auth.uid())
        OR mp.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

-- Simplified INSERT: Allow any authenticated staff to record vitals
DROP POLICY IF EXISTS "Staff can record vital signs" ON public.vital_signs;

CREATE POLICY "Staff can record vital signs"
  ON public.vital_signs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin', 'user')
    )
    AND EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = vital_signs.maternal_profile_id
    )
  );

-- Update vital_signs UPDATE policy
DROP POLICY IF EXISTS "Staff can update their own vital signs" ON public.vital_signs;

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

-- ============================================
-- EMOTIVE CHECKLISTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Staff can view emotive checklists in their facility" ON public.emotive_checklists;

CREATE POLICY "Staff can view emotive checklists in their facility"
  ON public.emotive_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = emotive_checklists.maternal_profile_id
      AND (
        mp.facility_id IN (SELECT p.facility_id FROM public.profiles p WHERE p.id = auth.uid())
        OR mp.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Staff can create emotive checklists" ON public.emotive_checklists;

CREATE POLICY "Staff can create emotive checklists"
  ON public.emotive_checklists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin', 'user')
    )
  );

DROP POLICY IF EXISTS "Staff can update emotive checklists" ON public.emotive_checklists;

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

-- Migration: Allow users to view their own created profiles
-- This ensures staff without unit assignment can still access their cases
-- Also grants clinical access to normal users (role = 'user')

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

-- Same fix for vital_signs - allow anyone authenticated to record vitals for profiles they created
DROP POLICY IF EXISTS "Staff can view vital signs in their facility" ON public.vital_signs;

CREATE POLICY "Staff can view vital signs in their facility"
  ON public.vital_signs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE mp.id = vital_signs.maternal_profile_id
      AND (mp.facility_id = p.facility_id OR p.role = 'admin')
    )
    OR
    -- Allow viewing vitals for profiles the user created
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = vital_signs.maternal_profile_id
      AND mp.created_by = auth.uid()
    )
  );

-- Update vital_signs INSERT policy to include normal users and allow recording for own profiles
DROP POLICY IF EXISTS "Staff can record vital signs" ON public.vital_signs;

CREATE POLICY "Staff can record vital signs"
  ON public.vital_signs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('midwife', 'nurse', 'student', 'supervisor', 'admin', 'user')
    )
    AND (
      -- Must be creating for a profile in their facility OR their own created profile
      EXISTS (
        SELECT 1 FROM public.maternal_profiles mp
        WHERE mp.id = vital_signs.maternal_profile_id
        AND (mp.facility_id IN (SELECT facility_id FROM public.profiles WHERE id = auth.uid()) OR mp.created_by = auth.uid())
      )
    )
  );

-- Update vital_signs UPDATE policy to include normal users
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

-- Update emotive_checklists policies
DROP POLICY IF EXISTS "Staff can view emotive checklists in their facility" ON public.emotive_checklists;

CREATE POLICY "Staff can view emotive checklists in their facility"
  ON public.emotive_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE mp.id = emotive_checklists.maternal_profile_id
      AND (mp.facility_id = p.facility_id OR p.role = 'admin')
    )
    OR
    -- Allow viewing checklists for profiles the user created
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = emotive_checklists.maternal_profile_id
      AND mp.created_by = auth.uid()
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

-- Update case_events policies
DROP POLICY IF EXISTS "Staff can view events for their facility" ON public.case_events;

CREATE POLICY "Staff can view events for their facility"
  ON public.case_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE mp.id = case_events.maternal_profile_id
      AND (mp.facility_id = p.facility_id OR p.role = 'admin')
    )
    OR
    -- Allow viewing events for profiles the user created
    EXISTS (
      SELECT 1 FROM public.maternal_profiles mp
      WHERE mp.id = case_events.maternal_profile_id
      AND mp.created_by = auth.uid()
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

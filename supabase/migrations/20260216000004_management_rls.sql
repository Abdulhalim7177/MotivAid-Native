-- =============================================
-- Admin RLS: Full CRUD on facilities, units, facility_codes
-- =============================================

-- Facilities: Admin can INSERT, UPDATE, DELETE
CREATE POLICY "Admins can manage facilities" ON public.facilities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Units: Admin can INSERT, UPDATE, DELETE
CREATE POLICY "Admins can manage units" ON public.units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Facility codes: Admin can INSERT, UPDATE, DELETE
CREATE POLICY "Admins can manage facility codes" ON public.facility_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- Supervisor RLS: CRUD on units + codes in their own facility
-- =============================================

-- Supervisors can manage units in their facility
CREATE POLICY "Supervisors can manage units in their facility" ON public.units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'supervisor'
        AND facility_id = units.facility_id
    )
  );

-- Supervisors can manage facility codes in their facility
CREATE POLICY "Supervisors can manage facility codes in their facility" ON public.facility_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'supervisor'
        AND facility_id = facility_codes.facility_id
    )
  );

-- =============================================
-- Auto-generate facility codes function
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_generate_facility_codes(
  p_facility_id UUID,
  p_facility_name TEXT
)
RETURNS void AS $$
DECLARE
  prefix TEXT;
  roles TEXT[] := ARRAY['supervisor', 'midwife', 'nurse', 'student'];
  suffixes TEXT[] := ARRAY['SUP', 'MID', 'NUR', 'STU'];
  i INT;
BEGIN
  -- Generate a 3-char prefix from the facility name (uppercase, no spaces)
  prefix := UPPER(LEFT(REGEXP_REPLACE(p_facility_name, '[^a-zA-Z]', '', 'g'), 3));

  -- If prefix is too short, pad with 'X'
  WHILE LENGTH(prefix) < 3 LOOP
    prefix := prefix || 'X';
  END LOOP;

  FOR i IN 1..array_length(roles, 1) LOOP
    INSERT INTO public.facility_codes (facility_id, role, code)
    VALUES (
      p_facility_id,
      roles[i]::public.user_role,
      prefix || suffixes[i]
    )
    ON CONFLICT (facility_id, role) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

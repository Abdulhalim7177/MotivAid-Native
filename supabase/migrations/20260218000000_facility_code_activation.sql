-- =============================================
-- Add is_active column to facility_codes
-- =============================================
ALTER TABLE public.facility_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =============================================
-- Update handle_new_user() to only match ACTIVE codes
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  found_role public.user_role;
  found_facility_id UUID;
  registration_code text;
BEGIN
  registration_code := new.raw_user_meta_data->>'registration_code';
  
  -- Default role
  found_role := 'user'::public.user_role;
  found_facility_id := NULL;

  -- If a code was provided, verify it exists, is active, and get the role + facility
  IF registration_code IS NOT NULL THEN
    SELECT fc.role, fc.facility_id INTO found_role, found_facility_id
    FROM public.facility_codes fc
    WHERE fc.code = registration_code
      AND fc.is_active = true;

    -- If code doesn't exist or is inactive, fallback to 'user'
    IF found_role IS NULL THEN
      found_role := 'user'::public.user_role;
      found_facility_id := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role, facility_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    found_role,
    found_facility_id
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Smarter auto_generate_facility_codes with uniqueness check
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_generate_facility_codes(
  p_facility_id UUID,
  p_facility_name TEXT
)
RETURNS void AS $$
DECLARE
  prefix TEXT;
  candidate TEXT;
  suffix_num INT := 1;
  roles TEXT[] := ARRAY['supervisor', 'midwife', 'nurse', 'student'];
  suffixes TEXT[] := ARRAY['SUP', 'MID', 'NRS', 'STU'];
  skip_words TEXT[] := ARRAY['of', 'the', 'and', 'in', 'at', 'for', 'a', 'an'];
  words TEXT[];
  significant TEXT[];
  w TEXT;
  i INT;
  is_unique BOOLEAN;
BEGIN
  -- Split name into words and filter non-alpha chars
  words := string_to_array(trim(p_facility_name), ' ');
  significant := ARRAY[]::TEXT[];
  
  FOREACH w IN ARRAY words LOOP
    w := regexp_replace(w, '[^a-zA-Z]', '', 'g');
    IF length(w) > 0 AND NOT (lower(w) = ANY(skip_words)) THEN
      significant := array_append(significant, w);
    END IF;
  END LOOP;

  -- Build prefix from significant words
  IF array_length(significant, 1) IS NULL OR array_length(significant, 1) = 0 THEN
    prefix := 'FAC';
  ELSIF array_length(significant, 1) = 1 THEN
    prefix := UPPER(LEFT(significant[1], 3));
  ELSE
    -- Take first letter of each significant word (up to 5)
    prefix := '';
    FOR i IN 1..LEAST(array_length(significant, 1), 5) LOOP
      prefix := prefix || UPPER(LEFT(significant[i], 1));
    END LOOP;
  END IF;

  -- Pad prefix if too short
  WHILE length(prefix) < 2 LOOP
    prefix := prefix || 'X';
  END LOOP;

  -- Find the lowest suffix number that makes ALL 4 codes unique
  LOOP
    is_unique := true;
    FOR i IN 1..array_length(roles, 1) LOOP
      candidate := prefix || suffix_num::TEXT || '-' || suffixes[i];
      IF EXISTS (SELECT 1 FROM public.facility_codes WHERE code = candidate) THEN
        is_unique := false;
        EXIT;
      END IF;
    END LOOP;
    
    EXIT WHEN is_unique;
    suffix_num := suffix_num + 1;
    
    -- Safety: don't loop forever
    IF suffix_num > 999 THEN
      EXIT;
    END IF;
  END LOOP;

  -- Insert the codes
  FOR i IN 1..array_length(roles, 1) LOOP
    candidate := prefix || suffix_num::TEXT || '-' || suffixes[i];
    INSERT INTO public.facility_codes (facility_id, role, code, is_active)
    VALUES (
      p_facility_id,
      roles[i]::public.user_role,
      candidate,
      true
    )
    ON CONFLICT (facility_id, role) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

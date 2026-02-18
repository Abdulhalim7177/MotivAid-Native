-- Add facility_id to profiles so we can match staff to their facility
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id);

-- Update the trigger to also store the facility_id when a user registers with a code
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

  -- If a code was provided, verify it exists and get the role + facility
  IF registration_code IS NOT NULL THEN
    SELECT fc.role, fc.facility_id INTO found_role, found_facility_id
    FROM public.facility_codes fc
    WHERE fc.code = registration_code;

    -- If code doesn't exist, fallback to 'user'
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

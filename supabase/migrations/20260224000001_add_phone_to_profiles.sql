-- Migration: 20260224000001_add_phone_to_profiles.sql
-- Purpose: Add phone column to profiles table for emergency contact linking.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update trigger function to also handle phone from metadata if available
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  found_role public.user_role;
  found_facility_id uuid;
  registration_code text;
BEGIN
  registration_code := new.raw_user_meta_data->>'registration_code';
  found_role := 'user'::public.user_role;
  found_facility_id := NULL;

  IF registration_code IS NOT NULL THEN
    SELECT fc.role, fc.facility_id INTO found_role, found_facility_id
    FROM public.facility_codes fc
    WHERE fc.code = registration_code AND fc.is_active = true;

    IF found_role IS NULL THEN
      found_role := 'user'::public.user_role;
      found_facility_id := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role, facility_id, phone)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    found_role,
    found_facility_id,
    new.raw_user_meta_data->>'phone'
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

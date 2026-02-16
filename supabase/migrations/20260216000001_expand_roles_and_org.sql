-- 1. Expand User Roles
-- Since we can't easily alter enums in some Postgres versions without a lot of steps, 
-- we'll create a new one and update the profiles table if needed, or just add to it.
-- For local dev, a clean approach is best.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'nurse';

-- 2. Create Facilities Table
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  registration_code TEXT UNIQUE, -- Code used for staff registration
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Units Table
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Unit Memberships (For hierarchical access)
CREATE TABLE IF NOT EXISTS public.unit_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  role_in_unit TEXT DEFAULT 'member', -- Can be 'lead', 'member', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, unit_id)
);

-- 5. Update RLS for new tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_memberships ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view facilities" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "Everyone can view units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Users can view their own memberships" ON public.unit_memberships FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Supervisors can view memberships in their units" ON public.unit_memberships FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor'
  )
);

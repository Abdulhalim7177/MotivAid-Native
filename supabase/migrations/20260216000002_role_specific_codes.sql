-- Remove the old single registration code
ALTER TABLE public.facilities DROP COLUMN IF EXISTS registration_code;

-- Create a table for role-specific codes
CREATE TABLE IF NOT EXISTS public.facility_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facility_id, role), -- Each role in a facility has exactly one code
  UNIQUE(code) -- Codes must be globally unique to identify facility and role
);

-- Index for fast lookup
CREATE INDEX idx_facility_codes_lookup ON public.facility_codes(code);

-- Enable RLS
ALTER TABLE public.facility_codes ENABLE ROW LEVEL SECURITY;

-- Allow public read access only for validation purposes (limited columns)
CREATE POLICY "Public can validate codes" ON public.facility_codes
  FOR SELECT USING (true);

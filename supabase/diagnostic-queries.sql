-- Diagnostic Queries for Clinical Access Issues
-- Run these in Supabase SQL Editor to debug the issues

-- 1. Check your current user
SELECT 
  auth.uid() as current_user_id,
  p.id as profile_id,
  p.email,
  p.full_name,
  p.role,
  p.facility_id
FROM public.profiles p
WHERE p.id = auth.uid();

-- 2. Check maternal profiles you created
SELECT 
  mp.id,
  mp.local_id,
  mp.patient_id,
  mp.created_by,
  mp.facility_id,
  mp.unit_id,
  mp.status,
  mp.created_at,
  CASE 
    WHEN mp.created_by = auth.uid() THEN 'YES'
    ELSE 'NO'
  END as is_creator
FROM public.maternal_profiles mp
ORDER BY mp.created_at DESC
LIMIT 10;

-- 3. Check if you have unit memberships
SELECT 
  um.id,
  um.profile_id,
  um.unit_id,
  um.status,
  u.name as unit_name
FROM public.unit_memberships um
LEFT JOIN public.units u ON u.id = um.unit_id
WHERE um.profile_id = auth.uid();

-- 4. Check RLS policies on maternal_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'maternal_profiles';

-- 5. Check RLS policies on vital_signs
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vital_signs';

-- 6. Test INSERT permission (try to create a test profile)
-- This will tell you if you have INSERT permissions
INSERT INTO public.maternal_profiles (
  created_by,
  facility_id,
  age,
  gravida,
  parity,
  risk_level,
  risk_score,
  status,
  is_synced,
  local_id
) VALUES (
  auth.uid(),
  (SELECT facility_id FROM public.profiles WHERE id = auth.uid()),
  25,
  1,
  0,
  'low',
  0,
  'pre_delivery',
  true,
  'test-' || gen_random_uuid()::text
) RETURNING id, created_by, 'INSERT SUCCESSFUL' as result;

-- 7. Test VITALS INSERT permission
-- First get a profile ID you created
WITH test_profile AS (
  SELECT id FROM public.maternal_profiles 
  WHERE created_by = auth.uid() 
  ORDER BY created_at DESC 
  LIMIT 1
)
INSERT INTO public.vital_signs (
  maternal_profile_id,
  recorded_by,
  heart_rate,
  systolic_bp,
  diastolic_bp,
  estimated_blood_loss,
  is_synced,
  local_id
)
SELECT 
  tp.id,
  auth.uid(),
  80,
  120,
  80,
  300,
  true,
  'test-vital-' || gen_random_uuid()::text
FROM test_profile tp
RETURNING id, 'VITALS INSERT SUCCESSFUL' as result;

-- 8. Check if RLS is enabled on tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('maternal_profiles', 'vital_signs', 'emotive_checklists', 'case_events');

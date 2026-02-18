-- Seed Major Facilities in Kano, Nigeria
INSERT INTO public.facilities (name, location) VALUES 
('Aminu Kano Teaching Hospital (AKTH)', 'Zaria Road, Kano'),
('Murtala Muhammad Specialist Hospital', 'Kofar Mata, Kano City'),
('Abdullahi Wase Teaching Hospital', 'Nassarawa, Kano'),
('Sir Muhammad Sunusi Specialist Hospital', 'Yankaba, Kano')
ON CONFLICT DO NOTHING;

-- Seed Units for AKTH
WITH akth AS (SELECT id FROM public.facilities WHERE name = 'Aminu Kano Teaching Hospital (AKTH)' LIMIT 1)
INSERT INTO public.units (facility_id, name, description) VALUES 
((SELECT id FROM akth), 'Obstetrics Ward A', 'Main maternity ward for standard deliveries'),
((SELECT id FROM akth), 'Emergency Delivery Unit', 'High-risk and emergency PPH cases'),
((SELECT id FROM akth), 'Labour Ward 1', 'Active labour monitoring')
ON CONFLICT DO NOTHING;

-- Seed Units for Murtala Muhammad Specialist
WITH murtala AS (SELECT id FROM public.facilities WHERE name = 'Murtala Muhammad Specialist Hospital' LIMIT 1)
INSERT INTO public.units (facility_id, name, description) VALUES 
((SELECT id FROM murtala), 'Maternity Block', 'General maternity services'),
((SELECT id FROM murtala), 'PPH Response Unit', 'Specialized E-MOTIVE response unit')
ON CONFLICT DO NOTHING;

-- Seed Role-Specific Codes for AKTH
WITH akth AS (SELECT id FROM public.facilities WHERE name = 'Aminu Kano Teaching Hospital (AKTH)' LIMIT 1)
INSERT INTO public.facility_codes (facility_id, role, code, is_active) VALUES 
((SELECT id FROM akth), 'supervisor', 'AKTH1-SUP', true),
((SELECT id FROM akth), 'midwife', 'AKTH1-MID', true),
((SELECT id FROM akth), 'nurse', 'AKTH1-NRS', true),
((SELECT id FROM akth), 'student', 'AKTH1-STU', true)
ON CONFLICT (facility_id, role) DO NOTHING;

-- Seed Role-Specific Codes for Murtala Muhammad
WITH murtala AS (SELECT id FROM public.facilities WHERE name = 'Murtala Muhammad Specialist Hospital' LIMIT 1)
INSERT INTO public.facility_codes (facility_id, role, code, is_active) VALUES 
((SELECT id FROM murtala), 'supervisor', 'MMSH1-SUP', true),
((SELECT id FROM murtala), 'midwife', 'MMSH1-MID', true),
((SELECT id FROM murtala), 'nurse', 'MMSH1-NRS', true),
((SELECT id FROM murtala), 'student', 'MMSH1-STU', true)
ON CONFLICT (facility_id, role) DO NOTHING;

-- Seed Role-Specific Codes for Abdullahi Wase Teaching Hospital
WITH awth AS (SELECT id FROM public.facilities WHERE name = 'Abdullahi Wase Teaching Hospital' LIMIT 1)
INSERT INTO public.facility_codes (facility_id, role, code, is_active) VALUES 
((SELECT id FROM awth), 'supervisor', 'AWTH1-SUP', true),
((SELECT id FROM awth), 'midwife', 'AWTH1-MID', true),
((SELECT id FROM awth), 'nurse', 'AWTH1-NRS', true),
((SELECT id FROM awth), 'student', 'AWTH1-STU', true)
ON CONFLICT (facility_id, role) DO NOTHING;

-- Seed Role-Specific Codes for Sir Muhammad Sunusi Specialist Hospital
WITH smss AS (SELECT id FROM public.facilities WHERE name = 'Sir Muhammad Sunusi Specialist Hospital' LIMIT 1)
INSERT INTO public.facility_codes (facility_id, role, code, is_active) VALUES 
((SELECT id FROM smss), 'supervisor', 'SMSSH1-SUP', true),
((SELECT id FROM smss), 'midwife', 'SMSSH1-MID', true),
((SELECT id FROM smss), 'nurse', 'SMSSH1-NRS', true),
((SELECT id FROM smss), 'student', 'SMSSH1-STU', true)
ON CONFLICT (facility_id, role) DO NOTHING;

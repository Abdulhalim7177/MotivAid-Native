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

-- Seed Role-Specific Codes for AKTH (Examples)
WITH akth AS (SELECT id FROM public.facilities WHERE name = 'Aminu Kano Teaching Hospital (AKTH)' LIMIT 1)
INSERT INTO public.facility_codes (facility_id, role, code) VALUES 
((SELECT id FROM akth), 'supervisor', 'AKTSUP'),
((SELECT id FROM akth), 'midwife', 'AKTMID'),
((SELECT id FROM akth), 'nurse', 'AKTNUR'),
((SELECT id FROM akth), 'student', 'AKTSTU')
ON CONFLICT (facility_id, role) DO NOTHING;

-- Seed Role-Specific Codes for Murtala Muhammad
WITH murtala AS (SELECT id FROM public.facilities WHERE name = 'Murtala Muhammad Specialist Hospital' LIMIT 1)
INSERT INTO public.facility_codes (facility_id, role, code) VALUES 
((SELECT id FROM murtala), 'supervisor', 'MMHSUP'),
((SELECT id FROM murtala), 'midwife', 'MMHMID'),
((SELECT id FROM murtala), 'nurse', 'MMHNUR'),
((SELECT id FROM murtala), 'student', 'MMHSTU')
ON CONFLICT (facility_id, role) DO NOTHING;

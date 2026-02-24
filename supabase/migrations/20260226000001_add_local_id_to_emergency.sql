-- Migration: 20260226000001_add_local_id_to_emergency.sql
-- Purpose: Add local_id to emergency_contacts for consistent sync tracking.

ALTER TABLE public.emergency_contacts 
ADD COLUMN local_id TEXT;

CREATE INDEX idx_emergency_local_id ON public.emergency_contacts(local_id);

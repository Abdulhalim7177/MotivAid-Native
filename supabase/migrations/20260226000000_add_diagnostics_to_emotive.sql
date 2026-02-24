-- Migration: 20260226000000_add_diagnostics_to_emotive.sql
-- Purpose: Store diagnostics phase findings in the database.

ALTER TABLE public.emotive_checklists 
ADD COLUMN diagnostics_causes JSONB DEFAULT '[]',
ADD COLUMN diagnostics_notes TEXT;

-- Update local schema in sync_queue logic if necessary (handled by code)

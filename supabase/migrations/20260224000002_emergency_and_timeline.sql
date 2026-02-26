-- Migration: 20260224000000_emergency_and_timeline.sql
-- Purpose: Add emergency contacts, case events for timeline, and audit logging.

-- 1. Emergency Contacts Hierarchy
CREATE TABLE public.emergency_contacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id   UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    unit_id       UUID REFERENCES public.units(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL,
    phone         TEXT NOT NULL,
    tier          INTEGER NOT NULL CHECK (tier IN (1, 2, 3)), -- 1: Unit, 2: Facility, 3: External Referral
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS for Emergency Contacts
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view emergency contacts in their facility" ON public.emergency_contacts
    FOR SELECT USING (
        facility_id IN (SELECT facility_id FROM public.profiles WHERE id = auth.uid())
        OR tier = 3 -- External referrals are global/regional
    );

CREATE POLICY "Supervisors/Admins can manage contacts" ON public.emergency_contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('supervisor', 'admin')
        )
    );

-- 2. Unified Case Events (for Timeline)
CREATE TABLE public.case_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maternal_profile_id UUID NOT NULL REFERENCES public.maternal_profiles(id) ON DELETE CASCADE,
    event_type          TEXT NOT NULL, -- 'vitals', 'emotive_step', 'status_change', 'escalation', 'note'
    event_label         TEXT NOT NULL, -- e.g. 'Heart Rate recorded', 'Oxytocin administered'
    event_data          JSONB,         -- Stores specific values (e.g. { hr: 120, si: 1.2 })
    performed_by        UUID REFERENCES public.profiles(id),
    occurred_at         TIMESTAMPTZ DEFAULT now(),
    -- Sync tracking
    local_id            TEXT,
    is_synced           BOOLEAN DEFAULT false
);

ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view events for their facility" ON public.case_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.maternal_profiles p
            WHERE p.id = maternal_profile_id 
            AND p.facility_id IN (SELECT facility_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Staff can insert events" ON public.case_events
    FOR INSERT WITH CHECK (true);

-- 3. System Audit Logs
CREATE TABLE public.audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES public.profiles(id),
    action        TEXT NOT NULL, -- 'create_patient', 'update_status', 'delete_record', 'export_report'
    target_type   TEXT NOT NULL, -- 'maternal_profile', 'facility', 'user'
    target_id     TEXT,
    metadata      JSONB,
    severity      TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/Supervisors can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('supervisor', 'admin')
        )
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Functions to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON public.emergency_contacts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Auto-log status changes to case_events
CREATE OR REPLACE FUNCTION log_patient_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.case_events (maternal_profile_id, event_type, event_label, event_data, performed_by)
        VALUES (NEW.id, 'status_change', 'Status changed to ' || NEW.status, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status), auth.uid());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER trigger_log_patient_status_change
    AFTER UPDATE ON public.maternal_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE log_patient_status_change();

# MotivAid - Database Schema

## Overview

MotivAid uses **Supabase** (PostgreSQL) as its primary database with **Row-Level Security (RLS)** enabled on all tables. Migrations are managed via the Supabase CLI and live in `supabase/migrations/`.

---

## Migration Files

| Order | File | Purpose |
|-------|------|---------|
| 1 | `20260216000000_init_auth_and_storage.sql` | Profiles table, user role enum, auth trigger, avatar storage |
| 2 | `20260216000001_expand_roles_and_org.sql` | Expanded roles, facilities, units, unit memberships |
| 3 | `20260216000002_role_specific_codes.sql` | Facility access codes for role-based registration |
| 4 | `20260216000003_add_facility_to_profiles.sql` | Added `facility_id` to profiles, linked via registration code |
| 5 | `20260216000004_management_rls.sql` | RLS policies for facility/unit/code CRUD by admin/supervisor |
| 6 | `20260218000000_facility_code_activation.sql` | `is_active` flag on codes, enhanced auto-generation with acronym logic |
| 7 | `20260220000000_clinical_data_tables.sql` | Maternal profiles, vital signs, sync queue tables with RLS |
| 8 | `20260222000000_emotive_checklists.sql` | E-MOTIVE checklist tracking table with RLS |
| 9 | `20260224000000_allow_unassigned_staff_clinical_access.sql` | RLS relaxation for facility-wide clinical visibility |
| 10 | `20260224000001_add_phone_to_profiles.sql` | Phone number field for user profiles |
| 11 | `20260224000002_emergency_and_timeline.sql` | Emergency contacts, case events (timeline), and audit logs |
| 12 | `20260225000000_support_users_without_facility.sql` | Improved support for users not yet assigned to a facility |
| 13 | `20260226000000_add_diagnostics_to_emotive.sql` | Columns for secondary PPH diagnostics in E-MOTIVE checklist |
| 14 | `20260226000001_add_local_id_to_emergency.sql` | Added `local_id` to emergency_contacts for offline-first sync |

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│  auth.users  │       │  facilities  │       │  facility_codes  │
│──────────────│       │──────────────│       │──────────────────│
│  id (PK)     │       │  id (PK)     │◄──────│  facility_id (FK)│
│  email       │       │  name        │       │  role            │
│  ...         │       │  location    │       │  code (UNIQUE)   │
└──────┬───────┘       └──────┬───────┘       │  is_active       │
       │                      │               └──────────────────┘
       │ trigger              │
       ▼                      │
┌──────────────┐       ┌──────┴───────┐       ┌──────────────────────┐
│   profiles   │       │    units     │       │  emergency_contacts  │
│──────────────│       │──────────────│       │──────────────────────│
│  id (PK/FK)  │       │  id (PK)     │◄──────│  unit_id (FK)        │
│  username    │       │  facility_id │◄──────│  facility_id (FK)    │
│  full_name   │       │  name        │       │  name, role, phone   │
│  avatar_url  │       │  description │       │  tier (1, 2, 3)      │
│  website     │       └──────┬───────┘       └──────────────────────┘
│  role        │              │
│  facility_id │              │
└──┬───┬───────┘              │
   │   │    ┌─────────────────┘
   │   │    │
   │   ▼    ▼
   │ ┌────────────────────┐
   │ │  unit_memberships  │
   │ │────────────────────│
   │ │  profile_id (FK)   │
   │ │  unit_id (FK)      │
   │ │  status            │
   │ └────────────────────┘
   │
   │  ┌───────────────────────┐       ┌─────────────────────────┐
   │  │  maternal_profiles    │       │  emotive_checklists     │
   │  │───────────────────────│       │─────────────────────────│
   └─►│  created_by (FK)      │◄──────│  maternal_profile_id    │
      │  facility_id (FK)     │       │  performed_by (FK)      │
      │  unit_id (FK)         │       │  6 step groups          │
      │  age, parity, risk    │       │  (done/time/dose/notes) │
      │  13 risk factors      │       └─────────────────────────┘
      │  status, risk_level   │
      └───────────┬───────────┘
                  │
                  ▼
      ┌─────────────────────────┐       ┌─────────────────────────┐
      │     vital_signs         │       │      case_events        │
      │─────────────────────────│       │─────────────────────────│
      │  maternal_profile_id    │◄──────│  maternal_profile_id    │
      │  heart_rate, bp, temp   │       │  event_type, label      │
      │  recorded_by (FK)       │       │  event_data (JSONB)     │
      └─────────────────────────┘       └─────────────────────────┘
```

---

## Tables

### `profiles`

Stores user profile data. Auto-created via a trigger when a new `auth.users` row is inserted.

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  updated_at    TIMESTAMPTZ,
  username      TEXT UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  website       TEXT,
  role          public.user_role DEFAULT 'user' NOT NULL,
  facility_id   UUID REFERENCES public.facilities(id),

  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
```

**Notes:**
- `id` directly references `auth.users.id` — one profile per auth user
- `role` is assigned during registration via the `handle_new_user()` trigger
- `facility_id` is assigned during registration based on the facility code used
- `avatar_url` stores the path within the `avatars` Supabase Storage bucket

---

### `facilities`

Healthcare institutions (hospitals, clinics, health centers).

```sql
CREATE TABLE public.facilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  location      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### `units`

Subdivisions within a facility (e.g., Maternity Ward A, Emergency Delivery Unit).

```sql
CREATE TABLE public.units (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### `unit_memberships`

Many-to-many relationship between profiles and units, with an approval workflow.

```sql
CREATE TABLE public.unit_memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES public.units(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  role_in_unit  TEXT DEFAULT 'member',
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(profile_id, unit_id)
);
```

**Status Flow:**
```
pending → approved    (Supervisor approves)
pending → rejected    (Supervisor rejects)
```

---

### `facility_codes`

Role-specific registration codes. Each facility has one unique code per role, used during staff registration. Codes can be activated/deactivated by admin or supervisor.

```sql
CREATE TABLE public.facility_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  role          public.user_role NOT NULL,
  code          TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(facility_id, role),
  UNIQUE(code)
);
```

**Index:**
```sql
CREATE INDEX idx_facility_codes_lookup ON public.facility_codes(code);
```

**Code Format:** Codes use an acronym-based format derived from facility names (e.g., `AKTH1-SUP`, `SMSSH1-STU`). The `auto_generate_facility_codes()` function creates codes by extracting significant words from the facility name, forming an acronym prefix, and appending an incrementing numeric suffix to ensure global uniqueness.

**Usage:** During registration, the frontend validates the code in real-time with a debounced input. The `handle_new_user()` trigger uses the code to determine the user's role, and only considers codes where `is_active = true`.

---

## Enums

### `user_role`

```sql
CREATE TYPE public.user_role AS ENUM (
  'admin',
  'user',
  'supervisor',
  'midwife',
  'nurse',
  'student'
);
```

The initial migration creates `admin`, `user`, `supervisor`. The second migration adds `student` and `nurse` via `ALTER TYPE ... ADD VALUE`.

---

## Triggers & Functions

### `handle_new_user()`

Fires after every `INSERT` on `auth.users`. Creates a corresponding `profiles` row with role and facility assignment.

```sql
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
```

### `auto_generate_facility_codes()`

Generates unique registration codes for a new facility based on its name. Uses significant words to form an acronym prefix and finds the lowest numeric suffix where all 4 role codes are globally unique.

---

## Row-Level Security Policies

### `profiles`

| Policy | Operation | Rule |
|--------|-----------|------|
| Public profiles are viewable by everyone | `SELECT` | `true` |
| Users can insert their own profile | `INSERT` | `auth.uid() = id` |
| Users can update their own profile | `UPDATE` | `auth.uid() = id` |

### `facilities`

| Policy | Operation | Rule |
|--------|-----------|------|
| Everyone can view facilities | `SELECT` | `true` |
| Admin/Supervisor can insert | `INSERT` | User has `admin` or `supervisor` role |
| Admin/Supervisor can update | `UPDATE` | User has `admin` or `supervisor` role |
| Admin can delete | `DELETE` | User has `admin` role |

### `units`

| Policy | Operation | Rule |
|--------|-----------|------|
| Everyone can view units | `SELECT` | `true` |
| Admin/Supervisor can insert | `INSERT` | User has `admin` or `supervisor` role |
| Admin/Supervisor can update | `UPDATE` | User has `admin` or `supervisor` role |
| Admin can delete | `DELETE` | User has `admin` role |

### `unit_memberships`

| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view their own memberships | `SELECT` | `auth.uid() = profile_id` |
| Supervisors can manage memberships | `ALL` | User has `supervisor` role in profiles |

### `facility_codes`

| Policy | Operation | Rule |
|--------|-----------|------|
| Public can validate codes | `SELECT` | `true` |
| Admin/Supervisor can insert | `INSERT` | User has `admin` or `supervisor` role |
| Admin/Supervisor can update | `UPDATE` | User has `admin` or `supervisor` role |
| Admin can delete | `DELETE` | User has `admin` role |

---

## Storage Buckets

### `avatars`

| Setting | Value |
|---------|-------|
| Bucket ID | `avatars` |
| Public | `true` |

**Policies:**
- Anyone can read avatar images
- Any authenticated user can upload an avatar
- Users can update their own avatars (`auth.uid() = owner`)

---

## Local Storage (SQLite)

On native platforms, MotivAid maintains a local SQLite database (`motivaid_offline_v2.db`) for offline access:

```sql
CREATE TABLE IF NOT EXISTS profile_cache (
  id           TEXT PRIMARY KEY NOT NULL,
  profile_data TEXT NOT NULL,
  user_data    TEXT,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

This table caches the user's profile and auth user object as JSON strings, enabling offline sign-in and profile display without network access.

---

### `maternal_profiles`

Patient risk factor data for PPH assessment. Created by staff within a facility/unit context.

```sql
CREATE TABLE public.maternal_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id               TEXT,
  age                      INTEGER NOT NULL,
  gravida                  INTEGER DEFAULT 1,
  parity                   INTEGER DEFAULT 0,
  gestational_age_weeks    INTEGER,
  blood_type               TEXT,
  weight_kg                NUMERIC,
  hemoglobin_level         NUMERIC,
  -- 13 Risk Factor Flags (AWHONN-adapted)
  is_multiple_gestation    BOOLEAN DEFAULT false,
  has_prior_cesarean       BOOLEAN DEFAULT false,
  has_placenta_previa      BOOLEAN DEFAULT false,
  has_large_fibroids       BOOLEAN DEFAULT false,
  has_anemia               BOOLEAN DEFAULT false,
  has_pph_history          BOOLEAN DEFAULT false,
  has_intraamniotic_infection BOOLEAN DEFAULT false,
  has_severe_anemia        BOOLEAN DEFAULT false,
  has_coagulopathy         BOOLEAN DEFAULT false,
  has_severe_pph_history   BOOLEAN DEFAULT false,
  has_placenta_accreta     BOOLEAN DEFAULT false,
  has_active_bleeding      BOOLEAN DEFAULT false,
  has_morbid_obesity       BOOLEAN DEFAULT false,
  -- Context
  risk_level               TEXT DEFAULT 'low',
  status                   TEXT DEFAULT 'pre_delivery',
  notes                    TEXT,
  facility_id              UUID REFERENCES public.facilities(id),
  unit_id                  UUID REFERENCES public.units(id),
  created_by               UUID REFERENCES public.profiles(id),
  -- Sync tracking
  is_synced                BOOLEAN DEFAULT false,
  local_id                 TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);
```

**Status Flow:**
```
pre_delivery → active → monitoring → closed
```

---

### `vital_signs`

Vital sign readings for maternal profiles, used for Shock Index calculation.

```sql
CREATE TABLE public.vital_signs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maternal_profile_id      UUID NOT NULL REFERENCES public.maternal_profiles(id) ON DELETE CASCADE,
  heart_rate               INTEGER,
  systolic_bp              INTEGER,
  diastolic_bp             INTEGER,
  temperature              NUMERIC,
  respiratory_rate         INTEGER,
  spo2                     INTEGER,
  estimated_blood_loss     INTEGER DEFAULT 0,
  blood_loss_method        TEXT DEFAULT 'visual',
  recorded_by              UUID REFERENCES public.profiles(id),
  -- Sync tracking
  is_synced                BOOLEAN DEFAULT false,
  local_id                 TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);
```

---

### `emotive_checklists`

Tracks completion of the WHO E-MOTIVE bundle steps per maternal case.

```sql
CREATE TABLE public.emotive_checklists (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maternal_profile_id      UUID NOT NULL REFERENCES public.maternal_profiles(id) ON DELETE CASCADE,
  performed_by             UUID REFERENCES public.profiles(id),
  -- E — Early Detection
  early_detection_done     BOOLEAN DEFAULT false,
  early_detection_time     TIMESTAMPTZ,
  early_detection_notes    TEXT,
  -- M — Uterine Massage
  massage_done             BOOLEAN DEFAULT false,
  massage_time             TIMESTAMPTZ,
  massage_notes            TEXT,
  -- O — Oxytocin
  oxytocin_done            BOOLEAN DEFAULT false,
  oxytocin_time            TIMESTAMPTZ,
  oxytocin_dose            TEXT,
  oxytocin_notes           TEXT,
  -- T — Tranexamic Acid
  txa_done                 BOOLEAN DEFAULT false,
  txa_time                 TIMESTAMPTZ,
  txa_dose                 TEXT,
  txa_notes                TEXT,
  -- I — IV Fluids
  iv_fluids_done           BOOLEAN DEFAULT false,
  iv_fluids_time           TIMESTAMPTZ,
  iv_fluids_volume         TEXT,
  iv_fluids_notes          TEXT,
  -- V/E — Escalation
  escalation_done          BOOLEAN DEFAULT false,
  escalation_time          TIMESTAMPTZ,
  escalation_notes         TEXT,
  -- Diagnostics (Phase 4)
  secondary_causes         JSONB,         -- Checklist of suspected causes
  diagnostic_notes         TEXT,
  -- Sync tracking
  is_synced                BOOLEAN DEFAULT false,
  local_id                 TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);
```

---

### `sync_queue`

Tracks offline operations pending upload to Supabase.

```sql
CREATE TABLE public.sync_queue (
  id            TEXT PRIMARY KEY,
  table_name    TEXT NOT NULL,
  record_id     TEXT NOT NULL,
  operation     TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  payload       TEXT NOT NULL,
  status        TEXT DEFAULT 'pending',
  error_message TEXT,
  retry_count   INTEGER DEFAULT 0,
  max_retries   INTEGER DEFAULT 3,
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### `emergency_contacts`

3-level hierarchy of medical and referral contacts.

```sql
CREATE TABLE public.emergency_contacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id   UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    unit_id       UUID REFERENCES public.units(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL,
    phone         TEXT NOT NULL,
    tier          INTEGER NOT NULL CHECK (tier IN (1, 2, 3)), -- 1: Unit, 2: Facility, 3: External
    is_active     BOOLEAN DEFAULT true,
    local_id      TEXT,
    is_synced     BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

### `case_events`

Unified event log for the patient timeline.

```sql
CREATE TABLE public.case_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maternal_profile_id UUID NOT NULL REFERENCES public.maternal_profiles(id) ON DELETE CASCADE,
    event_type          TEXT NOT NULL, -- 'vitals', 'emotive_step', 'status_change', 'escalation'
    event_label         TEXT NOT NULL,
    event_data          JSONB,         -- Stores metric values
    performed_by        UUID REFERENCES public.profiles(id),
    occurred_at         TIMESTAMPTZ DEFAULT now(),
    -- Sync tracking
    local_id            TEXT,
    is_synced           BOOLEAN DEFAULT false
);
```

---

### `audit_logs`

System-wide activity logging for accountability.

```sql
CREATE TABLE public.audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES public.profiles(id),
    action        TEXT NOT NULL,
    target_type   TEXT NOT NULL,
    target_id     TEXT,
    metadata      JSONB,
    severity      TEXT DEFAULT 'info',
    created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## Clinical RLS Policies

### `maternal_profiles`

| Policy | Operation | Rule |
|--------|-----------|------|
| Staff can view profiles in their facility | `SELECT` | Profile's `facility_id` matches user's `facility_id` OR user is admin |
| Staff can create profiles | `INSERT` | User has staff role (midwife/nurse/student/supervisor/admin) |
| Staff can update their own profiles | `UPDATE` | `created_by = auth.uid()` OR user is supervisor/admin |
| Admin can delete | `DELETE` | User has `admin` role |

### `vital_signs`

| Policy | Operation | Rule |
|--------|-----------|------|
| Staff can view vitals in their facility | `SELECT` | Via maternal_profile → facility_id match |
| Staff can record vitals | `INSERT` | User has staff role |
| Staff can update their own vitals | `UPDATE` | `recorded_by = auth.uid()` OR user is supervisor/admin |

### `emotive_checklists`

| Policy | Operation | Rule |
|--------|-----------|------|
| Staff can view checklists in their facility | `SELECT` | Via maternal_profile → facility_id match |
| Staff can create checklists | `INSERT` | User has staff role |
| Staff can update their own checklists | `UPDATE` | `performed_by = auth.uid()` OR user is supervisor/admin |

---

## Local Storage (SQLite) — Clinical

On native platforms, a separate clinical SQLite database (`motivaid_clinical.db`) mirrors the Supabase schema:

| Local Table | Remote Table | Key Differences |
|-------------|-------------|-----------------|
| `maternal_profiles_local` | `maternal_profiles` | `local_id` TEXT PK, `remote_id` TEXT nullable, `is_synced` INTEGER |
| `vital_signs_local` | `vital_signs` | Same local/remote ID pattern |
| `emotive_checklists_local` | `emotive_checklists` | Boolean fields stored as INTEGER (0/1) |
| `sync_queue_local` | `sync_queue` | Operations queue for offline-to-online sync |

---

## Future Tables (Planned)

| Table | Phase | Purpose |
|-------|-------|---------|
| `emergency_contacts` | Phase 4 | Unit and facility emergency contacts |
| `audit_logs` | Phase 4 | Action audit trail |
| `training_sessions` | Phase 5 | Simulation session records |
| `quiz_results` | Phase 5 | Training assessment results |

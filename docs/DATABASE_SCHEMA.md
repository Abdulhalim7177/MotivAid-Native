# MotivAid - Database Schema

## Overview

MotivAid uses **Supabase** (PostgreSQL) as its primary database with **Row-Level Security (RLS)** enabled on all tables. Migrations are managed via the Supabase CLI and live in `supabase/migrations/`.

Local development uses a Supabase instance at `127.0.0.1:54321`.

---

## Migration Files

| Order | File | Purpose |
|-------|------|---------|
| 1 | `20260216000000_init_auth_and_storage.sql` | Profiles table, user role enum, auth trigger, avatar storage |
| 2 | `20260216000001_expand_roles_and_org.sql` | Expanded roles, facilities, units, unit memberships |
| 3 | `20260216000002_role_specific_codes.sql` | Facility access codes for role-based registration |

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│  auth.users  │       │  facilities  │       │  facility_codes  │
│──────────────│       │──────────────│       │──────────────────│
│  id (PK)     │       │  id (PK)     │◄──────│  facility_id (FK)│
│  email       │       │  name        │       │  role            │
│  ...         │       │  location    │       │  code (UNIQUE)   │
└──────┬───────┘       └──────┬───────┘       └──────────────────┘
       │                      │
       │ trigger              │
       ▼                      │
┌──────────────┐       ┌──────┴───────┐
│   profiles   │       │    units     │
│──────────────│       │──────────────│
│  id (PK/FK)  │       │  id (PK)     │
│  username    │       │  facility_id │
│  full_name   │       │  name        │
│  avatar_url  │       │  description │
│  website     │       └──────┬───────┘
│  role        │              │
└──────┬───────┘              │
       │                      │
       │    ┌─────────────────┘
       │    │
       ▼    ▼
┌────────────────────┐
│  unit_memberships  │
│────────────────────│
│  id (PK)           │
│  profile_id (FK)   │
│  unit_id (FK)      │
│  status            │
│  role_in_unit      │
└────────────────────┘
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

  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
```

**Notes:**
- `id` directly references `auth.users.id` — one profile per auth user
- `role` is assigned during registration via the `handle_new_user()` trigger
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

Role-specific registration codes. Each facility has one unique code per role, used during staff registration.

```sql
CREATE TABLE public.facility_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  role          public.user_role NOT NULL,
  code          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(facility_id, role),
  UNIQUE(code)
);
```

**Index:**
```sql
CREATE INDEX idx_facility_codes_lookup ON public.facility_codes(code);
```

**Usage:** During registration, the frontend validates the 6-character code against this table. The `handle_new_user()` trigger uses the code to determine the user's role.

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

Fires after every `INSERT` on `auth.users`. Creates a corresponding `profiles` row.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  found_role public.user_role;
  registration_code text;
BEGIN
  registration_code := new.raw_user_meta_data->>'registration_code';
  found_role := 'user'::public.user_role;

  IF registration_code IS NOT NULL THEN
    SELECT role INTO found_role
    FROM public.facility_codes
    WHERE code = registration_code;

    IF found_role IS NULL THEN
      found_role := 'user'::public.user_role;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    found_role
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Trigger:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

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

### `units`

| Policy | Operation | Rule |
|--------|-----------|------|
| Everyone can view units | `SELECT` | `true` |

### `unit_memberships`

| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view their own memberships | `SELECT` | `auth.uid() = profile_id` |
| Supervisors can manage memberships | `ALL` | User has `supervisor` role in profiles |

### `facility_codes`

| Policy | Operation | Rule |
|--------|-----------|------|
| Public can validate codes | `SELECT` | `true` |

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

## Future Tables (Planned)

These tables will be added in upcoming phases as outlined in the implementation roadmap:

| Table | Phase | Purpose |
|-------|-------|---------|
| `maternal_profiles` | Phase 3 | Patient risk factor data |
| `pph_cases` | Phase 4 | Active PPH case tracking |
| `interventions` | Phase 4 | E-MOTIVE intervention logs |
| `vital_signs` | Phase 3 | Heart rate, blood pressure, shock index |
| `emergency_contacts` | Phase 5 | Unit and facility emergency contacts |
| `training_sessions` | Phase 6 | Simulation session records |
| `quiz_results` | Phase 6 | Training assessment results |
| `audit_logs` | Phase 5 | Action audit trail |

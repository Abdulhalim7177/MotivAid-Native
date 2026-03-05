# Phase 5: Infrastructure & Enhanced Clinical — Implementation Plan

## Overview

Phase 5 establishes the infrastructure for all subsequent features (AI, voice, training) and delivers enhanced clinical alerts and PDF documentation.

---

## Sprint 9: Infrastructure & Dual Mode Architecture

### 9.1 — Install New Dependencies

```bash
npx expo install expo-av expo-speech expo-camera expo-print
npm install @react-native-voice/voice
```

Update `app.json` plugins for camera permissions and voice recognition.

### 9.2 — Dual Mode Architecture

**Goal:** Allow switching between clinical (real patient) and simulation (training) mode. Simulation data is fully isolated and never syncs to Supabase.

#### New Files

| File | Purpose |
|------|---------|
| `context/mode.tsx` | `ModeProvider` with `mode: 'clinical' \| 'simulation'`, persisted to AsyncStorage |
| `lib/training-db.native.ts` | CRUD for `_training` suffixed SQLite tables |
| `lib/training-db.ts` | Web fallback (localStorage-based) |

#### Files to Modify

| File | Changes |
|------|---------|
| `app/_layout.tsx` | Insert `ModeProvider` between `UnitProvider` and `ClinicalProvider` |
| `lib/shared-db.native.ts` | Add training tables: `maternal_profiles_training`, `vital_signs_training`, `emotive_checklists_training`, `case_events_training` |
| `context/clinical.tsx` | Consume `useMode()`. Branch DB calls by mode. Disable `queueOperation()` in simulation |
| `app/(app)/(tabs)/clinical.tsx` | Add mode toggle button + "SIMULATION" banner indicator |

#### Training Table Schema (SQLite)

Same structure as `_local` tables but without `is_synced`, `remote_id` columns. No sync queue entries are created in simulation mode.

### 9.3 — Database Migrations

**New migration:** `supabase/migrations/20260306000000_ai_and_training_tables.sql`

```sql
-- AI Blood Loss Estimation fields
ALTER TABLE vital_signs ADD COLUMN blood_loss_ai_estimate INTEGER;
ALTER TABLE vital_signs ADD COLUMN blood_loss_confidence REAL;
ALTER TABLE vital_signs ADD COLUMN blood_loss_ai_method TEXT;

-- Training Scenarios
CREATE TABLE public.training_scenarios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  difficulty       TEXT DEFAULT 'beginner',
  scenario_data    JSONB NOT NULL,
  expected_actions JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Training Sessions
CREATE TABLE public.training_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id),
  scenario_id      UUID REFERENCES public.training_scenarios(id),
  score            JSONB,
  started_at       TIMESTAMPTZ DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  status           TEXT DEFAULT 'in_progress'
);

-- Training Videos
CREATE TABLE public.training_videos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  emotive_step     TEXT,
  source_type      TEXT NOT NULL,
  source_url       TEXT,
  asset_key        TEXT,
  duration_seconds INTEGER,
  thumbnail_url    TEXT,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scenarios" ON training_scenarios FOR SELECT USING (true);
CREATE POLICY "Users manage own sessions" ON training_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read videos" ON training_videos FOR SELECT USING (true);
```

**SQLite updates:** Add AI columns to `vital_signs_local` via graceful `ALTER TABLE` with try/catch for existing installs.

### Verification

- [ ] `supabase db reset` runs clean with new migration
- [ ] App starts and creates all SQLite tables (clinical + training)
- [ ] Mode toggle switches between clinical/simulation
- [ ] Data created in simulation mode is NOT visible in clinical mode
- [ ] Sync queue does NOT process training data

---

## Sprint 10: Enhanced Shock Index & PDF Export

### 10.1 — Shock Index Audio Alerts

**Goal:** Audible clinical alarm for critical/emergency shock index levels.

#### New Files

| File | Purpose |
|------|---------|
| `assets/sounds/alarm-critical.mp3` | Clinical alarm sound file |
| `components/clinical/shock-alert-banner.tsx` | Persistent, non-dismissible banner for emergency SI |

#### Files to Modify

| File | Changes |
|------|---------|
| `lib/shock-index.ts` | Add `playShockAlarm(level)` and `stopShockAlarm()` using `expo-av` |
| `app/(app)/clinical/patient-detail.tsx` | Integrate `ShockAlertBanner`, auto-trigger audio on critical/emergency |
| `context/clinical.tsx` | After `recordVitals()` calculates SI, auto-trigger alert if ≥ critical |

#### Shock Alert Behavior

| SI Level | Audio | Banner | Haptic | Dismissible |
|----------|-------|--------|--------|-------------|
| Normal | None | None | None | N/A |
| Warning | None | Yellow | Medium | Yes |
| Alert | None | Orange | Warning | Yes |
| Critical | Alarm | Red | Error | Yes (with confirmation) |
| Emergency | Alarm (loop) | Red (pulsing) | Error | No |

### 10.2 — PDF Case Report Export

**Goal:** Generate downloadable PDF reports from closed cases.

#### New Files

| File | Purpose |
|------|---------|
| `lib/pdf/case-report-generator.ts` | Builds HTML from case data, calls `expo-print` |
| `lib/pdf/report-template.ts` | HTML template: demographics, vitals timeline, E-MOTIVE actions, outcome |

#### Files to Modify

| File | Changes |
|------|---------|
| `app/(app)/clinical/case-summary.tsx` | Add "Export PDF" button with share functionality via `expo-sharing` |

#### PDF Report Contents

1. **Header:** Patient ID, age, risk level, facility, unit, dates
2. **Vitals Timeline:** Table of all recorded vital signs with shock index
3. **E-MOTIVE Bundle:** Steps completed with timestamps and doses
4. **Case Events:** Chronological event log
5. **Outcome:** Final status, blood loss total, notes

### Verification

- [ ] Record vitals with HR=130, SBP=70 → alarm plays, red pulsing banner appears
- [ ] Emergency banner cannot be dismissed
- [ ] Open closed case → tap "Export PDF" → PDF renders with correct data
- [ ] Share sheet opens with PDF attachment

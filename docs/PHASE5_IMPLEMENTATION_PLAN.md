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

## Sprint 10: Enhanced Shock Alerts & PDF Export ✅

### 10.1 — Audio Alarm Manager

**Goal:** Audible clinical alarm for critical/emergency shock index levels, with mute control.

#### New Files

| File | Purpose |
|------|---------|
| `lib/audio/shock-alarm.native.ts` | expo-av based alarm player: critical + emergency sounds, looping, mute via AsyncStorage |
| `lib/audio/shock-alarm.ts` | Web no-op stub with matching API |
| `assets/audio/alarm-critical.wav` | Critical-level alarm tone (short repeating beep) |
| `assets/audio/alarm-emergency.wav` | Emergency-level alarm tone (urgent continuous alarm) |
| `components/clinical/ShockAlarmBanner.tsx` | Persistent non-dismissible banner for emergency SI, dismissible for critical |

#### Files to Modify

| File | Changes |
|------|---------|
| `lib/shock-index.ts` | Add `triggerShockAlarm(level)` export function |
| `context/clinical.tsx` | Init/release alarm sounds in provider, trigger alarm on `recordVitals()`, expose `alarmActive`, `alarmMuted`, `toggleAlarmMute` |
| `app/(app)/clinical/record-vitals.tsx` | Trigger alarm in live SI useMemo calculation |
| `app/(app)/(tabs)/settings.tsx` | Add alarm mute toggle in Clinical section |

#### Shock Alert Behavior

| SI Level | Audio | Banner | Haptic | Dismissible |
|----------|-------|--------|--------|-------------|
| Normal | None | None | None | N/A |
| Warning | None | None | Medium | N/A |
| Alert | None | None | Warning | N/A |
| Critical | Alarm tone | Red banner | Error | Yes (with Acknowledge, 5-min cooldown) |
| Emergency | Alarm loop | Red pulsing | Error | No (mute only) |

#### Audio Manager API

```typescript
export type AlarmLevel = 'critical' | 'emergency';
export function initAlarmSounds(): Promise<void>;
export function playAlarm(level: AlarmLevel): Promise<void>;
export function stopAlarm(): Promise<void>;
export function setAlarmMuted(muted: boolean): Promise<void>;
export function isAlarmMuted(): boolean;
export function isAlarmPlaying(): boolean;
export function releaseAlarmSounds(): Promise<void>;
```

### 10.2 — PDF Case Report Export

**Goal:** Generate offline PDF reports from any case, shareable via system share sheet.

#### New Files

| File | Purpose |
|------|---------|
| `lib/pdf/case-report.ts` | Shared module: `buildCaseReportHTML()`, `generateCaseReportPDF()`, `shareCaseReport()`, `printCaseReport()` |

Uses `expo-print` for PDF generation and `expo-sharing` for share dialog.

#### Files to Modify

| File | Changes |
|------|---------|
| `app/(app)/clinical/case-summary.tsx` | Add Print and Share PDF buttons in header area |

#### PDF Report Contents

1. **Header:** MotivAid branding, patient ID, age, risk level, generation timestamp
2. **Demographics:** Age, Gravida, Parity, GA, Hb, Patient ID
3. **Risk Assessment:** Risk level badge with score and contributing factors
4. **E-MOTIVE Bundle:** 6 rows with step name, done/not done, timestamp, dose/volume
5. **Vitals Timeline:** Table of all vital signs (Time, HR, BP, Temp, RR, SpO2, EBL, SI)
6. **Case Events:** Reversed chronological event log with type icons
7. **Outcome:** Status, outcome, total elapsed time
8. **Footer:** "Generated by MotivAid" + date

### Verification

- [ ] Record vitals with HR=130, SBP=70 → alarm plays, red pulsing banner appears
- [ ] Emergency banner cannot be dismissed, only muted
- [ ] Critical banner can be acknowledged (5-min cooldown)
- [ ] Alarm mute toggle in settings persists across app restarts
- [ ] Open any case → tap Print PDF → system print dialog opens
- [ ] Tap Share → PDF attachment in share sheet
- [ ] PDF contains all demographics, vitals, E-MOTIVE steps, events, outcome

# Phase 3: Risk Assessment & Clinical Data

## Goal

Add the clinical data foundation to MotivAid — maternal patient records, WHO/AWHONN-based PPH risk assessment, vital signs monitoring with automatic prompts, shock index alerts, blood loss estimation, and offline-first storage with sync queue.

## Clinical Research Summary

### WHO 2023/2025 PPH Guidelines
- PPH = blood loss ≥300 mL + abnormal clinical signs, OR ≥500 mL regardless
- E-MOTIVE detection achieved 93.1% PPH detection vs 51.1% with visual estimation
- Objective blood loss measurement recommended (calibrated drapes)
- Early detection is the single most impactful factor

### AWHONN Risk Assessment Model (Adapted)
The risk scoring algorithm uses three tiers based on admission factors:

| Risk Level | Criteria |
|------------|----------|
| **Low** | No risk factors present (singleton, ≤4 previous births, no bleeding disorder, no PPH history) |
| **Medium** | GA <37 or >41 weeks, multiple gestation, >4 previous births, prior C-section/uterine incision, placenta previa, large fibroids, 1 previous PPH, Hb <10, anemia (Hct <30%), intraamniotic infection |
| **High** | 2+ medium-risk factors (auto-escalated), suspected abruption/active bleeding, placenta accreta, known coagulopathy, >1 previous PPH, severe prior PPH (>1500 mL or transfusion), Hb <8, morbid obesity |

### Obstetric Shock Index (OSI) Thresholds

| SI Value | Level | Action |
|----------|-------|--------|
| **< 0.9** | Normal | Routine monitoring |
| **≥ 0.9** | ⚠️ Warning | Increased vigilance, closer monitoring |
| **≥ 1.1** | 🔶 Alert | Prepare for intervention, consider transfusion |
| **≥ 1.4** | 🔴 Critical | Urgent intervention required |
| **≥ 1.7** | 🚨 Emergency | Immediate action, life-threatening |

---

## User Review Required

> [!IMPORTANT]
> **Navigation Change:** Adding a "Clinical" tab to the bottom navigation (alongside Home, Profile, Settings). The clinical entry point will also remain accessible as a dashboard action card.

> [!IMPORTANT]
> **Offline Architecture:** This phase introduces SQLite tables for clinical data and a sync queue. All clinical data will be written to SQLite first, then synced to Supabase when online. This is a fundamental architectural decision.

---

## Proposed Changes

### Database Layer

#### [NEW] Migration: `20260220000000_clinical_data_tables.sql`

Creates 3 new tables:

**`maternal_profiles`** — Patient records tied to deliveries:
```sql
CREATE TABLE public.maternal_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID REFERENCES public.facilities(id),
  unit_id         UUID REFERENCES public.units(id),
  created_by      UUID REFERENCES public.profiles(id),
  -- Demographics
  patient_id      TEXT,              -- Hospital/facility patient ID
  age             INTEGER NOT NULL,
  -- Risk factors (AWHONN-based)
  gravida         INTEGER DEFAULT 1, -- Total pregnancies
  parity          INTEGER DEFAULT 0, -- Previous births
  gestational_age_weeks INTEGER,
  is_multiple_gestation BOOLEAN DEFAULT false,
  has_prior_cesarean    BOOLEAN DEFAULT false,
  has_placenta_previa   BOOLEAN DEFAULT false,
  has_large_fibroids    BOOLEAN DEFAULT false,
  has_anemia            BOOLEAN DEFAULT false,  -- Hct <30% / Hb <10
  has_severe_anemia     BOOLEAN DEFAULT false,  -- Hb <8
  has_coagulopathy      BOOLEAN DEFAULT false,
  has_pph_history       BOOLEAN DEFAULT false,  -- 1 previous PPH
  has_severe_pph_history BOOLEAN DEFAULT false, -- >1 PPH or >1500mL
  has_placenta_accreta  BOOLEAN DEFAULT false,
  has_active_bleeding   BOOLEAN DEFAULT false,
  has_intraamniotic_infection BOOLEAN DEFAULT false,
  has_morbid_obesity    BOOLEAN DEFAULT false,
  hemoglobin_level      DECIMAL(4,1),  -- g/dL
  -- Computed
  risk_level      TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  risk_score      INTEGER DEFAULT 0,
  -- Case lifecycle
  delivery_time   TIMESTAMPTZ,
  status          TEXT DEFAULT 'pre_delivery' CHECK (status IN ('pre_delivery','active','monitoring','closed')),
  outcome         TEXT CHECK (outcome IN ('normal','pph_resolved','referred','death')),
  notes           TEXT,
  -- Sync
  is_synced       BOOLEAN DEFAULT false,
  local_id        TEXT,              -- Client-generated UUID for offline
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

**`vital_signs`** — Time-series vital sign entries:
```sql
CREATE TABLE public.vital_signs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maternal_profile_id UUID REFERENCES public.maternal_profiles(id) ON DELETE CASCADE,
  recorded_by       UUID REFERENCES public.profiles(id),
  -- Vitals
  heart_rate        INTEGER,           -- bpm
  systolic_bp       INTEGER,           -- mmHg
  diastolic_bp      INTEGER,           -- mmHg
  temperature       DECIMAL(4,1),      -- °C
  respiratory_rate  INTEGER,           -- breaths/min
  spo2              INTEGER,           -- % oxygen saturation
  -- Computed
  shock_index       DECIMAL(3,1),      -- HR / systolic_bp
  -- Blood loss
  estimated_blood_loss INTEGER DEFAULT 0, -- mL
  blood_loss_method TEXT CHECK (blood_loss_method IN ('visual','drape','weighed')),
  -- Sync
  is_synced         BOOLEAN DEFAULT false,
  local_id          TEXT,
  recorded_at       TIMESTAMPTZ DEFAULT now()
);
```

**`sync_queue`** — Offline-first sync tracking:
```sql
CREATE TABLE public.sync_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     TEXT NOT NULL,       -- Local UUID
  operation     TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
  payload       JSONB NOT NULL,
  retry_count   INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','syncing','synced','failed')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  synced_at     TIMESTAMPTZ
);
```

RLS policies: Staff can CRUD their own facility's data. Supervisors can read all data in their units.

---

### Offline Data Layer

#### [NEW] `lib/clinical-db.native.ts` / `lib/clinical-db.ts`
SQLite tables mirroring `maternal_profiles`, `vital_signs`, and `sync_queue` for offline-first operation.

#### [NEW] `lib/sync-queue.ts`
Sync engine that:
1. Writes all clinical data to SQLite first
2. Queues operations in `sync_queue`
3. On network restore, replays queue against Supabase
4. Uses last-write-wins for simple fields, server-priority for status
5. Marks records as `is_synced = true` after successful sync

---

### Risk Scoring Engine

#### [NEW] `lib/risk-calculator.ts`

Implements the AWHONN-adapted scoring algorithm:

```typescript
type RiskLevel = 'low' | 'medium' | 'high';
type RiskResult = { level: RiskLevel; score: number; factors: string[] };

function calculateRisk(profile: MaternalProfile): RiskResult {
  // Count medium-risk factors
  // Count high-risk factors
  // If any high-risk factor → HIGH
  // If 2+ medium-risk factors → HIGH (AWHONN rule)
  // If 1 medium-risk factor → MEDIUM
  // No factors → LOW
}
```

Each risk factor is categorized and weighted:

| Factor | Category | Weight |
|--------|----------|--------|
| Age <18 or >35 | Medium | 1 |
| Parity >4 | Medium | 1 |
| GA <37 or >41 weeks | Medium | 1 |
| Multiple gestation | Medium | 1 |
| Prior C-section | Medium | 1 |
| Placenta previa | Medium | 1 |
| Large fibroids | Medium | 1 |
| 1 previous PPH | Medium | 1 |
| Anemia (Hb <10) | Medium | 1 |
| Intraamniotic infection | Medium | 1 |
| Active bleeding | High | 3 |
| Placenta accreta | High | 3 |
| Coagulopathy | High | 3 |
| >1 previous PPH | High | 3 |
| Severe anemia (Hb <8) | High | 3 |
| Morbid obesity | High | 2 |

---

### Shock Index Alerting

#### [NEW] `lib/shock-index.ts`

```typescript
type ShockLevel = 'normal' | 'warning' | 'alert' | 'critical' | 'emergency';

function getShockLevel(hr: number, systolicBp: number): {
  level: ShockLevel;
  value: number;
  color: string;
  haptic: HapticType;
}
```

Triggers visual (color-coded banner + animated pulse), haptic (escalating intensity), and audio (optional beep) alerts.

---

### Clinical Context

#### [NEW] `context/clinical.tsx`

Manages the clinical workflow state:
- Active maternal profile
- Vital signs history for current case
- Vital sign auto-prompt timer (configurable interval: 15/30/60 min)
- Blood loss tracking
- Risk level (recalculated on profile changes)

---

### Navigation

#### [MODIFY] `app/(app)/(tabs)/_layout.tsx`
Add a **"Clinical"** tab between Home and Profile with a medical icon.

---

### Screens

#### [NEW] `app/(app)/(tabs)/clinical.tsx`
Clinical tab — lists active/recent maternal profiles for the current unit. Shows:
- Active cases with risk badge
- "New Patient" button
- Recent closed cases for reference

#### [NEW] `app/(app)/clinical/new-patient.tsx`
Maternal profile creation form:
- Demographics: patient ID, age
- Pregnancy info: gravida, parity, gestational age, singleton/multiple
- Risk factor toggles (grouped by AWHONN category)
- Hemoglobin input
- Auto-computed risk level displayed as colored badge (green/amber/red)
- "Save & Start Monitoring" or "Save for Later"

#### [NEW] `app/(app)/clinical/patient-detail.tsx`
Patient overview — shows:
- Risk assessment summary with contributing factors
- Vital signs timeline (chart + list)
- Current shock index with color-coded indicator
- Blood loss tracker (cumulative)
- Status controls (mark delivery time, close case)
- "Record Vitals" quick action

#### [NEW] `app/(app)/clinical/record-vitals.tsx`
Quick-entry vital signs form:
- Heart rate (numeric pad)
- Blood pressure (systolic / diastolic)
- Temperature, SpO2, respiratory rate
- Blood loss estimation (mL input + method selector)
- Auto-calculated shock index displayed *live* as values are entered
- Visual alert banner if SI crosses threshold
- Haptic feedback on critical values

---

### Dashboard Components

#### [NEW] `components/clinical/risk-badge.tsx`
Color-coded risk level badge (green LOW / amber MEDIUM / red HIGH).

#### [NEW] `components/clinical/shock-indicator.tsx`
Animated shock index display with pulsing effect at critical levels.

#### [NEW] `components/clinical/vital-sign-card.tsx`
Compact vital sign display card (HR, BP, SI, SpO2, blood loss).

#### [NEW] `components/clinical/vitals-prompt.tsx`
Auto-prompt overlay reminding staff to record vitals at the configured interval.

---

### Modifications to Existing Files

#### [MODIFY] `components/dashboard/staff-dashboard.tsx`
Update "New Case" action item to navigate to `/(app)/clinical/new-patient`.

#### [MODIFY] `components/dashboard/supervisor-dashboard.tsx`
Add a "Cases" action item showing active case count for the current unit.

---

## Verification Plan

### Manual Testing
1. Create a maternal profile with various risk factor combinations and verify risk level computation matches AWHONN rules
2. Record vitals and verify shock index calculation and alert thresholds
3. Test blood loss estimation input and cumulative tracking
4. Test vital sign auto-prompt timer (set to 1 min for testing)
5. Put device in airplane mode → create patient + record vitals → verify data saved to SQLite
6. Restore connectivity → verify sync queue replays and data appears in Supabase
7. Navigate to Clinical tab from bottom nav and from staff dashboard action

### Automated Checks
- `npx expo start` builds without errors
- Risk calculator unit logic (manual verification in-app)
- Shock index thresholds match documented values

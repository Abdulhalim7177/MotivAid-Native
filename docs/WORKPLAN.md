# MotivAid - Structured Workplan

This workplan outlines the functional blocks and sprint-by-sprint implementation plan for MotivAid. It covers completed work, bug fixes, and all planned features through production launch.

---

## Block 1: Organizational Hierarchy & Access — ✅ COMPLETE

**Objective:** Establish the facility/unit structure required for data isolation and supervisor oversight.

### Tasks:

- [x] **1.1 Database Schema** — `facilities`, `units`, `unit_memberships`, `facility_codes` tables with RLS
- [x] **1.2 Role System** — 6-role enum, `handle_new_user()` trigger, facility access codes
- [x] **1.3 Registration with Facility Codes** — Medical staff toggle, role selection, debounced code validation, deactivation detection
- [x] **1.4 Unit Selector** — `UnitProvider` context, modal picker, AsyncStorage persistence
- [x] **1.5 Membership Approval** — Supervisor approve/reject workflow with haptic feedback
- [x] **1.6 Role-Based Dashboards** — Admin, Supervisor, Staff, User dashboards with icon-based action grids
- [x] **1.7 Facility & Unit Management** — CRUD screens, auto-generated acronym codes, activation toggle

---

## Block 2: Clinical Schema & Offline Foundation — ✅ COMPLETE

**Objective:** Build the data model for maternal profiles, vital signs, and PPH cases with offline-first storage.

### Tasks:

- [x] **2.1 Maternal Profiles Table** — 13 AWHONN-adapted risk factors, facility/unit/creator linkage, RLS
- [x] **2.2 Vital Signs Table** — HR, BP, temp, SpO₂, RR, blood loss, shock index calculation
- [x] **2.3 Risk Scoring Algorithm** — `lib/risk-calculator.ts`, 4-level severity, live risk banner
- [x] **2.4 Offline SQLite Tables** — `lib/clinical-db.native.ts` + localStorage web fallback, full CRUD
- [x] **2.5 Sync Queue** — `lib/sync-queue.ts`, local→remote ID resolution, retry logic

---

## Block 3: E-MOTIVE Workflow — ✅ COMPLETE

**Objective:** Implement the core clinical decision support system based on the WHO E-MOTIVE bundle.

### Tasks:

- [x] **3.1 Clinical Tab & Case List** — Status filters, supervisor cross-unit view, pull-to-refresh
- [x] **3.2 New Patient Form** — Obstetric data + 13 risk factor toggles + live risk banner
- [x] **3.3 Patient Detail Screen** — Metrics cards, quick actions, case lifecycle management
- [x] **3.4 E-MOTIVE Checklist** — 6 interactive steps, 60-min timer, accordion UX, dose fields
- [x] **3.5 Vital Signs Recording** — Quick-entry pad, blood loss estimation, live shock index banner
- [x] **3.6 Offline Case Management** — Full lifecycle in SQLite/localStorage, queue-based sync

---

## Block 4: Timeline, Escalation & Bug Fixes — ✅ COMPLETE

**Objective:** Case timeline, emergency escalation, and critical bug fixes.

### Tasks:

- [x] **4.1 Case Timeline View** — Chronological event feed with typed events (vitals, steps, status, escalation)
- [x] **4.2 Emergency Contacts** — 3-tier contact directory with management screen
- [x] **4.3 One-Tap Escalation** — Tiered calling (unit → facility → external), event logging
- [x] **4.4 Diagnostics Phase** — Secondary PPH cause checklist (retained placenta, atony, rupture, etc.)
- [x] **4.5 Case Summary** — Integrated overview with timeline, metrics, and outcome
- [x] **4.6 Bug Fix: Logout** — `signOut()` now clears SQLite cache, SecureStore credentials, and Supabase session (even offline)
- [x] **4.7 Bug Fix: Sync Queue** — Added table priority ordering (profiles first), deferred retry for FK dependencies, immediate processing on startup

---

## Block 5: Infrastructure & Dual Mode — 🔜 NEXT (Sprint 9)

**Objective:** Install dependencies, set up dual clinical/simulation mode, create database migrations.

### Tasks:

- [ ] **5.1 Install Dependencies** — `expo-av`, `expo-speech`, `expo-camera`, `expo-print`, `@react-native-voice/voice`
- [ ] **5.2 Dual Mode Architecture** — `ModeProvider` context, training SQLite tables (`_training` suffix), mode toggle in clinical tab
- [ ] **5.3 Database Migrations** — AI blood loss columns on `vital_signs`, `training_scenarios`, `training_sessions`, `training_videos` tables with RLS
- [ ] **5.4 SQLite Training Tables** — 4 `_training` tables isolated from clinical data, no sync

### Dependencies:
- Block 4 complete ✅

---

## Block 6: Enhanced Clinical Alerts & PDF — Sprint 10

**Objective:** Audio shock index alerts and PDF case report generation.

### Tasks:

- [ ] **6.1 Shock Index Audio Alerts** — `expo-av` alarm sounds for critical/emergency SI, persistent non-dismissible banner
- [ ] **6.2 PDF Case Reports** — `expo-print` HTML→PDF generation, demographics/vitals/E-MOTIVE/outcome template, share/export

### Dependencies:
- Block 5 complete (expo-av, expo-print installed)

---

## Block 7: Voice Features — Sprint 11

**Objective:** Hands-free vital entry and voice-guided clinical workflow.

### Tasks:

- [ ] **7.1 Speech-to-Text Vital Entry** — Hold-to-speak button per vital field, hybrid recognition (on-device offline, Whisper online)
- [ ] **7.2 Text-to-Speech Guidance** — Voice-guided E-MOTIVE step readout via `expo-speech`, spoken timer alerts

### Dependencies:
- Block 5 complete (expo-speech, @react-native-voice/voice installed)

---

## Block 8: AI Blood Loss Estimation — Sprint 12

**Objective:** Camera-based and vitals-based AI estimation of blood loss.

### Tasks:

- [ ] **8.1 Camera-Based Estimation** — Image capture → cloud CV API → estimated mL + confidence
- [ ] **8.2 Vitals-Based ML** — On-device model using HR/BP/SI trends → offline estimate
- [ ] **8.3 Combined UI** — Side-by-side comparison, clinician accept/override workflow

### Dependencies:
- Block 5 complete (expo-camera, DB schema with AI columns)

---

## Block 9: Training Scenarios & Scoring — Sprint 13

**Objective:** Pre-built PPH simulation scenarios with auto-advancing vitals and performance scoring.

### Tasks:

- [ ] **9.1 Pre-Built Scenarios** — 5-10 scripted PPH cases with vital progressions and expected E-MOTIVE actions
- [ ] **9.2 Scenario Engine** — Timer-driven vitals feed, action evaluation against expected timeline
- [ ] **9.3 Scoring System** — Detection time, adherence %, escalation timeliness, grade (A-F) with feedback

### Dependencies:
- Block 5 complete (dual mode, training tables)

---

## Block 10: Training Videos & AI Scenarios — Sprint 14

**Objective:** Video library and AI-generated scenario stub.

### Tasks:

- [ ] **10.1 Video Library** — Supports bundled (offline), Supabase Storage (stream/download), YouTube/external links
- [ ] **10.2 Video Player** — `expo-av` player with download-for-offline, filtered by E-MOTIVE step
- [ ] **10.3 Training Tab** — Dedicated bottom navigation tab for training mode
- [ ] **10.4 AI Scenario Generator (Stub)** — Cloud API integration placeholder for dynamic scenario generation

### Dependencies:
- Block 5 complete (expo-av installed)
- Block 9 complete (scenario format defined)

---

## Block 11: Polish & Deployment — Sprint 15

**Objective:** Production readiness.

### Tasks:

- [ ] **11.1 QA & Performance** — Edge-case testing, offline/online stress testing, low-end device optimization
- [ ] **11.2 Analytics Dashboard** — E-MOTIVE adherence, training completion rates, case volume statistics
- [ ] **11.3 Localization** — Multi-language support (Hausa, Yoruba)
- [ ] **11.4 Production Launch** — Supabase deployment, EAS build, app store submissions

### Dependencies:
- All blocks complete

---

## Block Summary

| Block | Status | Phase | Sprint | Key Output |
|-------|--------|-------|--------|------------|
| 1. Organizational Hierarchy | ✅ Complete | 1-2 | 0-4b | Roles, facilities, units, codes, dashboards |
| 2. Clinical Schema & Offline | ✅ Complete | 3 | 5-6 | Profiles, vitals, risk scoring, sync queue |
| 3. E-MOTIVE Workflow | ✅ Complete | 3 | 5-6 | 6-step bundle, shock index, blood loss |
| 4. Timeline & Escalation | ✅ Complete | 4 | 7-8b | Timeline, escalation, diagnostics, bug fixes |
| 5. Infrastructure & Dual Mode | 🔜 Next | 5 | 9 | Dependencies, dual mode, migrations |
| 6. Alerts & PDF | 🔲 Planned | 5 | 10 | Audio alarms, PDF export |
| 7. Voice Features | 🔲 Planned | 6 | 11 | STT vital entry, TTS guidance |
| 8. AI Blood Loss | 🔲 Planned | 6 | 12 | Camera + vitals ML estimation |
| 9. Training Scenarios | 🔲 Planned | 7 | 13 | Pre-built scenarios, scoring |
| 10. Training Videos | 🔲 Planned | 7 | 14 | Video library, AI scenario stub |
| 11. Polish & Launch | 🔲 Planned | 8 | 15 | QA, analytics, localization, production |

---

## Dependency Graph

```
Block 1 (Auth & Hierarchy) ✅
    ↓
Block 2 (Clinical Schema & Offline) ✅
    ↓
Block 3 (E-MOTIVE Workflow) ✅
    ↓
Block 4 (Timeline & Escalation + Bug Fixes) ✅
    ↓
Block 5 (Infrastructure & Dual Mode) ←── NEXT
    ↓
    ├── Block 6 (Alerts & PDF)
    ├── Block 7 (Voice Features)
    ├── Block 8 (AI Blood Loss)
    ├── Block 9 (Training Scenarios)
    └── Block 10 (Training Videos)
            ↓
        Block 11 (Polish & Launch)
```

Note: Blocks 6-10 all depend on Block 5 but can be developed in parallel once infrastructure is in place.

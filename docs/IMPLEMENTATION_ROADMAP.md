# MotivAid - Implementation Roadmap

This roadmap provides a phased timeline for the development of MotivAid. Each phase represents a major milestone, while sprints (2 weeks each) detail the specific focus areas.

**Tech Stack:** React Native (Expo SDK 54), React 19, TypeScript 5.9, Expo Router v6, Supabase, SQLite

---

## Phase 1: Security & Identity — COMPLETE

**Focus:** Building a resilient authentication foundation.

- **Sprint 0:** Project setup (Expo SDK 54, TypeScript strict, Expo Router v6, Supabase client)
- **Sprint 1:** Supabase Auth with online/offline/biometric sign-in, themed UI, animated toasts
- **Sprint 2:** SQLite profile caching, route protection, settings, profile editing, avatar upload

**Result:** A secure, offline-capable authentication system with three sign-in paths (online, offline hash verification, biometric), profile management, and a light/dark theme system.

**Migrations:** `20260216000000_init_auth_and_storage.sql`

---

## Phase 2: Facility & Unit Hierarchy — COMPLETE

**Focus:** Modeling the real-world healthcare environment.

- **Sprint 3:**
  - **Backend:** Created `facilities`, `units`, `unit_memberships` tables with RLS
  - **Roles:** Expanded `user_role` enum with `nurse` and `student`
  - **UI:** `UnitProvider` context + `UnitSelector` component with modal picker

- **Sprint 4a:**
  - **Backend:** Created `facility_codes` table for role-specific registration codes
  - **Dashboard:** 4 role-based dashboards (Admin, Supervisor, Staff, User) with icon-based action grids
  - **Approval:** Supervisor membership approval screen with approve/reject workflow

- **Sprint 4b (Management):**
  - **Backend:** Added `facility_id` column to `profiles`, management RLS policies (facility CRUD for admin/supervisor), facility code activation (`is_active` column)
  - **Facilities Screen:** Full CRUD for facilities with name/location fields, auto-generated registration codes (acronym-based format e.g. `AKTH1-SUP`), view/edit/create modals, code activate/deactivate toggle
  - **Units Screen:** Full CRUD for units within facilities, description and metadata fields
  - **Registration:** Updated code validation to support variable-length codes with debounced input, deactivated code detection
  - **DB Functions:** Enhanced `auto_generate_facility_codes()` with acronym logic, enhanced `handle_new_user()` with `is_active` check

**Result:** Full organizational hierarchy management. Admins can create/edit facilities with auto-generated codes. Supervisors can approve memberships. Staff register with facility codes that are validated in real-time, including deactivation checks. Each role gets a customized dashboard with icon-based action grids.

**Migrations:**
- `20260216000001_expand_roles_and_org.sql`
- `20260216000002_role_specific_codes.sql`
- `20260216000003_add_facility_to_profiles.sql`
- `20260216000004_management_rls.sql`
- `20260218000000_facility_code_activation.sql`

---

## Phase 3: Risk Assessment & Clinical Mode — COMPLETE

**Focus:** Patient data entry, clinical logic, and the E-MOTIVE intervention workflow.

- **Sprint 5 (Risk Assessment & Patient Management):**
  - **Database:** Created `maternal_profiles`, `vital_signs`, `emotive_checklists` Supabase tables with RLS + `sync_queue` table
  - **Offline:** Parallel SQLite tables (`maternal_profiles_local`, `vital_signs_local`, `emotive_checklists_local`, `sync_queue_local`) with full CRUD
  - **Web Fallback:** localStorage-backed equivalents in `lib/clinical-db.ts`
  - **Risk Calculator:** AWHONN-adapted scoring algorithm (`lib/risk-calculator.ts`) — Low/Medium/High/Critical with 13 factor flags
  - **New Patient Form:** Full maternal data entry with live risk banner, 13 toggleable risk factors, obstetric history fields
  - **Clinical Tab:** Bottom nav tab with case list, status filters (Pre-Delivery/Active/Monitoring/Closed), pull-to-refresh, supervisor cross-unit view

- **Sprint 6 (Vital Signs, Shock Index & E-MOTIVE):**
  - **Vital Signs Pad:** Quick-entry form for HR, BP (systolic/diastolic), temperature, SpO2, respiratory rate
  - **Shock Index:** Live SI calculation (`lib/shock-index.ts`) with 5-level severity (Normal → Emergency), color-coded banners, haptic alerts on critical values
  - **Blood Loss Estimation:** Numeric input with quick-add buttons (+100/+250/+500/+1000 mL), method selector (Visual/Drape/Weighed), severity assessment
  - **E-MOTIVE Checklist:** Full interactive WHO E-MOTIVE bundle (6 steps: Early Detection, Massage, Oxytocin, TXA, IV Fluids, Escalation) with:
    - Elapsed timer tracking 60-minute WHO target
    - Accordion UX (one step expanded at a time)
    - Auto-timestamps, dose/volume fields, notes per step
    - "Done" button → close case modal with outcome selection
  - **Patient Detail Screen:** Overview with metrics cards (Shock Index, Blood Loss), quick actions (Record Vitals, E-MOTIVE Bundle), case lifecycle management (Pre-Delivery → Active → Monitoring → Closed)
  - **Vitals Prompt Banner:** Animated reminder when vital signs are overdue
  - **Sync Queue:** Background upload engine (`lib/sync-queue.ts`) with retry logic, resolves local IDs to remote UUIDs
  - **Context:** `ClinicalProvider` managing profiles, vitals, E-MOTIVE checklist, active case state, sync operations

**Result:** A complete clinical workflow from patient registration through risk assessment, vital signs monitoring, E-MOTIVE intervention tracking, and case closure — all working offline-first with queue-based sync.

**Migrations:**
- `20260220000000_clinical_data_tables.sql` (maternal_profiles, vital_signs, sync_queue + RLS)
- `20260222000000_emotive_checklists.sql` (emotive_checklists + RLS)

---

## Phase 4: Case Timeline, Alerts & Escalation — COMPLETE

**Focus:** Communication, real-time alerts, and comprehensive case documentation.

- **Sprint 7:**
  - **Timeline View:** Chronological event list for each case showing all vitals, interventions, and status changes
  - **Escalation System:** One-tap emergency contact with 3-level hierarchy (unit → facility → external referral)
  - **Emergency Contacts Table:** Unit and facility emergency contacts with management screen
  - **Diagnostics Phase:** Secondary PPH cause checklist
  - **Global Clinical Access:** Facility-wide staff visibility
- **Sprint 8a:**
  - **Case Summary:** Integrated overview with timeline, metrics, and clinical outcome
  - **Enhanced RLS:** Unassigned staff clinical access policies
  - **Automated Event Logging:** Vitals, checklist steps, and status change events
- **Sprint 8b (Bug Fixes & Docs):**
  - **Logout Fix:** Properly clears SQLite cache, SecureStore credentials, and Supabase session on sign-out
  - **Sync Queue Fix:** Dependency-ordered processing (parent records first), immediate queue processing on startup, deferred retry for unresolved foreign keys
  - **Documentation Update:** Full roadmap refresh for Phases 5-8

**Result:** Rapid emergency response capability with tiered escalation, comprehensive case documentation via timeline, and reliable offline sync.

**Migrations:**
- `20260224000000_allow_unassigned_staff_clinical_access.sql`
- `20260224000001_add_phone_to_profiles.sql`
- `20260224000002_emergency_and_timeline.sql`
- `20260225000000_support_users_without_facility.sql`
- `20260226000000_add_diagnostics_to_emotive.sql`
- `20260226000001_add_local_id_to_emergency.sql`

---

## Phase 5: Infrastructure & Enhanced Clinical — IN PROGRESS

**Focus:** Dual-mode architecture, enhanced alerts, and PDF documentation.

- **Sprint 9 (Infrastructure & Dual Mode):**
  - **New Dependencies:** `expo-av`, `expo-speech`, `expo-camera`, `expo-print`, `@react-native-voice/voice`
  - **Dual Mode Architecture:** `ModeProvider` context for clinical vs simulation mode, training-specific SQLite tables (`_training` suffix) that never sync to Supabase
  - **Database Migrations:** AI blood loss columns on `vital_signs`, `training_scenarios`, `training_sessions`, `training_videos` tables
- **Sprint 10 (Shock Alerts & PDF):**
  - **Audio Shock Alerts:** Configurable alarm sounds via `expo-av` for critical/emergency shock index levels, persistent non-dismissible banner for emergency SI
  - **PDF Case Reports:** Auto-generated PPH case summary using `expo-print`, HTML template with demographics, vitals timeline, E-MOTIVE actions, and outcome, share/export functionality

**Goal:** Lay the infrastructure for training, AI, and voice features while enhancing clinical alerts and documentation.

---

## Phase 6: AI & Voice Features — PLANNED

**Focus:** Hands-free clinical workflow and AI-assisted decision support.

- **Sprint 11 (Voice Features):**
  - **Speech-to-Text Vital Entry:** Hold-to-speak button for each vital sign field, hybrid recognition (on-device offline via `@react-native-voice/voice`, cloud via OpenAI Whisper when online)
  - **Text-to-Speech Guidance:** Voice-guided E-MOTIVE step readout via `expo-speech`, spoken timer alerts ("1 minute remaining", "Bundle time exceeded")
- **Sprint 12 (AI Blood Loss Estimation):**
  - **Camera-Based Estimation:** Capture surgical drape/pad image → cloud CV model → estimated mL with confidence score
  - **Vitals-Based ML:** On-device model using HR/BP/SI trends for offline blood loss estimation
  - **Combined UI:** Side-by-side comparison of camera and vitals estimates, clinician accept/override workflow

**Goal:** Enable hands-free clinical workflow and AI-assisted blood loss estimation for improved PPH detection accuracy.

---

## Phase 7: Training & Simulation — PLANNED

**Focus:** Continuous learning, competency assessment, and multimedia training.

- **Sprint 13 (Scenarios & Scoring):**
  - **Pre-Built Scenarios:** 5-10 scripted PPH cases with auto-advancing vital progressions and expected E-MOTIVE actions
  - **Scenario Engine:** Timer-driven vitals feed, action evaluation against expected timeline
  - **Scoring System:** Detection time, protocol adherence %, escalation timeliness, overall grade (A-F) with feedback
- **Sprint 14 (Videos & AI Scenarios):**
  - **Video Library:** Support for bundled (offline), Supabase Storage (stream/download), and YouTube/external links, filtered by E-MOTIVE step
  - **AI-Generated Scenarios (Stub):** Cloud API integration for dynamic patient scenario generation
  - **Training Tab:** Dedicated bottom navigation tab for training mode

**Goal:** Build clinical confidence through safe, repeatable practice with multimedia learning and performance tracking.

---

## Phase 8: Polish & Deployment — PLANNED

**Focus:** Production readiness.

- **Sprint 15:**
  - **QA:** Edge-case testing, performance optimization on low-end devices, offline/online transition stress testing
  - **Analytics Dashboard:** Supervisor E-MOTIVE adherence metrics, training completion rates, case volume statistics
  - **Multi-Language:** Localization support (Hausa, Yoruba)
  - **Launch:** Production Supabase deployment, EAS build configuration, app store submissions (Google Play, App Store)

**Goal:** A polished, life-saving clinical tool ready for real-world deployment.

---

## Timeline Overview

| Phase | Sprints | Status | Key Deliverables |
|-------|---------|--------|------------------|
| 1. Security & Identity | 0–2 | ✅ Complete | Auth, offline sign-in, biometrics, theming |
| 2. Facility & Unit Hierarchy | 3–4b | ✅ Complete | Roles, facilities CRUD, units CRUD, codes, dashboards, activation |
| 3. Risk Assessment & Clinical Mode | 5–6 | ✅ Complete | Maternal profiles, vital signs, risk scoring, E-MOTIVE checklist, shock index, sync queue, offline clinical data |
| 4. Timeline, Alerts & Escalation | 7–8b | ✅ Complete | Case timeline, emergency contacts, tiered escalation, case summary, bug fixes |
| 5. Infrastructure & Enhanced Clinical | 9–10 | 🏗️ In Progress | Dual mode, dependencies, shock audio alerts, PDF export |
| 6. AI & Voice Features | 11–12 | 🔲 Planned | STT vital entry, TTS guidance, AI blood loss estimation |
| 7. Training & Simulation | 13–14 | 🔲 Planned | PPH scenarios, scoring, video library, AI scenarios |
| 8. Polish & Deployment | 15 | 🔲 Planned | QA, analytics, localization, production launch |

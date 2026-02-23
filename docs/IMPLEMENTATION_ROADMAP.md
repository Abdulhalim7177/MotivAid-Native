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

## Phase 4: Case Timeline, Alerts & Escalation — PLANNED (Next)

**Focus:** Communication, real-time alerts, and comprehensive case documentation.

- **Sprint 7:**
  - **Timeline View:** Chronological event list for each case showing all vitals, interventions, and status changes
  - **Alert Thresholds:** Configurable visual/haptic triggers for SI thresholds and blood loss levels
  - **Escalation System:** One-tap emergency contact with 3-level hierarchy (unit → facility → external referral)
  - **Emergency Contacts Table:** Unit and facility emergency contacts
- **Sprint 8:**
  - **Case Reports:** Auto-generated PPH case summary from interventions and vitals timeline
  - **Audit Logging:** Action logging table for accountability
  - **E-MOTIVE Adherence Metrics:** Supervisor unit-wide adherence view
  - **PDF Export:** Case report generation for audit

**Goal:** Ensure rapid emergency response and comprehensive case documentation.

---

## Phase 5: Training & Simulation — PLANNED

**Focus:** Continuous learning and competency assessment.

- **Sprint 9:**
  - **Simulation:** Practice PPH scenarios for midwives to build confidence (no real patient data)
  - **Quizzes:** MCQ knowledge assessments with automated scoring
  - **Case Studies:** Interactive decision trees based on real-world PPH cases
  - **Progress Tracking:** Performance history per user, completion rates

**Goal:** Build clinical confidence through safe, repeatable practice.

---

## Phase 6: Polish & Deployment — PLANNED

**Focus:** Production readiness.

- **Sprint 10:**
  - **QA:** Edge-case testing, performance optimization on low-end devices
  - **Analytics Dashboard:** Supervisor/admin aggregated metrics view
  - **Multi-Language:** Localization support (Hausa, Yoruba)
  - **Launch:** Production Supabase deployment and app store submissions

**Goal:** A polished, life-saving clinical tool ready for real-world deployment.

---

## Timeline Overview

| Phase | Sprints | Status | Key Deliverables |
|-------|---------|--------|------------------|
| 1. Security & Identity | 0–2 | ✅ Complete | Auth, offline sign-in, biometrics, theming |
| 2. Facility & Unit Hierarchy | 3–4b | ✅ Complete | Roles, facilities CRUD, units CRUD, codes, dashboards, activation |
| 3. Risk Assessment & Clinical Mode | 5–6 | ✅ Complete | Maternal profiles, vital signs, risk scoring, E-MOTIVE checklist, shock index, sync queue, offline clinical data |
| 4. Timeline, Alerts & Escalation | 7–8 | 🏗️ In Progress | Case timeline, emergency contacts, tiered escalation, audit logs |
| 5. Training & Simulation | 9 | 🔲 Planned | PPH scenarios, quizzes, case studies, progress tracking |
| 6. Polish & Deployment | 10 | 🔲 Planned | QA, analytics, localization, production launch |

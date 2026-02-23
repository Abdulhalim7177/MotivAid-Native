# MotivAid - Structured Workplan

This workplan outlines the functional blocks required to implement the MotivAid clinical system. It focuses on technical dependencies and the logical flow of data from administrative setup to point-of-care intervention.

---

## Block 1: Organizational Hierarchy & Access - COMPLETE

**Objective:** Establish the facility/unit structure required for data isolation and supervisor oversight.

### Tasks:

- [x] **1.1 Database Schema**
  - Create `facilities` table (id, name, location)
  - Create `units` table (id, facility_id, name, description)
  - Create `unit_memberships` table (profile_id, unit_id, status, role_in_unit)
  - Create `facility_codes` table (facility_id, role, code)
  - Enable RLS on all tables with appropriate policies

- [x] **1.2 Role System**
  - Expand `user_role` enum: admin, user, supervisor, midwife, nurse, student
  - Implement `handle_new_user()` trigger for automatic role assignment
  - Create facility access codes per role per facility

- [x] **1.3 Registration with Facility Codes**
  - Medical staff toggle on registration form
  - Role selection buttons (Midwife, Nurse, Student, Supervisor)
  - Real-time variable-length code validation against `facility_codes` table (debounced)
  - Deactivated code detection with specific error message
  - Pass `registration_code` in user metadata for trigger-based role assignment

- [x] **1.4 Unit Selector**
  - `UnitProvider` context with active unit state
  - Fetch units from Supabase with facility name joins
  - Role-based filtering (staff only see approved memberships)
  - Persist active unit to AsyncStorage
  - Modal picker UI component

- [x] **1.5 Membership Approval**
  - Approvals screen for supervisors
  - FlatList of pending membership requests
  - Approve/reject actions with Supabase update
  - Haptic feedback and toast notifications

- [x] **1.6 Role-Based Dashboards**
  - `AdminDashboard` — Global statistics, system admin actions, quick action nav cards
  - `SupervisorDashboard` — Unit adherence, pending approvals, icon-based management grid
  - `StaffDashboard` — Shift overview, icon-based quick actions, training progress
  - `UserDashboard` — Simplified clinical mode entry

- [x] **1.7 Facility & Unit Management**
  - Facilities CRUD screen with auto-generated registration codes (acronym-based format)
  - Code activation/deactivation toggle with visual feedback
  - Units CRUD screen within facilities
  - Management RLS policies for admin/supervisor roles
  - `is_active` column on `facility_codes` for code lifecycle management

### Dependencies:
- Supabase Auth (Phase 1) must be complete
- Profiles table with role column must exist

---

## Block 2: Clinical Schema & Offline Foundation - COMPLETE

**Objective:** Build the data model for maternal profiles, vital signs, and PPH cases with offline-first storage.

### Tasks:

- [x] **2.1 Maternal Profiles Table**
  - Migration `20260220000000_clinical_data_tables.sql`: age, parity, gravida, blood type, weight, 13 AWHONN-adapted risk factors
  - Boolean flags: has_anemia, has_pph_history, is_multiple_gestation, has_prior_cesarean, has_placenta_previa, has_large_fibroids, has_intraamniotic_infection, has_severe_anemia, has_coagulopathy, has_severe_pph_history, has_placenta_accreta, has_active_bleeding, has_morbid_obesity
  - Linked to facility, unit, and created_by (staff profile)
  - RLS policies: facility-scoped reads, staff insert, creator/supervisor update

- [x] **2.2 Vital Signs Table**
  - Migration `20260220000000_clinical_data_tables.sql`: heart_rate, systolic_bp, diastolic_bp, temperature, respiratory_rate, spo2, estimated_blood_loss, blood_loss_method
  - Application-level Shock Index calculation (HR / systolic_bp) via `lib/shock-index.ts`
  - 5-level severity: Normal, Warning, Alert, Critical, Emergency

- [x] **2.3 Risk Scoring Algorithm**
  - Implemented `lib/risk-calculator.ts` (AWHONN-adapted)
  - 13 risk factors scored: Low (0-1), Medium (2-3), High (4-5), Critical (6+)
  - Preparedness recommendations per level
  - Live risk banner updates as factors are toggled

- [x] **2.4 Offline SQLite Tables**
  - Created `lib/clinical-db.native.ts` with tables: `maternal_profiles_local`, `vital_signs_local`, `emotive_checklists_local`, `sync_queue_local`
  - Full CRUD for all tables
  - `is_synced` and `remote_id` columns for sync tracking
  - Web fallback in `lib/clinical-db.ts` using localStorage

- [x] **2.5 Sync Queue**
  - Implemented `lib/sync-queue.ts` for background upload
  - Resolves local_id → remote_id for foreign keys
  - Retry logic with max_retries (default 3)
  - Supports maternal_profiles, vital_signs, and emotive_checklists

### Dependencies:
- Block 1 complete (facilities, units, memberships) ✅

---

## Block 3: E-MOTIVE Workflow - COMPLETE

**Objective:** Implement the core clinical decision support system based on the WHO E-MOTIVE bundle.

### Tasks:

- [x] **3.1 Clinical Tab & Case List**
  - Bottom nav tab `app/(app)/(tabs)/clinical.tsx`
  - FlatList with status filters (Pre-Delivery/Active/Monitoring/Closed)
  - Supervisor cross-unit view with unit filter chips
  - Pull-to-refresh, sync button, new case navigation

- [x] **3.2 New Patient Form**
  - `app/(app)/clinical/new-patient.tsx`
  - Obstetric data entry: age, gravida, parity, gestational age, blood type, weight, hemoglobin
  - 13 toggleable risk factor switches grouped by severity (Medium/High/Critical)
  - Live risk banner with color-coded level display

- [x] **3.3 Patient Detail Screen**
  - `app/(app)/clinical/patient-detail.tsx`
  - Metrics cards: Shock Index (latest) + Blood Loss (latest)
  - Quick actions: Record Vitals, E-MOTIVE Bundle
  - Case lifecycle controls: status transitions + cross-platform close modal with outcome selection

- [x] **3.4 E-MOTIVE Checklist**
  - `components/clinical/emotive-checklist.tsx`
  - 6 interactive steps: Early Detection, Massage, Oxytocin, TXA, IV Fluids, Escalation
  - 60-minute elapsed timer anchored to earliest step timestamp
  - Accordion UX: one step expanded at a time with detail inputs (dose, volume, notes)
  - Auto-timestamps on check, "Done" button when all complete → close case modal
  - E-MOTIVE data persisted in `emotive_checklists` table (local + remote)

- [x] **3.5 Vital Signs Recording**
  - `app/(app)/clinical/record-vitals.tsx`
  - Quick-entry pad for HR, BP, temperature, SpO2, respiratory rate
  - Blood loss estimation with quick-add buttons and method selector (Visual/Drape/Weighed)
  - Live Shock Index banner with 5-level severity
  - Vitals prompt banner (`components/clinical/vitals-prompt-banner.tsx`) for timed reminders

- [x] **3.6 Offline Case Management**
  - Full case lifecycle in SQLite (native) and localStorage (web)
  - Queue-based sync via `lib/sync-queue.ts`
  - Context provider (`context/clinical.tsx`) managing all state and operations

### Dependencies:
- Block 2 complete (maternal profiles, vital signs, offline foundation) ✅

---

## Block 4: Timeline, Escalation & Reports - IN PROGRESS

**Objective:** Implement the case timeline, emergency escalation, and case reporting.

### Tasks:

- [ ] **4.1 Case Timeline View**
  - Chronological event list per case (vitals, E-MOTIVE steps, status changes)
  - Auto-logged entries from existing data
  - Scrollable timeline UI with timestamps

- [ ] **4.2 Emergency Contacts Table**
  - Create migration: unit_id, facility_id, contact_type, name, phone, role
  - Three tiers: unit contacts, facility contacts, external referrals

- [ ] **4.3 One-Tap Escalation**
  - Emergency button in clinical mode
  - Triggers notification to Level 1 contacts (unit supervisor, senior midwife)
  - Auto-escalate to Level 2 (facility) if no response
  - Level 3: external referral contacts

- [ ] **4.4 Case Reports**
  - Auto-generated PPH case summary from interventions and vitals
  - PDF export capability
  - E-MOTIVE adherence metrics per case

- [ ] **4.5 Audit Logging**
  - `audit_logs` table: action, actor, target, timestamp, metadata
  - Log all clinical actions, escalations, and case status changes
  - Supervisor/admin accessible audit trail

### Dependencies:
- Block 3 complete (E-MOTIVE workflow, clinical data) ✅

---

## Block 5: Analytics & Training - PLANNED

**Objective:** Provide performance insights and training capabilities.

### Tasks:

- [ ] **5.1 Case Reports**
  - Individual PPH case summary report
  - Auto-generated from interventions and vital signs timeline
  - PDF export capability

- [ ] **5.2 Unit Analytics**
  - E-MOTIVE adherence rate per unit
  - Average response times
  - Case outcome statistics
  - Trend analysis (weekly/monthly)

- [ ] **5.3 Training Scenarios**
  - Simulated PPH cases (no real patient data)
  - Practice E-MOTIVE checklist
  - Timed challenges

- [ ] **5.4 Quizzes & Assessments**
  - MCQ question bank
  - Automated scoring
  - Progress tracking per user

- [ ] **5.5 Training Dashboard**
  - Course completion status
  - Quiz scores history
  - Performance recommendations

### Dependencies:
- Block 3 complete (E-MOTIVE workflow for scenario simulation)
- Block 4 complete (audit data for analytics)

---

## Block Summary

| Block | Status | Phase | Sprints | Key Output |
|-------|--------|-------|---------|------------|
| 1. Organizational Hierarchy | Complete | Phase 1-2 | 0-4 | Roles, facilities, units, memberships |
| 2. Clinical Schema | Complete | Phase 3 | 5-6 | Maternal profiles, vital signs, risk scoring |
| 3. E-MOTIVE Workflow | Complete | Phase 4 | 7-8 | PPH cases, interventions, clinical mode |
| 4. Escalation & Comms | 🏗️ In Progress | Phase 5 | 9 | Alerts, emergency contacts, audit |
| 5. Analytics & Training | 🔲 Planned | Phase 6 | 10 | Reports, scenarios, quizzes |

---

## Dependency Graph

```
Block 1 (Auth & Hierarchy)
    ↓
Block 2 (Clinical Schema & Offline)
    ↓
Block 3 (E-MOTIVE Workflow)
    ↓
Block 4 (Escalation & Comms)
    ↓
Block 5 (Analytics & Training)
```

Each block builds on the database tables and services established in the previous block. Blocks cannot be parallelized without modification.

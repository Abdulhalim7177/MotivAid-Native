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
  - Real-time 6-character code validation against `facility_codes` table
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
  - `AdminDashboard` — Global statistics, system admin actions
  - `SupervisorDashboard` — Unit adherence, pending approvals, team management
  - `StaffDashboard` — Shift overview, clinical mode entry, training progress
  - `UserDashboard` — Simplified clinical mode entry

### Dependencies:
- Supabase Auth (Phase 1) must be complete
- Profiles table with role column must exist

---

## Block 2: Clinical Schema & Offline Foundation - PLANNED

**Objective:** Build the data model for maternal profiles, vital signs, and PPH cases with offline-first storage.

### Tasks:

- [ ] **2.1 Maternal Profiles Table**
  - Create migration: age, parity, gravida, blood type, weight, risk factors
  - Boolean flags: has_anemia, has_pph_history, has_multiple_pregnancy, has_pre_eclampsia, etc.
  - Link to facility and unit via foreign keys
  - RLS policies scoped to unit membership

- [ ] **2.2 Vital Signs Table**
  - Create migration: heart_rate, systolic_bp, diastolic_bp, temperature, respiratory_rate
  - Computed column or application-level shock_index (HR / systolic_bp)
  - Timestamp tracking, recorded_by reference

- [ ] **2.3 Risk Scoring Algorithm**
  - Implement `lib/risk-calculator.ts`
  - Score based on maternal factors (age, parity, history, anemia, etc.)
  - Output: low / medium / high / critical risk level
  - Preparedness recommendations per level

- [ ] **2.4 Offline SQLite Tables**
  - Extend `lib/db.native.ts` with tables for maternal profiles and vital signs
  - Implement CRUD operations for offline data entry
  - Add `sync_status` column (pending, synced, failed) to each local table

### Dependencies:
- Block 1 complete (facilities, units, memberships)

---

## Block 3: E-MOTIVE Workflow - PLANNED

**Objective:** Implement the core clinical decision support system based on the WHO E-MOTIVE bundle.

### Tasks:

- [ ] **3.1 PPH Cases Table**
  - Create migration: delivery_time, estimated_blood_loss, status (active/resolved/referred/death)
  - Link to maternal_profile, midwife (profile), unit, facility
  - Timestamps for key events

- [ ] **3.2 Interventions Table**
  - Create migration: pph_case_id, type (enum), name, dosage, route, timing
  - Track performed_by, is_completed, completed_at
  - E-MOTIVE types: early_detection, massage, oxytocics, tranexamic_acid, iv_fluids, examination, escalation

- [ ] **3.3 Clinical Mode Screen**
  - Pre-delivery: enter maternal data, calculate risk
  - Active monitoring: 1-hour timer, vital signs entry
  - PPH detected: trigger E-MOTIVE checklist

- [ ] **3.4 E-MOTIVE Checklist UI**
  - Interactive step-by-step checklist
  - Each step logs an intervention with timestamp
  - Visual progress tracking
  - Color-coded urgency indicators

- [ ] **3.5 Case Timeline**
  - Chronological event list for a case
  - Auto-logged events (vital signs, interventions, escalations)
  - Exportable for audit

- [ ] **3.6 Offline Case Management**
  - Full case lifecycle in SQLite
  - Queue-based sync when connectivity restores
  - Conflict resolution for concurrent edits

### Dependencies:
- Block 2 complete (maternal profiles, vital signs, offline foundation)

---

## Block 4: Escalation & Communications - PLANNED

**Objective:** Implement the emergency alert and escalation system.

### Tasks:

- [ ] **4.1 Emergency Contacts Table**
  - Create migration: unit_id, facility_id, contact_type, name, phone, role
  - Three tiers: unit contacts, facility contacts, external referrals

- [ ] **4.2 Alert Thresholds**
  - Configurable thresholds: blood loss >500ml (warning), >1000ml (critical)
  - Shock index thresholds: >0.9 (warning), >1.4 (critical)
  - Visual alerts (color change, animation) + haptic alerts

- [ ] **4.3 One-Tap Escalation**
  - Emergency button in clinical mode
  - Triggers notification to Level 1 contacts (unit supervisor, senior midwife)
  - Auto-escalate to Level 2 (facility) if no response
  - Level 3: external referral contacts

- [ ] **4.4 Audit Logging**
  - `audit_logs` table: action, actor, target, timestamp, metadata
  - Log all clinical actions, escalations, and case status changes
  - Supervisor/admin accessible audit trail

### Dependencies:
- Block 3 complete (PPH cases, interventions, clinical mode)

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
| 2. Clinical Schema | Planned | Phase 3 | 5-6 | Maternal profiles, vital signs, risk scoring |
| 3. E-MOTIVE Workflow | Planned | Phase 4 | 7-8 | PPH cases, interventions, clinical mode |
| 4. Escalation & Comms | Planned | Phase 5 | 9 | Alerts, emergency contacts, audit |
| 5. Analytics & Training | Planned | Phase 6 | 10 | Reports, scenarios, quizzes |

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

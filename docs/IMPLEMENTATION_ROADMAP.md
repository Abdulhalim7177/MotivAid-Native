# MotivAid - Implementation Roadmap

This roadmap provides a phased timeline for the development of MotivAid. Each phase represents a major milestone, while sprints (2 weeks each) detail the specific focus areas.

**Tech Stack:** React Native (Expo SDK 54), React 19, TypeScript 5.9, Expo Router v6, Supabase, SQLite

---

## Phase 1: Security & Identity - COMPLETE

**Focus:** Building a resilient authentication foundation.

- **Sprint 0:** Project setup (Expo SDK 54, TypeScript strict, Expo Router v6, Supabase client)
- **Sprint 1:** Supabase Auth with online/offline/biometric sign-in, themed UI, animated toasts
- **Sprint 2:** SQLite profile caching, route protection, settings, profile editing, avatar upload

**Result:** A secure, offline-capable authentication system with three sign-in paths (online, offline hash verification, biometric), profile management, and a light/dark theme system.

**Migrations:** `20260216000000_init_auth_and_storage.sql`

---

## Phase 2: Facility & Unit Hierarchy - COMPLETE

**Focus:** Modeling the real-world healthcare environment.

- **Sprint 3:**
  - **Backend:** Created `facilities`, `units`, `unit_memberships` tables with RLS
  - **Roles:** Expanded `user_role` enum with `nurse` and `student`
  - **UI:** `UnitProvider` context + `UnitSelector` component with modal picker
- **Sprint 4:**
  - **Backend:** Created `facility_codes` table for role-specific registration codes
  - **Dashboard:** 4 role-based dashboards (Admin, Supervisor, Staff, User)
  - **Approval:** Supervisor membership approval screen with approve/reject workflow

**Result:** Users can register with facility codes to get role assignments. Staff see their approved units. Supervisors can approve/reject membership requests. Each role gets a customized dashboard.

**Migrations:** `20260216000001_expand_roles_and_org.sql`, `20260216000002_role_specific_codes.sql`

---

## Phase 3: Risk Assessment & Clinical Data - PLANNED

**Focus:** Patient data entry and initial clinical logic.

- **Sprint 5:**
  - **Forms:** Build the Maternal Risk Assessment form (age, parity, anemia, PPH history)
  - **Logic:** Implement the Risk Scoring algorithm (low/medium/high/critical)
- **Sprint 6:**
  - **Vital Signs:** Create the quick-entry vital signs pad (HR, BP)
  - **Calculations:** Automated Shock Index display (HR / systolic BP)
  - **Offline:** SQLite tables for maternal profiles and vital signs

**Goal:** Identify high-risk mothers before delivery begins and establish the offline clinical data foundation.

---

## Phase 4: Active Clinical Mode - PLANNED

**Focus:** The point-of-care intervention interface (the heart of MotivAid).

- **Sprint 7:**
  - **Timer Logic:** 1-hour PPH watch timer and delivery timestamping
  - **Checklist:** The E-MOTIVE interactive bundle (Early Detection through Escalation)
  - **Logging:** Automatic intervention timestamping
- **Sprint 8:**
  - **Timeline:** Build the Case Timeline showing every intervention in real-time
  - **Offline Persistence:** Robust SQLite saving for active cases
  - **Sync Queue:** Background data upload when connectivity restores

**Goal:** Provide guided support to midwives during a PPH emergency, even without internet.

---

## Phase 5: Alerts, Escalation & Reports - PLANNED

**Focus:** Communication and documentation.

- **Sprint 9:**
  - **Alerts:** Visual/haptic triggers for critical clinical thresholds
  - **Escalation:** One-tap emergency contact system with 3-level hierarchy
  - **Reporting:** PPH case report generation for audit
  - **Metrics:** Supervisor unit-wide E-MOTIVE adherence view
  - **Audit:** Action logging for accountability

**Goal:** Ensure rapid emergency response and comprehensive case documentation.

---

## Phase 6: Training, Polish & Deployment - PLANNED

**Focus:** Sustainability and production readiness.

- **Sprint 10:**
  - **Simulation:** Practice PPH scenarios for midwives to build confidence
  - **Quizzes:** MCQ knowledge assessments with progress tracking
  - **QA:** Edge-case testing, performance optimization on low-end devices
  - **Launch:** Production Supabase deployment and app store submissions

**Goal:** A polished, life-saving clinical tool ready for real-world deployment.

---

## Timeline Overview

| Phase | Sprints | Status | Key Deliverables |
|-------|---------|--------|------------------|
| 1. Security & Identity | 0-2 | Complete | Auth, offline sign-in, biometrics, theming |
| 2. Facility & Unit Hierarchy | 3-4 | Complete | Roles, facilities, units, memberships, dashboards |
| 3. Risk Assessment | 5-6 | Planned | Maternal data, vital signs, risk scoring |
| 4. Clinical Mode | 7-8 | Planned | E-MOTIVE workflow, cases, interventions |
| 5. Alerts & Reports | 9 | Planned | Escalation, case reports, adherence metrics |
| 6. Training & Deployment | 10 | Planned | Scenarios, quizzes, QA, production launch |

# MotivAid - Implementation Plan

## Overview

This document outlines the sprint-by-sprint implementation plan for MotivAid, organized into 6 phases across 10 sprints. Each sprint is approximately 2 weeks.

---

## Phase 1: Security & Identity (Sprints 0-2) - COMPLETE

### Sprint 0: Project Foundation

**Deliverables:**
- [x] Expo SDK 54 project setup with TypeScript 5.9 strict mode
- [x] Expo Router v6 with file-based routing and typed routes
- [x] Supabase client setup with `ExpoSecureStoreAdapter`
- [x] React 19 with experimental React Compiler enabled
- [x] New Architecture enabled (`newArchEnabled: true`)
- [x] ESLint configuration with `eslint-config-expo`
- [x] Path alias `@/*` mapping to project root
- [x] Environment variable setup (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

**Database:**
- [x] Migration `20260216000000_init_auth_and_storage.sql`:
  - `user_role` enum (admin, user, supervisor)
  - `profiles` table with RLS policies
  - `handle_new_user()` trigger
  - Avatars storage bucket with policies

### Sprint 1: Authentication System

**Deliverables:**
- [x] `AuthProvider` context (`context/auth.tsx`)
  - Session and user state management
  - `signIn()` with online/offline branching via NetInfo
  - `signOut()` with network-aware cleanup
  - `signInBiometric()` via expo-local-authentication
  - `fetchProfile()` with cache-first, network-refresh strategy
  - Auth state change listener
- [x] `ThemeProvider` context (`context/theme.tsx`)
  - Light/dark/system preference
  - AsyncStorage persistence
  - Web body background color sync
- [x] `ToastProvider` context (`context/toast.tsx`)
  - Animated spring entrance/exit
  - Three types: success, error, info
  - Auto-dismiss after 3 seconds

**Screens:**
- [x] Login screen (`app/(auth)/login.tsx`)
  - Email/password form with validation
  - Biometric authentication button
  - Saved email pre-fill from SecureStore
  - Haptic feedback on success/error
- [x] Registration screen (`app/(auth)/register.tsx`)
  - Full name, email, password fields
  - Medical staff toggle with role selection
  - 6-character facility code validation (real-time)
  - Role buttons: Midwife, Nurse, Student, Supervisor
- [x] Forgot password screen (`app/(auth)/forgot-password.tsx`)
- [x] Reset password screen (`app/(auth)/reset-password.tsx`)

**Platform Services:**
- [x] `lib/security.native.ts` — SecureStore + biometrics + SHA-256 hashing
- [x] `lib/security.ts` — Web fallback with localStorage
- [x] `lib/db.native.ts` — SQLite profile cache (motivaid_offline_v2.db)
- [x] `lib/db.ts` — Web no-op stubs

### Sprint 2: Core Infrastructure

**Deliverables:**
- [x] Route protection in `app/_layout.tsx` (`RootLayoutNav`)
  - Redirect unauthenticated users to login
  - Redirect authenticated users away from auth screens
- [x] Provider hierarchy: `ThemeProvider -> ToastProvider -> AuthProvider -> UnitProvider -> RootLayoutNav`
- [x] Animated splash screen (`app/index.tsx`) with logo fade-in and redirect
- [x] Settings screen (`app/(app)/(tabs)/settings.tsx`)
  - Theme selection (Light/Dark/System) with radio buttons
  - Profile link navigation
  - Sign out with haptic feedback
- [x] Profile screen (`app/(app)/profile.tsx`)
  - Edit username, full name, website
  - Avatar upload via `expo-image-picker` + Supabase Storage
- [x] Shared components: `ThemedText`, `ThemedView`, `Avatar`, `IconSymbol`, `HapticTab`
- [x] Color system in `constants/theme.ts` (light/dark variants + platform font stacks)

---

## Phase 2: Facility & Unit Hierarchy (Sprints 3-4) - COMPLETE

### Sprint 3: Organizational Structure

**Database:**
- [x] Migration `20260216000001_expand_roles_and_org.sql`:
  - Added `student` and `nurse` to `user_role` enum
  - `facilities` table (id, name, location)
  - `units` table (id, facility_id, name, description)
  - `unit_memberships` table (profile_id, unit_id, status, role_in_unit)
  - RLS policies for all new tables

**Deliverables:**
- [x] `UnitProvider` context (`context/unit.tsx`)
  - Fetch units from Supabase with facility name joins
  - Role-based filtering (staff see only approved units)
  - Active unit persistence to AsyncStorage
  - Auto-restore active unit on load
- [x] `UnitSelector` component (`components/unit-selector.tsx`)
  - Displays active unit (facility name + unit name)
  - Modal picker for switching units
  - Haptic feedback on selection
  - Checkmark on active unit

### Sprint 4: Role-Based Dashboards & Approvals

**Database:**
- [x] Migration `20260216000002_role_specific_codes.sql`:
  - `facility_codes` table (facility_id, role, code)
  - Unique constraints on (facility_id, role) and (code)
  - Index for fast code lookup

**Deliverables:**
- [x] Home screen (`app/(app)/(tabs)/index.tsx`) with role-based dashboards:
  - `AdminDashboard` — Global stats, system admin actions
  - `SupervisorDashboard` — Unit adherence, pending approvals alert, management actions
  - `StaffDashboard` — Shift overview, clinical mode entry, training progress
  - `UserDashboard` — Simplified clinical mode entry
- [x] Approvals screen (`app/(app)/approvals.tsx`)
  - FlatList of pending unit_memberships with profile info
  - Approve/reject buttons with haptic feedback
  - Pull-to-refresh
  - Empty state when no pending requests
- [x] Offline indicator badge on home screen header
- [x] Identity information card on home screen

---

## Phase 3: Risk Assessment & Clinical Data (Sprints 5-6) - PLANNED

### Sprint 5: Maternal Data Entry

**Database (Planned):**
- `maternal_profiles` table (age, parity, risk factors, blood type, etc.)
- `vital_signs` table (heart_rate, systolic_bp, diastolic_bp, shock_index, etc.)

**Deliverables (Planned):**
- [ ] Maternal risk factor form screen
- [ ] Risk scoring algorithm (low/medium/high/critical)
- [ ] Preparedness recommendations based on risk level
- [ ] Form validation with clinical constraints

### Sprint 6: Vital Signs & Monitoring

**Deliverables (Planned):**
- [ ] Vital signs entry pad (heart rate, blood pressure)
- [ ] Shock index auto-calculation (HR / systolic BP)
- [ ] Threshold-based visual alerts (color coding)
- [ ] Blood loss estimation guides (visual references)
- [ ] Offline storage for vital signs data in SQLite

---

## Phase 4: Active Clinical Mode (Sprints 7-8) - PLANNED

### Sprint 7: E-MOTIVE Workflow

**Database (Planned):**
- `pph_cases` table (status, delivery_time, outcome, etc.)
- `interventions` table (type, dosage, timing, completed_by, etc.)

**Deliverables (Planned):**
- [ ] Clinical mode activation screen
- [ ] PPH monitoring timer (1-hour countdown)
- [ ] E-MOTIVE step-by-step checklist with interventions:
  - Early Detection
  - Massage (Uterine)
  - Oxytocics
  - Tranexamic Acid
  - IV Fluids
  - Examination
  - Escalation
- [ ] Intervention logging with timestamps
- [ ] Case timeline view

### Sprint 8: Offline Clinical Mode

**Deliverables (Planned):**
- [ ] Complete clinical workflow in SQLite
- [ ] Offline case creation and management
- [ ] Offline vital signs and intervention logging
- [ ] Sync queue for background data upload
- [ ] Conflict resolution strategy implementation

---

## Phase 5: Alerts, Escalation & Reports (Sprint 9) - PLANNED

### Sprint 9: Notifications & Reporting

**Database (Planned):**
- `emergency_contacts` table
- `audit_logs` table

**Deliverables (Planned):**
- [ ] Visual and haptic alert system for clinical thresholds
- [ ] One-tap emergency escalation button
- [ ] 3-level escalation hierarchy (unit -> facility -> external)
- [ ] SMS/in-app notification to emergency contacts
- [ ] PPH case report generation
- [ ] Supervisor unit reports with E-MOTIVE adherence metrics
- [ ] Export functionality (PDF/CSV)

---

## Phase 6: Training, Polish & Deployment (Sprint 10) - PLANNED

### Sprint 10: Training Module & Release

**Database (Planned):**
- `training_sessions` table
- `quiz_results` table

**Deliverables (Planned):**
- [ ] Simulated PPH scenarios (practice mode)
- [ ] MCQ quiz assessments
- [ ] Training progress tracking
- [ ] Interactive case studies
- [ ] QA testing and bug fixes
- [ ] Production Supabase deployment
- [ ] App store submissions (Google Play, App Store)
- [ ] User documentation and onboarding materials

---

## Project Structure

```
app/
├── _layout.tsx                      # Root layout, providers, route protection
├── index.tsx                        # Splash screen
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (app)/
│   ├── _layout.tsx
│   ├── profile.tsx
│   ├── approvals.tsx
│   ├── modal.tsx
│   ├── clinical/                    # Phase 3-4 (planned)
│   │   ├── index.tsx
│   │   ├── risk-assessment.tsx
│   │   ├── vital-signs.tsx
│   │   ├── emotive-checklist.tsx
│   │   └── case-report.tsx
│   ├── training/                    # Phase 6 (planned)
│   │   ├── index.tsx
│   │   ├── scenario.tsx
│   │   └── quiz.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx                # Home (role-based dashboard)
│       └── settings.tsx
context/
├── auth.tsx
├── theme.tsx
├── toast.tsx
├── unit.tsx
├── clinical.tsx                     # Phase 4 (planned)
└── sync.tsx                         # Phase 4 (planned)
lib/
├── supabase.ts
├── db.native.ts / db.ts
├── security.native.ts / security.ts
├── risk-calculator.ts               # Phase 3 (planned)
└── sync-queue.ts                    # Phase 4 (planned)
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~54.0.33 | Core framework |
| `react` | 19.1.0 | UI library |
| `react-native` | 0.81.5 | Native runtime |
| `expo-router` | ~6.0.23 | File-based routing |
| `@supabase/supabase-js` | ^2.95.3 | Backend client |
| `expo-sqlite` | ^16.0.10 | Offline database |
| `expo-secure-store` | ^15.0.8 | Encrypted storage |
| `expo-local-authentication` | ^17.0.8 | Biometrics |
| `expo-crypto` | ^15.0.8 | SHA-256 hashing |
| `expo-image-picker` | ^17.0.10 | Avatar upload |
| `expo-haptics` | ~15.0.8 | Tactile feedback |
| `@react-native-community/netinfo` | ^12.0.1 | Network detection |
| `@react-native-async-storage/async-storage` | ^2.2.0 | Preference storage |
| `react-native-reanimated` | ~4.1.1 | Animations |
| `typescript` | ~5.9.2 | Type safety |

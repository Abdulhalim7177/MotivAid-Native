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
  - Variable-length facility code validation (debounced, real-time)
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

### Sprint 4a: Role-Based Dashboards & Approvals

**Database:**
- [x] Migration `20260216000002_role_specific_codes.sql`:
  - `facility_codes` table (facility_id, role, code)
  - Unique constraints on (facility_id, role) and (code)
  - Index for fast code lookup

**Deliverables:**
- [x] Home screen (`app/(app)/(tabs)/index.tsx`) with role-based dashboards:
  - `AdminDashboard` — Global stats (facilities, staff, units, pending), quick action nav cards
  - `SupervisorDashboard` — Unit adherence, pending approvals alert, icon-based management grid (Units, Team, Analytics, Schedule, Reports, Settings, Identity Info)
  - `StaffDashboard` — Shift overview, icon-based quick actions (New Case, Training, My Patients, Schedule, Protocols, Reports), training progress bar
  - `UserDashboard` — Simplified clinical mode entry
- [x] Approvals screen (`app/(app)/approvals.tsx`)
  - FlatList of pending unit_memberships with profile info
  - Approve/reject buttons with haptic feedback
  - Pull-to-refresh
  - Empty state when no pending requests
- [x] Offline indicator badge on home screen header
- [x] Identity information card on home screen

### Sprint 4b: Facility & Unit Management

**Database:**
- [x] Migration `20260216000003_add_facility_to_profiles.sql`:
  - Added `facility_id` column to `profiles` table
  - Updated `handle_new_user()` trigger to assign `facility_id` during registration
- [x] Migration `20260216000004_management_rls.sql`:
  - RLS policies for facility/unit/code CRUD operations by admin and supervisor roles
- [x] Migration `20260218000000_facility_code_activation.sql`:
  - Added `is_active` column to `facility_codes` table
  - Updated `handle_new_user()` trigger to only accept active codes
  - Enhanced `auto_generate_facility_codes()` with acronym-based code format

**Deliverables:**
- [x] Facilities management screen (`app/(app)/facilities.tsx`)
  - Create, edit, delete facilities
  - Auto-generate registration codes using facility name acronyms (e.g., `AKTH1-SUP`)
  - View facility details with all codes in a modal
  - Activate/deactivate individual codes with visual feedback (dimmed + strikethrough for inactive)
  - Close buttons on all modals
- [x] Units management screen (`app/(app)/units.tsx`)
  - Create, edit, delete units within facilities
  - Description and metadata fields
- [x] Updated registration screen (`app/(auth)/register.tsx`)
  - Variable-length code input (up to 12 chars) with character filter (A-Z, 0-9, hyphens)
  - Debounced validation (500ms after typing stops, at 4+ chars)
  - Placeholder shows example format: `e.g. AKTH1-SUP`
  - Deactivated code detection: "This code has been deactivated"
- [x] Dashboard UI components:
  - `ActionItem` — Animated icon-based action card with press effect
  - `StatBox` — Compact stat display
  - `SectionHeader` — Section title with optional variant
  - `DashboardHeader` — Page header with avatar and greeting
  - `AwaitingAssignment` — Empty state for unassigned staff
  - `Skeleton` — Loading placeholder component
  - `Card`, `Button`, `Input`, `ScreenContainer` — Reusable UI primitives

---

## Phase 3: Risk Assessment & Clinical Mode (Sprints 5-6) - COMPLETE

### Sprint 5: Maternal Data Entry & Risk Assessment

**Database:**
- [x] Migration `20260220000000_clinical_data_tables.sql`:
  - `maternal_profiles` table (age, parity, gravida, blood type, weight, hemoglobin, 13 risk factors, status, risk_level)
  - `vital_signs` table (heart_rate, systolic_bp, diastolic_bp, temperature, respiratory_rate, spo2, estimated_blood_loss, blood_loss_method)
  - `sync_queue` table (table_name, record_id, operation, payload, retry logic)
  - RLS policies for facility-scoped access
  - `updated_at` trigger on maternal_profiles

**Deliverables:**
- [x] New patient form (`app/(app)/clinical/new-patient.tsx`)
  - Obstetric data: age, gravida, parity, gestational age, blood type, weight, hemoglobin
  - 13 toggleable risk factor switches grouped by severity tier
  - Live risk banner with color-coded level (Low/Medium/High/Critical)
  - Patient ID auto-generation
- [x] Risk scoring algorithm (`lib/risk-calculator.ts`)
  - AWHONN-adapted scoring: 13 factors weighted by severity
  - Output: Low (0-1), Medium (2-3), High (4-5), Critical (6+)
- [x] Clinical tab (`app/(app)/(tabs)/clinical.tsx`)
  - Case list with status filter chips (Pre-Delivery/Active/Monitoring/Closed)
  - Supervisor cross-unit view with unit filter
  - Pull-to-refresh, sync button, new case FAB
- [x] Clinical context provider (`context/clinical.tsx`)
  - Profiles, vitals, E-MOTIVE checklist state management
  - CRUD operations with sync queue integration
- [x] Clinical database layer:
  - `lib/clinical-db.native.ts` — SQLite tables + full CRUD (native)
  - `lib/clinical-db.ts` — localStorage fallback with identical API (web)
- [x] Sync queue engine (`lib/sync-queue.ts`)
  - Background upload with local_id → remote_id resolution
  - Retry logic (max 3 attempts per item)

### Sprint 6: Vital Signs, Shock Index & E-MOTIVE Bundle

**Database:**
- [x] Migration `20260222000000_emotive_checklists.sql`:
  - `emotive_checklists` table (6 step groups with done/time/dose/notes)
  - Indexes on maternal_profile_id and local_id
  - RLS policies mirroring vital_signs
  - `updated_at` trigger

**Deliverables:**
- [x] Record vitals screen (`app/(app)/clinical/record-vitals.tsx`)
  - Quick-entry pad: HR, SpO2, systolic/diastolic BP, temperature, respiratory rate
  - Blood loss estimation: numeric input + quick-add buttons (+100/+250/+500/+1000 mL) + reset
  - Blood loss method selector: Visual, Drape, Weighed
  - Blood loss severity assessment banner
- [x] Shock Index calculation (`lib/shock-index.ts`)
  - Live SI = HR / SBP
  - 5-level severity: Normal (≤0.7), Warning (0.7-0.9), Alert (0.9-1.0), Critical (1.0-1.4), Emergency (>1.4)
  - Color-coded banner with haptic alerts on critical/emergency
  - Pulse animation on critical values
- [x] E-MOTIVE checklist (`components/clinical/emotive-checklist.tsx`)
  - 6 interactive steps: Early Detection, Massage, Oxytocin, TXA, IV Fluids, Escalation
  - 60-minute elapsed timer anchored to earliest step timestamp
  - Accordion UX: one step expanded at a time
  - Auto-timestamps, dose/volume input fields, notes per step
  - "Done" button when all complete → close case modal with outcome selection
- [x] Patient detail screen (`app/(app)/clinical/patient-detail.tsx`)
  - Metrics cards: latest Shock Index + latest Blood Loss
  - Quick actions: Record Vitals, E-MOTIVE Bundle
  - Case lifecycle: Pre-Delivery → Active → Monitoring → Closed
  - Cross-platform close modal (replaces Alert.alert)
- [x] Vitals prompt banner (`components/clinical/vitals-prompt-banner.tsx`)
  - Animated slide-in/pulse reminder when vitals are overdue
  - Haptic warning notification
- [x] Cross-platform compatibility
  - All `Alert.alert()` calls replaced with `<Modal>` or `showToast()` across entire codebase

---

## Phase 4: Case Timeline, Alerts & Escalation (Sprints 7-8) - PLANNED (Next)

### Sprint 7: Timeline & Alerts

**Database (Planned):**
- `emergency_contacts` table (unit/facility contacts with tiers)
- `audit_logs` table (action audit trail)

**Deliverables (Planned):**
- [ ] Case timeline view — chronological event list per case
- [ ] Configurable alert thresholds for SI and blood loss
- [ ] One-tap emergency escalation button
- [ ] 3-level escalation hierarchy (unit → facility → external)
- [ ] Emergency contacts management screen

### Sprint 8: Reports & Audit

**Deliverables (Planned):**
- [ ] PPH case report generation from timeline data
- [ ] Supervisor unit reports with E-MOTIVE adherence metrics
- [ ] PDF export capability
- [ ] Audit logging for clinical actions and status changes

---

## Phase 5: Training & Simulation (Sprint 9) - PLANNED

### Sprint 9: Training Mode

**Deliverables (Planned):**
- [ ] Simulated PPH scenarios (no real patient data affected)
- [ ] MCQ knowledge assessments with auto-scoring
- [ ] Interactive decision tree case studies
- [ ] Performance tracking per user
- [ ] Training dashboard with completion metrics

---

## Phase 6: Polish & Deployment (Sprint 10) - PLANNED

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
│   ├── facilities.tsx               # Facility CRUD with code management
│   ├── units.tsx                    # Unit CRUD within facilities
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
│       ├── profile.tsx              # Profile (tab)
│       └── settings.tsx
components/
├── dashboard/
│   ├── action-item.tsx              # Animated icon action card
│   ├── admin-dashboard.tsx
│   ├── supervisor-dashboard.tsx
│   ├── staff-dashboard.tsx
│   ├── user-dashboard.tsx
│   ├── dashboard-header.tsx
│   ├── stat-box.tsx
│   └── awaiting-assignment.tsx
├── ui/
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── icon-symbol.tsx / .ios.tsx
│   ├── section-header.tsx
│   ├── screen-container.tsx
│   └── skeleton.tsx
├── avatar.tsx
├── themed-text.tsx
├── themed-view.tsx
├── unit-selector.tsx
└── haptic-tab.tsx
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
supabase/
├── migrations/                      # 6 migration files
└── seed.sql                         # Seed data for 4 facilities
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

# MotivAid - Implementation Roadmap (React Native Expo)

## Overview

This roadmap provides a **sprint-by-sprint implementation plan** for building MotivAid with a **unit-based architecture** using React Native Expo. The implementation follows an incremental approach, focusing first on core authentication and user/supervisor mobile interfaces, with the administrator panel deferred to a Next.js web application.

> [!IMPORTANT]
> This is a **fresh start** implementation using local Supabase CLI (`npx supabase`). All database migrations will be created from scratch.

---

## Project Timeline

**Total Duration:** 14-16 weeks (7-8 two-week sprints)

**Focus Areas:**
1. ✅ Foundation & Database Setup
2. ✅ Authentication & User Management
3. ✅ User (Midwife) Mobile Interface
4. ✅ Supervisor Mobile Interface
5. ✅ Clinical Features
6. ✅ Offline Sync & Polish

---

## Technology Stack

### Mobile App (React Native Expo)
```json
dependencies:
  # Framework
  expo: ~50.0.0
  react: 18.2.0
  react-native: 0.73.0

  # Navigation
  @react-navigation/native: ^6.1.0
  @react-navigation/stack: ^6.3.0
  @react-navigation/bottom-tabs: ^6.5.0

  # State Management
  zustand: ^4.4.0
  @react-native-async-storage/async-storage: ^1.21.0

  # Backend
  @supabase/supabase-js: ^2.39.0

  # Local Storage
  react-native-sqlite-storage: ^6.0.1

  # Utilities
  react-hook-form: ^7.48.0
  react-native-vector-icons: ^10.0.0
  expo-file-system: ~16.0.0
  expo-sharing: ~11.0.0
  react-native-safe-area-context: 4.8.2
  react-native-screens: ~3.27.0
```

  # Code Generation
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0

dev_dependencies:
  # Code Generation
  build_runner: ^2.4.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
  riverpod_generator: ^2.3.0

  # Testing
  mocktail: ^1.0.0
```

### Backend (Supabase)
- **Database:** PostgreSQL 14+ (local via Supabase CLI)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (avatars, reports, certifications)
- **Edge Functions:** Deno-based serverless functions
- **Real-time:** WebSocket subscriptions

---

## Sprint Breakdown

### Sprint 0: Setup & Database Foundation (Week 1)

#### Goals
- Initialize Supabase locally
- Create database schema with migrations
- Set up Flutter project structure
- Configure development environment

#### Tasks

**Database Setup**
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Initialize Supabase project: `npx supabase init`
- [ ] Start local Supabase: `npx supabase start`
- [ ] Create migration files for database schema
- [ ] Apply migrations: `npx supabase migration up`

**React Native Expo Project Setup**
- [ ] Initialize Expo project: `npx create-expo-app MotivAid --template`
- [ ] Install all dependencies from package.json
- [ ] Create folder structure (see Architecture section)
- [ ] Configure Supabase connection (environment variables)
- [ ] Set up development environment

**Database Migrations**

build incrementaly when you reach each sprint Create the following migration files for the sprint you are working on in `supabase/migrations/`:

1. **`20260126000001_create_facilities.sql`**
   - Create facilities table
   - Add RLS policies

2. **`20260126000002_create_units.sql`**
   - Create units table with facility relationship
   - Add metadata columns
   - Add RLS policies

3. **`20260126000003_create_profiles.sql`**
   - Create profiles table (replaces users)
   - Add avatar, bio, certifications columns
   - Add role column
   - Add RLS policies

4. **`20260126000004_create_unit_memberships.sql`**
   - Create many-to-many relationship table
   - Link profiles to units
   - Add approval status

5. **`20260126000005_create_pph_tables.sql`**
   - maternal_profiles
   - pph_cases
   - interventions
   - vital_signs

6. **`20260126000006_create_emergency_contacts.sql`**
   - Emergency contacts for units and facilities

7. **`20260126000007_create_training_tables.sql`**
   - training_sessions
   - quiz_results

8. **`20260126000008_create_audit_logs.sql`**
   - Audit logging table

9. **`20260126000009_create_rls_policies.sql`**
   - Comprehensive RLS policies for all tables

10. **`20260126000010_create_functions.sql`**
    - Helper functions (risk calculation, etc.)

#### Deliverables
- ✅ Working local Supabase instance
- ✅ Complete database schema with migrations
- ✅ React Native Expo project with proper structure
- ✅ Supabase connection configured

---

### Sprint 1: Authentication & Profile System (Weeks 2-3)

#### Goals
- Implement self-registration flow
- Build login/logout functionality
- Create profile management
- Implement supervisor approval system

#### Features

**1.1 Self-Registration Screen**
```dart
// features/auth/presentation/screens/register_screen.dart
```
- [x] Registration form UI
  - [x] Email & password fields
  - [x] Full name, phone number
  - [x] Facility selection dropdown (fetch from Supabase)
  - [x] Unit selection (filtered by facility)
  - [x] Avatar upload (optional)
  - [x] Bio text area
  - [x] Certifications upload (PDF/image support)
- [x] Form validation
- [x] Submit registration (creates pending profile)
- [x] Success message with "Awaiting Approval" status

**1.2 Login Screen**
```dart
// features/auth/presentation/screens/login_screen.dart
```
- [x] Email & password login
- [x] "Remember me" checkbox
- [x] Forgot password link
- [x] Navigate to registration
- [x] Handle authentication states:
  - [x] Pending approval (show message)
  - [x] Approved (navigate to dashboard)
  - [x] Rejected (show reason, allow re-registration)

**1.3 Profile Management**
```dart
// features/profile/presentation/screens/profile_screen.dart
```
- [x] View current profile
- [x] Edit profile information
- [x] Upload/change avatar
- [x] Update bio and certifications
- [x] Request to join additional units
- [x] View current unit memberships
- [x] Logout functionality

**1.4 Supervisor Approval Flow**
```dart
// features/admin/presentation/screens/approval_screen.dart
```
- [x] List pending registration requests
- [x] View user details (profile, certifications)
- [x] Approve with unit assignment
- [x] Reject with reason
- [x] Send notification to user

#### Backend Work
- [x] Supabase Auth integration
- [x] Profile creation on registration
- [x] Approval status tracking
- [x] RLS policies for profiles
- [x] Storage bucket for avatars and certifications

#### Deliverables
- ✅ Working registration and login
- ✅ Profile management for all users
- ✅ Supervisor approval system
- ✅ Avatar and certification upload

---

### Sprint 2: Core Navigation & Dashboards (Weeks 4-5)

#### Goals
- Implement role-based navigation
- Build midwife dashboard
- Build supervisor dashboard
- Create unit selection mechanism

#### Features

**2.1 Navigation Structure**
```dart
// core/navigation/app_router.dart (using go_router)
```
- [x] Role-based routing
- [x] Bottom navigation for midwives
- [x] Drawer navigation for supervisors
- [x] Unit selector widget (dropdown)
- [x] Protected routes with auth guard

**2.2 Midwife Dashboard**
```dart
// features/dashboard/presentation/screens/midwife_dashboard_screen.dart
```
- [x] Welcome header with user info
- [x] Facility and active unit display
- [x] Unit selector dropdown
- [x] Quick action cards:
  - [x] Clinical Mode
  - [x] Training Mode
- [x] Recent cases widget (last 5)
- [x] My units section
- [x] Sync status indicator
- [x] Profile quick access

**2.3 Supervisor Dashboard**
```dart
// features/dashboard/presentation/screens/supervisor_dashboard_screen.dart
```
- [x] Welcome header with supervisor role
- [x] Unit selector dropdown (multi-unit support)
- [x] Unit metrics cards:
  - [x] Active cases count
  - [x] Total cases this week
  - [x] E-MOTIVE adherence percentage
  - [x] Average response time
  - [x] Team member count
- [x] Pending approvals badge and list
- [x] Quick navigation buttons:
  - [x] Cases
  - [x] Team
  - [x] Stats
  - [x] Units
- [x] All managed units list with metrics

**2.4 Unit Selection System**
```dart
// shared/widgets/unit_selector.dart
```
- [x] Dropdown showing user's units
- [x] Current unit highlighting
- [x] Switch unit functionality
- [x] Update global state on selection
- [x] Persist selection locally

#### State Management
- [x] Auth provider (current user, role)
- [x] Unit provider (current unit, user's units)
- [x] Dashboard providers (metrics, cases)

#### Deliverables
- ✅ Complete navigation system
- ✅ Midwife dashboard with unit selection
- ✅ Supervisor dashboard with multi-unit support
- ✅ Reusable unit selector widget

---

### Sprint 3: Unit Management (Weeks 6-7)

#### Goals
- Implement unit CRUD operations
- Build team management for supervisors
- Configure unit settings and metadata

#### Features

**3.1 Unit Management Screen (Supervisor)**
```dart
// features/units/presentation/screens/unit_management_screen.dart
```
- [x] List all managed units
- [x] Create new unit
  - [x] Unit name input
  - [x] Facility association
  - [x] Metadata (location, capacity, specialization)
- [x] Edit unit details
  - [x] Rename unit
  - [x] Update metadata
- [x] View unit statistics

**3.2 Team Management (Supervisor)**
```dart
// features/units/presentation/screens/team_management_screen.dart
```
- [x] List all team members in unit
- [x] Filter by role (midwife, supervisor)
- [x] View member profiles
- [x] Add existing users to unit
- [x] Remove users from unit
- [x] Pending membership requests

**3.3 Emergency Contacts Management**
```dart
// features/units/presentation/screens/emergency_contacts_screen.dart
```
- [x] List unit emergency contacts
- [x] Add new contact (name, role, phone)
- [x] Edit contact details
- [x] Delete contact
- [x] Set contact priority/order
- [x] View facility-level contacts (read-only for supervisors)

#### Backend Work
- [x] Units CRUD API
- [x] Unit memberships API
- [x] Emergency contacts API
- [x] RLS policies for supervisor access

#### Deliverables
- ✅ Unit creation and management
- ✅ Team member management
- ✅ Emergency contacts system
- ✅ Supervisor can manage multiple units

---

### Sprint 4: Clinical Mode - Risk Assessment (Weeks 8-9)

#### Goals
- Build maternal risk assessment flow
- Implement risk calculation algorithm
- Display preparedness recommendations

#### Features

**4.1 Risk Assessment Screen**
```dart
// features/clinical/presentation/screens/risk_assessment_screen.dart
```
- [ ] Patient identification (optional ID)
- [ ] Maternal data form:
  - [ ] Age (number input with validation)
  - [ ] Parity (number of previous births)
  - [ ] Gestational age (weeks)
  - [ ] Medical history checkboxes:
    - [ ] Anemia
    - [ ] Previous PPH
    - [ ] Multiple pregnancy
    - [ ] Placenta previa
    - [ ] Other risk factors
- [ ] Calculate risk button
- [ ] Display risk profile:
  - [ ] Risk level (low/medium/high/critical) with color coding
  - [ ] Identified risk factors
  - [ ] Preparedness recommendations

**4.2 Risk Calculation Logic**
```dart
// features/clinical/domain/usecases/calculate_risk_usecase.dart
```
- [ ] Risk scoring algorithm based on WHO guidelines
- [ ] Risk level determination
- [ ] Generate recommendations based on risk
- [ ] Save maternal profile to database

**4.3 Preparedness Checklist**
```dart
// features/clinical/presentation/widgets/preparedness_widget.dart
```
- [ ] Display recommended preparations:
  - IV access ready
  - Uterotonics available
  - Blood type known
  - Emergency contacts notified
- [ ] Checklist UI for midwife confirmation

#### Backend Work
- [ ] Maternal profiles table integration
- [ ] Risk calculation edge function (optional)
- [ ] Link maternal profile to case

#### Deliverables
- ✅ Risk assessment form
- ✅ Risk calculation algorithm
- ✅ Preparedness recommendations
- ✅ Maternal profile creation

---

### Sprint 5: Clinical Mode - E-MOTIVE Checklist (Weeks 10-11)

#### Goals
- Implement E-MOTIVE step-by-step workflow
- Build PPH case management
- Create intervention logging

#### Features

**5.1 Clinical Mode Screen**
```dart
// features/clinical/presentation/screens/clinical_mode_screen.dart
```
- [ ] Start new case from maternal profile
- [ ] Record delivery time
- [ ] PPH monitoring timer (1 hour countdown)
- [ ] Blood loss estimation widget
- [ ] Vital signs quick entry
- [ ] E-MOTIVE checklist display
- [ ] Emergency escalation button

**5.2 E-MOTIVE Checklist**
```dart
// features/clinical/presentation/widgets/emotive_checklist_widget.dart
```
- [ ] Step-by-step checklist:
  1. [ ] **E**arly Detection
     - Blood loss estimation
     - Clinical signs check
  2. [ ] **M**assage (Uterine)
     - Bimanual compression guidance
     - Duration tracking
  3. [ ] **O**xytocics
     - Oxytocin 10 IU IM/IV
     - Alternative: Misoprostol
     - Dosage recording
  4. [ ] **T**ranexamic Acid
     - 1g IV within 3 hours
     - Time tracking
  5. [ ] **I**V Fluids
     - Crystalloids (Ringer's/NS)
     - Volume tracking
  6. [ ] **V**aginal Examination
     - Inspect for tears
     - Check for retained products
  7. [ ] **E**scalation
     - Call for help
     - Prepare referral

- [ ] Each step:
  - Checkbox for completion
  - Timestamp capture
  - Notes field
  - Guidance/instructions display

**5.3 Vital Signs Entry**
```dart
// features/clinical/presentation/screens/vital_signs_screen.dart
```
- [ ] Heart rate input (bpm)
- [ ] Blood pressure (systolic/diastolic)
- [ ] Automatic shock index calculation
- [ ] Temperature
- [ ] Respiratory rate
- [ ] SpO2
- [ ] Vital signs history chart
- [ ] Alert indicators for abnormal values

**5.4 Intervention Logging**
```dart
// features/clinical/domain/entities/intervention.dart
```
- [ ] Automatic logging of E-MOTIVE steps
- [ ] Manual intervention entry
- [ ] Medication dosage and route
- [ ] Timestamp and user tracking

**5.5 Case Timeline**
```dart
// features/clinical/presentation/screens/case_timeline_screen.dart
```
- [ ] Chronological view of all events
- [ ] Interventions with timestamps
- [ ] Vital signs snapshots
- [ ] Clinical notes

#### Backend Work
- [ ] PPH cases CRUD
- [ ] Interventions logging
- [ ] Vital signs recording
- [ ] Case timeline generation

#### Deliverables
- ✅ Complete E-MOTIVE workflow
- ✅ Vital signs tracking with shock index
- ✅ Intervention logging
- ✅ Case timeline visualization

---

### Sprint 6: Alerts & Case Management (Week 12)

#### Goals
- Implement clinical alerts
- Build emergency escalation
- Create case closure workflow

#### Features

**6.1 Clinical Alerts System**
```dart
// features/clinical/presentation/widgets/alert_banner_widget.dart
```
- [ ] Alert triggers:
  - [ ] Blood loss >500ml (warning)
  - [ ] Blood loss >1000ml (critical)
  - [ ] Shock index >1.0 (warning)
  - [ ] Shock index >1.4 (critical)
  - [ ] No improvement after 2 E-MOTIVE steps
- [ ] Visual alerts (color-coded banners)
- [ ] Audio alerts (beeping for critical)
- [ ] Persistent notification

**6.2 Emergency Escalation**
```dart
// features/clinical/presentation/screens/escalation_screen.dart
```
- [ ] One-tap emergency button
- [ ] Emergency contacts list display:
  - [ ] Unit contacts
  - [ ] Facility contacts
- [ ] One-tap call functionality
- [ ] SMS notification (optional - requires service)
- [ ] Log escalation in case timeline

**6.3 Case Closure**
```dart
// features/clinical/presentation/screens/case_closure_screen.dart
```
- [ ] Outcome selection:
  - Resolved
  - Referred
  - Maternal death
- [ ] Final vital signs entry
- [ ] Total blood loss summary
- [ ] Clinical notes
- [ ] Case duration
- [ ] E-MOTIVE adherence score
- [ ] Generate case report

**6.4 Case Reports (View)**
```dart
// features/reports/presentation/screens/case_report_screen.dart
```
- [ ] Case summary
- [ ] Maternal risk profile
- [ ] Timeline of interventions
- [ ] Vital signs trend chart
- [ ] Outcome and notes
- [ ] E-MOTIVE checklist completion
- [ ] Export as PDF (future)

#### Deliverables
- ✅ Clinical alerts system
- ✅ Emergency escalation
- ✅ Case closure workflow
- ✅ Case report viewing

---

### Sprint 7: Training Mode (Week 13)

#### Goals
- Implement training scenarios
- Build quiz system
- Track training progress

#### Features

**7.1 Training Home Screen**
```dart
// features/training/presentation/screens/training_home_screen.dart
```
- [ ] List available scenarios
- [ ] Scenario categories (beginner, intermediate, advanced)
- [ ] Quiz modules
- [ ] Training progress overview

**7.2 Scenario Simulation**
```dart
// features/training/presentation/screens/scenario_screen.dart
```
- [ ] Simulated PPH case
- [ ] E-MOTIVE checklist practice
- [ ] Decision points with feedback
- [ ] Timer simulation
- [ ] Score calculation
- [ ] Performance feedback

**7.3 Quiz Module**
```dart
// features/training/presentation/screens/quiz_screen.dart
```
- [ ] Multiple choice questions
- [ ] Answer submission
- [ ] Immediate feedback
- [ ] Score display
- [ ] Correct answer explanations

**7.4 Training Progress**
```dart
// features/training/presentation/screens/progress_screen.dart
```
- [ ] Completed scenarios list
- [ ] Quiz scores history
- [ ] Average performance
- [ ] Training certificates (future)

#### Backend Work
- [ ] Training sessions tracking
- [ ] Quiz results storage
- [ ] Scenario data structure

#### Deliverables
- ✅ Training scenarios
- ✅ Quiz system
- ✅ Progress tracking

---

### Sprint 8: Supervisor Reports & Analytics (Week 14)

#### Goals
- Build supervisor reporting dashboard
- Implement unit analytics
- Cross-unit comparison

#### Features

**8.1 Unit Analytics Screen**
```dart
// features/reports/presentation/screens/unit_analytics_screen.dart
```
- [ ] Date range selector
- [ ] Key metrics:
  - [ ] Total cases
  - [ ] E-MOTIVE adherence rate
  - [ ] Average response time
  - [ ] Outcome distribution (pie chart)
  - [ ] Blood loss averages
- [ ] Trend charts (cases over time)
- [ ] Team performance table

**8.2 Cases List (Supervisor)**
```dart
// features/reports/presentation/screens/unit_cases_screen.dart
```
- [ ] List all cases in unit
- [ ] Filter by date range
- [ ] Filter by outcome
- [ ] Filter by midwife
- [ ] Sort options
- [ ] Tap to view case details
- [ ] Export functionality

**8.3 Cross-Unit Comparison**
```dart
// features/reports/presentation/screens/cross_unit_screen.dart
```
- [ ] Select multiple units from dropdown
- [ ] Side-by-side metrics comparison
- [ ] Best/worst performers
- [ ] Aggregate statistics
- [ ] Recommendations for improvement

**8.4 Facility-Wide Reports**
```dart
// features/reports/presentation/screens/facility_report_screen.dart
```
- [ ] All units aggregate view
- [ ] Facility-level metrics
- [ ] Cross-facility comparison (if supervisor has access)
- [ ] Export reports

#### Backend Work
- [ ] Analytics queries
- [ ] Aggregate functions
- [ ] Report generation

#### Deliverables
- ✅ Unit analytics dashboard
- ✅ Case list and filtering
- ✅ Cross-unit comparison
- ✅ Facility reports

---

### Sprint 9: Offline Sync & Data Management (Week 15)

#### Goals
- Implement offline-first architecture
- Build sync engine
- Handle conflict resolution

#### Features

**9.1 Local Database Setup**
```dart
// core/storage/local_database.dart (Hive + SQLite)
```
- [ ] Hive boxes for simple data (settings, user profile)
- [ ] SQLite for complex data (cases, interventions, vital signs)
- [ ] Local schema mirrors Supabase schema
- [ ] Encryption for sensitive data

**9.2 Offline Capabilities**
- [ ] All clinical features work offline:
  - [ ] Create cases
  - [ ] Record interventions
  - [ ] Log vital signs
  - [ ] Complete E-MOTIVE checklist
- [ ] Training mode offline
- [ ] Profile viewing offline

**9.3 Sync Engine**
```dart
// core/sync/sync_service.dart
```
- [ ] Detect online/offline status
- [ ] Queue offline actions
- [ ] Background sync when online
- [ ] Sync progress indicator
- [ ] Manual sync trigger
- [ ] Conflict resolution logic:
  - [ ] Last-write-wins for most fields
  - [ ] Server priority for critical fields (status, outcome)
  - [ ] Merge strategy for interventions

**9.4 Sync Status UI**
```dart
// shared/widgets/sync_indicator.dart
```
- [ ] Online/offline indicator
- [ ] Pending sync count
- [ ] Last sync timestamp
- [ ] Sync errors display

#### Backend Work
- [ ] Supabase real-time subscriptions
- [ ] Conflict detection
- [ ] Batch sync endpoints

#### Deliverables
- ✅ Full offline functionality
- ✅ Sync engine with conflict resolution
- ✅ Sync status indicators

---

### Sprint 10: UI Polish & Testing (Week 16)

#### Goals
- Polish UI/UX
- Comprehensive testing
- Performance optimization
- Bug fixes

#### Tasks

**10.1 UI Refinements**
- [ ] Consistent theming across all screens
- [ ] Smooth animations and transitions
- [ ] Loading states for all async operations
- [ ] Error states with retry options
- [ ] Empty states with helpful messages
- [ ] Skeleton loaders
- [ ] Pull-to-refresh on lists

**10.2 Accessibility**
- [ ] Screen reader support (Semantics widgets)
- [ ] Sufficient color contrast
- [ ] Large text support
- [ ] Keyboard navigation
- [ ] Touch target sizes (minimum 48x48)

**10.3 Performance Optimization**
- [ ] Lazy loading for lists
- [ ] Image caching and optimization
- [ ] Minimize rebuilds (Riverpod selectors)
- [ ] Profiling and optimization
- [ ] Memory leak checks

**10.4 Testing**
```
test/
├── unit/
│   ├── features/auth/
│   ├── features/clinical/
│   ├── features/units/
│   └── core/
├── widget/
│   ├── screens/
│   └── widgets/
└── integration/
    └── full_workflow_test.dart
```
- [ ] Unit tests for business logic (80%+ coverage)
- [ ] Widget tests for key screens
- [ ] Integration tests for critical workflows:
  - [ ] Registration → Approval → Login
  - [ ] Risk Assessment → Clinical Mode → Case Closure
  - [ ] Offline creation → Sync
- [ ] Manual testing checklist

**10.5 Documentation**
- [ ] Code documentation (DartDoc comments)
- [ ] API documentation
- [ ] User guide (in-app help)
- [ ] Deployment guide

**10.6 Bug Fixes**
- [ ] Fix all critical bugs
- [ ] Address user feedback from alpha testing
- [ ] Performance bottlenecks

#### Deliverables
- ✅ Polished, production-ready UI
- ✅ Comprehensive test coverage
- ✅ Optimized performance
- ✅ Complete documentation

---

## Project Structure

```
src/
├── App.js                       # App entry point
├── app.json                     # Expo configuration
│
├── core/                        # Core utilities
│   ├── config/
│   │   ├── app_config.js        # Environment config
│   │   └── supabase_config.js   # Supabase setup
│   ├── constants/
│   │   ├── app_constants.js
│   │   ├── colors.js
│   │   └── text_styles.js
│   ├── errors/
│   │   ├── exceptions.js
│   │   └── failures.js
│   ├── navigation/
│   │   └── app_router.js        # React Navigation configuration
│   ├── network/
│   │   ├── network_info.js
│   │   └── connectivity_service.js
│   ├── storage/
│   │   ├── local_database.js    # SQLite + AsyncStorage
│   │   └── secure_storage.js    # React Native Secure Storage
│   ├── sync/
│   │   ├── sync_service.js      # Offline sync engine
│   │   └── sync_queue.js
│   ├── theme/
│   │   ├── app_theme.js
│   │   └── theme_provider.js
│   └── utils/
│       ├── validators.js
│       ├── formatters.js
│       └── date_helpers.js
│
├── features/                    # Feature modules
│   ├── auth/
│   │   ├── data/
│   │   │   ├── models/
│   │   │   │   └── auth_user_model.dart
│   │   │   ├── repositories/
│   │   │   │   └── auth_repository_impl.dart
│   │   │   └── sources/
│   │   │       └── auth_remote_source.dart
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── auth_user.dart
│   │   │   ├── repositories/
│   │   │   │   └── auth_repository.dart
│   │   │   └── usecases/
│   │   │       ├── login_usecase.dart
│   │   │       ├── logout_usecase.dart
│   │   │       └── register_usecase.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── auth_provider.dart
│   │       ├── screens/
│   │       │   ├── login_screen.dart
│   │       │   └── register_screen.dart
│   │       └── widgets/
│   │           ├── login_form.dart
│   │           └── register_form.dart
│   │
│   ├── profile/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       └── screens/
│   │           └── profile_screen.dart
│   │
│   ├── dashboard/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── midwife_dashboard_screen.dart
│   │       │   └── supervisor_dashboard_screen.dart
│   │       └── widgets/
│   │           ├── stats_card.dart
│   │           └── recent_cases_widget.dart
│   │
│   ├── units/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       └── screens/
│   │           ├── unit_management_screen.dart
│   │           ├── team_management_screen.dart
│   │           └── emergency_contacts_screen.dart
│   │
│   ├── clinical/
│   │   ├── data/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── pph_case.dart
│   │   │   │   ├── intervention.dart
│   │   │   │   └── vital_signs.dart
│   │   │   └── usecases/
│   │   │       ├── calculate_risk_usecase.dart
│   │   │       ├── create_case_usecase.dart
│   │   │       └── log_intervention_usecase.dart
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── risk_assessment_screen.dart
│   │       │   ├── clinical_mode_screen.dart
│   │       │   ├── vital_signs_screen.dart
│   │       │   ├── case_timeline_screen.dart
│   │       │   ├── escalation_screen.dart
│   │       │   └── case_closure_screen.dart
│   │       └── widgets/
│   │           ├── emotive_checklist_widget.dart
│   │           ├── vital_signs_input.dart
│   │           ├── timer_widget.dart
│   │           └── alert_banner_widget.dart
│   │
│   ├── training/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       └── screens/
│   │           ├── training_home_screen.dart
│   │           ├── scenario_screen.dart
│   │           ├── quiz_screen.dart
│   │           └── progress_screen.dart
│   │
│   ├── reports/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │       └── screens/
│   │           ├── case_report_screen.dart
│   │           ├── unit_analytics_screen.dart
│   │           ├── unit_cases_screen.dart
│   │           ├── cross_unit_screen.dart
│   │           └── facility_report_screen.dart
│   │
│   └── settings/
│       ├── data/
│       ├── domain/
│       └── presentation/
│           └── screens/
│               └── settings_screen.dart
│
└── shared/                      # Shared components
    ├── models/
    │   ├── facility.dart
    │   ├── unit.dart
    │   └── profile.dart
    ├── widgets/
    │   ├── motivaid_button.dart
    │   ├── motivaid_card.dart
    │   ├── unit_selector.dart
    │   ├── sync_indicator.dart
    │   └── loading_overlay.dart
    ├── providers/
    │   ├── unit_provider.dart
    │   └── connectivity_provider.dart
    └── services/
        ├── notification_service.dart
        └── analytics_service.dart
```

---

## Database Schema Summary

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `facilities` | Healthcare institutions | name, code, type, address, state |
| `units` | Subdivisions within facilities | name, facility_id, metadata (location, capacity, specialization) |
| `profiles` | User profiles (replaces users) | email, role, full_name, phone, avatar_url, bio, certifications_url |
| `unit_memberships` | Many-to-many: profiles ↔ units | profile_id, unit_id, status (pending/approved/rejected), approved_by |
| `maternal_profiles` | Patient risk data | age, parity, risk_level, has_anemia, has_pph_history |
| `pph_cases` | PPH episodes | maternal_profile_id, midwife_id, unit_id, status, outcome, blood_loss_ml |
| `interventions` | E-MOTIVE steps & medications | pph_case_id, type, name, dosage, performed_at |
| `vital_signs` | Patient vitals | pph_case_id, heart_rate, blood_pressure, shock_index |
| `emergency_contacts` | Emergency contacts | unit_id (nullable), facility_id (nullable), name, role, phone |
| `training_sessions` | Training attempts | profile_id, scenario_id, score, is_passed |
| `quiz_results` | Quiz answers | training_session_id, question_id, is_correct |
| `audit_logs` | System audit trail | profile_id, action, entity_type, old_values, new_values |

---

## Row-Level Security (RLS) Policies

### Profiles Table
```sql
-- Users see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Supervisors see profiles in their units
CREATE POLICY "Supervisors see unit members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM unit_memberships um
      JOIN units u ON um.unit_id = u.id
      WHERE um.profile_id = profiles.id
      AND u.id IN (
        SELECT unit_id FROM unit_memberships
        WHERE profile_id = auth.uid() AND status = 'approved'
      )
    )
  );
```

### Units Table
```sql
-- Users see units they belong to
CREATE POLICY "Users see their units" ON units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM unit_memberships
      WHERE unit_id = units.id
      AND profile_id = auth.uid()
      AND status = 'approved'
    )
  );
```

### PPH Cases Table
```sql
-- Midwives see cases in their units
CREATE POLICY "Midwives see unit cases" ON pph_cases
  FOR SELECT USING (
    unit_id IN (
      SELECT unit_id FROM unit_memberships
      WHERE profile_id = auth.uid() AND status = 'approved'
    )
  );

-- Supervisors see cases in units they manage + facility-wide
CREATE POLICY "Supervisors see facility cases" ON pph_cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supervisor'
      AND (
        -- Cases in their units
        pph_cases.unit_id IN (
          SELECT unit_id FROM unit_memberships
          WHERE profile_id = auth.uid()
        )
        OR
        -- Cases in their facility
        pph_cases.facility_id IN (
          SELECT facility_id FROM unit_memberships um
          JOIN units u ON um.unit_id = u.id
          WHERE um.profile_id = auth.uid()
        )
      )
    )
  );
```

---

## Supabase Local Development Workflow

### Initial Setup
```bash
# Install Supabase CLI globally
npm install -g supabase

# Navigate to project directory
cd motivaid

# Initialize Supabase
npx supabase init

# Start local Supabase (Docker required)
npx supabase start
```

### Creating Migrations
```bash
# Create a new migration
npx supabase migration new create_profiles_table

# Edit the migration file in supabase/migrations/
# Example: supabase/migrations/20260126120000_create_profiles_table.sql
```

### Applying Migrations
```bash
# Apply all pending migrations
npx supabase migration up

# Reset database (WARNING: deletes all data)
npx supabase db reset
```

### Testing Locally
```bash
# Access local Supabase Studio
# Open http://localhost:54323 in browser

# Get local connection details
npx supabase status
```

### Connecting React Native Expo App to Local Supabase
```dart
// src/core/config/supabaseConfig.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321'; // Local Supabase URL
const supabaseAnonKey = 'your-local-anon-key'; // Get from `npx supabase status`

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Verification Plan

### Manual Testing Checklist

**Sprint 1: Authentication**
- [x] Self-register as new midwife
- [x] Verify pending status message
- [x] Login as supervisor, approve registration
- [x] Login as midwife again, verify access granted
- [x] Upload avatar and certifications
- [x] Edit profile information

**Sprint 2: Dashboards**
- [x] Login as midwife, verify dashboard displays correctly
- [x] Select different unit from dropdown
- [x] Login as supervisor, verify multi-unit dropdown works
- [x] Check unit metrics display correctly

**Sprint 3: Unit Management**
- [x] Supervisor creates new unit
- [x] Supervisor renames unit
- [x] Supervisor adds midwife to unit
- [x] Verify unit metadata saves correctly

**Sprint 4-5: Clinical Mode**
- [ ] Complete risk assessment for a patient
- [ ] Start clinical case from dashboard
- [ ] Complete all E-MOTIVE steps
- [ ] Record vital signs, verify shock index calculation
- [ ] Verify case timeline displays correctly

**Sprint 6: Alerts**
- [ ] Trigger blood loss alert (>500ml)
- [ ] Trigger shock index alert (>1.0)
- [ ] Test emergency escalation button
- [ ] Close case and verify report generation

**Sprint 7: Training**
- [ ] Complete a training scenario
- [ ] Take a quiz
- [ ] Verify progress tracking

**Sprint 8: Reports**
- [ ] View unit analytics as supervisor
- [ ] Filter cases by date range
- [ ] Compare multiple units
- [ ] Export report (manual verification)

**Sprint 9: Offline**
- [ ] Turn off internet
- [ ] Create case offline
- [ ] Record interventions offline
- [ ] Turn on internet
- [ ] Verify data syncs correctly
- [ ] Test conflict resolution (create conflicting edits)

**Sprint 10: Polish**
- [ ] Test all screens for UI consistency
- [ ] Verify all loading and error states
- [ ] Test on low-end Android device
- [ ] Run performance profiling

### Automated Testing

**Unit Tests**
```bash
# Run all unit tests
jest src/__tests__/unit/

# Run with coverage
jest --coverage
```

**Component Tests**
```bash
# Run all component tests
jest src/__tests__/components/
```

**Integration Tests**
```bash
# Run integration tests
jest src/__tests__/integration/
```

### User Acceptance Testing
- [ ] Beta test with 5-10 midwives
- [ ] Beta test with 2-3 supervisors
- [ ] Collect feedback and iterate
- [ ] Fix critical bugs before production

---

## Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Authentication success rate | >99% | Login/registration analytics |
| Profile approval time | <24 hours | Time between registration and approval |
| Clinical case creation time | <2 minutes | Timer in clinical workflow |
| E-MOTIVE adherence tracking | 100% accuracy | Compare manual logs vs app data |
| Offline functionality | 100% clinical features | Manual testing without internet |
| App response time | <300ms | Performance profiling |
| Sync success rate | >99% | Sync error logs |
| User satisfaction | >4/5 stars | Post-pilot survey |

---

## Risk Mitigation

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| Supabase local setup issues | High | Document setup thoroughly, provide troubleshooting guide |
| Complex RLS policies | High | Test RLS policies extensively, create test users for each role |
| Offline sync conflicts | Medium | Implement robust conflict resolution, prefer server state |
| Low-end device performance | Medium | Test on low-spec devices, optimize early |
| User adoption resistance | Medium | Comprehensive training, simple UX |
| Data loss during sync | High | Implement sync queue with retry mechanism, never delete local data until confirmed synced |

---

## Next Steps

### Immediate Actions
1. ✅ **Review and approve this roadmap**
2. ✅ **Set up development environment**
   - Install Flutter, Supabase CLI, Android Studio
3. ✅ **Initialize Supabase locally**
   - Run `npx supabase init`
   - Start local instance: `npx supabase start`
4. ✅ **Create database migrations**
   - Follow Sprint 0 database setup tasks
5. ✅ **Set up Flutter project structure**
   - Update `pubspec.yaml`
   - Create folder structure

### Communication
- Weekly sprint reviews
- Daily standups (optional)
- Document blockers immediately
- Share progress updates

---

## Future Enhancements (Post-MVP)

### Administrator Panel (Next.js)
- Web-based admin dashboard
- Facility management
- System-wide user management
- Advanced analytics and reporting
- Audit log viewer
- System configuration

### Mobile App Enhancements
- Multi-language support (Hausa, Yoruba, Igbo)
- Voice commands for hands-free operation
- AI-powered risk prediction
- Integration with wearable devices
- Telemedicine support
- Research data export

---

**Document Version:** 2.0
**Last Updated:** 2026-01-26
**Status:** Ready for Implementation
**Estimated Completion:** 16 weeks from start date

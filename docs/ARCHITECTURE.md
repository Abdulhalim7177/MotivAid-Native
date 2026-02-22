# MotivAid - Architecture

## Overview

MotivAid is built with **React Native** via **Expo SDK 54** (managed workflow) using **TypeScript 5.9** in strict mode. It follows an offline-first, context-driven architecture optimized for low-connectivity clinical environments.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.81, React 19 (experimental React Compiler) |
| Routing | Expo Router v6 (file-based, typed routes) |
| State | React Context (5 providers) |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| Local DB | SQLite via `expo-sqlite` |
| Secure Storage | `expo-secure-store` (native), `localStorage` (web) |
| Biometrics | `expo-local-authentication` |
| Styling | React Native StyleSheet, platform-specific shadows |
| New Architecture | Enabled (`newArchEnabled: true`) |

---

## Project Structure

```
MotivAid/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout, provider hierarchy, route protection
│   ├── index.tsx                  # Splash screen, auto-redirects
│   ├── (auth)/                   # Unauthenticated screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # Email/password + biometric login
│   │   ├── register.tsx          # Self-registration with facility codes
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   └── (app)/                    # Authenticated screens
│       ├── _layout.tsx
│       ├── profile.tsx           # Profile editing with avatar upload
│       ├── approvals.tsx         # Supervisor membership approval
│       ├── facilities.tsx        # Facility CRUD (admin/supervisor)
│       ├── units.tsx             # Unit CRUD (admin/supervisor)
│       ├── modal.tsx
│       ├── clinical/             # Clinical mode screens
│       │   ├── new-patient.tsx   # Maternal risk assessment form
│       │   ├── patient-detail.tsx # Patient overview + E-MOTIVE + vitals
│       │   └── record-vitals.tsx # Quick-entry vital signs pad
│       └── (tabs)/               # Bottom tab navigation
│           ├── _layout.tsx
│           ├── index.tsx         # Role-based dashboard (Home)
│           ├── clinical.tsx      # Clinical case list tab
│           ├── profile.tsx       # Profile tab
│           └── settings.tsx      # Theme, account, sign-out
├── context/                      # React Context providers
│   ├── auth.tsx                  # Session, profile, sign-in/out, biometric
│   ├── clinical.tsx              # Maternal profiles, vitals, E-MOTIVE, sync
│   ├── theme.tsx                 # Light/dark/system theme
│   ├── toast.tsx                 # Animated toast notifications
│   └── unit.tsx                  # Active unit selection
├── lib/                          # Core services (platform-split)
│   ├── supabase.ts               # Supabase client with SecureStore adapter
│   ├── db.native.ts              # SQLite profile caching (native)
│   ├── db.ts                     # No-op web fallback
│   ├── clinical-db.native.ts     # Clinical SQLite tables + CRUD (native)
│   ├── clinical-db.ts            # Clinical localStorage fallback (web)
│   ├── risk-calculator.ts        # AWHONN-adapted PPH risk scoring
│   ├── shock-index.ts            # Obstetric Shock Index calculation
│   ├── sync-queue.ts             # Background sync engine (Supabase upload)
│   ├── security.native.ts        # Biometrics + SecureStore credentials (native)
│   └── security.ts               # localStorage fallback (web)
├── components/                   # Shared UI components
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   ├── avatar.tsx                # Avatar with upload capability
│   ├── unit-selector.tsx         # Global unit switcher modal
│   ├── haptic-tab.tsx
│   ├── clinical/                 # Clinical mode components
│   │   ├── emotive-checklist.tsx # Interactive E-MOTIVE bundle card
│   │   └── vitals-prompt-banner.tsx # Animated vitals reminder
│   └── ui/
│       ├── icon-symbol.tsx
│       ├── icon-symbol.ios.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── section-header.tsx
│       ├── screen-container.tsx
│       └── skeleton.tsx
├── hooks/                        # Custom hooks
│   ├── use-color-scheme.ts       # Native color scheme detection
│   ├── use-color-scheme.web.ts   # Web color scheme detection
│   └── use-theme-color.ts        # Themed color lookup
├── constants/
│   └── theme.ts                  # Color palette (light/dark) and font stacks
├── supabase/
│   ├── migrations/               # 8 PostgreSQL migration files
│   └── seed.sql                  # Seed data for 4 facilities with codes
└── assets/                       # Images, fonts, app icons
```

---

## Provider Hierarchy

Defined in `app/_layout.tsx`. The nesting order is significant:

```
AppThemeProvider           ← Theme preference (light/dark/system)
  └── ToastProvider        ← Animated toast notifications
    └── AuthProvider       ← Session, user profile, sign-in/out
      └── UnitProvider     ← Active facility unit selection
        └── ClinicalProvider  ← Maternal profiles, vitals, E-MOTIVE, sync
          └── RootLayoutNav   ← Route protection + navigation
```

Each provider exposes a hook for consumption:

| Provider | Hook | Key Exports |
|----------|------|-------------|
| `ThemeProvider` | `useAppTheme()` | `theme`, `preference`, `setThemePreference` |
| `ToastProvider` | `useToast()` | `showToast(message, type)` |
| `AuthProvider` | `useAuth()` | `session`, `user`, `profile`, `signIn`, `signOut`, `signInBiometric` |
| `UnitProvider` | `useUnits()` | `activeUnit`, `availableUnits`, `setActiveUnit`, `refreshUnits` |
| `ClinicalProvider` | `useClinical()` | `profiles`, `vitals`, `emotiveChecklist`, `recordVitals`, `toggleEmotiveStep`, `createProfile`, `updateProfileStatus`, `syncNow` |

---

## Routing & Navigation

### File-Based Routing (Expo Router v6)

Routes map directly to the `app/` directory structure. The path alias `@/*` maps to the project root.

### Route Groups

| Group | Purpose | Auth Required |
|-------|---------|---------------|
| `(auth)` | Login, register, password recovery | No |
| `(app)` | All authenticated screens | Yes |
| `(app)/(tabs)` | Bottom tab navigation (Home, Clinical, Profile, Settings) | Yes |
| `(app)/clinical` | Clinical mode screens (new patient, patient detail, record vitals) | Yes |

### Route Protection

Lives in `app/_layout.tsx` inside the `RootLayoutNav` component:

- Unauthenticated users accessing `(app)` routes are redirected to `/(auth)/login`
- Authenticated users accessing `(auth)` routes are redirected to `/(app)/(tabs)`
- The splash screen (`index.tsx`) is excluded from redirect logic

---

## Authentication Architecture

### Three Sign-In Paths

All authentication logic lives in `context/auth.tsx`.

```
┌─────────────────────────────────────────────────────────────────┐
│ ONLINE (internet available)                                     │
│ 1. supabase.auth.signInWithPassword(email, password)            │
│ 2. Save SHA-256 credential hash → SecureStore                   │
│ 3. Fetch profile from Supabase → cache to SQLite               │
│ 4. Set isOfflineAuthenticated = true                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ OFFLINE (no internet)                                           │
│ 1. Hash entered credentials with SHA-256                        │
│ 2. Compare against stored hash in SecureStore                   │
│ 3. Load cached profile from SQLite                              │
│ 4. Set isOfflineAuthenticated = true                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ BIOMETRIC (fingerprint / Face ID)                               │
│ 1. expo-local-authentication prompt                             │
│ 2. On success, load most recent cached profile from SQLite      │
│ 3. Set isOfflineAuthenticated = true                            │
└─────────────────────────────────────────────────────────────────┘
```

### Network Detection

Uses `@react-native-community/netinfo` to detect connectivity and choose the online or offline sign-in path dynamically.

---

## Platform-Specific Architecture

The project uses file extension conventions for platform branching:

| Extension | Platform | Purpose |
|-----------|----------|---------|
| `.native.ts` | iOS + Android | SQLite, SecureStore, biometrics |
| `.ts` / `.web.ts` | Web | localStorage fallbacks, no-ops |
| `.ios.tsx` | iOS only | SF Symbol icon rendering |

### Key Platform Pairs

| Native | Web |
|--------|-----|
| `lib/db.native.ts` (SQLite caching) | `lib/db.ts` (no-op stubs) |
| `lib/clinical-db.native.ts` (Clinical SQLite CRUD) | `lib/clinical-db.ts` (localStorage fallback) |
| `lib/security.native.ts` (SecureStore + biometrics) | `lib/security.ts` (localStorage) |
| `hooks/use-color-scheme.ts` | `hooks/use-color-scheme.web.ts` |
| `components/ui/icon-symbol.ios.tsx` | `components/ui/icon-symbol.tsx` |

---

## Role-Based Dashboard System

The Home screen (`app/(app)/(tabs)/index.tsx`) renders a different dashboard component based on the user's `profile.role`:

| Role | Component | Features |
|------|-----------|----------|
| `admin` | `AdminDashboard` | Global statistics, system administration actions |
| `supervisor` | `SupervisorDashboard` | Unit adherence metrics, pending approvals, team management |
| `midwife` / `nurse` / `student` | `StaffDashboard` | Shift overview, clinical mode entry, training progress |
| `user` (default) | `UserDashboard` | Simplified clinical mode entry |

Roles are defined by the `user_role` PostgreSQL enum: `admin`, `user`, `supervisor`, `midwife`, `nurse`, `student`.

---

## Offline Data Layer

### SQLite (Native Only)

**Auth Database:** `motivaid_offline_v2.db`

| Table | Schema | Purpose |
|-------|--------|---------|
| `profile_cache` | `id TEXT PK, profile_data TEXT, user_data TEXT, updated_at DATETIME` | Caches user profile and auth user for offline access |

**Clinical Database:** `motivaid_clinical.db`

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `maternal_profiles_local` | `local_id`, `patient_id`, `age`, `parity`, `gravida`, 13 risk factor booleans, `status`, `risk_level` | Maternal patient records with risk assessment data |
| `vital_signs_local` | `local_id`, `maternal_profile_local_id`, `heart_rate`, `systolic_bp`, `diastolic_bp`, `temperature`, `spo2`, `respiratory_rate`, `estimated_blood_loss` | Vital signs readings per patient |
| `emotive_checklists_local` | `local_id`, `maternal_profile_local_id`, 6 step groups (`*_done`, `*_time`, `*_dose`/`*_volume`, `*_notes`) | WHO E-MOTIVE bundle completion tracking |
| `sync_queue_local` | `id`, `table_name`, `record_id`, `operation`, `payload`, `status`, `retry_count` | Offline sync operations pending upload |

All clinical tables include `is_synced` and `remote_id` columns for offline-first sync tracking.

### Web Fallback (localStorage)

On web, clinical data is stored in localStorage with JSON serialization:

| Key | Contents |
|-----|----------|
| `motivaid_maternal_profiles` | `Map<string, LocalMaternalProfile>` serialized as JSON |
| `motivaid_vital_signs` | `Map<string, LocalVitalSign>` serialized as JSON |
| `motivaid_emotive_checklists` | `Map<string, LocalEmotiveChecklist>` serialized as JSON |
| `motivaid_sync_queue` | `Map<string, SyncQueueItem>` serialized as JSON |

### SecureStore (Native) / localStorage (Web)

| Key | Contents |
|-----|----------|
| `motivaid_offline_creds` | `{ email, hash }` — SHA-256 hash for offline credential verification |
| Supabase session keys | Managed by Supabase client via `ExpoSecureStoreAdapter` |

### AsyncStorage

| Key | Contents |
|-----|----------|
| `motivaid_theme_preference` | `'light'` / `'dark'` / `'system'` |
| `motivaid_active_unit_id` | UUID of the currently selected unit |

---

## Sync Queue Architecture

The sync queue (`lib/sync-queue.ts`) handles offline-first data upload:

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCAL OPERATION (offline or online)                               │
│ 1. Write record to local SQLite/localStorage                    │
│ 2. Add sync queue entry (table, record_id, operation, payload)  │
│ 3. Set is_synced = false on the local record                    │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ SYNC PROCESS (when online, triggered by user or automatic)       │
│ 1. Fetch all pending sync_queue_local entries                    │
│ 2. For each entry:                                               │
│    a. Resolve local IDs → remote UUIDs (foreign keys)           │
│    b. Upsert to Supabase via REST API                           │
│    c. On success: mark synced, store remote_id locally          │
│    d. On failure: increment retry_count, log error              │
└─────────────────────────────────────────────────────────────────┘
```

**Supported tables:** `maternal_profiles`, `vital_signs`, `emotive_checklists`

**Retry logic:** Items have `max_retries` (default 3). Failed items are retried on the next sync cycle. Items that exceed max retries remain in the queue for manual review.

---

## Theming

### Color System

Defined in `constants/theme.ts` with light and dark variants:

| Token | Light | Dark |
|-------|-------|------|
| `text` | `#1A1C1E` | `#F8F9FA` |
| `background` | `#F8F9FA` | `#0F1113` |
| `tint` | `#00D2FF` | `#00D2FF` |
| `icon` | `#49454F` | `#9BA1A6` |
| `card` | `rgba(0,0,0,0.03)` | `rgba(255,255,255,0.04)` |
| `border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.1)` |

### Font Stacks

Platform-specific via `Platform.select()`: system fonts on iOS, default fonts on Android, web-safe stacks on web.

### Theme Persistence

The `ThemeContext` persists the user's preference (`light`/`dark`/`system`) to AsyncStorage and resolves the active theme by combining preference with device color scheme.

---

## Supabase Client

`lib/supabase.ts` creates the client with a custom `ExpoSecureStoreAdapter`:

- **Native**: Uses `expo-secure-store` for encrypted token storage
- **Web**: Falls back to `localStorage`
- Auto-refresh tokens are enabled
- Session persistence is enabled
- URL session detection is disabled (not applicable to mobile)

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase API endpoint |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/publishable key |

These are embedded at build time via the `EXPO_PUBLIC_` prefix convention.

---

## Registration Flow

1. User fills registration form (full name, email, password)
2. Optionally toggles "medical staff" mode:
   - Selects role (`midwife`, `nurse`, `student`, `supervisor`)
   - Enters facility access code (variable-length, e.g., `AKTH1-SUP`)
   - Code is validated in real-time with debounced input (500ms delay, 4+ chars)
   - Deactivated codes show a specific error message
3. `supabase.auth.signUp()` is called with role and code in `raw_user_meta_data`
4. The `handle_new_user()` database trigger:
   - Looks up the registration code in `facility_codes` (only active codes)
   - Maps it to the correct role and facility
   - Creates a `profiles` row with that role and `facility_id`
5. Non-staff users default to the `user` role

---

## Current Implementation Status

**Phase 1 (Complete):** Security & Identity
- Supabase Auth with online/offline/biometric sign-in
- SecureStore credential hashing
- SQLite profile caching
- Dark/light theme system
- Animated toast notifications

**Phase 2 (Complete):** Facility & Unit Hierarchy
- Facilities and units database tables with full CRUD
- Unit memberships with approval workflow
- Role-specific facility access codes with activation/deactivation
- Acronym-based code auto-generation
- Unit selector component
- Supervisor approval screen
- Role-based dashboards with icon-based action grids
- Facilities management screen with code lifecycle
- Units management screen
- Management RLS policies for admin/supervisor

**Phase 3 (Complete):** Risk Assessment & Clinical Mode
- Maternal profile creation with 13 AWHONN-adapted risk factors
- 4-level risk scoring algorithm (Low/Medium/High/Critical)
- Clinical tab with case list, status filters, supervisor cross-unit view
- Patient detail screen with metrics cards and lifecycle management
- Quick-entry vital signs pad (HR, BP, temperature, SpO2, RR)
- Live Obstetric Shock Index calculation with 5-level severity
- Blood loss estimation with quick-add buttons and method selector
- Interactive WHO E-MOTIVE checklist (6 steps with timestamps, doses, notes)
- 60-minute elapsed timer tracking WHO target
- Accordion UX, auto-timestamps, and "Done" → close case flow
- Vitals prompt banner with animated reminders
- Full offline-first architecture: SQLite (native) + localStorage (web)
- Sync queue with retry logic for background data upload
- Cross-platform compatibility (all Alert.alert calls replaced with Modal/Toast)

**Next:** Phase 4 — Case Timeline, Alerts & Escalation

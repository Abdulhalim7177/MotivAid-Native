# MotivAid - Architecture

## Overview

MotivAid is built with **React Native** via **Expo SDK 54** (managed workflow) using **TypeScript 5.9** in strict mode. It follows an offline-first, context-driven architecture optimized for low-connectivity clinical environments.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.81, React 19 (experimental React Compiler) |
| Routing | Expo Router v6 (file-based, typed routes) |
| State | React Context (4 providers) |
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
│       ├── modal.tsx
│       └── (tabs)/               # Bottom tab navigation
│           ├── _layout.tsx
│           ├── index.tsx         # Role-based dashboard (Home)
│           └── settings.tsx      # Theme, account, sign-out
├── context/                      # React Context providers
│   ├── auth.tsx                  # Session, profile, sign-in/out, biometric
│   ├── theme.tsx                 # Light/dark/system theme
│   ├── toast.tsx                 # Animated toast notifications
│   └── unit.tsx                  # Active unit selection
├── lib/                          # Core services (platform-split)
│   ├── supabase.ts               # Supabase client with SecureStore adapter
│   ├── db.native.ts              # SQLite profile caching (native)
│   ├── db.ts                     # No-op web fallback
│   ├── security.native.ts        # Biometrics + SecureStore credentials (native)
│   └── security.ts               # localStorage fallback (web)
├── components/                   # Shared UI components
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   ├── avatar.tsx                # Avatar with upload capability
│   ├── unit-selector.tsx         # Global unit switcher modal
│   ├── haptic-tab.tsx
│   └── ui/
│       ├── icon-symbol.tsx
│       ├── icon-symbol.ios.tsx
│       └── collapsible.tsx
├── hooks/                        # Custom hooks
│   ├── use-color-scheme.ts       # Native color scheme detection
│   ├── use-color-scheme.web.ts   # Web color scheme detection
│   └── use-theme-color.ts        # Themed color lookup
├── constants/
│   └── theme.ts                  # Color palette (light/dark) and font stacks
├── supabase/
│   └── migrations/               # PostgreSQL migrations (3 files)
└── assets/                       # Images, fonts, app icons
```

---

## Provider Hierarchy

Defined in `app/_layout.tsx`. The nesting order is significant:

```
AppThemeProvider        ← Theme preference (light/dark/system)
  └── ToastProvider     ← Animated toast notifications
    └── AuthProvider    ← Session, user profile, sign-in/out
      └── UnitProvider  ← Active facility unit selection
        └── RootLayoutNav  ← Route protection + navigation
```

Each provider exposes a hook for consumption:

| Provider | Hook | Key Exports |
|----------|------|-------------|
| `ThemeProvider` | `useAppTheme()` | `theme`, `preference`, `setThemePreference` |
| `ToastProvider` | `useToast()` | `showToast(message, type)` |
| `AuthProvider` | `useAuth()` | `session`, `user`, `profile`, `signIn`, `signOut`, `signInBiometric` |
| `UnitProvider` | `useUnits()` | `activeUnit`, `availableUnits`, `setActiveUnit`, `refreshUnits` |

---

## Routing & Navigation

### File-Based Routing (Expo Router v6)

Routes map directly to the `app/` directory structure. The path alias `@/*` maps to the project root.

### Route Groups

| Group | Purpose | Auth Required |
|-------|---------|---------------|
| `(auth)` | Login, register, password recovery | No |
| `(app)` | All authenticated screens | Yes |
| `(app)/(tabs)` | Bottom tab navigation (Home + Settings) | Yes |

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

Database: `motivaid_offline_v2.db`

| Table | Schema | Purpose |
|-------|--------|---------|
| `profile_cache` | `id TEXT PK, profile_data TEXT, user_data TEXT, updated_at DATETIME` | Caches user profile and auth user for offline access |

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
   - Enters 6-character facility access code
   - Code is validated against the `facility_codes` table in real-time
3. `supabase.auth.signUp()` is called with role and code in `raw_user_meta_data`
4. The `handle_new_user()` database trigger:
   - Looks up the registration code in `facility_codes`
   - Maps it to the correct role
   - Creates a `profiles` row with that role
5. Non-staff users default to the `user` role

---

## Current Implementation Status

**Phase 1 (Complete):** Security & Identity
- Supabase Auth with online/offline/biometric sign-in
- SecureStore credential hashing
- SQLite profile caching
- Dark/light theme system
- Animated toast notifications

**Phase 2 (Current):** Facility & Unit Hierarchy
- Facilities and units database tables
- Unit memberships with approval workflow
- Role-specific facility access codes
- Unit selector component
- Supervisor approval screen
- Role-based dashboards

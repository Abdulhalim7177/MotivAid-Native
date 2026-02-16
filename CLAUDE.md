# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MotivAid is a mobile health (mHealth) app for midwives and frontline healthcare workers to detect and manage Postpartum Hemorrhage (PPH) using the WHO-endorsed E-MOTIVE clinical bundle. Currently in Phase 2 of 6 (see `docs/IMPLEMENTATION_ROADMAP.md` for the full plan).

## Tech Stack

- **React Native** via Expo SDK 54 (managed workflow), React 19 with experimental React Compiler
- **TypeScript** 5.9 in strict mode, path alias `@/*` maps to project root
- **Expo Router v6** for file-based routing with typed routes enabled
- **Supabase** for auth, PostgreSQL database, and file storage
- **SQLite** (`expo-sqlite`) for offline data caching
- **Expo SecureStore** for credential/session storage on native
- New Architecture enabled (`newArchEnabled: true`)

## Commands

| Task | Command |
|------|---------|
| Start dev server | `npx expo start` |
| Run on Android | `npx expo start --android` |
| Run on iOS | `npx expo start --ios` |
| Run on Web | `npx expo start --web` |
| Lint | `npm run lint` (wraps `expo lint` / ESLint with `eslint-config-expo`) |
| Start local Supabase | `supabase start` |

No test framework is currently configured.

## Architecture

### Routing (Expo Router, file-based)

```
app/
  index.tsx                    # Splash screen, auto-redirects
  _layout.tsx                  # Root layout, provider hierarchy, route protection
  (auth)/                      # Unauthenticated screens (login, register, forgot/reset password)
  (app)/                       # Authenticated screens
    (tabs)/                    # Bottom tabs: Home (index.tsx) + Settings
    profile.tsx, approvals.tsx, modal.tsx
```

Route protection lives in `app/_layout.tsx` (`RootLayoutNav`): redirects unauthenticated users to `/(auth)/login` and authenticated users away from auth screens.

### Provider Hierarchy

Defined in `app/_layout.tsx`, order matters:
```
AppThemeProvider → ToastProvider → AuthProvider → UnitProvider → RootLayoutNav
```

### State Management — React Context

All state is managed via four context providers in `context/`:

- **AuthContext** (`context/auth.tsx`): Session, user profile, online/offline/biometric sign-in, sign-out. This is the most complex context.
- **ThemeContext** (`context/theme.tsx`): Light/dark/system theme, persisted to AsyncStorage.
- **ToastContext** (`context/toast.tsx`): Animated toast notifications (success/error/info).
- **UnitContext** (`context/unit.tsx`): Active facility unit selection, persisted to AsyncStorage.

### Offline-First Authentication

The auth system has three sign-in paths (`context/auth.tsx`):
1. **Online**: `supabase.auth.signInWithPassword()` → saves SHA-256 credential hash to SecureStore → caches profile to SQLite
2. **Offline**: Verifies entered credentials against stored hash in SecureStore → loads profile from SQLite
3. **Biometric**: `expo-local-authentication` → loads cached profile from SQLite

### Platform-Specific Files

The project uses file extension conventions for platform branching:
- `.native.ts` — Native-only (SQLite, SecureStore, biometrics)
- `.ts` / `.web.ts` — Web fallbacks (localStorage, no-ops)

Key pairs: `lib/db.native.ts` / `lib/db.ts`, `lib/security.native.ts` / `lib/security.ts`, `hooks/use-color-scheme.ts` / `hooks/use-color-scheme.web.ts`

### Role-Based Dashboards

The Home screen (`app/(app)/(tabs)/index.tsx`) renders a different dashboard component based on `profile.role`:
- `admin` → AdminDashboard
- `supervisor` → SupervisorDashboard
- `midwife | nurse | student` → StaffDashboard
- `user` (default) → UserDashboard

Roles are defined by the `user_role` PostgreSQL enum and assigned during registration via facility access codes.

### Database (Supabase)

Migrations live in `supabase/migrations/` and define:
- `profiles` table with role enum, auto-created via trigger on `auth.users` INSERT
- `facilities` and `units` tables for organizational hierarchy
- `unit_memberships` for user-unit relationships (pending/approved/rejected status)
- `facility_codes` for role-specific registration codes (unique code per facility+role)

RLS is enabled on all tables. The `handle_new_user()` trigger maps registration codes to roles.

### Supabase Client

`lib/supabase.ts` creates the Supabase client using SecureStore as the auth storage adapter on native, falling back to localStorage on web.

### Theming

Color palette and font stacks are defined in `constants/theme.ts` with light and dark variants. Components use `ThemedText` and `ThemedView` wrappers from `components/`.

## Environment Variables

The app uses `EXPO_PUBLIC_` prefixed env vars (embedded at build time):
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase API URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous/publishable key

A local Supabase instance at `127.0.0.1:54321` is used for development.

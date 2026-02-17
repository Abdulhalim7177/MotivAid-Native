# MotivAid 🩺

**MotivAid** is a mobile health (mHealth) application designed to empower midwives and frontline healthcare workers in the early detection and management of **Postpartum Hemorrhage (PPH)** using the WHO-endorsed **E-MOTIVE** clinical bundle.

Built with React Native (Expo SDK 54) and an offline-first architecture, MotivAid delivers a high-performance experience in even the most resource-constrained environments.

---

## ✨ Key Features

### 🛡️ Secure & Resilient Authentication
- **Three sign-in paths:** Online (Supabase), Offline (SHA-256 hash verification), Biometric (Fingerprint/FaceID)
- **Offline-first:** SQLite profile caching + SecureStore credentials allow full functionality without internet
- **Role-based access:** 6 roles (`admin`, `supervisor`, `midwife`, `nurse`, `student`, `user`) assigned via facility registration codes

### 🏥 Healthcare Facility Hierarchy
- **Facilities & Units:** Organizational structure with membership approval workflow
- **Supervisor Approvals:** Approve/reject staff membership requests per unit
- **Role-specific Dashboards:** Each role sees a tailored home screen

### 🎨 Design System
- Light/dark/system theme with persistence
- Purple/pink healthcare brand palette
- 8-point spacing grid, typography scale (15 variants), platform-aware shadows
- Reusable UI components: Button, Card, Input, Skeleton, ScreenContainer

### 🏥 Clinical Features (Planned)
- **Risk Assessment:** Maternal risk scoring (low/medium/high/critical)
- **E-MOTIVE Bundle:** Guided PPH intervention checklist
- **Vitals Tracking:** Real-time Shock Index calculation
- **Emergency Escalation:** One-tap supervisor notification

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native via Expo SDK 54 (managed workflow) |
| **Language** | TypeScript 5.9 (strict mode) |
| **Navigation** | Expo Router v6 (file-based routing) |
| **Backend** | Supabase (Auth, PostgreSQL, Storage) |
| **Offline DB** | SQLite via `expo-sqlite` |
| **Credentials** | Expo SecureStore (native), localStorage (web) |
| **State** | React Context (Auth, Theme, Toast, Unit) |
| **UI** | Custom component library with themed wrappers |

---

## 📁 Project Structure

```
app/
  index.tsx                  # Splash screen
  _layout.tsx                # Root layout + provider hierarchy + route guard
  (auth)/                    # Login, Register, Forgot/Reset Password
  (app)/                     # Authenticated screens
    (tabs)/                  # Bottom tabs (Home, Settings)
    profile.tsx              # Profile editing + avatar upload
    approvals.tsx            # Supervisor membership approvals

components/
  dashboard/                 # Role-based dashboard components
  ui/                        # Reusable UI primitives (Button, Card, Input, etc.)
  themed-text.tsx            # Typography wrapper
  themed-view.tsx            # Background color wrapper

context/                     # React Context providers
  auth.tsx                   # Session, offline auth, biometrics
  theme.tsx                  # Light/dark/system theme
  toast.tsx                  # Animated notifications
  unit.tsx                   # Facility unit selection

lib/
  supabase.ts                # Supabase client with SecureStore adapter
  db.native.ts / db.ts       # SQLite (native) / no-op (web) caching
  security.native.ts / .ts   # SecureStore (native) / localStorage (web)

constants/
  theme.ts                   # Colors, Spacing, Radius, Typography, Shadows, Fonts

supabase/
  migrations/                # 3 SQL migrations (auth, org hierarchy, facility codes)
  seed.sql                   # Development seed data
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js & npm
- Expo Go app or Android/iOS emulator
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd MotivAid
npm install

# Start local Supabase
npx supabase start

# Start the dev server
npx expo start
```

### Environment Variables

Create a `.env` file with:
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Commands

| Task | Command |
|------|---------|
| Start dev server | `npx expo start` |
| Run on Android | `npx expo start --android` |
| Run on iOS | `npx expo start --ios` |
| Run on Web | `npx expo start --web` |
| Lint | `npm run lint` |
| Start local Supabase | `npx supabase start` |

---

## 🗺️ Roadmap

| Phase | Status | Key Deliverables |
|-------|--------|------------------|
| 1. Security & Identity | ✅ Complete | Auth, offline sign-in, biometrics, theming |
| 2. Facility & Unit Hierarchy | ✅ Complete | Roles, facilities, units, memberships, dashboards |
| 3. Risk Assessment & Clinical Data | 🔲 Planned | Maternal data, vital signs, risk scoring |
| 4. Active Clinical Mode (E-MOTIVE) | 🔲 Planned | PPH workflow, cases, interventions, case timeline |
| 5. Alerts & Reports | 🔲 Planned | Escalation, case reports, adherence metrics |
| 6. Training & Deployment | 🔲 Planned | Simulation scenarios, quizzes, QA, production launch |

See [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) for detailed sprint breakdowns.

---

## 📜 Compliance & Guidelines

MotivAid is aligned with:
- **WHO E-MOTIVE Clinical Guidelines**
- **National Maternal Health Policies**
- **Data Protection & Privacy Standards**

---

*MotivAid — Saving Lives, One Delivery at a Time.*

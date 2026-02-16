# MotivAid 🩺

**MotivAid** is a specialized mobile health (mHealth) application designed to empower midwives and frontline healthcare workers in the early detection and management of **Postpartum Hemorrhage (PPH)** using the WHO-endorsed **E-MOTIVE** clinical bundle.

Built with a "Noir Tech" aesthetic for the year 2026, MotivAid provides a high-performance, offline-first experience to save lives in even the most resource-constrained environments.

---

## ✨ Key Features

### 🛡️ Secure & Resilient
- **Advanced Auth:** Supabase-backed authentication with Biometric (Fingerprint/FaceID) support.
- **Offline-First:** Seamless SQLite + SecureStore caching allows users to log in and manage cases without an internet connection.
- **Smart Session Locking:** Offline sign-out "locks" the app instead of clearing data, ensuring immediate resume when needed.

### 🏥 Clinical Excellence (E-MOTIVE)
- **Early Detection:** Automated risk assessment and PPH triggers.
- **Guided Interventions:** Step-by-step checklist for Massage, Oxytocics, Tranexamic Acid, and IV Fluids.
- **Vitals Tracking:** Real-time Shock Index calculation and threshold-based alerts.
- **Emergency Escalation:** One-tap notification system for unit and facility supervisors.

### 🎭 Role-Based Dashboards
- **Midwife:** Focused on clinical mode, patient monitoring, and training.
- **Supervisor:** Unit management, performance analytics, and team approvals.
- **Administrator:** Global facility oversight and system configuration.

---

## 🚀 Tech Stack

- **Frontend:** React Native Expo (SDK 54+)
- **Navigation:** Expo Router (File-based)
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **Database (Offline):** SQLite (via `expo-sqlite`)
- **State Management:** React Context + Zustand
- **UI/UX:** custom "Noir Tech" theme with Animated Toasts and Haptic Feedback.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js & npm
- Expo Go app or Emulator
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize local Supabase:
   ```bash
   npx supabase start
   ```
4. Start the app:
   ```bash
   npx expo start
   ```

---

## 🗺️ Project Status

- [x] **Phase 1:** Core Auth, SQLite Caching, and Biometrics.
- [ ] **Phase 2:** Facility/Unit Management & Supervisor Approvals.
- [ ] **Phase 3:** Risk Assessment & Clinical Vitals logic.
- [ ] **Phase 4:** Active E-MOTIVE Checklist & Case Timeline.
- [ ] **Phase 5:** Simulation Training Mode & Quizzes.

---

## 📜 Compliance & Guidelines
MotivAid is strictly aligned with:
- **WHO E-MOTIVE Clinical Guidelines**
- **National Maternal Health Policies**
- **Data Protection & Privacy Standards (AES-256 local encryption)**

---
*MotivAid: Your Journey, Better. Saving Lives, One Delivery at a Time.*

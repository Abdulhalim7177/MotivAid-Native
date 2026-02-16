# MotivAid - Implementation Roadmap 🗺️

This roadmap provides a phased timeline for the development of MotivAid. Each phase represents a major milestone, while sprints (2 weeks each) detail the specific focus areas.

---

## 🟢 Phase 1: Security & Identity (Done ✅)
**Focus:** Building a resilient authentication foundation.

*   **Sprint 1:** Implementation of Supabase Auth, Custom Noir UI, and Animated Toasts.
*   **Sprint 2:** SQLite Caching implementation and Biometric (Fingerprint/FaceID) integration.
*   **Result:** A secure, offline-capable login system.

---

## 🔵 Phase 2: Facility & Unit Hierarchy (Current)
**Focus:** Modeling the real-world healthcare environment.

*   **Sprint 3:**
    *   **Backend:** Create `facilities` and `units` migrations.
    *   **UI:** Build the "Join Unit" request flow for Midwives.
*   **Sprint 4:**
    *   **Dashboard:** Implement the Supervisor's approval management screen.
    *   **Navigation:** Global Unit Switcher implementation.
*   **Goal:** Allow users to be part of specific wards and supervisors to manage their teams.

---

## 🟡 Phase 3: Risk Assessment & Clinical Data
**Focus:** Patient data entry and initial clinical logic.

*   **Sprint 5:**
    *   **Forms:** Build the Maternal Risk Assessment form (Parity, Anemia, History).
    *   **Logic:** Implement the Risk Scoring algorithm.
*   **Sprint 6:**
    *   **Vital Signs:** Create the quick-entry vital signs pad (HR, BP, SpO2).
    *   **Calculations:** Automated Shock Index display.
*   **Goal:** Identify high-risk mothers before delivery begins.

---

## 🔴 Phase 4: Active Clinical Mode (The Heart of MotivAid)
**Focus:** The point-of-care intervention interface.

*   **Sprint 7:**
    *   **Timer Logic:** 1-hour PPH watch timer and delivery timestamping.
    *   **Checklist:** The E-MOTIVE interactive bundle (Early detection to Escalation).
*   **Sprint 8:**
    *   **Timeline:** Build the "Case Timeline" that shows every intervention in real-time.
    *   **Offline Persistence:** Robust SQLite saving for active cases to prevent data loss.
*   **Goal:** Provide guided support to midwives during a PPH emergency.

---

## 🟣 Phase 5: Alerts, Escalation & Reports
**Focus:** Communication and documentation.

*   **Sprint 9:**
    *   **Alerts:** Visual/Haptic triggers for critical clinical thresholds.
    *   **Escalation:** One-tap emergency contact system.
*   **Sprint 10:**
    *   **Reporting:** Generate the final PPH case report for audit.
    *   **Supervisor View:** Unit-wide adherence metrics.
*   **Goal:** Ensure accountability and rapid response.

---

## ⚪ Phase 6: Training, Polish & Deployment
**Focus:** Sustainability and production readiness.

*   **Sprint 11:**
    *   **Simulation:** Practice scenarios for midwives to build confidence.
    *   **Quizzes:** Knowledge assessment modules.
*   **Sprint 12:**
    *   **QA:** Edge-case testing, performance optimization on low-end devices.
    *   **Launch:** Production database migration and final store release.
*   **Goal:** A polished, life-saving clinical tool.

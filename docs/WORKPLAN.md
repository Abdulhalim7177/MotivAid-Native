# MotivAid - Structured Workplan 📋

This workplan outlines the functional blocks required to implement the MotivAid clinical system. It focuses on technical dependencies and the logical flow of data from administrative setup to point-of-care intervention.

---

## 🏗️ Block 1: Organizational Hierarchy & Access
**Objective:** Establish the facility/unit structure required for data isolation and supervisor oversight.

### Tasks:
- **DB Migration:** Create `facilities` and `units` tables.
- **Unit Memberships:** Implement the many-to-many relationship between Users and Units.
- **Approval System:** Build the logic for Supervisors to "Approve" midwives into their units.
- **Unit Selector:** Add a global unit switcher in the app header for users with multiple assignments.

---

## 🧪 Block 2: Clinical Schema & Offline Foundation
**Objective:** Prepare the system to handle complex patient data without internet access.

### Tasks:
- **Entity Migrations:** Create tables for `maternal_profiles`, `pph_cases`, `interventions`, and `vital_signs`.
- **SQLite Extension:** Update the local database logic to cache clinical entities for the active unit.
- **Clinical Validation:** Implement the logic for **Shock Index** calculation (Heart Rate / Systolic BP).
- **Risk Algorithm:** Code the maternal risk scoring based on WHO E-MOTIVE criteria.

---

## 🏥 Block 3: The E-MOTIVE Workflow (Core Clinical)
**Objective:** Implement the primary clinical interface used during deliveries.

### Tasks:
- **Clinical Mode UI:** Build the real-time monitoring interface with a 1-hour PPH watch timer.
- **E-MOTIVE Checklist:** Create the interactive step-by-step guide (Massage, Oxytocics, TXA, Fluids).
- **Auto-Logging:** Ensure every checkbox and vital sign entry is timestamped and saved instantly to SQLite.
- **Visual Triggers:** Connect vital signs to the "Noir Tech" alert system (e.g., flash red if Shock Index > 1.0).

---

## 📢 Block 4: Escalation & Communications
**Objective:** Ensure rapid response during clinical emergencies.

### Tasks:
- **Escalation Logic:** Implement the one-tap "Call for Help" button.
- **Contact Management:** Build the UI for Supervisors to set unit-specific emergency contacts.
- **Notification Service:** Integrate SMS or In-App alerts for immediate supervisor notification.

---

## 📊 Block 5: Analytics & Training
**Objective:** Support continuous improvement and clinical audits.

### Tasks:
- **Case Reports:** Build the read-only case summary view for audit reviews.
- **Unit Dashboards:** Implement aggregate charts for Supervisors (Adherence rates, response times).
- **Training Mode:** Create the simulation engine to run PPH scenarios using local JSON data.
- **Quiz System:** Build the post-training assessment module.
